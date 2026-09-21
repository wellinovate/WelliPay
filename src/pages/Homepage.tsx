import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import {
  ArrowRight,
  ShieldCheck,
  ReceiptText,
  Landmark,
  FileSearch,
  ClipboardCheck,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingDown,
  Search,
} from 'lucide-react';

const FEATURES = [
  {
    icon: ReceiptText,
    title: 'Automated bill reconciliation',
    description:
      'Matches bank transfers, HMO remittances, and Paystack payments to invoices automatically, with AI-assisted confidence scoring for anything that needs a human look.',
  },
  {
    icon: ClipboardCheck,
    title: 'Pre-authorisation tracking',
    description:
      'One tracker for every HMO pre-auth request — submission, decision turnaround, approved amounts, and expiry, instead of scattered emails and phone calls.',
  },
  {
    icon: FileSearch,
    title: 'Compliance and audit engine',
    description:
      'Flags duplicate charges, tariff mismatches, missing pre-authorisations, and other billing risks before they reach a payer, with a resolution trail for every flag.',
  },
  {
    icon: Landmark,
    title: 'HMO claims management',
    description:
      'Tracks claims from submission through remittance, matches remittance lines back to invoices, and surfaces rejection and turnaround patterns by payer.',
  },
  {
    icon: Wallet,
    title: 'Dedicated virtual accounts',
    description:
      'Every invoice can carry its own bank transfer account, so payments reconcile themselves the moment they land.',
  },
  {
    icon: ShieldCheck,
    title: 'Membership and benefit checks',
    description:
      'Verifies HMO membership status and remaining annual benefit before a bill goes out, catching self-pay-despite-coverage and copay errors early.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Connect your billing',
    description: 'Bring your invoices, HMO claims, and patient records in — or start entering them directly in WelliPay.',
  },
  {
    step: '02',
    title: 'Let the engine reconcile',
    description: 'Payments, remittances, and pre-authorisations are matched to invoices automatically, around the clock.',
  },
  {
    step: '03',
    title: 'Review what needs you',
    description: 'Only exceptions and flagged items reach your revenue team — everything else clears on its own.',
  },
];

const COST_POINTS = [
  {
    icon: Clock,
    title: 'Hours lost every week',
    description: 'Revenue staff manually cross-check bank statements, HMO remittance sheets, and invoice logs line by line.',
  },
  {
    icon: TrendingDown,
    title: 'Cash flow you can’t see',
    description: 'Without a live reconciled view, it’s unclear which invoices are actually paid until someone chases it down.',
  },
  {
    icon: AlertTriangle,
    title: 'Errors that surface too late',
    description: 'Duplicate charges and tariff mismatches are often only caught when a payer disputes them — after the damage is done.',
  },
  {
    icon: Search,
    title: 'Claims that go quiet',
    description: 'Pre-authorisation requests and HMO claims sit in inboxes with no single tracker for status or turnaround.',
  },
];

export const Homepage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-[#0f172a]">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[420px] bg-gradient-to-b from-[#ebf7f6]/80 via-[#f0f4fa]/40 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-14 text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0B6B69] bg-[#EBF7F6] px-3 py-1 rounded-full">
            Healthcare Financial Operating System
          </span>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-[#12244D] mt-5 leading-tight">
            One bill, every payer.
          </h1>
          <p className="text-sm sm:text-base text-[#475569] mt-4 max-w-xl mx-auto">
            WelliPay reconciles patient bills, HMO claims, and bank transfers automatically —
            so hospital revenue teams spend their time on exceptions, not spreadsheets.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => navigate('/signup')}
              className="text-xs font-bold bg-[#12244D] hover:bg-[#0B1733] text-white px-5 py-3 rounded-lg shadow-card transition-all cursor-pointer flex items-center gap-1.5"
            >
              Create your account
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-bold border border-[#cbd5e1] hover:border-[#12244D] text-[#12244D] px-5 py-3 rounded-lg transition-all cursor-pointer"
            >
              Sign in to your portal
            </button>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 border-t border-[#e2e8f0]">
        <div className="text-center mb-10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">The problem</span>
          <h2 className="font-heading text-2xl font-bold text-[#12244D] mt-2">
            Hospital billing runs through too many payers to reconcile by hand
          </h2>
          <p className="text-sm text-[#64748b] mt-3 max-w-2xl mx-auto">
            A single hospital bills self-pay patients, several HMOs, and receives payment by bank
            transfer, POS, and dedicated account — each with its own paperwork and its own pace.
            Matching all of it back to the right invoice is still, for most revenue teams, a
            manual job.
          </p>
        </div>

        {/* The curse — what that manual process actually costs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {COST_POINTS.map((c) => (
            <div key={c.title} className="flex gap-3.5 bg-white border border-[#e2e8f0] rounded-xl p-5">
              <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                <c.icon className="w-4.5 h-4.5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading text-sm font-bold text-[#12244D] mb-1">{c.title}</h3>
                <p className="text-xs text-[#64748b] leading-relaxed">{c.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Business impact */}
      <section className="bg-[#12244D]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7ea3c9]">The business impact</span>
          <h2 className="font-heading text-2xl font-bold text-white mt-2">
            Every hour spent matching payments is an hour not spent on patients or growth
          </h2>
          <p className="text-sm text-[#cbd5e1] mt-3 max-w-2xl mx-auto">
            Delayed reconciliation delays visibility into real cash position. Unresolved HMO
            claims tie up revenue that's already been earned. And billing errors caught late —
            by a payer, or an auditor — cost more to fix than they would have cost to prevent.
          </p>
        </div>
      </section>

      {/* Insight / solution — feature grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-[#e2e8f0]">
        <div className="text-center mb-10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B6B69]">The insight</span>
          <h2 className="font-heading text-2xl font-bold text-[#12244D] mt-2">
            Automate the matching, surface only the exceptions
          </h2>
          <p className="text-sm text-[#64748b] mt-3 max-w-xl mx-auto">
            WelliPay reconciles routine payments on its own and puts everything a revenue team
            needs to manage the rest in one place.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-subtle hover:shadow-card transition-shadow"
            >
              <div className="w-9 h-9 rounded-lg bg-[#EBF7F6] flex items-center justify-center mb-3">
                <f.icon className="w-4.5 h-4.5 text-[#0B6B69]" />
              </div>
              <h3 className="font-heading text-sm font-bold text-[#12244D] mb-1.5">{f.title}</h3>
              <p className="text-xs text-[#64748b] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-t border-[#e2e8f0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="font-heading text-2xl font-bold text-[#12244D] text-center mb-10">
            How WelliPay fits into your billing
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.step}>
                <span className="font-heading text-3xl font-bold text-[#cbd5e1]">{s.step}</span>
                <h3 className="font-heading text-sm font-bold text-[#12244D] mt-2 mb-1.5">{s.title}</h3>
                <p className="text-xs text-[#64748b] leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-t border-[#e2e8f0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {['NDPR compliant', 'HIPAA-aligned encryption', 'Paystack-integrated', 'Multi-HMO support'].map((t) => (
            <div key={t} className="flex items-center gap-1.5 text-xs font-semibold text-[#334155]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0B6B69]" />
              {t}
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-[#12244D]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <h2 className="font-heading text-2xl font-bold text-white">
            Ready to stop reconciling bills by hand?
          </h2>
          <p className="text-sm text-[#cbd5e1] mt-3">
            Set up your provider account and start matching payments automatically.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="mt-6 text-xs font-bold bg-white hover:bg-[#f1f5f9] text-[#12244D] px-5 py-3 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            Create your account
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Homepage;
