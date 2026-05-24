import { getSupabase } from './supabaseClient';
import { PolicyRule, PolicyRuleContext, AdjudicationResult } from '../types';

/**
 * Utility to parse numeric percentage or currency from string representation (e.g., "10%", "20 SAR")
 */
const parseNumericValue = (val: string | undefined | null): number => {
  if (val === undefined || val === null) return 0;
  // Remove percent symbol, whitespace, letters to extract raw number
  const cleanStr = String(val).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Fetches all active rules for a given policy ID from Supabase.
 */
export const fetchRulesForPolicy = async (policyId: string): Promise<PolicyRule[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('policy_rules')
    .select('*')
    .eq('policy_id', policyId)
    .eq('active', true);

  if (error) {
    console.error('Error fetching policy rules from Supabase:', error);
    return [];
  }

  // Map Snake Case database schema to Camel Case frontend model
  return (data || []).map((r: any) => ({
    id: r.id,
    policyId: r.policy_id,
    ruleType: r.rule_type,
    visitType: r.visit_type,
    gender: r.gender || 'All',
    className: r.class_name || '',
    tariffClass: r.tariff_class,
    tariffValue: r.tariff_value,
    amountLimit: parseFloat(r.amount_limit || '0'),
    quantityLimit: parseInt(r.quantity_limit || '0', 10),
    patientCopay: r.patient_copay || '0',
    sponsorPayment: r.sponsor_payment || '100',
    patientDeductible: r.patient_deductible || '0',
    patientDeductibleType: r.patient_deductible_type || 'Amt',
    aliasCode: r.alias_code,
    approvalRequired: r.approval_required,
    exclude: r.exclude,
    active: r.active,
    groupName: r.group_name || 'All'
  }));
};

/**
 * The core evaluation engine that scores rules by specificity weighting and returns the winner.
 * 
 * Precedence Scoring logic based on user requirements:
 * - Specific Item Code Match: +100 points
 * - Item Class/Group Match:   +50 points
 * - Category Match (DRUGS):  +10 points
 * - Global Match ('ALL'):     +5 points
 */
export const evaluatePolicyRule = (
  rules: PolicyRule[],
  context: PolicyRuleContext
): AdjudicationResult => {
  const originalAmount = context.item.unitPrice * context.item.quantity;
  
  let bestRule: PolicyRule | null = null;
  let maxScore = -1;

  // Iterate and score every rule to find "Most Specific Wins"
  for (const rule of rules) {
    let currentScore = 0;

    // 1. HARD FILTER: Visit Type must match (or global wildcard)
    const visitMatches = rule.visitType === 'All' || 
                         rule.visitType.toUpperCase() === context.visitType.toUpperCase();
    if (!visitMatches) continue;

    // 2. HARD FILTER: Gender must match (or global wildcard)
    const genderMatches = rule.gender === 'All' || 
                          rule.gender.toLowerCase() === context.gender.toLowerCase();
    if (!genderMatches) continue;

    // 3. SPECIFICITY MATCHING & SCORING
    const codeMatches = rule.aliasCode && context.item.code && 
                        rule.aliasCode.trim().toUpperCase() === context.item.code.trim().toUpperCase();
    
    const classMatches = rule.className && context.item.className && 
                         rule.className.trim().toUpperCase() === context.item.className.trim().toUpperCase();

    const groupMatches = rule.groupName && context.item.groupName && 
                         rule.groupName.trim().toUpperCase() !== 'ALL' &&
                         rule.groupName.trim().toUpperCase() === context.item.groupName.trim().toUpperCase();
    
    const typeMatches = rule.ruleType.toUpperCase() === context.item.type.toUpperCase();
    const isCatchAll = rule.ruleType.toUpperCase() === 'ALL';

    if (codeMatches) {
      currentScore += 100; // User requirement: Specific item gets 100 pts
    } else if (groupMatches || classMatches) {
      currentScore += 50;  // User requirement: Service group gets 50 pts
    } else if (typeMatches) {
      currentScore += 10;  // User requirement: Category gets 10 pts
    } else if (isCatchAll) {
      currentScore += 5;   // Fallback catch-all
    } else {
      // If it's none of the above, this rule does not apply to this item type at all.
      continue;
    }

    // Additional small weight for Tariff Class specificity if applicable
    if (rule.tariffClass && context.item.tariffClass && 
        rule.tariffClass.toUpperCase() === context.item.tariffClass.toUpperCase()) {
      currentScore += 2;
    }

    // Compare to best found so far
    if (currentScore > maxScore) {
      maxScore = currentScore;
      bestRule = rule;
    }
  }

  // DEFAULT BEHAVIOR IF NO RULE MATCHED: Full patient responsibility (Safest default)
  if (!bestRule) {
    return {
      originalAmount,
      patientPayable: originalAmount,
      sponsorPayable: 0,
      deductibleApplied: 0,
      isExcluded: false,
      approvalRequired: false,
      score: 0
    };
  }

  // CASE 1: EXCLUSION RULE
  if (bestRule.exclude) {
    return {
      matchedRuleId: bestRule.id,
      originalAmount,
      patientPayable: originalAmount,
      sponsorPayable: 0,
      deductibleApplied: 0,
      isExcluded: true,
      approvalRequired: false,
      score: maxScore
    };
  }

  // --- CALCULATE BREAKDOWN ---
  
  // 1. Apply Deductible first
  const rawDeductible = parseNumericValue(bestRule.patientDeductible);
  let deductibleApplied = 0;
  if (bestRule.patientDeductibleType === '%') {
    deductibleApplied = (rawDeductible / 100) * originalAmount;
  } else {
    deductibleApplied = rawDeductible;
  }
  
  // Clamp deductible to not exceed total bill
  deductibleApplied = Math.min(deductibleApplied, originalAmount);
  const amountAfterDeductible = originalAmount - deductibleApplied;

  // 2. Apply Copay / Sponsor split
  const patientCopayRate = parseNumericValue(bestRule.patientCopay);
  const isCopayPercentage = String(bestRule.patientCopay).includes('%') || patientCopayRate <= 100; // Heuristic if not explicit

  let patientCoShare = 0;
  if (isCopayPercentage) {
    // Calculate percentage based on remaining amount
    patientCoShare = (patientCopayRate / 100) * amountAfterDeductible;
  } else {
    // Fixed amount copay
    patientCoShare = Math.min(patientCopayRate, amountAfterDeductible);
  }

  let sponsorPayable = amountAfterDeductible - patientCoShare;

  // 3. Apply Action Limits (Amount Limit Override)
  if (bestRule.amountLimit > 0 && sponsorPayable > bestRule.amountLimit) {
    // Cap sponsor contribution to limit
    const excess = sponsorPayable - bestRule.amountLimit;
    sponsorPayable = bestRule.amountLimit;
    // Excess is usually pushed to Patient if exceeding limit, unless configured otherwise.
    patientCoShare += excess; 
  }

  const totalPatientPayable = deductibleApplied + patientCoShare;

  // Perform basic round cleanups for monetary precision
  const cleanNum = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  return {
    matchedRuleId: bestRule.id,
    originalAmount: cleanNum(originalAmount),
    patientPayable: cleanNum(totalPatientPayable),
    sponsorPayable: cleanNum(sponsorPayable),
    deductibleApplied: cleanNum(deductibleApplied),
    isExcluded: false,
    approvalRequired: bestRule.approvalRequired,
    score: maxScore
  };
};
