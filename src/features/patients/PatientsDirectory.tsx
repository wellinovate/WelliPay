import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useWelliPay } from '../../context/WelliPayContext';
import { Modal } from '../../components/ui/Modal';
import { StatusChip } from '../../components/ui/StatusChip';
import { 
  Users, 
  Search, 
  Plus, 
  ShieldCheck, 
  AlertCircle, 
  Phone, 
  Mail, 
  FileText, 
  CreditCard, 
  Calendar, 
  Hash, 
  Shield, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { 
  Patient, 
  PatientDirectoryMetrics, 
  PatientDirectoryResponse, 
  PatientDossierResponse, 
  ProviderTransaction, 
  HMOClaim 
} from '../../types';

export const PatientsDirectory: React.FC = () => {
  const { addNotification } = useWelliPay();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [metrics, setMetrics] = useState<PatientDirectoryMetrics>({
    totalPatients: 8,
    insuredCount: 6,
    selfPayCount: 2,
    totalOutstandingCopays: 28500,
    formattedTotalOutstandingCopays: '₦28,500'
  });
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [coverageFilter, setCoverageFilter] = useState<'all' | 'hmo' | 'self-pay'>('all');
  const [onlyOutstanding, setOnlyOutstanding] = useState(false);

  // Selected Patient Dossier State
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState<{
    patient: Patient | null;
    transactions: ProviderTransaction[];
    claims: HMOClaim[];
  }>({ patient: null, transactions: [], claims: [] });

  // Copay Settlement Modal State
  const [isCopayModalOpen, setIsCopayModalOpen] = useState(false);
  const [copayAmount, setCopayAmount] = useState<number>(0);
  const [copayChannel, setCopayChannel] = useState<'POS card' | 'Cash' | 'USSD' | 'Bank transfer'>('POS card');
  const [isSubmittingCopay, setIsSubmittingCopay] = useState(false);

  // New Patient Registration Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    gender: 'female' as 'female' | 'male',
    dateOfBirth: '',
    coverageType: 'hmo' as 'hmo' | 'self-pay',
    hmoName: 'Reliance HMO',
    hmoPolicyNumber: '',
    hmoEnrolleeId: '',
    initialCopay: ''
  });
  const [isRegistering, setIsRegistering] = useState(false);

  // Active Dossier Tab
  const [dossierTab, setDossierTab] = useState<'ledger' | 'claims'>('ledger');

  // Helper for auth headers
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

  // Fetch Patients List
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (coverageFilter !== 'all') params.append('coverage', coverageFilter);
      if (onlyOutstanding) params.append('hasOutstanding', 'true');

      const res = await fetch(`/api/patients?${params.toString()}`, { headers });
      const data: PatientDirectoryResponse = await res.json();

      if (data && data.patients) {
        setPatients(data.patients);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, searchQuery, coverageFilter, onlyOutstanding]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Fetch Patient Dossier Details
  const fetchDossier = useCallback(async (id: string) => {
    try {
      setDossierLoading(true);
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/patients/${id}`, { headers });
      const data: PatientDossierResponse = await res.json();

      if (data && data.patient) {
        setDossierData({
          patient: data.patient,
          transactions: data.transactions || [],
          claims: data.claims || []
        });
        setCopayAmount(data.patient.outstandingCopay);
      }
    } catch (err) {
      console.error('Error loading patient dossier:', err);
    } finally {
      setDossierLoading(false);
    }
  }, [getAuthHeaders]);

  const handleOpenDossier = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    fetchDossier(patient.id);
  };

  // Submit Copay Settlement
  const handleCollectCopay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || copayAmount <= 0) return;

    try {
      setIsSubmittingCopay(true);
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/patients/${selectedPatientId}/collect-copay`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: copayAmount,
          channel: copayChannel
        })
      });

      const data = await res.json();
      if (data.success) {
        addNotification(
          `Successfully collected ₦${copayAmount.toLocaleString()} copay for ${dossierData.patient?.fullName}. Transaction logged to hospital ledger.`,
          'success'
        );
        setIsCopayModalOpen(false);
        // Refresh dossier and list
        fetchDossier(selectedPatientId);
        fetchPatients();
      } else {
        addNotification(data.error || 'Failed to process copay collection', 'error');
      }
    } catch (err) {
      addNotification('Network error while processing copay', 'error');
    } finally {
      setIsSubmittingCopay(false);
    }
  };

  // Submit New Patient Registration
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientForm.fullName.trim()) return;

    try {
      setIsRegistering(true);
      const headers = await getAuthHeaders();
      const payload = {
        fullName: newPatientForm.fullName.trim(),
        phone: newPatientForm.phone.trim(),
        email: newPatientForm.email.trim(),
        gender: newPatientForm.gender,
        dateOfBirth: newPatientForm.dateOfBirth,
        primaryCoverage: newPatientForm.coverageType === 'hmo' 
          ? `${newPatientForm.hmoName} (Verified)` 
          : 'Self-Pay / Direct',
        hmoName: newPatientForm.coverageType === 'hmo' ? newPatientForm.hmoName : null,
        hmoPolicyNumber: newPatientForm.coverageType === 'hmo' ? newPatientForm.hmoPolicyNumber : null,
        hmoEnrolleeId: newPatientForm.coverageType === 'hmo' ? newPatientForm.hmoEnrolleeId : null,
        outstandingCopay: parseFloat(newPatientForm.initialCopay) || 0
      };

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        addNotification(`Patient ${data.patient.fullName} registered with MRN ${data.patient.mrn}.`, 'success');
        setIsRegisterModalOpen(false);
        setNewPatientForm({
          fullName: '',
          phone: '',
          email: '',
          gender: 'female',
          dateOfBirth: '',
          coverageType: 'hmo',
          hmoName: 'Reliance HMO',
          hmoPolicyNumber: '',
          hmoEnrolleeId: '',
          initialCopay: ''
        });
        fetchPatients();
      } else {
        addNotification(data.error || 'Registration failed', 'error');
      }
    } catch (err) {
      addNotification('Network error registering patient', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#12244D]">
            Patients
          </h1>
          <p className="text-sm text-[#475569] mt-1 font-sans">
            Enterprise Master Patient Index (EMPI), HMO policy verifications, outstanding copay ledgers, and visit billing histories.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="text-xs font-sans font-bold px-3.5 py-2 bg-[#12244D] hover:bg-[#0A152E] text-white rounded-lg flex items-center gap-1.5 shadow-card transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Patient
          </button>
        </div>
      </div>

      {/* Directory KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-[#12244D]/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="font-sans text-3xl font-extrabold text-[#12244D] tracking-tight">
              {metrics.totalPatients}
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#12244D]/10 flex items-center justify-center text-[#12244D]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Registered Patients
          </div>
          <div className="mt-2 text-xs text-[#64748b] font-sans">
            Lagoon Hospital Master Index
          </div>
        </div>

        {/* HMO Insured */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-[#0B6B69]/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="font-sans text-3xl font-extrabold text-[#0B6B69] tracking-tight">
              {metrics.insuredCount}
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#0B6B69]/10 flex items-center justify-center text-[#0B6B69]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            HMO Insured Enrollees
          </div>
          <div className="mt-2 text-xs text-emerald-700 font-sans font-medium">
            Active electronic pre-auth
          </div>
        </div>

        {/* Self-Pay Direct */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-[#12244D]/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="font-sans text-3xl font-extrabold text-[#12244D] tracking-tight">
              {metrics.selfPayCount}
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Self-Pay / Direct Payer
          </div>
          <div className="mt-2 text-xs text-[#64748b] font-sans">
            POS, USSD & direct transfers
          </div>
        </div>

        {/* Outstanding Copays */}
        <div className={`bg-white border rounded-xl p-4 shadow-subtle transition-all ${
          metrics.totalOutstandingCopays > 0 ? 'border-rose-200 hover:border-rose-300' : 'border-[#e2e8f0]'
        }`}>
          <div className="flex items-center justify-between">
            <div className="font-sans text-3xl font-extrabold text-rose-700 tracking-tight">
              {metrics.formattedTotalOutstandingCopays}
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-700">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Outstanding Copay Total
          </div>
          <div className="mt-2 text-xs text-rose-600 font-sans font-medium">
            Unsettled at front desk
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#e2e8f0] shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient name, MRN, phone, policy number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-sans bg-[#F8FAFC] border border-[#cbd5e1] rounded-lg text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0B6B69] focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Coverage Filter Tabs */}
          <div className="inline-flex rounded-lg border border-[#e2e8f0] p-0.5 bg-[#f8fafc] text-xs font-sans">
            <button
              onClick={() => setCoverageFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                coverageFilter === 'all' 
                  ? 'bg-white font-bold text-[#12244D] shadow-xs' 
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCoverageFilter('hmo')}
              className={`px-3 py-1 rounded-md transition-colors ${
                coverageFilter === 'hmo' 
                  ? 'bg-white font-bold text-[#0B6B69] shadow-xs' 
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              HMO Insured
            </button>
            <button
              onClick={() => setCoverageFilter('self-pay')}
              className={`px-3 py-1 rounded-md transition-colors ${
                coverageFilter === 'self-pay' 
                  ? 'bg-white font-bold text-[#12244D] shadow-xs' 
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              Self-Pay
            </button>
          </div>

          {/* Outstanding Only Pill */}
          <button
            onClick={() => setOnlyOutstanding(!onlyOutstanding)}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans font-semibold border transition-all ${
              onlyOutstanding 
                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs' 
                : 'bg-white border-[#cbd5e1] text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            Has Unsettled Copay
          </button>
        </div>
      </div>

      {/* Patient Broadsheet Table */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-subtle overflow-hidden">
        <table className="broadsheet-table w-full">
          <thead>
            <tr className="bg-[#f8fafc] text-[#475569]">
              <th style={{ width: '130px' }}>MRN</th>
              <th>Patient Name</th>
              <th>Contact Details</th>
              <th>Primary Coverage & Policy</th>
              <th style={{ width: '150px' }}>Outstanding Copay</th>
              <th style={{ width: '110px' }}>Status</th>
              <th style={{ width: '100px' }} className="text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#64748b] text-xs font-sans">
                  Loading patient registry...
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#64748b] text-xs font-sans">
                  No matching patients found in registry.
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => handleOpenDossier(p)}
                  className="hover:bg-[#f8fafc] cursor-pointer transition-colors"
                >
                  <td>
                    <span className="font-mono text-xs font-bold text-[#12244D] bg-slate-100 px-2 py-0.5 rounded">
                      {p.mrn}
                    </span>
                  </td>
                  <td>
                    <div className="font-semibold text-sm text-[#0f172a]">
                      {p.fullName}
                    </div>
                    <div className="text-[11px] text-[#64748b] capitalize">
                      {p.gender} · Born {p.dateOfBirth || '1988'}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-xs text-[#334155]">
                      <Phone className="w-3 h-3 text-[#94a3b8]" />
                      <span>{p.phone}</span>
                    </div>
                    {p.email && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#64748b] mt-0.5">
                        <Mail className="w-3 h-3 text-[#94a3b8]" />
                        <span>{p.email}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="font-medium text-xs text-[#0f172a]">
                      {p.primaryCoverage}
                    </div>
                    {p.hmoPolicyNumber && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-mono text-[10px] text-[#0B6B69] font-bold bg-[#0B6B69]/10 px-1.5 py-0.5 rounded">
                          {p.hmoPolicyNumber}
                        </span>
                        {p.hmoEnrolleeId && (
                          <span className="text-[10px] text-[#64748b]">
                            · {p.hmoEnrolleeId}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    {p.outstandingCopay > 0 ? (
                      <div>
                        <div className="font-bold text-xs text-rose-700">
                          {p.formattedOutstandingCopay}
                        </div>
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded mt-0.5">
                          Unsettled
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Up to date</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusChip status={p.status === 'active' ? 'paid' : 'pending'} label={p.status === 'active' ? 'Active' : 'Flagged'} />
                  </td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenDossier(p)}
                      className="px-2.5 py-1 text-xs font-bold rounded-md border border-[#cbd5e1] text-[#12244D] hover:bg-[#12244D] hover:text-white transition-all shadow-2xs"
                    >
                      Dossier
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Patient Dossier Modal */}
      <Modal
        isOpen={!!selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
        title={dossierData.patient ? `${dossierData.patient.fullName}` : 'Patient Dossier'}
        subtitle={dossierData.patient ? `${dossierData.patient.mrn} · Lagoon Specialist Hospital` : ''}
      >
        {dossierLoading ? (
          <div className="py-12 text-center text-xs text-[#64748b]">
            Loading patient dossier from database...
          </div>
        ) : dossierData.patient ? (
          <div className="space-y-4 font-sans text-xs">
            {/* Demographic & Insurance Banner */}
            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#e2e8f0] space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[#64748b] block text-[11px]">Gender / Age</span>
                  <span className="font-bold text-[#12244D] capitalize">
                    {dossierData.patient.gender} · {dossierData.patient.dateOfBirth || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748b] block text-[11px]">Contact Mobile</span>
                  <span className="font-bold text-[#12244D]">
                    {dossierData.patient.phone}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748b] block text-[11px]">Primary Coverage</span>
                  <span className="font-bold text-[#0B6B69]">
                    {dossierData.patient.primaryCoverage}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748b] block text-[11px]">HMO Policy / Enrollee</span>
                  <span className="font-mono font-bold text-[#12244D]">
                    {dossierData.patient.hmoPolicyNumber || 'Direct Payer'}
                  </span>
                </div>
              </div>

              {/* Outstanding Copay Alert & Settlement Action */}
              {dossierData.patient.outstandingCopay > 0 ? (
                <div className="mt-2 bg-rose-50 border border-rose-200 p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <span className="font-bold text-xs">
                        Outstanding Copay Balance: {dossierData.patient.formattedOutstandingCopay}
                      </span>
                      <p className="text-[11px] text-rose-700">
                        Uncollected pharmacy or procedure copay requires settlement at front desk cashier.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setCopayAmount(dossierData.patient?.outstandingCopay || 0);
                      setIsCopayModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    Collect Copay
                  </button>
                </div>
              ) : (
                <div className="mt-2 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-2 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Account balance in good standing. No outstanding patient copays.</span>
                </div>
              )}
            </div>

            {/* Dossier Tabs: Visit Billing Ledger vs HMO Claims */}
            <div>
              <div className="flex items-center border-b border-[#e2e8f0] mb-3">
                <button
                  onClick={() => setDossierTab('ledger')}
                  className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 ${
                    dossierTab === 'ledger'
                      ? 'border-[#12244D] text-[#12244D]'
                      : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  Visit Billing Ledger ({dossierData.transactions.length})
                </button>
                <button
                  onClick={() => setDossierTab('claims')}
                  className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 ${
                    dossierTab === 'claims'
                      ? 'border-[#0B6B69] text-[#0B6B69]'
                      : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  Insurance Claims ({dossierData.claims.length})
                </button>
              </div>

              {/* Tab 1: Visit Billing Ledger */}
              {dossierTab === 'ledger' && (
                <div className="space-y-2">
                  {dossierData.transactions.length === 0 ? (
                    <div className="py-6 text-center text-[#64748b] text-xs">
                      No billing transactions logged for this patient today.
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[#64748b] border-b border-[#f1f5f9]">
                          <th className="pb-1.5">Time</th>
                          <th className="pb-1.5">Service Details</th>
                          <th className="pb-1.5">Channel</th>
                          <th className="pb-1.5">Amount</th>
                          <th className="pb-1.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f8fafc]">
                        {dossierData.transactions.map((txn) => (
                          <tr key={txn.id} className="hover:bg-[#f8fafc]">
                            <td className="py-2 text-[#64748b] font-mono">{txn.time}</td>
                            <td className="py-2 font-medium text-[#0f172a]">{txn.patientOrService}</td>
                            <td className="py-2 text-[#475569]">{txn.channel}</td>
                            <td className="py-2 font-bold text-[#12244D]">{txn.formattedAmount}</td>
                            <td className="py-2 text-right">
                              <StatusChip status={txn.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 2: Insurance Claims */}
              {dossierTab === 'claims' && (
                <div className="space-y-2">
                  {dossierData.claims.length === 0 ? (
                    <div className="py-6 text-center text-[#64748b] text-xs">
                      No electronic insurance claims on file for this patient.
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[#64748b] border-b border-[#f1f5f9]">
                          <th className="pb-1.5">Claim ID</th>
                          <th className="pb-1.5">Diagnosis / Service</th>
                          <th className="pb-1.5">Amount</th>
                          <th className="pb-1.5">Denial Risk</th>
                          <th className="pb-1.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f8fafc]">
                        {dossierData.claims.map((claim) => (
                          <tr key={claim.id} className="hover:bg-[#f8fafc]">
                            <td className="py-2 font-mono font-bold text-[#12244D]">{claim.id}</td>
                            <td className="py-2 text-[#0f172a]">
                              <span className="block font-medium">{claim.diagnosis || 'Clinical visit'}</span>
                              {claim.preAuthCode && (
                                <span className="font-mono text-[10px] text-[#0B6B69]">
                                  Pre-Auth: {claim.preAuthCode}
                                </span>
                              )}
                            </td>
                            <td className="py-2 font-bold text-[#0B6B69]">{claim.formattedAmount}</td>
                            <td className="py-2">
                              <StatusChip status={claim.denialRisk} />
                            </td>
                            <td className="py-2 text-right">
                              <StatusChip status={claim.isDisputed ? 'disputed' : claim.status} label={claim.statusLabel} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-[#e2e8f0]">
              <button
                onClick={() => setSelectedPatientId(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#12244D] hover:bg-[#0A152E] text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Collect Copay Modal */}
      <Modal
        isOpen={isCopayModalOpen}
        onClose={() => setIsCopayModalOpen(false)}
        title="Collect Patient Copay Settlement"
        subtitle={dossierData.patient ? `Record payment for ${dossierData.patient.fullName} (${dossierData.patient.mrn})` : ''}
      >
        <form onSubmit={handleCollectCopay} className="space-y-4 font-sans text-xs">
          <div>
            <label className="block text-[#334155] font-semibold mb-1">
              Payment Amount (₦)
            </label>
            <input
              type="number"
              value={copayAmount}
              onChange={(e) => setCopayAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm bg-white text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
              required
              min="1"
            />
            <p className="text-[11px] text-[#64748b] mt-1">
              Outstanding copay balance: {dossierData.patient?.formattedOutstandingCopay}
            </p>
          </div>

          <div>
            <label className="block text-[#334155] font-semibold mb-1">
              Payment Channel
            </label>
            <select
              value={copayChannel}
              onChange={(e) => setCopayChannel(e.target.value as any)}
              className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm bg-white text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
            >
              <option value="POS card">POS Card (Terminal)</option>
              <option value="Bank transfer">Bank Transfer Direct</option>
              <option value="USSD">USSD Mobile Money</option>
              <option value="Cash">Cash at Counter</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#e2e8f0]">
            <button
              type="button"
              onClick={() => setIsCopayModalOpen(false)}
              className="px-3 py-1.5 text-xs text-[#64748b] hover:text-[#0f172a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCopay || copayAmount <= 0}
              className="px-4 py-2 bg-[#0B6B69] hover:bg-[#074C4A] text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmittingCopay ? 'Recording...' : `Confirm Collection (₦${copayAmount.toLocaleString()})`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Register New Patient Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register New Patient"
        subtitle="Create master medical record & link HMO health insurance policy"
      >
        <form onSubmit={handleRegisterPatient} className="space-y-3 font-sans text-xs">
          <div>
            <label className="block text-[#334155] font-semibold mb-1">Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Oluwaseun Adeleke"
              value={newPatientForm.fullName}
              onChange={(e) => setNewPatientForm({ ...newPatientForm, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm bg-white text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#334155] font-semibold mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+234 803 000 0000"
                value={newPatientForm.phone}
                onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm bg-white text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
              />
            </div>
            <div>
              <label className="block text-[#334155] font-semibold mb-1">Email Address</label>
              <input
                type="email"
                placeholder="patient@example.ng"
                value={newPatientForm.email}
                onChange={(e) => setNewPatientForm({ ...newPatientForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm bg-white text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#334155] font-semibold mb-1">Gender</label>
              <select
                value={newPatientForm.gender}
                onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value as any })}
                className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm bg-white text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div>
              <label className="block text-[#334155] font-semibold mb-1">Date of Birth</label>
              <input
                type="date"
                value={newPatientForm.dateOfBirth}
                onChange={(e) => setNewPatientForm({ ...newPatientForm, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm bg-white text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#334155] font-semibold mb-1">Coverage Model</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="coverageType"
                  checked={newPatientForm.coverageType === 'hmo'}
                  onChange={() => setNewPatientForm({ ...newPatientForm, coverageType: 'hmo' })}
                />
                <span>HMO Insured</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="coverageType"
                  checked={newPatientForm.coverageType === 'self-pay'}
                  onChange={() => setNewPatientForm({ ...newPatientForm, coverageType: 'self-pay' })}
                />
                <span>Self-Pay / Direct Payer</span>
              </label>
            </div>
          </div>

          {newPatientForm.coverageType === 'hmo' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <div>
                <label className="block text-[#334155] font-semibold mb-1">HMO Provider</label>
                <select
                  value={newPatientForm.hmoName}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, hmoName: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-xs bg-white text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
                >
                  <option value="Reliance HMO">Reliance HMO</option>
                  <option value="AXA Mansard">AXA Mansard Health</option>
                  <option value="Hygeia HMO">Hygeia HMO</option>
                  <option value="Leadway Health">Leadway Health</option>
                  <option value="Avon HMO">Avon HMO</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Policy Number</label>
                  <input
                    type="text"
                    placeholder="e.g. REL-882190-A"
                    value={newPatientForm.hmoPolicyNumber}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, hmoPolicyNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-xs bg-white text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Enrollee ID</label>
                  <input
                    type="text"
                    placeholder="e.g. ENR-99214"
                    value={newPatientForm.hmoEnrolleeId}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, hmoEnrolleeId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-xs bg-white text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#e2e8f0]">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="px-3 py-1.5 text-xs text-[#64748b] hover:text-[#0f172a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRegistering}
              className="px-4 py-2 bg-[#12244D] hover:bg-[#0A152E] text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isRegistering ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
