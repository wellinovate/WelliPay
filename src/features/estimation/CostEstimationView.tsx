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
  FlaskConical,
  UserCheck,
  Calculator,
  Shield,
  CreditCard,
  Ban,
  ArrowRight
} from 'lucide-react';
import { useWelliPay } from '../../context/WelliPayContext';
import { MasterService, ProviderAccount, CostEstimate, PayerPlanRule, BenefitCheckResult, Patient } from '../../types';
import { getCostEstimate, getPayerPlans, checkBenefitCoverage, EstimateError } from '../../services/estimationService';

export const CostEstimationView: React.FC = () => {
  const { addNotification, setActiveTab } = useWelliPay();

  // Mode: Phase 1 (Standard Estimation) vs Phase 2 (HMO Benefit Check)
  const [activeMode, setActiveMode] = useState<'estimate' | 'benefit_check'>('benefit_check');

  const [providers, setProviders] = useState<ProviderAccount[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('PRV-LAG-01');
  const [masterServices, setMasterServices] = useState<MasterService[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<MasterService | null>(null);

  // Phase 1: Estimate state
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState<boolean>(false);
  const [estimateError, setEstimateError] = useState<{ message: string; statusCode: number } | null>(null);

  // Phase 2: Benefit Check state
  const [payerPlans, setPayerPlans] = useState<PayerPlanRule[]>([]);
  const [selectedPayer, setSelectedPayer] = useState<string>('Reliance HMO');
  const [selectedPlan, setSelectedPlan] = useState<string>('Silver Plan');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [benefitResult, setBenefitResult] = useState<BenefitCheckResult | null>(null);
  const [benefitLoading, setBenefitLoading] = useState<boolean>(false);
  const [benefitError, setBenefitError] = useState<string | null>(null);

  const [copied, setCopied] = useState<boolean>(false);

  // 1. Initial Load of Providers, Master Directory, Payer Plans & Patients
  useEffect(() => {
    async function loadData() {
      setInitialLoading(true);
      try {
        const [provRes, masterRes, plansData, patientsRes] = await Promise.all([
          fetch('/api/directory/providers').then(r => r.json()),
          fetch('/api/directory/master?provider_type=laboratory').then(r => r.json()),
          getPayerPlans().catch(() => []),
          fetch('/api/patients').then(r => r.json()).catch(() => ({ patients: [] }))
        ]);

        if (provRes.success && provRes.providers) {
          setProviders(provRes.providers);
          if (provRes.providers.length > 0 && !selectedProviderId) {
            setSelectedProviderId(provRes.providers[0].id);
          }
        }

        if (masterRes.success && masterRes.services) {
          setMasterServices(masterRes.services);
          setDepartments(masterRes.departments || []);
          // Auto-select Full Blood Count if available
          const fbc = masterRes.services.find((s: MasterService) => s.serviceCode === 'LAB-HEM-FBC');
          if (fbc) {
            setSelectedService(fbc);
          }
        }

        if (Array.isArray(plansData) && plansData.length > 0) {
          setPayerPlans(plansData);
        }

        if (patientsRes && Array.isArray(patientsRes.patients)) {
          setPatients(patientsRes.patients);
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

  // 2. Fetch Phase 1 Estimate whenever Provider or Selected Service changes
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

  // 3. Fetch Phase 2 Benefit Check whenever inputs change
  useEffect(() => {
    if (activeMode !== 'benefit_check' || !selectedProviderId || !selectedService || !selectedPayer || !selectedPlan) {
      setBenefitResult(null);
      setBenefitError(null);
      return;
    }

    let isMounted = true;
    async function runBenefitCheck() {
      setBenefitLoading(true);
      setBenefitError(null);
      setBenefitResult(null);

      try {
        const result = await checkBenefitCoverage({
          providerId: selectedProviderId,
          masterServiceId: selectedService!.id,
          payerName: selectedPayer,
          planName: selectedPlan,
          patientId: selectedPatientId || undefined
        });

        if (isMounted) {
          setBenefitResult(result);
        }
      } catch (err: any) {
        if (isMounted) {
          setBenefitError(err.message || 'Benefit check failed');
        }
      } finally {
        if (isMounted) {
          setBenefitLoading(false);
        }
      }
    }

    runBenefitCheck();

    return () => {
      isMounted = false;
    };
  }, [activeMode, selectedProviderId, selectedService, selectedPayer, selectedPlan, selectedPatientId]);

  // Handle patient selection (auto-populate HMO & Plan)
  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    if (!patientId) return;

    const patient = patients.find(p => p.id === patientId);
    if (patient && patient.hmoName) {
      setSelectedPayer(patient.hmoName);
      // Derive plan name from coverage string e.g. "Reliance HMO (Silver Plan)"
      const match = patient.primaryCoverage.match(/\((.*?)\)/);
      if (match && match[1]) {
        setSelectedPlan(match[1]);
      } else {
        // Fallback to first available plan for that payer
        const firstPlan = payerPlans.find(p => p.payerName.toLowerCase() === patient.hmoName?.toLowerCase());
        if (firstPlan) setSelectedPlan(firstPlan.planName);
      }
    }
  };

  // Available plans for currently selected payer
  const availablePlansForPayer = useMemo(() => {
    return payerPlans.filter(p => p.payerName.toLowerCase() === selectedPayer.toLowerCase());
  }, [payerPlans, selectedPayer]);

  // List of distinct payers
  const distinctPayers = useMemo(() => {
    const list = [...new Set(payerPlans.map(p => p.payerName))];
    return list.length > 0 ? list : ['Reliance HMO', 'AXA Mansard', 'Hygeia HMO', 'Leadway Health'];
  }, [payerPlans]);

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
    if (activeMode === 'benefit_check' && benefitResult && currentProvider) {
      const text = `WelliPay HMO Benefit Verification\nProvider: ${currentProvider.name}\nPayer: ${benefitResult.payerName} (${benefitResult.planName})\nService: ${benefitResult.serviceName} (${benefitResult.serviceCode})\nTariff: ₦${benefitResult.price.toLocaleString()}\nHMO Coverage (${100 - benefitResult.copayPercentage}%): ₦${benefitResult.hmoCoverageAmount.toLocaleString()}\nEnrollee Copay (${benefitResult.copayPercentage}%): ₦${benefitResult.patientCopayAmount.toLocaleString()}\nPre-Auth: ${benefitResult.preAuthRequired ? 'MANDATORY (threshold exceeded)' : 'Pre-cleared'}\nNote: ${benefitResult.note}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addNotification('Benefit verification quote copied to clipboard', 'success');
      return;
    }

    if (!estimate || !currentProvider) return;
    const text = `WelliPay Cost Estimate\nProvider: ${currentProvider.name}\nService: ${estimate.serviceName} (${estimate.serviceCode})\nPrice: ₦${estimate.price.toLocaleString()}\nTurnaround Time: ${estimate.turnaroundTime}\nAccepted Payers: ${estimate.hmoAccepted.join(', ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification('Cost estimate quotation copied to clipboard', 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Executive Header & Mode Selector */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-teal-50 text-[#0B6B69] border border-teal-200 uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#0B6B69]" />
                Two-Clean-Systems Architecture
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Standardized master tariffs + Payer policy terms
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Tariff Estimation & HMO Benefit Check
            </h1>
            <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
              Authoritative real-time tariff estimation combined with automated enrollee policy verification, copay calculations, and pre-authorization validation.
            </p>
          </div>

          {/* Provider Selector Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 shadow-2xs">
              <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
                  Facility
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
              <span className="hidden sm:inline">Catalogue</span>
            </button>
          </div>
        </div>

        {/* Feature Mode Toggle Bar */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={() => setActiveMode('benefit_check')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'benefit_check'
                ? 'bg-[#12244D] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>HMO Benefit Check & Copay (Phase 2)</span>
          </button>

          <button
            onClick={() => setActiveMode('estimate')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'estimate'
                ? 'bg-[#12244D] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4 text-teal-400" />
            <span>Standard Tariff Estimation (Phase 1)</span>
          </button>
        </div>
      </div>

      {/* 2. Main Two-Column Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Standard Service Directory Picker (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[700px] overflow-hidden">
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
                All
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

        {/* Right Column: Display Area (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col p-6 min-h-[700px]">
          
          {/* ============================================================== */}
          {/* PHASE 2: HMO BENEFIT CHECK & COPAY VIEW                        */}
          {/* ============================================================== */}
          {activeMode === 'benefit_check' ? (
            <div className="flex-1 flex flex-col justify-between space-y-5">
              <div>
                {/* Enrollee & Payer Configuration Box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/70">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Shield className="w-4 h-4 text-brand-navy" />
                      <span>Enrollee Coverage & Policy Terms</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      payer_plan_rules
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Patient Quick Selector */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Select Patient (Optional)
                      </label>
                      <select
                        value={selectedPatientId}
                        onChange={(e) => handleSelectPatient(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-navy cursor-pointer"
                      >
                        <option value="">-- Manual Enrollee --</option>
                        {patients.filter(p => p.hmoName).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} ({p.hmoName})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* HMO Payer Selector */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        HMO Payer
                      </label>
                      <select
                        value={selectedPayer}
                        onChange={(e) => {
                          const newPayer = e.target.value;
                          setSelectedPayer(newPayer);
                          const firstPlan = payerPlans.find(p => p.payerName.toLowerCase() === newPayer.toLowerCase());
                          if (firstPlan) setSelectedPlan(firstPlan.planName);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-navy cursor-pointer"
                      >
                        {distinctPayers.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    {/* Policy Plan Selector */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Policy Tier / Plan
                      </label>
                      <select
                        value={selectedPlan}
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-navy cursor-pointer"
                      >
                        {availablePlansForPayer.map(plan => (
                          <option key={plan.id} value={plan.planName}>
                            {plan.planName} ({plan.copayPercentage}% copay)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Live Benefit Result Presentation */}
                {benefitLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-8 h-8 border-2 border-brand-navy border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm font-semibold text-slate-700">Verifying enrollee benefits & policy terms...</p>
                    <p className="text-xs text-slate-400 mt-1">Cross-referencing {selectedService?.serviceCode} against {selectedPayer} {selectedPlan}</p>
                  </div>
                ) : benefitError ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-3">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Benefit Verification Error</h3>
                    <p className="text-xs text-slate-500 mt-2 max-w-md">{benefitError}</p>
                  </div>
                ) : benefitResult ? (
                  <div className="mt-5 space-y-5">
                    {/* Status Strip & Copy Action */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        {benefitResult.status === 'covered' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Covered In-Network Benefit
                          </span>
                        )}
                        {benefitResult.status === 'out_of_network' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1.5">
                            <Ban className="w-3.5 h-3.5 text-slate-500" />
                            Out of Network Provider
                          </span>
                        )}
                        {benefitResult.status === 'excluded' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            Policy Exclusion (Not Covered)
                          </span>
                        )}

                        <span className="text-xs text-slate-400 font-mono">
                          {benefitResult.payerName} · {benefitResult.planName}
                        </span>
                      </div>

                      <button
                        onClick={handleCopyQuote}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy Billing Note</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Main Financial Split Card */}
                    <div className="p-5 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/90">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Enrollee Copay */}
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                            Enrollee Copay Due Today
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-extrabold font-mono text-[#12244D] tracking-tight">
                              ₦{benefitResult.patientCopayAmount.toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                              {benefitResult.copayPercentage}% Out-of-Pocket
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 font-medium">
                            Collect at cashier desk before service dispensation.
                          </div>
                        </div>

                        {/* HMO Covered Receivable */}
                        <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                            HMO Coverage Receivable
                          </div>
                          <div className="text-2xl font-bold font-mono text-emerald-700">
                            ₦{benefitResult.hmoCoverageAmount.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Gross Tariff: ₦{benefitResult.price.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Visual Copay vs HMO Split Progress Bar */}
                      <div className="mt-4 pt-3 border-t border-slate-200/80">
                        <div className="flex justify-between text-[11px] font-bold mb-1.5">
                          <span className="text-emerald-800">
                            HMO Pays: ₦{benefitResult.hmoCoverageAmount.toLocaleString()} ({100 - benefitResult.copayPercentage}%)
                          </span>
                          <span className="text-brand-navy">
                            Patient Pays: ₦{benefitResult.patientCopayAmount.toLocaleString()} ({benefitResult.copayPercentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-200 flex overflow-hidden">
                          <div 
                            className="bg-emerald-600 h-full transition-all duration-500" 
                            style={{ width: `${100 - benefitResult.copayPercentage}%` }} 
                            title={`HMO Covered: ${100 - benefitResult.copayPercentage}%`}
                          />
                          <div 
                            className="bg-[#12244D] h-full transition-all duration-500" 
                            style={{ width: `${benefitResult.copayPercentage}%` }} 
                            title={`Patient Copay: ${benefitResult.copayPercentage}%`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pre-Authorization Alert Box */}
                    {benefitResult.preAuthRequired ? (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-bold text-amber-900">Pre-Authorization Code Mandatory:</span>{' '}
                          <span className="text-amber-800 leading-relaxed">
                            {benefitResult.note}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-bold text-emerald-900">Pre-Authorization Not Required:</span>{' '}
                          <span className="text-emerald-800 leading-relaxed">
                            {benefitResult.note}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Diagnostic Investigation Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold uppercase mb-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Turnaround</span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">
                          {benefitResult.turnaroundTime || 'Same day'}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold uppercase mb-0.5">
                          <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
                          <span>Specimen</span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {selectedService?.specimenType || 'Clinical Sample'}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold uppercase mb-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                          <span>Pre-Auth Threshold</span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">
                          {benefitResult.preAuthThreshold ? `₦${benefitResult.preAuthThreshold.toLocaleString()}` : 'No threshold'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Bottom Assurance Strip */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Two-Clean-Systems architecture verified: zero duplicated pricing logic.</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {selectedService?.serviceCode} · {currentProvider?.id}
                </span>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* PHASE 1: STANDARD TARIFF ESTIMATION VIEW                       */
            /* ============================================================== */
            <div className="flex-1 flex flex-col justify-between space-y-6">
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

                      <button
                        onClick={handleCopyQuote}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
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
                        Standard base tariff before enrollee plan rules or copay percentages are applied.
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

                  {/* Switch to Benefit Check Banner */}
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/70 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-brand-navy flex-shrink-0" />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900">Need enrollee copay math?</span>{' '}
                        <span className="text-slate-600">
                          Switch to HMO Benefit Check to calculate patient out-of-pocket copay and pre-auth requirements.
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveMode('benefit_check')}
                      className="px-3 py-1.5 rounded-lg bg-[#12244D] text-white text-xs font-bold hover:bg-[#0A152E] flex items-center gap-1 cursor-pointer flex-shrink-0"
                    >
                      <span>Check Benefits</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default CostEstimationView;
