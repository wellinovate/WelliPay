import React from 'react';
import { NavTab } from '../../types';
import { FileText, Users, Settings as SettingsIcon, Check, ShieldCheck, Database } from 'lucide-react';
import { StatusChip } from '../../components/ui/StatusChip';

interface PlaceholderViewProps {
  tab: NavTab;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ tab }) => {
  if (tab === 'invoices') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#201e1d]">
            Invoices
          </h1>
          <p className="text-sm text-[#605d5d] mt-1 font-serif">
            Hospital billing statements, outstanding balances, and matched payment receipts.
          </p>
        </div>

        <div className="bg-white border border-[#201e1d]/20 rounded shadow-sm overflow-hidden">
          <table className="broadsheet-table">
            <thead>
              <tr className="bg-[#fcfbf9]">
                <th>Invoice #</th>
                <th>Patient / Account</th>
                <th>Service Details</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-mono text-xs font-semibold">INV-92831</td>
                <td>J. Umar</td>
                <td>Cardiology Consultation & ECG</td>
                <td className="font-heading font-semibold">₦25,000</td>
                <td><StatusChip status="paid" label="Reconciled" /></td>
              </tr>
              <tr>
                <td className="font-mono text-xs font-semibold">INV-93010</td>
                <td>M. Bello</td>
                <td>Pharmacy Prescription Checkout</td>
                <td className="font-heading font-semibold">₦8,500</td>
                <td><StatusChip status="paid" label="Reconciled" /></td>
              </tr>
              <tr>
                <td className="font-mono text-xs font-semibold">INV-93044</td>
                <td>ABC Diagnostics</td>
                <td>Referred Pathology Panel Batch</td>
                <td className="font-heading font-semibold">₦12,000</td>
                <td><StatusChip status="paid" label="Reconciled" /></td>
              </tr>
              <tr>
                <td className="font-mono text-xs font-semibold">INV-93105</td>
                <td>T. Adeyemi</td>
                <td>Pediatric Inpatient Observation</td>
                <td className="font-heading font-semibold">₦11,500</td>
                <td><StatusChip status="pending" label="Pending Match" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tab === 'patients') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#201e1d]">
            Patients
          </h1>
          <p className="text-sm text-[#605d5d] mt-1 font-serif">
            Patient payment accounts, ledger balance history, and HMO insurance coverage.
          </p>
        </div>

        <div className="bg-white border border-[#201e1d]/20 rounded shadow-sm overflow-hidden">
          <table className="broadsheet-table">
            <thead>
              <tr className="bg-[#fcfbf9]">
                <th>Patient ID</th>
                <th>Full Name</th>
                <th>Primary Coverage</th>
                <th>Outstanding Copay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-mono text-xs font-semibold">PAT-1082</td>
                <td>J. Adeyemi</td>
                <td>Self-Pay / Direct USSD</td>
                <td className="font-heading font-semibold">₦0</td>
                <td><StatusChip status="paid" label="Up to date" /></td>
              </tr>
              <tr>
                <td className="font-mono text-xs font-semibold">PAT-1094</td>
                <td>J. Umar</td>
                <td>Reliance HMO (Silver Plan)</td>
                <td className="font-heading font-semibold">₦0</td>
                <td><StatusChip status="paid" label="Up to date" /></td>
              </tr>
              <tr>
                <td className="font-mono text-xs font-semibold">PAT-1102</td>
                <td>M. Bello</td>
                <td>Self-Pay / POS Card</td>
                <td className="font-heading font-semibold">₦8,500</td>
                <td><StatusChip status="pending" label="Unsettled" /></td>
              </tr>
              <tr>
                <td className="font-mono text-xs font-semibold">PAT-1115</td>
                <td>T. Yusuf</td>
                <td>Bank Transfer Direct</td>
                <td className="font-heading font-semibold">₦0</td>
                <td><StatusChip status="paid" label="Up to date" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-[#201e1d]">
          Settings
        </h1>
        <p className="text-sm text-[#605d5d] mt-1 font-serif">
          Payment gateway configurations, automated AI reconciliation parameters, and ledger sync rules.
        </p>
      </div>

      <div className="bg-white border border-[#201e1d]/20 rounded p-6 shadow-sm space-y-6 font-sans">
        <div className="border-b border-[#201e1d]/10 pb-4">
          <h3 className="font-heading text-lg font-bold text-[#201e1d] mb-1">
            AI Reconciliation Engine Thresholds
          </h3>
          <p className="text-xs text-[#605d5d]">
            Configure minimum confidence score requirements for one-click and auto-confirm actions.
          </p>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#201e1d]">Auto-Suggestion Threshold</span>
                <span className="block text-[#7d7979]">Mark match candidate as high confidence</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#e9f8ff] text-[#006786] font-bold border border-[#99e0ff]">
                85%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#201e1d]">Fuzzy Name Matching</span>
                <span className="block text-[#7d7979]">Permit bank description abbreviation e.g. "JOHN U." → J. Umar</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#eafaf0] text-[#1e7e47] font-bold border border-[#2a9d5c]/30">
                Enabled
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-heading text-lg font-bold text-[#201e1d] mb-1 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#0088b0]" />
            Transactional Integrity (PostgreSQL)
          </h3>
          <p className="text-xs text-[#605d5d]">
            All payment events and bulk reconciliation actions are recorded with double-entry journal rows and row-level locks.
          </p>

          <div className="mt-3 p-3 bg-[#fcfbf9] rounded border border-[#201e1d]/15 text-xs text-[#444141] font-mono">
            ENGINE STATUS: ACTIVE · ROW_LOCKS: ENABLED · ISOLATION: SERIALIZABLE
          </div>
        </div>
      </div>
    </div>
  );
};
