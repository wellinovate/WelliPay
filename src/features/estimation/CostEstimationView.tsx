import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Layers, 
  ExternalLink, 
  FileText, 
  Sparkles, 
  X, 
  Filter, 
  Check, 
  Share2, 
  Copy,
  ChevronRight,
  FlaskConical
} from 'lucide-react';
import { useWelliPay } from '../../context/WelliPayContext';
import { MasterService, ProviderAccount, CostEstimate } from '../../types';
import { getCostEstimate, EstimateError } from '../../services/estimationService';

export const CostEstimationView: React.FC = () => {
  const { addNotification, setActiveTab } = useWelliPay();

  const [providers, setProviders] = useState<ProviderAccount[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('PRV-LAG-01');
  const [masterServices, setMasterServices] = useState<MasterService[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<MasterService | null>(null);

  // Estimate state
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState<boolean>(false);
  const [estimateError, setEstimateError] = useState<{ message: string; statusCode: number } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // 1. Initial Load of Providers and Master Diagnostic Directory
  useEffect(() => {
    async function loadData() {
      setInitialLoading(true);
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
          // Auto-select Full Blood Count if available for instant demonstration
          const fbc = masterData.services.find((s: MasterService) => s.serviceCode === 'LAB-HEM-FBC');
          if (fbc) {
            setSelectedService(fbc);
          }
        }
      } catch (err) {
        console.error('Failed to load estimation initial data:', err);
        addNotification('Failed to load diagnostic directory', 'error');
      } finally {
        setInitialLoading(false);
      }
    }

    loadData();
  }, []);

  // 2. Fetch Estimate whenever Provider or Selected Service changes
  useEffect(() => {
    if (!selectedProviderId || !selectedService) {
      setEstimate(null);
      setEstimateError(null);
      return;
    }

    let isMounted = true;
    async function fetchEstimate() {
      setEstimateLoading(true);
      setEstimateError(null);
      setEstimate(null);

      try {
        const result = await getCostEstimate(selectedProviderId, selectedService!.id);
        if (isMounted) {
          setEstimate(result);
        }
      } catch (err: any) {
        if (isMounted) {
          if (err instanceof EstimateError) {
            setEstimateError({ message: err.message, statusCode: err.statusCode });
          } else {
            setEstimateError({ message: err.message || 'Failed to retrieve cost estimate', statusCode: 500 });
          }
        }
      } finally {
        if (isMounted) {
          setEstimateLoading(false);
        }
      }
    }

    fetchEstimate();

    return () => {
      isMounted = false;
    };
  }, [selectedProviderId, selectedService]);

  // Current Provider Object
  const currentProvider = useMemo(() => {
    return providers.find(p => p.id === selectedProviderId) || null;
  }, [providers, selectedProviderId]);

  // Filtered Services List in picker
  const filteredServices = useMemo(() => {
    return masterServices.filter(s => {
      if (selectedDepartment !== 'all' && s.department !== selectedDepartment) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.serviceName.toLowerCase().includes(q);
        const matchCode = s.serviceCode.toLowerCase().includes(q);
        const matchDept = s.department.toLowerCase().includes(q);
        return matchName || matchCode || matchDept;
      }
      return true;
    });
  }, [masterServices, selectedDepartment, searchQuery]);

  const handleCopyQuote = () => {
    if (!estimate || !currentProvider) return;
    const text = `WelliPay Cost Estimate\nProvider: ${currentProvider.name}\nService: ${estimate.serviceName} (${estimate.serviceCode})\nPrice: ₦${estimate.price.toLocaleString()}\nTurnaround Time: ${estimate.turnaroundTime}\nAccepted Payers: ${estimate.hmoAccepted.join(', ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification('Cost estimate quotation copied to clipboard', 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Executive Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-teal-50 text-[#0B6B69] border border-teal-200 uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#0B6B69]" />
                Phase 1 · Base Pricing Engine
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Standardized master directory tariffs
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Diagnostic Cost Estimation
            </h1>
            <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
              Authoritative real-time tariff and turn-around lookup across canonical hospitals and diagnostic laboratories. Foundation for automated HMO benefit and copay verification.
            </p>
          </div>

          {/* Provider Selector Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 shadow-2xs">
              <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
                  Target Provider
                </span>
                <select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer pr-4 mt-0.5"
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
              onClick={() => setActiveTab('catalogue')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Open full catalogue to edit tariffs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Manage Tariffs</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Workflow: Service Picker (Left) + Live Estimate Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Standard Service Directory Picker (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[650px] overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Standardized Services</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {filteredServices.length} available
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mb-2.5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search investigation, code, or panel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-navy"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <button
                onClick={() => setSelectedDepartment('all')}
                className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  selectedDepartment === 'all'
                    ? 'bg-[#12244D] text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Departments
              </button>
              {departments.map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors cursor-pointer ${
                    selectedDepartment === dept
                      ? 'bg-[#12244D] text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Service List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
            {initialLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Loading standardized diagnostic directory...
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No matching diagnostic investigations found.
              </div>
            ) : (
              filteredServices.map(service => {
                const isSelected = selectedService?.id === service.id;
                return (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/70 border border-blue-200 shadow-2xs'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {service.serviceCode}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium truncate">
                            {service.department}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">
                          {service.serviceName}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {service.description}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-2 ${isSelected ? 'text-brand-navy' : 'text-slate-300'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Live Price & Coverage Estimate Card (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col p-6 min-h-[650px]">
          {estimateLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-8 h-8 border-2 border-brand-navy border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                Querying provider tariff schedule...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Matching {selectedService?.serviceCode} against {currentProvider?.name}
              </p>
            </div>
          ) : estimateError ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
              {estimateError.statusCode === 409 ? (
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
              )}

              <h3 className="text-base font-bold text-slate-900">
                {estimateError.statusCode === 409
                  ? 'Draft Tariff (Unpublished)'
                  : 'Service Not Priced by Provider'}
              </h3>
              
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {estimateError.message}
              </p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('catalogue')}
                  className="px-4 py-2 rounded-lg bg-[#12244D] text-white text-xs font-semibold hover:bg-[#0A152E] transition-colors cursor-pointer"
                >
                  Configure in Catalogue
                </button>
                <button
                  onClick={() => {
                    const fallback = masterServices.find(s => s.serviceCode === 'LAB-HEM-FBC');
                    if (fallback) setSelectedService(fallback);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Pick standard test
                </button>
              </div>
            </div>
          ) : estimate && selectedService ? (
            <div className="flex-1 flex flex-col justify-between space-y-6">
              <div>
                {/* Result Top Badge Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Live Published Tariff
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {currentProvider?.id} · {estimate.serviceCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyQuote}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      title="Copy quote summary"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Quote</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Main Tariff Highlight Box */}
                <div className="mt-5 p-5 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/80">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Standard Tariff Rate
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-extrabold font-mono text-[#12244D] tracking-tight">
                      ₦{estimate.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500">
                      per investigation
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-2 font-medium">
                    Applicable for both direct self-pay settlement and gross HMO claims submission.
                  </div>
                </div>

                {/* Service Metadata Details */}
                <div className="mt-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">
                      {estimate.serviceName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {selectedService.description}
                    </p>
                  </div>

                  {/* Grid attributes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase mb-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Turnaround</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {estimate.turnaroundTime || 'Same day'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase mb-1">
                        <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
                        <span>Specimen</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate" title={selectedService.specimenType}>
                        {selectedService.specimenType || 'Clinical Sample'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase mb-1">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span>Department</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {estimate.department}
                      </div>
                    </div>
                  </div>

                  {/* Accepted HMO Coverage Section */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Accepted Payer Coverage ({estimate.hmoAccepted.length})</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Pre-cleared provider network
                      </span>
                    </div>

                    {estimate.hmoAccepted.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {estimate.hmoAccepted.map(hmo => (
                          <div
                            key={hmo}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{hmo}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">
                        No HMO networks linked. This tariff is self-pay only.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Phase 2 Teaser Banner */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/70 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-brand-navy flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-slate-900">Ready for Phase 2 (Benefit Check):</span>{' '}
                  <span className="text-slate-600">
                    This price-lookup engine automatically supplies the verified ₦{estimate.price.toLocaleString()} base tariff. Next, the Benefit Check layer applies enrollee policy rules, pre-auth thresholds, and copay math with zero code duplication.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400">
              <Layers className="w-10 h-10 mb-2 opacity-40 text-slate-500" />
              <p className="text-sm font-semibold text-slate-600">Select an investigation to view cost estimate</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Choose any standardized laboratory or diagnostic procedure on the left to see published tariffs, turnaround times, and accepted HMO networks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostEstimationView;
