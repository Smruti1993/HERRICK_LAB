import { useState } from 'react';
import { ItemMaster } from '../components/inventory/ItemMaster';

export const Inventory = () => {
    const [activeTab, setActiveTab] = useState<'master'>('master');

    const tabs = [
        { id: 'master', label: 'Master' },
    ];

    return (
        <div className="space-y-6">
            {/* Module Tabs */}
            <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl w-fit shadow-sm border border-slate-200">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                            activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Sub-Pages */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {activeTab === 'master' && (
                    <ItemMaster />
                )}
            </div>
        </div>
    );
};
