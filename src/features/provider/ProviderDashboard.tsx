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
  DollarSign
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

  const activeChannelsCount = useMemo(() => {
    const channels = new Set(
      providerTransactions
        .filter(t => t.status === 'paid')
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#12244D]">
            Dashboard
          </h1>
          <p className="text-sm text-[#475569] mt-1 font-sans">
            Real-time revenue by payment channel, outstanding HMO receivables, and clinical revenue leakage alerts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsNewTxnModalOpen(true)}
            className="text-xs font-sans font-bold px-3.5 py-2 bg-[#12244D] hover:bg-[#0A152E] text-white rounded-lg flex items-center gap-1.5 shadow-card transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Payment
          </button>
          <div className="font-sans text-xs text-[#475569] bg-white px-3 py-2 rounded-lg border border-[#e2e8f0] shadow-xs">
            <span className="font-bold text-[#12244D]">{dashboardMetrics.formattedTotalToday} today</span> · {activeChannelsCount} channels active
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Today */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-[#12244D]/30 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#12244D] tracking-tight">
            {dashboardMetrics.formattedTotalToday}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Total Today
          </div>
          <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1 font-sans font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>{dashboardMetrics.totalTodayTrend}</span>
          </div>
        </div>

        {/* Patient Direct */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-[#12244D]/30 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#12244D] tracking-tight">
            {dashboardMetrics.formattedPatientDirect}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Patient Direct
          </div>
          <div className="mt-2 text-xs text-[#64748b] font-sans">
            POS & USSD copays
          </div>
        </div>

        {/* HMO Claims */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-[#0B6B69]/40 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#0B6B69] tracking-tight">
            {dashboardMetrics.formattedHmoReceivables}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            HMO Receivables
          </div>
          <div 
            className="mt-2 text-xs text-[#0B6B69] font-sans font-semibold cursor-pointer hover:underline flex items-center gap-1" 
            onClick={() => setActiveTab('claims')}
          >
            <span>View {dashboardMetrics.pendingClaimsCount} pending claims</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Corporate */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-[#12244D]/30 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#12244D] tracking-tight">
            {dashboardMetrics.formattedCorporateRetainers}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Corporate Retainers
          </div>
          <div className="mt-2 text-xs text-[#64748b] font-sans">
            {dashboardMetrics.corporateCount} enterprise retainers
          </div>
        </div>
      </div>

      {/* Revenue Leakage Alert Banner */}
      {!unbilledExposureResolved ? (
        <div className="bg-[#fff1f4] border border-[#ff90b1] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm font-sans shadow-xs">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-[#d6006c] text-white tracking-wider">
              Revenue Leakage
            </span>
            <div className="text-[#a5372c] leading-relaxed">
              <span className="font-bold">{leakageSummary.unbilledCount} laboratory services</span> completed with no corresponding invoice — estimated exposure <span className="font-bold">{leakageSummary.formattedTotalExposure}</span>.
            </div>
          </div>

          <button
            onClick={() => setIsLeakageModalOpen(true)}
            className="whitespace-nowrap px-4 py-2 text-xs font-bold rounded-lg bg-[#d6006c] hover:bg-[#aa0b56] text-white transition-colors self-start sm:self-auto shadow-xs cursor-pointer"
          >
            Review & Bill Exposure
          </button>
        </div>
      ) : (
        <div className="bg-[#eafaf0] border border-[#2a9d5c]/30 rounded-xl p-4 flex items-center justify-between text-xs font-sans text-[#1e7e47] shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2a9d5c]" />
            <span className="font-medium">All 17 laboratory procedures invoiced and attributed to patient folders. ₦340,000 recovered.</span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
            Resolved
          </span>
        </div>
      )}

      {/* Recent Transactions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-heading text-lg font-bold text-[#12244D]">
            Recent transactions
          </h4>
          <span className="text-xs text-[#64748b] font-sans font-medium">
            Live EHR & POS sync active
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-subtle overflow-hidden">
          <table className="broadsheet-table">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th style={{ width: '85px' }}>Time</th>
                <th>Patient / service</th>
                <th style={{ width: '130px' }}>Amount</th>
                <th style={{ width: '140px' }}>Channel</th>
                <th style={{ width: '110px' }} className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {providerTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="font-sans text-xs text-[#64748b]">
                    {txn.time}
                  </td>
                  <td className="font-sans font-semibold text-sm text-[#0f172a]">
                    {txn.patientOrService}
                  </td>
                  <td className="font-sans font-bold text-sm text-[#12244D]">
                    {txn.formattedAmount}
                  </td>
                  <td className="font-sans text-xs text-[#475569]">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#f1f5f9] border border-[#cbd5e1] text-[11px] font-medium">
                      {txn.channel}
                    </span>
                  </td>
                  <td className="text-right">
                    <StatusChip status={txn.status} />
                  </td>
                </tr>
              ))}
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
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748b] hover:bg-black/5"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                resolveUnbilledExposure();
                setIsLeakageModalOpen(false);
              }}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#d6006c] hover:bg-[#aa0b56] text-white transition-colors shadow-xs cursor-pointer"
            >
              Generate {leakageSummary.unbilledCount} Invoices & Bill ({leakageSummary.formattedTotalExposure})
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
