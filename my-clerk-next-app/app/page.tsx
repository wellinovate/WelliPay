import { currentUser } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const user = await currentUser();

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 flex justify-center">
          <Image
            src="/wellipay-full-lockup.png"
            alt="WelliPay - One bill, every payer."
            width={200}
            height={180}
            className="object-contain drop-shadow-md"
            priority
          />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#08716D]/30 bg-[#E6F4F1] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#08716D]">
          🏥 Healthcare Payments & Gate Clearance
        </div>
        <h1 className="mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-[#12234E] sm:text-5xl sm:leading-tight">
          Smarter Hospital Billing, Dual-Payer Claims & Digital Gate Passes
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[#4B5563]">
          WelliPay bridges hospitals, HMO insurers, and patients with instant out-of-pocket settlement, FamilyPay diaspora pools, and verified WelliPass™ discharge clearance.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <SignUpButton mode="modal">
            <button className="w-full sm:w-auto rounded-xl bg-[#12234E] px-8 py-3.5 text-base font-semibold text-white shadow-md hover:bg-[#0E1B3E] transition-all cursor-pointer">
              Create Patient Account
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="w-full sm:w-auto rounded-xl border border-[#D1D5DB] bg-white px-8 py-3.5 text-base font-semibold text-[#374151] shadow-xs hover:bg-[#F9FAFB] transition-all cursor-pointer">
              Sign In to Patient Portal
            </button>
          </SignInButton>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3 text-left w-full max-w-4xl">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
            <div className="text-2xl mb-2">🎫</div>
            <h3 className="font-bold text-[#12234E]">WelliPass™ Clearance</h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              Instant QR gate pass ensuring no patient is detained after clinical and financial discharge.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
            <div className="text-2xl mb-2">🌍</div>
            <h3 className="font-bold text-[#12234E]">FamilyPay Diaspora</h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              Direct pooled links for family abroad to fund medical bills in USD, GBP, or EUR with zero FX spread.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
            <div className="text-2xl mb-2">⚖️</div>
            <h3 className="font-bold text-[#12234E]">Dual-Payer Reconcile</h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              Transparent split between HMO coverage and patient co-pay with automated dispute resolution.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const displayName =
    user.firstName ||
    user.username ||
    user.emailAddresses[0]?.emailAddress?.split("@")[0] ||
    "Patient";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Patient Welcome Header */}
      <section className="rounded-3xl border border-[#E5E7EB] bg-gradient-to-r from-[#12234E] to-[#1E3A8A] p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#A7F3D0] backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#10B981]"></span>
              Authenticated via Clerk · Patient ID: #WP-88402
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome back, {displayName}!
            </h1>
            <p className="mt-1 text-sm text-blue-200">
              Registered Email: <span className="font-semibold text-white">{user.emailAddresses[0]?.emailAddress}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur">
              <span className="block text-xs uppercase tracking-wider text-blue-200 font-semibold">Active Hospital</span>
              <span className="text-base font-bold text-white">St. Nicholas Hospital</span>
              <span className="block text-[11px] text-emerald-300">Ward 3B · Bed #14</span>
            </div>
          </div>
        </div>
      </section>

      {/* WelliPass Gate Clearance Banner */}
      <section className="mt-8 rounded-2xl border-2 border-[#10B981] bg-[#F0FDF4] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#10B981] text-2xl text-white shadow-sm">
              ✓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#059669] px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                  Gate Clearance Issued
                </span>
                <span className="text-xs text-[#065F46] font-medium">Valid until 23:59 Today</span>
              </div>
              <h2 className="mt-1 text-xl font-bold text-[#064E3B]">
                WelliPass™ Exit Authorization: CLEARED
              </h2>
              <p className="text-sm text-[#047857]">
                Clinical discharge signed by Dr. Alabi · Financial balance settled · Gate barrier pre-authorized.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#A7F3D0] bg-white p-3 text-center sm:text-right shadow-xs">
            <span className="block text-[11px] font-semibold uppercase text-[#6B7280]">Exit Token</span>
            <span className="font-mono text-lg font-black text-[#12234E]">EXIT-7749</span>
            <span className="block text-[10px] text-[#059669] font-medium">WP-PASS-LAG-4401</span>
          </div>
        </div>
      </section>

      {/* Episode of Care & Financial Breakdown */}
      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#08716D]">Episode of Care</span>
              <h3 className="text-lg font-bold text-[#12234E]">Acute Appendectomy & Inpatient Stay</h3>
            </div>
            <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#1D4ED8] border border-[#BFDBFE]">
              Settled & Reconciled
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-[#F9FAFB] p-4 border border-[#F3F4F6]">
              <span className="text-xs text-[#6B7280] font-semibold">Total Hospital Tariff</span>
              <div className="mt-1 text-2xl font-black text-[#111827]">₦75,000</div>
              <span className="text-[11px] text-[#9CA3AF]">St. Nicholas Tariff Schedule</span>
            </div>
            <div className="rounded-xl bg-[#ECFDF5] p-4 border border-[#D1FAE5]">
              <span className="text-xs text-[#065F46] font-semibold">HMO Covered (73%)</span>
              <div className="mt-1 text-2xl font-black text-[#047857]">₦55,000</div>
              <span className="text-[11px] text-[#059669]">Hygeia HMO · Primary Claim</span>
            </div>
            <div className="rounded-xl bg-[#EFF6FF] p-4 border border-[#DBEAFE]">
              <span className="text-xs text-[#1E40AF] font-semibold">Patient Co-Pay (Paid)</span>
              <div className="mt-1 text-2xl font-black text-[#1D4ED8]">₦20,000</div>
              <span className="text-[11px] text-[#2563EB]">Paid via WelliPay Wallet</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-xl bg-[#F8FAFC] p-4 border border-[#E2E8F0] text-xs text-[#64748B]">
            <span>Audit Trail: #EP-2026-9902 · Adjudicated by Sister Chinyere Eze (Counter #04)</span>
            <span className="font-bold text-[#059669]">Outstanding: ₦0.00</span>
          </div>
        </div>

        {/* FamilyPay Quick Widget */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D97706]">Diaspora Support</span>
              <span className="text-xl">🌍</span>
            </div>
            <h3 className="mt-1 text-lg font-bold text-[#12234E]">FamilyPay™ Link</h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              Allow family in the US, UK, or Canada to pay hospital bills in foreign currency directly.
            </p>

            <div className="mt-4 rounded-xl bg-[#FEF3C7] p-3 border border-[#FDE68A] text-xs text-[#92400E]">
              <strong>Live FX Rate:</strong> $1 USD = ₦1,500 NGN · Zero international wire fee
            </div>
          </div>

          <div className="mt-6">
            <button className="w-full rounded-xl bg-[#12234E] py-2.5 text-xs font-semibold text-white hover:bg-[#0E1B3E] transition-colors cursor-pointer">
              Copy Shared Payment Link
            </button>
          </div>
        </div>
      </section>

      {/* Hospital Services Grid */}
      <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs hover:border-[#12234E] transition-all">
          <div className="text-2xl mb-2">💊</div>
          <h4 className="font-bold text-[#12234E]">Rx Pharmacy Formulary</h4>
          <p className="mt-1 text-xs text-[#6B7280]">
            Switched to Rosuvastatin 20mg bioequivalent generic. Saved ₦21,000 (62% savings).
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs hover:border-[#12234E] transition-all">
          <div className="text-2xl mb-2">💰</div>
          <h4 className="font-bold text-[#12234E]">Smart Ajo Savings</h4>
          <p className="mt-1 text-xs text-[#6B7280]">
            Emergency Medical Reserve: ₦125,000 balance accruing 11.5% APY yield.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs hover:border-[#12234E] transition-all">
          <div className="text-2xl mb-2">📶</div>
          <h4 className="font-bold text-[#12234E]">Offline USSD Mode</h4>
          <p className="mt-1 text-xs text-[#6B7280]">
            Zero-data hospital checkout available via *384*WELLI# on MTN, Airtel, and Glo.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs hover:border-[#12234E] transition-all">
          <div className="text-2xl mb-2">🛡️</div>
          <h4 className="font-bold text-[#12234E]">Clerk Security</h4>
          <p className="mt-1 text-xs text-[#6B7280]">
            Session protected by Clerk multi-factor authentication and encrypted token storage.
          </p>
        </div>
      </section>
    </main>
  );
}
