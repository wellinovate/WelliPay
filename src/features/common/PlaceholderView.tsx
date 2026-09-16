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
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-brand-navy">
            Invoices
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-sans">
            Hospital billing statements, outstanding balances, and matched payment receipts.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <table className="broadsheet-table w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th>Invoice #</th>
                <th>Patient / Account</th>
                <th>Service Details</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="font-mono text-xs font-semibold text-brand-navy">INV-92831</td>
                <td className="font-medium text-slate-800">J. Umar</td>
                <td className="text-slate-600 text-xs">Cardiology Consultation & ECG</td>
                <td className="font-heading font-semibold text-brand-navy">₦25,000</td>
                <td><StatusChip status="paid" label="Reconciled" /></td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="font-mono text-xs font-semibold text-brand-navy">INV-93010</td>
                <td className="font-medium text-slate-800">M. Bello</td>
                <td className="text-slate-600 text-xs">Pharmacy Prescription Checkout</td>
                <td className="font-heading font-semibold text-brand-navy">₦8,500</td>
                <td><StatusChip status="paid" label="Reconciled" /></td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="font-mono text-xs font-semibold text-brand-navy">INV-93044</td>
                <td className="font-medium text-slate-800">ABC Diagnostics</td>
                <td className="text-slate-600 text-xs">Referred Pathology Panel Batch</td>
                <td className="font-heading font-semibold text-brand-navy">₦12,000</td>
                <td><StatusChip status="paid" label="Reconciled" /></td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="font-mono text-xs font-semibold text-brand-navy">INV-93105</td>
                <td className="font-medium text-slate-800">T. Adeyemi</td>
                <td className="text-slate-600 text-xs">Pediatric Inpatient Observation</td>
                <td className="font-heading font-semibold text-brand-navy">₦11,500</td>
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
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-brand-navy">
            Patients
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-sans">
            Patient payment accounts, ledger balance history, and HMO insurance coverage.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <table className="broadsheet-table w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th>Patient ID</th>
                <th>Full Name</th>
                <th>Primary Coverage</th>
                <th>Outstanding Copay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="font-mono text-xs font-semibold text-brand-navy">PAT-1082</td>
                <td className="font-medium text-slate-800">J. Adeyemi</td>
                <td className="text-slate-600 text-xs">Self-Pay / Direct USSD</td>
                <td className="font-heading font-semibold text-brand-navy">₦0</td>
                <td><StatusChip status="paid" label="Up to date" /></td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="font-mono text-xs font-semibold text-brand-navy">PAT-1094</td>
                <td className="font-medium text-slate-800">J. Umar</td>
                <td className="text-slate-600 text-xs">Reliance HMO (Silver Plan)</td>
                <td className="font-heading font-semibold text-brand-navy">₦0</td>
                <td><StatusChip status="paid" label="Up to date" /></td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="font-mono text-xs font-semibold text-brand-navy">PAT-1102</td>
                <td className="font-medium text-slate-800">M. Bello</td>
                <td className="text-slate-600 text-xs">Self-Pay / POS Card</td>
                <td className="font-heading font-semibold text-brand-navy">₦8,500</td>
                <td><StatusChip status="pending" label="Unsettled" /></td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="font-mono text-xs font-semibold text-brand-navy">PAT-1115</td>
                <td className="font-medium text-slate-800">T. Yusuf</td>
                <td className="text-slate-600 text-xs">Bank Transfer Direct</td>
                <td className="font-heading font-semibold text-brand-navy">₦0</td>
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
        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-brand-navy">
          Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-sans">
          Payment gateway configurations, automated AI reconciliation parameters, and ledger sync rules.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 font-sans">
        <div className="border-b border-slate-100 pb-5">
          <h3 className="font-heading text-lg font-bold text-brand-navy mb-1">
            AI Reconciliation Engine Thresholds
          </h3>
          <p className="text-xs text-slate-500">
            Configure minimum confidence score requirements for one-click and auto-confirm actions.
          </p>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-100">
              <div>
                <span className="font-semibold text-brand-navy">Auto-Suggestion Threshold</span>
                <span className="block text-slate-500 mt-0.5">Mark match candidate as high confidence</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-brand-teal/10 text-brand-teal font-bold border border-brand-teal/30">
                85%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-100">
              <div>
                <span className="font-semibold text-brand-navy">Fuzzy Name Matching</span>
                <span className="block text-slate-500 mt-0.5">Permit bank description abbreviation e.g. &quot;JOHN U.&quot; → J. Umar</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                Enabled
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-heading text-lg font-bold text-brand-navy mb-1 flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-teal" />
            Transactional Integrity (PostgreSQL)
          </h3>
          <p className="text-xs text-slate-500">
            All payment events and bulk reconciliation actions are recorded with double-entry journal rows and row-level locks.
          </p>

          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 font-mono flex items-center justify-between">
            <span>ENGINE STATUS: <strong className="text-emerald-700">ACTIVE</strong></span>
            <span>ROW_LOCKS: <strong className="text-brand-navy">ENABLED</strong></span>
            <span>ISOLATION: <strong className="text-brand-teal">SERIALIZABLE</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
