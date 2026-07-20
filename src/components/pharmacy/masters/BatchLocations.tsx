import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../../context/DataContext';
import { InventoryBatchLocation, PharmacyZoneTemperature } from '../../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TEMP_COLOR: Record<PharmacyZoneTemperature, string> = {
  Ambient:      '#6c7a89',
  Refrigerated: '#2196f3',
  Frozen:       '#00bcd4',
  Controlled:   '#f44336',
};

const TEMP_ICON: Record<PharmacyZoneTemperature, string> = {
  Ambient:      '🌡️',
  Refrigerated: '❄️',
  Frozen:       '🧊',
  Controlled:   '🔒',
};

function expiryClass(expiry: string | undefined): string {
  if (!expiry) return '';
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'expired';
  if (days <= 30) return 'critical';
  if (days <= 90) return 'warning';
  return 'good';
}

const EXPIRY_STYLE: Record<string, React.CSSProperties> = {
  expired:  { color: '#fff',    background: '#e74c3c', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700 },
  critical: { color: '#fff',    background: '#f39c12', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700 },
  warning:  { color: '#7d6608', background: '#fef3cd', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700 },
  good:     { color: '#1d6837', background: '#d4edda', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700 },
  '':       {},
};

// ─────────────────────────────────────────────────────────────────────────────
// BatchLocations Master Component
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_LOC: Omit<InventoryBatchLocation, 'id'> = {
  storeId: '', itemId: '', batchNo: '', zoneId: '', rackId: '',
  shelfNo: 1, binNo: '', isPrimary: true, notes: null
};

