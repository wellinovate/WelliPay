import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        callback: (response: any) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

interface InvoiceData {
  invoice_number: string;
  patient_name: string;
  service_description: string;
  total_amount: number;
  formatted_amount: string;
  paid_amount: number;
  status: string;
  status_label: string;
  due_date: string;
  payer_type: string | null;
  payer_name: string | null;
  copay_amount: number | null;
  claim_amount: number | null;
  dedicated_account_number: string | null;
  dedicated_account_bank: string | null;
  dedicated_account_name: string | null;
}

interface InvoiceOrder {
  service_type: string;
  category: string;
  amount: number;
  performed_at: string;
}

export default function PublicInvoicePay() {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [orders, setOrders] = useState<InvoiceOrder[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!invoiceNumber) return;
    fetch(`/api/public/invoice/${invoiceNumber}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvoice(data.invoice);
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        }
      })
      .catch(err => {
        setError(err.message || 'Failed to connect to server');
      });
  }, [invoiceNumber]);

  useEffect(() => {
    // Load Paystack inline JS once
    if (!document.getElementById('paystack-script')) {
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePay = async () => {
    if (!email) { setError('Please enter your email.'); return; }
    if (!invoice) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/public/invoice/${invoiceNumber}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.details || data.error);
        setLoading(false);
        return;
      }

      if (!window.PaystackPop) {
        // If inline script is not loaded yet or blocked, fallback to Paystack redirect
        if (data.authorization_url) {
          window.location.href = data.authorization_url;
          return;
        }
        setError('Payment gateway library is loading. Please try again in a few seconds.');
        setLoading(false);
        return;
      }

      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
        email,
        amount: Math.round(Number(invoice.total_amount) * 100),
        ref: data.reference,
        callback: () => {
          // Webhook settles the invoice server-side; redirect to success state
          window.location.href = `/pay/${invoiceNumber}?status=success`;
        },
        onClose: () => setLoading(false),
      });
      handler.openIframe();
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xs border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Unable to Load Invoice</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#12244D] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Loading invoice…</p>
        </div>
      </div>
    );
  }

  const alreadyPaid = invoice.status === 'paid';
  const showSuccess = searchParams.get('status') === 'success' || alreadyPaid;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xs border border-slate-200 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h1 className="text-base font-bold text-[#12244D]">Lagoon Specialist Hospital</h1>
            <p className="text-xs text-slate-500">Patient Billing & Discharge Clearance</p>
          </div>
          <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded">
            {invoice.invoice_number}
          </span>
        </div>

        <div className="py-2 mb-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Patient</span>
            <span className="font-medium text-slate-900">{invoice.patient_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Due Date</span>
            <span className="text-slate-700">{invoice.due_date}</span>
          </div>

          {/* Itemized services, when the invoice has line items on record.
              Falls back to the single description for older invoices that
              predate itemized clinical_service_orders linkage. */}
          {orders.length > 0 ? (
            <div className="border-t border-slate-100 pt-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Services billed
              </span>
              <div className="mt-1.5 space-y-1.5">
                {orders.map((o, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-slate-700">{o.service_type}</span>
                    <span className="font-medium text-slate-900">₦{Number(o.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Service Description</span>
              <span className="font-medium text-slate-900 text-right max-w-[220px]">{invoice.service_description}</span>
            </div>
          )}

          <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between items-baseline">
            <span className="text-sm font-semibold text-slate-900">Total Amount Due</span>
            <span className="text-xl font-bold text-[#0B6B69]">{invoice.formatted_amount}</span>
          </div>

          {/* Payer split — only shown when the invoice was billed with HMO
              context. copay_amount is what the patient owes; claim_amount is
              what the insurer covers. Informational only: this page still
              collects the invoice's total_amount, unchanged from before. */}
          {invoice.payer_type === 'hmo' && invoice.copay_amount != null && invoice.claim_amount != null && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Insurer</span>
                <span className="font-semibold text-[#0B6B69]">{invoice.payer_name || 'HMO'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Insurer covers</span>
                <span className="font-medium text-slate-700">₦{Number(invoice.claim_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-600 font-medium">Your copay</span>
                <span className="font-bold text-slate-900">₦{Number(invoice.copay_amount).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {showSuccess ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 text-center my-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 font-bold text-lg">
              ✓
            </div>
            <div className="text-emerald-900 font-semibold text-base mb-1">Payment Verified & Received</div>
            <p className="text-xs text-emerald-700 mb-3">
              This invoice has been settled and reconciled. Keep this confirmation for hospital discharge clearance.
            </p>
            <div className="text-[11px] text-emerald-600 font-mono bg-white/70 py-1.5 px-3 rounded border border-emerald-200 inline-block">
              Status: RECONCILED · PAID
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-2 border-t border-slate-100">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Email Address for Payment Receipt
            </label>
            <input
              type="email"
              placeholder="e.g. patient@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#12244D]/20 focus:border-[#12244D]"
            />
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg mb-3">
                {error}
              </p>
            )}
            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full bg-[#12244D] hover:bg-[#0c1833] text-white rounded-lg py-3 text-sm font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Initializing Paystack Checkout…
                </>
              ) : (
                `Pay ${invoice.formatted_amount} with Paystack`
              )}
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-3 flex items-center justify-center gap-1.5">
              <span>🔒 256-bit encrypted checkout via Paystack Nigeria</span>
            </p>

            {/* Bank transfer alternative — only shown once a dedicated virtual
                account has been provisioned for this specific invoice.
                Provisioning happens in the background at invoice creation and
                can be absent (Paystack unreachable, DVA product not yet
                approved), in which case this section simply doesn't render
                and card payment above remains the only option. */}
            {invoice.dedicated_account_number && (
              <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2 text-center">
                  Or pay by bank transfer
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank</span>
                    <span className="font-medium text-slate-900">{invoice.dedicated_account_bank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Number</span>
                    <span className="font-mono font-semibold text-[#0B6B69]">{invoice.dedicated_account_number}</span>
                  </div>
                  {invoice.dedicated_account_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Name</span>
                      <span className="font-medium text-slate-900 text-right max-w-[220px]">{invoice.dedicated_account_name}</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  This account is unique to this invoice — a transfer here settles it automatically, no reference needed.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
