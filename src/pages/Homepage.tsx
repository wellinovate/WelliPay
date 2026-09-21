import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import {
  ArrowRight,
  CheckCircle2,
  ReceiptText,
  ClipboardCheck,
  FileSearch,
  Lock,
  ExternalLink,
} from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: ReceiptText,
    title: 'Payment matching',
    body: 'Bank transfers, POS receipts, and HMO remittances are scored against open invoices. High-confidence matches are shown to you to confirm. Low-confidence rows are flagged for review. You confirm every match; nothing is silently closed.',
  },
  {
    icon: ClipboardCheck,
    title: 'Pre-authorisation tracking',
    body: 'One queue for every HMO pre-auth request, from submission through decision. Turnaround time and approved amounts are recorded per payer so you can spot patterns without chasing emails.',
  },
  {
    icon: FileSearch,
    title: 'Billing compliance checks',
    body: 'Seven automated checks run on every invoice before it reaches a payer: duplicate charges, tariff mismatches, missing pre-authorisations, wrong copay, and three others. Each flag explains what was found and links to the evidence.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Bring your invoices in',
    body: 'Enter invoices directly or connect your existing billing records. Supported HMOs include Reliance Health, Leadway Health, HMO and AXA Mansard.',
  },
  {
    n: '2',
    title: 'Review suggested matches',
    body: 'WelliPay scores each incoming payment against open invoices by amount, date, and payer name. You see the match and confidence score, then confirm or reassign.',
  },
  {
    n: '3',
    title: 'Catch billing errors before they leave',
    body: 'Compliance checks run automatically. Flagged invoices queue for your review with a plain-language explanation and a link to the catalogue or plan rule that triggered it.',
  },
];

