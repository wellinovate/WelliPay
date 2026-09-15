import React, { useState } from 'react';
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
    unbilledExposureResolved, 
    resolveUnbilledExposure,
    addProviderTransaction,
    setActiveTab
  } = useWelliPay();

  const [isLeakageModalOpen, setIsLeakageModalOpen] = useState(false);
  const [isNewTxnModalOpen, setIsNewTxnModalOpen] = useState(false);

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
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#201e1d]">
            Dashboard
          </h1>
          <p className="text-sm text-[#605d5d] mt-1 font-serif">
            Today's revenue by source, outstanding receivables, and anything that needs attention before it becomes a loss.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewTxnModalOpen(true)}
            className="text-xs font-sans font-medium px-3 py-1.5 bg-[#201e1d] hover:bg-[#2d2b2b] text-white rounded flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Payment
          </button>
          <div className="font-sans text-xs text-[#605d5d] bg-white px-3 py-1.5 rounded border border-[#d7d3d3] shadow-xs">
            <span className="font-semibold text-[#201e1d]">₦2.84M today</span> · 4 channels active
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Today */}
        <div className="bg-white border border-[#201e1d]/20 rounded p-4 shadow-xs">
          <div className="font-heading text-3xl font-bold text-[#201e1d] tracking-tight">
            ₦2.84M
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#605d5d] font-semibold mt-1">
            Total Today
          </div>
          <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1 font-sans">
            <TrendingUp className="w-3 h-3" />
            <span>+14.2% vs yesterday</span>
          </div>
        </div>

        {/* Patient Direct */}
        <div className="bg-white border border-[#201e1d]/20 rounded p-4 shadow-xs">
          <div className="font-heading text-3xl font-bold text-[#201e1d] tracking-tight">
            ₦640K
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#605d5d] font-semibold mt-1">
            Patient Direct
          </div>
          <div className="mt-2 text-xs text-[#7d7979] font-sans">
            POS & USSD copays
          </div>
        </div>

        {/* HMO Claims */}
        <div className="bg-white border border-[#201e1d]/20 rounded p-4 shadow-xs">
          <div className="font-heading text-3xl font-bold text-[#0088b0] tracking-tight">
            ₦1.9M
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#605d5d] font-semibold mt-1">
            HMO Receivables
          </div>
          <div className="mt-2 text-xs text-[#006786] font-sans cursor-pointer hover:underline" onClick={() => setActiveTab('claims')}>
            View 6 pending claims →
          </div>
        </div>

        {/* Corporate */}
        <div className="bg-white border border-[#201e1d]/20 rounded p-4 shadow-xs">
          <div className="font-heading text-3xl font-bold text-[#201e1d] tracking-tight">
            ₦300K
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#605d5d] font-semibold mt-1">
            Corporate Accounts
          </div>
          <div className="mt-2 text-xs text-[#7d7979] font-sans">
            3 enterprise retainers
          </div>
        </div>
      </div>

      {/* Revenue Leakage Alert Banner */}
      {!unbilledExposureResolved ? (
        <div className="bg-[#fff1f4] border border-[#ff90b1] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm font-sans">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase bg-[#d6006c] text-white tracking-wider">
              Revenue Leakage
            </span>
            <div className="text-[#a5372c] leading-relaxed">
              <span className="font-semibold">17 laboratory services</span> completed with no corresponding invoice — estimated exposure <span className="font-bold">₦340,000</span>.
            </div>
          </div>

          <button
            onClick={() => setIsLeakageModalOpen(true)}
            className="whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold rounded bg-[#d6006c] hover:bg-[#aa0b56] text-white transition-colors self-start sm:self-auto shadow-xs"
          >
            Review & Bill Exposure
          </button>
        </div>
      ) : (
        <div className="bg-[#eafaf0] border border-[#2a9d5c]/30 rounded-lg p-3.5 flex items-center justify-between text-xs font-sans text-[#1e7e47]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2a9d5c]" />
            <span>All 17 laboratory procedures invoiced and attributed to patient folders. ₦340,000 recovered.</span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded">
            Resolved
          </span>
        </div>
      )}

      {/* Recent Transactions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-heading text-lg font-bold text-[#201e1d]">
            Recent transactions
          </h4>
          <span className="text-xs text-[#605d5d] font-sans">
            Live EHR & POS sync active
          </span>
        </div>

        <div className="bg-white border border-[#201e1d]/20 rounded shadow-sm overflow-hidden">
          <table className="broadsheet-table">
            <thead>
              <tr className="bg-[#fcfbf9]">
                <th style={{ width: '85px' }}>Time</th>
                <th>Patient / service</th>
                <th style={{ width: '130px' }}>Amount</th>
                <th style={{ width: '140px' }}>Channel</th>
                <th style={{ width: '110px' }} className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {providerTransactions.map((txn) => (
                <tr key={txn.id}>
                  <td className="font-sans text-xs text-[#605d5d]">
                    {txn.time}
                  </td>
                  <td className="font-serif font-normal text-sm text-[#201e1d]">
                    {txn.patientOrService}
                  </td>
                  <td className="font-heading font-semibold text-sm text-[#201e1d]">
                    {txn.formattedAmount}
                  </td>
                  <td className="font-sans text-xs text-[#444141]">
                    <span className="inline-block px-2 py-0.5 rounded bg-[#f3f1ea] border border-[#d7d3d3] text-[11px]">
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
        subtitle="17 completed lab diagnostics without billed invoices"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#605d5d] leading-relaxed">
            The automated charge audit identified 17 laboratory diagnostic tests performed over the last 48 hours that had test results logged in the LIS (Laboratory Information System) but no corresponding billing charge entered into the hospital billing ledger.
          </p>

          <div className="bg-[#f8f4f4] p-3 rounded border border-[#d7d3d3] space-y-2 text-xs font-sans">
            <div className="flex justify-between font-semibold">
              <span>Full Blood Count (8 orders)</span>
              <span>₦96,000</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Electrolytes, Urea & Creatinine (5 orders)</span>
              <span>₦140,000</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Lipid Profile Panels (4 orders)</span>
              <span>₦104,000</span>
            </div>
            <div className="border-t border-[#bab6b6] pt-1 flex justify-between font-bold text-[#d6006c]">
              <span>Total Unbilled Exposure</span>
              <span>₦340,000</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsLeakageModalOpen(false)}
              className="px-3 py-1.5 rounded text-xs text-[#605d5d] hover:bg-black/5"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                resolveUnbilledExposure();
                setIsLeakageModalOpen(false);
              }}
              className="px-4 py-1.5 rounded text-xs font-semibold bg-[#d6006c] hover:bg-[#aa0b56] text-white transition-colors"
            >
              Generate 17 Invoices & Bill (₦340,000)
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
            <label className="block text-[#444141] font-semibold mb-1">Patient Name</label>
            <input
              type="text"
              required
              value={newPatient}
              onChange={(e) => setNewPatient(e.target.value)}
              placeholder="e.g. O. Adeleke"
              className="w-full px-2.5 py-1.5 border border-[#bab6b6] rounded text-sm focus:outline-none focus:border-[#0088b0]"
            />
          </div>

          <div>
            <label className="block text-[#444141] font-semibold mb-1">Service</label>
            <input
              type="text"
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              placeholder="e.g. Consultation / Radiology"
              className="w-full px-2.5 py-1.5 border border-[#bab6b6] rounded text-sm focus:outline-none focus:border-[#0088b0]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#444141] font-semibold mb-1">Amount (₦)</label>
              <input
                type="number"
                required
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="e.g. 15000"
                className="w-full px-2.5 py-1.5 border border-[#bab6b6] rounded text-sm focus:outline-none focus:border-[#0088b0]"
              />
            </div>

            <div>
              <label className="block text-[#444141] font-semibold mb-1">Channel</label>
              <select
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-[#bab6b6] rounded text-sm bg-white focus:outline-none focus:border-[#0088b0]"
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
              className="px-3 py-1.5 text-xs text-[#605d5d]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-[#0088b0] hover:bg-[#006786] text-white rounded"
            >
              Post Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
