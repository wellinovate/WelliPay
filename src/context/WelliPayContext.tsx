import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ReconciliationItem,
  AIMatchSuggestion,
  ProviderTransaction,
  HMOClaim,
  PersonaType,
  NavTab,
  DashboardMetrics,
  RevenueLeakageSummary
} from '../types';
import {
  INITIAL_RECONCILIATION_ITEMS,
  INITIAL_PROVIDER_TRANSACTIONS,
  INITIAL_HMO_CLAIMS
} from '../data/mockData';

export interface NotificationToast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface WelliPayContextType {
  // Navigation & Persona
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  persona: PersonaType;
  setPersona: (p: PersonaType) => void;

  // Reconciliation
  reconciliationItems: ReconciliationItem[];
  toggleSelectReconItem: (id: string) => void;
  selectAllReconItems: (selected: boolean) => void;
  selectOnlyReconIds: (ids: string[]) => void;
  confirmReconItem: (id: string, candidateMatch?: Partial<AIMatchSuggestion>) => void;
  rejectReconItem: (id: string, reason?: string) => void;
  bulkConfirmSelected: () => void;
  filterReconStatus: 'unmatched' | 'suggested' | 'confirmed';
  setFilterReconStatus: (s: 'unmatched' | 'suggested' | 'confirmed') => void;
  filterChannel: string;
  setFilterChannel: (c: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Counters
  unmatchedCount: number;
  suggestedCount: number;
  confirmedCount: number;
  selectedCount: number;

  // Provider Data & Operations
  providerTransactions: ProviderTransaction[];
  dashboardMetrics: DashboardMetrics;
  leakageSummary: RevenueLeakageSummary;
  unbilledExposureResolved: boolean;
  resolveUnbilledExposure: () => Promise<{ success: boolean; count?: number; error?: string }>;
  refreshDashboard: () => Promise<void>;
  addProviderTransaction: (t: ProviderTransaction) => void;
  voidProviderTransaction: (id: string) => void;

  // HMO Claims Data & Operations
  hmoClaims: HMOClaim[];
  approveClaim: (id: string) => void;
  rejectClaim: (id: string, reason?: string) => void;
  resolveClaimDispute: (id: string, resolution: 'approve' | 'reject') => void;
  appealClaim: (id: string, preAuthCode?: string, notes?: string) => void;
  refreshClaims: () => Promise<void>;

  // Notifications
  notifications: NotificationToast[];
  addNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeNotification: (id: string) => void;
}

const DEFAULT_DASHBOARD_METRICS: DashboardMetrics = {
  totalToday: 2840000,
  formattedTotalToday: '₦2.84M',
  totalTodayTrend: '+14.2% vs yesterday',
  patientDirect: 640000,
  formattedPatientDirect: '₦640K',
  hmoReceivables: 1900000,
  formattedHmoReceivables: '₦1.9M',
  pendingClaimsCount: 6,
  corporateRetainers: 300000,
  formattedCorporateRetainers: '₦300K',
  corporateCount: 3,
};

const DEFAULT_LEAKAGE_SUMMARY: RevenueLeakageSummary = {
  unbilledCount: 17,
  totalExposure: 340000,
  formattedTotalExposure: '₦340,000',
  isResolved: false,
  breakdown: [
    { name: 'Full Blood Count (8 orders)', orderCount: 8, amount: 96000, formattedAmount: '₦96,000' },
    { name: 'Electrolytes, Urea & Creatinine (5 orders)', orderCount: 5, amount: 140000, formattedAmount: '₦140,000' },
    { name: 'Lipid Profile Panels (4 orders)', orderCount: 4, amount: 104000, formattedAmount: '₦104,000' }
  ]
};

const WelliPayContext = createContext<WelliPayContextType | undefined>(undefined);

export const WelliPayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Active tab persisted to localStorage across page reloads
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    const saved = localStorage.getItem('activeTab');
    const validTabs: NavTab[] = ['dashboard', 'reconciliation', 'claims', 'invoices', 'patients', 'catalogue', 'estimation', 'settings', 'preauth'];
    if (saved && validTabs.includes(saved as NavTab)) {
      return saved as NavTab;
    }
    return (saved as NavTab) || 'reconciliation';
  });

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);
  const [persona, setPersona] = useState<PersonaType>('provider');

  // Reconciliation State
  const [reconciliationItems, setReconciliationItems] = useState<ReconciliationItem[]>(INITIAL_RECONCILIATION_ITEMS);
  const [filterReconStatus, setFilterReconStatus] = useState<'unmatched' | 'suggested' | 'confirmed'>('unmatched');
  const [filterChannel, setFilterChannel] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Provider State
  const [providerTransactions, setProviderTransactions] = useState<ProviderTransaction[]>(INITIAL_PROVIDER_TRANSACTIONS);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>(DEFAULT_DASHBOARD_METRICS);
  const [leakageSummary, setLeakageSummary] = useState<RevenueLeakageSummary>(DEFAULT_LEAKAGE_SUMMARY);
  const [unbilledExposureResolved, setUnbilledExposureResolved] = useState<boolean>(false);

  // HMO State
  const [hmoClaims, setHmoClaims] = useState<HMOClaim[]>(INITIAL_HMO_CLAIMS);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationToast[]>([
    {
      id: 'init-toast',
      message: 'WelliPay AI reconciliation engine connected. 14 incoming unallocated payments identified.',
      type: 'info'
    }
  ]);

  const addNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setNotifications(prev => [ { id, message, type }, ...prev.slice(0, 4) ]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Helper to attach Firebase Bearer token to API calls
  const getAuthHeaders = async () => {
    try {
      const { auth } = await import('../firebase');
      const token = await auth.currentUser?.getIdToken();
      return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
    } catch {
      return { 'Content-Type': 'application/json' };
    }
  };

  // Database auto-hydration and health check on mount
  React.useEffect(() => {
    fetch('/api/database/status')
      .then(res => res.json())
      .then(async (data) => {
        if (data && data.connected) {
          addNotification(`PostgreSQL database connected (${data.database}). Real-time ledger active.`, 'success');
          
          const headers = await getAuthHeaders();

          fetch('/api/reconciliation', { headers })
            .then(r => r.json())
            .then(recData => {
              if (recData && recData.items && recData.items.length > 0) {
                setReconciliationItems(recData.items);
              }
            })
            .catch(() => {});

          fetch('/api/claims', { headers })
            .then(r => r.json())
            .then(claimData => {
              if (claimData && claimData.claims && claimData.claims.length > 0) {
                setHmoClaims(claimData.claims);
              }
            })
            .catch(() => {});

          fetch('/api/dashboard', { headers })
            .then(r => r.json())
            .then(dashData => {
              if (dashData) {
                if (dashData.transactions && dashData.transactions.length > 0) {
                  setProviderTransactions(dashData.transactions);
                }
                if (dashData.metrics) {
                  setDashboardMetrics(dashData.metrics);
                }
                if (dashData.leakage) {
                  setLeakageSummary(dashData.leakage);
                  if (dashData.leakage.isResolved) {
                    setUnbilledExposureResolved(true);
                  }
                }
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Reconciliation Actions
  const toggleSelectReconItem = (id: string) => {
    setReconciliationItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const selectAllReconItems = (selected: boolean) => {
    setReconciliationItems(prev => prev.map(item => {
      // only toggle currently filtered view
      const matchesStatus = 
        filterReconStatus === 'suggested' 
          ? (item.status === 'unmatched' && item.aiMatch.isHighConfidence) 
          : item.status === filterReconStatus;
      return matchesStatus ? { ...item, selected } : item;
    }));
  };

  const selectOnlyReconIds = (ids: string[]) => {
    const idSet = new Set(ids);
    setReconciliationItems(prev => prev.map(item => ({
      ...item,
      selected: idSet.has(item.id)
    })));
  };

  const confirmReconItem = (id: string, candidateMatch?: Partial<AIMatchSuggestion>) => {
    const target = reconciliationItems.find(i => i.id === id);
    if (!target) return;

    const mergedMatch = candidateMatch 
      ? { ...target.aiMatch, ...candidateMatch, isHighConfidence: true, confidence: candidateMatch.confidence ?? 95 }
      : target.aiMatch;

    setReconciliationItems(prev => prev.map(item => 
      item.id === id ? { 
        ...item, 
        aiMatch: mergedMatch,
        status: 'confirmed', 
        selected: false, 
        confirmedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      } : item
    ));

    addNotification(`Matched ${target.formattedAmount} (${target.description}) to ${mergedMatch.targetName} (${mergedMatch.invoiceNumber || 'Account'})`, 'success');

    // Sync to PostgreSQL backend
    getAuthHeaders().then(headers => {
      fetch('/api/reconciliation/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id, candidateMatch: mergedMatch })
      }).catch(() => {});
    });
  };

  const rejectReconItem = (id: string, reason: string = 'Cashier flag for manual review') => {
    setReconciliationItems(prev => prev.map(item => 
      item.id === id ? { 
        ...item, 
        selected: false, 
        aiMatch: { 
          ...item.aiMatch, 
          isHighConfidence: false, 
          confidence: 20, 
          explanation: reason 
        } 
      } : item
    ));
    addNotification(`Match suggestion for payment ${id} flagged for supervisor review.`, 'info');
  };

  const bulkConfirmSelected = () => {
    const selected = reconciliationItems.filter(i => i.selected && i.status === 'unmatched');
    if (selected.length === 0) return;

    const totalAmount = selected.reduce((sum, item) => sum + item.amount, 0);
    const count = selected.length;
    const ids = selected.map(i => i.id);

    setReconciliationItems(prev => prev.map(item => 
      item.selected && item.status === 'unmatched'
        ? { 
            ...item, 
            status: 'confirmed', 
            selected: false, 
            confirmedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          }
        : item
    ));

    addNotification(`Bulk reconciled ${count} transactions totaling ₦${totalAmount.toLocaleString()} directly into hospital ledger.`, 'success');

    // Sync atomic bulk confirmation to PostgreSQL
    getAuthHeaders().then(headers => {
      fetch('/api/reconciliation/bulk-confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids })
      }).catch(() => {});
    });
  };

  const refreshDashboard = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/dashboard', { headers });
      if (res.ok) {
        const dashData = await res.json();
        if (dashData) {
          if (dashData.transactions && dashData.transactions.length > 0) {
            setProviderTransactions(dashData.transactions);
          }
          if (dashData.metrics) {
            setDashboardMetrics(dashData.metrics);
          }
          if (dashData.leakage) {
            setLeakageSummary(dashData.leakage);
            setUnbilledExposureResolved(dashData.leakage.isResolved || dashData.leakage.unbilledCount === 0);
          }
        }
      }
    } catch (e) {
      console.error('Error refreshing dashboard:', e);
    }
  };

  const resolveUnbilledExposure = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/leakage/bill', {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to bill exposure');
      }
      setUnbilledExposureResolved(true);
      setLeakageSummary(prev => ({
        ...prev,
        isResolved: true,
        unbilledCount: 0,
        totalExposure: 0,
        formattedTotalExposure: '₦0',
        breakdown: []
      }));
      addNotification(`${data.count || 3} invoice(s) generated from unbilled lab services.`, 'success');
      await refreshDashboard();
      return { success: true, count: data.count || 3 };
    } catch (err: any) {
      console.error('Error billing exposure:', err);
      addNotification(err.message || 'Failed to generate invoices from leakage', 'error');
      return { success: false, error: err.message };
    }
  };

  const addProviderTransaction = (t: ProviderTransaction) => {
    setProviderTransactions(prev => [t, ...prev]);

    if (t.status === 'paid') {
      setDashboardMetrics(prev => {
        const newPatientDirect = prev.patientDirect + t.amount;
        const newTotal = prev.totalToday + t.amount;
        return {
          ...prev,
          patientDirect: newPatientDirect,
          formattedPatientDirect: newPatientDirect >= 1000000 
            ? `₦${(newPatientDirect / 1000000).toFixed(2)}M` 
            : `₦${Math.round(newPatientDirect / 1000)}K`,
          totalToday: newTotal,
          formattedTotalToday: newTotal >= 1000000 
            ? `₦${(newTotal / 1000000).toFixed(2)}M` 
            : `₦${Math.round(newTotal / 1000)}K`
        };
      });
    }

    getAuthHeaders().then(headers => {
      fetch('/api/dashboard/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify(t)
      }).catch(() => {});
    });
  };

  const voidProviderTransaction = (id: string) => {
    setProviderTransactions(prev => {
      const txn = prev.find(t => t.id === id);
      if (!txn) return prev;
      if (txn.status === 'paid') {
        setDashboardMetrics(m => {
          const newPatientDirect = Math.max(0, m.patientDirect - txn.amount);
          const newTotal = Math.max(0, m.totalToday - txn.amount);
          return {
            ...m,
            patientDirect: newPatientDirect,
            formattedPatientDirect: newPatientDirect >= 1000000 
              ? `₦${(newPatientDirect / 1000000).toFixed(2)}M` 
              : `₦${Math.round(newPatientDirect / 1000)}K`,
            totalToday: newTotal,
            formattedTotalToday: newTotal >= 1000000 
              ? `₦${(newTotal / 1000000).toFixed(2)}M` 
              : `₦${Math.round(newTotal / 1000)}K`
          };
        });
      }
      return prev.filter(t => t.id !== id);
    });

    getAuthHeaders().then(headers => {
      fetch(`/api/dashboard/transactions/${id}`, {
        method: 'DELETE',
        headers
      }).catch(() => {});
    });

    addNotification('Transaction voided successfully. Ledger entry reversed.', 'info');
  };

  // HMO Actions
  const approveClaim = (id: string) => {
    setHmoClaims(prev => prev.map(c => 
      c.id === id ? { ...c, status: 'approved', statusLabel: 'Approved', denialRisk: 'low' } : c
    ));
    addNotification(`Claim ${id} approved for payment processing.`, 'success');

    getAuthHeaders().then(headers => {
      fetch(`/api/claims/${id}/approve`, {
        method: 'POST',
        headers
      })
      .then(() => refreshDashboard())
      .catch(() => {});
    });
  };

  const rejectClaim = (id: string, reason: string = 'Pre-authorization absent') => {
    setHmoClaims(prev => prev.map(c => 
      c.id === id ? { ...c, status: 'rejected', statusLabel: 'Rejected', isDisputed: false, diagnosis: reason } : c
    ));
    addNotification(`Claim ${id} rejected: ${reason}`, 'error');

    getAuthHeaders().then(headers => {
      fetch(`/api/claims/${id}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason })
      })
      .then(() => refreshDashboard())
      .catch(() => {});
    });
  };

  const resolveClaimDispute = (id: string, resolution: 'approve' | 'reject') => {
    setHmoClaims(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          isDisputed: false,
          status: resolution === 'approve' ? 'approved' : 'rejected',
          statusLabel: resolution === 'approve' ? 'Approved (Dispute Settled)' : 'Rejected Final',
          denialRisk: 'low'
        };
      }
      return c;
    }));
    addNotification(`Dispute for ${id} settled: ${resolution === 'approve' ? 'Claim Approved' : 'Rejection Upheld'}.`, 'info');

    getAuthHeaders().then(headers => {
      fetch(`/api/claims/${id}/resolve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ resolution })
      })
      .then(() => refreshDashboard())
      .catch(() => {});
    });
  };

  // Re-fetches the claims list from the server. Used after an action that
  // changes claim state on the server in a way the optimistic local update
  // functions above don't model themselves (e.g. matching a claim against
  // an HMO remittance, which moves it to 'remitted' or 'adjusted').
  const refreshClaims = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/claims', { headers });
      if (res.ok) {
        const claimData = await res.json();
        if (claimData && Array.isArray(claimData.claims)) {
          setHmoClaims(claimData.claims);
        }
      }
    } catch {
      // Best-effort refresh; the caller's own UI state carries on regardless.
    }
  };

  const appealClaim = (id: string, preAuthCode?: string, notes?: string) => {
    setHmoClaims(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          isDisputed: false,
          status: 'approved',
          statusLabel: 'Approved (Appeal Upheld)',
          denialRisk: 'low',
          denialReason: 'Pre-auth documentation submitted on appeal',
          preAuthCode: preAuthCode || c.preAuthCode
        };
      }
      return c;
    }));
    addNotification(`Clinical appeal submitted for claim ${id}. Pre-auth documentation attached.`, 'success');

    getAuthHeaders().then(headers => {
      fetch(`/api/claims/${id}/appeal`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ preAuthCode, appealNotes: notes })
      })
      .then(() => refreshDashboard())
      .catch(() => {});
    });
  };

  // Computed counts
  const unmatchedCount = reconciliationItems.filter(i => i.status === 'unmatched').length;
  const suggestedCount = reconciliationItems.filter(i => i.status === 'unmatched' && i.aiMatch.isHighConfidence).length;
  const confirmedCount = reconciliationItems.filter(i => i.status === 'confirmed').length;
  const selectedCount = reconciliationItems.filter(i => i.selected && i.status === 'unmatched').length;

  return (
    <WelliPayContext.Provider
      value={{
        activeTab,
        setActiveTab,
        persona,
        setPersona,
        reconciliationItems,
        toggleSelectReconItem,
        selectAllReconItems,
        selectOnlyReconIds,
        confirmReconItem,
        rejectReconItem,
        bulkConfirmSelected,
        filterReconStatus,
        setFilterReconStatus,
        filterChannel,
        setFilterChannel,
        searchQuery,
        setSearchQuery,
        unmatchedCount,
        suggestedCount,
        confirmedCount,
        selectedCount,
        providerTransactions,
        dashboardMetrics,
        leakageSummary,
        unbilledExposureResolved,
        resolveUnbilledExposure,
        refreshDashboard,
        addProviderTransaction,
        voidProviderTransaction,
        hmoClaims,
        approveClaim,
        rejectClaim,
        resolveClaimDispute,
        appealClaim,
        refreshClaims,
        notifications,
        addNotification,
        removeNotification,
      }}
    >
      {children}
    </WelliPayContext.Provider>
  );
};

export const useWelliPay = () => {
  const context = useContext(WelliPayContext);
  if (!context) {
    throw new Error('useWelliPay must be used within a WelliPayProvider');
  }
  return context;
};