const TRUST_FACTS = [
  {
    label: 'Data hosted in Nigeria',
    detail: 'AWS af-south-1 (Cape Town), the closest AWS region to Nigeria. No data leaves the continent.',
    link: null,
  },
  {
    label: 'Payments via Paystack',
    detail: 'Patient card payments are processed by Paystack, a PCI-DSS certified Nigerian payment gateway.',
    link: 'https://paystack.com/ng/partners',
  },
  {
    label: 'NDPC registration',
    detail: 'Nigeria Data Protection Commission registration in progress. Patient data is handled under the Nigeria Data Protection Act 2023.',
    link: null,
  },
  {
    label: 'No third-party data sharing',
    detail: 'Patient records and financial data are never sold or shared with advertisers, analytics providers, or third-party processors beyond Paystack.',
    link: null,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const Homepage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-[#0f172a]">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient bloom */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-b from-[#ebf7f6]/70 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Copy */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#0B6B69] mb-4">
              For Nigerian hospitals and clinics
            </p>
            <h1 className="font-heading text-3xl sm:text-[2.6rem] font-bold text-[#12244D] leading-tight">
              Match hospital payments to invoices and HMO claims.
            </h1>
            <p className="text-sm sm:text-base text-[#475569] mt-4 leading-relaxed max-w-lg">
              WelliPay shows your revenue team which payment matches which invoice.
              You confirm. It records it. Built for naira billing across self-pay patients,
              Reliance Health, Leadway Health, and other Nigerian HMOs.
            </p>
            <p className="text-[11px] text-[#94a3b8] mt-3 italic">
              Tagline: One bill, every payer.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <button
                id="hero-create-account"
                onClick={() => navigate('/signup')}
                className="text-xs font-bold bg-[#12244D] hover:bg-[#0B1733] text-white px-5 py-3 rounded-lg shadow-card transition-all cursor-pointer flex items-center gap-1.5"
              >
                Create account
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                id="hero-sign-in"
                onClick={() => navigate('/login')}
                className="text-xs font-semibold text-[#475569] hover:text-[#12244D] transition-colors cursor-pointer"
              >
                Sign in
              </button>
            </div>
          </div>

          {/* Product screenshot */}
          <div className="relative">
            <div className="rounded-xl overflow-hidden shadow-2xl border border-[#e2e8f0]">
              <img
                src="/reconciliation-preview.jpg"
                alt="WelliPay reconciliation queue — payments matched to invoices with confidence scores and a Confirm button on each row"
                className="w-full h-auto block"
              />
            </div>
            {/* Caption */}
            <p className="text-[11px] text-[#94a3b8] text-center mt-2">
              Reconciliation queue — you see the match, you confirm it.
            </p>
          </div>
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────────────────── */}
      <section
        id="product"
        className="border-t border-[#e2e8f0]"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="max-w-2xl">
            <h2 className="font-heading text-2xl font-bold text-[#12244D]">
              Reconciling by hand wastes hours your team doesn't have
            </h2>
            <p className="text-sm text-[#475569] mt-3 leading-relaxed">
              A typical Nigerian hospital bills self-pay patients, two or three HMOs, and collects
              by bank transfer, POS terminal, and USSD. Each channel arrives separately.
              Matching all of it to the right invoice is a manual job for most revenue teams —
              one that takes hours and still produces errors.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                stat: '3–5 hrs',
                label: 'Typical weekly reconciliation time per billing clerk (self-reported, pilot facility)',
              },
              {
                stat: '₦340 k',
                label: 'Revenue recovered in one clinic audit after WelliPay flagged unbilled clinical orders',
              },
              {
                stat: '48',
                label: 'Outstanding HMO claims tracked in a single view, across Reliance Health and Leadway Health',
              },
            ].map((s) => (
              <div
                key={s.stat}
                className="bg-white border border-[#e2e8f0] rounded-xl p-6"
              >
                <p className="font-heading text-3xl font-bold text-[#0B6B69]">{s.stat}</p>
                <p className="text-xs text-[#64748b] mt-2 leading-relaxed">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="bg-white border-t border-[#e2e8f0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="font-heading text-2xl font-bold text-[#12244D] mb-2">
            Three things WelliPay does today
          </h2>
          <p className="text-sm text-[#64748b] mb-10 max-w-xl">
            Everything below is live in the product. Features without an app screen are not listed.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="border border-[#e2e8f0] rounded-xl p-6 flex flex-col gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-[#EBF7F6] flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4.5 h-4.5 text-[#0B6B69]" />
                </div>
                <h3 className="font-heading text-sm font-bold text-[#12244D]">{f.title}</h3>
                <p className="text-xs text-[#334155] leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="border-t border-[#e2e8f0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="font-heading text-2xl font-bold text-[#12244D] mb-10">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#12244D] text-white text-xs font-bold font-heading flex-shrink-0">
                  {s.n}
                </span>
                <h3 className="font-heading text-sm font-bold text-[#12244D]">{s.title}</h3>
                <p className="text-xs text-[#334155] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ─────────────────────────────────────────────────────── */}
      <section id="security" className="bg-white border-t border-[#e2e8f0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="font-heading text-2xl font-bold text-[#12244D] mb-2">
            Security and compliance
          </h2>
          <p className="text-sm text-[#64748b] mb-10 max-w-xl">
            Facts only. No claims without evidence.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TRUST_FACTS.map((t) => (
              <div
                key={t.label}
                className="flex gap-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-5"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0B6B69]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#12244D] mb-1">
                    {t.label}
                    {t.link && (
                      <a
                        href={t.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 ml-1.5 text-[#0B6B69] hover:underline text-xs font-semibold"
                      >
                        Verify
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </p>
                  <p className="text-xs text-[#475569] leading-relaxed">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#94a3b8] mt-6">
            HIPAA is US law and does not apply to Nigerian healthcare. We do not claim HIPAA alignment.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-[#12244D]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-heading text-2xl font-bold text-white">
              Stop reconciling by hand.
            </h2>
            <p className="text-sm text-[#94b4d4] mt-2 max-w-md">
              Create a provider account and start matching payments. No commitment required during the pilot period.
            </p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <button
              id="cta-create-account"
              onClick={() => navigate('/signup')}
              className="text-xs font-bold bg-white hover:bg-[#f1f5f9] text-[#12244D] px-5 py-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              Create account
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              id="cta-sign-in"
              onClick={() => navigate('/login')}
              className="text-xs font-semibold text-[#94b4d4] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Sign in
            </button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Homepage;
