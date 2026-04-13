import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../../services/supabaseClient';
import { Plus, Pencil, Trash2, Search, Save, X, FlaskConical, Filter } from 'lucide-react';

interface DrugGeneric {
  id?: string;
  genericCode: string;
  genericName: string;
  groupName: string;
  availableForms: string;
  strength: string;
  formOfAdministration: string;
  routeOfAdministration: string;
  isDrugGeneric: boolean;
  isAntibiotic: boolean;
  isNarcotic: boolean;
  isActive: boolean;
}

const EMPTY: DrugGeneric = {
  genericCode: '', genericName: '', groupName: '',
  availableForms: '', strength: '',
  formOfAdministration: '', routeOfAdministration: '',
  isDrugGeneric: true, isAntibiotic: false, isNarcotic: false, isActive: true
};

const ADMIN_FORMS = ['Oral', 'Topical', 'Ophthalmic', 'Otic', 'Inhalation', 'Rectal', 'Vaginal', 'Transdermal', 'Nasal', 'Parenteral'];
const ROUTES = ['PO', 'IV', 'IM', 'SC', 'SL', 'Topical', 'Inhaled', 'PR', 'Intranasal', 'Intrathecal'];

function mapFromDb(r: any): DrugGeneric {
  return {
    id: r.id,
    genericCode: r.generic_code,
    genericName: r.generic_name,
    groupName: r.group_name || '',
    availableForms: r.available_forms || '',
    strength: r.strength || '',
    formOfAdministration: r.form_of_administration || '',
    routeOfAdministration: r.route_of_administration || '',
    isDrugGeneric: r.is_drug_generic,
    isAntibiotic: r.is_antibiotic,
    isNarcotic: r.is_narcotic,
    isActive: r.is_active,
  };
}

function mapToDb(d: DrugGeneric) {
  return {
    ...(d.id ? { id: d.id } : {}),
    generic_code: d.genericCode,
    generic_name: d.genericName,
    group_name: d.groupName,
    available_forms: d.availableForms,
    strength: d.strength,
    form_of_administration: d.formOfAdministration,
    route_of_administration: d.routeOfAdministration,
    is_drug_generic: d.isDrugGeneric,
    is_antibiotic: d.isAntibiotic,
    is_narcotic: d.isNarcotic,
    is_active: d.isActive,
  };
}

const CheckPill = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all select-none ${
      checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-500 hover:border-blue-400'
    }`}
  >
    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${checked ? 'border-white' : 'border-slate-400'}`}>
      {checked && <span className="block w-2 h-2 rounded-full bg-white" />}
    </span>
    {label}
  </button>
);

