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
  Calendar,
  AlertTriangle,
  Trash2,
  UserPlus,
  Link as LinkIcon,
  ShieldCheck,
  Building2,
  User
} from 'lucide-react';

const PAY_BASE_URL = 'https://wellipay.onrender.com/pay';

// Lagoon Specialist Hospital's own provider id in the directory — the only
// provider this front desk transacts against. Same id used by
// RecordPaymentModal, CostEstimationView, and ServiceCatalogueView.
const HOSPITAL_PROVIDER_ID = 'PRV-LAG-01';

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
  const [auditInvoice, setAuditInvoice] = useState<Invoice | null>(null);

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
          New invoice
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
                              onClick={() => setAuditInvoice(inv)}
                              className="text-xs border border-amber-200 bg-amber-50/60 rounded-md px-2.5 py-1 hover:bg-amber-100 transition-colors text-amber-800 font-semibold cursor-pointer"
                              title="Check this bill against the catalogue tariff, plan rules, and any pre-authorization before the patient pays"
                            >
                              Audit
                            </button>
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
        <NewInvoiceModal 
          onClose={() => setShowNewForm(false)} 
          onCreated={(createdInv, shouldCopy) => {
            fetchInvoices();
            if (shouldCopy && createdInv?.invoice_number) {
              handleCopyLink(createdInv.invoice_number);
            }
          }} 
        />
      )}

      {/* Official Receipt Modal */}
      {receiptInvoice && (
        <ReceiptModal invoice={receiptInvoice} onClose={() => setReceiptInvoice(null)} />
      )}

      {/* Patient Bill Audit Modal */}
      {auditInvoice && (
        <BillAuditModal invoice={auditInvoice} onClose={() => setAuditInvoice(null)} />
      )}
    </div>
  );
}

interface PatientRecord {
  id: string;
  mrn: string;
  fullName: string;
  phone: string;
  hmoName?: string;
  hmoPolicyNumber?: string;
}

const FALLBACK_PATIENT_RECORDS: PatientRecord[] = [
  { id: '1', mrn: 'MRN-LSH-10004', fullName: 'T. Adeyemi', phone: '+234 803 219 4410', hmoName: 'Reliance HMO', hmoPolicyNumber: 'REL-8912-A' },
  { id: '2', mrn: 'MRN-LSH-10008', fullName: 'Chinedu Eze', phone: '+234 802 443 1290', hmoName: 'AXA Mansard', hmoPolicyNumber: 'AXA-4491-01' },
  { id: '3', mrn: 'MRN-LSH-10006', fullName: 'John Umar', phone: '+234 818 902 3341', hmoName: 'Hygeia HMO', hmoPolicyNumber: 'HYG-7821-X' },
  { id: '4', mrn: 'MRN-LSH-10005', fullName: 'Mariam Bello', phone: '+234 805 771 8892', hmoName: 'Leadway Health', hmoPolicyNumber: 'LDW-5510-B' },
  { id: '5', mrn: 'MRN-LSH-10015', fullName: 'Grace Okafor', phone: '+234 809 332 5541' },
  { id: '6', mrn: 'MRN-LSH-10018', fullName: 'Ibrahim Danjuma', phone: '+234 812 665 4432' },
  { id: '7', mrn: 'MRN-LSH-10019', fullName: 'Zainab Abiola', phone: '+234 803 778 9901' },
  { id: '8', mrn: 'MRN-LSH-10020', fullName: 'Samuel Ogundipe', phone: '+234 816 554 2210' },
  { id: '9', mrn: 'MRN-LSH-10021', fullName: 'Folake Adeleke', phone: '+234 808 119 4430' },
];

const CUSTOM_PROCEDURE_LABEL = 'Custom Clinical Procedure...';

// Fallback shown only if the live catalogue fetch fails entirely (e.g. no
// database connection) — kept intentionally small since it exists purely so
// the form isn't blank, not as a source of truth for pricing. Previously
// this whole catalogue was hardcoded and never touched the live
// provider_catalogue/master_service_directory tables at all: its labels
// didn't even match the real directory ("Renal Function Tests (RFT)" has no
// equivalent entry there), and its FBC price (₦8,500) was ABC Diagnostics'
// price, not Lagoon's own ₦12,000 — the same bug already fixed in
// RecordPaymentModal. Every line item created here now carries the real
// masterServiceId, so it can be checked by the bill audit; a line item
// still has no reliable price/audit link only when this fallback is active
// or the user explicitly chose the custom-procedure option.
const FALLBACK_CATALOG: CatalogueServiceOption[] = [
  { name: 'General Outpatient Consultation', price: 10000 },
  { name: CUSTOM_PROCEDURE_LABEL, price: 0 },
];

