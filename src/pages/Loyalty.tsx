import React, { useState, useMemo } from 'react';
import { 
  Award, Settings, Users, BarChart3, Search, CreditCard, Plus, ArrowUpRight, ArrowDownRight, RefreshCw, Save, ShieldAlert, CheckCircle, Calendar, Phone, Mail, FileText, ChevronRight
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { LoyaltyAccount, LoyaltyTier, LoyaltyTransaction, LoyaltyProgramConfig, LoyaltyRedemptionRules, LoyaltyBonusRule } from '../types';

const DEFAULT_CONFIG: LoyaltyProgramConfig = {
  id: '',
  programName: 'MediPoints',
  programStatus: 'Active',
  effectiveFrom: new Date().toISOString().split('T')[0],
  pointValue: 1.00,
  earnRate: 1.00,
  minBillToEarn: 0.00,
  pointsRounding: 'FLOOR',
  expiryDays: 365,
  expiryType: 'ROLLING',
  expiryWarningDays: 30,
  smsEnabled: true,
  smsOnEarn: true,
  smsOnRedeem: true,
  smsOnExpiryWarning: true,
  autoEnroll: true
};

const DEFAULT_REDEMPTION: LoyaltyRedemptionRules = {
  minPointsToRedeem: 50,
  maxRedemptionPct: 10.00,
  maxPointsPerBill: 500,
  partialRedemption: true,
  blockOnDiscountedBill: true,
  excludeGstFromRedeem: true
};

const DEFAULT_TIERS: Omit<LoyaltyTier, 'id'>[] = [
  { tierName: 'Silver', minLifetimePoints: 0, earnMultiplier: 1.00, downgradeDays: null, birthdayBonusPoints: 0, welcomeBonusPoints: 50, isActive: true },
  { tierName: 'Gold', minLifetimePoints: 1000, earnMultiplier: 1.50, downgradeDays: 180, birthdayBonusPoints: 25, welcomeBonusPoints: 0, isActive: true },
  { tierName: 'Platinum', minLifetimePoints: 5000, earnMultiplier: 2.00, downgradeDays: 365, birthdayBonusPoints: 100, welcomeBonusPoints: 0, isActive: true }
];

const DEFAULT_BONUSES: Omit<LoyaltyBonusRule, 'id'>[] = [
  { bonusType: 'WELCOME', pointsAwarded: 50, earnMultiplier: 1.00, triggerCondition: 'First account enrolment', validFrom: null, validTo: null, isActive: true },
  { bonusType: 'REFERRAL_REFERRER', pointsAwarded: 25, earnMultiplier: 1.00, triggerCondition: 'When referred patient makes first purchase', validFrom: null, validTo: null, isActive: true },
  { bonusType: 'REFERRAL_REFEREE', pointsAwarded: 25, earnMultiplier: 1.00, triggerCondition: 'New patient first purchase via referral', validFrom: null, validTo: null, isActive: true },
  { bonusType: 'MILESTONE', pointsAwarded: 20, earnMultiplier: 1.00, triggerCondition: 'purchase_count = 5', validFrom: null, validTo: null, isActive: true },
  { bonusType: 'MILESTONE', pointsAwarded: 50, earnMultiplier: 1.00, triggerCondition: 'purchase_count = 10', validFrom: null, validTo: null, isActive: true },
  { bonusType: 'MILESTONE', pointsAwarded: 100, earnMultiplier: 1.00, triggerCondition: 'purchase_count = 25', validFrom: null, validTo: null, isActive: true }
];

type TabType = 'setup' | 'wallets' | 'reports';

export const Loyalty: React.FC = () => {
  const { 
    loyaltyAccounts, 
    loyaltyTransactions, 
    loyaltyProgramConfig, 
    loyaltyTiers, 
    loyaltyRedemptionRules, 
    loyaltyBonusRules,
    saveLoyaltyProgramConfig,
    saveLoyaltyTier,
    saveLoyaltyRedemptionRules,
    saveLoyaltyBonusRule,
    manualLoyaltyAdjustment,
    formatCurrency,
    showToast
  } = useData();

  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('setup');

  // Program Config Local Form State
  const [configForm, setConfigForm] = useState<LoyaltyProgramConfig>(loyaltyProgramConfig || DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);

  // Tiers Form State
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierForm, setTierForm] = useState<LoyaltyTier | null>(null);
  const [tierLoading, setTierLoading] = useState(false);

  // Redemption Rules Form State
  const [redeemForm, setRedeemForm] = useState<LoyaltyRedemptionRules>(loyaltyRedemptionRules || DEFAULT_REDEMPTION);
  const [redeemLoading, setRedeemLoading] = useState(false);

  // Bonus Rules Form State
  const [editingBonusId, setEditingBonusId] = useState<string | null>(null);
  const [bonusForm, setBonusForm] = useState<LoyaltyBonusRule | null>(null);
  const [bonusLoading, setBonusLoading] = useState(false);

  // Wallets List State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Manual Points Adjustment State
  const [adjustType, setAdjustType] = useState<'ADJUST_ADD' | 'ADJUST_SUB'>('ADJUST_ADD');
  const [adjustPoints, setAdjustPoints] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Customer Goodwill');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [supervisorConfirmed, setSupervisorConfirmed] = useState(false);

  // Initialize local states from context once loaded
  React.useEffect(() => {
    if (loyaltyProgramConfig) setConfigForm(loyaltyProgramConfig);
  }, [loyaltyProgramConfig]);

  React.useEffect(() => {
    if (loyaltyRedemptionRules) setRedeemForm(loyaltyRedemptionRules);
  }, [loyaltyRedemptionRules]);

  // Filters for Loyalty Accounts
  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return loyaltyAccounts;
    const q = searchQuery.toLowerCase().trim();
    return loyaltyAccounts.filter(acc => 
      acc.patientName.toLowerCase().includes(q) ||
      acc.mobile.includes(q) ||
      acc.accountNo.toLowerCase().includes(q) ||
      (acc.patientId && acc.patientId.toLowerCase().includes(q))
    );
  }, [searchQuery, loyaltyAccounts]);

  const selectedAccount = useMemo(() => 
    loyaltyAccounts.find(acc => acc.id === selectedAccountId), [selectedAccountId, loyaltyAccounts]);

  const accountTransactions = useMemo(() => {
    if (!selectedAccountId) return [];
    return loyaltyTransactions.filter(txn => txn.accountId === selectedAccountId);
  }, [selectedAccountId, loyaltyTransactions]);

  // Report calculations
  const reportSummary = useMemo(() => {
    const earned = loyaltyTransactions
      .filter(t => ['EARN', 'WELCOME', 'BIRTHDAY', 'REFERRAL', 'MILESTONE', 'FESTIVAL'].includes(t.transactionType) && !t.isReversed)
      .reduce((s, t) => s + Math.abs(t.points), 0);

    const redeemed = loyaltyTransactions
      .filter(t => t.transactionType === 'REDEEM' && !t.isReversed)
      .reduce((s, t) => s + Math.abs(t.points), 0);

    const expired = loyaltyTransactions
      .filter(t => t.transactionType === 'EXPIRE' && !t.isReversed)
      .reduce((s, t) => s + Math.abs(t.points), 0);

    const reversed = loyaltyTransactions
      .filter(t => t.transactionType === 'REVERSE')
      .reduce((s, t) => s + Math.abs(t.points), 0);

    const activeLiability = loyaltyAccounts.reduce((s, a) => s + (a.currentPoints || 0), 0);

    return { earned, redeemed, expired, reversed, activeLiability };
  }, [loyaltyTransactions, loyaltyAccounts]);

  // Top Customers calculation
  const topCustomers = useMemo(() => {
    return [...loyaltyAccounts]
      .sort((a, b) => b.lifetimePoints - a.lifetimePoints)
      .slice(0, 10);
  }, [loyaltyAccounts]);

  // Form Submit Handlers
  const handleSaveConfig = async () => {
    if (!configForm) return;
    setConfigLoading(true);
    const success = await saveLoyaltyProgramConfig(configForm);
    if (success) {
      showToast('success', 'Global configuration updated.');
    }
    setConfigLoading(false);
  };

  const handleSaveRedeemRules = async () => {
    if (!redeemForm) return;
    setRedeemLoading(true);
    const success = await saveLoyaltyRedemptionRules(redeemForm);
    if (success) {
      showToast('success', 'Redemption settings updated.');
    }
    setRedeemLoading(false);
  };

  const handleStartEditTier = (tier: LoyaltyTier) => {
    setEditingTierId(tier.id);
    setTierForm({ ...tier });
  };

  const handleSaveTier = async () => {
    if (!tierForm) return;
    setTierLoading(true);
    const success = await saveLoyaltyTier(tierForm);
    if (success) {
      setEditingTierId(null);
      setTierForm(null);
    }
    setTierLoading(false);
  };

  const handleStartEditBonus = (bonus: LoyaltyBonusRule) => {
    setEditingBonusId(bonus.id);
    setBonusForm({ ...bonus });
  };

  const handleSaveBonus = async () => {
    if (!bonusForm) return;
    setBonusLoading(true);
    const success = await saveLoyaltyBonusRule(bonusForm);
    if (success) {
      setEditingBonusId(null);
      setBonusForm(null);
    }
    setBonusLoading(false);
  };

  const handleAdjustPoints = async () => {
    if (!selectedAccountId || adjustPoints <= 0 || !supervisorConfirmed) {
      showToast('error', 'Please enter a valid points amount and confirm supervisor authorization.');
      return;
    }
    setAdjustLoading(true);
    const success = await manualLoyaltyAdjustment(selectedAccountId, adjustType, adjustPoints, adjustReason);
    if (success) {
      setAdjustPoints(0);
      setSupervisorConfirmed(false);
    }
    setAdjustLoading(false);
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Page Title */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Award className="w-7 h-7 text-blue-600" /> Loyalty Portal
          </h1>
          <p className="text-slate-500 text-sm font-medium">Configure configurations, check patient wallets, and track transactions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('setup')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'setup'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings className="w-4 h-4" /> Setup
        </button>
        <button
          onClick={() => setActiveTab('wallets')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'wallets'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" /> Patient Wallets
          {loyaltyAccounts.length > 0 && (
            <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {loyaltyAccounts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'reports'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Reports
        </button>
      </div>

      {/* ─── TAB 1: SETUP ─── */}
      {activeTab === 'setup' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-y-auto flex-1 pb-10">
          
          {/* Section A: Global Config */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-md font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500" /> Section A: Program Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Program Name</label>
                <input
                  type="text"
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50/50"
                  value={configForm.programName}
                  onChange={e => setConfigForm({ ...configForm, programName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Program Status</label>
                <select
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white font-semibold text-slate-700"
                  value={configForm.programStatus}
                  onChange={e => setConfigForm({ ...configForm, programStatus: e.target.value as 'Active' | 'Inactive' })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Points per ₹100 spent</label>
                <input
                  type="number"
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50/50"
                  value={configForm.earnRate}
                  onChange={e => setConfigForm({ ...configForm, earnRate: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Point Monetary Value (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50/50"
                  value={configForm.pointValue}
                  onChange={e => setConfigForm({ ...configForm, pointValue: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry duration (Days)</label>
                <input
                  type="number"
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50/50"
                  value={configForm.expiryDays}
                  onChange={e => setConfigForm({ ...configForm, expiryDays: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rounding Mode</label>
                <select
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white font-semibold text-slate-700"
                  value={configForm.pointsRounding}
                  onChange={e => setConfigForm({ ...configForm, pointsRounding: e.target.value as 'FLOOR' | 'ROUND' | 'CEIL' })}
                >
                  <option value="FLOOR">FLOOR (Round down)</option>
                  <option value="ROUND">ROUND (Nearest integer)</option>
                  <option value="CEIL">CEIL (Round up)</option>
                </select>
              </div>
              <div className="col-span-1 md:col-span-2 flex flex-col gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Automations</h3>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-blue-600 focus:ring-blue-500"
                      checked={configForm.autoEnroll}
                      onChange={e => setConfigForm({ ...configForm, autoEnroll: e.target.checked })}
                    />
                    Auto-enrol new mobiles
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-blue-600 focus:ring-blue-500"
                      checked={configForm.smsEnabled}
                      onChange={e => setConfigForm({ ...configForm, smsEnabled: e.target.checked })}
                    />
                    SMS Notifications Enabled
                  </label>
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  disabled={configLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  {configLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Settings
                </button>
              </div>
            </div>
          </div>

          {/* Section C: Redemption Rules */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-md font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" /> Section C: Redemption Rules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Min points to redeem</label>
                <input
                  type="number"
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50/50"
                  value={redeemForm.minPointsToRedeem}
                  onChange={e => setRedeemForm({ ...redeemForm, minPointsToRedeem: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max Redemption Percentage (%)</label>
                <input
                  type="number"
                  max={100}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50/50"
                  value={redeemForm.maxRedemptionPct}
                  onChange={e => setRedeemForm({ ...redeemForm, maxRedemptionPct: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max points allowed per bill</label>
                <input
                  type="number"
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50/50"
                  value={redeemForm.maxPointsPerBill}
                  onChange={e => setRedeemForm({ ...redeemForm, maxPointsPerBill: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end pb-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-blue-500"
                    checked={redeemForm.blockOnDiscountedBill}
                    onChange={e => setRedeemForm({ ...redeemForm, blockOnDiscountedBill: e.target.checked })}
                  />
                  Block redemption on discounted bills
                </label>
              </div>
              <div className="col-span-1 md:col-span-2 flex justify-end">
                <button
                  onClick={handleSaveRedeemRules}
                  disabled={redeemLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  {redeemLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Rules
                </button>
              </div>
            </div>
          </div>

          {/* Section B: Tier Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 xl:col-span-2">
            <h2 className="text-md font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-violet-500" /> Section B: Tier Configuration
            </h2>
            <div className={`grid ${loyaltyTiers.length === 0 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-6`}>
              {loyaltyTiers.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 p-8 rounded-2xl text-center space-y-4">
                  <div className="max-w-md mx-auto">
                    <p className="text-sm font-semibold text-slate-500 mb-2">No loyalty tiers configured in database.</p>
                    <p className="text-xs text-slate-400 mb-4">Click below to automatically initialize the standard tiers: Silver (0+ pts, 1x mult), Gold (1000+ pts, 1.5x mult), and Platinum (5000+ pts, 2x mult).</p>
                    <button
                      onClick={async () => {
                        setTierLoading(true);
                        try {
                          for (const t of DEFAULT_TIERS) {
                            await saveLoyaltyTier(t as any);
                          }
                          showToast('success', 'Default tiers initialized successfully.');
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setTierLoading(false);
                        }
                      }}
                      disabled={tierLoading}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 mx-auto"
                    >
                      {tierLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Initialize Default Tiers (Silver, Gold, Platinum)
                    </button>
                  </div>
                </div>
              ) : (
                loyaltyTiers.map(tier => {
                  const isEditing = editingTierId === tier.id;
                  return (
                    <div key={tier.id} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl relative shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full border ${
                            tier.tierName === 'Silver' ? 'bg-slate-200 border-slate-300 text-slate-700' :
                            tier.tierName === 'Gold' ? 'bg-amber-100 border-amber-200 text-amber-700' :
                            'bg-indigo-100 border-indigo-200 text-indigo-700'
                          }`}>
                            {tier.tierName} Card
                          </span>
                          {!isEditing && (
                            <button
                              onClick={() => handleStartEditTier(tier)}
                              className="text-[10px] font-black text-blue-600 hover:text-blue-700"
                            >
                              Edit parameters
                            </button>
                          )}
                        </div>
                        
                        {isEditing && tierForm ? (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Min points limit</label>
                              <input
                                type="number"
                                className="w-full h-8 border border-slate-200 rounded-lg px-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                value={tierForm.minLifetimePoints}
                                onChange={e => setTierForm({ ...tierForm, minLifetimePoints: Number(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Multiplier coefficient</label>
                              <input
                                type="number"
                                step="0.1"
                                className="w-full h-8 border border-slate-200 rounded-lg px-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                value={tierForm.earnMultiplier}
                                onChange={e => setTierForm({ ...tierForm, earnMultiplier: Number(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Birthday bonus points</label>
                              <input
                                type="number"
                                className="w-full h-8 border border-slate-200 rounded-lg px-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                value={tierForm.birthdayBonusPoints}
                                onChange={e => setTierForm({ ...tierForm, birthdayBonusPoints: Number(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Welcome bonus points</label>
                              <input
                                type="number"
                                className="w-full h-8 border border-slate-200 rounded-lg px-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                value={tierForm.welcomeBonusPoints}
                                onChange={e => setTierForm({ ...tierForm, welcomeBonusPoints: Number(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 mt-4">
                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                              <span>Points Threshold:</span>
                              <span className="font-bold text-slate-800">{tier.minLifetimePoints} pts</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                              <span>Multiplier:</span>
                              <span className="font-bold text-blue-600">{tier.earnMultiplier}x</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                              <span>Welcome Bonus:</span>
                              <span className="font-bold text-slate-800">{tier.welcomeBonusPoints} pts</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                              <span>Birthday Bonus:</span>
                              <span className="font-bold text-slate-800">{tier.birthdayBonusPoints} pts</span>
                            </div>
                          </div>
                        )}
                      </div>
                      {isEditing && (
                        <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-slate-200">
                          <button
                            onClick={() => setEditingTierId(null)}
                            className="px-3 py-1 bg-white hover:bg-slate-100 border rounded-lg text-[10px] font-bold text-slate-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveTier}
                            disabled={tierLoading}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold"
                          >
                            {tierLoading ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section D: Bonus Rules */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 xl:col-span-2">
            <h2 className="text-md font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 text-rose-500" /> Section D: Bonus Rules & Milestones
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b">
                  <tr>
                    <th className="py-2.5 px-4">Event Type</th>
                    <th className="py-2.5 px-4">Points Awarded</th>
                    <th className="py-2.5 px-4">Trigger Condition</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loyaltyBonusRules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center bg-slate-50/50">
                        <div className="max-w-md mx-auto p-4 space-y-3">
                          <p className="text-sm font-semibold text-slate-500">No bonus rules or milestone triggers defined.</p>
                          <p className="text-xs text-slate-400">Click below to initialize standard welcome, referral, and purchase milestone reward triggers.</p>
                          <button
                            type="button"
                            onClick={async () => {
                              setBonusLoading(true);
                              try {
                                for (const b of DEFAULT_BONUSES) {
                                  await saveLoyaltyBonusRule(b as any);
                                }
                                showToast('success', 'Default bonus rules initialized successfully.');
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setBonusLoading(false);
                              }
                            }}
                            disabled={bonusLoading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 mx-auto"
                          >
                            {bonusLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            Initialize Default Bonus & Milestone Rules
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    loyaltyBonusRules.map(bonus => {
                      const isEditing = editingBonusId === bonus.id;
                      return (
                        <tr key={bonus.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-700">{bonus.bonusType}</td>
                          <td className="py-3 px-4">
                            {isEditing && bonusForm ? (
                              <input
                                type="number"
                                className="w-24 h-8 border border-slate-200 rounded-lg px-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                value={bonusForm.pointsAwarded || ''}
                                onChange={e => setBonusForm({ ...bonusForm, pointsAwarded: Number(e.target.value) || null })}
                              />
                            ) : (
                              <span className="font-bold text-blue-600">{bonus.pointsAwarded || 0} pts</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-semibold">{bonus.triggerCondition}</td>
                          <td className="py-3 px-4 text-center">
                            {isEditing && bonusForm ? (
                              <select
                                className="h-8 border border-slate-200 rounded-lg px-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                value={bonusForm.isActive ? 'Active' : 'Inactive'}
                                onChange={e => setBonusForm({ ...bonusForm, isActive: e.target.value === 'Active' })}
                              >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                bonus.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {bonus.isActive ? 'Active' : 'Inactive'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isEditing ? (
                              <div className="flex justify-center gap-1.5">
                                <button
                                  onClick={() => setEditingBonusId(null)}
                                  className="px-2 py-1 bg-white hover:bg-slate-100 border rounded text-[10px] font-bold text-slate-500"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveBonus}
                                  disabled={bonusLoading}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold"
                                >
                                  {bonusLoading ? '...' : 'Save'}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleStartEditBonus(bonus)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB 2: PATIENT WALLETS ─── */}
      {activeTab === 'wallets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
          
          {/* Left panel: Search & Accounts */}
          <div className="lg:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Find Patient Account</label>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search phone number, name or card..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredAccounts.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">No matching loyalty accounts found.</div>
              ) : (
                filteredAccounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedAccountId === acc.id 
                        ? 'bg-blue-50 border-blue-300 shadow-sm' 
                        : 'bg-white border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="font-bold text-slate-800 text-sm">{acc.patientName}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        acc.currentTier === 'Silver' ? 'bg-slate-200 text-slate-700' :
                        acc.currentTier === 'Gold' ? 'bg-amber-100 text-amber-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {acc.currentTier}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                      <span>{acc.mobile}</span>
                      <span className="font-bold text-blue-600">{acc.currentPoints} pts</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right panel: Account detail and timeline */}
          <div className="lg:col-span-2 flex flex-col overflow-hidden">
            {selectedAccount ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                {/* Account Banner */}
                <div className="p-6 border-b border-slate-100 flex flex-wrap justify-between items-center bg-slate-50/50 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-md font-black">
                      {selectedAccount.patientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{selectedAccount.patientName}</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Account ID: {selectedAccount.accountNo}</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Available Points</div>
                      <div className="text-2xl font-black text-blue-600">{selectedAccount.currentPoints}</div>
                    </div>
                    <div className="text-right border-l pl-6">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Lifetime Earned</div>
                      <div className="text-2xl font-black text-slate-700">{selectedAccount.lifetimePoints}</div>
                    </div>
                  </div>
                </div>

                {/* Account details and transaction history */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
                  
                  {/* Info list */}
                  <div className="xl:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Profile & Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>Phone: <strong className="text-slate-800">{selectedAccount.mobile}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>DOB: <strong className="text-slate-800">{selectedAccount.dateOfBirth || '—'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>Email: <strong className="text-slate-800">{selectedAccount.email || '—'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span>MRN Link: <strong className="text-slate-800">{selectedAccount.patientId || '—'}</strong></span>
                      </div>
                    </div>

                    {/* Timeline Ledger */}
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pt-2">Transaction History</h3>
                    <div className="space-y-2">
                      {accountTransactions.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs italic">No points transactions recorded.</div>
                      ) : (
                        accountTransactions.map(txn => {
                          const isCredit = txn.points > 0;
                          return (
                            <div key={txn.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-all">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isCredit ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {isCredit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-700">{txn.description || txn.transactionType}</div>
                                  <div className="text-[10px] text-slate-400 font-medium">{new Date(txn.transactionDate).toLocaleString()}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-sm font-black ${isCredit ? 'text-green-600' : 'text-rose-600'}`}>
                                  {isCredit ? '+' : ''}{txn.points} pts
                                </span>
                                {txn.referenceBillNo && (
                                  <div className="text-[9px] font-bold text-blue-600">{txn.referenceBillNo}</div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Manual adjustment panel (Right) */}
                  <div className="xl:col-span-1 space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Adjust Wallet</h3>
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adjustment Type</label>
                        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200">
                          <button
                            onClick={() => setAdjustType('ADJUST_ADD')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              adjustType === 'ADJUST_ADD' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-600'
                            }`}
                          >
                            Add Points
                          </button>
                          <button
                            onClick={() => setAdjustType('ADJUST_SUB')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              adjustType === 'ADJUST_SUB' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600'
                            }`}
                          >
                            Deduct
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Points Amount</label>
                        <input
                          type="number"
                          min={1}
                          className="w-full h-10 border border-slate-200 bg-white rounded-xl px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          value={adjustPoints || ''}
                          onChange={e => setAdjustPoints(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="e.g. 100"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reason for adjustment</label>
                        <input
                          type="text"
                          className="w-full h-10 border border-slate-200 bg-white rounded-xl px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          value={adjustReason}
                          onChange={e => setAdjustReason(e.target.value)}
                          placeholder="e.g. Customer goodwill"
                        />
                      </div>

                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                        <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <label className="text-[10px] font-semibold text-amber-800 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded text-amber-600 focus:ring-amber-500 mr-1.5"
                            checked={supervisorConfirmed}
                            onChange={e => setSupervisorConfirmed(e.target.checked)}
                          />
                          Authorized by supervisor
                        </label>
                      </div>

                      <button
                        onClick={handleAdjustPoints}
                        disabled={adjustLoading || adjustPoints <= 0 || !supervisorConfirmed}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
                          adjustType === 'ADJUST_ADD' 
                            ? 'bg-green-600 hover:bg-green-700 disabled:bg-slate-300' 
                            : 'bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300'
                        }`}
                      >
                        {adjustLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Apply Adjustment
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                  <Award className="w-12 h-12 text-slate-300" />
                </div>
                <h2 className="text-xl font-semibold text-slate-700 mb-2">Select a Patient</h2>
                <p className="text-sm text-slate-500">Search for a patient profile to review points ledger history and apply manually configurations.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: REPORTS ─── */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 overflow-y-auto flex-1 pb-10">
          
          {/* Daily Points Stats Summary cards */}
          <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Points Earned</span>
              <span className="text-3xl font-black text-green-600 leading-none mt-4">{reportSummary.earned} pts</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Points Redeemed</span>
              <span className="text-3xl font-black text-rose-600 leading-none mt-4">{reportSummary.redeemed} pts</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Points Expired</span>
              <span className="text-3xl font-black text-slate-600 leading-none mt-4">{reportSummary.expired} pts</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between bg-gradient-to-br from-blue-50 to-indigo-50/20">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Active Liability Balance</span>
              <span className="text-3xl font-black text-blue-700 leading-none mt-4">{reportSummary.activeLiability} pts</span>
            </div>
          </div>

          {/* Points Liability & Top Customers Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 xl:col-span-2 flex flex-col justify-between">
            <div>
              <h2 className="text-md font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" /> Redemption & Loyalty Ledger Logs
              </h2>
              <div className="overflow-x-auto mt-4 max-h-[350px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b">
                    <tr>
                      <th className="py-2 px-4">Date</th>
                      <th className="py-2 px-4">Account ID</th>
                      <th className="py-2 px-4">Action</th>
                      <th className="py-2 px-4 text-right">Points</th>
                      <th className="py-2 px-4">Reference Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loyaltyTransactions.slice(0, 50).map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 text-xs text-slate-500">{new Date(t.transactionDate).toLocaleDateString()}</td>
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-700 font-bold">{t.accountId.slice(0, 8)}...</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                            t.transactionType === 'EARN' ? 'bg-green-100 text-green-700' :
                            t.transactionType === 'REDEEM' ? 'bg-rose-100 text-rose-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {t.transactionType}
                          </span>
                        </td>
                        <td className={`py-2.5 px-4 text-right font-bold text-xs ${t.points > 0 ? 'text-green-600' : 'text-rose-600'}`}>
                          {t.points > 0 ? '+' : ''}{t.points}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-xs text-blue-700 font-mono">{t.referenceBillNo || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Top Customers (1/3 panel) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 xl:col-span-1">
            <h2 className="text-md font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" /> Top Points Holders
            </h2>
            <div className="space-y-3">
              {topCustomers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">No records found.</div>
              ) : (
                topCustomers.map((c, i) => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-black text-slate-400 w-4">#{i+1}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-700">{c.patientName}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{c.mobile}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-blue-600">{c.currentPoints} pts</div>
                      <div className="text-[9px] font-bold text-slate-400">spend: {formatCurrency(c.lifetimeSpend)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
