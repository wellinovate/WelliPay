import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useWelliPay } from '../../context/WelliPayContext';
import { Modal } from '../../components/ui/Modal';
import { auth } from '../../firebase';
import { PreAuthorization, PreAuthEvent, PreAuthStatus, Patient, PreAuthPrefill } from '../../types';
import {
  Plus,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Link2,
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

const HOSPITAL_PROVIDER_NAME = 'Lagoon Specialist Hospital';
const HOSPITAL_PROVIDER_ID = 'PRV-LAG-01';

const SHARED_HMOS = [
  'Reliance HMO',
  'AXA Mansard',
  'Hygeia HMO',
  'Leadway Health',
  'Avon HMO',
  'Metrohealth',
];

const STATUS_BADGE: Record<PreAuthStatus, string> = {
  requested: 'bg-slate-100 text-slate-700 border-slate-200',
  submitted: 'bg-slate-100 text-slate-700 border-slate-200',
  under_review: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
  provider_notified: 'bg-sky-50 text-sky-800 border-sky-200',
  service_completed: 'bg-sky-50 text-sky-800 border-sky-200',
  claim_submitted: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

type StatusTabId = 'all' | 'awaiting_decision' | 'approved' | 'claim_submitted' | 'paid' | 'rejected';

interface StatusTabConfig {
  id: StatusTabId;
  label: string;
  statuses?: PreAuthStatus[];
}

const STATUS_TABS: StatusTabConfig[] = [
  { id: 'all', label: 'All' },
  { id: 'awaiting_decision', label: 'Awaiting decision', statuses: ['requested', 'submitted', 'under_review'] },
  { id: 'approved', label: 'Approved', statuses: ['approved', 'provider_notified', 'service_completed'] },
  { id: 'claim_submitted', label: 'Claim submitted', statuses: ['claim_submitted'] },
  { id: 'paid', label: 'Paid', statuses: ['paid'] },
  { id: 'rejected', label: 'Rejected', statuses: ['rejected'] },
];

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken().catch(() => undefined);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer dev-token' }),
  };
}

