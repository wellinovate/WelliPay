import React, { useState, useEffect, useCallback } from 'react';
import { NavTab, Invoice, InvoicesResponse, InvoiceMetrics } from '../../types';
import { FileText, Users, Settings as SettingsIcon, Check, ShieldCheck, Database, Search, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { StatusChip } from '../../components/ui/StatusChip';

interface PlaceholderViewProps {
  tab: NavTab;
}

const InvoicesView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [metrics, setMetrics] = useState<InvoiceMetrics>({
    totalInvoices: 4,
    totalAmount: 57000,
    formattedTotalAmount: '₦57,000',
    reconciledCount: 3,
    pendingCount: 1
  });
  const [source, setSource] = useState<'postgresql' | 'fallback'>('fallback');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

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

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/invoices?${params.toString()}`, { headers });
      if (!res.ok) {
        throw new Error(`Failed to load invoices (${res.status})`);
      }
      const data: InvoicesResponse = await res.json();
      setInvoices(data.invoices || []);
      if (data.metrics) setMetrics(data.metrics);
      if (data.source) setSource(data.source);
    } catch (err: any) {
      console.error('[InvoicesView] Error fetching invoices:', err);
      setError(err.message || 'Error connecting to invoices backend');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, searchQuery, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  return (
    <div className="space-y-6">
      {/* Header with Title & Source Pill */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-brand-navy">
              Invoices
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              source === 'postgresql'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
            }`}>
              <Database className="w-3 h-3" />
              {source === 'postgresql' ? 'PostgreSQL Active' : 'Demo Fallback'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-sans">
            Hospital billing statements, outstanding balances, and matched payment receipts.
          </p>
        </div>

        <button
          onClick={fetchInvoices}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Invoiced</span>
            <FileText className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="mt-2 text-xl font-bold font-heading text-brand-navy">
            {metrics.formattedTotalAmount || `₦${metrics.totalAmount.toLocaleString()}`}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {metrics.totalInvoices} statements on file
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Reconciled / Settled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold font-heading text-emerald-700">
            {metrics.reconciledCount}
          </div>
          <div className="text-xs text-emerald-600/80 mt-0.5">
            Matched with inbound receipts
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending Match</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-bold font-heading text-amber-700">
            {metrics.pendingCount}
          </div>
          <div className="text-xs text-amber-600/80 mt-0.5">
            Awaiting payment settlement
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice #, patient, service..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-teal focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['all', 'paid', 'pending'] as const).map((filterVal) => (
            <button
              key={filterVal}
              onClick={() => setStatusFilter(filterVal)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                statusFilter === filterVal
                  ? 'bg-brand-navy text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 bg-transparent'
              }`}
            >
              {filterVal === 'all' ? 'All Invoices' : filterVal === 'paid' ? 'Reconciled' : 'Pending'}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
            <button onClick={fetchInvoices} className="underline ml-auto font-medium">Retry</button>
          </div>
        )}

        <table className="broadsheet-table w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th>Invoice #</th>
              <th>Patient / Account</th>
              <th>Service Details</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-teal animate-ping" />
                    <span>Loading invoices from PostgreSQL...</span>
                  </div>
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  No invoices found matching the current filters.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="font-mono text-xs font-semibold text-brand-navy">
                    {inv.invoiceNumber}
                  </td>
                  <td className="font-medium text-slate-800">
                    {inv.patientName}
                  </td>
                  <td className="text-slate-600 text-xs">
                    {inv.serviceDescription}
                  </td>
                  <td className="font-heading font-semibold text-brand-navy">
                    {inv.formattedAmount || `₦${(inv.totalAmount ?? 0).toLocaleString()}`}
                  </td>
                  <td className="text-slate-500 text-xs">
                    {inv.dueDate || 'Today'}
                  </td>
                  <td>
                    <StatusChip 
                      status={inv.status === 'paid' ? 'paid' : 'pending'} 
                      label={inv.statusLabel || (inv.status === 'paid' ? 'Reconciled' : 'Pending Match')} 
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ tab }) => {
  if (tab === 'invoices') {
    return <InvoicesView />;
  }

  if (tab === 'patients') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-brand-navy">
            Patients
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-sans">
            Patient payment accounts, ledger balance history, and HMO insurance coverage.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <table className="broadsheet-table w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th>Patient ID</th>
                <th>Full Name</th>
                <th>Primary Coverage</th>
                <th>Outstanding Copay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="font-mono text-xs font-semibold text-brand-navy">PAT-1082</td>
                <td className="font-medium text-slate-800">J. Adeyemi</td>
                <td className="text-slate-600 text-xs">Self-Pay / Direct USSD</td>
                <td className="font-heading font-semibold text-brand-navy">₦0</td>
                <td><StatusChip status="paid" label="Up to date" /></td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="font-mono text-xs font-semibold text-brand-navy">PAT-1094</td>
                <td className="font-medium text-slate-800">J. Umar</td>
                <td className="text-slate-600 text-xs">Reliance HMO (Silver Plan)</td>
                <td className="font-heading font-semibold text-brand-navy">₦0</td>
                <td><StatusChip status="paid" label="Up to date" /></td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="font-mono text-xs font-semibold text-brand-navy">PAT-1102</td>
                <td className="font-medium text-slate-800">M. Bello</td>
                <td className="text-slate-600 text-xs">Self-Pay / POS Card</td>
                <td className="font-heading font-semibold text-brand-navy">₦8,500</td>
                <td><StatusChip status="pending" label="Unsettled" /></td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="font-mono text-xs font-semibold text-brand-navy">PAT-1115</td>
                <td className="font-medium text-slate-800">T. Yusuf</td>
                <td className="text-slate-600 text-xs">Bank Transfer Direct</td>
                <td className="font-heading font-semibold text-brand-navy">₦0</td>
                <td><StatusChip status="paid" label="Up to date" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-brand-navy">
          Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-sans">
          Payment gateway configurations, automated AI reconciliation parameters, and ledger sync rules.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 font-sans">
        <div className="border-b border-slate-100 pb-5">
          <h3 className="font-heading text-lg font-bold text-brand-navy mb-1">
            AI Reconciliation Engine Thresholds
          </h3>
          <p className="text-xs text-slate-500">
            Configure minimum confidence score requirements for one-click and auto-confirm actions.
          </p>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-100">
              <div>
                <span className="font-semibold text-brand-navy">Auto-Suggestion Threshold</span>
                <span className="block text-slate-500 mt-0.5">Mark match candidate as high confidence</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-brand-teal/10 text-brand-teal font-bold border border-brand-teal/30">
                85%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-100">
              <div>
                <span className="font-semibold text-brand-navy">Fuzzy Name Matching</span>
                <span className="block text-slate-500 mt-0.5">Permit bank description abbreviation e.g. &quot;JOHN U.&quot; → J. Umar</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                Enabled
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-heading text-lg font-bold text-brand-navy mb-1 flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-teal" />
            Transactional Integrity (PostgreSQL)
          </h3>
          <p className="text-xs text-slate-500">
            All payment events and bulk reconciliation actions are recorded with double-entry journal rows and row-level locks.
          </p>

          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 font-mono flex items-center justify-between">
            <span>ENGINE STATUS: <strong className="text-emerald-700">ACTIVE</strong></span>
            <span>ROW_LOCKS: <strong className="text-brand-navy">ENABLED</strong></span>
            <span>ISOLATION: <strong className="text-brand-teal">SERIALIZABLE</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
