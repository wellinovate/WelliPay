import React from 'react';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: '1. Scope',
    body: (
      <p>
        This policy covers the WelliPay web application and API — used by hospital and clinic
        staff, billing teams, and HMO claims adjudicators (collectively, "providers") — and the
        public invoice payment pages WelliPay generates for patients. It does not cover other
        Wellinovate Limited products, which maintain their own privacy notices.
      </p>
    ),
  },
  {
    heading: '2. What we collect',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Account information: name, work email, organization name, and authentication credentials.</li>
        <li>
          Billing and clinical-service data entered by a provider: patient names, MRNs, invoices,
          line items, payer and plan information, HMO claims, and pre-authorisation requests.
        </li>
        <li>Payment and reconciliation data: bank transfer references, Paystack transaction records, and dedicated virtual account activity.</li>
        <li>Usage data: access logs and basic diagnostic information needed to operate and secure the service.</li>
      </ul>
    ),
  },
  {
    heading: '3. How we use it',
    body: (
      <p>
        Data is used to operate WelliPay: matching payments to invoices, tracking HMO claims and
        pre-authorisations, flagging billing compliance issues, and providing account access and
        support. We do not use provider or patient billing data to train third-party AI models,
        and we do not sell it.
      </p>
    ),
  },
  {
    heading: '4. Who we share it with',
    body: (
      <p>
        Data is shared only as needed to run the service: with the payer or HMO a provider is
        billing (as instructed by that provider), and with the infrastructure providers WelliPay
        runs on for authentication, hosting, and payment processing. We do not sell provider or
        patient data to third parties for marketing or any other purpose.
      </p>
    ),
  },
  {
    heading: '5. Security',
    body: (
      <p>
        Data in transit is encrypted, and access to provider accounts is protected by
        authenticated sessions. Our practices are designed to align with HIPAA and NDPR security
        expectations for healthcare and financial data; this describes our security approach and
        is not a claim of formal certification under either framework.
      </p>
    ),
  },
  {
    heading: '6. Data retention',
    body: (
      <p>
        Billing and reconciliation records are retained for as long as an account is active, and
        for a reasonable period after closure to meet standard financial record-keeping practice.
        A provider can request deletion of their organization's data using the contact details
        below, subject to any records we are legally required to keep.
      </p>
    ),
  },
  {
    heading: '7. Your rights',
    body: (
      <p>
        Depending on your location, you may have rights under the Nigeria Data Protection Act
        (NDPA) or other applicable law to access, correct, or request deletion of personal data
        held about you. To exercise these rights, contact us using the details below.
      </p>
    ),
  },
  {
    heading: '8. Changes to this policy',
    body: (
      <p>
        We may update this policy as WelliPay's features change. Material changes will be
        reflected here with an updated date.
      </p>
    ),
  },
  {
    heading: '9. Contact',
    body: (
      <p>
        Questions about this policy or a data request can be sent to{' '}
        <a href="mailto:privacy@wellipay.com" className="text-[#0B6B69] font-semibold hover:underline">
          privacy@wellipay.com
        </a>
        .
      </p>
    ),
  },
];

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-[#0f172a]">
      <SiteHeader />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-6">
        <h1 className="font-heading text-3xl font-bold text-[#12244D]">Privacy policy</h1>
        <p className="text-xs text-[#94a3b8] mt-2">Last updated: September 2026</p>
        <p className="text-sm text-[#475569] mt-4">
          This policy explains what data WelliPay collects, how it's used, and how it's protected.
          It applies to hospital and clinic staff using the WelliPay portal and to patients using
          a WelliPay-generated invoice payment page.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <div className="bg-white border border-[#e2e8f0] rounded-xl divide-y divide-[#e2e8f0]">
          {SECTIONS.map((s) => (
            <div key={s.heading} className="p-6">
              <h2 className="font-heading text-sm font-bold text-[#12244D] mb-2.5">{s.heading}</h2>
              <div className="text-xs text-[#475569] leading-relaxed">{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Privacy;
