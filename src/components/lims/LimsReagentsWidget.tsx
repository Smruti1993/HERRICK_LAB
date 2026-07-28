import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../services/supabaseClient';
import { FlaskConical, AlertTriangle, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';

interface ReagentStatus {
  itemId: string;
  itemName: string;
  itemCode: string;
  storeName: string;
  qtyPerTest: number;
  balance: number;
  possible: number;
}

interface ServiceReagentSummary {
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  testsPossible: number;
  reagents: ReagentStatus[];
}

export const LimsReagentsWidget = () => {
  const [summaries, setSummaries] = useState<ServiceReagentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  const fetchWidgetData = async () => {
    try {
      const supabase = getSupabase();
      
      // 1. Fetch reagent mappings
      const { data: mappings, error: mapErr } = await supabase
        .from('lab_service_reagents')
        .select(`
          service_id,
          item_id,
          store_id,
          quantity_per_test,
          inventory_items(item_name, item_code),
          stores(store_name, store_code),
          service_definitions(name, code)
        `);
        
      if (mapErr) throw mapErr;
      if (!mappings || mappings.length === 0) {
        setSummaries([]);
        setLoading(false);
        return;
      }
      
      // 2. Fetch stock ledger balances
      const storeIds = Array.from(new Set(mappings.map(m => m.store_id)));
      const itemIds = Array.from(new Set(mappings.map(m => m.item_id)));
      
      const { data: ledger, error: ledgerErr } = await supabase
        .from('inventory_stock_ledger')
        .select('store_id, item_id, stock_in_quantity, stock_out_quantity')
        .in('store_id', storeIds)
        .in('item_id', itemIds);
        
      if (ledgerErr) throw ledgerErr;
      
      // Calculate balances
      const stockBalances: Record<string, number> = {};
      for (const row of ledger || []) {
        const key = `${row.store_id}_${row.item_id}`;
        if (!stockBalances[key]) stockBalances[key] = 0;
        stockBalances[key] += Number(row.stock_in_quantity || 0) - Number(row.stock_out_quantity || 0);
      }
      
      // Group by service
      const serviceGroups: Record<string, { serviceName: string, serviceCode: string, reagents: ReagentStatus[] }> = {};
      for (const m of mappings) {
        const serviceId = m.service_id;
        const serviceDef: any = Array.isArray(m.service_definitions) ? m.service_definitions[0] : m.service_definitions;
        const serviceName = serviceDef?.name || 'Unknown Test';
        const serviceCode = serviceDef?.code || '';
        
        if (!serviceGroups[serviceId]) {
          serviceGroups[serviceId] = { serviceName, serviceCode, reagents: [] };
        }
        
        const key = `${m.store_id}_${m.item_id}`;
        const balance = stockBalances[key] || 0;
        const qtyPerTest = Number(m.quantity_per_test || 0);
        const possible = qtyPerTest > 0 ? Math.floor(balance / qtyPerTest) : 0;
        
        const invItem: any = Array.isArray(m.inventory_items) ? m.inventory_items[0] : m.inventory_items;
        const storeDef: any = Array.isArray(m.stores) ? m.stores[0] : m.stores;

        serviceGroups[serviceId].reagents.push({
          itemId: m.item_id,
          itemName: invItem?.item_name || 'Unknown Item',
          itemCode: invItem?.item_code || '',
          storeName: storeDef?.store_name || 'Unknown Store',
          qtyPerTest,
          balance,
          possible
        });
      }
      
      // Build final summaries
      const dataSummaries = Object.entries(serviceGroups).map(([serviceId, group]) => {
        const minPossible = group.reagents.length > 0 
          ? Math.min(...group.reagents.map(r => r.possible)) 
          : 0;
          
        return {
          serviceId,
          serviceName: group.serviceName,
          serviceCode: group.serviceCode,
          testsPossible: minPossible,
          reagents: group.reagents
        };
      });

      setSummaries(dataSummaries);
    } catch (err) {
      console.error('Error fetching reagents possible statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgetData();
    // Poll every 30 seconds to keep stats fresh
    const interval = setInterval(fetchWidgetData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="h-10 bg-slate-200 rounded"></div>
      </div>
    );
  }

  if (summaries.length === 0) {
    return null; // hide widget if no mappings exist yet
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden max-w-6xl">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-blue-600 animate-pulse" />
          <div>
            <h4 className="font-bold text-sm text-slate-800">Reagents Availability & Test Capacities</h4>
            <p className="text-xxs text-slate-500 font-medium uppercase tracking-wider mt-0.5">Tests Possible Widget (FEFO Bottlenecks)</p>
          </div>
        </div>
      </div>

      <div className="p-5 divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {summaries.map((summary) => {
          const isCritical = summary.testsPossible <= 5;
          const isWarning = summary.testsPossible > 5 && summary.testsPossible <= 20;
          const isExpanded = expandedServiceId === summary.serviceId;

          return (
            <div key={summary.serviceId} className="py-3.5 first:pt-0 last:pb-0">
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-slate-50/50 p-2 rounded-xl transition-all"
                onClick={() => setExpandedServiceId(isExpanded ? null : summary.serviceId)}
              >
                <div className="flex items-center gap-2.5">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg mr-2">
                      {summary.serviceCode}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{summary.serviceName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border ${
                    isCritical 
                      ? 'bg-rose-50 text-rose-700 border-rose-100' 
                      : isWarning
                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}>
                    {isCritical && <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600 shrink-0 animate-bounce" />}
                    {isWarning && <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600 shrink-0" />}
                    {!isCritical && !isWarning && <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" />}
                    {summary.testsPossible} Tests Possible
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 ml-6 pl-4 border-l-2 border-slate-100 space-y-3 pb-2 animate-in slide-in-from-top-2 duration-300">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mapped Reagents Inventory Levels:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {summary.reagents.map((reagent, idx) => (
                      <div key={idx} className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-slate-700">{reagent.itemName}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">Code: {reagent.itemCode} | Store: {reagent.storeName}</p>
                          </div>
                          <span className={`text-[10px] font-black ${
                            reagent.possible <= 5 ? 'text-rose-600' : 'text-slate-600'
                          }`}>
                            {reagent.possible} tests left
                          </span>
                        </div>

                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100/50 text-[10px] text-slate-500">
                          <span>Stock: <strong>{reagent.balance}</strong> units</span>
                          <span>Cons: <strong>{reagent.qtyPerTest}</strong> / test</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