export const DrugGenericMaster: React.FC = () => {
  const [records, setRecords] = useState<DrugGeneric[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DrugGeneric>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const supabase = getSupabase();

  const fetchRecords = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('pharmacy_drug_generics').select('*').order('generic_name');
      if (error) throw error;
      setRecords((data || []).map(mapFromDb));
    } catch (e: any) {
      setError('Failed to load records: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const openNew = () => { setForm(EMPTY); setEditId(null); setShowForm(true); setError(''); };
  const openEdit = (r: DrugGeneric) => { setForm({ ...r }); setEditId(r.id || null); setShowForm(true); setError(''); };
  const closeForm = () => { setShowForm(false); setError(''); };

  const handleSave = async () => {
    if (!form.genericCode.trim() || !form.genericName.trim()) {
      setError('Generic Code and Generic Name are required.'); return;
    }
    if (!supabase) { setError('Database not connected.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('pharmacy_drug_generics').upsert(mapToDb(form));
      if (error) throw error;
      await fetchRecords();
      closeForm();
    } catch (e: any) {
      setError('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await supabase.from('pharmacy_drug_generics').delete().eq('id', id);
    setDeleteConfirm(null);
    await fetchRecords();
  };

  const field = (k: keyof DrugGeneric, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const filtered = records.filter(r => {
    const matchSearch = !search || r.genericName.toLowerCase().includes(search.toLowerCase()) || r.genericCode.toLowerCase().includes(search.toLowerCase());
    const matchActive = filterActive === 'all' || (filterActive === 'active' ? r.isActive : !r.isActive);
    return matchSearch && matchActive;
  });

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Page header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <FlaskConical className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">Drug Generic Master</h1>
            <p className="text-[10px] text-slate-400">{records.length} generics registered</p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Generic
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or code…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {(['all', 'active', 'inactive'] as const).map(v => (
            <button key={v} onClick={() => setFilterActive(v)}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-md capitalize transition-all ${filterActive === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >{v}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Filter className="w-3 h-3" /> {filtered.length} shown
        </div>
      </div>

      {/* Main content: table + form side by side */}
      <div className={`flex gap-3 flex-1 min-h-0 ${showForm ? 'flex-row' : ''}`}>
        {/* Table */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-w-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
              <FlaskConical className="w-8 h-8 text-slate-200" />
              <p className="text-xs">No records found</p>
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Generic Name</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Group</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Strength</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Route</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Flags</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 font-mono font-medium text-slate-700">{r.genericCode}</td>
                      <td className="px-3 py-2 font-medium text-slate-800 max-w-[160px] truncate">{r.genericName}</td>
                      <td className="px-3 py-2 text-slate-500 max-w-[100px] truncate">{r.groupName || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{r.strength || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{r.routeOfAdministration || '—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-center gap-1 flex-wrap">
                          {r.isDrugGeneric && <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">Generic</span>}
                          {r.isAntibiotic && <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold">Antibiotic</span>}
                          {r.isNarcotic && <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold">Narcotic</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {r.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => openEdit(r)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {deleteConfirm === r.id ? (
                            <div className="flex gap-0.5">
                              <button onClick={() => handleDelete(r.id!)} className="p-1 text-white bg-red-500 hover:bg-red-600 rounded text-[9px] font-bold px-1.5">Yes</button>
                              <button onClick={() => setDeleteConfirm(null)} className="p-1 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded text-[9px] font-bold px-1.5">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(r.id!)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Slide-in Form Panel */}
        {showForm && (
          <div className="w-80 flex-shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
            {/* Form header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-700 flex-shrink-0">
              <div>
                <p className="text-white text-xs font-semibold">{editId ? 'Edit' : 'New'} Drug Generic</p>
                <p className="text-blue-200 text-[10px]">Fill in all required fields</p>
              </div>
              <button onClick={closeForm} className="text-blue-200 hover:text-white p-1 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{error}</div>
              )}

              {/* Basic fields */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Generic Code <span className="text-red-500">*</span></label>
                  <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.genericCode} onChange={e => field('genericCode', e.target.value)} placeholder="e.g. AMX001" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Strength</label>
                  <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.strength} onChange={e => field('strength', e.target.value)} placeholder="e.g. 500mg" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Generic Name <span className="text-red-500">*</span></label>
                <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.genericName} onChange={e => field('genericName', e.target.value)} placeholder="e.g. Amoxicillin" />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Group Name</label>
                <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.groupName} onChange={e => field('groupName', e.target.value)} placeholder="e.g. Penicillins" />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Available Forms</label>
                <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.availableForms} onChange={e => field('availableForms', e.target.value)} placeholder="e.g. Tablet, Capsule, Syrup" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Form of Admin.</label>
                  <select className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" value={form.formOfAdministration} onChange={e => field('formOfAdministration', e.target.value)}>
                    <option value="">Select…</option>
                    {ADMIN_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Route of Admin.</label>
                  <select className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" value={form.routeOfAdministration} onChange={e => field('routeOfAdministration', e.target.value)}>
                    <option value="">Select…</option>
                    {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Checkboxes as toggle pills */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Classification</label>
                <div className="flex flex-wrap gap-1.5">
                  <CheckPill label="Drug Generic" checked={form.isDrugGeneric} onChange={v => field('isDrugGeneric', v)} />
                  <CheckPill label="Antibiotic" checked={form.isAntibiotic} onChange={v => field('isAntibiotic', v)} />
                  <CheckPill label="Narcotic" checked={form.isNarcotic} onChange={v => field('isNarcotic', v)} />
                  <CheckPill label="Active" checked={form.isActive} onChange={v => field('isActive', v)} />
                </div>
              </div>
            </div>

            {/* Form footer */}
            <div className="flex gap-2 px-4 py-3 border-t border-slate-100 flex-shrink-0 bg-slate-50">
              <button onClick={closeForm} className="flex-1 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm disabled:opacity-60 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrugGenericMaster;