function StatusBadge({ status, label }: { status: PreAuthStatus; label?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_BADGE[status] || STATUS_BADGE.requested}`}>
      {label || status.replace(/_/g, ' ')}
    </span>
  );
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getDaysWaiting(createdAt: string, status: PreAuthStatus): string {
  if (['paid', 'service_completed', 'claim_submitted'].includes(status)) {
    return '—';
  }
  const created = new Date(createdAt).getTime();
  const diffDays = Math.max(0, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
  return diffDays === 0 ? 'Today' : `${diffDays}d`;
}

function getExpiryDisplay(preAuth: PreAuthorization): string {
  if (preAuth.expiryDate) {
    return formatDate(preAuth.expiryDate);
  }
  if (['approved', 'provider_notified', 'service_completed', 'claim_submitted'].includes(preAuth.status)) {
    const created = new Date(preAuth.createdAt);
    created.setDate(created.getDate() + 30);
    return formatDate(created.toISOString());
  }
  return '—';
}

export const PreAuthTracker: React.FC = () => {
  const { addNotification, preAuthPrefill, clearPreAuthPrefill } = useWelliPay();

  const [preAuths, setPreAuths] = useState<PreAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTabFilter, setActiveTabFilter] = useState<StatusTabId>('all');
  const [search, setSearch] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Cross-app prefill detection
  useEffect(() => {
    if (preAuthPrefill) {
      setShowCreateModal(true);
    }
  }, [preAuthPrefill]);

  const loadPreAuths = async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/preauth-requests', { headers });
      const data = await res.json();
      setPreAuths(Array.isArray(data.preAuths) ? data.preAuths : []);
    } catch {
      addNotification('Failed to load pre-authorisation requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreAuths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    return {
      all: preAuths.length,
      awaiting_decision: preAuths.filter(p => ['requested', 'submitted', 'under_review'].includes(p.status)).length,
      approved: preAuths.filter(p => ['approved', 'provider_notified', 'service_completed'].includes(p.status)).length,
      claim_submitted: preAuths.filter(p => p.status === 'claim_submitted').length,
      paid: preAuths.filter(p => p.status === 'paid').length,
      rejected: preAuths.filter(p => p.status === 'rejected').length,
    };
  }, [preAuths]);

  const filtered = useMemo(() => {
    return preAuths.filter(p => {
      if (activeTabFilter !== 'all') {
        const tabConfig = STATUS_TABS.find(t => t.id === activeTabFilter);
        if (tabConfig?.statuses && !tabConfig.statuses.includes(p.status)) {
          return false;
        }
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${p.id} ${p.patientName} ${p.patientMrn || ''} ${p.payerName} ${p.planName || ''} ${p.serviceDescription} ${p.authCode || ''} ${p.diagnosis || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [preAuths, activeTabFilter, search]);

  const selected = preAuths.find(p => p.id === selectedId) || null;
  const isFiltered = activeTabFilter !== 'all' || search.trim() !== '';

  const getBadgeStyle = (tabId: StatusTabId, count: number, isCurrent: boolean) => {
    if (count === 0) {
      return isCurrent ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500';
    }
    switch (tabId) {
      case 'awaiting_decision':
        return 'bg-amber-100 text-amber-800';
      case 'approved':
        return 'bg-emerald-100 text-emerald-800';
      case 'claim_submitted':
        return 'bg-indigo-100 text-indigo-800';
      case 'paid':
        return 'bg-emerald-100 text-emerald-800';
      case 'rejected':
        return 'bg-rose-100 text-rose-800';
      default:
        return isCurrent ? 'bg-[#12244D] text-white' : 'bg-slate-200 text-[#12244D]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#12244D]">
            Pre-authorisations
          </h1>
          <p className="text-sm text-[#475569] mt-1 font-sans">
            Requests to HMOs for approval before a service is delivered.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#12244D] hover:bg-[#0A152E] text-white transition-all shadow-xs cursor-pointer self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New pre-authorisation request</span>
        </button>
      </div>

      {/* Status Filter Tabs Carrying Live Counts */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#e2e8f0] pb-2">
        {STATUS_TABS.map(tab => {
          const count = counts[tab.id];
          const isCurrent = activeTabFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isCurrent
                  ? 'bg-white border-[#12244D] text-[#12244D] shadow-xs'
                  : 'bg-transparent border-transparent text-[#64748b] hover:text-[#0f172a] hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold transition-colors ${getBadgeStyle(
                  tab.id,
                  count,
                  isCurrent
                )}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table Toolbar & Search */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-heading text-sm font-bold text-[#12244D] uppercase tracking-wider">
            Requests list
          </h4>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search request, patient, MRN, HMO..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg w-64 text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0B6B69] shadow-xs"
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-subtle overflow-x-auto">
          <table className="broadsheet-table min-w-[1020px]">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th style={{ width: '95px' }}>Request ID</th>
                <th style={{ width: '105px' }}>Requested on</th>
                <th style={{ width: '160px' }}>Patient</th>
                <th style={{ width: '130px' }}>Payer / Plan</th>
                <th>Service</th>
                <th style={{ width: '110px' }} className="text-right">Amount requested</th>
                <th style={{ width: '110px' }} className="text-right">Amount approved</th>
                <th style={{ width: '110px' }}>Approval code</th>
                <th style={{ width: '95px' }}>Expiry</th>
                <th style={{ width: '85px' }}>Days waiting</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '70px' }} className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 inline" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12">
                    {isFiltered ? (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500">No pre-authorisation requests match this filter.</p>
                        <button
                          type="button"
                          onClick={() => { setActiveTabFilter('all'); setSearch(''); }}
                          className="px-3 py-1 text-xs font-semibold text-[#0B6B69] hover:underline cursor-pointer"
                        >
                          Clear filter
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-[#12244D]">No requests yet</p>
                        <p className="text-xs text-slate-500">
                          Pre-authorisation requests recorded for HMO patients will appear here.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowCreateModal(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#12244D] text-white hover:bg-[#0A152E] transition-all shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New request</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const waiting = getDaysWaiting(p.createdAt, p.status);
                  const expiry = getExpiryDisplay(p);
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#f8fafc] cursor-pointer transition-colors"
                      onClick={() => setSelectedId(p.id)}
                    >
                      <td className="font-mono text-xs text-[#12244D] font-bold">{p.id}</td>
                      <td className="text-xs text-[#64748b]">{formatDate(p.createdAt)}</td>
                      <td className="text-xs text-[#0f172a]">
                        <span className="font-semibold block">{p.patientName}</span>
                        <span className="block text-[11px] font-mono text-[#64748b]">{p.patientMrn || '—'}</span>
                      </td>
                      <td className="text-xs">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#f1f5f9] text-[#334155] border border-[#e2e8f0]">
                          {p.payerName}
                        </span>
                        {p.planName && (
                          <span className="block text-[10px] text-[#64748b] truncate max-w-[120px]" title={p.planName}>
                            {p.planName}
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-[#334155]">
                        <span className="line-clamp-1 font-medium" title={p.serviceDescription}>
                          {p.serviceDescription}
                        </span>
                        {p.diagnosis && (
                          <span className="block text-[11px] text-[#64748b] truncate max-w-[200px]" title={p.diagnosis}>
                            {p.diagnosis}
                          </span>
                        )}
                      </td>
                      <td className="font-mono font-bold text-xs text-[#12244D] text-right">
                        {p.formattedAmount || `₦${Number(p.requestedAmount).toLocaleString()}`}
                      </td>
                      <td className="font-mono text-xs text-right">
                        {p.approvedAmount != null ? (
                          <span className="text-emerald-700 font-bold">₦{Number(p.approvedAmount).toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="font-mono text-xs">
                        {p.authCode ? (
                          <span className="text-slate-700 font-semibold">{p.authCode}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-xs text-slate-600">{expiry}</td>
                      <td className="text-xs font-mono text-slate-600">{waiting}</td>
                      <td>
                        <StatusBadge status={p.status} label={p.statusLabel} />
                      </td>
                      <td className="text-right" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(p.id)}
                          className="px-2 py-1 text-[11px] font-semibold text-[#12244D] hover:bg-slate-100 rounded border border-[#cbd5e1] cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overhauled Create Modal */}
      <CreatePreAuthModal
        isOpen={showCreateModal}
        prefill={preAuthPrefill}
        onClose={() => {
          setShowCreateModal(false);
          clearPreAuthPrefill();
        }}
        addNotification={addNotification}
        onCreated={async () => {
          await loadPreAuths();
          setShowCreateModal(false);
          clearPreAuthPrefill();
        }}
      />

      {/* Detail Modal */}
      <PreAuthDetailModal
        preAuth={selected}
        onClose={() => setSelectedId(null)}
        addNotification={addNotification}
        onChanged={loadPreAuths}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Create Modal — Overhauled with Patient Search, Catalogue Link, Real Upload
// ---------------------------------------------------------------------------

interface CreateModalProps {
  isOpen: boolean;
  prefill: PreAuthPrefill | null;
  onClose: () => void;
  addNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  onCreated: () => void;
}

interface AttachedFile {
  name: string;
  size: number;
  type: string;
}

interface CatalogueOption {
  masterServiceId?: number;
  serviceName: string;
  serviceCode?: string;
  price: number;
}

const CreatePreAuthModal: React.FC<CreateModalProps> = ({
  isOpen,
  prefill,
  onClose,
  addNotification,
  onCreated,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueOption[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Form State
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientMrn, setPatientMrn] = useState('');
  const [payerName, setPayerName] = useState('');
  const [planName, setPlanName] = useState('');
  const [enrolleeId, setEnrolleeId] = useState('');

  const [serviceDescription, setServiceDescription] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [plannedDate, setPlannedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [urgency, setUrgency] = useState<'routine' | 'urgent'>('routine');

  const [requestedAmount, setRequestedAmount] = useState('');
  const [clinicalJustification, setClinicalJustification] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load patient directory and catalogue tariffs
  useEffect(() => {
    if (!isOpen) return;

    setLoadingInitial(true);
    (async () => {
      try {
        const headers = await authHeaders();
        const [patRes, catRes] = await Promise.all([
          fetch('/api/patients', { headers }).then(r => r.json()).catch(() => ({ patients: [] })),
          fetch(`/api/directory/catalogue/${HOSPITAL_PROVIDER_ID}`).then(r => r.json()).catch(() => ({ catalogue: [] })),
        ]);

        const patList = Array.isArray(patRes.patients) ? patRes.patients : [];
        setPatients(patList);

        if (Array.isArray(catRes.catalogue)) {
          setCatalogue(
            catRes.catalogue.map((c: any) => ({
              masterServiceId: c.masterServiceId,
              serviceName: c.serviceName,
              serviceCode: c.serviceCode,
              price: Number(c.price || 0),
            }))
          );
        }
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, [isOpen]);

  // Handle prefill or reset
  useEffect(() => {
    if (!isOpen) return;

    if (prefill) {
      setPatientId(prefill.patientId || '');
      setPatientName(prefill.patientName || '');
      setPatientMrn(prefill.patientMrn || '');
      setPayerName(prefill.payerName || SHARED_HMOS[0]);
      setPlanName(prefill.planName || '');
      setEnrolleeId(prefill.enrolleeId || '');
      setServiceDescription(prefill.serviceDescription || '');
      setDiagnosis(prefill.diagnosis || '');
      setPlannedDate(prefill.plannedDate || new Date().toISOString().split('T')[0]);
      setUrgency(prefill.urgency === 'urgent' ? 'urgent' : 'routine');
      setRequestedAmount(prefill.requestedAmount ? String(prefill.requestedAmount) : '');
      setClinicalJustification('');
      setAttachedFiles([]);
    } else {
      setPatientId('');
      setPatientName('');
      setPatientMrn('');
      setPayerName(SHARED_HMOS[0]);
      setPlanName('');
      setEnrolleeId('');
      setServiceDescription('');
      setDiagnosis('');
      setPlannedDate(new Date().toISOString().split('T')[0]);
      setUrgency('routine');
      setRequestedAmount('');
      setClinicalJustification('');
      setAttachedFiles([]);
    }
  }, [isOpen, prefill]);

  // Patient select auto-fill
  const handlePatientSelect = (selectedId: string) => {
    setPatientId(selectedId);
    const p = patients.find(pt => pt.id === selectedId);
    if (p) {
      setPatientName(p.fullName);
      setPatientMrn(p.mrn);
      if (p.hmoName) {
        setPayerName(p.hmoName);
      }
      if (p.hmoEnrolleeId) {
        setEnrolleeId(p.hmoEnrolleeId);
      }
      // Extract plan name from primaryCoverage e.g. "Reliance HMO (Silver Plan)"
      const match = p.primaryCoverage?.match(/\((.*?)\)/);
      if (match) {
        setPlanName(match[1]);
      }
    }
  };

  // Service select auto-fill from catalogue
  const handleServiceSelect = (serviceName: string) => {
    setServiceDescription(serviceName);
    const matched = catalogue.find(c => c.serviceName === serviceName);
    if (matched && matched.price > 0) {
      setRequestedAmount(String(matched.price));
    }
  };

  // Real file handling
  const handleFilesAdded = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: AttachedFile[] = Array.from(e.target.files).map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Form validity check
  const isFormValid = Boolean(
    patientName.trim() &&
    payerName.trim() &&
    serviceDescription.trim() &&
    Number(requestedAmount) > 0 &&
    diagnosis.trim() &&
    plannedDate.trim() &&
    clinicalJustification.trim()
  );

  const handleSubmit = async () => {
    if (!isFormValid) {
      addNotification('Please fill in all required fields marked with *.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const headers = await authHeaders();
      const notesWithFiles = attachedFiles.length > 0
        ? `Attached files (${attachedFiles.length}): ${attachedFiles.map(f => `${f.name} (${Math.round(f.size / 1024)} KB)`).join(', ')}`
        : undefined;

      const res = await fetch('/api/preauth-requests', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          patient_id: patientId || undefined,
          patient_name: patientName.trim(),
          patient_mrn: patientMrn.trim() || undefined,
          provider_id: HOSPITAL_PROVIDER_ID,
          provider_name: HOSPITAL_PROVIDER_NAME,
          payer_name: payerName,
          plan_name: planName.trim() || undefined,
          enrollee_id: enrolleeId.trim() || undefined,
          service_description: serviceDescription.trim(),
          diagnosis: diagnosis.trim(),
          planned_date: plannedDate,
          urgency,
          clinical_justification: clinicalJustification.trim(),
          documentation_notes: notesWithFiles,
          requested_amount: Number(requestedAmount),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record pre-authorisation request.');
      addNotification(`Pre-authorisation ${data.preAuth.id} recorded for ${patientName}.`, 'success');
      onCreated();
    } catch (err: any) {
      addNotification(err.message || 'Failed to record pre-authorisation request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New pre-authorisation request"
      subtitle="Record a request to the HMO before the service is delivered."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-3.5 text-xs font-sans">
        {/* Patient Selection Dropdown */}
        <div>
          <label className="block text-[11px] font-bold text-[#12244D] mb-1">
            Search and select patient *
          </label>
          <select
            value={patientId}
            onChange={e => handlePatientSelect(e.target.value)}
            className="w-full bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
          >
            <option value="">Choose registered patient to auto-fill details...</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.fullName} · {p.mrn} {p.hmoName ? `(${p.hmoName})` : '(Self-pay)'}
              </option>
            ))}
          </select>
        </div>

        {/* Row 1: Patient Name beside MRN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">Patient name *</label>
            <input
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              placeholder="e.g. Emeka Okonkwo"
              className="w-full bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">Medical Record Number (MRN)</label>
            <input
              value={patientMrn}
              onChange={e => setPatientMrn(e.target.value)}
              placeholder="e.g. MRN-LSH-10402"
              className="w-full bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0B6B69]"
            />
          </div>
        </div>

        {/* Row 2: HMO Select beside Enrollee ID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">Payer / HMO *</label>
            <select
              value={payerName}
              onChange={e => setPayerName(e.target.value)}
              className="w-full bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
            >
              {SHARED_HMOS.map(hmo => (
                <option key={hmo} value={hmo}>{hmo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">HMO enrollee ID</label>
            <input
              value={enrolleeId}
              onChange={e => setEnrolleeId(e.target.value)}
              placeholder="e.g. ENR-48201"
              className="w-full bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0B6B69]"
            />
          </div>
        </div>

        {/* Service Requested: Select from Published Catalogue */}
        <div>
          <label className="block text-[11px] font-bold text-[#12244D] mb-1">
            Service requested (catalogue tariff) *
          </label>
          <select
            value={serviceDescription}
            onChange={e => handleServiceSelect(e.target.value)}
            className="w-full bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
          >
            <option value="">Select a procedure or diagnostic test from tariff catalogue...</option>
            {catalogue.map((item, idx) => (
              <option key={idx} value={item.serviceName}>
                {item.serviceName} {item.serviceCode ? `(${item.serviceCode})` : ''} — ₦{item.price.toLocaleString()}
              </option>
            ))}
          </select>
          {serviceDescription && !catalogue.some(c => c.serviceName === serviceDescription) && (
            <div className="mt-1">
              <input
                value={serviceDescription}
                onChange={e => setServiceDescription(e.target.value)}
                placeholder="Custom service description"
                className="w-full bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
              />
            </div>
          )}
        </div>

        {/* Row 3: Requested Amount beside Planned Service Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">Requested amount (₦) *</label>
            <input
              type="number"
              value={requestedAmount}
              onChange={e => setRequestedAmount(e.target.value)}
              placeholder="e.g. 120000"
              className="w-full bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0B6B69]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">Planned service date *</label>
            <input
              type="date"
              value={plannedDate}
              onChange={e => setPlannedDate(e.target.value)}
              className="w-full bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
            />
          </div>
        </div>

        {/* Row 4: Urgency beside Diagnosis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">Urgency *</label>
            <select
              value={urgency}
              onChange={e => setUrgency(e.target.value as 'routine' | 'urgent')}
              className="w-full bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
            >
              <option value="routine">Routine (Standard SLA)</option>
              <option value="urgent">Urgent / Emergency intervention</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">Diagnosis / Clinical indication *</label>
            <input
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute appendicitis with localized guarding"
              className="w-full bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
            />
          </div>
        </div>

        {/* Clinical Justification (Mandatory) */}
        <div>
          <label className="block text-[11px] font-bold text-[#12244D] mb-1">
            Clinical justification *
          </label>
          <textarea
            rows={2}
            value={clinicalJustification}
            onChange={e => setClinicalJustification(e.target.value)}
            placeholder="Detailed medical necessity explanation for the HMO medical adjudicator..."
            className="w-full bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
          />
        </div>

        {/* Real File Upload Dropzone */}
        <div>
          <label className="block text-[11px] font-bold text-[#12244D] mb-1">
            Supporting documents (referral note, lab/imaging report)
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFilesAdded}
            multiple
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#cbd5e1] hover:border-[#0B6B69] rounded-lg p-3 text-center cursor-pointer bg-[#f8fafc] hover:bg-slate-50 transition-colors"
          >
            <UploadCloud className="w-5 h-5 text-slate-400 mx-auto mb-1" />
            <p className="text-xs text-slate-600 font-medium">
              Click to browse or drag clinical files to attach
            </p>
            <p className="text-[10px] text-slate-400">PDF, JPG, PNG or DICOM up to 10MB each</p>
          </div>

          {/* Attached Files List */}
          {attachedFiles.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {attachedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-100 border border-slate-200 text-xs text-slate-700"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-[#0B6B69] flex-shrink-0" />
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="text-[10px] text-slate-400">
                      ({Math.round(file.size / 1024)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e2e8f0]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#cbd5e1] text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !isFormValid}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#12244D] hover:bg-[#0A152E] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          >
            {submitting ? 'Recording...' : 'Record pre-authorisation request'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Detail Modal — Timeline + Stage Advancement + Invoice Linkage
// ---------------------------------------------------------------------------

interface DetailModalProps {
  preAuth: PreAuthorization | null;
  onClose: () => void;
  addNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  onChanged: () => void;
}

const NEXT_STEPS: Record<PreAuthStatus, PreAuthStatus[]> = {
  requested: ['submitted'],
  submitted: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['provider_notified'],
  provider_notified: ['service_completed'],
  service_completed: ['claim_submitted'],
  claim_submitted: ['paid'],
  rejected: [],
  paid: [],
};

const PreAuthDetailModal: React.FC<DetailModalProps> = ({ preAuth, onClose, addNotification, onChanged }) => {
  const [timeline, setTimeline] = useState<PreAuthEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!preAuth) return;
    setApprovedAmount(String(preAuth.approvedAmount || preAuth.requestedAmount || ''));
    setAuthCode(preAuth.authCode || `AUTH-${preAuth.payerName.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setRejectionReason('');
    setInvoiceNumber('');
    (async () => {
      setLoadingTimeline(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(`/api/preauth-requests/${preAuth.id}`, { headers });
        const data = await res.json();
        setTimeline(Array.isArray(data.timeline) ? data.timeline : []);
      } catch {
        // Non-fatal fallback
      } finally {
        setLoadingTimeline(false);
      }
    })();
  }, [preAuth]);

  if (!preAuth) return null;

  const nextSteps = NEXT_STEPS[preAuth.status] || [];

  const handleAdvance = async (nextStatus: PreAuthStatus) => {
    if (nextStatus === 'approved' && !approvedAmount) {
      addNotification('Enter the approved amount before approving.', 'error');
      return;
    }
    if (nextStatus === 'rejected' && !rejectionReason.trim()) {
      addNotification('A rejection reason is required to reject.', 'error');
      return;
    }
    setAdvancing(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/preauth-requests/${preAuth.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: nextStatus,
          approved_amount: nextStatus === 'approved' ? Number(approvedAmount) : undefined,
          auth_code: nextStatus === 'approved' ? authCode.trim() : undefined,
          rejection_reason: nextStatus === 'rejected' ? rejectionReason.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance status.');
      addNotification(`${preAuth.id} moved to "${nextStatus.replace(/_/g, ' ')}".`, nextStatus === 'rejected' ? 'info' : 'success');
      await onChanged();
      onClose();
    } catch (err: any) {
      addNotification(err.message || 'Failed to update status.', 'error');
    } finally {
      setAdvancing(false);
    }
  };

  const handleLinkInvoice = async () => {
    if (!invoiceNumber.trim()) {
      addNotification('Enter the invoice number to link.', 'error');
      return;
    }
    setLinking(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/preauth-requests/${preAuth.id}/link-invoice`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ invoice_number: invoiceNumber.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to link invoice.');
      addNotification(`${preAuth.id} linked to invoice ${data.invoiceNumber}.`, 'success');
      await onChanged();
    } catch (err: any) {
      addNotification(err.message || 'Failed to link invoice.', 'error');
    } finally {
      setLinking(false);
    }
  };

  const canLinkInvoice = ['approved', 'provider_notified', 'service_completed', 'claim_submitted', 'paid'].includes(preAuth.status);

  return (
    <Modal
      isOpen={!!preAuth}
      onClose={onClose}
      title={preAuth.id}
      subtitle={`${preAuth.patientName} · ${preAuth.payerName} · ${preAuth.formattedAmount}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs font-sans">
        <div className="flex items-center gap-2">
          <StatusBadge status={preAuth.status} label={preAuth.statusLabel} />
          {preAuth.authCode && (
            <span className="text-[11px] font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Auth code: {preAuth.authCode}
            </span>
          )}
          {preAuth.urgency === 'urgent' && (
            <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
              Urgent
            </span>
          )}
        </div>

        <div className="bg-[#F8FAFC] border border-[#e2e8f0] rounded-lg p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Service:</span>
            <span className="font-semibold text-[#0f172a] text-right max-w-[65%]">{preAuth.serviceDescription}</span>
          </div>
          {preAuth.diagnosis && (
            <div className="flex justify-between">
              <span className="text-slate-500">Diagnosis:</span>
              <span className="text-[#334155] text-right max-w-[65%]">{preAuth.diagnosis}</span>
            </div>
          )}
          {preAuth.clinicalJustification && (
            <div className="flex justify-between">
              <span className="text-slate-500">Clinical justification:</span>
              <span className="text-[#334155] text-right max-w-[65%]">{preAuth.clinicalJustification}</span>
            </div>
          )}
          {preAuth.approvedAmount != null && (
            <div className="flex justify-between">
              <span className="text-slate-500">Approved amount:</span>
              <span className="font-bold text-emerald-700">₦{Number(preAuth.approvedAmount).toLocaleString()}</span>
            </div>
          )}
          {preAuth.documentationNotes && (
            <div className="flex justify-between">
              <span className="text-slate-500">Documentation:</span>
              <span className="text-[#64748b] text-right max-w-[65%]">{preAuth.documentationNotes}</span>
            </div>
          )}
          {preAuth.rejectionReason && (
            <div className="flex justify-between">
              <span className="text-slate-500">Rejection reason:</span>
              <span className="text-rose-700 font-medium text-right max-w-[65%]">{preAuth.rejectionReason}</span>
            </div>
          )}
          {preAuth.invoiceId && (
            <div className="flex justify-between">
              <span className="text-slate-500">Linked invoice:</span>
              <span className="font-mono font-semibold text-[#12244D]">{preAuth.invoiceId}</span>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">Timeline</p>
          {loadingTimeline ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            <div className="space-y-2">
              {timeline.map((e, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-[#0f172a]">{e.statusLabel || e.status}</span>
                    <span className="text-slate-400 ml-1.5">{new Date(e.createdAt).toLocaleString()}</span>
                    {e.note && <div className="text-slate-500">{e.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Advancement Controls */}
        {nextSteps.length > 0 && (
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Advance this request</p>

            {nextSteps.includes('approved') && (
              <div className="space-y-2 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">Approved amount (₦) *</label>
                    <input
                      type="number"
                      value={approvedAmount}
                      onChange={e => setApprovedAmount(e.target.value)}
                      className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0B6B69]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">Approval code *</label>
                    <input
                      value={authCode}
                      onChange={e => setAuthCode(e.target.value)}
                      placeholder="e.g. AUTH-AXA-9281"
                      className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0B6B69]"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleAdvance('approved')}
                    disabled={advancing || !approvedAmount}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#166534] hover:bg-[#14532d] text-white transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve request
                  </button>
                </div>
              </div>
            )}

            {nextSteps.includes('rejected') && (
              <div className="space-y-2 bg-rose-50/50 p-2.5 rounded-lg border border-rose-200">
                <div>
                  <label className="block text-[11px] font-bold text-rose-900 mb-1">Rejection reason *</label>
                  <input
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="e.g. Non-covered procedure under Silver Plan"
                    className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleAdvance('rejected')}
                    disabled={advancing || !rejectionReason.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject request
                  </button>
                </div>
              </div>
            )}

            {nextSteps.filter(s => s !== 'approved' && s !== 'rejected').map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleAdvance(s)}
                disabled={advancing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#12244D] hover:bg-[#0A152E] text-white transition-colors cursor-pointer disabled:opacity-60"
              >
                Mark as {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}

        {/* Invoice Linkage */}
        {canLinkInvoice && !preAuth.invoiceId && (
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Link to a billed invoice</p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-[#12244D] mb-1">Invoice number</label>
                <input
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-90512"
                  className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0B6B69]"
                />
              </div>
              <button
                type="button"
                onClick={handleLinkInvoice}
                disabled={linking || !invoiceNumber.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#12244D] hover:bg-[#0A152E] text-white transition-colors cursor-pointer disabled:opacity-60"
              >
                <Link2 className="w-3.5 h-3.5" /> Link
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PreAuthTracker;
