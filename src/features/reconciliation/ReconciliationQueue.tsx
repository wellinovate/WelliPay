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
  CheckCircle
} from 'lucide-react';
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
  } = useWelliPay();

  // Selected item for AI match deep inspection modal
  const [inspectingItem, setInspectingItem] = useState<ReconciliationItem | null>(null);

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
        return <Building className="w-3.5 h-3.5 text-[#006786]" />;
      case 'POS card':
        return <CreditCard className="w-3.5 h-3.5 text-[#605d5d]" />;
      case 'USSD':
        return <PhoneCall className="w-3.5 h-3.5 text-[#edbb00]" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#201e1d]">
            Reconciliation
          </h1>
          <p className="text-sm text-[#605d5d] mt-1 font-serif">
            Match incoming payments to patients, invoices and providers. AI suggests a match with a confidence score — confirm or correct it.
          </p>
        </div>
        <div className="font-sans text-xs text-[#605d5d] bg-white px-3 py-1.5 rounded border border-[#d7d3d3] shadow-xs flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>{confirmedCount} confirmed this week</span>
          <span className="opacity-40">·</span>
          <span className="font-semibold text-[#0088b0]">{unmatchedCount} unmatched</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Status Segmented Control */}
        <div className="inline-flex rounded border border-[#201e1d]/20 bg-white/70 p-0.5 text-xs font-sans">
          <button
            onClick={() => setFilterReconStatus('unmatched')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              filterReconStatus === 'unmatched'
                ? 'bg-[#201e1d] text-white shadow-xs'
                : 'text-[#444141] hover:text-[#201e1d]'
            }`}
          >
            Unmatched ({unmatchedCount})
          </button>
          <button
            onClick={() => setFilterReconStatus('suggested')}
            className={`px-3 py-1.5 rounded font-medium transition-all flex items-center gap-1 ${
              filterReconStatus === 'suggested'
                ? 'bg-[#201e1d] text-white shadow-xs'
                : 'text-[#444141] hover:text-[#201e1d]'
            }`}
          >
            <Sparkles className="w-3 h-3 text-[#0088b0]" />
            Suggested ({suggestedCount})
          </button>
          <button
            onClick={() => setFilterReconStatus('confirmed')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              filterReconStatus === 'confirmed'
                ? 'bg-[#201e1d] text-white shadow-xs'
                : 'text-[#444141] hover:text-[#201e1d]'
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
            className="text-xs font-sans bg-white border border-[#201e1d]/20 rounded px-2.5 py-1.5 text-[#2d2b2b] focus:outline-none focus:border-[#0088b0]"
          >
            <option value="All">Channel: All</option>
            <option value="Bank transfer">Bank transfer</option>
            <option value="POS card">POS card</option>
            <option value="USSD">USSD</option>
          </select>

          {/* Time range indicator */}
          <div className="hidden sm:flex items-center gap-1 text-xs font-sans bg-white border border-[#201e1d]/20 rounded px-2.5 py-1.5 text-[#605d5d]">
            <Clock className="w-3 h-3 text-[#7d7979]" />
            <span>Last 7 days</span>
          </div>

          {/* Live Search Input */}
          <div className="relative flex-1 max-w-[280px]">
            <Search className="w-3.5 h-3.5 text-[#7d7979] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, name, amount…"
              className="w-full pl-8 pr-3 py-1.5 text-xs font-sans bg-white border border-[#201e1d]/20 rounded text-[#201e1d] placeholder-[#9b9797] focus:outline-none focus:border-[#0088b0]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7d7979] hover:text-[#201e1d]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-[#201e1d]/20 rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="broadsheet-table">
            <thead>
              <tr className="bg-[#fcfbf9]">
                <th style={{ width: '38px' }} className="text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={(e) => selectAllReconItems(e.target.checked)}
                    disabled={filterReconStatus === 'confirmed' || displayedItems.length === 0}
                    className="rounded border-[#bab6b6] text-[#0088b0] focus:ring-[#0088b0] cursor-pointer"
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
                  <td colSpan={6} className="text-center py-12 text-[#7d7979] font-sans">
                    <p className="text-sm">No transactions match the selected filters.</p>
                    <button
                      onClick={() => { setSearchQuery(''); setFilterChannel('All'); }}
                      className="text-xs text-[#0088b0] hover:underline mt-2 inline-block"
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
                        item.selected ? 'bg-[#e9f8ff]/30' : ''
                      } ${isConfirmed ? 'opacity-80 bg-[#f9f9f9]' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={!!item.selected}
                          disabled={isConfirmed}
                          onChange={() => toggleSelectReconItem(item.id)}
                          className="rounded border-[#bab6b6] text-[#0088b0] focus:ring-[#0088b0] cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="font-sans text-xs text-[#605d5d]">
                        {item.date}
                      </td>

                      {/* Amount */}
                      <td className="font-heading font-semibold text-sm text-[#201e1d]">
                        {item.formattedAmount}
                      </td>

                      {/* Description & Channel */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          {getChannelIcon(item.channel)}
                          <span className="font-medium text-[#201e1d] font-sans text-xs">
                            {item.description}
                          </span>
                        </div>
                        <span className="block text-[11px] text-[#7d7979] font-mono mt-0.5">
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
                            className="text-[#9b9797] hover:text-[#0088b0] p-1"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="text-right">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#1e7e47] font-medium font-sans">
                            <Check className="w-3.5 h-3.5 text-[#2a9d5c]" />
                            Reconciled
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => confirmReconItem(item.id)}
                              className="px-2.5 py-1 text-xs font-medium rounded bg-[#0088b0] hover:bg-[#006786] text-white transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectReconItem(item.id)}
                              className="px-2 py-1 text-xs font-medium rounded text-[#605d5d] hover:text-[#d6006c] hover:bg-black/5 transition-colors"
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

        {/* Bottom Bulk Action Bar (Directly matching wireframe) */}
        {filterReconStatus !== 'confirmed' && (
          <div className="bg-[#fcfbf9] border-t border-[#201e1d]/15 px-6 py-3 flex items-center justify-between font-sans">
            <span className="text-xs text-[#605d5d]">
              <span className="font-semibold text-[#201e1d]">{selectedCount}</span> selected for bulk reconciliation
            </span>

            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={bulkConfirmSelected}
              className={`px-4 py-1.5 text-xs font-semibold rounded transition-all flex items-center gap-2 ${
                selectedCount > 0
                  ? 'bg-[#0088b0] text-white hover:bg-[#006786] shadow-sm cursor-pointer'
                  : 'bg-[#d7d3d3] text-[#7d7979] cursor-not-allowed'
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
            <div className="p-3 bg-[#f3f2f2] rounded border border-[#201e1d]/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#605d5d] uppercase tracking-wide font-semibold">Payment Source</span>
                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-[#bab6b6]">
                  {inspectingItem.channel}
                </span>
              </div>
              <div className="text-sm font-semibold text-[#201e1d]">
                Raw Note: <span className="font-mono font-normal">{inspectingItem.rawDetails}</span>
              </div>
              <div className="text-xs text-[#605d5d]">
                Date Captured: {inspectingItem.date}, 2026
              </div>
            </div>

            <div className="p-3 bg-white rounded border border-[#0088b0]/30 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#006786]">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Suggested Resolution
                </div>
                <StatusChip
                  status={inspectingItem.aiMatch.isHighConfidence ? 'high-confidence' : 'low-confidence'}
                  confidence={inspectingItem.aiMatch.confidence}
                  label={inspectingItem.aiMatch.isHighConfidence ? undefined : 'Review needed'}
                />
              </div>

              <div className="pt-1">
                <div className="text-sm font-bold text-[#201e1d]">
                  {inspectingItem.aiMatch.targetName}
                </div>
                {inspectingItem.aiMatch.invoiceNumber && (
                  <div className="text-xs text-[#605d5d]">
                    Matched Invoice: <span className="font-mono text-[#0088b0]">{inspectingItem.aiMatch.invoiceNumber}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-[#444141] bg-[#e9f8ff]/50 p-2 rounded border border-[#99e0ff]/40">
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
                className="px-3 py-1.5 rounded text-xs font-medium text-[#aa0b56] hover:bg-[#fff1f4] border border-[#ffc0d0]"
              >
                Reject / Flag
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmReconItem(inspectingItem.id);
                  setInspectingItem(null);
                }}
                className="px-4 py-1.5 rounded text-xs font-medium bg-[#0088b0] hover:bg-[#006786] text-white"
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
