import { useState, useEffect } from 'react';
import { auth } from '../../firebase';

interface Invoice {
  invoice_number: string;
  patient_name: string;
  service_description: string;
  total_amount: number;
  formatted_amount: string;
  status: string;
  status_label: string;
  due_date: string;
  created_at: string;
}

const PAY_BASE_URL = 'https://wellipay.onrender.com/pay';

export default function InvoicesHub() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState<string | null>(null);

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

  useEffect(() => { fetchInvoices(); }, []);

  const filtered = invoices.filter(inv => {
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'paid' ? inv.status === 'paid' :
      inv.status !== 'paid';
    const matchesSearch =
      (inv.invoice_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (inv.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (inv.service_description || '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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

  const isReconciled = (inv: Invoice) => inv.status === 'paid';
  const isBatchInvoice = (inv: Invoice) => inv.patient_name === 'Multiple Patients';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">Hospital billing statements, outstanding balances, and payment links.</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="bg-[#12244D] hover:bg-[#0c1833] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
        >
          + New Invoice
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search invoice #, patient..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-[#12244D]/20 focus:border-[#12244D]"
        />
        <div className="flex gap-2">
          {(['all', 'pending', 'paid'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                filter === f ? 'bg-[#12244D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? 'All Invoices' : f === 'pending' ? 'Pending' : 'Reconciled'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading invoices…</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Patient / Account</th>
                <th className="px-4 py-3">Service Details</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Discharge Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(inv => (
                <tr key={inv.invoice_number} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-medium text-[#12244D]">{inv.invoice_number}</td>
                  <td className="px-4 py-3">
                    {isBatchInvoice(inv) ? (
                      <span className="text-slate-500 italic">{inv.patient_name}</span>
                    ) : (
                      <span className="font-medium text-slate-900">{inv.patient_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inv.service_description}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{inv.formatted_amount}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.due_date}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        isReconciled(inv)
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isReconciled(inv) ? '✓ Cleared for Discharge' : '⏳ Pending Settlement'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!isReconciled(inv) && !isBatchInvoice(inv) && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopyLink(inv.invoice_number)}
                          className="text-xs border border-slate-300 rounded-md px-2.5 py-1 hover:bg-slate-100 transition-colors text-slate-700 cursor-pointer"
                        >
                          {copiedInvoice === inv.invoice_number ? '✓ Copied!' : 'Copy Pay Link'}
                        </button>
                        <button
                          onClick={() => handleWhatsAppShare(inv)}
                          className="text-xs border border-emerald-200 bg-emerald-50/50 rounded-md px-2.5 py-1 hover:bg-emerald-100 transition-colors text-emerald-800 font-medium cursor-pointer"
                        >
                          WhatsApp
                        </button>
                      </div>
                    )}
                    {!isReconciled(inv) && isBatchInvoice(inv) && (
                      <span className="text-xs text-slate-400 italic">Batch record — no direct patient link</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No invoices match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showNewForm && (
        <NewInvoiceModal onClose={() => setShowNewForm(false)} onCreated={fetchInvoices} />
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">New Invoice</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Patient Name</label>
            <input
              placeholder="e.g. Adebayo Ogunlesi"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12244D]/20 focus:border-[#12244D]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Service Description</label>
            <input
              placeholder="e.g. Emergency Room Consultation & Lab Panel"
              value={serviceDescription}
              onChange={e => setServiceDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12244D]/20 focus:border-[#12244D]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Amount (₦)</label>
            <input
              type="number"
              placeholder="e.g. 25000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12244D]/20 focus:border-[#12244D]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12244D]/20 focus:border-[#12244D]"
            />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg">{error}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg py-2 text-sm font-medium transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-[#12244D] hover:bg-[#0c1833] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
