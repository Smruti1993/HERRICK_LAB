import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { MasterEntity } from '../types';
import { Plus, Trash2 } from 'lucide-react';

const MasterList = <T extends MasterEntity>({ 
  title, 
  data, 
  onAdd 
}: { 
  title: string, 
  data: T[], 
  onAdd: (item: any) => void 
}) => {
  const { departments } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<{ name: string; code: string; status: string; departmentId?: string }>({
    name: '',
    code: '',
    status: 'Active',
    departmentId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.code) return;
    if (title === 'Service Centre' && !newItem.departmentId) return;
    
    onAdd({
      id: Date.now().toString(),
      name: newItem.name,
      code: newItem.code,
      status: newItem.status,
      departmentId: title === 'Service Centre' ? newItem.departmentId : undefined
    });
    setNewItem({ name: '', code: '', status: 'Active', departmentId: '' });
    setIsAdding(false);
  };

  const showExtra = title === 'Service Centre';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add New
        </button>
      </div>
      
      {isAdding && (
        <form onSubmit={handleSubmit} className={`p-4 bg-blue-50/50 border-b border-blue-100 grid grid-cols-1 ${showExtra ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 animate-in slide-in-from-top-2`}>
          <input 
            required
            placeholder={`${title} Name`} 
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={newItem.name}
            onChange={e => setNewItem({...newItem, name: e.target.value})}
          />
          <input 
            required
            placeholder="Code (e.g. DEPT-01)" 
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={newItem.code}
            onChange={e => setNewItem({...newItem, code: e.target.value})}
          />
          {title === 'Service Centre' && (
            <select 
              required
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={newItem.departmentId || ''}
              onChange={e => setNewItem({...newItem, departmentId: e.target.value})}
            >
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          <button type="submit" className="bg-blue-600 text-white rounded-lg text-sm font-medium">Save</button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50">
            <tr>
              <th className="px-6 py-3 font-semibold">Name</th>
              <th className="px-6 py-3 font-semibold">Code</th>
              {showExtra && <th className="px-6 py-3 font-semibold">Department</th>}
              <th className="px-6 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
               <tr><td colSpan={showExtra ? 4 : 3} className="px-6 py-4 text-center text-slate-400">No records found.</td></tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="bg-white border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-3 font-mono text-slate-500">{item.code}</td>
                  {showExtra && (
                    <td className="px-6 py-3 text-slate-700">
                      {departments.find(d => d.id === (item as any).departmentId)?.name || '-'}
                    </td>
                  )}
                  <td className="px-6 py-3">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">Active</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const Masters = () => {
  const { 
    departments, addDepartment, 
    units, addUnit, 
    serviceCentres, addServiceCentre 
  } = useData();

  const [activeTab, setActiveTab] = useState<'departments' | 'units' | 'services'>('departments');

  const tabs = [
    { id: 'departments', label: 'Departments' },
    { id: 'units', label: 'Medical Units' },
    { id: 'services', label: 'Service Centres' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex space-x-1 bg-white p-1 rounded-xl w-fit shadow-sm border border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in duration-500">
        {activeTab === 'departments' && (
          <MasterList title="Department" data={departments} onAdd={addDepartment} />
        )}
        {activeTab === 'units' && (
          <MasterList title="Medical Unit" data={units} onAdd={addUnit} />
        )}
        {activeTab === 'services' && (
          <MasterList title="Service Centre" data={serviceCentres} onAdd={addServiceCentre} />
        )}
      </div>
    </div>
  );
};
