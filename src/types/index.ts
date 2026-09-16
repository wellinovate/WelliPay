export type StatusType = 
  | 'paid' 
  | 'pending' 
  | 'failed' 
  | 'submitted' 
  | 'approved' 
  | 'rejected' 
  | 'disputed' 
  | 'missing-auth' 
  | 'high-confidence' 
  | 'low-confidence';

export type PaymentChannel = 'Bank transfer' | 'POS card' | 'USSD' | 'HMO' | 'Card' | 'Transfer';

export interface AIMatchSuggestion {
  confidence: number; // e.g. 94, 88, 97, or 35
  isHighConfidence: boolean;
  targetName: string; // e.g. "J. Umar"
  invoiceNumber?: string; // e.g. "INV-92831"
  explanation?: string;
}

export interface ReconciliationItem {
  id: string;
  date: string;
  amount: number;
  formattedAmount: string;
  channel: 'Bank transfer' | 'POS card' | 'USSD';
  description: string;
  rawDetails: string;
  status: 'unmatched' | 'suggested' | 'confirmed';
  selected?: boolean;
  aiMatch: AIMatchSuggestion;
  confirmedAt?: string;
  rejectedReason?: string;
}

export interface ProviderTransaction {
  id: string;
  time: string;
  patientOrService: string;
  amount: number;
  formattedAmount: string;
  channel: PaymentChannel;
  status: 'paid' | 'pending' | 'failed';
}

export interface HMOClaim {
  id: string;
  provider: string;
  amount: number;
  formattedAmount: string;
  status: 'submitted' | 'approved' | 'paid' | 'rejected';
  statusLabel?: string;
  isDisputed: boolean;
  denialRisk: 'high' | 'low' | 'missing-auth';
  age: string;
  preAuthCode?: string;
  patientName?: string;
  diagnosis?: string;
}

export type PersonaType = 'provider' | 'hmo';

export type NavTab = 'dashboard' | 'reconciliation' | 'claims' | 'invoices' | 'patients' | 'settings';

export interface DashboardMetrics {
  totalToday: number;
  formattedTotalToday: string;
  totalTodayTrend: string;
  patientDirect: number;
  formattedPatientDirect: string;
  hmoReceivables: number;
  formattedHmoReceivables: string;
  pendingClaimsCount: number;
  corporateRetainers: number;
  formattedCorporateRetainers: string;
  corporateCount: number;
}

export interface LeakageBreakdownItem {
  name: string;
  orderCount: number;
  amount: number;
  formattedAmount: string;
}

export interface RevenueLeakageSummary {
  unbilledCount: number;
  totalExposure: number;
  formattedTotalExposure: string;
  isResolved: boolean;
  breakdown: LeakageBreakdownItem[];
}

export interface DashboardResponse {
  source: 'postgresql' | 'fallback';
  metrics: DashboardMetrics;
  leakage: RevenueLeakageSummary;
  transactions: ProviderTransaction[];
}
