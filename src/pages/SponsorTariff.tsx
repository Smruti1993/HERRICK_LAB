import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { SponsorTariff as SponsorTariffType } from '../types';
import { Save, Loader2, Plus, Search } from 'lucide-react';
import { Pagination } from '../components/Pagination';

export const SponsorTariff: React.FC = () => {
  const navigate = useNavigate();
  const {
    organizations,
    serviceDefinitions,
    serviceTariffs,
    inventoryItems,
    sponsorTariffs,
    saveSponsorTariffBatch,
    deleteSponsorTariff,
    showToast,
    formatCurrency,
    selectedCurrency
  } = useData();

  const decimals = selectedCurrency === 'BHD' ? 3 : 2;

  // --- View Mode ---
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');

  // --- Form Selectors ---
  const [selectedSponsor, setSelectedSponsor] = useState<string>('');
  const [isActiveSponsor, setIsActiveSponsor] = useState<boolean>(true);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  // --- Grid State & Loading ---
  const [gridRows, setGridRows] = useState<SponsorTariffType[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // --- Define New Tariff Autocomplete ---
  const [searchItemQuery, setSearchItemQuery] = useState<string>('');
  const [showItemDropdown, setShowItemDropdown] = useState<boolean>(false);

  // --- Column Filter States ---
  const [filterCode, setFilterCode] = useState<string>('');
  const [filterName, setFilterName] = useState<string>('');
  const [filterCpt, setFilterCpt] = useState<string>('');
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [filterSponsorCode, setFilterSponsorCode] = useState<string>('');
  const [filterSponsorDesc, setFilterSponsorDesc] = useState<string>('');
  const [filterClassName, setFilterClassName] = useState<string>('');
  const [filterNphiesCode, setFilterNphiesCode] = useState<string>('');
  const [filterNphiesDesc, setFilterNphiesDesc] = useState<string>('');

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Initialize defaults on load
  useEffect(() => {
    if (organizations.length > 0 && !selectedSponsor) {
      setSelectedSponsor(organizations[0].id);
    }
  }, [organizations, selectedSponsor]);

  // Normalize class names to standard keys (A+, A, B, C)
  const normalizeClassName = (cls: string): string => {
    if (!cls) return 'A+';
    const c = cls.trim().toLowerCase();
    if (c === 'a+' || c.includes('elite') || c.includes('a+')) return 'A+';
    if (c === 'a' || c.includes('standard')) return 'A';
    if (c === 'b' || c.includes('economy')) return 'B';
    if (c === 'c' || c.includes('basic')) return 'C';
    return cls;
  };

  // Recalculate tariffAmount based on contract type & percentage
  const calculateTariffAmount = (base: number, type: string, val: number): number => {
    const rawVal = Number(val) || 0;
    let finalAmt = base;
    if (type === 'Discount %') {
      finalAmt = base * (1 - rawVal / 100);
    } else if (type === 'Markup %') {
      finalAmt = base * (1 + rawVal / 100);
    } else {
      finalAmt = rawVal;
    }
    return Math.max(0, Math.round((finalAmt + Number.EPSILON) * 100) / 100);
  };

  // Perform search and load ONLY existing saved tariffs from context
  const handleSearch = () => {
    if (!selectedSponsor) {
      showToast('error', 'Sponsor is required.');
      return;
    }
    if (!selectedType) {
      showToast('error', 'Type is required.');
      return;
    }

    // Filter existing, saved negotiated rates inside sponsorTariffs array in database context
    const existingTariffs = sponsorTariffs.filter(t => 
      t.sponsorId === selectedSponsor &&
      t.itemType === selectedType &&
      (!selectedClass || normalizeClassName(t.className) === normalizeClassName(selectedClass))
    );

    setGridRows(existingTariffs.map(t => ({ ...t })));
    setHasSearched(true);
    setCurrentPage(1);
    
    if (existingTariffs.length === 0) {
      showToast('info', 'No negotiated tariffs defined for this search scope. Use "Define New Tariff" to append rates.');
    } else {
      showToast('success', `Found and loaded ${existingTariffs.length} saved negotiated tariffs.`);
    }
  };

  // Add Item to grid as a NEW, unpersisted row
  const handleAddItem = (item: { code: string; name: string; basePrice: number; groupName?: string }) => {
    // Check if already in current spreadsheet grid
    const exists = gridRows.some(row => row.itemCode === item.code);
    if (exists) {
      showToast('error', 'This item is already added to the grid.');
      return;
    }

    const sponsorObj = organizations.find(o => o.id === selectedSponsor);

    const newTariff: SponsorTariffType = {
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sponsorId: selectedSponsor,
      itemType: selectedType as any,
      itemCode: item.code,
      itemName: item.name,
      cptCode: selectedType === 'SERVICES' ? item.code : '',
      groupName: item.groupName || '',
      baseTariff: item.basePrice,
      contractType: 'Flat',
      tariffAmount: item.basePrice,
      sponsorCode: sponsorObj?.code || '',
      sponsorDescription: sponsorObj?.name || '',
      className: selectedClass || 'A+',
      active: true
    };

    setGridRows(prev => [newTariff, ...prev]); // Prepend so it appears right at the top of the spreadsheet!
    setSearchItemQuery('');
    setShowItemDropdown(false);
    setHasSearched(true); // Open the grid panel if not already visible
    showToast('success', `Appended ${item.name} as a new tariff. Configure and click Save.`);
  };

  // Get catalog search autocomplete suggestions
  const getSearchSuggestions = () => {
    if (!searchItemQuery) return [];
    const query = searchItemQuery.toLowerCase();

    if (selectedType === 'SERVICES') {
      return serviceDefinitions
        .filter(s => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query))
        .slice(0, 8)
        .map(s => {
          const tariff = serviceTariffs.find(t => t.serviceId === s.id && t.status === 'Active');
          return {
            code: s.code,
            name: s.name,
            basePrice: tariff ? tariff.price : 0,
            groupName: s.groupName || 'SERVICES'
          };
        });
    } else {
      const matchCategory = selectedType === 'DRUGS' ? 'Medication' : 'Consumable';
      return inventoryItems
        .filter(i => 
          i.itemCategory === matchCategory &&
          (i.itemName.toLowerCase().includes(query) || i.itemCode.toLowerCase().includes(query))
        )
        .slice(0, 8)
        .map(i => {
          const price = i.pricing && i.pricing.length > 0 ? i.pricing[0].price : (i.stock?.itemRate || 0);
          return {
            code: i.itemCode,
            name: i.itemName,
            basePrice: price,
            groupName: i.itemCategory.toUpperCase()
          };
        });
    }
  };

  // Update field of grid row in state
  const handleUpdateRow = (rowId: string, updates: Partial<SponsorTariffType> & { contractRate?: number }) => {
    setGridRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      const merged = { ...row, ...updates };

      // Recalculate amount if contract rate or type changed
      if ('contractRate' in updates || 'contractType' in updates) {
        const rate = Number(updates.contractRate) || 0;
        merged.tariffAmount = calculateTariffAmount(merged.baseTariff, merged.contractType, rate);
      }
      return merged;
    }));
  };

  // Remove item row locally
  const handleDeleteRow = async (id: string) => {
    const isNew = id.startsWith('new-');
    if (isNew) {
      setGridRows(prev => prev.filter(r => r.id !== id));
      showToast('info', 'New row removed.');
    } else {
      if (window.confirm('Delete this negotiated tariff permanently? This will restore standard hospital prices for this sponsor.')) {
        await deleteSponsorTariff(id);
        setGridRows(prev => prev.filter(r => r.id !== id));
        showToast('success', 'Tariff deleted successfully.');
      }
    }
  };

  // Save changes batch
  const handleSaveAll = async () => {
    if (gridRows.length === 0) {
      showToast('info', 'No rows loaded to save.');
      return;
    }

    setIsSaving(true);
    try {
      // Stripping temporary prefix IDs to generate clean IDs for new entries
      const sanitizedRows = gridRows.map(row => {
        if (row.id.startsWith('new-')) {
          return {
            ...row,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
        }
        return row;
      });

      await saveSponsorTariffBatch(sanitizedRows);
      
      // Reload matching dataset from database to fetch pristine rows
      const reloaded = sponsorTariffs.filter(t => 
        t.sponsorId === selectedSponsor &&
        t.itemType === selectedType &&
        (!selectedClass || t.className === selectedClass)
      );
      setGridRows(reloaded.map(t => ({ ...t })));

      showToast('success', 'Sponsor Tariffs saved successfully.');
    } catch (e: any) {
      showToast('error', `Failed to save tariffs: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Apply search filters
  const filteredRows = gridRows.filter(row => {
    if (filterCode && !row.itemCode.toLowerCase().includes(filterCode.toLowerCase())) return false;
    if (filterName && !row.itemName.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterCpt && !((row.cptCode || '').toLowerCase().includes(filterCpt.toLowerCase()))) return false;
    if (filterGroup && !((row.groupName || '').toLowerCase().includes(filterGroup.toLowerCase()))) return false;
    if (filterSponsorCode && !((row.sponsorCode || '').toLowerCase().includes(filterSponsorCode.toLowerCase()))) return false;
    if (filterSponsorDesc && !((row.sponsorDescription || '').toLowerCase().includes(filterSponsorDesc.toLowerCase()))) return false;
    if (filterClassName && !((row.className || '').toLowerCase().includes(filterClassName.toLowerCase()))) return false;
    if (filterNphiesCode && !((row.nphiesCode || '').toLowerCase().includes(filterNphiesCode.toLowerCase()))) return false;
    if (filterNphiesDesc && !((row.nphiesDesc || '').toLowerCase().includes(filterNphiesDesc.toLowerCase()))) return false;
    return true;
  });

  // Paginated Rows
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const paginatedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ==================== RENDER: MASTER LIST VIEW ====================
  if (viewMode === 'list') {
    const uniqueSponsorIds = Array.from(new Set(sponsorTariffs.map(t => t.sponsorId)));
    const listData = uniqueSponsorIds.map(id => {
      const org = organizations.find(o => o.id === id);
      const tariffsForSponsor = sponsorTariffs.filter(t => t.sponsorId === id);
      const anyActive = tariffsForSponsor.some(t => t.active);
      return {
        id,
        code: org?.code || 'ORG-UNKNOWN',
        name: org?.name || 'Unknown Sponsor Name',
        active: anyActive
      };
    });

    return (
      <div className="bg-white p-6 space-y-6 text-sm text-slate-800 min-h-screen">
        {/* Header Title Section */}
        <div className="bg-[#f0f4f9] border border-slate-200 px-5 py-3 flex items-center justify-between">
          <span className="font-bold text-base text-slate-800 tracking-wide">Sponsor Tariff List</span>
          <button
            onClick={() => {
              setSelectedSponsor('');
              setSelectedType('');
              setSelectedClass('');
              setGridRows([]);
              setHasSearched(false);
              setViewMode('editor');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1.5 px-4 rounded shadow transition-all active:scale-95 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Define New Sponsor Tariff
          </button>
        </div>

        {/* List Grid Table */}
        <div className="border border-slate-300 overflow-hidden rounded bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#e4e7eb] text-slate-700 font-bold border-b border-slate-300">
                <th className="p-2 border border-slate-300 font-bold w-1/4">SponsorCode</th>
                <th className="p-2 border border-slate-300 font-bold w-1/2">SponsorName</th>
                <th className="p-2 border border-slate-300 font-bold w-24">Active</th>
                <th className="p-2 border border-slate-300 font-bold w-24 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {listData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400 font-semibold">
                    No sponsor tariffs created yet. Click "Define New Sponsor Tariff" to define negotiated prices.
                  </td>
                </tr>
              ) : (
                listData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 border-b border-slate-200">
                    <td className="p-2.5 border border-slate-300 text-slate-700 font-mono font-bold">{row.code}</td>
                    <td className="p-2.5 border border-slate-300 text-slate-800 font-semibold">{row.name}</td>
                    <td className="p-2.5 border border-slate-300 text-slate-600 font-semibold">{row.active ? 'true' : 'false'}</td>
                    <td className="p-2.5 border border-slate-300 text-center">
                      <button
                        onClick={() => {
                          // Find first saved record for this sponsor to automatically set filters
                          const firstTariff = sponsorTariffs.find(t => t.sponsorId === row.id);
                          const defaultType = firstTariff ? firstTariff.itemType : 'SERVICES';
                          const defaultClass = firstTariff ? normalizeClassName(firstTariff.className) : 'A+';

                          setSelectedSponsor(row.id);
                          setSelectedType(defaultType);
                          setSelectedClass(defaultClass);
                          
                          // Load existing matching rows
                          const matching = sponsorTariffs.filter(t => 
                            t.sponsorId === row.id &&
                            t.itemType === defaultType &&
                            normalizeClassName(t.className) === defaultClass
                          );
                          setGridRows(matching.map(t => ({ ...t })));
                          setHasSearched(true);
                          setViewMode('editor');
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold transition-all text-xs outline-none"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ==================== RENDER: SPREADSHEET EDITOR VIEW ====================
  return (
    <div className="bg-white p-6 space-y-6 text-sm text-slate-800 min-h-screen">
      {/* --- Header Filters Section --- */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Sponsor:</span>
            <select
              className="border border-slate-300 rounded px-2 py-1 w-64 bg-white text-slate-700 font-medium text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              value={selectedSponsor}
              onChange={e => {
                setSelectedSponsor(e.target.value);
                setGridRows([]);
                setHasSearched(false);
              }}
            >
              <option value="">-- Select Sponsor --</option>
              {organizations.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Active:</span>
            <input
              type="checkbox"
              className="rounded text-blue-600 outline-none focus:ring-1 focus:ring-blue-500"
              checked={isActiveSponsor}
              onChange={e => setIsActiveSponsor(e.target.checked)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Type<span className="text-red-500">*</span>:</span>
            <select
              className="border border-slate-300 rounded px-2 py-1 w-40 bg-white text-slate-700 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              value={selectedType}
              onChange={e => {
                setSelectedType(e.target.value);
                setGridRows([]);
                setHasSearched(false);
              }}
            >
              <option value="">-- Select --</option>
              <option value="SERVICES">SERVICES</option>
              <option value="DRUGS">DRUGS</option>
              <option value="CONSUMABLES">CONSUMABLES</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Class:</span>
            <select
              className="border border-slate-300 rounded px-2 py-1 w-40 bg-white text-slate-700 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              value={selectedClass}
              onChange={e => {
                setSelectedClass(e.target.value);
                setGridRows([]);
                setHasSearched(false);
              }}
            >
              <option value="">-- Select --</option>
              <option value="A+">Class A+ Elite</option>
              <option value="A">Class A Standard</option>
              <option value="B">Class B Economy</option>
              <option value="C">Class C Basic</option>
            </select>
          </div>

          <button
            onClick={handleSearch}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-5 py-1.5 rounded transition-all active:scale-95"
          >
            search
          </button>

          {/* Catalog Picker for Defining New Tariffs */}
          {selectedSponsor && selectedType && (
            <div className="relative flex items-center gap-2 border-l border-slate-300 pl-6">
              <span className="font-semibold text-slate-600">Define New Tariff:</span>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Search catalog item to add..."
                  className="border border-slate-300 rounded px-3 py-1.5 text-xs w-60 outline-none focus:border-blue-500 bg-white text-slate-700"
                  value={searchItemQuery}
                  onChange={e => {
                    setSearchItemQuery(e.target.value);
                    setShowItemDropdown(true);
                  }}
                  onFocus={() => setShowItemDropdown(true)}
                />
                
                {showItemDropdown && getSearchSuggestions().length > 0 && (
                  <div className="absolute top-full left-0 w-80 bg-white border border-slate-200 shadow-xl rounded mt-1 z-50 max-h-60 overflow-y-auto">
                    {getSearchSuggestions().map(item => (
                      <div
                        key={item.code}
                        onClick={() => handleAddItem(item)}
                        className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center"
                      >
                        <div className="font-semibold text-slate-800">
                          <div>{item.name}</div>
                          <div className="text-slate-400 font-mono text-[10px]">{item.code}</div>
                        </div>
                        <div className="font-bold text-blue-600">{formatCurrency(item.basePrice)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Spreadsheets Grid --- */}
      {hasSearched && (
        <div className="border border-slate-300 overflow-hidden rounded bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {/* Headers Text Row */}
                <tr className="bg-[#e4e7eb] text-slate-700 font-bold border-b border-slate-300">
                  <th className="p-2 border border-slate-300 text-center font-bold">Service Code</th>
                  <th className="p-2 border border-slate-300 text-center font-bold">Service Name</th>
                  <th className="p-2 border border-slate-300 text-center font-bold">CPT Code</th>
                  <th className="p-2 border border-slate-300 text-center font-bold">Group Name</th>
                  <th className="p-2 border border-slate-300 text-center font-bold w-20">Base Tariff</th>
                  <th className="p-2 border border-slate-300 text-center font-bold w-36">Contract Type</th>
                  <th className="p-2 border border-slate-300 text-center font-bold w-24">Tariff Amount</th>
                  <th className="p-2 border border-slate-300 text-center font-bold w-28">Sponsor Code</th>
                  <th className="p-2 border border-slate-300 text-center font-bold w-40">Sponsor Description</th>
                  <th className="p-2 border border-slate-300 text-center font-bold w-24">Class Name</th>
                  <th className="p-2 border border-slate-300 text-center font-bold w-28">NphiesCode</th>
                  <th className="p-2 border border-slate-300 text-center font-bold w-40">NphiesDesc</th>
                  <th className="p-2 border border-slate-300 text-center font-bold w-16">is Active</th>
                  <th className="p-2 border border-slate-300 text-center font-bold w-16">Action</th>
                </tr>
                {/* Search Filter Boxes Row */}
                <tr className="bg-[#f5f7fa]">
                  <td className="p-1 border border-slate-300">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-[11px] outline-none"
                      value={filterCode}
                      onChange={e => { setFilterCode(e.target.value); setCurrentPage(1); }}
                    />
                  </td>
                  <td className="p-1 border border-slate-300">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-[11px] outline-none"
                      value={filterName}
                      onChange={e => { setFilterName(e.target.value); setCurrentPage(1); }}
                    />
                  </td>
                  <td className="p-1 border border-slate-300">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-[11px] outline-none"
                      value={filterCpt}
                      onChange={e => { setFilterCpt(e.target.value); setCurrentPage(1); }}
                    />
                  </td>
                  <td className="p-1 border border-slate-300">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-[11px] outline-none"
                      value={filterGroup}
                      onChange={e => { setFilterGroup(e.target.value); setCurrentPage(1); }}
                    />
                  </td>
                  <td className="p-1 border border-slate-300 bg-[#f9fafb]"></td>
                  <td className="p-1 border border-slate-300 bg-[#f9fafb]"></td>
                  <td className="p-1 border border-slate-300 bg-[#f9fafb]"></td>
                  <td className="p-1 border border-slate-300">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-[11px] outline-none"
                      value={filterSponsorCode}
                      onChange={e => { setFilterSponsorCode(e.target.value); setCurrentPage(1); }}
                    />
                  </td>
                  <td className="p-1 border border-slate-300">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-[11px] outline-none"
                      value={filterSponsorDesc}
                      onChange={e => { setFilterSponsorDesc(e.target.value); setCurrentPage(1); }}
                    />
                  </td>
                  <td className="p-1 border border-slate-300">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-[11px] outline-none"
                      value={filterClassName}
                      onChange={e => { setFilterClassName(e.target.value); setCurrentPage(1); }}
                    />
                  </td>
                  <td className="p-1 border border-slate-300">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-[11px] outline-none"
                      value={filterNphiesCode}
                      onChange={e => { setFilterNphiesCode(e.target.value); setCurrentPage(1); }}
                    />
                  </td>
                  <td className="p-1 border border-slate-300">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-[11px] outline-none"
                      value={filterNphiesDesc}
                      onChange={e => { setFilterNphiesDesc(e.target.value); setCurrentPage(1); }}
                    />
                  </td>
                  <td className="p-1 border border-slate-300 bg-[#f9fafb]"></td>
                  <td className="p-1 border border-slate-300 bg-[#f9fafb]"></td>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-8 text-center text-slate-400 font-semibold">
                      No matching records found. Use "Define New Tariff" picker above to add rows.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 border-b border-slate-200">
                      {/* Service Code */}
                      <td className="p-2 border border-slate-300 font-mono text-slate-700 font-bold">{row.itemCode}</td>
                      
                      {/* Service Name */}
                      <td className="p-2 border border-slate-300 font-semibold text-slate-800">{row.itemName}</td>
                      
                      {/* CPT Code */}
                      <td className="p-1.5 border border-slate-300">
                        <input
                          type="text"
                          className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none text-slate-700"
                          value={row.cptCode || ''}
                          onChange={e => handleUpdateRow(row.id, { cptCode: e.target.value })}
                        />
                      </td>

                      {/* Group Name */}
                      <td className="p-2 border border-slate-300 font-medium text-slate-600">{row.groupName}</td>
                      
                      {/* Base Tariff */}
                      <td className="p-2 border border-slate-300 text-right font-mono font-bold text-slate-600 bg-slate-50">
                        {row.baseTariff.toFixed(decimals)}
                      </td>
                      
                      {/* Contract Type */}
                      <td className="p-1 border border-slate-300">
                        <div className="flex gap-1 items-center">
                          <select
                            className="bg-white border border-slate-300 rounded px-1 py-0.5 text-[11px] text-slate-700 outline-none w-2/3"
                            value={row.contractType}
                            onChange={e => handleUpdateRow(row.id, { contractType: e.target.value })}
                          >
                            <option value="Flat">Flat Price</option>
                            <option value="Discount %">Discount %</option>
                            <option value="Markup %">Markup %</option>
                          </select>
                          {row.contractType !== 'Flat' && (
                            <input
                              type="number"
                              placeholder="%"
                              className="border border-slate-300 rounded px-1 py-0.5 text-[11px] outline-none w-1/3 text-right font-mono"
                              onChange={e => {
                                const rateVal = Number(e.target.value) || 0;
                                handleUpdateRow(row.id, { contractRate: rateVal });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      {/* Tariff Amount */}
                      <td className="p-1 border border-slate-300">
                        <input
                          type="number"
                          step={selectedCurrency === 'BHD' ? "0.001" : "0.01"}
                          disabled={row.contractType !== 'Flat'}
                          className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right font-mono font-extrabold text-blue-800 outline-none disabled:bg-slate-50 disabled:text-slate-700"
                          value={row.tariffAmount}
                          onChange={e => handleUpdateRow(row.id, { tariffAmount: Number(e.target.value) || 0 })}
                        />
                      </td>

                      {/* Sponsor Code */}
                      <td className="p-1.5 border border-slate-300">
                        <input
                          type="text"
                          className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none text-slate-700"
                          value={row.sponsorCode || ''}
                          onChange={e => handleUpdateRow(row.id, { sponsorCode: e.target.value })}
                        />
                      </td>

                      {/* Sponsor Description */}
                      <td className="p-1.5 border border-slate-300">
                        <input
                          type="text"
                          className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none text-slate-700"
                          value={row.sponsorDescription || ''}
                          onChange={e => handleUpdateRow(row.id, { sponsorDescription: e.target.value })}
                        />
                      </td>

                      {/* Class Name */}
                      <td className="p-1.5 border border-slate-300">
                        <input
                          type="text"
                          className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none text-slate-700"
                          value={row.className || ''}
                          onChange={e => handleUpdateRow(row.id, { className: e.target.value })}
                        />
                      </td>

                      {/* NphiesCode */}
                      <td className="p-1.5 border border-slate-300">
                        <input
                          type="text"
                          className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none text-slate-700"
                          value={row.nphiesCode || ''}
                          onChange={e => handleUpdateRow(row.id, { nphiesCode: e.target.value })}
                        />
                      </td>

                      {/* NphiesDesc */}
                      <td className="p-1.5 border border-slate-300">
                        <input
                          type="text"
                          className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none text-slate-700"
                          value={row.nphiesDesc || ''}
                          onChange={e => handleUpdateRow(row.id, { nphiesDesc: e.target.value })}
                        />
                      </td>

                      {/* is Active */}
                      <td className="p-2 border border-slate-300 text-center">
                        <input
                          type="checkbox"
                          className="rounded text-blue-600"
                          checked={row.active}
                          onChange={e => handleUpdateRow(row.id, { active: e.target.checked })}
                        />
                      </td>

                      {/* Action */}
                      <td className="p-2 border border-slate-300 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="text-blue-600 hover:text-red-600 font-bold transition-all text-xs outline-none"
                        >
                          remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRows.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            colorTheme="blue"
          />
        </div>
      )}

      {/* --- Action Buttons (Save & Back) --- */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold text-xs py-2 px-6 rounded shadow transition-all active:scale-95 flex items-center gap-1.5 outline-none"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
        <button
          onClick={() => setViewMode('list')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-6 rounded shadow transition-all active:scale-95 outline-none"
        >
          Back
        </button>
      </div>
    </div>
  );
};
