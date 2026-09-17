import React, { useState, useMemo } from 'react';
import { useWelliPay } from '../../context/WelliPayContext';
import { StatusChip } from '../../components/ui/StatusChip';
import { Modal } from '../../components/ui/Modal';
import { 
  Search, 
  Sparkles, 
  Check, 
  X, 
  Filter, 
  ArrowUpDown, 
  CheckCheck,
  HelpCircle,
  Clock,
  Building,
  CreditCard,
  PhoneCall,
  CheckCircle,
  Download,
  Loader2
} from 'lucide-react';
import { auth } from '../../firebase';
import { ReconciliationItem } from '../../types';

export const ReconciliationQueue: React.FC = () => {
  const {
    reconciliationItems,
    toggleSelectReconItem,
    selectAllReconItems,
    confirmReconItem,
    rejectReconItem,
    bulkConfirmSelected,
    filterReconStatus,
    setFilterReconStatus,
    filterChannel,
    setFilterChannel,
    searchQuery,
    setSearchQuery,
    unmatchedCount,
    suggestedCount,
    confirmedCount,
    selectedCount,
    addNotification,
  } = useWelliPay();

  // Selected item for AI match deep inspection modal
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

  // Filter items based on active status, channel, and search query
  const displayedItems = useMemo(() => {
    return reconciliationItems.filter((item) => {
      // Status filter
      if (filterReconStatus === 'unmatched') {
        if (item.status !== 'unmatched') return false;
      } else if (filterReconStatus === 'suggested') {
        if (item.status !== 'unmatched' || !item.aiMatch.isHighConfidence) return false;
      } else if (filterReconStatus === 'confirmed') {
        if (item.status !== 'confirmed') return false;
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
  }, [reconciliationItems, filterReconStatus, filterChannel, searchQuery]);

  const allFilteredSelected = displayedItems.length > 0 && displayedItems.every((i) => i.selected);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'Bank transfer':
        return <Building className="w-3.5 h-3.5 text-brand-teal" />;
      case 'POS card':
        return <CreditCard className="w-3.5 h-3.5 text-slate-500" />;
      case 'USSD':
        return <PhoneCall className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#12244D]">
            Reconciliation
          </h1>
          <p className="text-sm text-[#475569] mt-1 font-sans">
            Match incoming multi-channel payments to patients, invoices, and providers. AI calculates a confidence score based on fuzzy name and bill matching.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="font-sans text-xs text-[#475569] bg-white px-3.5 py-2 rounded-lg border border-[#e2e8f0] shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium">{confirmedCount} confirmed this week</span>
            <span className="opacity-40">·</span>
            <span className="font-bold text-[#0B6B69]">{unmatchedCount} unmatched</span>
          </div>

          <button
            type="button"
            onClick={handleExportReconciliation}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-[#12244D] border border-[#cbd5e1] transition-all shadow-xs cursor-pointer disabled:opacity-60"
            title="Export confirmed reconciliation entries as CSV"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B6B69]" /> : <Download className="w-3.5 h-3.5 text-[#0B6B69]" />}
            {exporting ? 'Exporting...' : 'Export Reconciliation Batch'}
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Status Segmented Control */}
        <div className="inline-flex rounded-lg border border-[#cbd5e1] bg-white p-1 text-xs font-sans shadow-xs">
          <button
            onClick={() => setFilterReconStatus('unmatched')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              filterReconStatus === 'unmatched'
                ? 'bg-[#12244D] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#12244D]'
            }`}
          >
            Unmatched ({unmatchedCount})
          </button>
          <button
            onClick={() => setFilterReconStatus('suggested')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              filterReconStatus === 'suggested'
                ? 'bg-[#0B6B69] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#0B6B69]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Suggested ({suggestedCount})
          </button>
          <button
            onClick={() => setFilterReconStatus('confirmed')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              filterReconStatus === 'confirmed'
                ? 'bg-[#12244D] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#12244D]'
            }`}
          >
            Confirmed ({confirmedCount})
          </button>
        </div>

        {/* Dropdown Filters & Search */}
        <div className="flex items-center gap-2.5 flex-1 max-w-2xl justify-end">
          {/* Channel Filter */}
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg px-3 py-1.5 text-[#334155] focus:outline-none focus:border-[#0B6B69] shadow-xs"
          >
            <option value="All">Channel: All</option>
            <option value="Bank transfer">Bank transfer</option>
            <option value="POS card">POS card</option>
            <option value="USSD">USSD</option>
          </select>

          {/* Time range indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg px-3 py-1.5 text-[#475569] shadow-xs">
            <Clock className="w-3.5 h-3.5 text-[#64748b]" />
            <span>Last 7 days</span>
          </div>

          {/* Live Search Input */}
          <div className="relative flex-1 max-w-[280px]">
            <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, name, amount…"
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

      {/* Main Table Container */}
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
                    disabled={filterReconStatus === 'confirmed' || displayedItems.length === 0}
                    className="rounded border-[#cbd5e1] text-[#0B6B69] focus:ring-[#0B6B69] cursor-pointer"
                  />
                </th>
                <th style={{ width: '85px' }}>Date</th>
                <th style={{ width: '110px' }}>Amount</th>
                <th style={{ minWidth: '220px' }}>Description</th>
                <th style={{ minWidth: '290px' }}>AI Suggested Match</th>
                <th style={{ width: '150px' }} className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#64748b] font-sans">
                    <p className="text-sm">No transactions match the selected filters.</p>
                    <button
                      onClick={() => { setSearchQuery(''); setFilterChannel('All'); }}
                      className="text-xs font-semibold text-[#0B6B69] hover:underline mt-2 inline-block"
                    >
                      Clear search filters
                    </button>
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => {
                  const isConfirmed = item.status === 'confirmed';
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

                      {/* Date */}
                      <td className="font-sans text-xs text-[#64748b]">
                        {item.date}
                      </td>

                      {/* Amount */}
                      <td className="font-sans font-bold text-sm text-[#12244D]">
                        {item.formattedAmount}
                      </td>

                      {/* Description & Channel */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          {getChannelIcon(item.channel)}
                          <span className="font-medium text-[#0f172a] font-sans text-xs">
                            {item.description}
                          </span>
                        </div>
                        <span className="block text-[11px] text-[#64748b] font-mono mt-0.5">
                          {item.rawDetails}
                        </span>
                      </td>

                      {/* AI Match Chip */}
                      <td>
                        <div className="flex items-center gap-2">
                          {item.aiMatch.isHighConfidence ? (
                            <StatusChip
                              status="high-confidence"
                              confidence={item.aiMatch.confidence}
                              targetText={`${item.aiMatch.targetName}${item.aiMatch.invoiceNumber ? `, ${item.aiMatch.invoiceNumber}` : ''}`}
                              onClick={() => setInspectingItem(item)}
                              className="cursor-pointer"
                            />
                          ) : (
                            <StatusChip
                              status="low-confidence"
                              label="Low confidence — manual check"
                              onClick={() => setInspectingItem(item)}
                              className="cursor-pointer"
                            />
                          )}

                          <button
                            onClick={() => setInspectingItem(item)}
                            title="Inspect AI reasoning and payment metadata"
                            className="text-[#94a3b8] hover:text-[#0B6B69] p-1 transition-colors"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="text-right">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold font-sans">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Reconciled
                          </span>
                        ) : (
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
                              className="px-2 py-1 text-xs font-medium rounded-md text-[#64748b] hover:text-rose-600 hover:bg-rose-50 transition-colors"
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

        {/* Bottom Bulk Action Bar */}
        {filterReconStatus !== 'confirmed' && (
          <div className="bg-[#f8fafc] border-t border-[#e2e8f0] px-6 py-3 flex items-center justify-between font-sans">
            <span className="text-xs text-[#475569]">
              <span className="font-bold text-[#12244D]">{selectedCount}</span> selected for bulk reconciliation
            </span>

            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={bulkConfirmSelected}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                selectedCount > 0
                  ? 'bg-[#0B6B69] text-white hover:bg-[#074C4A] shadow-card cursor-pointer'
                  : 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Bulk confirm matches
            </button>
          </div>
        )}
      </div>

      {/* AI Reasoning Inspection Modal */}
      <Modal
        isOpen={!!inspectingItem}
        onClose={() => setInspectingItem(null)}
        title="AI Match Analysis & Audit Trail"
        subtitle={`Transaction ID: ${inspectingItem?.id} · ${inspectingItem?.formattedAmount}`}
      >
        {inspectingItem && (
          <div className="space-y-4">
            <div className="p-3.5 bg-[#F0F4FA] rounded-lg border border-[#12244D]/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748b] uppercase tracking-wide font-semibold">Payment Source</span>
                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-[#cbd5e1] font-semibold text-[#12244D]">
                  {inspectingItem.channel}
                </span>
              </div>
              <div className="text-sm font-semibold text-[#12244D]">
                Raw Note: <span className="font-mono font-normal text-[#334155]">{inspectingItem.rawDetails}</span>
              </div>
              <div className="text-xs text-[#64748b]">
                Date Captured: {inspectingItem.date}, 2026
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-lg border border-[#0B6B69]/30 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B6B69]">
                  <Sparkles className="w-3.5 h-3.5 text-[#0B6B69]" />
                  AI Suggested Resolution
                </div>
                <StatusChip
                  status={inspectingItem.aiMatch.isHighConfidence ? 'high-confidence' : 'low-confidence'}
                  confidence={inspectingItem.aiMatch.confidence}
                  label={inspectingItem.aiMatch.isHighConfidence ? undefined : 'Review needed'}
                />
              </div>

              <div className="pt-1">
                <div className="text-sm font-bold text-[#12244D]">
                  {inspectingItem.aiMatch.targetName}
                </div>
                {inspectingItem.aiMatch.invoiceNumber && (
                  <div className="text-xs text-[#64748b] mt-0.5">
                    Matched Invoice: <span className="font-mono font-semibold text-[#0B6B69]">{inspectingItem.aiMatch.invoiceNumber}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-[#334155] bg-[#F0FAF9] p-2.5 rounded-md border border-[#0B6B69]/20 leading-relaxed">
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
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
              >
                Reject / Flag
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmReconItem(inspectingItem.id);
                  setInspectingItem(null);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#0B6B69] hover:bg-[#074C4A] text-white shadow-xs transition-colors"
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
