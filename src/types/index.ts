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
  invoiceAmount?: number; // e.g. 25000
  matchReason?: string; // e.g. "Name + exact amount match"
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

export interface Patient {
  id: string;
  mrn: string;
  fullName: string;
  phone: string;
  email?: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  primaryCoverage: string;
  hmoName?: string | null;
  hmoPolicyNumber?: string | null;
  hmoEnrolleeId?: string | null;
  outstandingCopay: number;
  formattedOutstandingCopay: string;
  status: 'active' | 'flagged' | 'archived';
  createdAt: string;
}

export interface PatientDirectoryMetrics {
  totalPatients: number;
  insuredCount: number;
  selfPayCount: number;
  totalOutstandingCopays: number;
  formattedTotalOutstandingCopays: string;
}

export interface PatientDirectoryResponse {
  source: 'postgresql' | 'fallback';
  metrics: PatientDirectoryMetrics;
  patients: Patient[];
}

export interface PatientDossierResponse {
  source: 'postgresql' | 'fallback';
  patient: Patient;
  transactions: ProviderTransaction[];
  claims: HMOClaim[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId?: string;
  patientName: string;
  serviceDescription: string;
  totalAmount: number;
  formattedAmount: string;
  paidAmount: number;
  status: 'paid' | 'pending' | 'partially_paid' | 'cancelled';
  statusLabel: string;
  dueDate?: string;
  createdAt: string;
}

export interface InvoiceMetrics {
  totalInvoices: number;
  totalAmount: number;
  formattedTotalAmount: string;
  reconciledCount: number;
  pendingCount: number;
}

export interface InvoicesResponse {
  source: 'postgresql' | 'fallback';
  metrics: InvoiceMetrics;
  invoices: Invoice[];
}
