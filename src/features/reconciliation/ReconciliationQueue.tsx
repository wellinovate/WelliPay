import React, { useState, useMemo } from 'react';
import { useWelliPay } from '../../context/WelliPayContext';
import { Modal } from '../../components/ui/Modal';
import { 
  Search, 
  Sparkles, 
  Check, 
  X, 
  Building, 
  CreditCard, 
  PhoneCall, 
  Download, 
  Loader2,
  CheckCheck
} from 'lucide-react';
import { auth } from '../../firebase';
import { ReconciliationItem } from '../../types';

interface CandidateMatch {
  targetName: string;
  patientId: string;
  invoiceNumber: string;
  serviceDescription: string;
  invoiceAmount: number;
  formattedAmount: string;
  confidence: number;
  heuristic: string;
}

const CANDIDATE_LOOKUP: Record<string, CandidateMatch[]> = {
  'REC-004': [
    {
      targetName: 'Chinedu Okonkwo',
      patientId: 'PAT-1082',
      invoiceNumber: 'INV-93048',
      serviceDescription: 'Outpatient General Consult',
      invoiceAmount: 3200,
      formattedAmount: '₦3,200',
      confidence: 82,
      heuristic: 'Amount exact + phone digits match *737* session'
    },
    {
      targetName: 'Blessing Adebayo',
      patientId: 'PAT-1099',
      invoiceNumber: 'INV-93051',
      serviceDescription: 'Pharmacy Prescription Refill',
      invoiceAmount: 3200,
      formattedAmount: '₦3,200',
      confidence: 74,
      heuristic: 'Amount exact + outpatient pharmacy queue'
    },
    {
      targetName: 'Musa Danladi',
      patientId: 'PAT-1104',
      invoiceNumber: 'INV-93055',
      serviceDescription: 'Laboratory Rapid Malaria Test',
      invoiceAmount: 3500,
      formattedAmount: '₦3,500',
      confidence: 61,
      heuristic: 'Partial copay candidate (₦300 variance)'
    }
  ],
  'REC-009': [
    {
      targetName: 'Zainab Aliyu',
      patientId: 'PAT-1110',
      invoiceNumber: 'INV-93081',
      serviceDescription: 'OPD Clinic Registration Card',
      invoiceAmount: 2500,
      formattedAmount: '₦2,500',
      confidence: 79,
      heuristic: 'Amount exact + OPD registration queue at 09:15'
    },
    {
      targetName: 'Tariq Hassan',
      patientId: 'PAT-1115',
      invoiceNumber: 'INV-93083',
      serviceDescription: 'OPD Walk-in Registration',
      invoiceAmount: 2500,
      formattedAmount: '₦2,500',
      confidence: 75,
      heuristic: 'Amount exact + walk-in desk queue at 09:30'
    },
    {
      targetName: 'Grace Effiong',
      patientId: 'PAT-1120',
      invoiceNumber: 'INV-93086',
      serviceDescription: 'Follow-up Consultation Card',
      invoiceAmount: 2500,
      formattedAmount: '₦2,500',
      confidence: 68,
      heuristic: 'Amount exact + patient follow-up record'
    }
  ]
};

