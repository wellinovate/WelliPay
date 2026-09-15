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

  const disputedClaims = hmoClaims.filter(c => c.isDisputed);
  const totalDisputedAmount = disputedClaims.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#201e1d]">
            Claims
          </h1>
          <p className="text-sm text-[#605d5d] mt-1 font-serif">
            Claim financials by status and payer, and anything at risk of denial or already disputed.
          </p>
        </div>
        <div className="font-sans text-xs text-[#605d5d] bg-white px-3 py-1.5 rounded border border-[#d7d3d3] shadow-xs">
          <span className="font-semibold text-[#201e1d]">₦18.2M claimed (30d)</span> · {disputedClaims.length} disputed
        </div>
      </div>

      {/* KPI Financials Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#201e1d]/20 rounded p-4 shadow-xs">
          <div className="font-heading text-3xl font-bold text-[#201e1d] tracking-tight">
            ₦18.2M
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#605d5d] font-semibold mt-1">
            Total Claimed (30d)
          </div>
          <div className="mt-2 text-xs text-[#7d7979] font-sans">
            Across 42 accredited providers
          </div>
        </div>

        <div className="bg-white border border-[#201e1d]/20 rounded p-4 shadow-xs">
          <div className="font-heading text-3xl font-bold text-[#1e7e47] tracking-tight">
            ₦14.6M
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#605d5d] font-semibold mt-1">
            Approved
          </div>
          <div className="mt-2 text-xs text-[#1e7e47] font-sans">
            80.2% approval rate
          </div>
        </div>

        <div className="bg-white border border-[#201e1d]/20 rounded p-4 shadow-xs">
          <div className="font-heading text-3xl font-bold text-[#0088b0] tracking-tight">
            ₦11.1M
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#605d5d] font-semibold mt-1">
            Paid Remittances
          </div>
          <div className="mt-2 text-xs text-[#006786] font-sans">
            Settled to hospital accounts
          </div>
        </div>

        <div className="bg-white border border-[#201e1d]/20 rounded p-4 shadow-xs">
          <div className="font-heading text-3xl font-bold text-[#d6006c] tracking-tight">
            ₦3.5M
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#605d5d] font-semibold mt-1">
            Outstanding
          </div>
          <div className="mt-2 text-xs text-[#a5372c] font-sans">
            Pending adjudication & pre-auth
          </div>
        </div>
      </div>

      {/* Disputed Claims Alert Banner */}
      {disputedClaims.length > 0 && (
        <div className="bg-[#fff1f4] border border-[#ff90b1] rounded p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm font-sans">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-[#d6006c] text-white tracking-wide">
              Disputed
            </span>
            <span className="text-[#a5372c]">
              <span className="font-semibold">{disputedClaims.length} claims</span> rejected this month — <span className="font-bold">₦{totalDisputedAmount.toLocaleString()}</span> disputed, oldest 9 days overdue.
            </span>
          </div>
          <button
            onClick={() => setStatusFilter('disputed')}
            className="text-xs font-semibold text-[#d6006c] hover:underline underline-offset-4 self-start sm:self-auto"
          >
            Review Disputed Queue →
          </button>
        </div>
      )}

      {/* Benefit Policy & Terms Banner */}
      <div className="bg-white border border-[#201e1d]/15 rounded px-4 py-2.5 flex items-center justify-between text-xs font-sans text-[#605d5d]">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#0088b0] flex-shrink-0" />
          <span>
            <strong className="text-[#201e1d]">Silver plan</strong> · 20% consultation copay · pre-authorization required above ₦100,000
          </span>
        </div>
        <span className="text-[11px] text-[#7d7979]">Policy Rule ID: POL-SILVER-V3</span>
      </div>

      {/* Claims Table Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-heading text-lg font-bold text-[#201e1d]">
            Claims
          </h4>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-sans bg-white border border-[#201e1d]/20 rounded px-2.5 py-1 text-[#2d2b2b]"
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
              className="text-xs font-sans bg-white border border-[#201e1d]/20 rounded px-2.5 py-1 text-[#2d2b2b]"
            >
              <option value="All">Denial Risk: All</option>
              <option value="high">High Risk</option>
              <option value="low">Low Risk</option>
              <option value="missing-auth">Missing Auth</option>
            </select>

            <div className="relative">
              <Search className="w-3 h-3 text-[#7d7979] absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search claim, provider..."
                value={claimSearch}
                onChange={(e) => setClaimSearch(e.target.value)}
                className="pl-6 pr-2 py-1 text-xs font-sans bg-white border border-[#201e1d]/20 rounded w-44"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#201e1d]/20 rounded shadow-sm overflow-hidden">
          <table className="broadsheet-table">
            <thead>
              <tr className="bg-[#fcfbf9]">
                <th style={{ width: '110px' }}>Claim</th>
                <th>Provider</th>
                <th style={{ width: '120px' }}>Amount</th>
                <th style={{ width: '160px' }}>Status</th>
                <th style={{ width: '140px' }}>Denial risk</th>
                <th style={{ width: '70px' }}>Age</th>
                <th style={{ width: '100px' }} className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((claim) => (
                <tr 
                  key={claim.id}
                  className="hover:bg-[#f8f8f8] cursor-pointer"
                  onClick={() => setSelectedClaim(claim)}
                >
                  <td className="font-mono text-xs text-[#605d5d] font-semibold">
                    {claim.id}
                  </td>
                  <td className="font-serif text-sm font-normal text-[#201e1d]">
                    {claim.provider}
                    {claim.patientName && (
                      <span className="block text-xs font-sans text-[#7d7979]">
                        {claim.patientName}
                      </span>
                    )}
                  </td>
                  <td className="font-heading font-semibold text-sm text-[#201e1d]">
                    {claim.formattedAmount}
                  </td>
                  <td>
                    <StatusChip status={claim.isDisputed ? 'disputed' : claim.status} label={claim.statusLabel} />
                  </td>
                  <td>
                    <StatusChip status={claim.denialRisk} />
                  </td>
                  <td className="font-sans text-xs text-[#605d5d]">
                    {claim.age}
                  </td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    {claim.status === 'submitted' && (
                      <button
                        onClick={() => approveClaim(claim.id)}
                        className="px-2 py-1 text-xs font-medium rounded bg-[#0088b0] text-white hover:bg-[#006786]"
                      >
                        Approve
                      </button>
                    )}
                    {claim.isDisputed && (
                      <button
                        onClick={() => setSelectedClaim(claim)}
                        className="px-2 py-1 text-xs font-semibold rounded bg-[#fff1f4] border border-[#ff90b1] text-[#d6006c] hover:bg-[#ffdee6]"
                      >
                        Resolve
                      </button>
                    )}
                    {claim.status === 'approved' && (
                      <span className="text-xs text-[#1e7e47] font-sans">Ready</span>
                    )}
                    {claim.status === 'paid' && (
                      <span className="text-xs text-[#605d5d] font-sans">Settled</span>
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
          <div className="space-y-4">
            <div className="bg-[#f8f4f4] p-3 rounded border border-[#d7d3d3] space-y-2 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-[#605d5d]">Beneficiary Patient:</span>
                <span className="font-semibold text-[#201e1d]">{selectedClaim.patientName || 'Lagoon Patient'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#605d5d]">Diagnosis / Clinical Note:</span>
                <span className="font-semibold text-[#201e1d]">{selectedClaim.diagnosis || 'Clinical evaluation'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#605d5d]">Pre-Auth Status:</span>
                <span className="font-mono text-[#006786]">
                  {selectedClaim.preAuthCode || 'None on file'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#605d5d]">Age in Adjudication Queue:</span>
                <span>{selectedClaim.age} elapsed</span>
              </div>
            </div>

            {selectedClaim.isDisputed && (
              <div className="bg-[#fff1f4] border border-[#ff90b1] p-3 rounded text-xs space-y-1 text-[#a5372c]">
                <div className="font-bold flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" />
                  Dispute Reason: Provider Contest
                </div>
                <p>
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
                    className="px-3 py-1.5 rounded text-xs font-medium text-[#aa0b56] border border-[#ffc0d0] hover:bg-[#fff1f4]"
                  >
                    Uphold Rejection
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resolveClaimDispute(selectedClaim.id, 'approve');
                      setSelectedClaim(null);
                    }}
                    className="px-4 py-1.5 rounded text-xs font-semibold bg-[#2a9d5c] hover:bg-[#1e7e47] text-white shadow-xs"
                  >
                    Approve with Pre-Auth Override
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedClaim(null)}
                  className="px-4 py-1.5 rounded text-xs bg-[#201e1d] text-white"
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
