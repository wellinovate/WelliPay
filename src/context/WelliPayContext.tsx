import React, { createContext, useContext, useState } from 'react';
import {
  ReconciliationItem,
  ProviderTransaction,
  HMOClaim,
  PersonaType,
  NavTab
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
  confirmReconItem: (id: string) => void;
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
  unbilledExposureResolved: boolean;
  resolveUnbilledExposure: () => void;
  addProviderTransaction: (t: ProviderTransaction) => void;

  // HMO Claims Data & Operations
  hmoClaims: HMOClaim[];
  approveClaim: (id: string) => void;
  rejectClaim: (id: string, reason?: string) => void;
  resolveClaimDispute: (id: string, resolution: 'approve' | 'reject') => void;

  // Notifications
  notifications: NotificationToast[];
  addNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeNotification: (id: string) => void;
}

const WelliPayContext = createContext<WelliPayContextType | undefined>(undefined);

export const WelliPayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Top priority starts at Reconciliation Queue as specified by user
  const [activeTab, setActiveTab] = useState<NavTab>('reconciliation');
  const [persona, setPersona] = useState<PersonaType>('provider');

  // Reconciliation State
  const [reconciliationItems, setReconciliationItems] = useState<ReconciliationItem[]>(INITIAL_RECONCILIATION_ITEMS);
  const [filterReconStatus, setFilterReconStatus] = useState<'unmatched' | 'suggested' | 'confirmed'>('unmatched');
  const [filterChannel, setFilterChannel] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Provider State
  const [providerTransactions, setProviderTransactions] = useState<ProviderTransaction[]>(INITIAL_PROVIDER_TRANSACTIONS);
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

  const confirmReconItem = (id: string) => {
    const target = reconciliationItems.find(i => i.id === id);
    if (!target) return;

    setReconciliationItems(prev => prev.map(item => 
      item.id === id ? { 
        ...item, 
        status: 'confirmed', 
        selected: false, 
        confirmedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      } : item
    ));

    addNotification(`Matched ${target.formattedAmount} (${target.description}) to ${target.aiMatch.targetName} (${target.aiMatch.invoiceNumber || 'Account'})`, 'success');
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
  };

  // Provider Actions
  const resolveUnbilledExposure = () => {
    setUnbilledExposureResolved(true);
    addNotification('Automated charge-capture generated invoices for 17 unbilled lab procedures (₦340,000 exposure mitigated).', 'success');
  };

  const addProviderTransaction = (t: ProviderTransaction) => {
    setProviderTransactions(prev => [t, ...prev]);
  };

  // HMO Actions
  const approveClaim = (id: string) => {
    setHmoClaims(prev => prev.map(c => 
      c.id === id ? { ...c, status: 'approved', statusLabel: 'Approved', denialRisk: 'low' } : c
    ));
    addNotification(`Claim ${id} approved for payment processing.`, 'success');
  };

  const rejectClaim = (id: string, reason: string = 'Pre-authorization absent') => {
    setHmoClaims(prev => prev.map(c => 
      c.id === id ? { ...c, status: 'rejected', statusLabel: 'Rejected', isDisputed: false, diagnosis: reason } : c
    ));
    addNotification(`Claim ${id} rejected: ${reason}`, 'error');
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
  };

  // Computed counts
  const unmatchedCount = reconciliationItems.filter(i => i.status === 'unmatched').length;
  const suggestedCount = reconciliationItems.filter(i => i.status === 'unmatched' && i.aiMatch.isHighConfidence).length;
  const confirmedCount = 32 + reconciliationItems.filter(i => i.status === 'confirmed').length;
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
        unbilledExposureResolved,
        resolveUnbilledExposure,
        addProviderTransaction,
        hmoClaims,
        approveClaim,
        rejectClaim,
        resolveClaimDispute,
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