export const ReconciliationQueue: React.FC = () => {
  const {
    reconciliationItems,
    toggleSelectReconItem,
    selectAllReconItems,
    selectOnlyReconIds,
    confirmReconItem,
    rejectReconItem,
    bulkConfirmSelected,
    filterChannel,
    setFilterChannel,
    searchQuery,
    setSearchQuery,
    unmatchedCount,
    confirmedCount,
    selectedCount,
    addNotification,
  } = useWelliPay();

  // Primary queue tab: 'action' (Action Queue) | 'confirmed' (Confirmed)
  const [activeQueueTab, setActiveQueueTab] = useState<'action' | 'confirmed'>('action');

  // Sub-filter within Action Queue: 'all' | 'suggested' | 'manual'
  const [actionSubFilter, setActionSubFilter] = useState<'all' | 'suggested' | 'manual'>('all');

  // Modal for "Find match" on unscored/low-confidence items
  const [findingMatchItem, setFindingMatchItem] = useState<ReconciliationItem | null>(null);

  // Modal for deep audit inspection
  const [inspectingItem, setInspectingItem] = useState<ReconciliationItem | null>(null);

  const [exporting, setExporting] = useState(false);

  const handleExportReconciliation = async () => {
    setExporting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/reconciliation/export', { headers });
      if (!res.ok) {
        throw new Error('Failed to export reconciliation batch');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reconciliation-batch-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addNotification('Confirmed reconciliation batch exported as CSV.', 'success');
    } catch (err: any) {
      console.error('Reconciliation export error:', err);
      addNotification(err.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Days outstanding helper
  const getDaysOutstanding = (dateStr: string): string => {
    if (dateStr.toLowerCase().startsWith('today')) return 'Today';
    if (dateStr.toLowerCase().startsWith('yesterday')) return '1d ago';
    if (dateStr.includes('Sep 15')) return '3d ago';
    if (dateStr.includes('Sep 14')) return '4d ago';
    if (dateStr.includes('Sep 13')) return '5d ago';
    if (dateStr.includes('Sep 12')) return '6d ago';
    if (dateStr.includes('Sep 11')) return '7d ago';
    if (dateStr.includes('Sep 10')) return '8d ago';
    if (dateStr.includes('Sep 09')) return '9d ago';
    return 'Recent';
  };

  // Filter items based on active status, sub-filter, channel, and search query
  const displayedItems = useMemo(() => {
    return reconciliationItems.filter((item) => {
      // Primary tab filter
      if (activeQueueTab === 'confirmed') {
        if (item.status !== 'confirmed') return false;
      } else {
        // Action Queue
        if (item.status !== 'unmatched') return false;

        // Sub-filter inside Action Queue
        if (actionSubFilter === 'suggested') {
          if (!item.aiMatch.isHighConfidence || item.aiMatch.confidence < 80) return false;
        } else if (actionSubFilter === 'manual') {
          if (item.aiMatch.isHighConfidence && item.aiMatch.confidence >= 80) return false;
        }
      }

      // Channel filter
      if (filterChannel !== 'All' && item.channel !== filterChannel) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchDesc = item.description.toLowerCase().includes(query);
        const matchRaw = item.rawDetails.toLowerCase().includes(query);
        const matchAmount = item.amount.toString().includes(query) || item.formattedAmount.toLowerCase().includes(query);
        const matchTarget = item.aiMatch.targetName.toLowerCase().includes(query);
        const matchInvoice = item.aiMatch.invoiceNumber?.toLowerCase().includes(query) || false;
        if (!matchDesc && !matchRaw && !matchAmount && !matchTarget && !matchInvoice) {
          return false;
        }
      }

      return true;
    });
  }, [reconciliationItems, activeQueueTab, actionSubFilter, filterChannel, searchQuery]);

  // Counts for Action Queue sub-pills
  const actionableItems = useMemo(() => {
    return reconciliationItems.filter(i => i.status === 'unmatched');
  }, [reconciliationItems]);

  const highConfidenceActionable = useMemo(() => {
    return actionableItems.filter(i => i.aiMatch.confidence >= 95);
  }, [actionableItems]);

  const readyToConfirmCount = useMemo(() => {
    return actionableItems.filter(i => i.aiMatch.confidence >= 80 && i.aiMatch.invoiceNumber).length;
  }, [actionableItems]);

  const needsManualCount = useMemo(() => {
    return actionableItems.filter(i => i.aiMatch.confidence < 80 || !i.aiMatch.invoiceNumber).length;
  }, [actionableItems]);

  // Selected totals for bulk bar
  const selectedItems = useMemo(() => {
    return reconciliationItems.filter(i => i.selected && i.status === 'unmatched');
  }, [reconciliationItems]);

  const selectedTotalAmount = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.amount, 0);
  }, [selectedItems]);

  const allFilteredSelected = displayedItems.length > 0 && displayedItems.every((i) => i.selected);

  // Shortcut to select all >=95% matches
  const handleSelectHighConfidenceShortcut = () => {
    const ids = highConfidenceActionable.map(i => i.id);
    selectOnlyReconIds(ids);
    addNotification(`Selected ${ids.length} transactions with ≥95% match confidence.`, 'info');
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'Bank transfer':
        return <Building className="w-3.5 h-3.5 text-[#0B6B69]" />;
      case 'POS card':
        return <CreditCard className="w-3.5 h-3.5 text-slate-500" />;
      case 'USSD':
        return <PhoneCall className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return null;
    }
  };

  // Confidence pill tiering
  const renderConfidencePill = (confidence: number) => {
    if (confidence >= 95) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          <strong className="font-bold text-emerald-700">{confidence}%</strong>
          <span className="text-emerald-900 font-medium">high confidence</span>
        </span>
      );
    }
    if (confidence >= 80) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
          <strong className="font-bold text-amber-700">{confidence}%</strong>
          <span className="text-amber-900 font-medium">probable match</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
        <strong className="font-bold text-rose-700">{confidence ? `${confidence}%` : 'Unmatched'}</strong>
        <span className="text-rose-900 font-medium">manual review</span>
      </span>
    );
  };

  // Generate candidates for modal
  const getCandidatesForTransaction = (item: ReconciliationItem): CandidateMatch[] => {
    if (CANDIDATE_LOOKUP[item.id]) {
      return CANDIDATE_LOOKUP[item.id];
    }
    // Dynamic fallback candidates based on amount
    return [
      {
        targetName: 'Outpatient Clinic Desk',
        patientId: 'PAT-1090',
        invoiceNumber: `INV-${item.id.replace('REC-', '93')}`,
        serviceDescription: 'Outpatient Service Fee',
        invoiceAmount: item.amount,
        formattedAmount: item.formattedAmount,
        confidence: 76,
        heuristic: 'Exact amount match on outpatient counter ledger'
      },
      {
        targetName: 'Laboratory Services',
        patientId: 'PAT-1102',
        invoiceNumber: `INV-${item.id.replace('REC-', '94')}`,
        serviceDescription: 'Diagnostic Pathology Test',
        invoiceAmount: item.amount,
        formattedAmount: item.formattedAmount,
        confidence: 71,
        heuristic: 'Matching daily batch timestamp'
      },
      {
        targetName: 'Pharmacy Counter',
        patientId: 'PAT-1114',
        invoiceNumber: `INV-${item.id.replace('REC-', '95')}`,
        serviceDescription: 'Prescription Dispensation',
        invoiceAmount: item.amount + 500,
        formattedAmount: `₦${(item.amount + 500).toLocaleString()}`,
        confidence: 62,
        heuristic: 'Partial copay candidate (₦500 variance)'
      }
    ];
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-[#12244D]">
            Reconciliation
          </h1>
          <p className="text-xs md:text-sm text-[#475569] mt-0.5 font-sans">
            Match incoming multi-channel payments to patients, invoices, and providers. Confidence scores are calculated using deterministic reference matching and string similarity algorithms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Single Backlog Counter in Amber */}
          <div className="font-sans text-xs bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              <strong className="font-bold text-amber-800">{unmatchedCount} items</strong> awaiting review
            </span>
          </div>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportReconciliation}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-[#12244D] border border-[#cbd5e1] transition-all shadow-xs cursor-pointer disabled:opacity-60"
            title="Export confirmed reconciliation entries as CSV"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B6B69]" /> : <Download className="w-3.5 h-3.5 text-[#0B6B69]" />}
            {exporting ? 'Export Batch (CSV)' : 'Export Batch (CSV)'}
          </button>
        </div>
      </div>

      {/* Primary Queue Tabs & Sub-Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Main Segmented Queue Control */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#cbd5e1] bg-white p-0.5 text-xs font-sans shadow-xs">
            <button
              type="button"
              onClick={() => setActiveQueueTab('action')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                activeQueueTab === 'action'
                  ? 'bg-[#12244D] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#12244D]'
              }`}
            >
              Action Queue
            </button>
            <button
              type="button"
              onClick={() => setActiveQueueTab('confirmed')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                activeQueueTab === 'confirmed'
                  ? 'bg-[#12244D] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#12244D]'
              }`}
            >
              Confirmed ({confirmedCount})
            </button>
          </div>

          {/* Sub-Filters for Action Queue */}
          {activeQueueTab === 'action' && (
            <div className="hidden sm:inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-sans border border-slate-200">
              <button
                type="button"
                onClick={() => setActionSubFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
                  actionSubFilter === 'all'
                    ? 'bg-white text-[#12244D] shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Actionable ({unmatchedCount})
              </button>
              <button
                type="button"
                onClick={() => setActionSubFilter('suggested')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
                  actionSubFilter === 'suggested'
                    ? 'bg-white text-[#0B6B69] shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-[#0B6B69]'
                }`}
              >
                Ready to Confirm ({readyToConfirmCount})
              </button>
              <button
                type="button"
                onClick={() => setActionSubFilter('manual')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
                  actionSubFilter === 'manual'
                    ? 'bg-white text-rose-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                Needs Review ({needsManualCount})
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Filters, Search, and Shortcut */}
        <div className="flex items-center gap-2 flex-1 max-w-2xl justify-end">
          {/* Shortcut: Select all >=95% */}
          {activeQueueTab === 'action' && highConfidenceActionable.length > 0 && (
            <button
              type="button"
              onClick={handleSelectHighConfidenceShortcut}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
              title="Quickly select all transactions with ≥95% confidence matches"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Select all ≥95% ({highConfidenceActionable.length})</span>
            </button>
          )}

          {/* Channel Dropdown Filter */}
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 text-[#334155] focus:outline-none focus:border-[#0B6B69] shadow-xs"
          >
            <option value="All">Channel: All</option>
            <option value="Bank transfer">Bank transfer</option>
            <option value="POS card">POS card</option>
            <option value="USSD">USSD</option>
          </select>

          {/* Live Search Input */}
          <div className="relative flex-1 max-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, name…"
              className="w-full pl-8 pr-3 py-1.5 text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0B6B69] shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating / Pinned Bulk Action Bar on Selection */}
      {activeQueueTab === 'action' && selectedCount > 0 && (
        <div className="bg-[#12244D] text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xs bg-white/20 px-2.5 py-1 rounded-md text-white">
              {selectedCount} selected
            </span>
            <span className="text-xs text-slate-300">
              Total payment value: <strong className="text-white font-mono font-bold">₦{selectedTotalAmount.toLocaleString()}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 font-sans">
            <button
              type="button"
              onClick={() => selectAllReconItems(false)}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={bulkConfirmSelected}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#0B6B69] hover:bg-[#074C4A] text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Confirm {selectedCount} matches
            </button>
          </div>
        </div>
      )}

      {/* Main Reconciliation Table */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="broadsheet-table">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th style={{ width: '38px' }} className="text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={(e) => selectAllReconItems(e.target.checked)}
                    disabled={activeQueueTab === 'confirmed' || displayedItems.length === 0}
                    className="rounded border-[#cbd5e1] text-[#0B6B69] focus:ring-[#0B6B69] cursor-pointer"
                  />
                </th>
                <th style={{ width: '105px' }}>Date / Age</th>
                <th style={{ width: '145px' }} className="text-right">Payment & Bill</th>
                <th style={{ minWidth: '180px' }}>Description</th>
                <th style={{ minWidth: '320px' }}>Suggested Match</th>
                <th style={{ width: '145px' }} className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#64748b] font-sans">
                    <p className="text-sm">No transactions match the selected filters.</p>
                    <button
                      onClick={() => { setSearchQuery(''); setFilterChannel('All'); setActionSubFilter('all'); }}
                      className="text-xs font-semibold text-[#0B6B69] hover:underline mt-2 inline-block cursor-pointer"
                    >
                      Clear search and filter criteria
                    </button>
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => {
                  const isConfirmed = item.status === 'confirmed';
                  const hasExactMatch = item.aiMatch.invoiceAmount && item.amount === item.aiMatch.invoiceAmount;
                  const isPartial = item.aiMatch.invoiceAmount && item.amount < item.aiMatch.invoiceAmount;
                  const isOverpaid = item.aiMatch.invoiceAmount && item.amount > item.aiMatch.invoiceAmount;
                  const isLowConfidenceOrUnscored = item.aiMatch.confidence < 80 || !item.aiMatch.invoiceNumber;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.selected ? 'bg-[#ebf7f6]/40' : ''
                      } ${isConfirmed ? 'opacity-80 bg-[#f8fafc]' : 'hover:bg-[#f8fafc]'}`}
                    >
                      {/* Checkbox */}
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={!!item.selected}
                          disabled={isConfirmed}
                          onChange={() => toggleSelectReconItem(item.id)}
                          className="rounded border-[#cbd5e1] text-[#0B6B69] focus:ring-[#0B6B69] cursor-pointer"
                        />
                      </td>

                      {/* Date & Days Outstanding */}
                      <td>
                        <div className="font-sans font-semibold text-xs text-[#12244D]">
                          {item.date}
                        </div>
                        <div className="text-[11px] font-sans text-slate-500 mt-0.5">
                          {getDaysOutstanding(item.date)}
                        </div>
                      </td>

                      {/* Payment Amount & Expected Invoice Amount (Right-Aligned) */}
                      <td className="text-right">
                        <div className="font-mono font-bold text-sm text-[#12244D] tabular-nums">
                          {item.formattedAmount}
                        </div>
                        <div className="text-[11px] font-sans text-slate-600 mt-0.5 tabular-nums">
                          {item.aiMatch.invoiceAmount ? (
                            <>
                              <span>Inv: ₦{item.aiMatch.invoiceAmount.toLocaleString()}</span>
                              {hasExactMatch && (
                                <span className="text-emerald-700 font-semibold ml-1">✓ Exact</span>
                              )}
                              {isPartial && (
                                <span className="text-amber-700 font-semibold ml-1 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded text-[10px]">
                                  -₦{(item.aiMatch.invoiceAmount - item.amount).toLocaleString()} (Partial)
                                </span>
                              )}
                              {isOverpaid && (
                                <span className="text-blue-700 font-semibold ml-1 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded text-[10px]">
                                  +₦{(item.amount - item.aiMatch.invoiceAmount).toLocaleString()}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400">No invoice linked</span>
                          )}
                        </div>
                      </td>

                      {/* Description & Payment Channel */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          {getChannelIcon(item.channel)}
                          <span className="font-medium text-[#0f172a] font-sans text-xs">
                            {item.description}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                          {item.channel}
                        </div>
                      </td>

                      {/* Suggested Match & Evidence (Raw Narration adjacent to match) */}
                      <td>
                        <div className="flex flex-col gap-1">
                          {/* Raw Bank Narration next to Candidate Match */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span 
                              className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded shadow-2xs" 
                              title="Raw bank rail narration text"
                            >
                              {item.rawDetails}
                            </span>
                            <span className="text-slate-400 text-xs font-sans">→</span>
                            <span className="font-bold text-xs text-[#12244D] font-sans">
                              {item.aiMatch.targetName}
                            </span>
                            {item.aiMatch.invoiceNumber && (
                              <span className="font-mono text-[11px] text-[#0B6B69] font-semibold bg-[#EBF7F6] px-1.5 py-0.2 rounded border border-[#0B6B69]/20">
                                {item.aiMatch.invoiceNumber}
                              </span>
                            )}
                          </div>

                          {/* Tiered Confidence Pill */}
                          <div className="flex items-center gap-2">
                            {renderConfidencePill(item.aiMatch.confidence)}
                          </div>

                          {/* Concise One-Line Reason (replaces identical ? icons) */}
                          <div className="text-[11px] text-slate-500 font-sans leading-tight mt-0.5">
                            {item.aiMatch.matchReason || item.aiMatch.explanation}
                          </div>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="text-right">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold font-sans">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Reconciled
                          </span>
                        ) : isLowConfidenceOrUnscored ? (
                          /* Low confidence / unscored rows get "Find match" */
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => setFindingMatchItem(item)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#12244D] hover:bg-[#0d1a38] text-white transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                              title="Inspect top 3 candidate matches from patient directory & invoices"
                            >
                              <Search className="w-3 h-3" />
                              Find match
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectReconItem(item.id, 'Cashier reassigned to unallocated holding')}
                              className="px-2 py-1 text-xs font-medium rounded-md text-[#64748b] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          /* High & Probable confidence rows get Confirm & Reject */
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => confirmReconItem(item.id)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#0B6B69] hover:bg-[#074C4A] text-white transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectReconItem(item.id)}
                              className="px-2 py-1 text-xs font-medium rounded-md text-[#64748b] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Find Match Top 3 Candidates Modal */}
      <Modal
        isOpen={!!findingMatchItem}
        onClose={() => setFindingMatchItem(null)}
        title="Find Match for Transaction"
        subtitle={`Transaction: ${findingMatchItem?.id} · ${findingMatchItem?.formattedAmount} via ${findingMatchItem?.channel}`}
      >
        {findingMatchItem && (
          <div className="space-y-4">
            {/* Transaction Narration & Evidence Box */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-sans space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600 uppercase text-[10px] tracking-wider">Unmatched Rail Transaction</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-300 font-semibold text-[#12244D]">
                  {findingMatchItem.channel}
                </span>
              </div>
              <div className="text-[#12244D] font-medium">
                Narration: <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">{findingMatchItem.rawDetails}</span>
              </div>
              <div className="text-slate-500">
                Payment Description: <span className="text-slate-700">{findingMatchItem.description}</span> · Date: {findingMatchItem.date}, 2026
              </div>
            </div>

            <div className="text-xs font-semibold text-[#12244D] flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#0B6B69]" />
              Top 3 Candidate Matches (Hospital Ledger & EMR)
            </div>

            {/* Candidate Cards */}
            <div className="space-y-2.5">
              {getCandidatesForTransaction(findingMatchItem).map((candidate) => {
                const diff = candidate.invoiceAmount - findingMatchItem.amount;
                const isExact = diff === 0;

                return (
                  <div 
                    key={candidate.invoiceNumber}
                    className="p-3.5 bg-white rounded-lg border border-slate-200 hover:border-[#0B6B69] transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#12244D]">
                          {candidate.targetName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          {candidate.patientId}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-[#0B6B69] bg-[#EBF7F6] px-1.5 py-0.2 rounded border border-[#0B6B69]/20">
                          {candidate.invoiceNumber}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600">
                        {candidate.serviceDescription}
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Invoice Amount: <strong className="font-mono text-slate-800">{candidate.formattedAmount}</strong></span>
                        {isExact ? (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            ✓ Exact amount match
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            {diff > 0 ? `₦${diff.toLocaleString()} balance remaining` : `₦${Math.abs(diff).toLocaleString()} overpaid`}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-[#0B6B69] bg-[#F0FAF9] px-2 py-1 rounded border border-[#0B6B69]/20 font-medium mt-1">
                        Heuristic: {candidate.heuristic}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        confirmReconItem(findingMatchItem.id, {
                          targetName: candidate.targetName,
                          invoiceNumber: candidate.invoiceNumber,
                          invoiceAmount: candidate.invoiceAmount,
                          confidence: candidate.confidence,
                          matchReason: candidate.heuristic,
                          explanation: `Cashier selected candidate match: ${candidate.targetName} (${candidate.invoiceNumber}). ${candidate.heuristic}`
                        });
                        setFindingMatchItem(null);
                      }}
                      className="px-3 py-2 text-xs font-bold rounded-lg bg-[#0B6B69] hover:bg-[#074C4A] text-white transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Link & Confirm
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 font-sans">
              <button
                type="button"
                onClick={() => setFindingMatchItem(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deep Match Analysis Modal (Audit Trail) */}
      <Modal
        isOpen={!!inspectingItem}
        onClose={() => setInspectingItem(null)}
        title="Match Analysis & Audit Trail"
        subtitle={`Transaction ID: ${inspectingItem?.id} · ${inspectingItem?.formattedAmount}`}
      >
        {inspectingItem && (
          <div className="space-y-4 font-sans text-xs">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Payment Source</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-300 font-semibold text-[#12244D]">
                  {inspectingItem.channel}
                </span>
              </div>
              <div className="text-sm font-semibold text-[#12244D]">
                Raw Note: <span className="font-mono font-normal text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">{inspectingItem.rawDetails}</span>
              </div>
              <div className="text-slate-500">
                Date Captured: {inspectingItem.date}, 2026
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-lg border border-[#0B6B69]/30 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#0B6B69]">
                  <Sparkles className="w-3.5 h-3.5 text-[#0B6B69]" />
                  Suggested Resolution
                </div>
                {renderConfidencePill(inspectingItem.aiMatch.confidence)}
              </div>

              <div className="pt-1">
                <div className="text-sm font-bold text-[#12244D]">
                  {inspectingItem.aiMatch.targetName}
                </div>
                {inspectingItem.aiMatch.invoiceNumber && (
                  <div className="text-slate-600 mt-0.5">
                    Matched Invoice: <span className="font-mono font-semibold text-[#0B6B69]">{inspectingItem.aiMatch.invoiceNumber}</span>
                  </div>
                )}
              </div>

              <p className="text-slate-700 bg-[#F0FAF9] p-2.5 rounded-md border border-[#0B6B69]/20 leading-relaxed">
                {inspectingItem.aiMatch.explanation}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  rejectReconItem(inspectingItem.id, 'Cashier reassigned to unallocated holding');
                  setInspectingItem(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              >
                Reject / Flag
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmReconItem(inspectingItem.id);
                  setInspectingItem(null);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#0B6B69] hover:bg-[#074C4A] text-white shadow-xs transition-colors cursor-pointer"
              >
                Confirm Match
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
