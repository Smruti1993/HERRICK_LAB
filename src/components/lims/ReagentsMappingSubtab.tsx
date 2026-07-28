import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { FlaskConical, Trash2 } from 'lucide-react';

interface Props {
  selectedService: any;
}

export const ReagentsMappingSubtab = ({ selectedService }: Props) => {
  const { 
    inventoryItems, 
    stores, 
    units, 
    reagentsMapping, 
    fetchReagentMappings, 
    saveReagentMapping, 
    deleteReagentMapping,
    showToast
  } = useData();

  const [mapItemId, setMapItemId] = useState('');
  const [mapStoreId, setMapStoreId] = useState('');
  const [mapQty, setMapQty] = useState('');
  const [mapUnitId, setMapUnitId] = useState('');
  const [mapIsMandatory, setMapIsMandatory] = useState(true);
  const [isSavingMapping, setIsSavingMapping] = useState(false);

  // Filter sub stores and units
  const activeSubStores = stores.filter(s => s.storeType === 'SUB_STORE' && s.status === 'Active');
  const labUnits = units.filter(u => ['ML', 'VIAL', 'KIT', 'STRIP'].includes(u.code.toUpperCase()));
  const displayUnits = labUnits.length > 0 ? labUnits : units;

  // Auto-select defaults
  useEffect(() => {
    if (activeSubStores.length > 0 && !mapStoreId) {
      setMapStoreId(activeSubStores[0].id);
    }
  }, [stores, mapStoreId]);

  useEffect(() => {
    if (displayUnits.length > 0 && !mapUnitId) {
      setMapUnitId(displayUnits[0].id);
    }
  }, [units, mapUnitId]);

  // Fetch mappings whenever service changes
  useEffect(() => {
    if (selectedService?.id) {
      fetchReagentMappings(selectedService.id);
    }
  }, [selectedService?.id]);

  const handleAddMapping = async () => {
    if (!mapItemId || !mapStoreId || !mapQty || !mapUnitId) {
      showToast('error', 'Please fill in all mapping fields.');
      return;
    }

    setIsSavingMapping(true);
    const success = await saveReagentMapping({
      id: '',
      serviceId: selectedService.id,
      itemId: mapItemId,
      storeId: mapStoreId,
      quantityPerTest: parseFloat(mapQty),
      unitId: mapUnitId,
      isMandatory: mapIsMandatory
    });
    setIsSavingMapping(false);

    if (success) {
      setMapItemId('');
      // Keep store and unit selected for easier consecutive mapping additions
      setMapQty('');
      setMapIsMandatory(true);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Add Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-blue-600 shrink-0" />
          <h4 className="font-bold text-sm text-slate-900">Map Reagent to Test Service</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Reagent Item *</label>
            <select
              value={mapItemId}
              onChange={e => setMapItemId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400"
            >
              <option value="">Select Reagent</option>
              {inventoryItems
                .filter(i => i.itemCategory?.toLowerCase() === 'reagent')
                .map(i => (
                  <option key={i.id} value={i.id}>{i.itemName} ({i.itemCode})</option>
                ))
              }
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Lab Sub-Store *</label>
            <select
              value={mapStoreId}
              onChange={e => setMapStoreId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400"
            >
              <option value="">Select Store</option>
              {stores
                .filter(s => s.storeType === 'SUB_STORE' && s.status === 'Active')
                .map(s => (
                  <option key={s.id} value={s.id}>{s.storeName} ({s.storeCode})</option>
                ))
              }
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Qty Per Test *</label>
            <input
              type="number"
              min="0.0001"
              step="any"
              placeholder="e.g. 0.05"
              value={mapQty}
              onChange={e => setMapQty(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 font-semibold"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Base UOM *</label>
            <select
              value={mapUnitId}
              onChange={e => setMapUnitId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 font-semibold"
            >
              <option value="">Select Unit</option>
              {(() => {
                const labUnits = units.filter(u => ['ML', 'VIAL', 'KIT', 'STRIP'].includes(u.code.toUpperCase()));
                const displayUnits = labUnits.length > 0 ? labUnits : units;
                return displayUnits.map(u => (
                  <option key={u.id} value={u.id}>{u.code} - {u.name}</option>
                ));
              })()}
            </select>
          </div>

          <div className="flex items-center gap-4 h-9">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mapIsMandatory}
                onChange={e => setMapIsMandatory(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300"
              />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Mandatory</span>
            </label>

            <button
              type="button"
              disabled={isSavingMapping}
              onClick={handleAddMapping}
              className="ml-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-xs font-bold transition-all shadow-md shadow-blue-100 disabled:bg-slate-400"
            >
              {isSavingMapping ? 'Saving...' : 'Add Mapping'}
            </button>
          </div>
        </div>
      </div>

      {/* Mapping List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Mapped Reagents for {selectedService.name}</h5>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3">Reagent</th>
                <th className="px-4 py-3">Lab Sub-Store</th>
                <th className="px-4 py-3 text-center">Consumption / Test</th>
                <th className="px-4 py-3 text-center">UOM</th>
                <th className="px-4 py-3 text-center">Strict Lock?</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-600">
              {reagentsMapping.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                    No reagents are currently mapped to this service.
                  </td>
                </tr>
              ) : (
                reagentsMapping.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">{m.itemName} ({m.itemCode})</td>
                    <td className="px-4 py-3">{m.storeName}</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">{m.quantityPerTest}</td>
                    <td className="px-4 py-3 text-center font-mono">{m.unitCode}</td>
                    <td className="px-4 py-3 text-center">
                      {m.isMandatory ? (
                        <span className="bg-red-50 text-red-600 text-xxs font-bold px-2 py-0.5 rounded border border-red-100">Mandatory</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-xxs font-semibold px-2 py-0.5 rounded">Warning only</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Are you sure you want to remove this reagent mapping?')) {
                            await deleteReagentMapping(m.id);
                          }
                        }}
                        className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
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
