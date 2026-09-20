import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Clock, 
  ShieldCheck, 
  Filter, 
  X, 
  Layers, 
  RefreshCw,
  Trash2,
  Edit3,
  Calendar,
  User,
  FileText,
  CheckSquare,
  Square,
  Sliders,
  ChevronRight,
  Info
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

const TURNAROUND_PRESETS = [
  { hours: 1, label: '1h (Immediate)' },
  { hours: 4, label: '4h (Same day)' },
  { hours: 6, label: '6h (Same day)' },
  { hours: 12, label: '12h (Half day)' },
  { hours: 24, label: '24h (Next day)' },
  { hours: 48, label: '48h (2 days)' },
  { hours: 72, label: '72h (3 days)' }
];

export const ServiceCatalogueView: React.FC = () => {
  const { addNotification } = useWelliPay();
  const { user } = useAuth();

  const [providers, setProviders] = useState<ProviderAccount[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('PRV-LAG-01');
  const [catalogue, setCatalogue] = useState<ProviderCatalogueItem[]>([]);
  const [masterServices, setMasterServices] = useState<MasterService[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [openInvoices, setOpenInvoices] = useState<any[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [catalogueLoading, setCatalogueLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Slide-out side drawer state
  const [selectedItem, setSelectedItem] = useState<ProviderCatalogueItem | null>(null);
  const [drawerPrice, setDrawerPrice] = useState<string>('');
  const [drawerHours, setDrawerHours] = useState<number>(4);
  const [drawerHMOs, setDrawerHMOs] = useState<string[]>([]);
  const [drawerIsPublished, setDrawerIsPublished] = useState<boolean>(true);
  const [drawerEffectiveDate, setDrawerEffectiveDate] = useState<string>('1 Jan 2026');
  const [drawerLastEditedBy, setDrawerLastEditedBy] = useState<string>('Dr. K. Balogun · Revenue Cycle Lead');
  const [drawerSaving, setDrawerSaving] = useState<boolean>(false);

  // Add Service Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const [modalDepartment, setModalDepartment] = useState<string>('all');
  const [selectedMasterService, setSelectedMasterService] = useState<MasterService | null>(null);
  const [modalPrice, setModalPrice] = useState<string>('');
  const [modalHours, setModalHours] = useState<number>(4);
  const [modalHMOs, setModalHMOs] = useState<string[]>(['Reliance HMO', 'AXA Mansard', 'Hygeia HMO', 'Leadway Health', 'Avon HMO']);
  const [modalIsPublished, setModalIsPublished] = useState<boolean>(true);
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false);

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

  // 1. Fetch Providers, Master Directory & Open Invoices on mount
  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        const [provRes, masterRes, invRes] = await Promise.all([
          fetch('/api/directory/providers'),
          fetch('/api/directory/master?provider_type=laboratory'),
          fetch('/api/invoices', { headers }).catch(() => null)
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

        if (invRes && invRes.ok) {
          const invData = await invRes.json();
          if (invData.invoices && Array.isArray(invData.invoices)) {
            setOpenInvoices(invData.invoices);
          }
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

  // Sync drawer fields when an item is selected
  useEffect(() => {
    if (selectedItem) {
      setDrawerPrice(selectedItem.price ? selectedItem.price.toString() : '');
      setDrawerHours(selectedItem.turnaroundHours || 4);
      setDrawerHMOs(selectedItem.hmoAccepted && selectedItem.hmoAccepted.length > 0 
        ? [...selectedItem.hmoAccepted] 
        : ['Reliance HMO', 'AXA Mansard', 'Hygeia HMO', 'Leadway Health', 'Avon HMO']);
      setDrawerIsPublished(selectedItem.isPublished !== false);
      setDrawerEffectiveDate(selectedItem.effectiveDate || '1 Jan 2026');
      setDrawerLastEditedBy(selectedItem.lastEditedBy || 'Dr. K. Balogun · Revenue Cycle Lead');
    }
  }, [selectedItem]);

  // Current Provider
  const currentProvider = useMemo(() => {
    return providers.find(p => p.id === selectedProviderId) || null;
  }, [providers, selectedProviderId]);

  // Filtered Catalogue items
  const filteredCatalogue = useMemo(() => {
    return catalogue.filter(item => {
      if (selectedDepartment !== 'all' && item.department !== selectedDepartment) {
        return false;
      }
      if (statusFilter === 'published' && !item.isPublished) return false;
      if (statusFilter === 'draft' && item.isPublished) return false;
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

  // Metrics
  const metrics = useMemo(() => {
    const totalOffered = catalogue.length;
    const totalPublished = catalogue.filter(c => c.isPublished).length;
    const draftCount = totalOffered - totalPublished;
    const coveredDepts = new Set(catalogue.map(c => c.department)).size;
    const allHMOs = new Set(catalogue.flatMap(c => c.hmoAccepted || [])).size;
    return { totalOffered, totalPublished, draftCount, coveredDepts, allHMOs };
  }, [catalogue]);

  // Affected active open invoices for currently selected item in drawer
  const affectedOpenInvoices = useMemo(() => {
    if (!selectedItem) return [];
    return openInvoices.filter(inv => {
      const isUnpaid = inv.status !== 'paid' && inv.status !== 'reconciled';
      if (!isUnpaid) return false;
      
      const desc = (inv.serviceDescription || '').toLowerCase();
      const code = (selectedItem.serviceCode || '').toLowerCase();
      const name = (selectedItem.serviceName || '').toLowerCase();
      
      const matchCode = desc.includes(code);
      const matchName = desc.includes(name) || 
        (name.includes('blood count') && desc.includes('blood count')) ||
        (name.includes('electrolyte') && desc.includes('electrolyte')) ||
        (name.includes('lipid') && desc.includes('lipid'));
      const matchOrder = inv.orders?.some((o: any) => 
        (o.serviceType || '').toLowerCase().includes(name) || (o.serviceType || '').toLowerCase().includes(code)
      );

      return matchCode || matchName || matchOrder;
    });
  }, [selectedItem, openInvoices]);

  // Turnaround display formatter
  const formatTurnaround = (hours?: number, fallbackStr?: string): string => {
    if (hours && hours > 0) {
      if (hours < 24) return `${hours}h`;
      if (hours === 24) return '24h';
      return `${hours}h`;
    }
    if (!fallbackStr) return '4h';
    if (fallbackStr.includes('immediate') || fallbackStr.includes('Immediate')) return '1h';
    if (fallbackStr.includes('2-4')) return '4h';
    if (fallbackStr.includes('6-8')) return '6h';
    if (fallbackStr.includes('24 hours')) return '24h';
    if (fallbackStr.includes('48-72')) return '48h';
    if (fallbackStr.includes('3-5')) return '72h';
    if (fallbackStr.includes('5-7')) return '120h';
    return fallbackStr;
  };

  // HMO coverage formatter
  const formatHmoCoverage = (hmos?: string[]): string => {
    if (!hmos || hmos.length === 0) return 'Self-pay only';
    const totalKnown = NIGERIAN_HMOS.length;
    if (hmos.length === totalKnown) return `All ${totalKnown} HMOs`;
    if (hmos.length === totalKnown - 1) {
      const missing = NIGERIAN_HMOS.find(h => !hmos.includes(h));
      return `All except ${missing?.replace(' HMO', '')}`;
    }
    if (hmos.length >= 4) {
      return `${hmos.length} HMOs accepted`;
    }
    return hmos.map(h => h.replace(' HMO', '')).join(', ');
  };

  // Clinical Sample/Method helper
  const isImagingOrCardio = (dept: string): boolean => {
    return [
      'Diagnostic Ultrasound',
      'Diagnostic Radiology',
      'Cardiology (Non-Invasive)'
    ].includes(dept);
  };

  // Toggle publish state directly
  const handleTogglePublish = async (item: ProviderCatalogueItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
        if (selectedItem && selectedItem.id === item.id) {
          setSelectedItem(prev => prev ? { ...prev, isPublished: nextState } : null);
          setDrawerIsPublished(nextState);
        }
        addNotification(
          nextState 
            ? `${item.serviceName} published live to directory.` 
            : `${item.serviceName} unpublished from live directory.`, 
          'success'
        );
      } else {
        throw new Error(data.error || 'Failed to update publication state');
      }
    } catch (err: any) {
      addNotification(err.message || 'Error updating publication status', 'error');
    }
  };

  // Save drawer edits
  const handleSaveDrawer = async () => {
    if (!selectedItem) return;
    const cleanNum = parseFloat(drawerPrice.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanNum) || cleanNum <= 0) {
      addNotification('Please enter a valid price greater than 0', 'error');
      return;
    }

    setDrawerSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/directory/catalogue', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider_id: selectedItem.providerId,
          master_service_id: selectedItem.masterServiceId,
          price: cleanNum,
          turnaround_time: `${drawerHours} hours`,
          turnaround_hours: drawerHours,
          hmo_accepted: drawerHMOs,
          is_published: drawerIsPublished,
          effective_date: drawerEffectiveDate,
          last_edited_by: drawerLastEditedBy
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCatalogue(prev => prev.map(c => c.id === selectedItem.id ? {
          ...c,
          price: cleanNum,
          turnaroundHours: drawerHours,
          turnaroundTime: `${drawerHours} hours`,
          hmoAccepted: drawerHMOs,
          isPublished: drawerIsPublished,
          effectiveDate: drawerEffectiveDate,
          lastEditedBy: drawerLastEditedBy
        } : c));

        setSelectedItem(prev => prev ? {
          ...prev,
          price: cleanNum,
          turnaroundHours: drawerHours,
          turnaroundTime: `${drawerHours} hours`,
          hmoAccepted: drawerHMOs,
          isPublished: drawerIsPublished,
          effectiveDate: drawerEffectiveDate,
          lastEditedBy: drawerLastEditedBy
        } : null);

        addNotification(`Updated fee schedule for ${selectedItem.serviceName} (₦${cleanNum.toLocaleString()})`, 'success');
      } else {
        throw new Error(data.error || 'Failed to save catalogue item');
      }
    } catch (err: any) {
      addNotification(err.message || 'Error saving changes', 'error');
    } finally {
      setDrawerSaving(false);
    }
  };

  // Delete catalogue item
  const handleDeleteItem = async (item: ProviderCatalogueItem) => {
    const hasInvoices = affectedOpenInvoices.length > 0;
    const promptMsg = hasInvoices 
      ? `Notice: There are ${affectedOpenInvoices.length} active open invoices referencing this service. Deleting removes it from future fee schedules, but existing issued invoices remain legally binding. Confirm removal of "${item.serviceName}"?`
      : `Remove "${item.serviceName}" from ${currentProvider?.name || 'facility'}'s catalogue?`;

    if (!window.confirm(promptMsg)) {
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
        setSelectedItem(null);
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
      addNotification('Please select a standardised service from the master directory', 'error');
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
          turnaround_time: `${modalHours} hours`,
          turnaround_hours: modalHours,
          hmo_accepted: modalHMOs,
          is_published: modalIsPublished,
          effective_date: '1 Jan 2026',
          last_edited_by: 'Dr. K. Balogun · Revenue Cycle Lead'
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

  return (
    <div className="space-y-4">
      {/* 1. Header & Metric Strip */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Service catalogue & tariffs
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Standardised clinical investigations, provider fee schedules, turnaround times, and payer coverage.
            </p>
            {/* Single-line metric strip */}
            <div className="flex items-center flex-wrap gap-2 text-xs text-slate-600 mt-2 font-medium">
              <span className="font-semibold text-slate-900">{metrics.totalOffered} services</span>
              <span className="text-slate-300">·</span>
              <span>{metrics.coveredDepts} of 10 departments</span>
              <span className="text-slate-300">·</span>
              <span>{metrics.allHMOs} HMOs accepted</span>
              <span className="text-slate-300">·</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-semibold">
                {metrics.totalPublished} live ({metrics.totalOffered > 0 ? Math.round((metrics.totalPublished / metrics.totalOffered) * 100) : 0}%)
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={handlePublishAll}
              disabled={metrics.draftCount === 0}
              title={metrics.draftCount === 0 ? 'All services in catalogue are already published live' : 'Publish all draft tariffs live'}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shadow-2xs transition-colors ${
                metrics.draftCount === 0
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-white border border-slate-300 hover:border-slate-400 text-slate-700 cursor-pointer hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${metrics.draftCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Publish all</span>
            </button>

            <button
              onClick={() => {
                setSelectedMasterService(null);
                setModalPrice('');
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#12244D] hover:bg-[#0A152E] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add service</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Merged Single-Row Toolbar & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by test name, code e.g. LAB-HEM-FBC, or department..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12244D]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Select Dropdown */}
          <div className="w-full md:w-64">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12244D] cursor-pointer"
            >
              <option value="all">All departments ({catalogue.length})</option>
              {departments.map(dept => {
                const countInDept = catalogue.filter(c => c.department === dept).length;
                return (
                  <option key={dept} value={dept}>
                    {dept} ({countInDept})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex-shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-[#12244D] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({catalogue.length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                statusFilter === 'published'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Published ({metrics.totalPublished})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                statusFilter === 'draft'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Drafts ({metrics.draftCount})
            </button>
          </div>
        </div>
      </div>

      {/* 3. Catalogue Table with Sticky Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {catalogueLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-brand-navy" />
            <span>Loading tariff catalogue...</span>
          </div>
        ) : filteredCatalogue.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">No services match current filters</div>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {catalogue.length === 0 
                ? `${currentProvider?.name || 'Provider'} has no services registered yet. Click "Add service" to begin.`
                : 'Try adjusting your search query or department filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[620px] scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-36 whitespace-nowrap">Code</th>
                  <th className="py-3 px-4 min-w-[220px]">Standard service & sample</th>
                  <th className="py-3 px-4 whitespace-nowrap">Department</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Tariff (₦)</th>
                  <th className="py-3 px-4 whitespace-nowrap">Turnaround</th>
                  <th className="py-3 px-4 whitespace-nowrap">Accepted HMOs</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCatalogue.map(item => {
                  const isSelected = selectedItem?.id === item.id;
                  const nonLab = isImagingOrCardio(item.department);

                  return (
                    <tr 
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Code Column (Dedicated & Monospace) */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-800 text-xs">
                        <span className="bg-slate-100 border border-slate-200/80 px-2 py-1 rounded text-slate-700">
                          {item.serviceCode}
                        </span>
                      </td>

                      {/* Standard Service & Sample/Method */}
                      <td className="py-3.5 px-4 min-w-[220px]">
                        <div className="font-semibold text-slate-900 text-xs">
                          {item.serviceName}
                        </div>
                        {!nonLab && item.specimenType && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Sample: {item.specimenType}
                          </div>
                        )}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {item.department}
                        </span>
                      </td>

                      {/* Provider Tariff (₦) */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-xs whitespace-nowrap tabular-nums">
                        ₦{Number(item.price).toLocaleString()}
                      </td>

                      {/* Turnaround Time (Hours) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 text-slate-700 text-xs font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatTurnaround(item.turnaroundHours, item.turnaroundTime)}</span>
                        </div>
                      </td>

                      {/* Accepted HMOs */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs text-slate-700 font-medium">
                          {formatHmoCoverage(item.hmoAccepted)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
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
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="p-1 rounded text-slate-500 hover:text-[#12244D] hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Configure fee schedule and turnaround"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => handleTogglePublish(item, e)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                              item.isPublished
                                ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {item.isPublished ? 'Unpublish' : 'Publish'}
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

      {/* 4. Slide-Out Detail Drawer */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-2xs transition-opacity animate-in fade-in"
            onClick={() => setSelectedItem(null)}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/70">
              <div className="pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                    {selectedItem.serviceCode}
                  </span>
                  <span className="text-[11px] font-medium bg-blue-50 text-brand-navy px-2 py-0.5 rounded border border-blue-200/60">
                    {selectedItem.department}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  {selectedItem.serviceName}
                </h2>
                <div className="text-xs text-slate-500 mt-1">
                  {currentProvider?.name || 'Lagoon Specialist Hospital'} · Fee schedule & turnaround
                </div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
              {/* Clinical Spec / Method */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="font-semibold text-slate-800 mb-1">Clinical details</div>
                {isImagingOrCardio(selectedItem.department) ? (
                  <div className="text-slate-600">
                    Modality: Non-invasive diagnostic imaging / physiological recording.
                  </div>
                ) : (
                  <div className="text-slate-600">
                    Sample or method: <span className="font-medium text-slate-800">{selectedItem.specimenType || 'Standard clinical sample'}</span>
                  </div>
                )}
              </div>

              {/* Editable Tariff Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Hospital tariff (₦)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-xs">₦</span>
                  <input
                    type="text"
                    value={drawerPrice}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setDrawerPrice(val ? Number(val).toLocaleString() : '');
                    }}
                    placeholder="12,000"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#12244D]"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Applicable baseline fee for insured and self-pay claims before copay rules.
                </p>
              </div>

              {/* Editable Turnaround Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Target turnaround time
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {TURNAROUND_PRESETS.map(preset => (
                    <button
                      key={preset.hours}
                      type="button"
                      onClick={() => setDrawerHours(preset.hours)}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                        drawerHours === preset.hours
                          ? 'bg-[#12244D] text-white border-[#12244D]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Custom hours:</span>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={drawerHours}
                    onChange={(e) => setDrawerHours(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-[#12244D]"
                  />
                  <span className="text-xs text-slate-500">
                    hours ({drawerHours < 24 ? 'same day' : `${Math.round(drawerHours / 24)} days`})
                  </span>
                </div>
              </div>

              {/* Accepted HMOs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    Accepted HMO networks ({drawerHMOs.length} of {NIGERIAN_HMOS.length})
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDrawerHMOs([...NIGERIAN_HMOS])}
                      className="text-brand-navy hover:underline cursor-pointer"
                    >
                      Select all
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setDrawerHMOs([])}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {NIGERIAN_HMOS.map(hmo => {
                    const isChecked = drawerHMOs.includes(hmo);
                    return (
                      <label 
                        key={hmo}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                          isChecked 
                            ? 'bg-blue-50/60 border-blue-200 text-[#12244D] font-medium' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDrawerHMOs(prev => [...prev, hmo]);
                            } else {
                              setDrawerHMOs(prev => prev.filter(h => h !== hmo));
                            }
                          }}
                          className="rounded text-[#12244D] focus:ring-0 cursor-pointer"
                        />
                        <span>{hmo}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Publication Status Toggle */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Publication status</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {drawerIsPublished 
                        ? 'Live in cost estimator & claim engine' 
                        : 'Draft (hidden from public estimates)'}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={drawerIsPublished}
                      onChange={(e) => setDrawerIsPublished(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>
              </div>

              {/* Governance & Audit Details */}
              <div className="space-y-2 text-xs border-t border-slate-100 pt-4">
                <div className="font-semibold text-slate-800">Governance & audit</div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Effective date</span>
                  </span>
                  <input
                    type="text"
                    value={drawerEffectiveDate}
                    onChange={(e) => setDrawerEffectiveDate(e.target.value)}
                    className="text-right font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#12244D] focus:outline-none px-1"
                  />
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1 text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    <span>Last edited by</span>
                  </span>
                  <input
                    type="text"
                    value={drawerLastEditedBy}
                    onChange={(e) => setDrawerLastEditedBy(e.target.value)}
                    className="text-right font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#12244D] focus:outline-none px-1 max-w-[240px]"
                  />
                </div>
              </div>

              {/* Open Invoices Safety Check */}
              <div className="border-t border-slate-100 pt-4">
                {affectedOpenInvoices.length > 0 ? (
                  <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200/80 text-xs">
                    <div className="flex items-start gap-2 text-amber-900 font-semibold mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>Open invoice notice ({affectedOpenInvoices.length} active invoices)</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed mb-2">
                      Unpublishing or deleting this service stops new quotes and claims. Existing open invoices remain legally valid at the issued tariff of ₦{Number(selectedItem.price).toLocaleString()}.
                    </p>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {affectedOpenInvoices.map(inv => (
                        <div key={inv.id || inv.invoiceNumber} className="flex items-center justify-between bg-white/80 p-1.5 rounded border border-amber-200/50 text-[10px]">
                          <span className="font-mono font-bold text-slate-800">
                            #{inv.invoiceNumber || inv.id} · {inv.patientName || 'Patient'}
                          </span>
                          <span className="font-semibold text-amber-900">
                            ₦{Number(inv.totalAmount || inv.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>No open invoices currently referencing this service code.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleDeleteItem(selectedItem)}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                title="Remove from facility catalogue"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDrawer}
                  disabled={drawerSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#12244D] hover:bg-[#0A152E] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:bg-slate-300"
                >
                  {drawerSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Service From Master Directory Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-navy">
                  Standard master directory
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  Add standardised diagnostic service
                </h2>
                <p className="text-xs text-slate-500">
                  Select a clinical test to configure fee schedules, turnaround, and accepted HMO networks.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 flex-1 overflow-hidden">
              {/* Left Column: Master Directory Browser */}
              <div className="p-4 flex flex-col space-y-3 overflow-hidden">
                <div className="text-xs font-semibold text-slate-800">
                  1. Select master test ({masterServices.length})
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
                    <option value="all">All 10 departments</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Service List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[340px] scrollbar-thin">
                  {masterServices
                    .filter(s => {
                      if (modalDepartment !== 'all' && s.department !== modalDepartment) return false;
                      if (modalSearchQuery.trim()) {
                        const q = modalSearchQuery.toLowerCase();
                        return s.serviceName.toLowerCase().includes(q) || s.serviceCode.toLowerCase().includes(q) || s.department.toLowerCase().includes(q);
                      }
                      return true;
                    })
                    .map(service => {
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
              <form onSubmit={handleAddServiceSubmit} className="p-4 flex flex-col justify-between overflow-y-auto max-h-[500px] scrollbar-thin">
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-slate-800">
                    2. Provider tariff & terms
                  </div>

                  {selectedMasterService ? (
                    <div className="p-3 bg-blue-50/40 border border-blue-200/60 rounded-lg space-y-1.5 text-xs">
                      <div className="font-bold text-slate-900">
                        {selectedMasterService.serviceName}
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        {selectedMasterService.description}
                      </div>
                      {!isImagingOrCardio(selectedMasterService.department) && selectedMasterService.specimenType && (
                        <div className="text-slate-500 text-[11px]">
                          <span className="font-medium text-slate-700">Sample:</span> {selectedMasterService.specimenType}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed border-slate-300 rounded-lg text-center text-slate-400 text-xs">
                      ← Select a standardised test from the master directory on the left
                    </div>
                  )}

                  {/* Price */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Our tariff price (₦) *
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
                      Turnaround time (hours)
                    </label>
                    <select
                      value={modalHours}
                      onChange={(e) => setModalHours(parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#12244D] cursor-pointer"
                    >
                      {TURNAROUND_PRESETS.map(p => (
                        <option key={p.hours} value={p.hours}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* HMOs Accepted */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Accepted HMO partners
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
                        <span>Add to catalogue</span>
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
