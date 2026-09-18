import React, { useState, useMemo } from 'react';
import { useWelliPay } from '../../context/WelliPayContext';
import { StatusChip } from '../../components/ui/StatusChip';
import { Modal } from '../../components/ui/Modal';
import { 
  TrendingUp, 
  AlertTriangle, 
  CreditCard, 
  ArrowUpRight, 
  CheckCircle2, 
  FileText,
  Plus,
  Zap,
  DollarSign,
  Loader2,
  X
} from 'lucide-react';
import { ProviderTransaction } from '../../types';

export const ProviderDashboard: React.FC = () => {
  const { 
    providerTransactions, 
    dashboardMetrics,
    leakageSummary,
    unbilledExposureResolved, 
    resolveUnbilledExposure,
    addProviderTransaction,
    setActiveTab
  } = useWelliPay();

  const [isLeakageModalOpen, setIsLeakageModalOpen] = useState(false);
  const [isNewTxnModalOpen, setIsNewTxnModalOpen] = useState(false);
  const [billing, setBilling] = useState(false);
  const [dismissResolved, setDismissResolved] = useState(false);

  const handleBillExposure = async () => {
    setBilling(true);
    try {
      const result = await resolveUnbilledExposure();
      if (result.success) {
        setIsLeakageModalOpen(false);
      }
    } finally {
      setBilling(false);
    }
  };

  const activeChannelsCount = useMemo(() => {
    const channels = new Set(
      providerTransactions
        .filter(t => t.status === 'paid' && !['HMO', 'Corporate'].includes(t.channel))
        .map(t => t.channel)
    );
    return channels.size || 4;
  }, [providerTransactions]);

  // New Transaction Form State
  const [newPatient, setNewPatient] = useState('');
  const [newService, setNewService] = useState('Consultation');
  const [newAmount, setNewAmount] = useState('');
  const [newChannel, setNewChannel] = useState<'USSD' | 'HMO' | 'Transfer' | 'Card' | 'Bank transfer'>('Card');

  const handleCreateTxn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient || !newAmount) return;

    const numAmount = parseInt(newAmount.replace(/[^0-9]/g, ''), 10) || 5000;
    const newTxn: ProviderTransaction = {
      id: `TXN-${Date.now().toString().slice(-4)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patientOrService: `${newPatient} — ${newService}`,
      amount: numAmount,
      formattedAmount: `₦${numAmount.toLocaleString()}`,
      channel: newChannel,
      status: 'paid'
    };

    addProviderTransaction(newTxn);
    setIsNewTxnModalOpen(false);
    setNewPatient('');
    setNewAmount('');
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#12244D]">
            Dashboard
          </h1>
          <p className="text-xs text-[#475569] mt-0.5 font-sans">
            Real-time revenue by payment channel, outstanding HMO receivables, and clinical revenue leakage alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewTxnModalOpen(true)}
            className="text-xs font-sans font-bold px-3 py-1.5 bg-[#12244D] hover:bg-[#0A152E] text-white rounded-lg flex items-center gap-1.5 shadow-card transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Payment
          </button>
          <div className="font-sans text-xs text-[#475569] bg-white px-3 py-1.5 rounded-lg border border-[#e2e8f0] shadow-xs flex items-center gap-2">
            <span className="font-bold text-[#12244D]">{dashboardMetrics.formattedTotalToday} collected today</span>
            <span className="text-[#cbd5e1]">·</span>
            <span className="font-semibold text-slate-600">{dashboardMetrics.formattedHmoReceivables} outstanding</span>
            <span className="text-[#cbd5e1]">·</span>
            <span className="text-slate-500">{activeChannelsCount} channels active</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Today */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-3.5 shadow-subtle hover:border-[#12244D]/30 transition-all">
          <div className="font-sans text-2xl font-extrabold text-[#12244D] tracking-tight">
            {dashboardMetrics.formattedTotalToday}
          </div>
          <div className="text-[10px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-0.5">
            Total Collected Today
          </div>
          <div className="mt-1.5 text-xs text-emerald-700 flex items-center gap-1 font-sans font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>+14.2% vs yesterday (₦2.48M)</span>
          </div>
        </div>

        {/* Patient Direct */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-3.5 shadow-subtle hover:border-[#12244D]/30 transition-all">
          <div className="font-sans text-2xl font-extrabold text-[#12244D] tracking-tight">
            {dashboardMetrics.formattedPatientDirect}
          </div>
          <div className="text-[10px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-0.5">
            Patient Direct Collections
          </div>
          <div className="mt-1.5 text-xs text-slate-600 font-sans">
            +8.5% vs yesterday · 52 copays & deposits
          </div>
        </div>

        {/* HMO Claims */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-3.5 shadow-subtle hover:border-[#12244D]/30 transition-all">
          <div className="font-sans text-2xl font-extrabold text-[#12244D] tracking-tight">
            {dashboardMetrics.formattedHmoReceivables}
          </div>
          <div className="text-[10px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-0.5">
            Outstanding HMO Receivables
          </div>
          <div 
            className="mt-1.5 text-xs text-[#0B6B69] font-sans font-medium cursor-pointer hover:underline flex items-center gap-1" 
            onClick={() => setActiveTab('claims')}
          >
            <span>{dashboardMetrics.pendingClaimsCount || 48} claims unremitted · avg 14d aging</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
          </div>
        </div>

        {/* Corporate */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-3.5 shadow-subtle hover:border-[#12244D]/30 transition-all">
          <div className="font-sans text-2xl font-extrabold text-[#12244D] tracking-tight">
            {dashboardMetrics.formattedCorporateRetainers}
          </div>
          <div className="text-[10px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-0.5">
            Corporate Retainers
          </div>
          <div className="mt-1.5 text-xs text-slate-600 font-sans">
            {dashboardMetrics.corporateCount} enterprise accounts on monthly cycle
          </div>
        </div>
      </div>

      {/* Revenue Leakage Alert Banner */}
      {!unbilledExposureResolved && leakageSummary.unbilledCount > 0 ? (
        <div className="bg-[#fff1f4] border border-[#ff90b1] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#d6006c] text-white tracking-wider">
              Revenue Leakage
            </span>
            <div className="text-[#a5372c] leading-relaxed">
              <span className="font-bold">{leakageSummary.unbilledCount} laboratory services</span> completed with no corresponding invoice — estimated exposure <span className="font-bold">{leakageSummary.formattedTotalExposure}</span>.
              <button
                type="button"
                onClick={() => setIsLeakageModalOpen(true)}
                className="ml-2 text-xs underline font-semibold text-[#d6006c] hover:text-[#aa0b56] cursor-pointer inline-block"
              >
                View Breakdown
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleBillExposure}
              disabled={billing}
              className="inline-flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#d6006c] hover:bg-[#aa0b56] text-white transition-colors shadow-xs cursor-pointer disabled:opacity-60"
            >
              {billing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {billing ? 'Billing Exposure...' : 'Review & Bill Exposure'}
            </button>
          </div>
        </div>
      ) : !dismissResolved ? (
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg px-3.5 py-2 flex items-center justify-between text-xs font-sans text-emerald-800 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Revenue leakage resolved: 17 laboratory procedures invoiced (₦340,000 recovered to billing ledger).</span>
          </div>
          <button
            type="button"
            onClick={() => setDismissResolved(true)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded hover:bg-emerald-100/60 transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}

      {/* Recent Transactions Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="font-heading text-base font-bold text-[#12244D]">
            Recent transactions
          </h4>
          <span className="text-xs text-[#64748b] font-sans font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live EHR & POS sync active
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-subtle overflow-hidden">
          <table className="w-full text-left text-sm font-sans border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
                <th className="py-2.5 px-4 w-20">Time</th>
                <th className="py-2.5 px-4">Patient / Clinical Service</th>
                <th className="py-2.5 px-4 w-36 text-right">Amount</th>
                <th className="py-2.5 px-4 w-32">Channel</th>
                <th className="py-2.5 px-4 w-28 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {providerTransactions.map((txn, idx) => {
                const isException = txn.status !== 'paid';
                return (
                  <tr 
                    key={txn.id} 
                    className={`transition-colors hover:bg-blue-50/40 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="py-2 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {txn.time}
                    </td>
                    <td className="py-2 px-4 font-medium text-slate-900">
                      {txn.patientOrService}
                    </td>
                    <td className="py-2 px-4 font-bold text-[#12244D] text-right whitespace-nowrap">
                      {txn.formattedAmount}
                    </td>
                    <td className="py-2 px-4 text-slate-600 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-medium text-slate-700">
                        {txn.channel}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap">
                      {isException ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          txn.status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : txn.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-orange-50 text-orange-700 border border-orange-200'
                        }`}>
                          {txn.status.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[11px] font-medium">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leakage Resolution Modal */}
      <Modal
        isOpen={isLeakageModalOpen}
        onClose={() => setIsLeakageModalOpen(false)}
        title="Unbilled Services Exposure Resolution"
        subtitle={`${leakageSummary.unbilledCount} completed lab diagnostics without billed invoices`}
      >
        <div className="space-y-4">
          <p className="text-xs text-[#475569] leading-relaxed">
            The automated charge audit identified {leakageSummary.unbilledCount} laboratory diagnostic tests performed over the last 48 hours that had test results logged in the LIS (Laboratory Information System) but no corresponding billing charge entered into the hospital billing ledger.
          </p>

          <div className="bg-[#F8FAFC] p-3.5 rounded-lg border border-[#e2e8f0] space-y-2 text-xs font-sans">
            {leakageSummary.breakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between font-medium text-[#334155]">
                <span>{item.name}</span>
                <span className="font-bold text-[#12244D]">{item.formattedAmount}</span>
              </div>
            ))}
            <div className="border-t border-[#e2e8f0] pt-2 flex justify-between font-bold text-[#d6006c]">
              <span>Total Unbilled Exposure</span>
              <span>{leakageSummary.formattedTotalExposure}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsLeakageModalOpen(false)}
              disabled={billing}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748b] hover:bg-black/5 disabled:opacity-50"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleBillExposure}
              disabled={billing || leakageSummary.unbilledCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[#d6006c] hover:bg-[#aa0b56] text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {billing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {billing ? 'Generating Invoices...' : `Generate ${leakageSummary.breakdown.length || 3} Invoices & Bill (${leakageSummary.formattedTotalExposure})`}
            </button>
          </div>
        </div>
      </Modal>

      {/* New Payment Modal */}
      <Modal
        isOpen={isNewTxnModalOpen}
        onClose={() => setIsNewTxnModalOpen(false)}
        title="Record Direct Patient Payment"
        subtitle="Post direct transaction into hospital revenue ledger"
      >
        <form onSubmit={handleCreateTxn} className="space-y-3 font-sans text-xs">
          <div>
            <label className="block text-[#334155] font-semibold mb-1">Patient Name</label>
            <input
              type="text"
              required
              value={newPatient}
              onChange={(e) => setNewPatient(e.target.value)}
              placeholder="e.g. O. Adeleke"
              className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm text-[#0f172a] focus:outline-none focus:border-[#0B6B69] focus:ring-1 focus:ring-[#0B6B69]"
            />
          </div>

          <div>
            <label className="block text-[#334155] font-semibold mb-1">Service</label>
            <input
              type="text"
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              placeholder="e.g. Consultation / Radiology"
              className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm text-[#0f172a] focus:outline-none focus:border-[#0B6B69] focus:ring-1 focus:ring-[#0B6B69]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#334155] font-semibold mb-1">Amount (₦)</label>
              <input
                type="number"
                required
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="e.g. 15000"
                className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm text-[#0f172a] focus:outline-none focus:border-[#0B6B69] focus:ring-1 focus:ring-[#0B6B69]"
              />
            </div>

            <div>
              <label className="block text-[#334155] font-semibold mb-1">Channel</label>
              <select
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value as any)}
                className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm bg-white text-[#0f172a] focus:outline-none focus:border-[#0B6B69] focus:ring-1 focus:ring-[#0B6B69]"
              >
                <option value="Card">Card (POS)</option>
                <option value="USSD">USSD</option>
                <option value="Bank transfer">Bank transfer</option>
                <option value="HMO">HMO Copay</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsNewTxnModalOpen(false)}
              className="px-3 py-1.5 text-xs text-[#64748b] hover:text-[#0f172a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-[#0B6B69] hover:bg-[#074C4A] text-white rounded-lg shadow-card cursor-pointer"
            >
              Post Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
