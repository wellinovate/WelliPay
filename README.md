# WelliPay — Healthcare Payment & AI Reconciliation Operating System

WelliPay is Wellinovate's healthcare financial operating system designed for healthcare providers (hospitals, diagnostic clinics) and health maintenance organizations (HMOs/payers). It automates real-time payment reconciliation across multi-channel receipts (USSD, POS card, Bank transfer), mitigates clinical revenue leakage, and accelerates claims adjudication.

---

## Key Features

1. **AI Payment Reconciliation Queue**
   - Automated payment-to-invoice matching with AI confidence scoring (e.g. 94%, 88%, 97%).
   - Multi-channel filtering (Bank transfer, POS card, USSD).
   - One-click individual match confirmation and bulk reconciliation into hospital ledgers.
   - Live AI reasoning inspection modal detailing patient name fuzzy match, terminal ID mapping, and bill balance matching.

2. **Healthcare Provider Dashboard (Lagoon Specialist Hospital)**
   - Daily revenue KPI tracking across Patient direct copays, HMO claims receivables, and Corporate retainers.
   - Real-time revenue leakage audit: Identifies unbilled clinical procedures (e.g. unbilled lab tests) and generates batch invoices with one click.
   - Live transaction feed with channel badges and manual payment recording.

3. **HMO / Payer Claims Adjudication (Reliance HMO)**
   - Claims portfolio metrics: Total claimed, Approved, Paid, and Outstanding balances.
   - Benefit policy enforcement (Silver Plan copay rules, pre-authorization thresholds >₦100,000).
   - Dispute management center for claims rejected due to missing pre-auth or coding exceptions.

4. **Transactional Double-Entry Ledger (`server/schema.sql`)**
   - Production PostgreSQL schema with ACID double-entry accounting (`organizations`, `ledger_accounts`, `journal_entries`, `journal_lines`).
   - Stored procedure `atomic_confirm_reconciliation()` with row-level locks (`FOR UPDATE`) to prevent race conditions during bulk reconciliation.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Design Language**: Broadsheet financial typography & OKLCH tonal palette
- **Backend Architecture**: PostgreSQL transactional ledger schema (`server/schema.sql`)

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation

```bash
# Clone repository
git clone https://github.com/wellinovate/WelliPay.git
cd WelliPay

# Install dependencies
npm install

# Start local development server
npm run dev
```

The application runs on `http://localhost:5174/` (or `http://localhost:5173/`).

### Production Build

```bash
npm run build
```

---

## Included Reference Wireframes

The repository also includes the original high-fidelity desktop screen designs and wireframe exploration canvases:
- `Reconciliation Queue.dc.html` — AI reconciliation queue desktop wireframe
- `Provider Dashboard.dc.html` — Provider hospital revenue dashboard
- `HMO Dashboard.dc.html` — HMO claims management dashboard
- `WelliPay Wireframes.dc.html` — Foundational wireframe design canvas
- `styles.css` & `support.js` — Broadsheet design system tokens

---

## License

Proprietary © Wellinovate. All rights reserved.
