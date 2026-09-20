import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Loader2, Plus, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { auth } from '../../firebase';
import { HMOClaim } from '../../types';

interface RemittanceLine {
  id: string;
  remittance_id: string;
  claim_id: string;
  expected_amount: string | number;
  paid_amount: string | number;
  variance: string | number;
  variance_reason: string | null;
  patient_name?: string;
  provider?: string;
  claim_payer?: string;
}

interface Remittance {
  id: string;
  payer: string;
  amount_received: string | number;
  reference: string | null;
  received_at: string;
  status: string;
  notes: string | null;
  lines: RemittanceLine[];
}

interface RemittanceMatchingModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvedClaims: HMOClaim[];
  availablePayers: string[];
  addNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  refreshClaims: () => Promise<void>;
}

type View = 'list' | 'create' | 'match';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    unmatched: 'bg-slate-100 text-slate-700 border-slate-200',
    partially_matched: 'bg-amber-50 text-amber-800 border-amber-200',
    fully_matched: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };
  const label: Record<string, string> = {
    unmatched: 'Unmatched',
    partially_matched: 'Partially matched',
    fully_matched: 'Fully matched',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${map[status] || map.unmatched}`}>
      {label[status] || status}
    </span>
  );
}

export const RemittanceMatchingModal: React.FC<RemittanceMatchingModalProps> = ({
  isOpen,
  onClose,
  approvedClaims,
  availablePayers,
  addNotification,
  refreshClaims,
}) => {
  const [view, setView] = useState<View>('list');
  const [loading, setLoading] = useState(false);
  const [remittances, setRemittances] = useState<Remittance[]>([]);
  const [activeRemittance, setActiveRemittance] = useState<Remittance | null>(null);

  // Create-remittance form state
  const [formPayer, setFormPayer] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formReceivedAt, setFormReceivedAt] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Match-line form state
  const [matchClaimId, setMatchClaimId] = useState('');
  const [matchPaidAmount, setMatchPaidAmount] = useState('');
  const [matchVarianceReason, setMatchVarianceReason] = useState('');
  const [matching, setMatching] = useState(false);

  const loadRemittances = async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/hmo-remittances', { headers });
      const data = await res.json();
      setRemittances(Array.isArray(data.remittances) ? data.remittances : []);
    } catch {
      addNotification('Failed to load remittances.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setView('list');
      setActiveRemittance(null);
      loadRemittances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const resetCreateForm = () => {
    setFormPayer('');
    setFormAmount('');
    setFormReference('');
    setFormReceivedAt('');
    setFormNotes('');
  };

  const handleCreateRemittance = async () => {
    if (!formPayer || !formAmount) {
      addNotification('Payer and amount received are required.', 'error');
      return;
    }
    setCreating(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/hmo-remittances', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          payer: formPayer,
          amount_received: Number(formAmount),
          reference: formReference || undefined,
          received_at: formReceivedAt || undefined,
          notes: formNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create remittance.');
      }
      addNotification(`Remittance ${data.remittance.id} recorded for ${formPayer}.`, 'success');
      resetCreateForm();
      await loadRemittances();
      setActiveRemittance({ ...data.remittance, lines: [] });
      setView('match');
    } catch (err: any) {
      addNotification(err.message || 'Failed to create remittance.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const openMatchView = (remittance: Remittance) => {
    setActiveRemittance(remittance);
    setMatchClaimId('');
    setMatchPaidAmount('');
    setMatchVarianceReason('');
    setView('match');
  };

  const eligibleClaims = approvedClaims.filter(
    c => !activeRemittance || c.payer === activeRemittance.payer
  );

  const selectedClaim = eligibleClaims.find(c => c.id === matchClaimId);
  const needsVarianceReason =
    !!selectedClaim && matchPaidAmount !== '' && Number(matchPaidAmount) !== Number(selectedClaim.amount);

  const handleMatchLine = async () => {
    if (!activeRemittance || !matchClaimId || matchPaidAmount === '') {
      addNotification('Select a claim and enter the amount paid.', 'error');
      return;
    }
    if (needsVarianceReason && !matchVarianceReason.trim()) {
      addNotification('A variance reason is required when the amount paid differs from the claim.', 'error');
      return;
    }
    setMatching(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/hmo-remittances/${activeRemittance.id}/lines`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          claim_id: matchClaimId,
          paid_amount: Number(matchPaidAmount),
          variance_reason: needsVarianceReason ? matchVarianceReason : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to match claim to remittance.');
      }
      addNotification(
        `${matchClaimId} matched: ${data.claim.status === 'adjusted' ? 'adjusted (short-paid)' : 'paid in full'}.`,
        data.claim.status === 'adjusted' ? 'info' : 'success'
      );
      setMatchClaimId('');
      setMatchPaidAmount('');
      setMatchVarianceReason('');
      await refreshClaims();
      const refreshed = await fetch('/api/hmo-remittances', { headers: await authHeaders() }).then(r => r.json());
      const updated = (refreshed.remittances || []).find((r: Remittance) => r.id === activeRemittance.id);
      if (updated) {
        setActiveRemittance(updated);
        setRemittances(refreshed.remittances);
      }
    } catch (err: any) {
      addNotification(err.message || 'Failed to match claim to remittance.', 'error');
    } finally {
      setMatching(false);
    }
  };

  const matchedExpected = activeRemittance
    ? activeRemittance.lines.reduce((sum, l) => sum + Number(l.expected_amount), 0)
    : 0;
  const remainingToMatch = activeRemittance
    ? Number(activeRemittance.amount_received) - matchedExpected
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        view === 'list'
          ? 'HMO Remittances'
          : view === 'create'
          ? 'Record a Remittance'
          : `Match Claims: ${activeRemittance?.id}`
      }
      subtitle={
        view === 'match' && activeRemittance
          ? `${activeRemittance.payer} · ₦${Number(activeRemittance.amount_received).toLocaleString()} received`
          : 'Manual entry — enter what the HMO paid, from whichever document or portal it arrived in.'
      }
      maxWidth="max-w-2xl"
    >
      {view === 'list' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setView('create')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#12244D] hover:bg-[#0A152E] text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Remittance
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : remittances.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              No remittances recorded yet. Record one to start matching it against approved claims.
            </p>
          ) : (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {remittances.map(r => (
                <button
                  key={r.id}
                  onClick={() => openMatchView(r)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-[#12244D]">{r.id}</div>
                    <div className="text-xs text-slate-600">
                      {r.payer} · ₦{Number(r.amount_received).toLocaleString()}
                      {r.reference ? ` · ${r.reference}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {statusBadge(r.status)}
                    <span className="text-[11px] text-slate-400">{r.lines.length} claim(s) matched</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'create' && (
        <div className="space-y-3">
          <button
            onClick={() => setView('list')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#12244D]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to remittances
          </button>

          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">Payer *</label>
            <input
              list="payer-options"
              value={formPayer}
              onChange={e => setFormPayer(e.target.value)}
              placeholder="e.g. Reliance HMO"
              className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
            />
            <datalist id="payer-options">
              {availablePayers.map(p => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">Amount received (₦) *</label>
            <input
              type="number"
              value={formAmount}
              onChange={e => setFormAmount(e.target.value)}
              placeholder="e.g. 450000"
              className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0B6B69]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">Reference / narration</label>
            <input
              value={formReference}
              onChange={e => setFormReference(e.target.value)}
              placeholder="e.g. bank transfer reference or advice number"
              className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">Date received</label>
            <input
              type="date"
              value={formReceivedAt}
              onChange={e => setFormReceivedAt(e.target.value)}
              className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#12244D] mb-1">Notes</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="Optional — e.g. which spreadsheet, PDF advice or portal export this came from"
              className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleCreateRemittance}
              disabled={creating}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#166534] hover:bg-[#14532d] text-white transition-colors disabled:opacity-60"
            >
              {creating ? 'Recording...' : 'Record Remittance'}
            </button>
          </div>
        </div>
      )}

      {view === 'match' && activeRemittance && (
        <div className="space-y-4">
          <button
            onClick={() => { setView('list'); loadRemittances(); }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#12244D]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to remittances
          </button>

          <div className="bg-[#F8FAFC] border border-[#e2e8f0] rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Amount received:</span>
              <span className="font-bold text-[#12244D]">₦{Number(activeRemittance.amount_received).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Matched so far (expected):</span>
              <span className="font-semibold text-[#0f172a]">₦{matchedExpected.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Unmatched balance:</span>
              <span className={`font-semibold ${remainingToMatch === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                ₦{remainingToMatch.toLocaleString()}
              </span>
            </div>
          </div>

          {activeRemittance.lines.length > 0 && (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {activeRemittance.lines.map(l => (
                <div key={l.id} className="px-3 py-2 text-xs flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-[#12244D]">{l.claim_id}</span>
                    <span className="text-slate-500 ml-1.5">{l.patient_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">₦{Number(l.paid_amount).toLocaleString()}</span>
                    {Number(l.variance) === 0 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span title={l.variance_reason || ''}>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Match another claim
            </p>

            {eligibleClaims.length === 0 ? (
              <p className="text-xs text-slate-500">
                No approved, unmatched claims for {activeRemittance.payer} to match against this remittance.
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-[#12244D] mb-1">Claim</label>
                  <select
                    value={matchClaimId}
                    onChange={e => {
                      const id = e.target.value;
                      setMatchClaimId(id);
                      const claim = eligibleClaims.find(c => c.id === id);
                      setMatchPaidAmount(claim ? String(claim.amount) : '');
                      setMatchVarianceReason('');
                    }}
                    className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
                  >
                    <option value="">Select a claim...</option>
                    {eligibleClaims.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.id} · {c.patientName || 'Patient'} · {c.formattedAmount}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#12244D] mb-1">Amount paid (₦)</label>
                  <input
                    type="number"
                    value={matchPaidAmount}
                    onChange={e => setMatchPaidAmount(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0B6B69]"
                  />
                </div>

                {needsVarianceReason && (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 mb-1">
                      Variance reason (required — amount paid differs from the claim)
                    </label>
                    <textarea
                      rows={2}
                      value={matchVarianceReason}
                      onChange={e => setMatchVarianceReason(e.target.value)}
                      placeholder="e.g. diagnostic code mismatch, partial pre-auth approval..."
                      className="w-full bg-white border border-amber-300 rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleMatchLine}
                    disabled={matching || !matchClaimId}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#166534] hover:bg-[#14532d] text-white transition-colors disabled:opacity-60"
                  >
                    {matching ? 'Matching...' : 'Match Claim'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
