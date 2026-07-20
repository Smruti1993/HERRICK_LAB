import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { PharmacyZone, PharmacyZoneTemperature } from '../../../types';

const TEMP_META: Record<PharmacyZoneTemperature, { label: string; icon: string; color: string }> = {
  Ambient:      { label: 'Ambient (Room Temp)',   icon: '🌡️',  color: '#6c7a89' },
  Refrigerated: { label: 'Refrigerated (2–8 °C)', icon: '❄️',  color: '#2196f3' },
  Frozen:       { label: 'Frozen (< 0 °C)',        icon: '🧊',  color: '#00bcd4' },
  Controlled:   { label: 'Controlled (Locked)',    icon: '🔒',  color: '#f44336' },
};

const EMPTY_ZONE: Omit<PharmacyZone, 'id'> = {
  storeId: '', zoneCode: '', zoneName: '', temperature: 'Ambient',
  description: null, isActive: true
};

const ZoneMaster: React.FC = () => {
  const { pharmacyZones, stores, savePharmacyZone, deletePharmacyZone, showToast } = useData();
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<PharmacyZone, 'id'> & { id?: string }>({ ...EMPTY_ZONE });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = pharmacyZones.filter(z => !selectedStore || z.storeId === selectedStore);

  const openNew = () => {
    setForm({ ...EMPTY_ZONE, storeId: selectedStore });
    setShowForm(true);
  };

  const openEdit = (z: PharmacyZone) => {
    setForm({ ...z });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.storeId || !form.zoneCode.trim() || !form.zoneName.trim()) {
      showToast('error', 'Store, Zone Code, and Zone Name are required.');
      return;
    }
    setSaving(true);
    await savePharmacyZone(form);
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deletePharmacyZone(id);
    setConfirmDelete(null);
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>🗺️ Zone Master</h2>
          <p style={{ margin: '4px 0 0', color: '#6c757d', fontSize: 13 }}>
            Define temperature-controlled physical zones within each pharmacy store.
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff',
            border: 'none', borderRadius: 10, padding: '10px 20px',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          ＋ New Zone
        </button>
      </div>

      {/* Store filter */}
      <div style={{ marginBottom: 16 }}>
        <select
          value={selectedStore}
          onChange={e => setSelectedStore(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, minWidth: 240 }}
        >
          <option value=''>— All Stores —</option>
          {stores.map(s => (
            <option key={s.id} value={s.id}>{s.storeName}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#adb5bd' }}>
            <div style={{ fontSize: 48 }}>📦</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>No zones found</div>
            <div style={{ fontSize: 13 }}>Click "New Zone" to create the first zone for this store.</div>
          </div>
        )}
        {filtered.map(z => {
          const meta = TEMP_META[z.temperature];
          const storeName = stores.find(s => s.id === z.storeId)?.storeName ?? '—';
          return (
            <div key={z.id}
              style={{
                background: '#fff', borderRadius: 14, border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 20,
                display: 'flex', flexDirection: 'column', gap: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22
                  }}>{meta.icon}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#1a1a2e' }}>Zone {z.zoneCode}</div>
                    <div style={{ fontSize: 12, color: '#6c757d' }}>{storeName}</div>
                  </div>
                </div>
                <span style={{
                  background: z.isActive ? '#e8f5e9' : '#fce4ec',
                  color: z.isActive ? '#2e7d32' : '#c62828',
                  borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700
                }}>{z.isActive ? 'Active' : 'Inactive'}</span>
              </div>

              <div style={{ fontWeight: 600, fontSize: 15, color: '#343a40' }}>{z.zoneName}</div>

              <div style={{
                background: `${meta.color}12`, borderRadius: 8, padding: '6px 12px',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: meta.color, fontWeight: 600
              }}>
                <span style={{ fontSize: 16 }}>{meta.icon}</span>
                {meta.label}
              </div>

              {z.description && (
                <div style={{ fontSize: 12, color: '#868e96', fontStyle: 'italic' }}>{z.description}</div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => openEdit(z)}
                  style={{
                    flex: 1, background: '#f8f9fa', border: '1px solid #dee2e6',
                    borderRadius: 8, padding: '7px 0', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                  }}
                >✏️ Edit</button>
                <button
                  onClick={() => setConfirmDelete(z.id)}
                  style={{
                    flex: 1, background: '#fff5f5', border: '1px solid #ffcccc',
                    color: '#c0392b', borderRadius: 8, padding: '7px 0', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                  }}
                >🗑️ Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: 18, padding: 32, width: '90%', maxWidth: 500,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
              {form.id ? '✏️ Edit Zone' : '➕ New Zone'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#495057', display: 'block', marginBottom: 4 }}>
                  STORE *
                </label>
                <select
                  value={form.storeId}
                  onChange={e => setForm(f => ({ ...f, storeId: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14 }}
                >
                  <option value=''>— Select Store —</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#495057', display: 'block', marginBottom: 4 }}>
                    ZONE CODE *
                  </label>
                  <input
                    value={form.zoneCode}
                    onChange={e => setForm(f => ({ ...f, zoneCode: e.target.value.toUpperCase() }))}
                    maxLength={10}
                    placeholder='e.g. A'
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#495057', display: 'block', marginBottom: 4 }}>
                    ZONE NAME *
                  </label>
                  <input
                    value={form.zoneName}
                    onChange={e => setForm(f => ({ ...f, zoneName: e.target.value }))}
                    placeholder='e.g. Oral Medicines'
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#495057', display: 'block', marginBottom: 8 }}>
                  TEMPERATURE TYPE
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(Object.keys(TEMP_META) as PharmacyZoneTemperature[]).map(t => {
                    const m = TEMP_META[t];
                    return (
                      <label key={t} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                        border: `2px solid ${form.temperature === t ? m.color : '#dee2e6'}`,
                        borderRadius: 8, cursor: 'pointer',
                        background: form.temperature === t ? `${m.color}12` : '#fff',
                        transition: 'all 0.15s'
                      }}>
                        <input type='radio' name='temp' value={t}
                          checked={form.temperature === t}
                          onChange={() => setForm(f => ({ ...f, temperature: t }))}
                          style={{ display: 'none' }}
                        />
                        <span style={{ fontSize: 20 }}>{m.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: form.temperature === t ? m.color : '#495057' }}>
                          {t}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#495057', display: 'block', marginBottom: 4 }}>
                  DESCRIPTION
                </label>
                <textarea
                  value={form.description ?? ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))}
                  rows={2}
                  placeholder='Optional notes about this zone…'
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
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
                style={{
                  flex: 2, padding: '11px 0', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1
                }}
              >{saving ? 'Saving…' : 'Save Zone'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 380, width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>Delete Zone?</h3>
            <p style={{ color: '#6c757d', fontSize: 13, margin: '0 0 20px' }}>
              All racks within this zone will also be deleted. Batch location records referencing them will be removed.
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

export default ZoneMaster;