interface CatalogueServiceOption {
  name: string;
  price: number;
  masterServiceId?: number;
}

interface FormLineItem {
  id: string;
  catalogName: string;
  customDescription: string;
  quantity: number;
  unitPrice: number;
  masterServiceId?: number;
}

// A real plan rule from payer_plan_rules for the currently selected HMO
// underwriter, as returned by GET /api/payer-plans?payer=<name>.
interface PayerPlanOption {
  planName: string;
  copayPercentage: number;
  preauthThreshold: number | null;
}

function getNigerianDate(offsetDays: number): { iso: string; formatted: string } {
  // Base date for WelliPay simulation: 2026-09-18
  const base = new Date('2026-09-18T10:00:00Z');
  base.setDate(base.getDate() + offsetDays);
  const day = base.getDate().toString().padStart(2, '0');
  const month = base.toLocaleDateString('en-US', { month: 'short' });
  const year = base.getFullYear();
  const iso = base.toISOString().split('T')[0];
  return {
    iso,
    formatted: `${day} ${month} ${year}`
  };
}

function NewInvoiceModal({ 
  onClose, 
  onCreated 
}: { 
  onClose: () => void; 
  onCreated: (createdInv?: Invoice, shouldCopy?: boolean) => void;
}) {
  // Patient registry state
  const [patients, setPatients] = useState<PatientRecord[]>(FALLBACK_PATIENT_RECORDS);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // New patient manual entry fields
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientMrn, setNewPatientMrn] = useState(() => `MRN-LSH-${Math.floor(10060 + Math.random() * 30)}`);

  // Payer & insurance state
  const [payerType, setPayerType] = useState<'self-pay' | 'hmo' | 'corporate'>('self-pay');
  const [hmoName, setHmoName] = useState('Reliance HMO');
  // hmoPlan holds the real plan_name as seeded in payer_plan_rules (e.g.
  // "Silver Plan", "Corporate Standard") — NOT a fixed 'silver'|'gold'|'standard'
  // code. Those fixed codes never matched payer_plan_rules.plan_name for any
  // payer (each payer has its own plan names), which silently broke every
  // copay/pre-auth-threshold lookup keyed on (payer_name, plan_name). See
  // planOptions below, fetched live per payer, same pattern as serviceCatalog.
  const [hmoPlan, setHmoPlan] = useState('');
  const [planOptions, setPlanOptions] = useState<PayerPlanOption[]>([]);
  const [policyNumber, setPolicyNumber] = useState('');
  const [corporateName, setCorporateName] = useState('Shell Nigeria Retainer');
  const [corporateStaffId, setCorporateStaffId] = useState('');
  const [preAuthCode, setPreAuthCode] = useState('');

  // Line items state (initialized with 1 standard item)
  const [lineItems, setLineItems] = useState<FormLineItem[]>([
    {
      id: 'item-1',
      catalogName: 'General Outpatient Consultation',
      customDescription: '',
      quantity: 1,
      unitPrice: 10000,
      masterServiceId: undefined,
    }
  ]);

  // Live service catalogue — fetched from the same published-tariff endpoint
  // RecordPaymentModal uses, rather than a hardcoded list. See FALLBACK_CATALOG
  // above for why this matters.
  const [serviceCatalog, setServiceCatalog] = useState<CatalogueServiceOption[]>(FALLBACK_CATALOG);

  // Due date scheduling state (defaults to 7 days per hospital standard)
  const [dateChip, setDateChip] = useState<'today' | '7d' | '14d' | '30d' | 'custom'>('7d');
  const [customDueDate, setCustomDueDate] = useState('2026-09-25');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch live patient registry and service catalogue on mount
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/patients', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.patients && data.patients.length > 0) {
            setPatients(data.patients);
          }
        }
      } catch (err) {
        console.error('Failed to load patient registry', err);
      }
    };
    const fetchCatalogue = async () => {
      try {
        const res = await fetch(`/api/directory/catalogue/${HOSPITAL_PROVIDER_ID}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.catalogue)) {
            const published: CatalogueServiceOption[] = data.catalogue
              .filter((c: any) => c.isPublished)
              .map((c: any) => ({
                name: c.serviceName,
                price: Number(c.price) || 0,
                masterServiceId: c.masterServiceId,
              }));
            published.push({ name: CUSTOM_PROCEDURE_LABEL, price: 0 });
            if (published.length > 1) setServiceCatalog(published);
          }
        }
      } catch (err) {
        console.error('Failed to load service catalogue — falling back to a minimal list', err);
      }
    };
    fetchPatients();
    fetchCatalogue();
  }, []);

  // Fetch the real, payer-scoped plan list whenever the selected HMO
  // underwriter changes, instead of offering a fixed 'silver'|'gold'|'standard'
  // choice that never matched a real payer_plan_rules row. Same "fetch the
  // live data" pattern as fetchCatalogue above.
  useEffect(() => {
    let cancelled = false;
    const fetchPlans = async () => {
      try {
        const res = await fetch(`/api/payer-plans?payer=${encodeURIComponent(hmoName)}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success && Array.isArray(data.plans)) {
            const options: PayerPlanOption[] = data.plans.map((p: any) => ({
              planName: p.planName,
              copayPercentage: Number(p.copayPercentage) || 0,
              preauthThreshold: p.preauthThreshold != null ? Number(p.preauthThreshold) : null,
            }));
            setPlanOptions(options);
            // Default to the first real plan for this payer; clear the
            // selection if this payer has no plan rules on file (e.g. "Other
            // Payer") rather than leaving a stale plan name from a different payer.
            setHmoPlan(options[0]?.planName || '');
          }
        }
      } catch (err) {
        console.error('Failed to load payer plan rules — plan-based checks will be unavailable', err);
        if (!cancelled) { setPlanOptions([]); setHmoPlan(''); }
      }
    };
    fetchPlans();
    return () => { cancelled = true; };
  }, [hmoName]);

  // Filtered patient records
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 5);
    const q = patientSearch.toLowerCase().trim();
    return patients.filter(p => 
      p.fullName.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.hmoPolicyNumber && p.hmoPolicyNumber.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [patients, patientSearch]);

  const handleSelectPatient = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.fullName);
    setIsSearchOpen(false);

    // Auto-detect payer coverage from patient folder
    if (patient.hmoName) {
      setPayerType('hmo');
      setHmoName(patient.hmoName);
      setPolicyNumber(patient.hmoPolicyNumber || 'POL-REL-8821');
    } else {
      setPayerType('self-pay');
    }
  };

  const handleAddLineItem = () => {
    // Default to the first real catalogue entry (not the custom-procedure
    // placeholder) when one is loaded, so a newly added row starts linked to
    // a real tariff rather than defaulting to a hardcoded guess.
    const defaultOption = serviceCatalog.find(c => c.name !== CUSTOM_PROCEDURE_LABEL) || serviceCatalog[0];
    setLineItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        catalogName: defaultOption?.name || CUSTOM_PROCEDURE_LABEL,
        customDescription: '',
        quantity: 1,
        unitPrice: defaultOption?.price || 0,
        masterServiceId: defaultOption?.masterServiceId,
      }
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateLineItem = (id: string, updates: Partial<FormLineItem>) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };
      // If catalog selection changed, update unit price and the catalogue
      // link (masterServiceId) from the live tariff — clearing it for the
      // custom-procedure option, since that has no catalogue entry to audit
      // against.
      if (updates.catalogName && updates.catalogName !== item.catalogName) {
        const found = serviceCatalog.find(c => c.name === updates.catalogName);
        updated.unitPrice = found?.price ?? updated.unitPrice;
        updated.masterServiceId = found?.masterServiceId;
      }
      return updated;
    }));
  };

  // Financial calculations
  const totalAmount = useMemo(() => {
    return lineItems.reduce((sum, it) => sum + (Math.max(1, it.quantity) * Math.max(0, it.unitPrice)), 0);
  }, [lineItems]);

  const selectedPlanRule = useMemo(
    () => planOptions.find(p => p.planName === hmoPlan) || null,
    [planOptions, hmoPlan]
  );

  const copayRate = useMemo(() => {
    if (payerType === 'self-pay') return 1.0;
    if (payerType === 'corporate') return 0.0;
    if (payerType === 'hmo') {
      // Fall back to 10% only when this payer has no plan rule on file
      // (e.g. "Other Payer") — otherwise use the real seeded copay rate.
      return selectedPlanRule ? selectedPlanRule.copayPercentage / 100 : 0.10;
    }
    return 0.10;
  }, [payerType, selectedPlanRule]);

  const patientCopay = useMemo(() => {
    if (payerType === 'self-pay') return totalAmount;
    if (payerType === 'corporate') return 0;
    return Math.round(totalAmount * copayRate);
  }, [totalAmount, copayRate, payerType]);

  const claimAmount = useMemo(() => {
    if (payerType === 'self-pay') return 0;
    return totalAmount - patientCopay;
  }, [totalAmount, patientCopay, payerType]);

  // Pre-authorization warning: use the plan's real preauth_threshold when one
  // is on file, falling back to ₦100,000 when this payer/plan has no rule.
  const requiresPreAuth = payerType === 'hmo' &&
    totalAmount > (selectedPlanRule?.preauthThreshold ?? 100000);

  // Due date resolution
  const resolvedDueDate = useMemo(() => {
    if (dateChip === 'today') return getNigerianDate(0);
    if (dateChip === '7d') return getNigerianDate(7);
    if (dateChip === '14d') return getNigerianDate(14);
    if (dateChip === '30d') return getNigerianDate(30);
    // Custom date
    const d = new Date(customDueDate);
    if (isNaN(d.getTime())) return getNigerianDate(7);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return {
      iso: customDueDate,
      formatted: `${day} ${month} ${year}`
    };
  }, [dateChip, customDueDate]);

  // Form validity check
  const isPatientValid = isAddingNew
    ? newPatientName.trim().length > 0 && newPatientPhone.trim().length > 0
    : !!selectedPatient;

  const isItemsValid = lineItems.length > 0 && totalAmount > 0 && lineItems.every(it =>
    it.catalogName !== CUSTOM_PROCEDURE_LABEL || it.customDescription.trim().length > 0
  );

  const isFormValid = isPatientValid && isItemsValid;

  const handleSubmit = async (shouldCopyLink: boolean) => {
    if (!isFormValid) {
      setError('Please select a patient beneficiary and add at least one clinical service item.');
      return;
    }

    setSubmitting(true);
    setError('');

    const patientName = isAddingNew ? newPatientName.trim() : selectedPatient!.fullName;
    const patientMrn = isAddingNew ? newPatientMrn.trim() : selectedPatient!.mrn;
    const patientId = isAddingNew ? undefined : selectedPatient!.id;

    const serviceDescription = lineItems.map(it =>
      it.catalogName === CUSTOM_PROCEDURE_LABEL ? it.customDescription.trim() : it.catalogName
    ).join(', ');

    const formattedLineItems = lineItems.map((it, idx) => ({
      id: `ITEM-${idx + 1}`,
      description: it.catalogName === CUSTOM_PROCEDURE_LABEL ? it.customDescription.trim() : it.catalogName,
      quantity: Math.max(1, it.quantity),
      unitPrice: it.unitPrice,
      totalAmount: Math.max(1, it.quantity) * it.unitPrice,
      // Carries the catalogue link through to clinical_service_orders, so
      // the bill audit can check this line item's price against the
      // published tariff instead of treating it as unlinked/unauditable.
      masterServiceId: it.masterServiceId,
      providerId: it.masterServiceId != null ? HOSPITAL_PROVIDER_ID : undefined,
    }));

    const payload = {
      patient_id: patientId,
      patient_name: patientName,
      patient_mrn: patientMrn,
      service_description: serviceDescription,
      total_amount: totalAmount,
      due_date: resolvedDueDate.iso,
      payer_type: payerType,
      payer_name: payerType === 'hmo' ? hmoName : payerType === 'corporate' ? corporateName : 'Patient Self-Pay',
      policy_number: payerType === 'hmo' ? policyNumber : payerType === 'corporate' ? corporateStaffId : undefined,
      plan_name: payerType === 'hmo' ? hmoPlan : undefined,
      copay_amount: patientCopay,
      claim_amount: claimAmount,
      pre_auth_code: requiresPreAuth ? preAuthCode : undefined,
      line_items: formattedLineItems
    };

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setSubmitting(false);
        return;
      }

      if (shouldCopyLink && data.invoice?.invoice_number) {
        navigator.clipboard.writeText(`${PAY_BASE_URL}/${data.invoice.invoice_number}`);
      }

      onCreated(data.invoice, shouldCopyLink);
      onClose();
    } catch {
      setError('Failed to create invoice. Please check network connection.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-[#12244D]">
              Create invoice
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Compose a patient billing statement, itemize services, and generate a payment link.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Section 1: Patient Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 flex items-center gap-1">
                Patient beneficiary <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(!isAddingNew);
                  setSelectedPatient(null);
                  setPatientSearch('');
                }}
                className="text-[11px] font-semibold text-[#12244D] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isAddingNew ? (
                  <>← Select existing patient</>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" /> + Add new patient
                  </>
                )}
              </button>
            </div>

            {isAddingNew ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPatientName}
                    onChange={e => setNewPatientName(e.target.value)}
                    placeholder="e.g. Adebayo Ogunlesi"
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#12244D]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Phone number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPatientPhone}
                    onChange={e => setNewPatientPhone(e.target.value)}
                    placeholder="e.g. +234 803 123 4567"
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#12244D]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Hospital MRN
                  </label>
                  <input
                    type="text"
                    value={newPatientMrn}
                    onChange={e => setNewPatientMrn(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#12244D]"
                  />
                </div>
              </div>
            ) : selectedPatient ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#12244D]/10 text-[#12244D] flex items-center justify-center font-bold text-xs">
                    {selectedPatient.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{selectedPatient.fullName}</span>
                      <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                        {selectedPatient.mrn}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{selectedPatient.phone}</span>
                      <span>•</span>
                      <span>{selectedPatient.hmoName ? `Covered by ${selectedPatient.hmoName}` : 'Self-Pay'}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientSearch('');
                    setIsSearchOpen(true);
                  }}
                  className="text-xs text-[#12244D] font-semibold hover:underline px-2 py-1 cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search patient by name, MRN, phone, or HMO policy #..."
                    value={patientSearch}
                    onChange={e => {
                      setPatientSearch(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#12244D]/20 focus:border-[#12244D]"
                  />
                </div>

                {isSearchOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPatient(p)}
                          className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <span>{p.fullName}</span>
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 rounded">
                                {p.mrn}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {p.phone} {p.hmoName && `· ${p.hmoName}`}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {p.hmoName ? 'HMO' : 'Self-Pay'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-slate-500 text-xs">
                        No matching patients found.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Payer & Copay Architecture */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800">
                Payer coverage & financial split
              </label>
              <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setPayerType('self-pay')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                    payerType === 'self-pay' ? 'bg-[#12244D] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Self-Pay
                </button>
                <button
                  type="button"
                  onClick={() => setPayerType('hmo')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                    payerType === 'hmo' ? 'bg-[#12244D] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  HMO Insurance
                </button>
                <button
                  type="button"
                  onClick={() => setPayerType('corporate')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                    payerType === 'corporate' ? 'bg-[#12244D] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Corporate Retainer
                </button>
              </div>
            </div>

            {payerType === 'hmo' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    HMO Underwriter
                  </label>
                  <select
                    value={hmoName}
                    onChange={e => setHmoName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#12244D]"
                  >
                    <option value="Reliance HMO">Reliance HMO</option>
                    <option value="AXA Mansard">AXA Mansard</option>
                    <option value="Hygeia HMO">Hygeia HMO</option>
                    <option value="Leadway Health">Leadway Health</option>
                    <option value="Other Payer">Other HMO Payer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Plan Tier & Copay Rule
                  </label>
                  <select
                    value={hmoPlan}
                    onChange={e => setHmoPlan(e.target.value)}
                    disabled={planOptions.length === 0}
                    className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#12244D] disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {planOptions.length === 0 ? (
                      <option value="">No plan rules on file for this payer</option>
                    ) : (
                      planOptions.map(p => (
                        <option key={p.planName} value={p.planName}>
                          {p.planName} ({p.copayPercentage}% Copay)
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Policy / Enrollee ID
                  </label>
                  <input
                    type="text"
                    value={policyNumber}
                    onChange={e => setPolicyNumber(e.target.value)}
                    placeholder="e.g. REL-8912-A"
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#12244D]"
                  />
                </div>
              </div>
            )}

            {payerType === 'corporate' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Corporate Retainer Client
                  </label>
                  <select
                    value={corporateName}
                    onChange={e => setCorporateName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#12244D]"
                  >
                    <option value="Shell Nigeria Retainer">Shell Nigeria Retainer</option>
                    <option value="MTN Nigeria Corporate">MTN Nigeria Corporate</option>
                    <option value="Chevron Nigeria Healthcare">Chevron Nigeria Healthcare</option>
                    <option value="NNPC E&P Retainer">NNPC E&P Retainer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Staff ID / Auth Reference
                  </label>
                  <input
                    type="text"
                    value={corporateStaffId}
                    onChange={e => setCorporateStaffId(e.target.value)}
                    placeholder="e.g. STF-SHL-4491"
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#12244D]"
                  />
                </div>
              </div>
            )}

            {/* Real-time Financial Split Preview */}
            <div className="bg-white border border-slate-200 rounded-md p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <ShieldCheck className="w-4 h-4 text-[#12244D]" />
                <span>Financial liability breakdown:</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-600">
                  Patient copay: <strong className="font-mono text-slate-900">₦{patientCopay.toLocaleString()}</strong> ({Math.round(copayRate * 100)}%)
                </span>
                {payerType !== 'self-pay' && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">
                      Payer claim: <strong className="font-mono text-emerald-800">₦{claimAmount.toLocaleString()}</strong> ({100 - Math.round(copayRate * 100)}%)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Pre-authorization Safety Warning for HMO above ₦100,000 */}
            {requiresPreAuth && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs space-y-2 text-amber-900">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pre-authorization required for HMO claims exceeding ₦100,000</span>
                </div>
                <p className="text-amber-700 text-[11px] leading-relaxed">
                  Silver Plan guidelines mandate a verified pre-authorization approval code before billing procedures over ₦100,000 to avoid payer claim rejection.
                </p>
                <div className="pt-0.5">
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                    Pre-authorization code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={preAuthCode}
                    onChange={e => setPreAuthCode(e.target.value)}
                    placeholder="e.g. AUTH-REL-8821"
                    className="w-full bg-white border border-amber-300 rounded-md px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Clinical Catalog Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 flex items-center gap-1">
                Clinical service line items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-[11px] font-semibold text-[#12244D] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add line item
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    <th className="px-3 py-2">Clinical Service / Procedure</th>
                    <th className="px-2 py-2 w-16 text-center">Qty</th>
                    <th className="px-3 py-2 w-28 text-right">Unit Price (₦)</th>
                    <th className="px-3 py-2 w-28 text-right">Total (₦)</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2">
                        <select
                          value={item.catalogName}
                          onChange={e => handleUpdateLineItem(item.id, { catalogName: e.target.value })}
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#12244D]"
                        >
                          {serviceCatalog.map(cat => (
                            <option key={cat.name} value={cat.name}>
                              {cat.name} {cat.price > 0 && `(₦${cat.price.toLocaleString()})`}
                            </option>
                          ))}
                        </select>
                        {item.catalogName === CUSTOM_PROCEDURE_LABEL && (
                          <input
                            type="text"
                            placeholder="Specify custom procedure name..."
                            value={item.customDescription}
                            onChange={e => handleUpdateLineItem(item.id, { customDescription: e.target.value })}
                            className="mt-1.5 w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#12244D]"
                          />
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => handleUpdateLineItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#12244D]"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={e => handleUpdateLineItem(item.id, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-[#12244D]"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                        ₦{(item.quantity * item.unitPrice).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Compact Row: Due Date Chips & Billed Total */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Due Date Scheduling */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800">
                  Payment due date
                </label>
                <span className="font-mono text-[11px] font-bold text-[#12244D]">
                  {resolvedDueDate.formatted}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDateChip('today')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded border cursor-pointer transition-colors ${
                    dateChip === 'today' ? 'bg-[#12244D] text-white border-[#12244D]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDateChip('7d')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded border cursor-pointer transition-colors ${
                    dateChip === '7d' ? 'bg-[#12244D] text-white border-[#12244D]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  7 days
                </button>
                <button
                  type="button"
                  onClick={() => setDateChip('14d')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded border cursor-pointer transition-colors ${
                    dateChip === '14d' ? 'bg-[#12244D] text-white border-[#12244D]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  14 days
                </button>
                <button
                  type="button"
                  onClick={() => setDateChip('30d')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded border cursor-pointer transition-colors ${
                    dateChip === '30d' ? 'bg-[#12244D] text-white border-[#12244D]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  30 days
                </button>
              </div>
            </div>

            {/* Total Computed Summary */}
            <div className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col justify-between">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Billed Amount
              </div>
              <div className="font-heading text-2xl font-extrabold text-[#12244D] tracking-tight">
                ₦{totalAmount.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>{lineItems.length} {lineItems.length === 1 ? 'item' : 'items'} itemized</span>
                <span className="font-medium text-slate-700">Nigerian clinical tariff</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 text-xs font-semibold px-2 py-1.5 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={!isFormValid || submitting}
              className="border border-slate-300 hover:bg-white text-slate-700 rounded-lg px-3.5 py-2 text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={!isFormValid || submitting}
              className="bg-[#12244D] hover:bg-[#0A152E] text-white rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-40 transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              {submitting ? 'Creating…' : 'Create and copy pay link'}
            </button>
          </div>
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

interface AuditFlag {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  lineItemId?: string;
  lineItemIds?: string[];
  billedAmount?: number;
  catalogueAmount?: number;
  billedCopay?: number;
  expectedCopay?: number;
  approvedAmount?: number;
}

const SEVERITY_STYLE: Record<AuditFlag['severity'], string> = {
  info: 'bg-slate-50 border-slate-200 text-slate-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  critical: 'bg-rose-50 border-rose-200 text-rose-800',
};

const SEVERITY_LABEL: Record<AuditFlag['severity'], string> = {
  info: 'Info',
  warning: 'Review',
  critical: 'Fix before payment',
};

function BillAuditModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flags, setFlags] = useState<AuditFlag[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/invoices/${invoice.invoice_number}/audit`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to audit this invoice.');
        if (!cancelled) setFlags(Array.isArray(data.flags) ? data.flags : []);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to audit this invoice.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [invoice.invoice_number]);

  const criticalCount = flags.filter(f => f.severity === 'critical').length;
  const warningCount = flags.filter(f => f.severity === 'warning').length;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl border border-slate-200 space-y-4">
        <div className="border-b border-slate-200 pb-3 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#0B6B69]">
              Patient Bill Audit
            </div>
            <h2 className="text-base font-bold text-[#12244D] mt-0.5">{invoice.invoice_number}</h2>
            <p className="text-[11px] text-slate-500">
              {invoice.patient_name} · {invoice.formatted_amount}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 text-center py-6">Checking this bill against the catalogue tariff, plan rules, and pre-authorization...</p>
        ) : error ? (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">{error}</p>
        ) : flags.length === 0 ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <p className="text-xs text-emerald-800 font-medium">
              No issues found. This bill matches the catalogue tariff, the plan rule, and any linked pre-authorization.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {(criticalCount > 0 || warningCount > 0) && (
              <p className="text-xs text-slate-600">
                {criticalCount > 0 && <span className="font-bold text-rose-700">{criticalCount} to fix before payment</span>}
                {criticalCount > 0 && warningCount > 0 && ' · '}
                {warningCount > 0 && <span className="font-bold text-amber-700">{warningCount} to review</span>}
              </p>
            )}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {flags.map((flag, idx) => (
                <div key={idx} className={`border rounded-lg p-3 text-xs ${SEVERITY_STYLE[flag.severity]}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold uppercase tracking-wide text-[10px]">{SEVERITY_LABEL[flag.severity]}</span>
                  </div>
                  <p>{flag.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-[#12244D] hover:bg-[#0A152E] text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
