import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  ExternalLink, 
  Filter, 
  SlidersHorizontal, 
  ArrowUpDown, 
  X, 
  Layers, 
  Sparkles,
  RefreshCw,
  Tag,
  FileSpreadsheet,
  Globe,
  Trash2,
  Edit2
} from 'lucide-react';
import { useWelliPay } from '../../context/WelliPayContext';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';
import { MasterService, ProviderAccount, ProviderCatalogueItem } from '../../types';

const NIGERIAN_HMOS = [
  'Reliance HMO',
  'AXA Mansard',
  'Hygeia HMO',
  'Leadway Health',
  'Avon HMO',
  'Metrohealth'
];

export const ServiceCatalogueView: React.FC = () => {
  const { addNotification } = useWelliPay();
  const { user } = useAuth();

  const [providers, setProviders] = useState<ProviderAccount[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('PRV-LAG-01');
  const [catalogue, setCatalogue] = useState<ProviderCatalogueItem[]>([]);
  const [masterServices, setMasterServices] = useState<MasterService[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [catalogueLoading, setCatalogueLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const [modalDepartment, setModalDepartment] = useState<string>('all');
  const [selectedMasterService, setSelectedMasterService] = useState<MasterService | null>(null);
  const [modalPrice, setModalPrice] = useState<string>('');
  const [modalTurnaround, setModalTurnaround] = useState<string>('Same day (2-4 hrs)');
  const [modalHMOs, setModalHMOs] = useState<string[]>(['Reliance HMO', 'AXA Mansard', 'Hygeia HMO', 'Leadway Health']);
  const [modalIsPublished, setModalIsPublished] = useState<boolean>(true);
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false);

  // Inline editing state
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');

  // 1. Fetch Providers & Master Directory on mount
  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const [provRes, masterRes] = await Promise.all([
          fetch('/api/directory/providers'),
          fetch('/api/directory/master?provider_type=laboratory')
        ]);

        const provData = await provRes.json();
        const masterData = await masterRes.json();

        if (provData.success && provData.providers) {
          setProviders(provData.providers);
          if (provData.providers.length > 0 && !selectedProviderId) {
            setSelectedProviderId(provData.providers[0].id);
          }
        }

        if (masterData.success && masterData.services) {
          setMasterServices(masterData.services);
          setDepartments(masterData.departments || []);
        }
      } catch (err) {
        console.error('Failed to fetch initial directory data:', err);
        addNotification('Failed to load services directory', 'error');
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, []);

  // 2. Fetch Catalogue for selected provider
  const fetchCatalogue = async (providerId: string) => {
    setCatalogueLoading(true);
    try {
      const res = await fetch(`/api/directory/catalogue/${providerId}`);
      const data = await res.json();
      if (data.success && data.catalogue) {
        setCatalogue(data.catalogue);
      }
    } catch (err) {
      console.error('Failed to fetch provider catalogue:', err);
      addNotification('Could not load provider catalogue', 'error');
    } finally {
      setCatalogueLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProviderId) {
      fetchCatalogue(selectedProviderId);
    }
  }, [selectedProviderId]);

  // Auth header helper
  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (e) {
        headers['Authorization'] = 'Bearer dev-token';
      }
    } else {
      headers['Authorization'] = 'Bearer dev-token';
    }
    return headers;
  };

  // Toggle publish state
  const handleTogglePublish = async (item: ProviderCatalogueItem) => {
    const nextState = !item.isPublished;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/directory/catalogue/${item.id}/publish`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_published: nextState })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCatalogue(prev => prev.map(c => c.id === item.id ? { ...c, isPublished: nextState } : c));
        addNotification(
          nextState 
            ? `${item.serviceName} published live to directory.` 
            : `${item.serviceName} unpublished from live directory.`, 
          'success'
        );
      } else {
        throw new Error(data.error || 'Failed to update publish state');
      }
    } catch (err: any) {
      addNotification(err.message || 'Error updating publish status', 'error');
    }
  };

  // Save inline price edit
  const handleSaveInlinePrice = async (item: ProviderCatalogueItem) => {
    const cleanNum = parseFloat(editingPrice.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanNum) || cleanNum <= 0) {
      addNotification('Please enter a valid price greater than 0', 'error');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/directory/catalogue', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider_id: item.providerId,
          master_service_id: item.masterServiceId,
          price: cleanNum,
          turnaround_time: item.turnaroundTime,
          hmo_accepted: item.hmoAccepted,
          is_published: item.isPublished
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCatalogue(prev => prev.map(c => c.id === item.id ? { ...c, price: cleanNum } : c));
        setEditingItemId(null);
        addNotification(`Price for ${item.serviceName} updated to ₦${cleanNum.toLocaleString()}`, 'success');
      } else {
        throw new Error(data.error || 'Failed to save price');
      }
    } catch (err: any) {
      addNotification(err.message || 'Error updating price', 'error');
    }
  };

  // Delete catalogue item
  const handleDeleteItem = async (item: ProviderCatalogueItem) => {
    if (!window.confirm(`Remove "${item.serviceName}" from ${currentProvider?.name}'s catalogue?`)) {
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/directory/catalogue/${item.id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setCatalogue(prev => prev.filter(c => c.id !== item.id));
        addNotification(`${item.serviceName} removed from catalogue`, 'info');
      }
    } catch (err: any) {
      addNotification('Failed to remove item', 'error');
    }
  };

  // Publish all drafts
  const handlePublishAll = async () => {
    const draftItems = catalogue.filter(c => !c.isPublished);
    if (draftItems.length === 0) {
      addNotification('All services in catalogue are already published live', 'info');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      for (const item of draftItems) {
        await fetch(`/api/directory/catalogue/${item.id}/publish`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ is_published: true })
        });
      }
      setCatalogue(prev => prev.map(c => ({ ...c, isPublished: true })));
      addNotification(`Published all ${draftItems.length} draft services live to directory!`, 'success');
    } catch (err) {
      addNotification('Error publishing services', 'error');
    }
  };

  // Add new service from modal
  const handleAddServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMasterService) {
      addNotification('Please select a standardized service from the master directory', 'error');
      return;
    }

    const priceNum = parseFloat(modalPrice.replace(/[^0-9.]/g, ''));
    if (isNaN(priceNum) || priceNum <= 0) {
      addNotification('Please enter a valid price greater than ₦0', 'error');
      return;
    }

    setModalSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/directory/catalogue', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider_id: selectedProviderId,
          master_service_id: selectedMasterService.id,
          price: priceNum,
          turnaround_time: modalTurnaround,
          hmo_accepted: modalHMOs,
          is_published: modalIsPublished
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addNotification(`Added ${selectedMasterService.serviceName} to catalogue (₦${priceNum.toLocaleString()})`, 'success');
        setIsAddModalOpen(false);
        setSelectedMasterService(null);
        setModalPrice('');
        await fetchCatalogue(selectedProviderId);
      } else {
        throw new Error(data.error || 'Failed to add service');
      }
    } catch (err: any) {
      addNotification(err.message || 'Error saving service', 'error');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Current Provider Object
  const currentProvider = useMemo(() => {
    return providers.find(p => p.id === selectedProviderId) || null;
  }, [providers, selectedProviderId]);

  // Filtered Catalogue items
  const filteredCatalogue = useMemo(() => {
    return catalogue.filter(item => {
      // Department filter
      if (selectedDepartment !== 'all' && item.department !== selectedDepartment) {
        return false;
      }
      // Status filter
      if (statusFilter === 'published' && !item.isPublished) return false;
      if (statusFilter === 'draft' && item.isPublished) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.serviceName.toLowerCase().includes(q);
        const matchCode = item.serviceCode.toLowerCase().includes(q);
        const matchDept = item.department.toLowerCase().includes(q);
        return matchName || matchCode || matchDept;
      }
      return true;
    });
  }, [catalogue, selectedDepartment, statusFilter, searchQuery]);

  // Filtered Master Services in Modal
  const modalFilteredServices = useMemo(() => {
    return masterServices.filter(service => {
      // Exclude already added if desired or show them disabled
      if (modalDepartment !== 'all' && service.department !== modalDepartment) {
        return false;
      }
      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase();
        return (
          service.serviceName.toLowerCase().includes(q) ||
          service.serviceCode.toLowerCase().includes(q) ||
          service.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [masterServices, modalDepartment, modalSearchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const totalOffered = catalogue.length;
    const totalPublished = catalogue.filter(c => c.isPublished).length;
    const coveredDepts = new Set(catalogue.map(c => c.department)).size;
    const allHMOs = new Set(catalogue.flatMap(c => c.hmoAccepted || [])).size;
    return { totalOffered, totalPublished, coveredDepts, allHMOs };
  }, [catalogue]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Provider Switcher */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-blue-50 text-brand-navy border border-blue-200/60 uppercase">
                Tier 3 Provider Tariffs · Laboratory & Diagnostic
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Standardized master directory
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Service Catalogue & Tariffs
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Select standardized clinical investigations from the master directory, configure provider fee schedules, turnaround times, and publish live to payers.
            </p>
          </div>

          {/* Provider Selector & Action Buttons */}
          <div className="flex items-center flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 shadow-2xs">
              <Building2 className="w-4 h-4 text-slate-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
                  Active Provider
                </span>
                <select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer pr-4"
                >
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.providerType === 'hospital' ? 'Hospital' : 'Laboratory'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedMasterService(null);
                setModalPrice('');
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#12244D] hover:bg-[#0A152E] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add service from directory</span>
            </button>

            <button
              onClick={handlePublishAll}
              title="Publish all draft tariffs live"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>Publish all</span>
            </button>
          </div>
        </div>

        {/* 2. Executive Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-3.5">
            <div className="text-xs font-medium text-slate-500">Offered Services</div>
            <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-2">
              <span>{metrics.totalOffered}</span>
              <span className="text-xs font-normal text-slate-400">in catalogue</span>
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-lg p-3.5">
            <div className="text-xs font-medium text-emerald-800">Published Live</div>
            <div className="text-xl font-bold text-emerald-900 mt-1 flex items-baseline gap-2">
              <span>{metrics.totalPublished}</span>
              <span className="text-xs font-semibold text-emerald-600">
                {metrics.totalOffered > 0 ? `${Math.round((metrics.totalPublished / metrics.totalOffered) * 100)}% live` : '0%'}
              </span>
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-3.5">
            <div className="text-xs font-medium text-slate-500">Departments Covered</div>
            <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-2">
              <span>{metrics.coveredDepts}</span>
              <span className="text-xs font-normal text-slate-400">of 10 master depts</span>
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-3.5">
            <div className="text-xs font-medium text-slate-500">HMO Network Coverage</div>
            <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-2">
              <span>{metrics.allHMOs}</span>
              <span className="text-xs font-normal text-slate-400">underwriters accepted</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tests by name, code (e.g. LAB-HEM-FBC), or department..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12244D]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-[#12244D] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({catalogue.length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'published'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Published ({catalogue.filter(c => c.isPublished).length})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'draft'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Drafts ({catalogue.filter(c => !c.isPublished).length})
            </button>
          </div>
        </div>

        {/* Department Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          <button
            onClick={() => setSelectedDepartment('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedDepartment === 'all'
                ? 'bg-[#12244D] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Departments
          </button>
          {departments.map(dept => {
            const countInDept = catalogue.filter(c => c.department === dept).length;
            const isSelected = selectedDepartment === dept;
            return (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#12244D] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{dept}</span>
                {countInDept > 0 && (
                  <span className={`text-[10px] px-1 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {countInDept}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Catalogue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {catalogueLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-brand-navy" />
            <span>Loading tariff catalogue...</span>
          </div>
        ) : filteredCatalogue.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">No services match current filters</div>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {catalogue.length === 0 
                ? `${currentProvider?.name} has no services registered yet. Click "Add service from directory" to begin.`
                : 'Try adjusting your search query or department filter.'}
            </p>
            {catalogue.length === 0 && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12244D] text-white text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add first service</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Standard Service & Code</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-right">Provider Tariff (₦)</th>
                  <th className="py-3 px-4">Turnaround Time</th>
                  <th className="py-3 px-4">Accepted HMOs</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCatalogue.map(item => {
                  const isEditing = editingItemId === item.id;
                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs flex items-center gap-2">
                          <span>{item.serviceName}</span>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.serviceCode}
                          </span>
                        </div>
                        {item.specimenType && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Specimen: {item.specimenType}
                          </div>
                        )}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                          {item.department}
                        </span>
                      </td>

                      {/* Price (Editable inline) */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-400 font-bold">₦</span>
                            <input
                              type="text"
                              value={editingPrice}
                              onChange={(e) => setEditingPrice(e.target.value)}
                              className="w-24 px-1.5 py-0.5 text-right font-mono font-bold bg-white border border-[#12244D] rounded text-xs focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveInlinePrice(item)}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                              title="Save price"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditingPrice(item.price.toString());
                            }}
                            className="inline-flex items-center gap-1.5 cursor-pointer group/price py-0.5 px-1 rounded hover:bg-slate-100"
                            title="Click to edit price"
                          >
                            <span className="font-bold text-slate-900 text-xs">
                              ₦{Number(item.price).toLocaleString()}
                            </span>
                            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover/price:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      {/* Turnaround Time */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-700 text-xs">
                          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{item.turnaroundTime || 'Same day'}</span>
                        </div>
                      </td>

                      {/* Accepted HMOs */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center flex-wrap gap-1 max-w-xs">
                          {item.hmoAccepted && item.hmoAccepted.length > 0 ? (
                            item.hmoAccepted.map(hmo => (
                              <span 
                                key={hmo}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200/50"
                              >
                                {hmo.replace(' HMO', '')}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Self-pay only</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {item.isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Draft
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTogglePublish(item)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                              item.isPublished
                                ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {item.isPublished ? 'Unpublish' : 'Publish Live'}
                          </button>

                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Remove from catalogue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* 5. Add Service From Master Directory Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-navy">
                  Master Service Directory
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  Add Standardized Diagnostic Service
                </h2>
                <p className="text-xs text-slate-500">
                  Select a test from the 10 standardized departments to configure {currentProvider?.name}'s tariff.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 flex-1 overflow-hidden">
              {/* Left Column: Master Directory Browser */}
              <div className="p-4 flex flex-col space-y-3 overflow-hidden">
                <div className="text-xs font-semibold text-slate-800">
                  1. Select Master Test ({modalFilteredServices.length})
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    placeholder="Search master tests..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#12244D]"
                  />

                  <select
                    value={modalDepartment}
                    onChange={(e) => setModalDepartment(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All 10 Departments</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Service List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[340px]">
                  {modalFilteredServices.map(service => {
                    const isSelected = selectedMasterService?.id === service.id;
                    const isAlreadyInCatalogue = catalogue.some(c => c.masterServiceId === service.id);

                    return (
                      <div
                        key={service.id}
                        onClick={() => setSelectedMasterService(service)}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#12244D] bg-blue-50/50 ring-1 ring-[#12244D]'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-semibold text-xs text-slate-900 leading-snug">
                            {service.serviceName}
                          </div>
                          {isAlreadyInCatalogue && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                              Added
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 rounded">
                            {service.serviceCode}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {service.department}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Pricing & Tariff Configuration */}
              <form onSubmit={handleAddServiceSubmit} className="p-4 flex flex-col justify-between overflow-y-auto max-h-[500px]">
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-slate-800">
                    2. Provider Tariff & Terms
                  </div>

                  {selectedMasterService ? (
                    <div className="p-3 bg-blue-50/40 border border-blue-200/60 rounded-lg space-y-1.5">
                      <div className="text-xs font-bold text-slate-900">
                        {selectedMasterService.serviceName}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {selectedMasterService.description}
                      </div>
                      {selectedMasterService.specimenType && (
                        <div className="text-[11px] text-slate-500">
                          <span className="font-medium text-slate-700">Specimen:</span> {selectedMasterService.specimenType}
                        </div>
                      )}
                      {selectedMasterService.benchmarkTurnaround && (
                        <div className="text-[11px] text-slate-500">
                          <span className="font-medium text-slate-700">Benchmark TAT:</span> {selectedMasterService.benchmarkTurnaround}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed border-slate-300 rounded-lg text-center text-slate-400 text-xs">
                      ← Select a standardized test from the master directory on the left
                    </div>
                  )}

                  {/* Price */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Our Tariff Price (₦) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 font-bold text-xs">₦</span>
                      <input
                        type="text"
                        value={modalPrice}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setModalPrice(val ? Number(val).toLocaleString() : '');
                        }}
                        placeholder="e.g. 15,000"
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#12244D]"
                        required
                      />
                    </div>
                  </div>

                  {/* Turnaround Time */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Turnaround Time (TAT)
                    </label>
                    <select
                      value={modalTurnaround}
                      onChange={(e) => setModalTurnaround(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#12244D] cursor-pointer"
                    >
                      <option value="Same day (immediate)">Same day (Immediate / 1 hour)</option>
                      <option value="Same day (2-4 hrs)">Same day (2–4 hours)</option>
                      <option value="Same day (6-8 hrs)">Same day (6–8 hours)</option>
                      <option value="24 hours">24 hours (Next day)</option>
                      <option value="48-72 hours">48–72 hours (2–3 days)</option>
                      <option value="3-5 days">3–5 days (Send-out / Molecular)</option>
                      <option value="5-7 days">5–7 days (Histopathology / Cultures)</option>
                    </select>
                  </div>

                  {/* HMOs Accepted */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Accepted HMO Partners
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {NIGERIAN_HMOS.map(hmo => {
                        const isChecked = modalHMOs.includes(hmo);
                        return (
                          <label 
                            key={hmo}
                            className={`flex items-center gap-2 p-1.5 rounded border text-xs cursor-pointer select-none transition-colors ${
                              isChecked ? 'bg-blue-50/70 border-blue-200 text-[#12244D]' : 'border-slate-200 text-slate-600'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setModalHMOs(prev => [...prev, hmo]);
                                } else {
                                  setModalHMOs(prev => prev.filter(h => h !== hmo));
                                }
                              }}
                              className="rounded text-[#12244D] focus:ring-0"
                            />
                            <span className="text-[11px] font-medium">{hmo}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Publish Immediately */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={modalIsPublished}
                        onChange={(e) => setModalIsPublished(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        Publish live immediately upon saving
                      </span>
                    </label>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedMasterService || !modalPrice || modalSubmitting}
                    className="px-4 py-2 rounded-lg bg-[#12244D] hover:bg-[#0A152E] disabled:bg-slate-300 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    {modalSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Add to {currentProvider?.name || 'Catalogue'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ServiceCatalogueView;
