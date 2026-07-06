import { Router, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest } from '../middleware/auth';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const parseNumericValue = (val: any): number => {
  if (val === undefined || val === null) return 0;
  const cleanStr = String(val).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
};

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { policyId, visitType, gender, item } = req.body;

    if (!policyId || !visitType || !gender || !item) {
      res.status(400).json({ error: 'Missing required fields: policyId, visitType, gender, or item' });
      return;
    }

    // Fetch active rules from Supabase (using user's JWT from req or system client)
    const { data, error } = await supabase
      .from('policy_rules')
      .select('*')
      .eq('policy_id', policyId)
      .eq('active', true);

    if (error) {
      console.error('Error fetching policy rules:', error);
      res.status(500).json({ error: 'Failed to retrieve policy rules from database' });
      return;
    }

    const rules = data || [];
    const originalAmount = item.unitPrice * item.quantity;
    
    let bestRule: any = null;
    let maxScore = -1;

    for (const rule of rules) {
      const visitMatches = rule.visit_type === 'All' || 
                           rule.visit_type.toUpperCase() === visitType.toUpperCase();
      if (!visitMatches) continue;

      const genderMatches = (rule.gender || 'All') === 'All' || 
                            rule.gender.toLowerCase() === gender.toLowerCase();
      if (!genderMatches) continue;

      let currentScore = 0;

      const codeMatches = rule.alias_code && item.code && 
                          rule.alias_code.trim().toUpperCase() === item.code.trim().toUpperCase();
      
      const classMatches = rule.class_name && item.className && 
                           rule.class_name.trim().toUpperCase() === item.className.trim().toUpperCase();

      const groupMatches = rule.group_name && item.groupName && 
                           rule.group_name.trim().toUpperCase() !== 'ALL' &&
                           rule.group_name.trim().toUpperCase() === item.groupName.trim().toUpperCase();
      
      const typeMatches = rule.rule_type.toUpperCase() === item.type.toUpperCase();
      const isCatchAll = rule.rule_type.toUpperCase() === 'ALL';

      if (codeMatches) {
        currentScore += 100;
      } else if (groupMatches || classMatches) {
        currentScore += 50;
      } else if (typeMatches) {
        currentScore += 10;
      } else if (isCatchAll) {
        currentScore += 5;
      } else {
        continue;
      }

      if (rule.tariff_class && item.tariffClass && 
          rule.tariff_class.toUpperCase() === item.tariffClass.toUpperCase()) {
        currentScore += 2;
      }

      if (currentScore > maxScore) {
        maxScore = currentScore;
        bestRule = rule;
      }
    }

    if (!bestRule) {
      res.json({
        originalAmount,
        patientPayable: originalAmount,
        sponsorPayable: 0,
        deductibleApplied: 0,
        isExcluded: false,
        approvalRequired: false,
        score: 0
      });
      return;
    }

    if (bestRule.exclude) {
      res.json({
        matchedRuleId: bestRule.id,
        originalAmount,
        patientPayable: originalAmount,
        sponsorPayable: 0,
        deductibleApplied: 0,
        isExcluded: true,
        approvalRequired: false,
        score: maxScore
      });
      return;
    }

    const rawDeductible = parseNumericValue(bestRule.patient_deductible);
    let deductibleApplied = 0;
    if (bestRule.patient_deductible_type === '%') {
      deductibleApplied = (rawDeductible / 100) * originalAmount;
    } else {
      deductibleApplied = rawDeductible;
    }
    
    deductibleApplied = Math.min(deductibleApplied, originalAmount);
    const amountAfterDeductible = originalAmount - deductibleApplied;

    const patientCopayRate = parseNumericValue(bestRule.patient_copay);
    const isCopayPercentage = String(bestRule.patient_copay).includes('%') || patientCopayRate <= 100;

    let patientCoShare = 0;
    if (isCopayPercentage) {
      patientCoShare = (patientCopayRate / 100) * amountAfterDeductible;
    } else {
      patientCoShare = Math.min(patientCopayRate, amountAfterDeductible);
    }

    let sponsorPayable = amountAfterDeductible - patientCoShare;

    if (bestRule.amount_limit > 0 && sponsorPayable > bestRule.amount_limit) {
      const excess = sponsorPayable - bestRule.amount_limit;
      sponsorPayable = bestRule.amount_limit;
      patientCoShare += excess; 
    }

    const totalPatientPayable = deductibleApplied + patientCoShare;
    const cleanNum = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

    res.json({
      matchedRuleId: bestRule.id,
      originalAmount: cleanNum(originalAmount),
      patientPayable: cleanNum(totalPatientPayable),
      sponsorPayable: cleanNum(sponsorPayable),
      deductibleApplied: cleanNum(deductibleApplied),
      isExcluded: false,
      approvalRequired: bestRule.approval_required,
      score: maxScore
    });

  } catch (err: any) {
    console.error('Adjudicate error:', err);
    res.status(500).json({ error: 'Internal server error during adjudication' });
  }
});

export default router;
