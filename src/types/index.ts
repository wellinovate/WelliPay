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
  reference?: string;
  invoiceNumber?: string;
  mrn?: string;
  patientName?: string;
  service?: string;
  recordedBy?: string;
}

export interface HMOClaim {
  id: string;
  provider: string;
  payer?: string;
  amount: number;
  formattedAmount: string;
  status: 'submitted' | 'approved' | 'paid' | 'remitted' | 'adjusted' | 'rejected';
  statusLabel?: string;
  isDisputed: boolean;
  denialRisk: 'high' | 'low' | 'missing-auth';
  denialReason?: string;
  age: string;
  slaDays?: number;
  preAuthCode?: string;
  patientName?: string;
  patientMrn?: string;
  diagnosis?: string;
  planRule?: string;
  // Populated only once a claim has been matched against an HMO remittance
  // (server-side LEFT JOIN on hmo_remittance_lines). expectedAmount is what
  // the claim was for; paidAmount is what the remittance actually paid;
  // varianceAmount is expected minus paid (0 for a clean 'remitted' claim).
  remittanceId?: string;
  expectedAmount?: number;
  paidAmount?: number;
  varianceAmount?: number;
  varianceReason?: string;
}

export type PersonaType = 'provider' | 'hmo';

export type NavTab = 'dashboard' | 'reconciliation' | 'claims' | 'invoices' | 'patients' | 'catalogue' | 'estimation' | 'settings';

export interface CostEstimate {
  price: number;
  turnaroundTime: string;
  hmoAccepted: string[];
  isPublished: boolean;
  serviceName: string;
  department: string;
  serviceCode: string;
}

export interface CostEstimateResponse {
  estimate?: CostEstimate;
  error?: string;
  message?: string;
}

export interface PayerPlanRule {
  id: number;
  payerName: string;
  planName: string;
  copayPercentage: number;
  preauthThreshold: number | null;
  deductible: number;
  coveredCategories: string[] | null;
  excludedServices: string[];
  isActive: boolean;
}

export interface BenefitCheckRequest {
  providerId: string;
  masterServiceId: number;
  payerName: string;
  planName: string;
  patientId?: string;
}

export interface BenefitCheckResult {
  status: 'covered' | 'out_of_network' | 'excluded';
  isCovered: boolean;
  isNetworkAccepted: boolean;
  price: number;
  copayPercentage: number;
  patientCopayAmount: number;
  hmoCoverageAmount: number;
  preAuthRequired: boolean;
  preAuthThreshold: number | null;
  serviceName: string;
  serviceCode: string;
  department: string;
  turnaroundTime: string;
  providerId: string;
  providerName: string;
  payerName: string;
  planName: string;
  patientId: string | null;
  note: string;
}

export interface MasterService {
  id: number;
  providerType: string;
  department: string;
  serviceName: string;
  serviceCode: string;
  description: string;
  specimenType?: string;
  benchmarkTurnaround?: string;
  turnaroundHours?: number;
  referencePrice?: number;
  reference_price?: number;
  service_name?: string;
  service_code?: string;
  benchmark_turnaround?: string;
  specimen_type?: string;
  isActive: boolean;
}

export interface ProviderAccount {
  id: string;
  name: string;
  providerType: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
}

export interface ProviderCatalogueItem {
  id: number;
  providerId: string;
  masterServiceId: number;
  price: number;
  turnaroundTime: string;
  turnaroundHours?: number;
  availability: string;
  hmoAccepted: string[];
  isPublished: boolean;
  effectiveDate?: string;
  lastEditedBy?: string;
  createdAt?: string;
  serviceName: string;
  serviceCode: string;
  department: string;
  description?: string;
  specimenType?: string;
  benchmarkTurnaround?: string;
  providerType?: string;
  providerName?: string;
  providerAccountType?: string;
}

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
  policyVerificationStatus?: 'verified' | 'expired' | 'not_checked' | 'self_pay';
  policyVerificationLabel?: string;
  createdAt: string;
}

