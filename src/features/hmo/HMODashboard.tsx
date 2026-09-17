import React, { useState, useMemo } from 'react';
import { useWelliPay } from '../../context/WelliPayContext';
import { StatusChip } from '../../components/ui/StatusChip';
import { Modal } from '../../components/ui/Modal';
import { 
  ShieldAlert, 
  Check, 
  X, 
  FileCheck, 
  Info, 
  FileSpreadsheet, 
  ExternalLink,
  Search
} from 'lucide-react';
import { HMOClaim } from '../../types';

export const HMODashboard: React.FC = () => {
  const { hmoClaims, approveClaim, rejectClaim, resolveClaimDispute } = useWelliPay();

  const [selectedClaim, setSelectedClaim] = useState<HMOClaim | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [denialRiskFilter, setDenialRiskFilter] = useState<string>('All');
  const [claimSearch, setClaimSearch] = useState<string>('');

  const filteredClaims = useMemo(() => {
    return hmoClaims.filter((claim) => {
      if (statusFilter !== 'All') {
        if (statusFilter === 'disputed' && !claim.isDisputed) return false;
        if (statusFilter !== 'disputed' && claim.status !== statusFilter) return false;
      }
      if (denialRiskFilter !== 'All' && claim.denialRisk !== denialRiskFilter) {
        return false;
      }
      if (claimSearch.trim()) {
        const q = claimSearch.toLowerCase();
        const matchId = claim.id.toLowerCase().includes(q);
        const matchProvider = claim.provider.toLowerCase().includes(q);
        const matchPatient = claim.patientName?.toLowerCase().includes(q) || false;
        if (!matchId && !matchProvider && !matchPatient) return false;
      }
      return true;
    });
  }, [hmoClaims, statusFilter, denialRiskFilter, claimSearch]);

  // Financial metrics calculated dynamically from live/hydrated hmoClaims (#1)
  const totalClaimed = useMemo(() => {
    return hmoClaims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [hmoClaims]);

  const totalApproved = useMemo(() => {
    return hmoClaims
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [hmoClaims]);

  const totalPaid = useMemo(() => {
    return hmoClaims
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [hmoClaims]);

  const totalOutstanding = useMemo(() => {
    return hmoClaims
      .filter(c => c.status === 'submitted' || c.status === 'approved')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [hmoClaims]);

  const accreditedProvidersCount = useMemo(() => {
    return new Set(hmoClaims.map(c => c.provider)).size;
  }, [hmoClaims]);

  const approvalRate = useMemo(() => {
    if (totalClaimed === 0) return '0.0';
    return ((totalApproved / totalClaimed) * 100).toFixed(1);
  }, [totalApproved, totalClaimed]);

  const disputedClaims = useMemo(() => hmoClaims.filter(c => c.isDisputed), [hmoClaims]);

  // Explicitly cast to Number to prevent string concatenation bug (#2)
  const totalDisputedAmount = useMemo(() => {
    return disputedClaims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [disputedClaims]);

  const oldestDisputedAge = useMemo(() => {
    if (disputedClaims.length === 0) return 0;
    const ages = disputedClaims.map(c => parseInt(c.age, 10) || 0);
    return Math.max(...ages);
  }, [disputedClaims]);

  function formatClaimMetric(amount: number): string {
    if (amount >= 1_000_000) {
      const val = (amount / 1_000_000).toFixed(1);
      return `₦${val.endsWith('.0') ? val.slice(0, -2) : val}M`;
    }
    if (amount >= 1_000) {
      const val = (amount / 1_000).toFixed(0);
      return `₦${val}K`;
    }
    return `₦${amount.toLocaleString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#12244D]">
            Claims
          </h1>
          <p className="text-sm text-[#475569] mt-1 font-sans">
            Claim portfolio financials by status, payer adjudication pipeline, and real-time dispute resolution.
          </p>
        </div>
        <div className="font-sans text-xs text-[#475569] bg-white px-3.5 py-2 rounded-lg border border-[#e2e8f0] shadow-xs">
          <span className="font-bold text-[#12244D]">{formatClaimMetric(totalClaimed)} claimed (30d)</span> · {disputedClaims.length} disputed
        </div>
      </div>

      {/* KPI Financials Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-[#12244D]/30 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#12244D] tracking-tight">
            {formatClaimMetric(totalClaimed)}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Total Claimed (30d)
          </div>
          <div className="mt-2 text-xs text-[#64748b] font-sans">
            Across {accreditedProvidersCount} accredited providers
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-emerald-500/30 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#166534] tracking-tight">
            {formatClaimMetric(totalApproved)}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Approved
          </div>
          <div className="mt-2 text-xs text-[#166534] font-sans font-medium">
            {approvalRate}% approval rate
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-[#0B6B69]/30 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#0B6B69] tracking-tight">
            {formatClaimMetric(totalPaid)}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Paid Remittances
          </div>
          <div className="mt-2 text-xs text-[#0B6B69] font-sans font-medium">
            Settled to hospital accounts
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-rose-500/30 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#d6006c] tracking-tight">
            {formatClaimMetric(totalOutstanding)}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Outstanding
          </div>
          <div className="mt-2 text-xs text-rose-700 font-sans">
            Pending adjudication & pre-auth
          </div>
        </div>
      </div>

      {/* Disputed Claims Alert Banner */}
      {disputedClaims.length > 0 && (
        <div className="bg-[#fff1f4] border border-[#ff90b1] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm font-sans shadow-xs">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-[#d6006c] text-white tracking-wide">
              Disputed
            </span>
            <span className="text-[#a5372c]">
              <span className="font-bold">{disputedClaims.length} claims</span> rejected this month — <span className="font-bold">₦{totalDisputedAmount.toLocaleString()}</span> disputed{oldestDisputedAge > 0 ? `, oldest ${oldestDisputedAge} days overdue.` : '.'}
            </span>
          </div>
          <button
            onClick={() => setStatusFilter('disputed')}
            className="text-xs font-bold text-[#d6006c] hover:underline underline-offset-4 self-start sm:self-auto cursor-pointer"
          >
            Review Disputed Queue →
          </button>
        </div>
      )}

      {/* Benefit Policy & Terms Banner */}
      <div className="bg-[#F0FAF9] border border-[#0B6B69]/20 rounded-xl px-4 py-3 flex items-center justify-between text-xs font-sans text-[#475569] shadow-xs">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-[#0B6B69] flex-shrink-0" />
          <span>
            <strong className="text-[#12244D]">Silver Plan</strong> · 20% consultation copay · pre-authorization required above ₦100,000
          </span>
        </div>
        <span className="text-[11px] font-mono font-medium text-[#0B6B69] bg-white px-2 py-0.5 rounded border border-[#0B6B69]/20">
          Rule: POL-SILVER-V3
        </span>
      </div>

      {/* Claims Table Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-heading text-lg font-bold text-[#12244D]">
            Claims Pipeline
          </h4>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg px-3 py-1.5 text-[#334155] focus:outline-none focus:border-[#0B6B69] shadow-xs"
            >
              <option value="All">Status: All</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="disputed">Disputed</option>
            </select>

            <select
              value={denialRiskFilter}
              onChange={(e) => setDenialRiskFilter(e.target.value)}
              className="text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg px-3 py-1.5 text-[#334155] focus:outline-none focus:border-[#0B6B69] shadow-xs"
            >
              <option value="All">Denial Risk: All</option>
              <option value="high">High Risk</option>
              <option value="low">Low Risk</option>
              <option value="missing-auth">Missing Auth</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search claim, provider..."
                value={claimSearch}
                onChange={(e) => setClaimSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg w-48 text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0B6B69] shadow-xs"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-subtle overflow-hidden">
          <table className="broadsheet-table">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th style={{ width: '110px' }}>Claim ID</th>
                <th>Provider</th>
                <th style={{ width: '120px' }}>Amount</th>
                <th style={{ width: '160px' }}>Status</th>
                <th style={{ width: '140px' }}>Denial Risk</th>
                <th style={{ width: '70px' }}>Age</th>
                <th style={{ width: '100px' }} className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((claim) => (
                <tr 
                  key={claim.id}
                  className="hover:bg-[#f8fafc] cursor-pointer transition-colors"
                  onClick={() => setSelectedClaim(claim)}
                >
                  <td className="font-mono text-xs text-[#12244D] font-bold">
                    {claim.id}
                  </td>
                  <td className="font-sans text-sm text-[#0f172a]">
                    <span className="font-semibold block">{claim.provider}</span>
                    {claim.patientName && (
                      <span className="block text-xs text-[#64748b]">
                        {claim.patientName}
                      </span>
                    )}
                  </td>
                  <td className="font-sans font-bold text-sm text-[#12244D]">
                    {claim.formattedAmount}
                  </td>
                  <td>
                    <StatusChip status={claim.isDisputed ? 'disputed' : claim.status} label={claim.statusLabel} />
                  </td>
                  <td>
                    <StatusChip status={claim.denialRisk} />
                  </td>
                  <td className="font-sans text-xs text-[#64748b]">
                    {claim.age}
                  </td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    {claim.status === 'submitted' && (
                      <button
                        onClick={() => approveClaim(claim.id)}
                        className="px-2.5 py-1 text-xs font-bold rounded-md bg-[#0B6B69] text-white hover:bg-[#074C4A] shadow-xs transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {claim.isDisputed && (
                      <button
                        onClick={() => setSelectedClaim(claim)}
                        className="px-2.5 py-1 text-xs font-bold rounded-md bg-[#fff1f4] border border-[#ff90b1] text-[#d6006c] hover:bg-[#ffdee6] transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                    {claim.status === 'approved' && (
                      <span className="text-xs text-emerald-700 font-bold font-sans">Ready</span>
                    )}
                    {claim.status === 'paid' && (
                      <span className="text-xs text-[#64748b] font-medium font-sans">Settled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claim Detail & Dispute Adjudication Modal */}
      <Modal
        isOpen={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
        title={`Claim Adjudication: ${selectedClaim?.id}`}
        subtitle={`${selectedClaim?.provider} · ${selectedClaim?.formattedAmount}`}
      >
        {selectedClaim && (
          <div className="space-y-4 font-sans text-xs">
            <div className="bg-[#F8FAFC] p-3.5 rounded-lg border border-[#e2e8f0] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748b]">Beneficiary Patient:</span>
                <span className="font-bold text-[#12244D]">{selectedClaim.patientName || 'Lagoon Patient'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Diagnosis / Clinical Note:</span>
                <span className="font-semibold text-[#0f172a]">{selectedClaim.diagnosis || 'Clinical evaluation'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Pre-Auth Status:</span>
                <span className="font-mono font-bold text-[#0B6B69]">
                  {selectedClaim.preAuthCode || 'None on file'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Age in Adjudication Queue:</span>
                <span className="text-[#334155]">{selectedClaim.age} elapsed</span>
              </div>
            </div>

            {selectedClaim.isDisputed && (
              <div className="bg-[#fff1f4] border border-[#ff90b1] p-3.5 rounded-lg text-xs space-y-1.5 text-[#a5372c]">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#d6006c]" />
                  Dispute Reason: Provider Clinical Contest
                </div>
                <p className="leading-relaxed">
                  Lagoon Specialist Hospital clinical billing team submitted documentation stating emergency justification for immediate procedure prior to pre-authorization issuance.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {selectedClaim.isDisputed ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      resolveClaimDispute(selectedClaim.id, 'reject');
                      setSelectedClaim(null);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#aa0b56] border border-[#ffc0d0] hover:bg-[#fff1f4] transition-colors"
                  >
                    Uphold Rejection
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resolveClaimDispute(selectedClaim.id, 'approve');
                      setSelectedClaim(null);
                    }}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#166534] hover:bg-[#14532d] text-white shadow-xs transition-colors"
                  >
                    Approve with Pre-Auth Override
                  </button>
                </>
              ) : selectedClaim.status === 'submitted' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      rejectClaim(selectedClaim.id, 'Pre-authorization documentation incomplete');
                      setSelectedClaim(null);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 transition-colors"
                  >
                    Reject Claim
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      approveClaim(selectedClaim.id);
                      setSelectedClaim(null);
                    }}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#0B6B69] hover:bg-[#074C4A] text-white shadow-xs transition-colors"
                  >
                    Approve Claim
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedClaim(null)}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#12244D] hover:bg-[#0A152E] text-white transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
