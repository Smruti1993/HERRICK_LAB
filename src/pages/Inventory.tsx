import { useState } from 'react';
import { ItemMaster } from '../components/inventory/ItemMaster';
import { StoreMaster } from '../components/inventory/StoreMaster';
import { ItemStoreMapping } from '../components/inventory/ItemStoreMapping';
import { LayoutDashboard, FileText, PackageSearch, Store, MapPin } from 'lucide-react';

export const Inventory = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'master' | 'store' | 'mapping'>('master');

    const navigation = [
        {
            group: 'Inventory',
            items: [
                { id: 'dashboard', label: 'Dashboard / Overview', icon: LayoutDashboard },
            ]
        },
        {
            group: 'Reports',
            items: [
                { id: 'reports', label: 'Inventory Reports', icon: FileText },
            ]
        },
        {
            group: 'Masters',
            items: [
                { id: 'master', label: 'Item Master', icon: PackageSearch },
                { id: 'store', label: 'Store Master', icon: Store },
                { id: 'mapping', label: 'Item-Store Map', icon: MapPin },
            ]
        }
    ];

    return (
        <div className="flex h-[calc(100vh-64px)] -m-6 bg-slate-50 overflow-hidden">
            {/* Inner Sidebar */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 shrink-0">
                <div className="h-16 flex items-center px-6 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800">Inventory Module</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto py-6 space-y-8">
                    {navigation.map((section, idx) => (
                        <div key={idx} className="px-4">
                            <h3 className="px-2 mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {section.group}
                            </h3>
                            <ul className="space-y-1">
                                {section.items.map(item => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <li key={item.id}>
                                            <button
                                                onClick={() => setActiveTab(item.id as any)}
                                                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                                                    isActive
                                                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                }`}
                                            >
                                                <Icon className={`w-5 h-5 mr-3 transition-opacity ${
                                                    isActive ? 'opacity-100 text-blue-600' : 'opacity-70 group-hover:opacity-100'
                                                }`} />
                                                <span className="font-medium text-sm text-left">{item.label}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                <div className="flex-1 h-full mx-auto max-w-[1600px]"> 
                    {activeTab === 'dashboard' && (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <LayoutDashboard className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-600 mb-2">Dashboard / Overview</h3>
                            <p className="text-sm text-slate-500">Inventory dashboard is currently under development.</p>
                        </div>
                    )}
                    {activeTab === 'reports' && (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <FileText className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-600 mb-2">Inventory Reports</h3>
                            <p className="text-sm text-slate-500">Reporting module is currently under development.</p>
                        </div>
                    )}
                    
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-full">
                        {activeTab === 'master' && <ItemMaster />}
                        {activeTab === 'store' && <StoreMaster />}
                        {activeTab === 'mapping' && <ItemStoreMapping />}
                    </div>
                </div>
            </div>
        </div>
    );
};
