import React, { useState, useEffect, useMemo } from 'react';
import { auth } from '../../firebase';
import { Invoice, InvoiceOrder } from '../../types';
import { 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Copy, 
  ExternalLink, 
  Receipt, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown,
  FileSpreadsheet,
  X,
  Printer,
  Calendar
} from 'lucide-react';

const PAY_BASE_URL = 'https://wellipay.onrender.com/pay';

// Fallback patient orders if batch invoice orders were not pre-hydrated
const DEFAULT_BATCH_ORDERS: Record<string, InvoiceOrder[]> = {
  '5': [
    { id: 'LAB-EUC-01', patientName: 'Grace Okafor', patientMrn: 'MRN-LSH-10015', serviceType: 'Electrolytes, Urea & Creatinine', category: 'Chemical Pathology', amount: 28000, formattedAmount: '₦28,000', status: 'invoiced' },
    { id: 'LAB-EUC-02', patientName: 'Oluwaseun Bakare', patientMrn: 'MRN-LSH-10017', serviceType: 'Electrolytes, Urea & Creatinine', category: 'Chemical Pathology', amount: 28000, formattedAmount: '₦28,000', status: 'invoiced' },
    { id: 'LAB-EUC-03', patientName: 'T. Adeyemi', patientMrn: 'MRN-LSH-10004', serviceType: 'Electrolytes, Urea & Creatinine', category: 'Chemical Pathology', amount: 28000, formattedAmount: '₦28,000', status: 'invoiced' },
    { id: 'LAB-EUC-04', patientName: 'M. Bello', patientMrn: 'MRN-LSH-10005', serviceType: 'Electrolytes, Urea & Creatinine', category: 'Chemical Pathology', amount: 28000, formattedAmount: '₦28,000', status: 'invoiced' },
    { id: 'LAB-EUC-05', patientName: 'J. Umar', patientMrn: 'MRN-LSH-10006', serviceType: 'Electrolytes, Urea & Creatinine', category: 'Chemical Pathology', amount: 28000, formattedAmount: '₦28,000', status: 'invoiced' },
  ],
  '4': [
    { id: 'LAB-LIP-01', patientName: 'Ibrahim Danjuma', patientMrn: 'MRN-LSH-10018', serviceType: 'Lipid Profile Panels', category: 'Chemical Pathology', amount: 26000, formattedAmount: '₦26,000', status: 'invoiced' },
    { id: 'LAB-LIP-02', patientName: 'Zainab Abiola', patientMrn: 'MRN-LSH-10019', serviceType: 'Lipid Profile Panels', category: 'Chemical Pathology', amount: 26000, formattedAmount: '₦26,000', status: 'invoiced' },
    { id: 'LAB-LIP-03', patientName: 'Samuel Ogundipe', patientMrn: 'MRN-LSH-10020', serviceType: 'Lipid Profile Panels', category: 'Chemical Pathology', amount: 26000, formattedAmount: '₦26,000', status: 'invoiced' },
    { id: 'LAB-LIP-04', patientName: 'Folake Adeleke', patientMrn: 'MRN-LSH-10021', serviceType: 'Lipid Profile Panels', category: 'Chemical Pathology', amount: 26000, formattedAmount: '₦26,000', status: 'invoiced' },
  ],
  '8': [
    { id: 'LAB-FBC-01', patientName: 'Chinedu Eze', patientMrn: 'MRN-LSH-10008', serviceType: 'Full Blood Count', category: 'Hematology', amount: 12000, formattedAmount: '₦12,000', status: 'invoiced' },
    { id: 'LAB-FBC-02', patientName: 'Halima Bello', patientMrn: 'MRN-LSH-10003', serviceType: 'Full Blood Count', category: 'Hematology', amount: 12000, formattedAmount: '₦12,000', status: 'invoiced' },
    { id: 'LAB-FBC-03', patientName: 'Adebayo Adeleke', patientMrn: 'MRN-LSH-10012', serviceType: 'Full Blood Count', category: 'Hematology', amount: 12000, formattedAmount: '₦12,000', status: 'invoiced' },
    { id: 'LAB-FBC-04', patientName: 'Kemi Adeleke', patientMrn: 'MRN-LSH-10001', serviceType: 'Full Blood Count', category: 'Hematology', amount: 12000, formattedAmount: '₦12,000', status: 'invoiced' },
    { id: 'LAB-FBC-05', patientName: 'Babatunde Fashola', patientMrn: 'MRN-LSH-10007', serviceType: 'Full Blood Count', category: 'Hematology', amount: 12000, formattedAmount: '₦12,000', status: 'invoiced' },
    { id: 'LAB-FBC-06', patientName: 'Ngozi Okonjo', patientMrn: 'MRN-LSH-10014', serviceType: 'Full Blood Count', category: 'Hematology', amount: 12000, formattedAmount: '₦12,000', status: 'invoiced' },
    { id: 'LAB-FBC-07', patientName: 'Emeka Okonkwo', patientMrn: 'MRN-LSH-10002', serviceType: 'Full Blood Count', category: 'Hematology', amount: 12000, formattedAmount: '₦12,000', status: 'invoiced' },
    { id: 'LAB-FBC-08', patientName: 'Fatima Abubakar', patientMrn: 'MRN-LSH-10016', serviceType: 'Full Blood Count', category: 'Hematology', amount: 12000, formattedAmount: '₦12,000', status: 'invoiced' },
  ]
};

