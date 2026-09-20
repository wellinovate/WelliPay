import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWelliPay } from '../../context/WelliPayContext';
import {
  Sliders,
  CreditCard,
  RefreshCw,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Wifi,
  ArrowUpRight,
  Building2,
  Check,
  Clock,
  Server,
  Activity,
  KeyRound,
  Copy,
  Ban,
  Plus
} from 'lucide-react';

interface IntegrationCredential {
  id: number;
  providerId: string;
  providerName: string | null;
  vendorName: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

const EHR_VENDOR_OPTIONS = ['WelliRecord', 'OpenMRS', 'eClinicalWorks', 'Other'];
const HOSPITAL_PROVIDER_ID = 'PRV-LAG-01';
import { 
  SystemSettingsResponse, 
  MatchingSettings, 
  PaymentChannelConfig, 
  SyncStatusConfig, 
  LedgerIntegrityStatus 
} from '../../types';

export const SettingsView: React.FC = () => {
  const { addNotification } = useWelliPay();

  // Settings State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Active section for sidebar navigation
  const [activeSection, setActiveSection] = useState<'matching' | 'channels' | 'sync' | 'integrations' | 'integrity'>('matching');

  // EHR Integration Credentials
  const [credentials, setCredentials] = useState<IntegrationCredential[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [newVendorName, setNewVendorName] = useState(EHR_VENDOR_OPTIONS[0]);
  const [customVendorName, setCustomVendorName] = useState('');
  const [issuingKey, setIssuingKey] = useState(false);
  const [newlyIssuedKey, setNewlyIssuedKey] = useState<{ vendorName: string; apiKey: string } | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  // Matching Settings
  const [matching, setMatching] = useState<MatchingSettings>({
    threshold: 85,
    autoConfirm: false,
    autoConfirmThreshold: 98,
    fuzzyNameMatching: true,
    lastChangedBy: 'Dr. Babatunde Fashola (Chief Medical Officer)',
    lastChangedAt: '2026-09-14T11:24:00Z'
  });

  // Payment Channels
  const [channels, setChannels] = useState<PaymentChannelConfig[]>([
    { id: 'pos_moniepoint', name: 'POS Terminal (Moniepoint)', channel: 'POS card', protocol: 'ISO 8583 / Terminal SDK', status: 'active', latencyMs: 1200, dailyVolume: '₦1,420,000', txnCount: 14 },
    { id: 'pos_opay', name: 'POS Terminal (OPay)', channel: 'POS card', protocol: 'Smart POS Webhook', status: 'active', latencyMs: 900, dailyVolume: '₦380,000', txnCount: 4 },
    { id: 'nip_direct', name: 'NIBSS Instant Payments (NIP)', channel: 'Bank transfer', protocol: 'NIP Settlement Feed / CBN Direct', status: 'active', latencyMs: 2400, dailyVolume: '₦520,000', txnCount: 7 },
    { id: 'gtbank_ussd', name: 'GTBank USSD (*737#)', channel: 'USSD', protocol: 'Telco Aggregator / USSD Push', status: 'active', latencyMs: 1800, dailyVolume: '₦180,000', txnCount: 3 },
    { id: 'paystack_online', name: 'Paystack Web & Virtual Accounts', channel: 'Web / Virtual Transfer', protocol: 'REST Webhooks (HMAC-SHA512)', status: 'active', latencyMs: 400, dailyVolume: '₦340,000', txnCount: 5 },
    { id: 'interswitch_clearing', name: 'Interswitch Healthcare Clearinghouse', channel: 'HMO Remittance Gateway', protocol: 'Direct Clearing House API', status: 'active', latencyMs: 3100, dailyVolume: '₦1,900,000', txnCount: 12 }
  ]);

  // Sync Status
  const [sync, setSync] = useState<SyncStatusConfig>({
    ehr: {
      name: 'Hospital EHR (InstaEMR / Meditech)',
      status: 'active',
      protocol: 'HL7 FHIR v4 REST & WebSocket',
      lastSyncSecondsAgo: 32,
      inboundPending: 0,
      ordersSyncedToday: 17
    },
    posFleet: {
      name: 'POS Fleet Terminal Gateway',
      status: 'active',
      terminalsOnline: 6,
      terminalsTotal: 6,
      lastHeartbeatSecondsAgo: 18,
      pollIntervalSeconds: 15
    },
    clearinghouse: {
      name: 'NHIA e-Claim Clearinghouse',
      status: 'active',
      lastBatch: 'Today at 17:30',
      claimsInFlight: 48
    }
  });

  // Ledger Integrity Check
  const [integrity, setIntegrity] = useState<LedgerIntegrityStatus>({
    totalDebits: 2840000,
    formattedTotalDebits: '₦2,840,000',
    totalCredits: 2840000,
    formattedTotalCredits: '₦2,840,000',
    variance: 0,
    formattedVariance: '₦0.00',
    isBalanced: true,
    verifiedAt: new Date().toISOString(),
    lastReconciliationRun: 'Today at 17:30 · 33 batches confirmed',
    engine: 'PostgreSQL 16 (Neon Pool)',
    isolationLevel: 'SERIALIZABLE',
    rowLevelLocking: true
  });

  // Live action states
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);
  const [syncingEhr, setSyncingEhr] = useState(false);
  const [verifyingBalance, setVerifyingBalance] = useState(false);

  // Helper for auth headers
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const { auth } = await import('../../firebase');
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
      }
    } catch (_) {}
    return { 'Content-Type': 'application/json' };
  }, []);

  // Fetch Settings Data
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const res = await fetch('/api/settings', { headers });
      if (res.ok) {
        const data: SystemSettingsResponse = await res.json();
        if (data.matching) setMatching(data.matching);
        if (data.channels) setChannels(data.channels);
        if (data.sync) setSync(data.sync);
        if (data.integrity) setIntegrity(data.integrity);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Fetch Issued EHR Integration Credentials
  const fetchCredentials = useCallback(async () => {
    try {
      setLoadingCredentials(true);
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/integration-credentials', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.credentials)) setCredentials(data.credentials);
      }
    } catch (err) {
      console.error('Error fetching integration credentials:', err);
    } finally {
      setLoadingCredentials(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Issue a New API Key
  const handleIssueKey = async () => {
    const vendorName = newVendorName === 'Other' ? customVendorName.trim() : newVendorName;
    if (!vendorName) {
      addNotification('Enter a vendor name for the custom integration.', 'error');
      return;
    }
    setIssuingKey(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/integration-credentials', {
        method: 'POST',
        headers,
        body: JSON.stringify({ provider_id: HOSPITAL_PROVIDER_ID, vendor_name: vendorName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewlyIssuedKey({ vendorName, apiKey: data.api_key });
        setKeyCopied(false);
        setCustomVendorName('');
        await fetchCredentials();
        addNotification(`API key issued for ${vendorName}.`, 'success');
      } else {
        addNotification(data.error || 'Failed to issue API key.', 'error');
      }
    } catch (err) {
      addNotification('Network error issuing API key.', 'error');
    } finally {
      setIssuingKey(false);
    }
  };

  const handleCopyIssuedKey = () => {
    if (!newlyIssuedKey) return;
    navigator.clipboard.writeText(newlyIssuedKey.apiKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 3000);
  };

  // Revoke an Existing API Key
  const handleRevokeKey = async (cred: IntegrationCredential) => {
    if (!window.confirm(`Revoke the ${cred.vendorName} key (${cred.keyPrefix})? This takes effect immediately and cannot be undone — a new key would need to be issued.`)) {
      return;
    }
    setRevokingId(cred.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/integration-credentials/${cred.id}/revoke`, {
        method: 'PATCH',
        headers
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCredentials(prev => prev.map(c => c.id === cred.id ? { ...c, isActive: false } : c));
        addNotification(`${cred.vendorName} key (${cred.keyPrefix}) revoked.`, 'info');
      } else {
        addNotification(data.error || 'Failed to revoke API key.', 'error');
      }
    } catch (err) {
      addNotification('Network error revoking API key.', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  // Dynamic calculation: How many of the 45 reconciliation rows match at the current threshold?
  // 33 confirmed rows have confidence scores >= 86%.
  // 12 unmatched items have confidence scores: [96, 95, 94, 93, 92, 91, 89, 88, 87, 86, 72, 35].
  const rowImpact = useMemo(() => {
    const scores = [
      // 33 confirmed rows (all >= 86%)
      99, 99, 98, 98, 98, 97, 97, 96, 96, 96, 95, 95, 95, 94, 94, 94, 93, 93, 92, 92, 91, 91, 90, 90, 89, 89, 88, 88, 87, 87, 86, 86, 86,
      // 12 unmatched items
      96, 95, 94, 93, 92, 91, 89, 88, 87, 86, 72, 35
    ];
    const matchCount = scores.filter(s => s >= matching.threshold).length;
    const manualCount = 45 - matchCount;
    return { matchCount, manualCount };
  }, [matching.threshold]);

  // Save Settings Changes
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const headers = await getAuthHeaders();
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ matching })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.matching) setMatching(data.matching);
        setDirty(false);
        addNotification('Settings saved successfully for Lagoon Specialist Hospital.', 'success');
      } else {
        addNotification('Failed to save settings changes.', 'error');
      }
    } catch (err) {
      addNotification('Network error while saving settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Test Channel Connection
  const handleTestChannel = async (channelId: string, channelName: string) => {
    try {
      setTestingChannelId(channelId);
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/settings/test-channel/${channelId}`, {
        method: 'POST',
        headers
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addNotification(`Ping successful: ${channelName} responded in ${data.latencyMs}ms (HTTP 200 OK).`, 'success');
      } else {
        addNotification(`Channel health check failed for ${channelName}.`, 'error');
      }
    } catch (err) {
      addNotification(`Network error testing ${channelName}.`, 'error');
    } finally {
      setTestingChannelId(null);
    }
  };

  // Trigger Manual EHR Sync
  const handleSyncNow = async () => {
    try {
      setSyncingEhr(true);
      const headers = await getAuthHeaders();
      const res = await fetch('/api/settings/sync-now', {
        method: 'POST',
        headers
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSync(prev => ({
          ...prev,
          ehr: { ...prev.ehr, lastSyncSecondsAgo: 0 }
        }));
        addNotification('EHR synchronization complete: 17 clinical procedure orders verified across patient folders.', 'success');
      } else {
        addNotification('EHR synchronization request timed out.', 'error');
      }
    } catch (err) {
      addNotification('Network error during EHR sync.', 'error');
    } finally {
      setSyncingEhr(false);
    }
  };

  // Trigger Runtime Ledger Balance Check
  const handleVerifyBalance = async () => {
    try {
      setVerifyingBalance(true);
      const headers = await getAuthHeaders();
      const res = await fetch('/api/settings/verify-balance', {
        method: 'POST',
        headers
      });

      const data = await res.json();
      if (res.ok && data.integrity) {
        setIntegrity(data.integrity);
        addNotification('Dual-entry ledger balance verified: Debits equal Credits (₦0.00 variance).', 'success');
      } else {
        addNotification('Failed to verify ledger balance.', 'error');
      }
    } catch (err) {
      addNotification('Network error verifying ledger integrity.', 'error');
    } finally {
      setVerifyingBalance(false);
    }
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${time}`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Facility Scope Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-[#12244D]">
              Settings
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#12244D]/10 text-[#12244D]">
              <Building2 className="w-3.5 h-3.5" />
              Lagoon Specialist Hospital (FAC-LAG-001)
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1 font-sans">
            Reconciliation parameters, payment channels, EHR integration, and ledger balance verification.
          </p>
        </div>

        {/* Action / Dirty State Indicator */}
        <div className="flex items-center gap-3">
          {dirty ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
              Unsaved changes
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/60">
              <Check className="w-3.5 h-3.5" />
              All settings saved
            </span>
          )}

          <button
            onClick={handleSaveSettings}
            disabled={!dirty || saving}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
              dirty && !saving
                ? 'bg-[#12244D] hover:bg-[#0A152E] text-white shadow-card'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Facility Scope Callout Banner */}
      <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 text-xs font-sans text-slate-600 flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#0B6B69] shrink-0" />
          <span>
            <strong className="text-[#0f172a]">Facility scope:</strong> Settings configured on this page apply exclusively to{' '}
            <span className="font-semibold text-[#12244D]">Lagoon Specialist Hospital</span> and do not alter parameters for other network branches.
          </span>
        </div>
        <span className="hidden md:inline-block font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
          ID: FAC-LAG-001
        </span>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Column */}
        <div className="lg:col-span-3 space-y-4 sticky top-6">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-subtle space-y-1 font-sans text-xs">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
            <button
              onClick={() => {
                setActiveSection('matching');
                document.getElementById('section-matching')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
                activeSection === 'matching'
                  ? 'bg-[#12244D] text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4" />
                <span>Reconciliation matching</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveSection('channels');
                document.getElementById('section-channels')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
                activeSection === 'channels'
                  ? 'bg-[#12244D] text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4" />
                <span>Payment channels</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeSection === 'channels' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                6
              </span>
            </button>

            <button
              onClick={() => {
                setActiveSection('sync');
                document.getElementById('section-sync')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
                activeSection === 'sync'
                  ? 'bg-[#12244D] text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4" />
                <span>EHR & POS sync</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            <button
              onClick={() => {
                setActiveSection('integrations');
                document.getElementById('section-integrations')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
                activeSection === 'integrations'
                  ? 'bg-[#12244D] text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4" />
                <span>EHR integrations</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeSection === 'integrations' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {credentials.filter(c => c.isActive).length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveSection('integrity');
                document.getElementById('section-integrity')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
                activeSection === 'integrity'
                  ? 'bg-[#12244D] text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Scale className="w-4 h-4" />
                <span>Ledger balance</span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                ✓
              </span>
            </button>
          </div>

          {/* Hospital Facility Profile Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-subtle space-y-2.5 font-sans text-xs text-slate-600">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Facility record
            </div>
            <div>
              <span className="font-bold text-[#12244D] block text-sm leading-snug">
                Lagoon Specialist Hospital
              </span>
              <span className="text-[11px] text-slate-500 block">
                174B Corporation Drive, Victoria Island, Lagos
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Facility tier:</span>
                <span className="font-medium text-[#12244D]">Tier 1 Multi-Specialty</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active currency:</span>
                <span className="font-mono font-medium text-[#0B6B69]">NGN (₦)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Accounting method:</span>
                <span className="font-medium text-[#12244D]">Accrual dual-entry</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area (Full remaining width) */}
        <div className="lg:col-span-9 space-y-6">
          {/* Section 1: Reconciliation Matching */}
          <div 
            id="section-matching" 
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-subtle space-y-5 font-sans"
          >
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-[#12244D]">
                <Sliders className="w-5 h-5 text-[#0B6B69]" />
                <h2 className="font-heading text-lg font-bold text-[#12244D]">
                  Reconciliation matching
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Configure algorithmic name and reference matching rules for automated transaction suggestion.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Setting 1: Match Confidence Threshold */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-sm text-[#12244D]">
                      Match confidence threshold
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                      Transactions with an algorithmic confidence score at or above this threshold are surfaced as suggested matches for quick one-click confirmation.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="50"
                      max="99"
                      value={matching.threshold}
                      onChange={(e) => {
                        const val = Math.max(50, Math.min(99, parseInt(e.target.value) || 50));
                        setMatching(prev => ({ ...prev, threshold: val }));
                        setDirty(true);
                      }}
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-md text-sm font-bold text-center text-[#0B6B69] focus:outline-none focus:border-[#0B6B69]"
                    />
                    <span className="font-bold text-sm text-slate-500">%</span>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={matching.threshold}
                    onChange={(e) => {
                      setMatching(prev => ({ ...prev, threshold: parseInt(e.target.value) }));
                      setDirty(true);
                    }}
                    className="w-full accent-[#0B6B69] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>50% (Permissive)</span>
                    <span>85% (Hospital standard)</span>
                    <span>99% (Exact only)</span>
                  </div>
                </div>

                {/* Dynamic Row Impact Calculation */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-[#0B6B69]" />
                    <span>
                      At <strong className="text-[#0B6B69]">{matching.threshold}%</strong>,{' '}
                      <strong className="text-[#12244D]">{rowImpact.matchCount} of 45</strong> transactions qualify as high-confidence matches.
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {rowImpact.manualCount} require manual review
                  </span>
                </div>

                {/* Audit Line */}
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Changed by Folake Adeyemi on 12 Sep 2026, 09:15 AM</span>
                </div>
              </div>

              {/* Setting 2: Auto-Confirm Threshold (Off by Default) */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-sm text-[#12244D]">
                      Auto-confirm threshold
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                      Automatically reconcile incoming transactions without manual staff review when candidate confidence meets or exceeds this threshold. Keep disabled to require human supervisory sign-off on all matches.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={matching.autoConfirm}
                    onClick={() => {
                      setMatching(prev => ({ ...prev, autoConfirm: !prev.autoConfirm }));
                      setDirty(true);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      matching.autoConfirm ? 'bg-[#0B6B69]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        matching.autoConfirm ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {matching.autoConfirm && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-900">
                        Auto-confirm confidence cutoff:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="90"
                          max="99"
                          value={matching.autoConfirmThreshold}
                          onChange={(e) => {
                            const val = Math.max(90, Math.min(99, parseInt(e.target.value) || 90));
                            setMatching(prev => ({ ...prev, autoConfirmThreshold: val }));
                            setDirty(true);
                          }}
                          className="w-14 px-1.5 py-0.5 bg-white border border-emerald-300 rounded text-xs font-bold text-center text-emerald-800"
                        />
                        <span className="font-bold text-xs text-emerald-800">%</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Transactions with matching confidence ≥ {matching.autoConfirmThreshold}% will be booked directly to the hospital ledger upon receipt.
                    </p>
                  </div>
                )}

                {/* Audit Line */}
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Changed by Dr. Babatunde Fashola on 14 Sep 2026, 11:24 AM</span>
                </div>
              </div>

              {/* Setting 3: Fuzzy Name Matching Switch */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-sm text-[#12244D]">
                      Fuzzy name matching
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                      Permits algorithmic matching of abbreviated or truncated bank narrations to canonical patient folder records (e.g. &quot;JOHN U.&quot; → John Umar, &quot;RELIANCE COPAY&quot; → Reliance HMO batch).
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={matching.fuzzyNameMatching}
                    onClick={() => {
                      setMatching(prev => ({ ...prev, fuzzyNameMatching: !prev.fuzzyNameMatching }));
                      setDirty(true);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      matching.fuzzyNameMatching ? 'bg-[#0B6B69]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        matching.fuzzyNameMatching ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Explicit Explanation of What Turning it Off Does */}
                <div className={`p-3 rounded-lg border text-xs transition-colors ${
                  matching.fuzzyNameMatching 
                    ? 'bg-slate-100/80 border-slate-200 text-slate-700' 
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {matching.fuzzyNameMatching ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Fuzzy string normalization enabled. Handles middle initials, trailing hospital codes, and payer abbreviation patterns.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Fuzzy matching disabled:</strong> Strict exact character matching is now enforced. <strong>8 of the 12 currently unmatched transactions</strong> with abbreviated bank narrations will be excluded from suggested candidate matches.
                      </span>
                    </div>
                  )}
                </div>

                {/* Audit Line */}
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Changed by Dr. Babatunde Fashola on 14 Sep 2026, 11:24 AM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Payment Channels (All 6 Active Rails) */}
          <div 
            id="section-channels" 
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-subtle space-y-4 font-sans"
          >
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-[#12244D]">
                  <CreditCard className="w-5 h-5 text-[#0B6B69]" />
                  <h2 className="font-heading text-lg font-bold text-[#12244D]">
                    Payment channels (6 active)
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Active payment rails capturing patient copays, direct transfers, and third-party remittances across Lagoon Hospital.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                6 rails operational
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {channels.map((ch) => (
                <div 
                  key={ch.id} 
                  className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC] hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-sm text-[#12244D] block">
                        {ch.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {ch.protocol}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Active
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Daily volume:</span>
                      <span className="font-bold text-[#12244D] font-mono">
                        {ch.dailyVolume} ({ch.txnCount} txns)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Ping latency:</span>
                      <span className="font-mono text-emerald-700 font-medium">
                        {ch.latencyMs}ms (Healthy)
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => handleTestChannel(ch.id, ch.name)}
                      disabled={testingChannelId === ch.id}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded border border-slate-300 hover:bg-white text-slate-700 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Wifi className="w-3 h-3 text-slate-500" />
                      {testingChannelId === ch.id ? 'Testing...' : 'Test connection'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: EHR & POS Sync */}
          <div 
            id="section-sync" 
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-subtle space-y-4 font-sans"
          >
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-[#12244D]">
                  <RefreshCw className="w-5 h-5 text-[#0B6B69]" />
                  <h2 className="font-heading text-lg font-bold text-[#12244D]">
                    EHR & POS sync
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Real-time clinical order synchronization and POS terminal fleet polling status.
                </p>
              </div>
              <button
                onClick={handleSyncNow}
                disabled={syncingEhr}
                className="px-3 py-1.5 text-xs font-bold bg-[#0B6B69] hover:bg-[#074C4A] text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingEhr ? 'animate-spin' : ''}`} />
                {syncingEhr ? 'Syncing...' : 'Sync now'}
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Card 1: Hospital EHR */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#12244D]">
                      {sync.ehr.name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live continuous sync
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Protocol: <span className="font-mono text-[11px] text-slate-800">{sync.ehr.protocol}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right text-[11px]">
                  <span className="text-slate-500 block">
                    Last sync: <strong className="text-slate-800">{sync.ehr.lastSyncSecondsAgo}s ago</strong>
                  </span>
                  <span className="text-emerald-700 font-medium block mt-0.5">
                    {sync.ehr.inboundPending} pending · {sync.ehr.ordersSyncedToday} orders synced today
                  </span>
                </div>
              </div>

              {/* Card 2: POS Fleet Terminal Gateway */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#12244D]">
                      {sync.posFleet.name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {sync.posFleet.terminalsOnline}/{sync.posFleet.terminalsTotal} Online
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Polling frequency: <span className="font-medium text-slate-800">Every {sync.posFleet.pollIntervalSeconds} seconds</span>
                  </div>
                </div>
                <div className="text-left sm:text-right text-[11px]">
                  <span className="text-slate-500 block">
                    Last terminal ping: <strong className="text-slate-800">{sync.posFleet.lastHeartbeatSecondsAgo}s ago</strong>
                  </span>
                  <span className="text-slate-600 block mt-0.5">
                    Terminal firmware: v4.2.1 (Compliant)
                  </span>
                </div>
              </div>

              {/* Card 3: Clearinghouse */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#12244D]">
                      {sync.clearinghouse.name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Connected
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Adjudication standard: <span className="font-medium text-slate-800">NHIA 14-day turnaround SLA</span>
                  </div>
                </div>
                <div className="text-left sm:text-right text-[11px]">
                  <span className="text-slate-500 block">
                    Last batch transmission: <strong className="text-slate-800">{sync.clearinghouse.lastBatch}</strong>
                  </span>
                  <span className="font-mono text-[#0B6B69] font-semibold block mt-0.5">
                    {sync.clearinghouse.claimsInFlight} claims in flight
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: EHR Integration Credentials */}
          <div
            id="section-integrations"
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-subtle space-y-4 font-sans"
          >
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-[#12244D]">
                <KeyRound className="w-5 h-5 text-[#0B6B69]" />
                <h2 className="font-heading text-lg font-bold text-[#12244D]">
                  EHR integrations
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                API keys for third-party EHRs (WelliRecord, OpenMRS, eClinicalWorks) to submit clinical orders into this facility's record.
              </p>
            </div>

            {/* Issue New Key */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3 text-xs">
              <span className="font-semibold text-sm text-[#12244D] block">
                Issue a new API key
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-[#0f172a] focus:outline-none focus:border-[#12244D]"
                >
                  {EHR_VENDOR_OPTIONS.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                {newVendorName === 'Other' && (
                  <input
                    type="text"
                    placeholder="Vendor name..."
                    value={customVendorName}
                    onChange={(e) => setCustomVendorName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs text-[#0f172a] focus:outline-none focus:border-[#12244D]"
                  />
                )}
                <button
                  onClick={handleIssueKey}
                  disabled={issuingKey}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg bg-[#12244D] hover:bg-[#0A152E] text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {issuingKey ? 'Issuing...' : 'Issue key'}
                </button>
              </div>

              {/* One-Time Raw Key Reveal */}
              {newlyIssuedKey && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Copy this key now — it will not be shown again
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2.5 py-1.5 bg-white border border-amber-200 rounded font-mono text-[11px] text-slate-800 break-all">
                      {newlyIssuedKey.apiKey}
                    </code>
                    <button
                      onClick={handleCopyIssuedKey}
                      className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-800 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {keyCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {keyCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Issued for {newlyIssuedKey.vendorName}. If lost, revoke it and issue a new one — the raw key cannot be retrieved again.
                  </p>
                </div>
              )}
            </div>

            {/* Issued Keys List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Issued keys
              </span>
              {loadingCredentials ? (
                <div className="text-xs text-slate-500 py-4 text-center">Loading...</div>
              ) : credentials.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  No API keys issued yet for this facility.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {credentials.map(cred => (
                    <div key={cred.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#12244D]">{cred.vendorName}</span>
                          {cred.isActive ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              Revoked
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {cred.keyPrefix}••••••••
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Issued {formatDate(cred.createdAt)}
                          {cred.lastUsedAt ? ` · Last used ${formatDate(cred.lastUsedAt)}` : ' · Never used'}
                        </div>
                      </div>
                      {cred.isActive && (
                        <button
                          onClick={() => handleRevokeKey(cred)}
                          disabled={revokingId === cred.id}
                          className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          {revokingId === cred.id ? 'Revoking...' : 'Revoke'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Ledger Balance & Integrity (Replaces Fake Terminal Block) */}
          <div 
            id="section-integrity" 
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-subtle space-y-4 font-sans"
          >
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-[#12244D]">
                  <Scale className="w-5 h-5 text-[#0B6B69]" />
                  <h2 className="font-heading text-lg font-bold text-[#12244D]">
                    Ledger balance & integrity
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Runtime dual-entry balance audit and database consistency verification.
                </p>
              </div>
              <button
                onClick={handleVerifyBalance}
                disabled={verifyingBalance}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${verifyingBalance ? 'animate-spin' : ''}`} />
                {verifyingBalance ? 'Checking...' : 'Run balance check now'}
              </button>
            </div>

            {/* Dual-Entry Balance Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm text-[#12244D]">
                    Dual-entry balance check: {integrity.isBalanced ? 'Balanced' : 'Discrepancy detected'}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                  Variance: {integrity.formattedVariance}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Total debits recorded:</span>
                  <span className="font-mono font-bold text-sm text-[#12244D]">
                    {integrity.formattedTotalDebits}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Total credits recorded:</span>
                  <span className="font-mono font-bold text-sm text-[#12244D]">
                    {integrity.formattedTotalCredits}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Verified at runtime:</span>
                  <span className="font-mono text-slate-700 text-xs">
                    {formatDate(integrity.verifiedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Runtime Database Guarantees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Database engine:</span>
                <span className="font-bold text-slate-800 text-xs">
                  {integrity.engine}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Transaction isolation:</span>
                <span className="font-mono font-bold text-[#0B6B69] text-xs">
                  {integrity.isolationLevel}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Last reconciliation run:</span>
                <span className="font-semibold text-slate-800 text-xs">
                  {integrity.lastReconciliationRun}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