const BatchLocations: React.FC = () => {
  const {
    stores, pharmacyZones, pharmacyRacks, inventoryItems,
    fetchStoreBatchLocations, saveBatchLocation, deleteBatchLocation,
    showToast
  } = useData();

  const [selectedStore, setSelectedStore] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [locations, setLocations] = useState<InventoryBatchLocation[]>([]);
  const [loading, setLoading] = useState(false);

  // Slide-out editor
  const [editItem, setEditItem] = useState<(Omit<InventoryBatchLocation, 'id'> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Fetch locations when store changes
  const loadLocations = useCallback(async (storeId: string, search?: string) => {
    if (!storeId) { setLocations([]); return; }
    setLoading(true);
    const data = await fetchStoreBatchLocations(storeId, search);
    setLocations(data);
    setLoading(false);
  }, [fetchStoreBatchLocations]);

  useEffect(() => {
    loadLocations(selectedStore, searchTerm);
  }, [selectedStore]);

  const handleSearch = () => loadLocations(selectedStore, searchTerm);

  // ── Batch items from stock ledger (distinct batches per store-item combination)
  // For the Add form, we'll let user pick item + type batch manually
  const storeItems = inventoryItems;

  // Racks filtered by zone
  const zonesForStore = pharmacyZones.filter(z => z.storeId === selectedStore || !editItem?.storeId || z.storeId === editItem.storeId);
  const racksForZone = pharmacyRacks.filter(r => r.zoneId === (editItem?.zoneId ?? ''));
  const selectedZone = pharmacyZones.find(z => z.id === editItem?.zoneId);
  const selectedRack = pharmacyRacks.find(r => r.id === editItem?.rackId);

  // ── Save
  const handleSave = async () => {
    if (!editItem) return;
    if (!editItem.storeId || !editItem.itemId || !editItem.batchNo.trim() || !editItem.zoneId || !editItem.rackId || !editItem.binNo.trim()) {
      showToast('error', 'All fields (Store, Item, Batch, Zone, Rack, Bin) are required.');
      return;
    }
    setSaving(true);
    const ok = await saveBatchLocation(editItem);
    if (ok) {
      await loadLocations(editItem.storeId);
      setEditItem(null);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await deleteBatchLocation(id);
    setLocations(prev => prev.filter(l => l.id !== id));
    setConfirmDelete(null);
  };

  // ── Unassigned batches (items in stock but no location recorded)
  // Simplified: show items that appear in inventoryItems for the store
  // Real implementation would query stock_ledger for active batches
  const assignedKeys = new Set(locations.map(l => `${l.itemId}::${l.batchNo}`));

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Main Panel ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>📍 Batch Locations</h2>
            <p style={{ margin: '4px 0 0', color: '#6c757d', fontSize: 13 }}>
              Assign Zone › Rack › Shelf › Bin to every medicine batch for FEFO-accurate dispensing.
            </p>
          </div>
          <button
            onClick={() => setEditItem({ ...EMPTY_LOC, storeId: selectedStore })}
            disabled={!selectedStore}
            style={{
              background: selectedStore
                ? 'linear-gradient(135deg, #667eea, #764ba2)'
                : '#dee2e6',
              color: selectedStore ? '#fff' : '#adb5bd',
              border: 'none', borderRadius: 10, padding: '10px 20px',
              fontWeight: 700, fontSize: 14, cursor: selectedStore ? 'pointer' : 'not-allowed'
            }}
          >
            ＋ Assign Location
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, minWidth: 220 }}
          >
            <option value=''>— Select Store —</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
          </select>

          <div style={{ display: 'flex', flex: 1, gap: 8, minWidth: 260 }}>
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder='Search by item, batch, code…'
              style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14 }}
            />
            <button
              onClick={handleSearch}
              style={{ padding: '8px 18px', borderRadius: 8, background: '#667eea', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
            >Search</button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <input type='checkbox' checked={showUnassigned} onChange={e => setShowUnassigned(e.target.checked)} />
            Show unassigned batches
          </label>
        </div>

        {/* Stats bar */}
        {selectedStore && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Assigned', value: locations.length, color: '#2ecc71' },
              { label: 'Zones Used', value: new Set(locations.map(l => l.zoneId)).size, color: '#667eea' },
              { label: 'Near Expiry', value: locations.filter(l => l.batchNo && expiryClass(undefined) === 'warning').length, color: '#f39c12' },
            ].map(stat => (
              <div key={stat.label} style={{
                flex: 1, background: '#fff', borderRadius: 10, border: '1px solid #e9ecef',
                padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 13, color: '#6c757d', fontWeight: 600 }}>{stat.label}</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {!selectedStore ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#adb5bd' }}>
            <div style={{ fontSize: 60 }}>🏪</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginTop: 12 }}>Select a Store</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Choose a pharmacy store to view and manage batch locations.</div>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#adb5bd' }}>
            <div style={{ fontSize: 40, animation: 'spin 1s linear infinite' }}>⏳</div>
            <div style={{ marginTop: 12, fontWeight: 600 }}>Loading batch locations…</div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e9ecef', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  {['Item', 'Batch No', 'Location', 'Zone Type', 'Primary', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#495057', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '60px 0', color: '#adb5bd' }}>
                      <div style={{ fontSize: 40 }}>📭</div>
                      <div style={{ fontWeight: 600, marginTop: 8 }}>No batch locations assigned yet</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>Click "Assign Location" to map a medicine batch to its bin.</div>
                    </td>
                  </tr>
                ) : locations.map((loc, i) => {
                  const temp = loc.temperature ?? 'Ambient';
                  return (
                    <tr key={loc.id} style={{ borderBottom: '1px solid #f1f3f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{loc.itemName}</div>
                        <div style={{ fontSize: 11, color: '#adb5bd' }}>{loc.itemCode}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#343a40', background: '#f1f3f5', borderRadius: 4, padding: '2px 8px' }}>
                          {loc.batchNo}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>{loc.locationDisplay}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#868e96' }}>{loc.locationCode}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: `${TEMP_COLOR[temp]}18`,
                          color: TEMP_COLOR[temp],
                          borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700
                        }}>
                          {TEMP_ICON[temp]} {temp}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {loc.isPrimary
                          ? <span style={{ color: '#2ecc71', fontWeight: 700, fontSize: 12 }}>✔ Primary</span>
                          : <span style={{ color: '#adb5bd', fontSize: 12 }}>Overflow</span>
                        }
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => setEditItem({ ...loc })}
                            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #dee2e6', background: '#f8f9fa', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                          >✏️ Edit</button>
                          <button
                            onClick={() => setConfirmDelete(loc.id!)}
                            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #ffcccc', background: '#fff5f5', color: '#c0392b', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                          >🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Slide-Out Editor Panel ── */}
      {editItem && (
        <>
          <div
            onClick={() => setEditItem(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 900 }}
          />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: 440,
            background: '#fff', boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
            zIndex: 901, overflow: 'auto', padding: 28,
            animation: 'slideIn 0.25s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                {editItem.id ? '✏️ Edit Batch Location' : '📍 Assign Batch Location'}
              </h3>
              <button onClick={() => setEditItem(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#adb5bd' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Store */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#495057', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Store *</label>
                <select
                  value={editItem.storeId}
                  onChange={e => setEditItem(f => f ? { ...f, storeId: e.target.value, zoneId: '', rackId: '' } : f)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14 }}
                >
                  <option value=''>— Select Store —</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                </select>
              </div>

              {/* Item */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#495057', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medicine / Item *</label>
                <select
                  value={editItem.itemId}
                  onChange={e => setEditItem(f => f ? { ...f, itemId: e.target.value } : f)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14 }}
                >
                  <option value=''>— Select Item —</option>
                  {storeItems.map(i => <option key={i.id} value={i.id}>{i.itemCode} — {i.itemName}</option>)}
                </select>
              </div>

              {/* Batch No */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#495057', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Batch Number *</label>
                <input
                  value={editItem.batchNo}
                  onChange={e => setEditItem(f => f ? { ...f, batchNo: e.target.value } : f)}
                  placeholder='e.g. BT-2024-0012'
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #f1f3f5', margin: '4px 0' }} />
              <div style={{ fontWeight: 700, fontSize: 13, color: '#667eea' }}>📍 Location</div>

              {/* Zone */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#495057', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zone *</label>
                <select
                  value={editItem.zoneId}
                  onChange={e => setEditItem(f => f ? { ...f, zoneId: e.target.value, rackId: '' } : f)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14 }}
                >
                  <option value=''>— Select Zone —</option>
                  {pharmacyZones
                    .filter(z => z.isActive && (!editItem.storeId || z.storeId === editItem.storeId))
                    .map(z => (
                      <option key={z.id} value={z.id}>
                        Zone {z.zoneCode} — {z.zoneName} {z.temperature !== 'Ambient' ? `(${z.temperature})` : ''}
                      </option>
                    ))
                  }
                </select>
                {selectedZone && (
                  <div style={{
                    marginTop: 6, padding: '6px 10px', borderRadius: 6,
                    background: `${TEMP_COLOR[selectedZone.temperature]}12`,
                    color: TEMP_COLOR[selectedZone.temperature], fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    {TEMP_ICON[selectedZone.temperature]} {selectedZone.temperature} zone
                  </div>
                )}
              </div>

              {/* Rack */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#495057', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rack *</label>
                <select
                  value={editItem.rackId}
                  onChange={e => setEditItem(f => f ? { ...f, rackId: e.target.value } : f)}
                  disabled={!editItem.zoneId}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, opacity: !editItem.zoneId ? 0.5 : 1 }}
                >
                  <option value=''>— Select Rack —</option>
                  {racksForZone.map(r => (
                    <option key={r.id} value={r.id}>{r.rackCode}{r.rackName ? ` — ${r.rackName}` : ''} ({r.noOfShelves} shelves)</option>
                  ))}
                </select>
              </div>

              {/* Shelf & Bin */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#495057', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shelf No *</label>
                  <input
                    type='number' min={1}
                    max={selectedRack?.noOfShelves ?? 20}
                    value={editItem.shelfNo}
                    onChange={e => setEditItem(f => f ? { ...f, shelfNo: Math.max(1, parseInt(e.target.value) || 1) } : f)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, boxSizing: 'border-box' }}
                  />
                  {selectedRack && (
                    <div style={{ fontSize: 11, color: '#adb5bd', marginTop: 3 }}>1–{selectedRack.noOfShelves}</div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#495057', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bin No *</label>
                  <input
                    value={editItem.binNo}
                    onChange={e => setEditItem(f => f ? { ...f, binNo: e.target.value } : f)}
                    placeholder='e.g. 01'
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Location preview */}
              {editItem.zoneId && editItem.rackId && editItem.binNo && (
                <div style={{
                  background: 'linear-gradient(135deg, #667eea18, #764ba218)',
                  border: '1px solid #667eea30', borderRadius: 10,
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span style={{ fontSize: 18 }}>📍</span>
                  <div>
                    <div style={{ fontSize: 11, color: '#667eea', fontWeight: 700, textTransform: 'uppercase' }}>Location Preview</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>
                      Zone {selectedZone?.zoneCode} › {selectedRack?.rackCode} › Shelf {editItem.shelfNo} › Bin {editItem.binNo}
                    </div>
                  </div>
                </div>
              )}

              {/* Primary / Overflow */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', background: '#f8f9fa', borderRadius: 8, border: '1px solid #dee2e6' }}>
                <input
                  type='checkbox'
                  checked={editItem.isPrimary}
                  onChange={e => setEditItem(f => f ? { ...f, isPrimary: e.target.checked } : f)}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Primary Bin</div>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>Unchecked = overflow / second bin</div>
                </div>
              </label>

              {/* Notes */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#495057', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
                <textarea
                  value={editItem.notes ?? ''}
                  onChange={e => setEditItem(f => f ? { ...f, notes: e.target.value || null } : f)}
                  rows={2}
                  placeholder='Optional notes…'
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                <button
                  onClick={() => setEditItem(null)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #dee2e6', background: '#f8f9fa', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
                >Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 2, padding: '12px 0', borderRadius: 10, border: 'none',
                    background: saving ? '#dee2e6' : 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: saving ? '#adb5bd' : '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >{saving ? 'Saving…' : 'Save Location'}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 360, width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>Remove Location?</h3>
            <p style={{ color: '#6c757d', fontSize: 13, margin: '0 0 20px' }}>
              The batch will no longer have a recorded bin location until re-assigned.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #dee2e6', background: '#f8f9fa', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#e74c3c', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for slide-in animation */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default BatchLocations;
