import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { ArrowRight, ShieldCheck, Layers, Eye, Gauge, ScrollText } from 'lucide-react';

const CORE_VALUES = [
  {
    icon: Eye,
    title: 'Auditability over black boxes',
    description:
      'Every flag WelliPay raises links to the specific record it disagrees with. Nothing is automated in a way that can’t be traced back and checked by a person.',
  },
  {
    icon: Layers,
    title: 'Built for the real payer mix',
    description:
      'Hospitals bill self-pay patients and several HMOs at once, through different channels. WelliPay is designed around that mix, not a single simplified case.',
  },
  {
    icon: Gauge,
    title: 'Exception-based, not busywork',
    description:
      'Routine matching should be invisible. A revenue team’s time should go to the handful of invoices that actually need judgment.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance by default',
    description:
      'Duplicate charges, tariff mismatches, and missing pre-authorisations are flagged before they reach a payer — not discovered later in a dispute.',
  },
];

export const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-[#0f172a]">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[380px] bg-gradient-to-b from-[#ebf7f6]/80 via-[#f0f4fa]/40 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-14 text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0B6B69] bg-[#EBF7F6] px-3 py-1 rounded-full">
            About WelliPay
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#12244D] mt-5 leading-tight">
            Reconciliation software for hospitals that bill more than one payer
          </h1>
          <p className="text-sm sm:text-base text-[#475569] mt-4 max-w-xl mx-auto">
            WelliPay is built by Wellinovate Limited, a Nigerian health-technology company
            building digital health infrastructure for emerging markets.
          </p>
        </div>
      </section>

      {/* Mission / story */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 border-t border-[#e2e8f0]">
        <h2 className="font-heading text-xl font-bold text-[#12244D] mb-4">Why we built this</h2>
        <div className="space-y-4 text-sm text-[#475569] leading-relaxed">
          <p>
            Wellinovate builds clinical and financial infrastructure for hospitals and clinics —
            starting with WelliRecord, a patient-owned health records platform. Working closely
            with hospital teams on that problem surfaced a second one sitting right next to it:
            billing reconciliation across self-pay patients and multiple HMOs was still done by
            hand, invoice by invoice, payer by payer.
          </p>
          <p>
            WelliPay exists to close that gap — one system that reconciles patient bills, HMO
            claims, and bank transfers automatically, and gives a revenue team a single, auditable
            place to work from instead of a spreadsheet stitched together from several sources.
          </p>
          <p>
            It's built and operated as its own product, with its own accounts and its own team
            workflows, so a hospital or clinic can adopt it independently of any other Wellinovate
            system.
          </p>
        </div>
      </section>

      {/* Core values */}
      <section className="bg-white border-t border-[#e2e8f0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          <div className="text-center mb-10">
            <h2 className="font-heading text-2xl font-bold text-[#12244D]">Core values</h2>
            <p className="text-sm text-[#64748b] mt-2 max-w-xl mx-auto">
              What we hold ourselves to when we design how WelliPay handles money and clinical
              billing data.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {CORE_VALUES.map((v) => (
              <div key={v.title} className="flex gap-3.5 border border-[#e2e8f0] rounded-xl p-5">
                <div className="w-9 h-9 rounded-lg bg-[#EBF7F6] flex items-center justify-center flex-shrink-0">
                  <v.icon className="w-4.5 h-4.5 text-[#0B6B69]" />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#12244D] mb-1">{v.title}</h3>
                  <p className="text-xs text-[#64748b] leading-relaxed">{v.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Parent company note */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 border-t border-[#e2e8f0] text-center">
        <ScrollText className="w-6 h-6 text-[#0B6B69] mx-auto mb-3" />
        <h2 className="font-heading text-lg font-bold text-[#12244D] mb-2">Part of the Wellinovate family</h2>
        <p className="text-sm text-[#64748b] max-w-xl mx-auto">
          WelliPay is one of several health-technology products built by Wellinovate Limited,
          alongside WelliRecord, the company's flagship patient records platform. Each product is
          built and run independently, sharing an underlying commitment to accurate, auditable
          healthcare infrastructure.
        </p>
      </section>

      {/* CTA */}
      <section className="bg-[#12244D]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <h2 className="font-heading text-2xl font-bold text-white">See it on your own billing</h2>
          <p className="text-sm text-[#cbd5e1] mt-3">
            Create a provider account and start reconciling your invoices today.
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

export default About;
