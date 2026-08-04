import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../services/supabaseClient';
import { Layers, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface Props {
  selectedService: any; // The profile service being configured
}

interface ComponentRow {
  id: string;
  profileServiceId: string;
  componentServiceId: string;
  componentServiceName: string;
  componentServiceCode: string;
  displayOrder: number;
  isActive: boolean;
}

export const ProfileComponentsSubtab = ({ selectedService }: Props) => {
  const supabase = getSupabase();

  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchComponents = async () => {
    if (!selectedService?.id) return;
    setIsLoading(true);

    // Fetch mapped components with their service definition details
    const { data, error } = await supabase
      .from('lab_service_profile_components')
      .select(`
        id, profile_service_id, component_service_id, display_order, is_active,
        component:component_service_id (
          id, name, code
        )
      `)
      .eq('profile_service_id', selectedService.id)
      .order('display_order');

    if (!error && data) {
      setComponents(
        data.map((r: any) => ({
          id: r.id,
          profileServiceId: r.profile_service_id,
          componentServiceId: r.component_service_id,
          componentServiceName: r.component?.name || r.component_service_id,
          componentServiceCode: r.component?.code || '',
          displayOrder: r.display_order,
          isActive: r.is_active,
        }))
      );
    }

    setIsLoading(false);
  };

  const fetchAvailableServices = async () => {
    // Only fetch Single service / Special test — not Profile/Package (no nesting)
    const { data, error } = await supabase
      .from('service_definitions')
      .select('id, name, code, service_category')
      .eq('status', 'Active')
      .in('service_type', ['Laboratory', 'LABORATORY', 'laboratory'])
      .not('service_category', 'eq', 'Profile/Package')
      .order('name');

    if (!error && data) {
      // Exclude the profile service itself
      setAvailableServices(data.filter((s: any) => s.id !== selectedService.id));
    }
  };

  useEffect(() => {
    if (selectedService?.id) {
      fetchComponents();
      fetchAvailableServices();
    }
  }, [selectedService?.id]);

  // Auto-set next display order
  useEffect(() => {
    setDisplayOrder(components.length > 0 ? Math.max(...components.map(c => c.displayOrder)) + 10 : 10);
  }, [components.length]);

  const handleAdd = async () => {
    if (!selectedComponentId) {
      alert('Please select a component service to add.');
      return;
    }

    // Prevent duplicates in UI
    if (components.some(c => c.componentServiceId === selectedComponentId)) {
      alert('This service is already added as a component.');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from('lab_service_profile_components').insert({
      profile_service_id: selectedService.id,
      component_service_id: selectedComponentId,
      display_order: displayOrder,
      is_active: true,
    });

    if (error) {
      alert('Error adding component: ' + error.message);
    } else {
      setSelectedComponentId('');
      await fetchComponents();
    }

    setIsSaving(false);
  };

  const handleRemove = async (id: string, componentName: string) => {
    if (!confirm(`Remove "${componentName}" from this profile? This only affects future orders.`)) return;

    const { error } = await supabase.from('lab_service_profile_components').delete().eq('id', id);
    if (error) {
      alert('Error removing component: ' + error.message);
    } else {
      setComponents(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('lab_service_profile_components')
      .update({ is_active: !currentActive })
      .eq('id', id);

    if (!error) {
      setComponents(prev =>
        prev.map(c => (c.id === id ? { ...c, isActive: !currentActive } : c))
      );
    }
  };

  // Already-added IDs for filtering the picker
  const addedIds = new Set(components.map(c => c.componentServiceId));
  const pickerServices = availableServices.filter(s => !addedIds.has(s.id));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-blue-800">Profile/Package Configuration</p>
          <p className="text-xxs text-blue-600 mt-0.5">
            When this service is billed, the system will automatically create one lab order per component below.
            Each component inherits its own specimen, reagent mapping, parameters, and reference ranges.
            Changes here only affect <strong>future orders</strong>.
          </p>
        </div>
      </div>

      {/* Add Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600 shrink-0" />
          <h4 className="font-bold text-sm text-slate-900">Add Component Service</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Component Service *
            </label>
            <select
              value={selectedComponentId}
              onChange={e => setSelectedComponentId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400"
            >
              <option value="">— Select Single Service —</option>
              {pickerServices.map(s => (
                <option key={s.id} value={s.id}>
                  [{s.code}] {s.name}
                </option>
              ))}
            </select>
            {pickerServices.length === 0 && !isLoading && (
              <p className="text-xxs text-slate-400 mt-1">
                {availableServices.length === 0
                  ? 'No active laboratory services found.'
                  : 'All available services are already added.'}
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Display Order
            </label>
            <input
              type="number"
              min={0}
              step={10}
              value={displayOrder}
              onChange={e => setDisplayOrder(parseInt(e.target.value) || 0)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 font-semibold"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={isSaving || !selectedComponentId}
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-100 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            {isSaving ? 'Adding...' : 'Add to Profile'}
          </button>
        </div>
      </div>

      {/* Components List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Profile Components — {selectedService.name}
            </h5>
            <p className="text-xxs text-slate-400 mt-0.5">{components.length} component(s) configured</p>
          </div>
          {components.some(c => !c.isActive) && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xxs text-amber-700 font-semibold">Some components are inactive</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Component Service</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3 text-center">Order</th>
                <th className="px-4 py-3 text-center">Active?</th>
                <th className="px-4 py-3 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-600">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : components.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                    No component services configured yet. Add one above.
                  </td>
                </tr>
              ) : (
                components.map((c, idx) => (
                  <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${!c.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{c.componentServiceName}</td>
                    <td className="px-4 py-3 font-mono text-blue-600">{c.componentServiceCode}</td>
                    <td className="px-4 py-3 text-center">{c.displayOrder}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(c.id, c.isActive)}
                        className={`px-2 py-0.5 rounded text-xxs font-bold border transition-all ${
                          c.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle active status"
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(c.id, c.componentServiceName)}
                        className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded transition-colors"
                        title="Remove from profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
