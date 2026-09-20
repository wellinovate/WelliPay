import React, { useEffect, useMemo, useState } from 'react';
import { useWelliPay } from '../../context/WelliPayContext';
import { Modal } from '../../components/ui/Modal';
import { auth } from '../../firebase';
import { PreAuthorization, PreAuthEvent, PreAuthStatus, Patient } from '../../types';
import {
  Plus,
  Search,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Link2,
} from 'lucide-react';

const HOSPITAL_PROVIDER_NAME = 'Lagoon Specialist Hospital';

const STATUS_ORDER: PreAuthStatus[] = [
  'requested', 'submitted', 'under_review', 'approved',
  'provider_notified', 'service_completed', 'claim_submitted', 'paid', 'rejected',
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

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function StatusBadge({ status, label }: { status: PreAuthStatus; label?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_BADGE[status] || STATUS_BADGE.requested}`}>
      {label || status}
    </span>
  );
}

export const PreAuthTracker: React.FC = () => {
  const { addNotification } = useWelliPay();

  const [preAuths, setPreAuths] = useState<PreAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadPreAuths = async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/preauth-requests', { headers });
      const data = await res.json();
      setPreAuths(Array.isArray(data.preAuths) ? data.preAuths : []);
    } catch {
      addNotification('Failed to load pre-authorization requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreAuths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availablePayers = useMemo(() => {
    const set = new Set<string>();
    preAuths.forEach(p => { if (p.payerName) set.add(p.payerName); });
    return Array.from(set).sort();
  }, [preAuths]);

  const filtered = useMemo(() => {
    return preAuths.filter(p => {
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${p.id} ${p.patientName} ${p.patientMrn || ''} ${p.payerName} ${p.serviceDescription}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [preAuths, statusFilter, search]);

  const counts = useMemo(() => {
    const awaitingDecision = preAuths.filter(p => ['requested', 'submitted', 'under_review'].includes(p.status)).length;
    const approved = preAuths.filter(p => ['approved', 'provider_notified', 'service_completed'].includes(p.status)).length;
    const settled = preAuths.filter(p => ['claim_submitted', 'paid'].includes(p.status)).length;
    const rejected = preAuths.filter(p => p.status === 'rejected').length;
    return { awaitingDecision, approved, settled, rejected };
  }, [preAuths]);

  const selected = preAuths.find(p => p.id === selectedId) || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#12244D]">
            Pre-Authorizations
          </h1>
          <p className="text-sm text-[#475569] mt-1 font-sans">
            Track a request from submission to payer decision to billed claim — instead of a patient asking whether their HMO has approved it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#12244D] hover:bg-[#0A152E] text-white transition-all shadow-xs cursor-pointer self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          New Pre-Authorization Request
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle">
          <div className="font-sans text-3xl font-extrabold text-[#12244D] tracking-tight">{counts.awaitingDecision}</div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">Awaiting Decision</div>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle">
          <div className="font-sans text-3xl font-extrabold text-[#166534] tracking-tight">{counts.approved}</div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">Approved · In Progress</div>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle">
          <div className="font-sans text-3xl font-extrabold text-[#166534] tracking-tight">{counts.settled}</div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">Claim Submitted / Paid</div>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle">
          <div className="font-sans text-3xl font-extrabold text-rose-700 tracking-tight">{counts.rejected}</div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">Rejected</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-heading text-lg font-bold text-[#12244D]">Requests</h4>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-[#334155] focus:outline-none focus:border-[#0B6B69] shadow-xs"
            >
              <option value="All">Status: All</option>
              {STATUS_ORDER.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search request, patient, MRN..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg w-56 text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0B6B69] shadow-xs"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-subtle overflow-hidden">
          <table className="broadsheet-table">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th style={{ width: '95px' }}>Request ID</th>
                <th style={{ width: '170px' }}>Patient</th>
                <th style={{ width: '130px' }}>Payer</th>
                <th>Service</th>
                <th style={{ width: '110px' }} className="text-right">Requested</th>
                <th style={{ width: '150px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400 inline" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-xs text-slate-500">No pre-authorization requests match this filter.</td></tr>
              ) : (
                filtered.map(p => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#f8fafc] cursor-pointer transition-colors"
                    onClick={() => setSelectedId(p.id)}
                  >
                    <td className="font-mono text-xs text-[#12244D] font-bold">{p.id}</td>
                    <td className="font-sans text-xs text-[#0f172a]">
                      <span className="font-semibold block text-sm">{p.patientName}</span>
                      <span className="block text-[11px] font-mono text-[#64748b]">{p.patientMrn || '—'}</span>
                    </td>
                    <td className="font-sans text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#f1f5f9] text-[#334155] border border-[#e2e8f0]">
                        {p.payerName}
                      </span>
                    </td>
                    <td className="font-sans text-xs text-[#334155]">
                      <span className="line-clamp-1" title={p.serviceDescription}>{p.serviceDescription}</span>
                    </td>
                    <td className="font-sans font-bold text-sm text-[#12244D] text-right">{p.formattedAmount}</td>
                    <td><StatusBadge status={p.status} label={p.statusLabel} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreatePreAuthModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        availablePayers={availablePayers}
        addNotification={addNotification}
        onCreated={async () => { await loadPreAuths(); setShowCreateModal(false); }}
      />

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
// Create modal
// ---------------------------------------------------------------------------

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePayers: string[];
  addNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  onCreated: () => void;
}

const CreatePreAuthModal: React.FC<CreateModalProps> = ({ isOpen, onClose, availablePayers, addNotification, onCreated }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientMrn, setPatientMrn] = useState('');
  const [payerName, setPayerName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [clinicalJustification, setClinicalJustification] = useState('');
  const [documentationNotes, setDocumentationNotes] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPatientId(''); setPatientName(''); setPatientMrn(''); setPayerName('');
    setServiceDescription(''); setClinicalJustification(''); setDocumentationNotes(''); setRequestedAmount('');
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch('/api/patients', { headers });
        const data = await res.json();
        setPatients(Array.isArray(data.patients) ? data.patients : []);
      } catch {
        // Non-fatal — the form still works with free-text patient entry.
      }
    })();
  }, [isOpen]);

  const handlePatientSelect = (id: string) => {
    setPatientId(id);
    const p = patients.find(pt => pt.id === id);
    if (p) {
      setPatientName(p.fullName);
      setPatientMrn(p.mrn);
      if (p.hmoName) setPayerName(p.hmoName);
    }
  };

  const handleSubmit = async () => {
    if (!patientName || !payerName || !serviceDescription || !requestedAmount) {
      addNotification('Patient, payer, service, and requested amount are required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/preauth-requests', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          patient_id: patientId || undefined,
          patient_name: patientName,
          patient_mrn: patientMrn || undefined,
          provider_name: HOSPITAL_PROVIDER_NAME,
          payer_name: payerName,
          service_description: serviceDescription,
          clinical_justification: clinicalJustification || undefined,
          documentation_notes: documentationNotes || undefined,
          requested_amount: Number(requestedAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit pre-authorization request.');
      addNotification(`Pre-authorization ${data.preAuth.id} requested for ${patientName}.`, 'success');
      onCreated();
    } catch (err: any) {
      addNotification(err.message || 'Failed to submit pre-authorization request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Pre-Authorization Request"
      subtitle="Submit a request to the payer before the service is delivered."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold text-[#12244D] mb-1">Patient</label>
          <select
            value={patientId}
            onChange={e => handlePatientSelect(e.target.value)}
            className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
          >
            <option value="">Select a patient, or type below...</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.fullName} · {p.mrn}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">Patient name *</label>
            <input
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">MRN</label>
            <input
              value={patientMrn}
              onChange={e => setPatientMrn(e.target.value)}
              className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0B6B69]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#12244D] mb-1">Payer / HMO *</label>
          <input
            list="preauth-payer-options"
            value={payerName}
            onChange={e => setPayerName(e.target.value)}
            placeholder="e.g. Reliance HMO"
            className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
          />
          <datalist id="preauth-payer-options">
            {availablePayers.map(p => <option key={p} value={p} />)}
          </datalist>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#12244D] mb-1">Service requested *</label>
          <input
            value={serviceDescription}
            onChange={e => setServiceDescription(e.target.value)}
            placeholder="e.g. MRI — Lumbar Spine"
            className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#12244D] mb-1">Requested amount (₦) *</label>
          <input
            type="number"
            value={requestedAmount}
            onChange={e => setRequestedAmount(e.target.value)}
            className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0B6B69]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#12244D] mb-1">Clinical justification</label>
          <textarea
            rows={2}
            value={clinicalJustification}
            onChange={e => setClinicalJustification(e.target.value)}
            placeholder="Why this service is medically necessary"
            className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#12244D] mb-1">Supporting documentation</label>
          <textarea
            rows={2}
            value={documentationNotes}
            onChange={e => setDocumentationNotes(e.target.value)}
            placeholder="Reference to attached documents, referral letters, etc. (no file upload yet — record what was sent and where)"
            className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#166534] hover:bg-[#14532d] text-white transition-colors disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Detail modal — timeline + status transitions + link to invoice
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
  const [rejectionReason, setRejectionReason] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!preAuth) return;
    setApprovedAmount(String(preAuth.requestedAmount || ''));
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
        // Non-fatal — the rest of the detail view still works.
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
      addNotification('A rejection reason is required.', 'error');
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
          rejection_reason: nextStatus === 'rejected' ? rejectionReason : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status.');
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
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={preAuth.status} label={preAuth.statusLabel} />
          {preAuth.authCode && (
            <span className="text-[11px] font-mono text-slate-500">Auth code: {preAuth.authCode}</span>
          )}
        </div>

        <div className="bg-[#F8FAFC] border border-[#e2e8f0] rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Service:</span>
            <span className="font-semibold text-[#0f172a] text-right max-w-[65%]">{preAuth.serviceDescription}</span>
          </div>
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
          {preAuth.rejectionReason && (
            <div className="flex justify-between">
              <span className="text-slate-500">Rejection reason:</span>
              <span className="text-rose-700 text-right max-w-[65%]">{preAuth.rejectionReason}</span>
            </div>
          )}
          {preAuth.invoiceId && (
            <div className="flex justify-between">
              <span className="text-slate-500">Linked invoice:</span>
              <span className="font-mono font-semibold text-[#12244D]">{preAuth.invoiceId}</span>
            </div>
          )}
        </div>

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

        {nextSteps.length > 0 && (
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Advance this request</p>

            {nextSteps.includes('approved') && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-[#12244D] mb-1">Approved amount (₦)</label>
                  <input
                    type="number"
                    value={approvedAmount}
                    onChange={e => setApprovedAmount(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0B6B69]"
                  />
                </div>
                <button
                  onClick={() => handleAdvance('approved')}
                  disabled={advancing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#166534] hover:bg-[#14532d] text-white transition-colors disabled:opacity-60"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
              </div>
            )}

            {nextSteps.includes('rejected') && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-[#12244D] mb-1">Rejection reason</label>
                  <input
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
                  />
                </div>
                <button
                  onClick={() => handleAdvance('rejected')}
                  disabled={advancing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white transition-colors disabled:opacity-60"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            )}

            {nextSteps.filter(s => s !== 'approved' && s !== 'rejected').map(s => (
              <button
                key={s}
                onClick={() => handleAdvance(s)}
                disabled={advancing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#12244D] hover:bg-[#0A152E] text-white transition-colors disabled:opacity-60"
              >
                Mark as {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}

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
                onClick={handleLinkInvoice}
                disabled={linking}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#12244D] hover:bg-[#0A152E] text-white transition-colors disabled:opacity-60"
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
