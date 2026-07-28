import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../services/supabaseClient';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Store {
  id: string;
  store_name: string;
  store_code: string;
}

interface ReagentLot {
  batchNo: string;
  expiryDate: string | null;
  balance: number;
}

interface ReagentRow {
  itemId: string;
  itemName: string;
  itemCode: string;
  reorderLevel: number;
  lots: ReagentLot[];
  totalBalance: number;
  earliestExpiry: string | null;
  qcStatus: string;
}

interface ServiceCapacity {
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  testsPossible: number;
  limitingReagentName: string;
  limitingBalance: number;
  limitingQtyPerTest: number;
}

interface AlertItem {
  type: 'expiring' | 'low' | 'override';
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 9999;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function VialIndicator({ pct, level }: { pct: number; level: 'ok' | 'warn' | 'crit' }) {
  const fillColor =
    level === 'crit' ? '#C0392B' : level === 'warn' ? '#B7791F' : '#0F6E6E';
  const height = Math.max(2, Math.min(100, pct));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        position: 'relative', width: 16, height: 36,
        border: '1.5px solid #92A2AE', borderRadius: '3px 3px 7px 7px',
        background: '#EEF2F4', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: -3, left: '50%',
          transform: 'translateX(-50%)', width: 8, height: 4,
          background: '#92A2AE', borderRadius: '1px 1px 0 0',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${height}%`, background: fillColor, transition: 'height 0.4s ease',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 2, background: 'rgba(255,255,255,0.45)',
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LimsReagentsDashboard() {
  const supabase = getSupabase();

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [capacities, setCapacities] = useState<ServiceCapacity[]>([]);
  const [reagents, setReagents] = useState<ReagentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // ─── Fetch stores that have reagent mappings ──────────────────────────────
  useEffect(() => {
    const fetchStores = async () => {
      // Get all stores referenced in lab_service_reagents
      const { data: mappingStores } = await supabase
        .from('lab_service_reagents')
        .select('store_id');

      const storeIds = Array.from(new Set((mappingStores || []).map((m: any) => m.store_id)));

      if (storeIds.length === 0) {
        // fallback: show all active stores
        const { data } = await supabase
          .from('stores')
          .select('id, store_name, store_code')
          .eq('status', 'Active')
          .order('store_name');
        if (data && data.length > 0) {
          setStores(data);
          setSelectedStoreId(data[0].id);
        }
        return;
      }

      const { data } = await supabase
        .from('stores')
        .select('id, store_name, store_code')
        .in('id', storeIds)
        .order('store_name');

      if (data && data.length > 0) {
        setStores(data);
        setSelectedStoreId(data[0].id);
      }
    };
    fetchStores();
  }, []);

  // ─── Main data fetch ──────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch reagent mappings — filter by selected store if set
      const query = supabase
        .from('lab_service_reagents')
        .select(`
          service_id,
          item_id,
          store_id,
          quantity_per_test,
          inventory_items(id, item_name, item_code, reorder_level),
          service_definitions(name, code)
        `);

      const { data: allMappings, error: mapErr } =
        selectedStoreId ? await query.eq('store_id', selectedStoreId) : await query;

      if (mapErr) throw mapErr;

      const mappings = allMappings || [];

      if (mappings.length === 0) {
        setReagents([]);
        setCapacities([]);
        setAlerts([]);
        setLastRefreshed(new Date());
        setLoading(false);
        return;
      }

      // 2. Fetch ledger rows ordered by created_at so the last row per batch = latest closing_stock
      const storeIds = Array.from(new Set(mappings.map((m: any) => m.store_id)));
      const itemIds  = Array.from(new Set(mappings.map((m: any) => m.item_id)));

      const { data: ledgerRaw } = await supabase
        .from('inventory_stock_ledger')
        .select('store_id, item_id, batch_no, expiry_date, stock_in_quantity, stock_out_quantity, closing_stock')
        .in('store_id', storeIds)
        .in('item_id', itemIds)
        .order('created_at', { ascending: true });

      const ledger = ledgerRaw || [];

      // 3. Build lot map — use closing_stock (written by backend on every transaction) as the
      //    authoritative balance. Because rows are ordered ascending, the last row per batch
      //    always has the most up-to-date closing_stock.
      type LotEntry = { batchNo: string; expiryDate: string | null; balance: number };
      const lotsMap: Record<string, LotEntry[]> = {};

      for (const row of ledger) {
        const key = `${row.store_id}__${row.item_id}`;
        if (!lotsMap[key]) lotsMap[key] = [];
        const batchKey = row.batch_no || '';
        // Prefer closing_stock; fall back to computed net if closing_stock is null
        const closingStock = row.closing_stock != null ? Number(row.closing_stock) : null;
        const netMove      = Number(row.stock_in_quantity || 0) - Number(row.stock_out_quantity || 0);
        const existing = lotsMap[key].find(l => l.batchNo === batchKey);
        if (existing) {
          existing.balance = closingStock !== null ? closingStock : existing.balance + netMove;
        } else {
          lotsMap[key].push({
            batchNo: batchKey,
            expiryDate: row.expiry_date || null,
            balance: closingStock !== null ? closingStock : netMove,
          });
        }
      }

      // 4. Build reagent rows (deduplicated by item+store)
      const seenItemStore = new Set<string>();
      const rows: ReagentRow[] = [];

      for (const m of mappings) {
        const key = `${m.store_id}__${m.item_id}`;
        if (seenItemStore.has(key)) continue;
        seenItemStore.add(key);

        const inv: any = Array.isArray(m.inventory_items) ? m.inventory_items[0] : m.inventory_items;
        if (!inv) continue;

        const rawLots = (lotsMap[key] || []).filter(l => l.balance > 0);
        const sortedLots = rawLots.sort((a, b) => {
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        });
        const totalBalance = sortedLots.reduce((s, l) => s + l.balance, 0);
        const earliestExpiry = sortedLots.length > 0 ? sortedLots[0].expiryDate : null;

        rows.push({
          itemId: m.item_id,
          itemName: inv.item_name || 'Unknown',
          itemCode: inv.item_code || '',
          reorderLevel: Number(inv.reorder_level || 20),
          lots: sortedLots,
          totalBalance,
          earliestExpiry,
          qcStatus: 'Passed',
        });
      }

      setReagents(rows);

      // 5. Build balance lookup for capacity computation
      const balanceLookup: Record<string, number> = {};
      rows.forEach(r => {
        const m = mappings.find((mp: any) => mp.item_id === r.itemId);
        if (m) balanceLookup[`${m.store_id}__${r.itemId}`] = r.totalBalance;
      });

      // 6. Service capacity cards
      const serviceMap: Record<string, {
        serviceName: string; serviceCode: string;
        reagents: { name: string; balance: number; qtyPerTest: number; possible: number }[];
      }> = {};

      for (const m of mappings) {
        const svc: any = Array.isArray(m.service_definitions) ? m.service_definitions[0] : m.service_definitions;
        const inv: any = Array.isArray(m.inventory_items) ? m.inventory_items[0] : m.inventory_items;
        const sid = m.service_id;

        if (!serviceMap[sid]) {
          serviceMap[sid] = { serviceName: svc?.name || 'Unknown', serviceCode: svc?.code || '', reagents: [] };
        }

        const balance = balanceLookup[`${m.store_id}__${m.item_id}`] ?? 0;
        const qtyPerTest = Number(m.quantity_per_test || 0);
        const possible = qtyPerTest > 0 ? Math.floor(balance / qtyPerTest) : 0;
        serviceMap[sid].reagents.push({ name: inv?.item_name || 'Unknown', balance, qtyPerTest, possible });
      }

      const caps: ServiceCapacity[] = Object.entries(serviceMap).map(([sid, g]) => {
        const sorted = [...g.reagents].sort((a, b) => a.possible - b.possible);
        const limiting = sorted[0];
        return {
          serviceId: sid,
          serviceName: g.serviceName,
          serviceCode: g.serviceCode,
          testsPossible: limiting?.possible ?? 0,
          limitingReagentName: limiting?.name ?? '',
          limitingBalance: limiting?.balance ?? 0,
          limitingQtyPerTest: limiting?.qtyPerTest ?? 0,
        };
      });

      setCapacities(caps);

      // 7. Alerts
      const newAlerts: AlertItem[] = [];
      for (const row of rows) {
        if (row.earliestExpiry) {
          const days = daysUntil(row.earliestExpiry);
          if (days >= 0 && days <= 30) {
            newAlerts.push({
              type: 'expiring',
              message: `${row.itemName} — Lot ${row.lots[0]?.batchNo || '—'} expires in ${days} day${days !== 1 ? 's' : ''}`,
            });
          }
        }
        if (row.totalBalance < row.reorderLevel) {
          newAlerts.push({
            type: 'low',
            message: `${row.itemName} — below reorder point (${row.totalBalance.toFixed(1)} units)`,
          });
        }
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: overrideCount } = await supabase
        .from('lab_reagent_consumption_log')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'OVERRIDE_DEDUCT')
        .gte('created_at', todayStart.toISOString());

      if (overrideCount && overrideCount > 0) {
        newAlerts.push({ type: 'override', message: `${overrideCount} shortfall override${overrideCount > 1 ? 's' : ''} logged today` });
      }

      setAlerts(newAlerts);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error loading Reagent Dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    if (selectedStoreId !== undefined) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 60000);
      return () => clearInterval(interval);
    }
  }, [fetchDashboardData]);

  const selectedStore = stores.find(s => s.id === selectedStoreId);

  // ─── Render helpers ───────────────────────────────────────────────────────

  const getHealthStatus = (row: ReagentRow): { label: string; cls: string } => {
    if (row.earliestExpiry && daysUntil(row.earliestExpiry) <= 30)
      return { label: 'Expiring soon', cls: 'expiring' };
    if (row.totalBalance < row.reorderLevel)
      return { label: 'Below reorder', cls: 'low' };
    return { label: 'Healthy', cls: 'ok' };
  };

  const getQcCls = (status: string) => {
    if (status === 'Passed' || status === 'Approved') return 'ok';
    if (status === 'Pending') return 'low';
    return 'expiring';
  };

  const getVialLevel = (row: ReagentRow): 'ok' | 'warn' | 'crit' => {
    const h = getHealthStatus(row);
    return h.cls === 'expiring' ? 'crit' : h.cls === 'low' ? 'warn' : 'ok';
  };

  const maxBalance = Math.max(...reagents.map(r => r.totalBalance), 1);
  const getVialPct  = (row: ReagentRow) => Math.min(100, (row.totalBalance / maxBalance) * 100);
  const getCapCls   = (cap: ServiceCapacity) => cap.testsPossible <= 5 ? 'crit' : cap.testsPossible <= 20 ? 'warn' : 'ok';

  // ─── Inline styles ────────────────────────────────────────────────────────

  const S = {
    page:      { minHeight: '100vh', background: '#F6F8F9', fontFamily: "'Inter', sans-serif", padding: '28px 36px 56px', color: '#101B26' } as React.CSSProperties,
    topbar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap' as const, gap: 16 },
    eyebrow:   { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#0F6E6E', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 },
    liveDot:   { width: 7, height: 7, borderRadius: '50%', background: '#1B8A5A', boxShadow: '0 0 0 3px #E4F5EC' },
    h1:        { fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' },
    sub:       { color: '#5B6B7A', fontSize: 13.5, marginTop: 4 },
    storePill: { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1px solid #DFE6EA', borderRadius: 100, padding: '6px 14px 6px 10px', fontSize: 13, color: '#5B6B7A', boxShadow: '0 1px 2px rgba(16,27,38,.04),0 4px 16px rgba(16,27,38,.05)' } as React.CSSProperties,
    storeDot:  { width: 7, height: 7, borderRadius: '50%', background: '#0F6E6E', flexShrink: 0 as const },
    storeSelect: { border: 'none', background: 'transparent', fontWeight: 600, color: '#101B26', fontSize: 13, cursor: 'pointer', outline: 'none' } as React.CSSProperties,
    alertStrip:{ display: 'flex', gap: 10, overflowX: 'auto' as const, marginBottom: 28, paddingBottom: 2 },
    sectionHead:{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '32px 0 14px' },
    sectionH2: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, margin: 0, color: '#101B26' },
    sectionCnt:{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#92A2AE' },
    capGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 },
    tableWrap: { background: '#FFFFFF', border: '1px solid #DFE6EA', borderRadius: 10, boxShadow: '0 1px 2px rgba(16,27,38,.04),0 4px 16px rgba(16,27,38,.05)', overflow: 'hidden' },
    refreshBtn:{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0F6E6E', background: '#E4F1F0', border: '1px solid #C5DFDD', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 500 } as React.CSSProperties,
  };

  const chipStyle = (type: AlertItem['type']): React.CSSProperties => {
    const base: React.CSSProperties = { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', border: '1px solid transparent' };
    if (type === 'expiring') return { ...base, background: '#FBE7E4', color: '#8C2E22', borderColor: '#F0C9C2' };
    return { ...base, background: '#FBF0DD', color: '#8A5A16', borderColor: '#EFD9AE' };
  };

  const chipTag = (type: AlertItem['type']) => (
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', background: 'rgba(0,0,0,0.07)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
      {type === 'expiring' ? 'Expiring' : type === 'low' ? 'Low Stock' : 'Override'}
    </span>
  );

  const StatusPill = ({ cls, label }: { cls: string; label: string }) => {
    const c = { ok: { bg: '#E4F5EC', color: '#1B8A5A', dot: '#1B8A5A' }, low: { bg: '#FBF0DD', color: '#8A5A16', dot: '#B7791F' }, expiring: { bg: '#FBE7E4', color: '#8C2E22', dot: '#C0392B' } }[cls] || { bg: '#E4F5EC', color: '#1B8A5A', dot: '#1B8A5A' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 500, padding: '4px 9px', borderRadius: 100, background: c.bg, color: c.color }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />{label}
      </span>
    );
  };

  const CapCard = ({ cap }: { cap: ServiceCapacity }) => {
    const isTight = getCapCls(cap) !== 'ok';
    return (
      <div style={{ background: '#FFFFFF', border: `1px solid ${isTight ? '#EFD9AE' : '#DFE6EA'}`, borderRadius: 10, padding: 20, boxShadow: '0 1px 2px rgba(16,27,38,.04),0 4px 16px rgba(16,27,38,.05)' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{cap.serviceName}</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#92A2AE', marginBottom: 16 }}>{cap.serviceCode}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 34, fontWeight: 600, lineHeight: 1, color: isTight ? '#B7791F' : '#101B26' }}>{cap.testsPossible}</span>
          <span style={{ fontSize: 12.5, color: '#5B6B7A' }}>tests possible</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px dashed #DFE6EA', fontSize: 12.5, color: '#5B6B7A' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600, padding: '3px 7px', borderRadius: 5, background: isTight ? '#FBF0DD' : '#E4F5EC', color: isTight ? '#8A5A16' : '#1B8A5A' }}>Limiting</span>
          <span style={{ color: '#101B26', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cap.limitingReagentName}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#92A2AE', flexShrink: 0 }}>{cap.limitingBalance.toFixed(1)} / {cap.limitingQtyPerTest} units</span>
        </div>
      </div>
    );
  };

  // ─── Skeleton ─────────────────────────────────────────────────────────────

  if (loading && reagents.length === 0 && capacities.length === 0) {
    return (
      <div style={S.page}>
        <div style={{ ...S.topbar, marginBottom: 32 }}>
          <div>
            <div style={{ width: 120, height: 12, background: '#DFE6EA', borderRadius: 6, marginBottom: 10 }} />
            <div style={{ width: 220, height: 28, background: '#DFE6EA', borderRadius: 6 }} />
          </div>
        </div>
        <div style={S.capGrid}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 140, background: '#EEF2F4', borderRadius: 10 }} />)}
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.topbar}>
        <div>
          <div style={S.eyebrow}>
            <span style={S.liveDot} />
            Live · {selectedStore?.store_name || 'All Stores'}
          </div>
          <h1 style={S.h1}>Reagent Inventory</h1>
          <p style={S.sub}>Test capacity and stock health across mapped lab services</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={S.storePill}>
            <span style={S.storeDot} />
            <span>Store:&nbsp;</span>
            <select style={S.storeSelect} value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)}>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.store_name} ({s.store_code})</option>
              ))}
            </select>
          </div>
          <button style={S.refreshBtn} onClick={fetchDashboardData} disabled={loading}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Alert strip */}
      {alerts.length > 0 && (
        <div style={S.alertStrip}>
          {alerts.map((a, i) => (
            <div key={i} style={chipStyle(a.type)}>{chipTag(a.type)}{a.message}</div>
          ))}
        </div>
      )}

      {/* Tests Possible Section */}
      <div style={S.sectionHead}>
        <h2 style={S.sectionH2}>Tests Possible, by Service</h2>
        <span style={S.sectionCnt}>{capacities.length} service{capacities.length !== 1 ? 's' : ''} shown</span>
      </div>

      {capacities.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #DFE6EA', borderRadius: 10, padding: 32, textAlign: 'center', color: '#92A2AE', fontSize: 13 }}>
          No reagent mappings found for this store. Configure mappings in LIMS Masters → Reagents Mapping tab.
        </div>
      ) : (
        <div style={S.capGrid}>
          {capacities.map(cap => <CapCard key={cap.serviceId} cap={cap} />)}
        </div>
      )}

      {/* Reagent Stock Table */}
      <div style={S.sectionHead}>
        <h2 style={S.sectionH2}>Reagent Stock — {selectedStore?.store_name || '—'}</h2>
        <span style={S.sectionCnt}>{reagents.length} item{reagents.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={S.tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#EEF2F4', borderBottom: '1px solid #DFE6EA' }}>
              {['Reagent', 'Balance', 'Earliest Lot Expiry', 'QC Status', 'Health'].map(h => (
                <th key={h} style={{ textAlign: 'left', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#92A2AE', fontWeight: 500, padding: '12px 16px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reagents.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px 0', textAlign: 'center', color: '#92A2AE', fontSize: 13 }}>No stock records found for this store.</td></tr>
            ) : reagents.map((row, idx) => {
              const health     = getHealthStatus(row);
              const vialPct    = getVialPct(row);
              const vialLevel  = getVialLevel(row);
              const expDays    = daysUntil(row.earliestExpiry);
              const firstLot   = row.lots[0];
              const expiringSoon = expDays >= 0 && expDays <= 30;

              return (
                <tr key={row.itemId}
                  style={{ borderBottom: idx < reagents.length - 1 ? '1px solid #DFE6EA' : 'none', verticalAlign: 'middle', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FBFCFD')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 500, color: '#101B26', fontSize: 13.5 }}>{row.itemName}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#92A2AE', marginTop: 2 }}>
                      {row.itemCode}{firstLot ? ` · Lot ${firstLot.batchNo}` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <VialIndicator pct={vialPct} level={vialLevel} />
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }}>
                        <span style={{ fontWeight: 600, color: '#101B26' }}>{row.totalBalance.toFixed(1)}</span>{' '}
                        <span style={{ color: '#92A2AE', fontSize: 11 }}>units</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {row.earliestExpiry ? (
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: expiringSoon ? '#C0392B' : '#5B6B7A', fontWeight: expiringSoon ? 700 : 400 }}>
                        {row.earliestExpiry}{expiringSoon && ` · ${expDays}d`}
                      </span>
                    ) : <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#92A2AE' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px' }}><StatusPill cls={getQcCls(row.qcStatus)} label={row.qcStatus} /></td>
                  <td style={{ padding: '14px 16px' }}><StatusPill cls={health.cls} label={health.label} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 28, fontSize: 11.5, color: '#92A2AE', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace" }}>
        Last refreshed: {lastRefreshed.toLocaleTimeString()} · Auto-refreshes every 60 s
      </div>
    </div>
  );
}
