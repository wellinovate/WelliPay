import React, { useState, useMemo } from 'react';
import { useWelliPay } from '../../context/WelliPayContext';
import { Modal } from '../../components/ui/Modal';
import { 
  ShieldAlert, 
  Check, 
  X, 
  FileCheck, 
  Info, 
  Search, 
  FileText, 
  Loader2,
  Clock,
  Building2,
  Send,
  AlertTriangle
} from 'lucide-react';
import { auth } from '../../firebase';
import { HMOClaim } from '../../types';

export const HMODashboard: React.FC = () => {
  const { 
    hmoClaims, 
    approveClaim, 
    rejectClaim, 
    resolveClaimDispute, 
    appealClaim, 
    addNotification 
  } = useWelliPay();

  const [selectedClaim, setSelectedClaim] = useState<HMOClaim | null>(null);
  const [payerFilter, setPayerFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [denialRiskFilter, setDenialRiskFilter] = useState<string>('All');
  const [claimSearch, setClaimSearch] = useState<string>('');
  const [exportingPdf, setExportingPdf] = useState(false);

  // Modal appeal form state
  const [appealPreAuth, setAppealPreAuth] = useState('');
  const [appealNotes, setAppealNotes] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const handleExportRemittance = async () => {
    setExportingPdf(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/claims/remittance-export', { headers });
      if (!res.ok) {
        throw new Error('Failed to generate remittance schedule');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `remittance-schedule-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addNotification('Remittance schedule PDF generated and downloaded.', 'success');
    } catch (err: any) {
      console.error('Remittance export error:', err);
      addNotification(err.message || 'Failed to export remittance schedule', 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  // 4 Mutually Exclusive Status Buckets
  const submittedClaims = useMemo(() => {
    return hmoClaims.filter(c => c.status === 'submitted' && !c.isDisputed);
  }, [hmoClaims]);

  const approvedClaims = useMemo(() => {
    return hmoClaims.filter(c => c.status === 'approved' && !c.isDisputed);
  }, [hmoClaims]);

  const paidClaims = useMemo(() => {
    return hmoClaims.filter(c => c.status === 'paid');
  }, [hmoClaims]);

  const disputedClaims = useMemo(() => {
    return hmoClaims.filter(c => c.isDisputed);
  }, [hmoClaims]);

  const submittedSum = useMemo(() => {
    return submittedClaims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [submittedClaims]);

  const approvedSum = useMemo(() => {
    return approvedClaims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [approvedClaims]);

  const paidSum = useMemo(() => {
    return paidClaims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [paidClaims]);

  const disputedSum = useMemo(() => {
    return disputedClaims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [disputedClaims]);

  const totalClaimed = useMemo(() => {
    return hmoClaims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [hmoClaims]);

  const totalClaimCount = hmoClaims.length;

  const approvalRate = useMemo(() => {
    if (totalClaimed === 0) return '0.0';
    return (((approvedSum + paidSum) / totalClaimed) * 100).toFixed(1);
  }, [approvedSum, paidSum, totalClaimed]);

  const oldestDisputedAge = useMemo(() => {
    if (disputedClaims.length === 0) return 0;
    const ages = disputedClaims.map(c => parseInt(c.age, 10) || 0);
    return Math.max(...ages);
  }, [disputedClaims]);

  const availablePayers = useMemo(() => {
    const set = new Set<string>();
    hmoClaims.forEach(c => {
      if (c.payer) set.add(c.payer);
    });
    return Array.from(set).sort();
  }, [hmoClaims]);

  const filteredClaims = useMemo(() => {
    return hmoClaims.filter((claim) => {
      if (payerFilter !== 'All' && claim.payer !== payerFilter) {
        return false;
      }
      if (statusFilter !== 'All') {
        if (statusFilter === 'disputed' && !claim.isDisputed) return false;
        if (statusFilter !== 'disputed') {
          if (claim.isDisputed) return false;
          if (claim.status !== statusFilter) return false;
        }
      }
      if (denialRiskFilter !== 'All') {
        if (denialRiskFilter === 'missing-auth' && !claim.isDisputed && claim.denialRisk !== 'missing-auth') return false;
        if (denialRiskFilter !== 'missing-auth' && claim.denialRisk !== denialRiskFilter) return false;
      }
      if (claimSearch.trim()) {
        const q = claimSearch.toLowerCase();
        const matchId = claim.id.toLowerCase().includes(q);
        const matchPatient = claim.patientName?.toLowerCase().includes(q) || false;
        const matchMrn = claim.patientMrn?.toLowerCase().includes(q) || false;
        const matchPayer = claim.payer?.toLowerCase().includes(q) || false;
        const matchDiag = claim.diagnosis?.toLowerCase().includes(q) || false;
        if (!matchId && !matchPatient && !matchMrn && !matchPayer && !matchDiag) return false;
      }
      return true;
    });
  }, [hmoClaims, payerFilter, statusFilter, denialRiskFilter, claimSearch]);

  const handleFollowUp = (claim: HMOClaim) => {
    addNotification(`Follow-up inquiry logged for claim ${claim.id} with ${claim.payer || 'HMO'}. SLA status tracked.`, 'info');
  };

  const openClaimModal = (claim: HMOClaim) => {
    setSelectedClaim(claim);
    if (claim.isDisputed) {
      setAppealPreAuth(claim.preAuthCode || `PA-LSH-${Math.floor(10000 + Math.random() * 89999)}-E`);
      setAppealNotes('Lagoon Specialist Hospital clinical documentation attached confirming emergency intervention.');
    } else {
      setAppealPreAuth('');
      setAppealNotes('');
    }
  };

  const handleModalAppealSubmit = () => {
    if (!selectedClaim) return;
    setSubmittingAppeal(true);
    try {
      appealClaim(selectedClaim.id, appealPreAuth, appealNotes);
      setSelectedClaim(null);
    } finally {
      setSubmittingAppeal(false);
    }
  };

  function formatClaimMetric(amount: number): string {
    if (amount >= 1_000_000) {
      const val = (amount / 1_000_000).toFixed(2);
      return `₦${val.endsWith('.00') ? val.slice(0, -3) : val}M`;
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
            Claim portfolio financials by status, payer adjudication pipeline, and clinical dispute resolution.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="font-sans text-xs text-[#475569] bg-white px-3.5 py-2 rounded-lg border border-[#e2e8f0] shadow-xs">
            <span className="font-bold text-[#12244D]">{formatClaimMetric(totalClaimed)} portfolio</span> · {totalClaimCount} claims
          </div>

          <button
            type="button"
            onClick={handleExportRemittance}
            disabled={exportingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-[#12244D] border border-[#cbd5e1] transition-all shadow-xs cursor-pointer disabled:opacity-60"
            title="Download outstanding claims remittance schedule as PDF"
          >
            {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B6B69]" /> : <FileText className="w-3.5 h-3.5 text-[#0B6B69]" />}
            {exportingPdf ? 'Generating PDF...' : 'Export Remittance Schedule'}
          </button>
        </div>
      </div>

      {/* KPI Financials Grid — 4 Mutually Exclusive Status Buckets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Submitted (In Review) */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-[#12244D]/40 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#12244D] tracking-tight">
            {formatClaimMetric(submittedSum)}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Submitted · In Review
          </div>
          <div className="mt-2 text-xs text-[#64748b] font-sans flex items-center justify-between">
            <span>{submittedClaims.length} claims active</span>
            <span className="text-[11px] text-[#475569]">Under clinical review</span>
          </div>
        </div>

        {/* Card 2: Approved (Pending Remittance) */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-emerald-500/40 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#166534] tracking-tight">
            {formatClaimMetric(approvedSum)}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Approved · Pending Remittance
          </div>
          <div className="mt-2 text-xs text-[#166534] font-sans font-medium flex items-center justify-between">
            <span>{approvedClaims.length} claims clean</span>
            <span className="text-[11px] font-bold">{approvalRate}% overall approval</span>
          </div>
        </div>

        {/* Card 3: Paid Remittances (Same calm green #166534) */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-emerald-500/40 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#166534] tracking-tight">
            {formatClaimMetric(paidSum)}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Paid Remittances
          </div>
          <div className="mt-2 text-xs text-[#166534] font-sans font-medium flex items-center justify-between">
            <span>{paidClaims.length} claims settled</span>
            <span className="text-[11px] text-[#166534]">Hospital accounts funded</span>
          </div>
        </div>

        {/* Card 4: Disputed & Flagged (Red ONLY here) */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-rose-500/40 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#be123c] tracking-tight">
            {formatClaimMetric(disputedSum)}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Disputed & Flagged
          </div>
          <div className="mt-2 text-xs text-rose-700 font-sans font-medium flex items-center justify-between">
            <span>{disputedClaims.length} claims requiring appeal</span>
            <span className="text-[11px] font-bold">Action required</span>
          </div>
        </div>
      </div>

      {/* Disputed Claims 1-Line Banner Directly Above Table */}
      {disputedClaims.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-800 shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-700 text-white tracking-wide">
              Action Required
            </span>
            <span>
              <strong>{disputedClaims.length} claims</strong> flagged by payers — <strong>₦{disputedSum.toLocaleString()}</strong> disputed{oldestDisputedAge > 0 ? `, oldest ${oldestDisputedAge} days elapsed.` : '.'}
            </span>
          </div>
          <button
            onClick={() => setStatusFilter('disputed')}
            className="font-bold text-rose-700 hover:underline underline-offset-4 self-start sm:self-auto cursor-pointer"
          >
            Filter Disputed Queue →
          </button>
        </div>
      )}

      {/* Claims Table Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-heading text-lg font-bold text-[#12244D]">
            Claims Pipeline
          </h4>

          <div className="flex flex-wrap items-center gap-2">
            {/* Payer Filter */}
            <select
              value={payerFilter}
              onChange={(e) => setPayerFilter(e.target.value)}
              className="text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-[#334155] focus:outline-none focus:border-[#0B6B69] shadow-xs"
            >
              <option value="All">All Payers</option>
              {availablePayers.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-[#334155] focus:outline-none focus:border-[#0B6B69] shadow-xs"
            >
              <option value="All">Status: All</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="disputed">Disputed</option>
            </select>

            {/* Denial Risk Filter */}
            <select
              value={denialRiskFilter}
              onChange={(e) => setDenialRiskFilter(e.target.value)}
              className="text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-[#334155] focus:outline-none focus:border-[#0B6B69] shadow-xs"
            >
              <option value="All">Denial Risk: All</option>
              <option value="high">High Risk</option>
              <option value="low">Low Risk</option>
              <option value="missing-auth">Action Required</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search claim, patient, MRN..."
                value={claimSearch}
                onChange={(e) => setClaimSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg w-52 text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0B6B69] shadow-xs"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-subtle overflow-hidden">
          <table className="broadsheet-table">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th style={{ width: '95px' }}>Claim ID</th>
                <th style={{ width: '170px' }}>Patient</th>
                <th style={{ width: '130px' }}>Payer</th>
                <th>Diagnosis / Service</th>
                <th style={{ width: '110px' }} className="text-right">Amount</th>
                <th style={{ width: '130px' }}>Status</th>
                <th style={{ width: '180px' }}>Denial Risk</th>
                <th style={{ width: '115px' }}>Age & SLA</th>
                <th style={{ width: '140px' }} className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((claim) => {
                const ageDays = parseInt(claim.age, 10) || 0;
                const isOverdueSla = ageDays >= (claim.slaDays || 14);

                return (
                  <tr 
                    key={claim.id}
                    className="hover:bg-[#f8fafc] cursor-pointer transition-colors"
                    onClick={() => openClaimModal(claim)}
                  >
                    <td className="font-mono text-xs text-[#12244D] font-bold">
                      {claim.id}
                    </td>

                    <td className="font-sans text-xs text-[#0f172a]">
                      <span className="font-semibold block text-sm text-[#0f172a]">
                        {claim.patientName || 'Lagoon Patient'}
                      </span>
                      <span className="block text-[11px] font-mono text-[#64748b]">
                        {claim.patientMrn || 'MRN-LSH-10400'}
                      </span>
                    </td>

                    <td className="font-sans text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#f1f5f9] text-[#334155] border border-[#e2e8f0]">
                        {claim.payer || 'Reliance HMO'}
                      </span>
                    </td>

                    <td className="font-sans text-xs text-[#334155]">
                      <span className="line-clamp-1" title={claim.diagnosis}>
                        {claim.diagnosis || 'Clinical evaluation'}
                      </span>
                    </td>

                    <td className="font-sans font-bold text-sm text-[#12244D] text-right">
                      {claim.formattedAmount}
                    </td>

                    <td>
                      {claim.isDisputed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                          Disputed
                        </span>
                      ) : claim.status === 'approved' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Approved
                        </span>
                      ) : claim.status === 'paid' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Paid Remittance
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
                          Submitted
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="space-y-0.5">
                        <div>
                          {claim.isDisputed || claim.denialRisk === 'missing-auth' ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                              Action Required
                            </span>
                          ) : claim.denialRisk === 'high' ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                              High Risk
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              Low Risk
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] text-[#64748b] truncate max-w-[170px]" title={claim.denialReason}>
                          {claim.denialReason || (claim.isDisputed ? 'Missing pre-authorization' : 'Routine review')}
                        </span>
                      </div>
                    </td>

                    <td>
                      {isOverdueSla ? (
                        <span 
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded"
                          title={`Elapsed age ${claim.age} exceeds the standard ${claim.slaDays || 14}-day clean claim SLA`}
                        >
                          <Clock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                          {claim.age} · ≥14d SLA
                        </span>
                      ) : (
                        <span className="font-sans text-xs text-[#64748b]">
                          {claim.age}
                        </span>
                      )}
                    </td>

                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      {claim.isDisputed ? (
                        <button
                          onClick={() => openClaimModal(claim)}
                          className="px-2.5 py-1 text-xs font-bold rounded-md bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 transition-colors shadow-xs"
                        >
                          Appeal / Resolve
                        </button>
                      ) : claim.status === 'submitted' ? (
                        <button
                          onClick={() => handleFollowUp(claim)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-[#cbd5e1] text-[#12244D] hover:bg-slate-50 transition-colors shadow-xs"
                        >
                          Follow up
                        </button>
                      ) : claim.status === 'approved' ? (
                        <span className="text-xs text-emerald-700 font-semibold font-sans">
                          Approved · Pending Remittance
                        </span>
                      ) : (
                        <span className="text-xs text-[#64748b] font-medium font-sans">
                          Settled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claim Detail & Clinical Appeal Modal */}
      <Modal
        isOpen={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
        title={`Claim Record: ${selectedClaim?.id}`}
        subtitle={`${selectedClaim?.provider || 'Lagoon Specialist Hospital'} · ${selectedClaim?.formattedAmount}`}
      >
        {selectedClaim && (
          <div className="space-y-4 font-sans text-xs">
            {/* Top Summary Box */}
            <div className="bg-[#F8FAFC] p-3.5 rounded-lg border border-[#e2e8f0] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748b]">Beneficiary Patient:</span>
                <span className="font-bold text-[#12244D]">
                  {selectedClaim.patientName || 'Hospital Patient'} ({selectedClaim.patientMrn || 'MRN-LSH-10400'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Accredited Provider:</span>
                <span className="font-semibold text-[#0f172a]">{selectedClaim.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Payer / HMO:</span>
                <span className="font-semibold text-[#0B6B69]">{selectedClaim.payer || 'Reliance HMO'}</span>
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
                <span className="text-[#64748b]">Adjudication Age & SLA:</span>
                <span className="text-[#334155]">
                  {selectedClaim.age} elapsed (Standard clean claim SLA: {selectedClaim.slaDays || 14} days)
                </span>
              </div>
            </div>

            {/* Contextual Plan Policy Rule Box */}
            <div className="bg-[#F0FAF9] border border-[#0B6B69]/20 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#0B6B69]">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Applicable Plan Policy Rule
                </span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-[#0B6B69]/20">
                  {selectedClaim.planRule?.match(/\((POL-[^)]+)\)/)?.[1] || 'POLICY-CLEARED'}
                </span>
              </div>
              <p className="text-[#475569] leading-relaxed text-[11px]">
                {selectedClaim.planRule || `${selectedClaim.payer || 'HMO'} Standard Policy · Pre-authorization criteria verified.`}
              </p>
            </div>

            {/* Disputed Alert & Clinical Appeal Form */}
            {selectedClaim.isDisputed && (
              <div className="bg-[#fff1f4] border border-[#ff90b1] p-3.5 rounded-lg text-xs space-y-3 text-[#a5372c]">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <ShieldAlert className="w-4 h-4 text-[#d6006c]" />
                  Payer Adjudication Flag: {selectedClaim.denialReason || 'Clinical Pre-Authorization Missing'}
                </div>
                <p className="leading-relaxed text-xs">
                  The payer flagged this claim because pre-authorization documentation was absent or incomplete at submission. As Lagoon Specialist Hospital billing team, you can submit retroactive clinical justification or enter an emergency authorization code to resolve this contest.
                </p>

                <div className="space-y-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-[#12244D] mb-1">
                      Retroactive Pre-Authorization Code:
                    </label>
                    <input
                      type="text"
                      value={appealPreAuth}
                      onChange={(e) => setAppealPreAuth(e.target.value)}
                      placeholder="e.g. PA-LSH-44720-E"
                      className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0B6B69]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#12244D] mb-1">
                      Clinical Appeal Justification Notes:
                    </label>
                    <textarea
                      rows={2}
                      value={appealNotes}
                      onChange={(e) => setAppealNotes(e.target.value)}
                      placeholder="Enter emergency or clinical justification..."
                      className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0B6B69]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
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
                    onClick={handleModalAppealSubmit}
                    disabled={submittingAppeal}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#166534] hover:bg-[#14532d] text-white shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Clinical Appeal
                  </button>
                </>
              ) : selectedClaim.status === 'submitted' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleFollowUp(selectedClaim);
                      setSelectedClaim(null);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#12244D] border border-[#cbd5e1] hover:bg-slate-50 transition-colors"
                  >
                    Log Follow-Up
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedClaim(null)}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#12244D] hover:bg-[#0A152E] text-white transition-colors"
                  >
                    Close
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
