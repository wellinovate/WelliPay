import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useWelliPay } from '../../context/WelliPayContext';
import { Modal } from '../../components/ui/Modal';
import { 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  FileText, 
  CreditCard, 
  Clock, 
  User, 
  Share2, 
  RotateCcw, 
  Check, 
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { Patient, Invoice, ProviderTransaction } from '../../types';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Lagoon Specialist Hospital's own provider id in the directory — the only
// provider this front desk transacts against. Same id used by
// CostEstimationView and ServiceCatalogueView.
const HOSPITAL_PROVIDER_ID = 'PRV-LAG-01';

const CUSTOM_SERVICE_LABEL = 'Custom procedure / other clinical service...';

interface CatalogueServiceOption {
  name: string;
  tariff: number;
  turnaroundTime?: string;
  department?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose }) => {
  const { addProviderTransaction, voidProviderTransaction, providerTransactions, addNotification } = useWelliPay();

  // Registry data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [serviceCatalog, setServiceCatalog] = useState<CatalogueServiceOption[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [catalogueError, setCatalogueError] = useState(false);

  // Patient Search & Selection
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Form Fields
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<string>('none');
  const [selectedService, setSelectedService] = useState<string>('');
  const [customServiceName, setCustomServiceName] = useState<string>('');
  const [amountRaw, setAmountRaw] = useState<string>('');
  const [channel, setChannel] = useState<string>(''); // Required, no default!
  const [reference, setReference] = useState<string>('');
  const [paymentTime, setPaymentTime] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  const staffMember = 'Dr. Babatunde Fashola (Chief Medical Officer)';

  // Confirmation & Void Window State
  const [confirmedTxn, setConfirmedTxn] = useState<ProviderTransaction | null>(null);
  const [voidCountdown, setVoidCountdown] = useState<number>(10);
  const [isVoided, setIsVoided] = useState(false);
  const [receiptCopied, setReceiptCopied] = useState(false);

  // Auth Header Helper
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const { auth } = await import('../../firebase');
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
      }
    } catch (_) {}
    return { 'Content-Type': 'application/json' };
  }, []);

  // Fetch Patients and Invoices on Open
  useEffect(() => {
    if (!isOpen) return;

    // Reset state on modal open
    setSelectedPatient(null);
    setPatientSearch('');
    setSelectedInvoiceNumber('none');
    setSelectedService('');
    setCustomServiceName('');
    setAmountRaw('');
    setChannel('');
    setReference('');
    setPaymentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setConfirmedTxn(null);
    setIsVoided(false);
    setReceiptCopied(false);

    setCatalogueError(false);

    const loadData = async () => {
      try {
        setLoadingData(true);
        const headers = await getAuthHeaders();
        const [patientsRes, invoicesRes, catalogueRes] = await Promise.all([
          fetch('/api/patients', { headers }),
          fetch('/api/invoices', { headers }),
          fetch(`/api/directory/catalogue/${HOSPITAL_PROVIDER_ID}`)
        ]);

        if (patientsRes.ok) {
          const pData = await patientsRes.json();
          if (pData.patients) setPatients(pData.patients);
        }
        if (invoicesRes.ok) {
          const invData = await invoicesRes.json();
          if (invData.invoices) setInvoices(invData.invoices);
        }
        if (catalogueRes.ok) {
          const catData = await catalogueRes.json();
          if (catData.success && Array.isArray(catData.catalogue)) {
            // Only live, published tariffs — a draft tariff isn't chargeable yet
            // (matches the 409 the cost-estimate endpoint returns for drafts).
            const published = catData.catalogue
              .filter((c: any) => c.isPublished)
              .map((c: any) => ({
                name: c.serviceName,
                tariff: Number(c.price) || 0,
                turnaroundTime: c.turnaroundTime,
                department: c.department
              }));
            setServiceCatalog(published);
          } else {
            setCatalogueError(true);
          }
        } else {
          setCatalogueError(true);
        }
      } catch (err) {
        console.error('Error loading patient/invoice/catalogue data for payment modal:', err);
        setCatalogueError(true);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [isOpen, getAuthHeaders]);

  // Countdown timer for void window
  useEffect(() => {
    if (!confirmedTxn || isVoided) return;
    if (voidCountdown <= 0) return;

    const timer = setInterval(() => {
      setVoidCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [confirmedTxn, isVoided, voidCountdown]);

  // Filtered Patients for combobox
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 8);
    const q = patientSearch.toLowerCase();
    return patients.filter(p => 
      p.fullName.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.hmoPolicyNumber && p.hmoPolicyNumber.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [patients, patientSearch]);

  // Patient's Open Invoices
  const patientOpenInvoices = useMemo(() => {
    if (!selectedPatient) return [];
    return invoices.filter(inv => {
      const isMatch = inv.patient_id === selectedPatient.id || 
                      inv.patient_name === selectedPatient.fullName || 
                      inv.patientName === selectedPatient.fullName;
      const isUnsettled = inv.status !== 'paid' && inv.status !== 'reconciled';
      return isMatch && isUnsettled;
    });
  }, [invoices, selectedPatient]);

  // Selected Invoice Object
  const selectedInvoice = useMemo(() => {
    if (selectedInvoiceNumber === 'none') return null;
    return invoices.find(inv => inv.invoice_number === selectedInvoiceNumber) || null;
  }, [invoices, selectedInvoiceNumber]);

  // When an invoice is selected, populate service & amount
  const handleSelectInvoice = (invNumber: string) => {
    setSelectedInvoiceNumber(invNumber);
    if (invNumber === 'none') return;

    const inv = invoices.find(i => i.invoice_number === invNumber);
    if (inv) {
      setSelectedService(inv.service_description || inv.serviceDescription || 'Clinical Service');
      const amt = inv.total_amount || inv.totalAmount || 0;
      setAmountRaw(amt > 0 ? amt.toLocaleString() : '');
    }
  };

  // Amount numeric value
  const numericAmount = useMemo(() => {
    return parseInt(amountRaw.replace(/[^0-9]/g, ''), 10) || 0;
  }, [amountRaw]);

  // Remaining balance calculation on partial invoice payment
  const remainingInvoiceBalance = useMemo(() => {
    if (!selectedInvoice) return null;
    const invTotal = selectedInvoice.total_amount || selectedInvoice.totalAmount || 0;
    return Math.max(0, invTotal - numericAmount);
  }, [selectedInvoice, numericAmount]);

  // Formatted amount input handler with thousands separator
  const handleAmountChange = (val: string) => {
    const digits = val.replace(/[^0-9]/g, '');
    if (!digits) {
      setAmountRaw('');
      return;
    }
    const num = parseInt(digits, 10);
    setAmountRaw(num.toLocaleString());
  };

  // Live, published tariffs from the hospital's own service directory, plus
  // a manual fallback for anything not yet in the catalogue.
  const serviceOptions = useMemo<CatalogueServiceOption[]>(() => {
    return [...serviceCatalog, { name: CUSTOM_SERVICE_LABEL, tariff: 0 }];
  }, [serviceCatalog]);

  // Clinical service change handler
  const handleServiceChange = (serviceName: string) => {
    setSelectedService(serviceName);
    const found = serviceOptions.find(c => c.name === serviceName);
    if (found && found.tariff > 0 && (!amountRaw || selectedInvoiceNumber === 'none')) {
      setAmountRaw(found.tariff.toLocaleString());
    }
  };

  // Check if reference is required (electronic rails)
  const isElectronicChannel = useMemo(() => {
    return ['POS card', 'Bank transfer', 'USSD'].includes(channel);
  }, [channel]);

  // Real-time duplicate reference check against existing ledger & incoming feed rows
  const isDuplicateReference = useMemo(() => {
    if (!reference.trim()) return false;
    const cleanRef = reference.trim().toLowerCase();
    return providerTransactions.some(t => 
      t.reference && t.reference.toLowerCase() === cleanRef
    );
  }, [reference, providerTransactions]);

  // Validation
  const isFormValid = useMemo(() => {
    if (!selectedPatient) return false;
    if (!selectedService || (selectedService === CUSTOM_SERVICE_LABEL && !customServiceName.trim())) return false;
    if (numericAmount <= 0) return false;
    if (!channel) return false;
    if (isElectronicChannel && (!reference.trim() || isDuplicateReference)) return false;
    return true;
  }, [selectedPatient, selectedService, customServiceName, numericAmount, channel, isElectronicChannel, reference, isDuplicateReference]);

  // Submit Handler
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selectedPatient) return;

    const finalService = selectedService === CUSTOM_SERVICE_LABEL 
      ? customServiceName.trim() 
      : selectedService;

    const newTxn: ProviderTransaction = {
      id: `TXN-${Date.now().toString().slice(-4)}`,
      time: paymentTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patientOrService: `${selectedPatient.fullName} — ${finalService}`,
      amount: numericAmount,
      formattedAmount: `₦${numericAmount.toLocaleString()}`,
      channel: channel as any,
      status: 'paid',
      reference: reference.trim() || undefined,
      invoiceNumber: selectedInvoiceNumber !== 'none' ? selectedInvoiceNumber : undefined,
      mrn: selectedPatient.mrn,
      patientName: selectedPatient.fullName,
      service: finalService,
      recordedBy: staffMember
    };

    addProviderTransaction(newTxn);
    setConfirmedTxn(newTxn);
    setVoidCountdown(10);
    setIsVoided(false);
    addNotification(`Payment of ₦${numericAmount.toLocaleString()} recorded for ${selectedPatient.fullName}.`, 'success');
  };

  // Handle Void
  const handleVoid = () => {
    if (!confirmedTxn) return;
    voidProviderTransaction(confirmedTxn.id);
    setIsVoided(true);
  };

  // Handle Send Receipt
  const handleSendReceipt = () => {
    if (!confirmedTxn) return;
    const text = `Lagoon Specialist Hospital — Payment Receipt\nPatient: ${confirmedTxn.patientName} (${confirmedTxn.mrn})\nService: ${confirmedTxn.service}\nAmount: ${confirmedTxn.formattedAmount}\nChannel: ${confirmedTxn.channel}\nRef: ${confirmedTxn.reference || 'N/A'}\nTime: ${confirmedTxn.time}\nStatus: Paid & Recorded`;
    navigator.clipboard.writeText(text);
    setReceiptCopied(true);
    addNotification('Official payment receipt text copied to clipboard.', 'success');
    setTimeout(() => setReceiptCopied(false), 3000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record payment"
      subtitle="Adds to today's collections and the patient's balance."
      maxWidth="max-w-xl"
      lightDim={true}
    >
      {confirmedTxn ? (
        /* Post-Save Confirmation View with Send Receipt & Void Window */
        <div className="space-y-4 font-sans text-xs">
          {isVoided ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-2 text-center">
              <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
              <div className="font-bold text-sm">Payment Voided & Reversed</div>
              <p className="text-xs text-amber-700">
                Transaction {confirmedTxn.id} ({confirmedTxn.formattedAmount}) was voided and reversed from today&apos;s hospital revenue ledger.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[#12244D] text-white font-bold rounded-lg cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Receipt Confirmation Card */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-sm text-[#12244D]">
                      Payment recorded successfully
                    </span>
                  </div>
                  <span className="font-mono text-base font-extrabold text-emerald-700">
                    {confirmedTxn.formattedAmount}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-emerald-100 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Patient name:</span>
                      <span className="font-semibold text-[#12244D]">{confirmedTxn.patientName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Hospital MRN:</span>
                      <span className="font-mono font-bold text-[#12244D]">#{confirmedTxn.mrn?.replace(/^MRN-LSH-/, '')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Service booked:</span>
                      <span className="font-medium text-slate-700">{confirmedTxn.service}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Payment rail:</span>
                      <span className="font-semibold text-slate-800">{confirmedTxn.channel}</span>
                    </div>
                  </div>

                  {confirmedTxn.reference && (
                    <div className="pt-1 border-t border-slate-100 flex justify-between text-[11px]">
                      <span className="text-slate-400">Reference / RRN:</span>
                      <span className="font-mono font-bold text-[#0B6B69]">{confirmedTxn.reference}</span>
                    </div>
                  )}

                  <div className="pt-1 border-t border-slate-100 flex justify-between text-[11px] text-slate-500">
                    <span>{confirmedTxn.recordedBy}</span>
                    <span className="font-mono">{confirmedTxn.time}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Send Receipt & Void Safety Window */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {voidCountdown > 0 ? (
                  <button
                    type="button"
                    onClick={handleVoid}
                    className="w-full sm:w-auto px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Void payment ({voidCountdown}s)
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 font-sans">
                    Finalized in ledger
                  </span>
                )}

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleSendReceipt}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-50 text-[#12244D] flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {receiptCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    {receiptCopied ? 'Receipt copied!' : 'Send receipt'}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 text-xs font-bold bg-[#12244D] hover:bg-[#0A152E] text-white rounded-lg cursor-pointer shadow-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Main Payment Input Form */
        <form onSubmit={handleRecordPayment} className="space-y-3 font-sans text-xs">
          {/* 1. Patient Search-and-Select with MRN and Copay Balance */}
          <div className="relative">
            <label className="block text-[#334155] font-semibold mb-1">
              Patient * <span className="text-slate-400 font-normal">(search name, MRN, phone)</span>
            </label>

            {selectedPatient ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#12244D]">
                      {selectedPatient.fullName}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#0B6B69] bg-[#0B6B69]/10 px-1.5 py-0.2 rounded">
                      #{selectedPatient.mrn.replace(/^MRN-LSH-/, '')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedPatient.primaryCoverage} · {selectedPatient.phone}
                  </div>
                </div>

                <div className="text-right">
                  {selectedPatient.outstandingCopay > 0 ? (
                    <span className="inline-block font-bold text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {selectedPatient.formattedOutstandingCopay} copay due
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      Balance settled
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setSelectedInvoiceNumber('none');
                      setPatientSearch('');
                    }}
                    className="block text-[11px] text-[#0B6B69] hover:underline mt-1 font-semibold ml-auto"
                  >
                    Change patient
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search patient e.g. John Umar or #10006..."
                  value={patientSearch}
                  onFocus={() => setIsPatientDropdownOpen(true)}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setIsPatientDropdownOpen(true);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-[#0f172a] focus:outline-none focus:border-[#12244D]"
                />

                {isPatientDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto z-30 divide-y divide-slate-100">
                    {loadingData ? (
                      <div className="p-3 text-center text-slate-500 text-xs">
                        Loading patients registry...
                      </div>
                    ) : filteredPatients.length === 0 ? (
                      <div className="p-3 text-center text-slate-500 text-xs">
                        No matching patient found.
                      </div>
                    ) : (
                      filteredPatients.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p);
                            setIsPatientDropdownOpen(false);
                            setPatientSearch('');
                          }}
                          className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-sm text-[#12244D]">
                              {p.fullName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {p.phone} · {p.primaryCoverage}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded block">
                              #{p.mrn.replace(/^MRN-LSH-/, '')}
                            </span>
                            {p.outstandingCopay > 0 && (
                              <span className="text-[10px] font-bold text-rose-600 block mt-0.5">
                                ₦{p.outstandingCopay.toLocaleString()} copay
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. "Apply to invoice" select */}
          {selectedPatient && (
            <div>
              <label className="block text-[#334155] font-semibold mb-1">
                Apply to invoice <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                value={selectedInvoiceNumber}
                onChange={(e) => handleSelectInvoice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-[#0f172a] focus:outline-none focus:border-[#12244D]"
              >
                <option value="none">Direct payment / procedure (No invoice link)</option>
                {patientOpenInvoices.map(inv => (
                  <option key={inv.invoice_number} value={inv.invoice_number}>
                    {inv.invoice_number} — {inv.service_description || inv.serviceDescription} ({inv.formatted_amount || inv.formattedAmount})
                  </option>
                ))}
              </select>

              {/* Show Remaining Invoice Balance on partial payment */}
              {selectedInvoice && remainingInvoiceBalance !== null && (
                <div className="mt-1.5 p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">
                    Original invoice total: <strong>{selectedInvoice.formatted_amount || selectedInvoice.formattedAmount}</strong>
                  </span>
                  <span className={`font-semibold ${remainingInvoiceBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {remainingInvoiceBalance > 0 
                      ? `Remaining balance: ₦${remainingInvoiceBalance.toLocaleString()}` 
                      : 'Fully settled by this payment'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 3. Clinical Service Tariff Catalog (No Default) */}
          <div>
            <label className="block text-[#334155] font-semibold mb-1">
              Clinical service *
            </label>
            <select
              value={selectedService}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-[#0f172a] focus:outline-none focus:border-[#12244D]"
              required
              disabled={loadingData}
            >
              <option value="">
                {loadingData ? 'Loading published tariffs...' : 'Select clinical service from catalog...'}
              </option>
              {serviceOptions.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name}
                  {s.tariff > 0 ? ` (Tariff: ₦${s.tariff.toLocaleString()}${s.turnaroundTime ? `, ${s.turnaroundTime}` : ''})` : ''}
                </option>
              ))}
            </select>

            {catalogueError && (
              <p className="text-[10px] text-rose-600 mt-0.5">
                Could not load the live tariff catalogue — only the custom entry is available. Refresh and try again.
              </p>
            )}

            {selectedService === CUSTOM_SERVICE_LABEL && (
              <input
                type="text"
                placeholder="Enter custom clinical procedure name..."
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                className="w-full mt-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-[#0f172a] focus:outline-none focus:border-[#12244D]"
                required
              />
            )}
          </div>

          {/* 4. Amount and Channel (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Amount with ₦ prefix and formatting */}
            <div>
              <label className="block text-[#334155] font-semibold mb-1">
                Payment amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">
                  ₦
                </span>
                <input
                  type="text"
                  required
                  value={amountRaw}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="15,000"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-[#12244D] focus:outline-none focus:border-[#12244D]"
                />
              </div>
              {numericAmount === 0 && amountRaw && (
                <span className="text-[10px] text-rose-600 mt-0.5 block">
                  Amount must be greater than zero.
                </span>
              )}
            </div>

            {/* Payment Channel (No Default) */}
            <div>
              <label className="block text-[#334155] font-semibold mb-1">
                Payment channel *
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-[#0f172a] focus:outline-none focus:border-[#12244D]"
                required
              >
                <option value="">Select payment channel...</option>
                <option value="POS card">POS card (Terminal)</option>
                <option value="Bank transfer">Bank transfer direct (NIP)</option>
                <option value="USSD">USSD (*737# mobile)</option>
                <option value="Cash">Cash at counter</option>
              </select>
            </div>
          </div>

          {/* 5. Reference Field (Mandatory for Electronic Channels) with Duplicate Check */}
          {isElectronicChannel && (
            <div>
              <label className="block text-[#334155] font-semibold mb-1">
                Payment reference / Terminal RRN *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. RRN-992140 or NIP session reference ID..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-xs font-mono text-[#0f172a] focus:outline-none ${
                  isDuplicateReference 
                    ? 'border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500' 
                    : 'border-slate-300 focus:border-[#12244D]'
                }`}
              />

              {isDuplicateReference ? (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-700 mt-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Duplicate reference: This reference was already recorded on the ledger today.</span>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Audited against incoming bank and POS terminal feeds to prevent duplicate ledger rows.
                </p>
              )}
            </div>
          )}

          {/* 6. Payment Time & Staff Attribution Strip */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Payment time:</span>
              <input
                type="text"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                className="w-16 px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-center text-slate-800 text-xs"
              />
            </div>

            <div className="flex items-center gap-1 text-slate-500">
              <User className="w-3 h-3 text-slate-400" />
              <span>{staffMember}</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-[#334155] hover:text-[#0f172a] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-card cursor-pointer ${
                isFormValid
                  ? 'bg-[#12244D] hover:bg-[#0A152E] text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Record payment
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
