import React, { useEffect, useState } from 'react';
import { auth } from '../../firebase';
import { ComplianceSummary } from '../../types';
import {
  ShieldCheck,
  AlertTriangle,
  Loader2,
  RefreshCw,
  FileWarning,
  Clock,
  XCircle,
} from 'lucide-react';

// Human-readable labels for the Patient Bill Audit's flag codes (server.js,
// computeInvoiceAuditFlags). Kept in one place so a new flag code added there
// doesn't show up here as a raw snake_case string.
const FLAG_LABELS: Record<string, string> = {
  price_mismatch: 'Price mismatch vs. catalogue',
  duplicate_charge: 'Duplicate charge',
  missing_preauth: 'Missing pre-authorization',
  copay_exceeds_plan_rule: 'Copay does not match plan rule',
  billed_self_pay_despite_coverage: 'Billed self-pay despite HMO coverage on file',
  membership_not_verified: 'HMO membership not verified',
  authorized_amount_mismatch: 'Bill differs from pre-authorized amount',
  tariff_unknown: 'No catalogue tariff link (info only)',
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const ComplianceDashboard: React.FC = () => {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

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

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Running the audit across every invoice…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm">
        {error}
        <button
          onClick={load}
          className="ml-3 underline font-semibold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const cleanPct = summary.invoiceCount > 0
    ? Math.round((summary.cleanCount / summary.invoiceCount) * 100)
    : 0;

  const flagEntries = Object.entries(summary.flagCounts)
    .filter(([code]) => code !== 'tariff_unknown')
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Provider compliance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Computed from WelliPay's own invoice, catalogue, and pre-authorization records. Not a live feed from any payer.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Invoices audited</div>
          <div className="text-2xl font-extrabold font-mono text-slate-900">{summary.invoiceCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Clean</div>
          <div className="text-2xl font-extrabold font-mono text-emerald-800">{cleanPct}%</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">{summary.cleanCount} of {summary.invoiceCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700 mb-1">Critical flags</div>
          <div className="text-2xl font-extrabold font-mono text-rose-800">{summary.criticalInvoiceCount}</div>
          <div className="text-[11px] text-rose-700 mt-0.5">invoices need a fix before payment</div>
        </div>
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">Warnings</div>
          <div className="text-2xl font-extrabold font-mono text-amber-800">{summary.warningInvoiceCount}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">invoices worth reviewing</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Flag breakdown */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-3">
            <FileWarning className="w-4 h-4 text-slate-500" />
            Flags by type
          </div>
          {flagEntries.length === 0 ? (
            <div className="text-xs text-slate-400">No flags raised across any invoice.</div>
          ) : (
            <div className="space-y-2">
              {flagEntries.map(([code, count]) => (
                <div key={code} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700">{FLAG_LABELS[code] || code}</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pre-auth stats */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-3">
            <Clock className="w-4 h-4 text-slate-500" />
            Pre-authorization turnaround
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-500">Requests decided</div>
              <div className="font-mono font-bold text-slate-900 text-base">{summary.preAuth.decidedCount} / {summary.preAuth.totalRequests}</div>
            </div>
            <div>
              <div className="text-slate-500">Rejection rate</div>
              <div className="font-mono font-bold text-slate-900 text-base">
                {summary.preAuth.rejectionRate != null ? `${summary.preAuth.rejectionRate}%` : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Approved</div>
              <div className="font-mono font-bold text-emerald-700 text-base">{summary.preAuth.approvedCount}</div>
            </div>
            <div>
              <div className="text-slate-500">Avg. turnaround</div>
              <div className="font-mono font-bold text-slate-900 text-base">
                {summary.preAuth.avgTurnaroundHours != null ? `${summary.preAuth.avgTurnaroundHours}h` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Worst invoices */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Invoices needing attention ({summary.worstInvoices.length})
        </div>
        {summary.worstInvoices.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            No invoices currently carry a warning or critical flag.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {summary.worstInvoices.map(inv => (
              <div key={inv.invoiceNumber}>
                <button
                  onClick={() => setExpandedInvoice(expandedInvoice === inv.invoiceNumber ? null : inv.invoiceNumber)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {inv.worstSeverity === 'critical' ? (
                      <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-900">{inv.invoiceNumber} · {inv.patientName}</div>
                      <div className="text-[11px] text-slate-500">₦{inv.totalAmount.toLocaleString()} · {inv.flagCount} flag{inv.flagCount !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    inv.worstSeverity === 'critical'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}>
                    {inv.worstSeverity === 'critical' ? 'Fix before payment' : 'Review'}
                  </span>
                </button>
                {expandedInvoice === inv.invoiceNumber && (
                  <div className="px-4 pb-3 pl-11 space-y-1.5">
                    {inv.flags.map((f, idx) => (
                      <div key={idx} className="text-[11px] text-slate-600 leading-relaxed">
                        <span className={`font-semibold ${f.severity === 'critical' ? 'text-rose-700' : 'text-amber-700'}`}>
                          {FLAG_LABELS[f.code] || f.code}:
                        </span>{' '}
                        {f.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-400">{summary.note}</div>
    </div>
  );
};

export default ComplianceDashboard;
