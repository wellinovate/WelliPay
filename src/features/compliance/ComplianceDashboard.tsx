import React, { useEffect, useState } from 'react';
import { auth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useWelliPay } from '../../context/WelliPayContext';
import {
  ComplianceSummary,
  ComplianceFlaggedInvoice,
  ComplianceThreshold,
} from '../../types';
import {
  ShieldCheck,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Clock,
  XCircle,
  ArrowLeftRight,
  CheckCircle2,
  X,
  FileText,
  ExternalLink,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const FLAG_LABELS: Record<string, string> = {
  price_mismatch: 'Tariff mismatch vs catalogue',
  duplicate_charge: 'Duplicate charge',
  missing_preauth: 'Missing pre-authorisation',
  copay_exceeds_plan_rule: 'Copay does not match plan rule',
  billed_self_pay_despite_coverage: 'Billed self-pay despite HMO coverage on file',
  membership_not_verified: 'HMO membership not verified',
  authorized_amount_mismatch: 'Bill differs from pre-authorised amount',
  tariff_unknown: 'No catalogue tariff link (info only)',
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer dev-token' }),
  };
}

function formatThreshold(t: ComplianceThreshold | null, code: string): string {
  if (!t) return 'None';
  if (t.unit === 'NGN') {
    if (code === 'duplicate_charge') return `> ₦${t.value.toLocaleString()} (Critical)`;
    if (t.value === 0) return 'Exact match (₦0)';
    return `₦${t.value.toLocaleString()}`;
  }
  if (t.unit === 'percent') return `${t.value}%`;
  if (t.unit === 'hours') return `${t.value}h`;
  return `${t.value} ${t.unit}`;
}