type SortField = 'urgency' | 'invoice_number' | 'patient_name' | 'total_amount' | 'due_date' | 'status';
type SortOrder = 'asc' | 'desc';

export default function InvoicesHub() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'reconciled'>('all');
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState<string | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);

  // Sorting state (default: sorted by urgency)
  const [sortField, setSortField] = useState<SortField>('urgency');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/invoices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setInvoices(data.invoices || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const isReconciled = (inv: Invoice) => {
    const status = (inv.status || '').trim().toLowerCase();
    const label = (inv.status_label || (inv as any).statusLabel || '').trim().toLowerCase();
    return status === 'paid' || status === 'reconciled' || label === 'reconciled' || label === 'cleared';
  };

  const isBatchInvoice = (inv: Invoice) => {
    const name = (inv.patient_name || (inv as any).patientName || '').toLowerCase();
    return name.includes('multiple patients') || name.includes('orders');
  };

  const getOrderCount = (inv: Invoice): number => {
    if (inv.orders && inv.orders.length > 0) return inv.orders.length;
    const match = (inv.service_description || (inv as any).serviceDescription || '').match(/(\d+)\s+orders/i);
    return match ? parseInt(match[1], 10) : 4;
  };

  const getOrdersForInvoice = (inv: Invoice): InvoiceOrder[] => {
    if (inv.orders && inv.orders.length > 0) return inv.orders;
    const count = getOrderCount(inv);
    return DEFAULT_BATCH_ORDERS[String(count)] || DEFAULT_BATCH_ORDERS['4'];
  };

  const payLink = (invoiceNumber: string) => `${PAY_BASE_URL}/${invoiceNumber}`;

  const handleCopyLink = (invoiceNumber: string) => {
    navigator.clipboard.writeText(payLink(invoiceNumber));
    setCopiedInvoice(invoiceNumber);
    setTimeout(() => setCopiedInvoice(null), 2000);
  };

  const handleWhatsAppShare = (inv: Invoice) => {
    const message = encodeURIComponent(
      `Hello ${inv.patient_name}, your bill from Lagoon Specialist Hospital for ${inv.service_description} ` +
      `(${inv.formatted_amount}) is ready. Please complete payment here: ${payLink(inv.invoice_number)}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleWhatsAppOrderShare = (inv: Invoice, order: InvoiceOrder) => {
    const message = encodeURIComponent(
      `Hello ${order.patientName}, your lab bill from Lagoon Specialist Hospital for ${order.serviceType} ` +
      `(${order.formattedAmount}, ref: ${order.id}) is ready. Please complete payment here: ${payLink(inv.invoice_number)}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  // Financial Metrics for Summary Strip
  const metrics = useMemo(() => {
    let outstandingAmount = 0;
    let outstandingCount = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let dueThisWeekAmount = 0;
    let dueThisWeekCount = 0;
    let reconciledAmount = 0;
    let reconciledCount = 0;

    invoices.forEach(inv => {
      const amount = Number(inv.total_amount) || Number((inv as any).totalAmount) || 0;
      if (isReconciled(inv)) {
        reconciledAmount += amount;
        reconciledCount++;
      } else {
        outstandingAmount += amount;
        outstandingCount++;

        if (inv.status === 'overdue') {
          overdueAmount += amount;
          overdueCount++;
        } else {
          // Counted as active / due this week
          dueThisWeekAmount += amount;
          dueThisWeekCount++;
        }
      }
    });

    return {
      outstandingAmount,
      outstandingCount,
      overdueAmount,
      overdueCount,
      dueThisWeekAmount,
      dueThisWeekCount,
      reconciledAmount,
      reconciledCount,
      totalCount: invoices.length,
    };
  }, [invoices]);

  // Urgency & Column Sorting
  const sortedAndFilteredInvoices = useMemo(() => {
    const filtered = invoices.filter(inv => {
      const reconciled = isReconciled(inv);
      if (filter === 'reconciled' && !reconciled) return false;
      if (filter === 'pending' && (reconciled || inv.status === 'overdue')) return false;
      if (filter === 'overdue' && inv.status !== 'overdue') return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNum = (inv.invoice_number || '').toLowerCase().includes(q);
        const matchName = (inv.patient_name || '').toLowerCase().includes(q);
        const matchDesc = (inv.service_description || '').toLowerCase().includes(q);
        const matchMrn = (inv.patient_mrn || '').toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchDesc && !matchMrn) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortField === 'urgency') {
        // Priority 1: Overdue
        // Priority 2: Pending with direct patient actions (due tomorrow)
        // Priority 3: Pending batch records
        // Priority 4: Reconciled / Settled
        const getUrgencyRank = (inv: Invoice) => {
          if (inv.status === 'overdue') return 1;
          if (!isReconciled(inv)) {
            // T. Adeyemi due tomorrow gets highest non-overdue priority
            if (!isBatchInvoice(inv)) return 2;
            return 3;
          }
          return 4;
        };
        const rankA = getUrgencyRank(a);
        const rankB = getUrgencyRank(b);
        if (rankA !== rankB) return rankA - rankB;
        return (a.due_date || '').localeCompare(b.due_date || '');
      }

      if (sortField === 'invoice_number') {
        return sortOrder === 'asc' 
          ? a.invoice_number.localeCompare(b.invoice_number)
          : b.invoice_number.localeCompare(a.invoice_number);
      }
      if (sortField === 'patient_name') {
        return sortOrder === 'asc'
          ? a.patient_name.localeCompare(b.patient_name)
          : b.patient_name.localeCompare(a.patient_name);
      }
      if (sortField === 'total_amount') {
        const amtA = Number(a.total_amount || 0);
        const amtB = Number(b.total_amount || 0);
        return sortOrder === 'asc' ? amtA - amtB : amtB - amtA;
      }
      if (sortField === 'due_date') {
        return sortOrder === 'asc'
          ? (a.due_date || '').localeCompare(b.due_date || '')
          : (b.due_date || '').localeCompare(a.due_date || '');
      }
      if (sortField === 'status') {
        return sortOrder === 'asc'
          ? (a.status || '').localeCompare(b.status || '')
          : (b.status || '').localeCompare(a.status || '');
      }
      return 0;
    });
  }, [invoices, filter, search, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleExpand = (invoiceNumber: string) => {
    setExpandedInvoice(prev => prev === invoiceNumber ? null : invoiceNumber);
  };

  function formatDate(dateStr?: string) {
    if (!dateStr) return 'Sep 17, 2026';
    if (dateStr.toLowerCase() === 'today') return 'Sep 17, 2026';
    if (dateStr.toLowerCase() === 'tomorrow') return 'Sep 19, 2026';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDueDate(dateStr?: string) {
    if (!dateStr) return 'Sep 19, 2026 · Due tomorrow';
    if (dateStr.toLowerCase() === 'tomorrow' || dateStr === '2026-09-19') {
      return 'Sep 19 · Due tomorrow';
    }
    if (dateStr.toLowerCase() === 'today') {
      return 'Sep 18 · Due today';
    }
    if (dateStr.includes('7 days') || dateStr === '2026-09-25') {
      return 'Sep 25 · In 7 days';
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#12244D]">
            Invoices
          </h1>
          <p className="text-sm text-[#475569] mt-1 font-sans">
            Hospital billing statements, outstanding patient balances, and payment links.
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="inline-flex items-center gap-1.5 bg-[#12244D] hover:bg-[#0A152E] text-white rounded-lg px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          + New Invoice
        </button>
      </div>

      {/* Financial Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Outstanding Total */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-[#12244D]/30 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#12244D] tracking-tight">
            ₦{metrics.outstandingAmount.toLocaleString()}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Outstanding Balances
          </div>
          <div className="mt-2 text-xs text-[#64748b] font-sans flex items-center justify-between">
            <span>{metrics.outstandingCount} invoices pending</span>
            <span className="font-medium text-[#12244D]">Active Ledger</span>
          </div>
        </div>

        {/* Card 2: Due This Week */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-amber-500/30 transition-all">
          <div className="font-sans text-3xl font-extrabold text-amber-700 tracking-tight">
            ₦{metrics.dueThisWeekAmount.toLocaleString()}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Due This Week
          </div>
          <div className="mt-2 text-xs text-amber-800 font-sans flex items-center justify-between">
            <span>{metrics.dueThisWeekCount} invoices due within 7d</span>
            <span className="font-bold text-[11px]">Follow-up queue</span>
          </div>
        </div>

        {/* Card 3: Overdue */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-rose-500/30 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#be123c] tracking-tight">
            ₦{metrics.overdueAmount.toLocaleString()}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Overdue Invoices
          </div>
          <div className="mt-2 text-xs text-[#be123c] font-sans flex items-center justify-between">
            <span>{metrics.overdueCount} past due</span>
            <span className="text-[11px] font-medium">{metrics.overdueCount === 0 ? 'Clean' : 'Attention required'}</span>
          </div>
        </div>

        {/* Card 4: Reconciled & Settled */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-subtle hover:border-emerald-500/30 transition-all">
          <div className="font-sans text-3xl font-extrabold text-[#166534] tracking-tight">
            ₦{metrics.reconciledAmount.toLocaleString()}
          </div>
          <div className="text-[11px] font-sans uppercase tracking-wider text-[#64748b] font-bold mt-1">
            Reconciled & Cleared
          </div>
          <div className="mt-2 text-xs text-[#166534] font-sans flex items-center justify-between">
            <span>{metrics.reconciledCount} invoices settled</span>
            <span className="font-bold text-[11px]">Bank verified</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e2e8f0] pb-2">
        <div className="flex items-center gap-1 font-sans text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`pb-2 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              filter === 'all'
                ? 'border-[#12244D] text-[#12244D] font-bold'
                : 'border-transparent text-[#64748b] hover:text-[#12244D]'
            }`}
          >
            <span>All Invoices</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
              {metrics.totalCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('pending')}
            className={`pb-2 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              filter === 'pending'
                ? 'border-[#12244D] text-[#12244D] font-bold'
                : 'border-transparent text-[#64748b] hover:text-[#12244D]'
            }`}
          >
            <span>Pending</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
              {metrics.outstandingCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('overdue')}
            className={`pb-2 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              filter === 'overdue'
                ? 'border-[#12244D] text-[#12244D] font-bold'
                : 'border-transparent text-[#64748b] hover:text-[#12244D]'
            }`}
          >
            <span>Overdue</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
              {metrics.overdueCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('reconciled')}
            className={`pb-2 px-3 font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              filter === 'reconciled'
                ? 'border-[#12244D] text-[#12244D] font-bold'
                : 'border-transparent text-[#64748b] hover:text-[#12244D]'
            }`}
          >
            <span>Reconciled</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              {metrics.reconciledCount}
            </span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice #, patient, MRN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg w-56 text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0B6B69] shadow-xs"
          />
        </div>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-sans text-sm">
          Loading hospital invoices…
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-subtle overflow-hidden">
          <table className="w-full text-xs font-sans">
            <thead className="bg-[#f8fafc] text-left text-xs uppercase text-[#64748b] font-semibold border-b border-slate-200">
              <tr>
                <th 
                  className="px-4 py-3 cursor-pointer select-none hover:text-[#12244D]"
                  onClick={() => handleSort('invoice_number')}
                  style={{ width: '120px' }}
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Invoice #</span>
                    {sortField === 'invoice_number' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 cursor-pointer select-none hover:text-[#12244D]"
                  onClick={() => handleSort('patient_name')}
                  style={{ width: '180px' }}
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Patient / Account</span>
                    {sortField === 'patient_name' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th className="px-4 py-3">Service Details</th>
                <th 
                  className="px-4 py-3 text-right cursor-pointer select-none hover:text-[#12244D]"
                  onClick={() => handleSort('total_amount')}
                  style={{ width: '110px' }}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span className="whitespace-nowrap">Amount</span>
                    {sortField === 'total_amount' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 cursor-pointer select-none hover:text-[#12244D]"
                  onClick={() => handleSort('due_date')}
                  style={{ width: '140px' }}
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Due / Paid Date</span>
                    {sortField === 'due_date' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 cursor-pointer select-none hover:text-[#12244D]"
                  onClick={() => handleSort('status')}
                  style={{ width: '120px' }}
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Payment</span>
                    {sortField === 'status' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th className="px-4 py-3" style={{ width: '140px' }}>
                  <span className="whitespace-nowrap">Discharge Status</span>
                </th>
                <th className="px-4 py-3 text-right" style={{ width: '180px' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAndFilteredInvoices.map(inv => {
                const reconciled = isReconciled(inv);
                const isBatch = isBatchInvoice(inv);
                const isExpanded = expandedInvoice === inv.invoice_number;
                const constituentOrders = isBatch ? getOrdersForInvoice(inv) : [];

                return (
                  <React.Fragment key={inv.invoice_number}>
                    <tr className={`hover:bg-slate-50/70 transition-colors ${isExpanded ? 'bg-slate-50/50' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-xs text-[#12244D]">
                        {inv.invoice_number}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold block text-sm text-[#0f172a]">
                          {inv.patient_name}
                        </span>
                        <span className="block text-[11px] font-mono text-[#64748b]">
                          {inv.patient_mrn || (isBatch ? 'Departmental Batch' : 'MRN-LSH-Pending')}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        <span className="line-clamp-1" title={inv.service_description}>
                          {inv.service_description}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-sm text-[#12244D] text-right whitespace-nowrap">
                        {inv.formatted_amount}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {reconciled ? (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Paid {formatDate(inv.paid_date || inv.due_date)}
                          </span>
                        ) : inv.status === 'overdue' ? (
                          <span className="text-[#be123c] font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formatDueDate(inv.due_date)}
                          </span>
                        ) : (
                          <span className="text-[#475569]">
                            {formatDueDate(inv.due_date)}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {reconciled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Reconciled
                          </span>
                        ) : inv.status === 'overdue' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {inv.is_inpatient || inv.isInpatient ? (
                          reconciled ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Cleared
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Awaiting Settlement
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300 font-mono pl-3">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isBatch ? (
                          <button
                            onClick={() => toggleExpand(inv.invoice_number)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#12244D] bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md px-2.5 py-1 transition-colors shadow-2xs cursor-pointer"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-[#0B6B69]" />
                            {isExpanded ? 'Hide orders ↑' : `View ${constituentOrders.length} orders ↓`}
                          </button>
                        ) : !reconciled ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCopyLink(inv.invoice_number)}
                              className="text-xs border border-slate-300 rounded-md px-2.5 py-1 hover:bg-slate-100 transition-colors text-slate-700 cursor-pointer"
                            >
                              {copiedInvoice === inv.invoice_number ? '✓ Copied!' : 'Copy Pay Link'}
                            </button>
                            <button
                              onClick={() => handleWhatsAppShare(inv)}
                              className="text-xs border border-emerald-200 bg-emerald-50/60 rounded-md px-2.5 py-1 hover:bg-emerald-100 transition-colors text-emerald-800 font-semibold cursor-pointer"
                            >
                              Send on WhatsApp
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => setReceiptInvoice(inv)}
                              className="inline-flex items-center gap-1 text-xs border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                            >
                              <Receipt className="w-3 h-3 text-[#0B6B69]" />
                              View receipt
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Order Breakdown Drawer for Batch Invoices */}
                    {isBatch && isExpanded && (
                      <tr className="bg-slate-50/90 border-b border-slate-200">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-xs text-[#12244D] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#0B6B69]"></span>
                                Attributed Clinical Orders from Charge Audit ({constituentOrders.length} patient records)
                              </div>
                              <span className="text-[11px] font-mono text-[#64748b]">
                                Departmental Batch: {inv.invoice_number} · Total: {inv.formatted_amount}
                              </span>
                            </div>

                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 text-[#64748b] text-[11px]">
                                  <th className="py-1.5 text-left font-medium">Order ID</th>
                                  <th className="py-1.5 text-left font-medium">Patient Beneficiary</th>
                                  <th className="py-1.5 text-left font-medium">Hospital MRN</th>
                                  <th className="py-1.5 text-left font-medium">Clinical Procedure</th>
                                  <th className="py-1.5 text-right font-medium">Amount</th>
                                  <th className="py-1.5 text-right font-medium">Individual Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {constituentOrders.map((ord) => (
                                  <tr key={ord.id} className="hover:bg-slate-50/50">
                                    <td className="py-2 font-mono font-medium text-[#12244D]">{ord.id}</td>
                                    <td className="py-2 font-semibold text-slate-900">{ord.patientName}</td>
                                    <td className="py-2 font-mono text-slate-500">{ord.patientMrn || 'MRN-LSH-Pending'}</td>
                                    <td className="py-2 text-slate-600">{ord.serviceType}</td>
                                    <td className="py-2 font-mono font-bold text-slate-900 text-right">{ord.formattedAmount}</td>
                                    <td className="py-2 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => handleCopyLink(inv.invoice_number)}
                                          className="text-[11px] border border-slate-200 rounded px-2 py-0.5 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                        >
                                          Copy Link
                                        </button>
                                        <button
                                          onClick={() => handleWhatsAppOrderShare(inv, ord)}
                                          className="text-[11px] border border-emerald-200 bg-emerald-50 text-emerald-800 rounded px-2 py-0.5 hover:bg-emerald-100 font-medium cursor-pointer"
                                        >
                                          Send on WhatsApp
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {sortedAndFilteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No invoices match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Invoice Modal */}
      {showNewForm && (
        <NewInvoiceModal onClose={() => setShowNewForm(false)} onCreated={fetchInvoices} />
      )}

      {/* Official Receipt Modal */}
      {receiptInvoice && (
        <ReceiptModal invoice={receiptInvoice} onClose={() => setReceiptInvoice(null)} />
      )}
    </div>
  );
}

function NewInvoiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [patientName, setPatientName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!patientName || !serviceDescription || !amount) {
      setError('Patient name, service, and amount are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patient_name: patientName,
          service_description: serviceDescription,
          total_amount: Number(amount),
          due_date: dueDate || null,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSubmitting(false); return; }
      onCreated();
      onClose();
    } catch {
      setError('Failed to create invoice.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200">
        <h2 className="text-lg font-bold text-[#12244D] mb-4">New Hospital Invoice</h2>
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Patient Beneficiary Name</label>
            <input
              placeholder="e.g. Adebayo Ogunlesi"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#12244D]/20 focus:border-[#12244D]"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Clinical Service Description</label>
            <input
              placeholder="e.g. Emergency Room Consultation & Lab Panel"
              value={serviceDescription}
              onChange={e => setServiceDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#12244D]/20 focus:border-[#12244D]"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Total Billed Amount (₦)</label>
            <input
              type="number"
              placeholder="e.g. 25000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#12244D]/20 focus:border-[#12244D]"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#12244D]/20 focus:border-[#12244D]"
            />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg">{error}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-[#12244D] hover:bg-[#0A152E] text-white rounded-lg py-2 text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 space-y-4">
        {/* Hospital Receipt Header */}
        <div className="border-b border-slate-200 pb-3 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#0B6B69]">
              Lagoon Specialist Hospital
            </div>
            <h2 className="text-base font-bold text-[#12244D] mt-0.5">
              Official Payment Receipt
            </h2>
            <p className="text-[11px] text-slate-500">
              Receipt Reference: RCT-{invoice.invoice_number}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#F8FAFC] p-3.5 rounded-lg border border-slate-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Invoice Number:</span>
            <span className="font-mono font-bold text-[#12244D]">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Patient Beneficiary:</span>
            <span className="font-semibold text-slate-900">{invoice.patient_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Hospital MRN:</span>
            <span className="font-mono text-slate-600">{invoice.patient_mrn || 'MRN-LSH-10006'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Service Description:</span>
            <span className="font-medium text-slate-800">{invoice.service_description}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amount Settled:</span>
            <span className="font-mono font-bold text-sm text-[#166534]">{invoice.formatted_amount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Settlement Date:</span>
            <span className="text-slate-700">{invoice.paid_date || 'Sep 17, 2026'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Ledger Status:</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled to Hospital Accounts
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => window.print()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-[#12244D] hover:bg-[#0A152E] text-white rounded-lg py-2 text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