export interface PatientDirectoryMetrics {
  totalPatients: number;
  insuredCount: number;
  selfPayCount: number;
  verifiedCount?: number;
  unsettledCount?: number;
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

export interface InvoiceOrder {
  id: string;
  patientName: string;
  patientMrn?: string;
  serviceType: string;
  category?: string;
  amount: number;
  formattedAmount: string;
  status: 'unbilled' | 'invoiced' | 'paid';
  performedAt?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface Invoice {
  id?: string;
  invoice_number: string;
  invoiceNumber?: string;
  patient_id?: string;
  patientId?: string;
  patient_name: string;
  patientName?: string;
  patient_mrn?: string;
  patientMrn?: string;
  service_description: string;
  serviceDescription?: string;
  total_amount: number;
  totalAmount?: number;
  formatted_amount: string;
  formattedAmount?: string;
  paid_amount: number;
  paidAmount?: number;
  status: string;
  status_label: string;
  statusLabel?: string;
  due_date: string;
  dueDate?: string;
  paid_date?: string;
  paidDate?: string;
  created_at: string;
  createdAt?: string;
  is_inpatient?: boolean;
  isInpatient?: boolean;
  discharge_status?: 'awaiting_settlement' | 'cleared' | null;
  dischargeStatus?: 'awaiting_settlement' | 'cleared' | null;
  payer_type?: 'self-pay' | 'hmo' | 'corporate';
  payerType?: 'self-pay' | 'hmo' | 'corporate';
  payer_name?: string;
  payerName?: string;
  policy_number?: string;
  policyNumber?: string;
  copay_amount?: number;
  copayAmount?: number;
  claim_amount?: number;
  claimAmount?: number;
  pre_auth_code?: string;
  preAuthCode?: string;
  line_items?: InvoiceLineItem[];
  lineItems?: InvoiceLineItem[];
  orders?: InvoiceOrder[];
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

export interface FacilitySettings {
  id: string;
  name: string;
  tier: string;
  location: string;
}

export interface MatchingSettings {
  threshold: number; // e.g. 85
  autoConfirm: boolean; // default false
  autoConfirmThreshold: number; // e.g. 98
  fuzzyNameMatching: boolean; // default true
  lastChangedBy: string;
  lastChangedAt: string;
}

export interface PaymentChannelConfig {
  id: string;
  name: string;
  channel: string;
  protocol: string;
  status: 'active' | 'degraded' | 'inactive';
  latencyMs: number;
  dailyVolume: string;
  txnCount: number;
}

export interface SyncStatusConfig {
  ehr: {
    name: string;
    status: 'active' | 'syncing' | 'error';
    protocol: string;
    lastSyncSecondsAgo: number;
    inboundPending: number;
    ordersSyncedToday: number;
  };
  posFleet: {
    name: string;
    status: 'active' | 'degraded';
    terminalsOnline: number;
    terminalsTotal: number;
    lastHeartbeatSecondsAgo: number;
    pollIntervalSeconds: number;
  };
  clearinghouse: {
    name: string;
    status: 'active' | 'idle';
    lastBatch: string;
    claimsInFlight: number;
  };
}

export interface LedgerIntegrityStatus {
  totalDebits: number;
  formattedTotalDebits: string;
  totalCredits: number;
  formattedTotalCredits: string;
  variance: number;
  formattedVariance: string;
  isBalanced: boolean;
  verifiedAt: string;
  lastReconciliationRun: string;
  engine: string;
  isolationLevel: string;
  rowLevelLocking: boolean;
}

export interface SystemSettingsResponse {
  facility: FacilitySettings;
  matching: MatchingSettings;
  channels: PaymentChannelConfig[];
  sync: SyncStatusConfig;
  integrity: LedgerIntegrityStatus;
}