export const ComplianceDashboard: React.FC = () => {
  const { user } = useAuth();
  const { setActiveTab, addNotification } = useWelliPay();

  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'unresolved' | 'resolved' | 'all'>('unresolved');
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});

  // Modals
  const [compareInvoice, setCompareInvoice] = useState<ComplianceFlaggedInvoice | null>(null);
  const [resolveInvoice, setResolveInvoice] = useState<ComplianceFlaggedInvoice | null>(null);
  const [resolutionReason, setResolutionReason] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/compliance/summary', { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load compliance summary.');
      }
      setSummary(data as ComplianceSummary);
    } catch (err: any) {
      setError(err.message || 'Failed to load compliance summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleExpand = (invoiceNumber: string) => {
    setExpandedInvoices(prev => ({
      ...prev,
      [invoiceNumber]: !prev[invoiceNumber],
    }));
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveInvoice) return;
    if (!resolutionReason.trim()) {
      setResolveError('A clinical or administrative resolution reason is required.');
      return;
    }

    setResolving(true);
    setResolveError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/compliance/invoices/${resolveInvoice.invoiceNumber}/resolve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reason: resolutionReason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resolve compliance flags.');
      }

      addNotification(`Invoice ${resolveInvoice.invoiceNumber} flags marked as resolved`, 'success');
      setResolveInvoice(null);
      setResolutionReason('');
      await load();
    } catch (err: any) {
      setResolveError(err.message || 'Error recording resolution.');
    } finally {
      setResolving(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#0B6B69]" />
        <span className="text-sm font-medium">Running provider compliance audit across all invoices…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm">
        <div className="font-bold mb-1">Compliance Audit Error</div>
        <div>{error}</div>
        <button
          onClick={load}
          className="mt-3 px-3 py-1 bg-rose-600 text-white font-semibold rounded-md text-xs hover:bg-rose-700 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const filteredInvoices = summary.worstInvoices.filter(inv => {
    if (filter === 'unresolved') return !inv.isResolved;
    if (filter === 'resolved') return inv.isResolved;
    return true;
  });

  const resolvedCount = summary.worstInvoices.filter(inv => inv.isResolved).length;
  const unresolvedCount = summary.worstInvoices.filter(inv => !inv.isResolved).length;

  const formattedComputedTime = summary.generatedAt
    ? new Date(summary.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Just now';

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header & Caveat */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Provider compliance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auditing Lagoon Specialist Hospital bills against published catalogues, payer plan rules, and pre-authorisation records. Internal compliance audit — not a live payer feed.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            Period: All active invoices · Computed {formattedComputedTime}
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0B6B69]' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Single-line Summary Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-2 flex-wrap">
          <ShieldCheck className="w-4 h-4 text-[#0B6B69] shrink-0" />
          <span>
            <span className="font-bold text-emerald-700">{summary.cleanCount}</span> of <span className="font-bold text-slate-900">{summary.invoiceCount}</span> invoices clean
          </span>
          <span className="text-slate-300">·</span>
          <span>
            <span className={`font-bold ${summary.unresolvedFlaggedCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{summary.unresolvedFlaggedCount}</span> flagged
          </span>
          <span className="text-slate-300">·</span>
          <span>
            <span className={`font-bold ${summary.criticalInvoiceCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{summary.criticalInvoiceCount}</span> critical
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Lagoon Specialist Hospital (PRV-LAG-01)
        </div>
      </div>

      {/* Rules Table & Pre-Authorisation Turnaround */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Exact 7 Compliance Rules Table */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0B6B69]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Compliance Audit Rules</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">7 Active Integrity Checks</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-3">Rule & Description</th>
                    <th className="py-2.5 px-3">Threshold</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3 text-right">Checked</th>
                    <th className="py-2.5 px-3 text-right">Findings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {summary.rules.map(rule => (
                    <tr key={rule.code} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{rule.name}</div>
                        <div className="text-[11px] text-slate-500 leading-snug max-w-sm">{rule.description}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {formatThreshold(rule.threshold, rule.code)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          rule.severity === 'critical'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {rule.severity === 'critical' ? 'Critical' : 'Warning'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-medium">
                        {rule.invoicesChecked}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                        {rule.flagsFound > 0 ? (
                          <span className="font-semibold text-amber-900">
                            {rule.flagsFound} found
                            {rule.resolvedCount > 0 && (
                              <span className="text-emerald-700 ml-1">({rule.resolvedCount} res.)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">0 found</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>All active inpatient, outpatient, and recovery bills evaluated.</span>
            <span className="font-mono text-[10px] text-slate-400">Algorithm: Cross-Invoice Order ID & Tariffs</span>
          </div>
        </div>

        {/* Pre-Authorisation Turnaround Card */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                <Clock className="w-4 h-4 text-[#0B6B69]" />
                Pre-authorisation turnaround
              </div>
              <button
                onClick={() => setActiveTab('preauth')}
                className="text-[11px] font-semibold text-[#0B6B69] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Log <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {summary.preAuth.totalRequests === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <Clock className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="font-medium text-slate-700">No pre-authorisation requests yet</p>
                <p className="text-[11px] text-slate-400">
                  Requests submitted for HMO procedures over plan thresholds will appear here.
                </p>
                <button
                  onClick={() => setActiveTab('preauth')}
                  className="mt-2 text-xs font-semibold text-[#0B6B69] border border-[#0B6B69]/30 rounded-md px-3 py-1 hover:bg-[#0B6B69]/5 transition-colors cursor-pointer"
                >
                  Go to Pre-authorisations
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-[11px] text-slate-500 mb-0.5">Payer adjudication status</div>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {summary.preAuth.decidedCount} decided of {summary.preAuth.totalRequests} submitted
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
                    <div className="text-[11px] text-slate-500">Approved</div>
                    <div className="font-mono font-bold text-emerald-700 text-lg">
                      {summary.preAuth.approvedCount}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
                    <div className="text-[11px] text-slate-500">Rejection rate</div>
                    <div className="font-mono font-bold text-slate-800 text-lg">
                      {summary.preAuth.rejectionRate != null ? `${summary.preAuth.rejectionRate}%` : '—'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-white col-span-2">
                    <div className="text-[11px] text-slate-500">Avg. turnaround time</div>
                    <div className="font-mono font-bold text-slate-800 text-lg">
                      {summary.preAuth.avgTurnaroundHours != null ? `${summary.preAuth.avgTurnaroundHours}h` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Benchmarked vs HMO SLA (24h)</span>
            <span className="text-emerald-700 font-semibold">Active</span>
          </div>
        </div>
      </div>

      {/* Invoices Needing Attention Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Invoices needing attention ({unresolvedCount})
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setFilter('unresolved')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                filter === 'unresolved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Unresolved ({unresolvedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('resolved')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                filter === 'resolved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              All flagged ({summary.worstInvoices.length})
            </button>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
            <div className="font-semibold text-slate-800">No invoices in this view</div>
            <p className="text-xs text-slate-500 max-w-sm">
              {filter === 'unresolved'
                ? 'All flagged invoices have either been resolved or corrected.'
                : 'No invoices currently match the selected resolution filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredInvoices.map(inv => {
              const isExpanded = !!expandedInvoices[inv.invoiceNumber];
              return (
                <div key={inv.invoiceNumber} className="hover:bg-slate-50/50 transition-colors">
                  <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {inv.isResolved ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : inv.worstSeverity === 'critical' ? (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 font-mono">{inv.invoiceNumber}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs font-semibold text-slate-800">{inv.patientName}</span>
                          {inv.patientMrn && (
                            <span className="text-[11px] font-mono text-slate-400">({inv.patientMrn})</span>
                          )}
                          <span className="text-slate-300">·</span>
                          <span className="text-[11px] text-slate-600 font-medium">
                            {inv.payerName || 'Self-pay'}
                            {inv.planName ? ` (${inv.planName})` : ''}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-slate-800">
                            ₦{inv.totalAmount.toLocaleString()}
                          </span>
                          <span>·</span>
                          <span>Billed: {inv.date}</span>
                          <span>·</span>
                          <span className={inv.isResolved ? 'text-emerald-700 font-medium' : inv.worstSeverity === 'critical' ? 'text-rose-700 font-medium' : 'text-amber-700 font-medium'}>
                            {inv.flags.length} flag{inv.flags.length !== 1 ? 's' : ''}
                          </span>
                          {inv.isResolved && inv.resolution && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Resolved by {inv.resolution.resolvedBy}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setCompareInvoice(inv)}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
                        title="View side-by-side benchmark comparison"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-[#0B6B69]" />
                        Compare
                      </button>

                      {!inv.isResolved ? (
                        <button
                          type="button"
                          onClick={() => {
                            setResolveInvoice(inv);
                            setResolutionReason('');
                            setResolveError('');
                          }}
                          className="flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md px-2.5 py-1.5 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Mark this invoice's flags as clinically or administratively resolved"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          Resolve
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          Resolved
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleExpand(inv.invoiceNumber)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
                        title={isExpanded ? 'Hide details' : 'Show details'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Flags List */}
                  {isExpanded && (
                    <div className="px-4 pb-3.5 pt-1 pl-11 bg-slate-50/70 border-t border-slate-100 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Flags on this bill:
                      </div>
                      {inv.flags.map((flag, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border text-xs leading-relaxed space-y-1 ${
                            flag.severity === 'critical'
                              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                              : 'bg-amber-50/70 border-amber-200 text-amber-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5">
                              {flag.severity === 'critical' ? (
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              )}
                              {FLAG_LABELS[flag.code] || flag.name || flag.code}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                              flag.severity === 'critical'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              {flag.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700">{flag.message}</p>
                          {flag.matchingRecord && (
                            <div className="text-[11px] font-mono text-slate-600 bg-white/70 px-2 py-1 rounded border border-slate-200/50">
                              <span className="font-semibold text-slate-800">Benchmark reference:</span> {flag.matchingRecord.label}
                            </div>
                          )}
                        </div>
                      ))}

                      {inv.isResolved && inv.resolution && (
                        <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            Audit Trail: Marked resolved by {inv.resolution.resolvedBy}
                          </div>
                          <div className="text-[11px] text-emerald-800">
                            <span className="font-semibold">Rationale:</span> {inv.resolution.reason}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-mono">
                            Recorded at: {new Date(inv.resolution.resolvedAt).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Side-by-Side Compare Modal */}
      {compareInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-[#0B6B69]" />
                  Audit comparison: {compareInvoice.invoiceNumber}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Comparing billed hospital invoice against verifiable benchmark records (published tariffs, plan rules, and pre-authorisation files).
                </p>
              </div>
              <button
                onClick={() => setCompareInvoice(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body - 2 Columns */}
            <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Billed Invoice Details */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Billed Hospital Invoice
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {compareInvoice.invoiceNumber}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient:</span>
                    <span className="font-semibold text-slate-900">{compareInvoice.patientName}</span>
                  </div>
                  {compareInvoice.patientMrn && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">MRN:</span>
                      <span className="font-mono text-slate-700">{compareInvoice.patientMrn}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payer / Plan:</span>
                    <span className="text-slate-800">
                      {compareInvoice.payerName || 'Self-pay'}
                      {compareInvoice.planName ? ` (${compareInvoice.planName})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Date:</span>
                    <span className="text-slate-800">{compareInvoice.date}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="font-bold text-slate-700">Total Billed:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ₦{compareInvoice.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Constituent Orders / Line Items */}
                <div className="pt-2">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Constituent Orders & Charges ({compareInvoice.constituentOrders?.length || 0})
                  </div>
                  {compareInvoice.constituentOrders && compareInvoice.constituentOrders.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {compareInvoice.constituentOrders.map((ord, idx) => (
                        <div
                          key={ord.id || idx}
                          className="bg-white p-2 rounded border border-slate-200 text-xs flex items-center justify-between shadow-2xs"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">{ord.serviceType}</div>
                            <div className="text-[10px] font-mono text-slate-400">Order ID: {ord.id}</div>
                          </div>
                          <div className="font-mono font-bold text-slate-900">
                            ₦{ord.amount.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">No constituent orders recorded.</div>
                  )}
                </div>
              </div>

              {/* Right Column: Benchmark / Conflicting Records */}
              <div className="bg-[#f0fdfa] rounded-xl p-4 border border-[#0B6B69]/30 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#0B6B69]/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0B6B69]">
                    Benchmark / Conflicting Records
                  </span>
                  <span className="text-[11px] font-semibold text-[#0B6B69]">
                    {compareInvoice.flags.length} Flag{compareInvoice.flags.length !== 1 ? 's' : ''} Raised
                  </span>
                </div>

                <div className="space-y-3">
                  {compareInvoice.flags.map((flag, idx) => {
                    const match = flag.matchingRecord;
                    return (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-lg border border-[#0B6B69]/20 shadow-2xs text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            {flag.severity === 'critical' ? (
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            )}
                            {flag.name || FLAG_LABELS[flag.code] || flag.code}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            flag.severity === 'critical'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {flag.severity}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {flag.message}
                        </p>

                        {/* Detailed matching benchmark rendering */}
                        {match && (
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1.5 text-[11px]">
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              <span>Source:</span>
                              <span className="font-mono text-[#0B6B69] font-medium">{match.label}</span>
                            </div>

                            {/* Catalogue price comparison */}
                            {match.details.type === 'catalogue' && (
                              <div className="space-y-1 pt-1 border-t border-slate-200">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Catalogue Tariff:</span>
                                  <span className="font-mono font-bold text-emerald-700">
                                    ₦{match.details.cataloguePrice.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Billed Invoice Rate:</span>
                                  <span className="font-mono font-bold text-rose-700">
                                    ₦{match.details.billedPrice.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between font-bold pt-1 border-t border-slate-100">
                                  <span className="text-slate-700">Discrepancy:</span>
                                  <span className="text-amber-800 font-mono">
                                    +₦{match.details.variance.toLocaleString()} overbilled
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Duplicate order collision */}
                            {match.details.type === 'line_item' && (
                              <div className="space-y-1 pt-1 border-t border-slate-200">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Duplicate Order ID:</span>
                                  <span className="font-mono font-bold text-rose-800">
                                    {match.details.duplicateOrderId}
                                  </span>
                                </div>
                                {match.details.duplicateInvoiceNumber && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Colliding Invoice:</span>
                                    <span className="font-mono text-slate-800">
                                      {match.details.duplicateInvoiceNumber}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Service:</span>
                                  <span className="text-slate-800">{match.details.serviceType}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Billed Amount:</span>
                                  <span className="font-mono font-bold text-slate-900">
                                    ₦{match.details.billedAmount.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Plan rule / Pre-auth threshold */}
                            {match.details.type === 'plan_rule' && (
                              <div className="space-y-1 pt-1 border-t border-slate-200">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Payer Plan:</span>
                                  <span className="font-semibold text-slate-800">{match.details.payerName} ({match.details.planName})</span>
                                </div>
                                {match.details.threshold !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Pre-auth Threshold:</span>
                                    <span className="font-mono font-bold text-slate-900">
                                      ₦{match.details.threshold.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                <div className="text-slate-600 italic mt-1">
                                  {match.details.ruleDescription}
                                </div>
                              </div>
                            )}

                            {/* Patient active coverage */}
                            {match.details.type === 'patient_record' && (
                              <div className="space-y-1 pt-1 border-t border-slate-200">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Registered Patient:</span>
                                  <span className="font-semibold text-slate-800">{match.details.patientName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Active Coverage:</span>
                                  <span className="font-bold text-emerald-700">{match.details.hmoName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Verification Status:</span>
                                  <span className="text-emerald-800 font-medium capitalize">
                                    {match.details.policyVerificationStatus || 'Verified'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Pre-auth match */}
                            {match.details.type === 'preauth' && (
                              <div className="space-y-1 pt-1 border-t border-slate-200">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Pre-auth ID:</span>
                                  <span className="font-mono font-bold text-slate-800">{match.details.preAuthId}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Authorised Amount:</span>
                                  <span className="font-mono font-bold text-emerald-700">
                                    ₦{match.details.authorizedAmount.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Billed Amount:</span>
                                  <span className="font-mono font-bold text-rose-700">
                                    ₦{match.details.billedAmount.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="text-xs text-slate-500">
                Lagoon Specialist Hospital internal revenue integrity audit.
              </div>
              <div className="flex items-center gap-2">
                {!compareInvoice.isResolved && (
                  <button
                    type="button"
                    onClick={() => {
                      const inv = compareInvoice;
                      setCompareInvoice(null);
                      setResolveInvoice(inv);
                      setResolutionReason('');
                      setResolveError('');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0B6B69] rounded-lg hover:bg-[#095755] transition-colors cursor-pointer"
                  >
                    Mark as resolved
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCompareInvoice(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Resolved Modal */}
      {resolveInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <form onSubmit={handleResolveSubmit}>
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Resolve compliance flags: {resolveInvoice.invoiceNumber}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setResolveInvoice(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Invoice summary info */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient:</span>
                    <span className="font-semibold text-slate-900">{resolveInvoice.patientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Billed:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₦{resolveInvoice.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Flags to Resolve:</span>
                    <span className="font-semibold text-amber-800">
                      {resolveInvoice.flags.map(f => f.name || f.code).join(', ')}
                    </span>
                  </div>
                </div>

                {/* Session Auditor Box */}
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-700">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <div>
                    <span className="text-slate-500">Auditor: </span>
                    <span className="font-semibold text-slate-900">{user?.email || 'Logged-in Compliance Officer'}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">(enforced by server session)</span>
                  </div>
                </div>

                {/* Resolution Reason Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Clinical / Billing Resolution Rationale <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={resolutionReason}
                    onChange={e => setResolutionReason(e.target.value)}
                    placeholder="e.g. Approved retroactive pre-authorisation code obtained from HMO; tariff difference cleared per contract addendum; duplicate order canceled in lab system."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B6B69]/30 focus:border-[#0B6B69] text-slate-800 resize-none"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Provide verifiable clinical or administrative rationale. This reason will be logged in the permanent audit trail.
                  </p>
                </div>

                {/* Caveat alert */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Automated Invalidation Notice
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Resolutions are recorded in an append-only compliance audit trail. If this invoice is subsequently modified or rebilled, any matching flags will automatically reopen.
                  </p>
                </div>

                {resolveError && (
                  <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    {resolveError}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setResolveInvoice(null)}
                  disabled={resolving}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving || !resolutionReason.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {resolving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceDashboard;
