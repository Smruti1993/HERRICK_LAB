import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { PharmacyRack } from '../../../types';

const EMPTY_RACK: Omit<PharmacyRack, 'id'> = {
  zoneId: '', rackCode: '', rackName: null, noOfShelves: 5, isActive: true
};

const RackMaster: React.FC = () => {
  const { pharmacyZones, pharmacyRacks, stores, savePharmacyRack, deletePharmacyRack, showToast } = useData();

  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<PharmacyRack, 'id'> & { id?: string }>({ ...EMPTY_RACK });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const storeZones = pharmacyZones.filter(z => !selectedStore || z.storeId === selectedStore);
  const filteredRacks = pharmacyRacks.filter(r => {
    if (selectedZone) return r.zoneId === selectedZone;
    if (selectedStore) return storeZones.some(z => z.id === r.zoneId);
    return true;
  });

  const openNew = () => {
    setForm({ ...EMPTY_RACK, zoneId: selectedZone });
    setShowForm(true);
  };

  const openEdit = (r: PharmacyRack) => {
    setForm({ ...r });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.zoneId || !form.rackCode.trim()) {
      showToast('error', 'Zone and Rack Code are required.');
      return;
    }
    setSaving(true);
    await savePharmacyRack(form);
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deletePharmacyRack(id);
    setConfirmDelete(null);
  };

  const getZone = (zoneId: string) => pharmacyZones.find(z => z.id === zoneId);

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>🗄️ Rack Master</h2>
          <p style={{ margin: '4px 0 0', color: '#6c757d', fontSize: 13 }}>
            Define numbered steel racks within each zone.
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            background: 'linear-gradient(135deg, #11998e, #38ef7d)', color: '#fff',
            border: 'none', borderRadius: 10, padding: '10px 20px',
            fontWeight: 700, fontSize: 14, cursor: 'pointer'
          }}
        >
          ＋ New Rack
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select
          value={selectedStore}
          onChange={e => { setSelectedStore(e.target.value); setSelectedZone(''); }}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, minWidth: 200 }}
        >
          <option value=''>— All Stores —</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
        </select>

        <select
          value={selectedZone}
          onChange={e => setSelectedZone(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, minWidth: 200 }}
        >
          <option value=''>— All Zones —</option>
          {storeZones.map(z => (
            <option key={z.id} value={z.id}>Zone {z.zoneCode} — {z.zoneName}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e9ecef', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              {['Rack Code', 'Rack Name', 'Zone', 'Store', 'Shelves', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#495057', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRacks.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '60px 0', color: '#adb5bd' }}>
                  <div style={{ fontSize: 40 }}>🗄️</div>
                  <div style={{ fontWeight: 600 }}>No racks found</div>
                  <div style={{ fontSize: 13 }}>Create zones first, then add racks within them.</div>
                </td>
              </tr>
            ) : filteredRacks.map((r, i) => {
              const zone = getZone(r.zoneId);
              const storeName = stores.find(s => s.id === zone?.storeId)?.storeName ?? '—';
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f3f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontWeight: 800, fontSize: 15, color: '#1a1a2e',
                      background: '#e3f2fd', borderRadius: 6, padding: '2px 8px'
                    }}>{r.rackCode}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#343a40' }}>{r.rackName ?? '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>
                    {zone ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontWeight: 700, color: '#764ba2' }}>Zone {zone.zoneCode}</span>
                        <span style={{ color: '#868e96', fontSize: 12 }}>— {zone.zoneName}</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6c757d' }}>{storeName}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{r.noOfShelves}</span>
                    <span style={{ fontSize: 11, color: '#adb5bd', marginLeft: 4 }}>shelves</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: r.isActive ? '#e8f5e9' : '#fce4ec',
                      color: r.isActive ? '#2e7d32' : '#c62828',
                      borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700
                    }}>{r.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openEdit(r)}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #dee2e6', background: '#f8f9fa', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                      >✏️ Edit</button>
                      <button
                        onClick={() => setConfirmDelete(r.id)}
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

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 32, width: '90%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
              {form.id ? '✏️ Edit Rack' : '➕ New Rack'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#495057', display: 'block', marginBottom: 4 }}>ZONE *</label>
                <select
                  value={form.zoneId}
                  onChange={e => setForm(f => ({ ...f, zoneId: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14 }}
                >
                  <option value=''>— Select Zone —</option>
                  {pharmacyZones.filter(z => z.isActive).map(z => {
                    const sn = stores.find(s => s.id === z.storeId)?.storeName ?? '';
                    return <option key={z.id} value={z.id}>Zone {z.zoneCode} — {z.zoneName} [{sn}]</option>;
                  })}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#495057', display: 'block', marginBottom: 4 }}>RACK CODE *</label>
                  <input
                    value={form.rackCode}
                    onChange={e => setForm(f => ({ ...f, rackCode: e.target.value.toUpperCase() }))}
                    maxLength={10}
                    placeholder='e.g. A1'
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#495057', display: 'block', marginBottom: 4 }}>RACK NAME</label>
                  <input
                    value={form.rackName ?? ''}
                    onChange={e => setForm(f => ({ ...f, rackName: e.target.value || null }))}
                    placeholder='e.g. Antibiotics Rack'
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#495057', display: 'block', marginBottom: 4 }}>
                  NO. OF SHELVES (1–20)
                </label>
                <input
                  type='number' min={1} max={20}
                  value={form.noOfShelves}
                  onChange={e => setForm(f => ({ ...f, noOfShelves: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) }))}
                  style={{ width: 120, padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type='checkbox' checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Active</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid #dee2e6', background: '#f8f9fa', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
              >Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #11998e, #38ef7d)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
              >{saving ? 'Saving…' : 'Save Rack'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 360, width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>Delete Rack?</h3>
            <p style={{ color: '#6c757d', fontSize: 13, margin: '0 0 20px' }}>
              Batch location records referencing this rack will also be removed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #dee2e6', background: '#f8f9fa', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#e74c3c', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RackMaster;
