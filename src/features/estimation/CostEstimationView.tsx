import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  FileText, 
  X, 
  Check, 
  Share2, 
  Copy, 
  FlaskConical, 
  UserCheck, 
  Calculator, 
  Trash2, 
  Plus
} from 'lucide-react';
import { useWelliPay } from '../../context/WelliPayContext';
import { auth } from '../../firebase';
import { MasterService, PayerPlanRule, Patient } from '../../types';
import { getPayerPlans } from '../../services/estimationService';

interface ServiceWithTariff extends MasterService {
  price?: number;
  turnaroundTime?: string;
  isPublished?: boolean;
  hmoAccepted?: string[];
  catalogueId?: number;
}

interface BasketItem {
  serviceId: number;
  serviceCode: string;
  serviceName: string;
  department: string;
  quantity: number;
  unitPrice: number;
  turnaroundTime?: string;
  specimenType?: string;
}

export const CostEstimationView: React.FC = () => {
  const { addNotification, setActiveTab } = useWelliPay();

  // Data states
  const [masterServices, setMasterServices] = useState<MasterService[]>([]);
  const [catalogueItems, setCatalogueItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [payerPlans, setPayerPlans] = useState<PayerPlanRule[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Running Basket
  const [basket, setBasket] = useState<BasketItem[]>([]);

  // Payer & Patient Selection (defaults to Self-pay)
  const [selectedPayer, setSelectedPayer] = useState<string>('Self-pay');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // UI state
  const [copied, setCopied] = useState<boolean>(false);
  const [creatingInvoice, setCreatingInvoice] = useState<boolean>(false);

  // 1. Initial Data Load
  useEffect(() => {
    async function loadData() {
      setInitialLoading(true);
      try {
        const patientAuthToken = await auth.currentUser?.getIdToken().catch(() => undefined);

        const [masterRes, catRes, plansData, patientsRes] = await Promise.all([
          fetch('/api/directory/master?provider_type=laboratory').then(r => r.json()),
          fetch('/api/directory/catalogue/PRV-LAG-01').then(r => r.json()).catch(() => ({ catalogue: [] })),
          getPayerPlans().catch(() => []),
          fetch('/api/patients', {
            headers: patientAuthToken ? { Authorization: `Bearer ${patientAuthToken}` } : {}
          }).then(r => r.json()).catch(() => ({ patients: [] }))
        ]);

        if (masterRes.success && masterRes.services) {
          setMasterServices(masterRes.services);
          setDepartments(masterRes.departments || []);
        }

        if (catRes.success && Array.isArray(catRes.catalogue)) {
          setCatalogueItems(catRes.catalogue);
        }

        if (Array.isArray(plansData) && plansData.length > 0) {
          setPayerPlans(plansData);
        }

        if (patientsRes && Array.isArray(patientsRes.patients)) {
          setPatients(patientsRes.patients);
        }
      } catch (err) {
        console.error('Failed to load estimator data:', err);
        addNotification('Failed to load diagnostic directory', 'error');
      } finally {
        setInitialLoading(false);
      }
    }

    loadData();
  }, []);

  // Map master services with live published tariffs from provider catalogue
  const directoryServices: ServiceWithTariff[] = useMemo(() => {
    const catMap = new Map<number, any>();
    catalogueItems.forEach(item => {
      if (item.masterServiceId) catMap.set(item.masterServiceId, item);
    });

    return masterServices.map(ms => {
      const cat = catMap.get(ms.id);
      return {
        ...ms,
        price: cat ? Number(cat.price) : undefined,
        turnaroundTime: cat ? cat.turnaroundTime : ms.benchmarkTurnaround,
        isPublished: cat ? cat.isPublished : false,
        hmoAccepted: cat ? cat.hmoAccepted : [],
        catalogueId: cat ? cat.id : undefined
      };
    });
  }, [masterServices, catalogueItems]);

  // Distinct Payers
  const distinctPayers = useMemo(() => {
    const fromPlans = [...new Set(payerPlans.map(p => p.payerName))];
    return fromPlans.length > 0 ? fromPlans : ['Reliance HMO', 'AXA Mansard', 'Hygeia HMO', 'Leadway Health', 'Avon HMO'];
  }, [payerPlans]);

  // Available plans for selected payer
  const availablePlansForPayer = useMemo(() => {
    if (selectedPayer === 'Self-pay') return [];
    return payerPlans.filter(p => p.payerName.toLowerCase() === selectedPayer.toLowerCase());
  }, [payerPlans, selectedPayer]);

  // When payer changes, default to first available plan if current plan is not in list
  useEffect(() => {
    if (selectedPayer !== 'Self-pay' && availablePlansForPayer.length > 0) {
      const currentValid = availablePlansForPayer.some(p => p.planName === selectedPlan);
      if (!currentValid) {
        setSelectedPlan(availablePlansForPayer[0].planName);
      }
    }
  }, [selectedPayer, availablePlansForPayer, selectedPlan]);

  // Selected Patient
  const selectedPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  // Patient selection handler
  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    if (!patientId) {
      setSelectedPayer('Self-pay');
      return;
    }

    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      if (patient.hmoName) {
        setSelectedPayer(patient.hmoName);
        // Extract plan from coverage description if available
        const match = patient.primaryCoverage.match(/\((.*?)\)/);
        if (match && match[1]) {
          setSelectedPlan(match[1]);
        } else {
          const firstPlan = payerPlans.find(p => p.payerName.toLowerCase() === patient.hmoName?.toLowerCase());
          if (firstPlan) setSelectedPlan(firstPlan.planName);
        }
      } else {
        setSelectedPayer('Self-pay');
      }
    }
  };

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return directoryServices.filter(s => {
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
  }, [directoryServices, selectedDepartment, searchQuery]);

  // Basket Handlers
  const addToBasket = (service: ServiceWithTariff) => {
    if (!service.price) return;
    setBasket(prev => {
      const existing = prev.find(item => item.serviceId === service.id);
      if (existing) {
        return prev.map(item => 
          item.serviceId === service.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          serviceId: service.id,
          serviceCode: service.serviceCode,
          serviceName: service.serviceName,
          department: service.department,
          quantity: 1,
          unitPrice: service.price!,
          turnaroundTime: service.turnaroundTime,
          specimenType: service.specimenType
        }
      ];
    });
  };

  const updateQuantity = (serviceId: number, delta: number) => {
    setBasket(prev => {
      return prev
        .map(item => {
          if (item.serviceId === serviceId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as BasketItem[];
    });
  };

  const removeFromBasket = (serviceId: number) => {
    setBasket(prev => prev.filter(item => item.serviceId !== serviceId));
  };

  const clearBasket = () => {
    setBasket([]);
  };

  // Active Policy Rule resolution for current Payer & Plan
  const activePlanRule = useMemo(() => {
    if (selectedPayer === 'Self-pay') return null;
    return payerPlans.find(
      p => p.payerName.toLowerCase() === selectedPayer.toLowerCase() &&
           p.planName.toLowerCase() === selectedPlan.toLowerCase()
    ) || null;
  }, [payerPlans, selectedPayer, selectedPlan]);

  // Calculations for each basket item
  const basketCalculations = useMemo(() => {
    return basket.map(item => {
      const lineTariff = item.unitPrice * item.quantity;

      if (selectedPayer === 'Self-pay') {
        return {
          ...item,
          status: 'covered' as const,
          copayPercentage: 100,
          patientCopay: lineTariff,
          hmoCoverage: 0,
          requiresPreAuth: false
        };
      }

      // HMO plan evaluation
      let isExcluded = false;
      if (activePlanRule) {
        if (activePlanRule.excludedServices && activePlanRule.excludedServices.includes(item.serviceName)) {
          isExcluded = true;
        } else if (
          activePlanRule.coveredCategories && 
          activePlanRule.coveredCategories.length > 0 && 
          !activePlanRule.coveredCategories.includes(item.department)
        ) {
          isExcluded = true;
        }
      }

      if (isExcluded) {
        return {
          ...item,
          status: 'excluded' as const,
          copayPercentage: 100,
          patientCopay: lineTariff,
          hmoCoverage: 0,
          requiresPreAuth: false
        };
      }

      const copayRate = activePlanRule ? Number(activePlanRule.copayPercentage) : 20;
      const patientCopay = Math.round(lineTariff * (copayRate / 100));
      const hmoCoverage = lineTariff - patientCopay;

      // Item pre-auth threshold check
      const threshold = activePlanRule?.preauthThreshold ? Number(activePlanRule.preauthThreshold) : null;
      const requiresPreAuth = threshold !== null && lineTariff >= threshold;

      return {
        ...item,
        status: 'covered' as const,
        copayPercentage: copayRate,
        patientCopay,
        hmoCoverage,
        requiresPreAuth
      };
    });
  }, [basket, selectedPayer, activePlanRule]);

  // Aggregate financial metrics
  const grossTotal = useMemo(() => {
    return basketCalculations.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0);
  }, [basketCalculations]);

  const hmoTotal = useMemo(() => {
    return basketCalculations.reduce((sum, it) => sum + it.hmoCoverage, 0);
  }, [basketCalculations]);

  const patientTotal = useMemo(() => {
    return basketCalculations.reduce((sum, it) => sum + it.patientCopay, 0);
  }, [basketCalculations]);

  const overallCopayPercentage = useMemo(() => {
    if (grossTotal === 0) return 0;
    return Math.round((patientTotal / grossTotal) * 100);
  }, [grossTotal, patientTotal]);

  // Pre-authorisation trigger:
  // Required if HMO plan AND (total gross exceeds ₦100,000 threshold or item exceeds policy limit)
  const hasPreAuthRequired = useMemo(() => {
    if (selectedPayer === 'Self-pay') return false;
    if (grossTotal > 100000) return true;
    return basketCalculations.some(it => it.requiresPreAuth);
  }, [selectedPayer, grossTotal, basketCalculations]);

  // Formatted summary text for WhatsApp and Clipboard
  const generateEstimateSummary = () => {
    const facilityName = 'Lagoon Specialist Hospital';
    const patientName = selectedPatient ? selectedPatient.fullName : 'Walk-in patient';
    const payerDisplay = selectedPayer === 'Self-pay' 
      ? 'Self-pay (Direct settlement)' 
      : `${selectedPayer}${selectedPlan ? ` · ${selectedPlan}` : ''}`;

    let msg = `*WelliPay Investigation Estimate*\n`;
    msg += `Facility: ${facilityName}\n`;
    msg += `Patient: ${patientName}${selectedPatient?.mrn ? ` (${selectedPatient.mrn})` : ''}\n`;
    msg += `Payment route: ${payerDisplay}\n\n`;
    msg += `*Requested Investigations:*\n`;
    
    basketCalculations.forEach((item, idx) => {
      const lineTotal = item.unitPrice * item.quantity;
      msg += `${idx + 1}. ${item.serviceName} (${item.serviceCode}) x${item.quantity} — ₦${lineTotal.toLocaleString()}\n`;
    });

    msg += `\n*Financial Summary:*\n`;
    msg += `• Gross tariff: ₦${grossTotal.toLocaleString()}\n`;
    if (selectedPayer !== 'Self-pay') {
      msg += `• HMO coverage: ₦${hmoTotal.toLocaleString()}\n`;
      msg += `• *Patient copay due: ₦${patientTotal.toLocaleString()}*\n`;
    } else {
      msg += `• *Total payable at desk: ₦${patientTotal.toLocaleString()}*\n`;
    }

    if (hasPreAuthRequired) {
      msg += `\n⚠️ *Note:* Pre-authorisation code is required before investigation dispensation.\n`;
    }

    msg += `\n_Generated via WelliPay Estimator_`;
    return msg;
  };

  // 1. Send on WhatsApp
  const handleSendWhatsApp = () => {
    if (basket.length === 0) return;
    const msg = generateEstimateSummary();
    let url = 'https://wa.me/';
    if (selectedPatient && selectedPatient.phone) {
      const cleanPhone = selectedPatient.phone.replace(/[^0-9]/g, '');
      url += `${cleanPhone}`;
    }
    url += `?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    addNotification('WhatsApp estimate link opened', 'success');
  };

  // 2. Copy Estimate
  const handleCopyEstimate = () => {
    if (basket.length === 0) return;
    const msg = generateEstimateSummary();
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification('Estimate summary copied to clipboard', 'success');
  };

  // 3. Create Invoice
  const handleCreateInvoice = async () => {
    if (basket.length === 0) return;
    setCreatingInvoice(true);
    try {
      const patientName = selectedPatient ? selectedPatient.fullName : 'Walk-in Patient';
      const patientMrn = selectedPatient ? selectedPatient.mrn : `MRN-LSH-${Math.floor(10060 + Math.random() * 30)}`;

      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      else headers['Authorization'] = 'Bearer dev-token';

      const payload = {
        patient_id: selectedPatient?.id,
        patient_name: patientName,
        patient_mrn: patientMrn,
        service_description: basket.map(i => i.serviceName).join(', '),
        total_amount: grossTotal,
        due_date: new Date().toISOString().split('T')[0],
        payer_type: selectedPayer === 'Self-pay' ? 'self-pay' : 'hmo',
        payer_name: selectedPayer === 'Self-pay' ? 'Patient Self-Pay' : selectedPayer,
        policy_number: selectedPatient?.hmoPolicyNumber || (selectedPayer !== 'Self-pay' ? 'POL-UNVERIFIED' : undefined),
        copay_amount: patientTotal,
        claim_amount: hmoTotal,
        pre_auth_code: hasPreAuthRequired ? 'PENDING-AUTH' : undefined,
        line_items: basket.map((it, idx) => ({
          id: `ITEM-${idx + 1}`,
          description: `${it.serviceName} (${it.serviceCode})`,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalAmount: it.unitPrice * it.quantity
        }))
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.error) {
        addNotification(data.error, 'error');
      } else {
        addNotification(`Invoice ${data.invoice?.invoice_number || ''} created from estimate`, 'success');
        setActiveTab('invoices');
      }
    } catch (err) {
      console.error('Failed to create invoice from estimate:', err);
      addNotification('Failed to create invoice from estimate', 'error');
    } finally {
      setCreatingInvoice(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Estimator
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Check service tariffs, calculate HMO copay and generate patient estimates.
        </p>
      </div>

      {/* 2. Main Two-Column Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Standardised Service Directory (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[740px] overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Standardised services</span>
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
                placeholder="Search service name, code, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-navy"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {initialLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Loading standardised diagnostic directory...
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No matching diagnostic investigations found.
              </div>
            ) : (
              filteredServices.map(service => {
                const inBasket = basket.find(b => b.serviceId === service.id);
                return (
                  <div
                    key={service.id}
                    className="p-3 rounded-lg border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-2xs transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {service.serviceCode}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">
                            {service.department}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {service.serviceName}
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          {service.turnaroundTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{service.turnaroundTime}</span>
                            </span>
                          )}
                          {service.specimenType && (
                            <span className="flex items-center gap-1 truncate" title={service.specimenType}>
                              <FlaskConical className="w-3 h-3 text-slate-400" />
                              <span>{service.specimenType}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between self-stretch gap-2 flex-shrink-0">
                        {service.price ? (
                          <span className="text-xs font-extrabold font-mono text-[#12244D]">
                            ₦{service.price.toLocaleString()}
                          </span>
                        ) : (
                          <span 
                            className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded whitespace-nowrap"
                            title="Untariffed at Lagoon Specialist Hospital. Set tariff in Service Catalogue."
                          >
                            Untariffed at facility
                          </span>
                        )}

                        {inBasket ? (
                          <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5 border border-slate-200">
                            <button
                              onClick={() => updateQuantity(service.id, -1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors text-xs font-bold cursor-pointer"
                              title="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="px-1.5 text-xs font-bold text-slate-800 font-mono">
                              {inBasket.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(service.id, 1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors text-xs font-bold cursor-pointer"
                              title="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={!service.price}
                            onClick={() => addToBasket(service)}
                            title={!service.price ? 'Untariffed at facility. Configure in Service Catalogue.' : 'Add to calculation basket'}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                              service.price
                                ? 'bg-[#12244D] hover:bg-[#0B6B69] text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Running Basket & Cost Estimate (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col p-5 min-h-[740px]">
          
          {/* Patient and Payer Controls */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/70">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <UserCheck className="w-4 h-4 text-brand-navy" />
                <span>Patient and payer coverage</span>
              </div>

              {/* Policy Status Badge */}
              {selectedPayer === 'Self-pay' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
                  Direct settlement
                </span>
              ) : selectedPatient && selectedPatient.hmoName?.toLowerCase() === selectedPayer.toLowerCase() ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active policy {selectedPatient.hmoPolicyNumber ? `· ${selectedPatient.hmoPolicyNumber}` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Unverified plan
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Patient Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Patient (optional)
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => handleSelectPatient(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-navy cursor-pointer"
                >
                  <option value="">Walk-in patient</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} {p.hmoName ? `(${p.hmoName})` : '(Self-pay)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payer Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Payer
                </label>
                <select
                  value={selectedPayer}
                  onChange={(e) => {
                    const newPayer = e.target.value;
                    setSelectedPayer(newPayer);
                    if (newPayer !== 'Self-pay') {
                      const firstPlan = payerPlans.find(p => p.payerName.toLowerCase() === newPayer.toLowerCase());
                      if (firstPlan) setSelectedPlan(firstPlan.planName);
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-navy cursor-pointer"
                >
                  <option value="Self-pay">Self-pay (Direct)</option>
                  {distinctPayers.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Plan Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Policy plan
                </label>
                {selectedPayer === 'Self-pay' ? (
                  <div className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 italic">
                    Not applicable (cash)
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          </div>

          {/* Running Basket View */}
          {basket.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Calculator className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No services added to estimate</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Select laboratory investigations or diagnostic procedures from the directory on the left to build a patient quote.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <div>
                {/* Basket Items List */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Selected items ({basket.length})
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Lagoon Specialist Hospital
                  </span>
                </div>

                <div className="overflow-y-auto max-h-[300px] divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {basketCalculations.map((item) => (
                    <div key={item.serviceId} className="p-3 flex items-center justify-between gap-3 bg-white">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-500">{item.serviceCode}</span>
                          <h5 className="text-xs font-bold text-slate-900 truncate">{item.serviceName}</h5>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          ₦{item.unitPrice.toLocaleString()} each · {item.department}
                        </div>
                        {selectedPayer !== 'Self-pay' && (
                          <div className="text-[10px] mt-1">
                            {item.status === 'excluded' ? (
                              <span className="text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                Policy exclusion (100% patient copay)
                              </span>
                            ) : (
                              <span className="text-slate-600">
                                HMO share: ₦{item.hmoCoverage.toLocaleString()} · Copay ({item.copayPercentage}%): ₦{item.patientCopay.toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1 bg-slate-50 rounded border border-slate-200 p-0.5">
                          <button
                            onClick={() => updateQuantity(item.serviceId, -1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded font-bold text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-1.5 text-xs font-mono font-bold text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.serviceId, 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded font-bold text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Line total */}
                        <div className="text-right min-w-[70px]">
                          <div className="text-xs font-mono font-extrabold text-[#12244D]">
                            ₦{(item.unitPrice * item.quantity).toLocaleString()}
                          </div>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeFromBasket(item.serviceId)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                          title="Remove from estimate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cumulative Financial Summary Box */}
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/90">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Patient share */}
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                        {selectedPayer === 'Self-pay' ? 'Total payable at desk' : 'Patient copay due today'}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold font-mono text-[#12244D] tracking-tight">
                          ₦{patientTotal.toLocaleString()}
                        </span>
                        {selectedPayer !== 'Self-pay' && (
                          <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                            {overallCopayPercentage}% patient share
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-medium">
                        {selectedPayer === 'Self-pay' 
                          ? 'Collect direct settlement before sample collection.'
                          : 'Collect out-of-pocket copay before investigation dispensation.'}
                      </div>
                    </div>

                    {/* HMO share (if HMO) */}
                    {selectedPayer !== 'Self-pay' && (
                      <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                          HMO liability claim
                        </div>
                        <div className="text-xl font-bold font-mono text-emerald-700">
                          ₦{hmoTotal.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Gross tariff: ₦{grossTotal.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Split bar when HMO */}
                  {selectedPayer !== 'Self-pay' && grossTotal > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80">
                      <div className="flex justify-between text-[11px] font-bold mb-1.5">
                        <span className="text-emerald-800">
                          HMO share: ₦{hmoTotal.toLocaleString()} ({100 - overallCopayPercentage}%)
                        </span>
                        <span className="text-brand-navy">
                          Patient copay: ₦{patientTotal.toLocaleString()} ({overallCopayPercentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 flex overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full transition-all duration-300" 
                          style={{ width: `${100 - overallCopayPercentage}%` }} 
                        />
                        <div 
                          className="bg-[#12244D] h-full transition-all duration-300" 
                          style={{ width: `${overallCopayPercentage}%` }} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pre-authorisation Alert Banner */}
                {hasPreAuthRequired && (
                  <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold text-amber-900">Pre-authorisation code mandatory:</span>{' '}
                      <span className="text-amber-800 leading-relaxed">
                        {grossTotal > 100000 
                          ? `Total estimate of ₦${grossTotal.toLocaleString()} exceeds the ₦100,000 threshold. Authorisation code required prior to service delivery.`
                          : 'One or more selected investigations exceed the plan pre-authorisation threshold. Authorisation code required.'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateInvoice}
                    disabled={creatingInvoice}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#12244D] hover:bg-[#0A152E] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{creatingInvoice ? 'Creating...' : 'Create invoice'}</span>
                  </button>

                  <button
                    onClick={handleSendWhatsApp}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Send estimate on WhatsApp</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyEstimate}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy estimate</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={clearBasket}
                    className="px-2.5 py-2 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                    title="Clear estimate"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostEstimationView;
