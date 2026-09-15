import { ReconciliationItem, ProviderTransaction, HMOClaim } from '../types';

export const INITIAL_RECONCILIATION_ITEMS: ReconciliationItem[] = [
  {
    id: 'REC-001',
    date: 'Sep 12',
    amount: 25000,
    formattedAmount: '₦25,000',
    channel: 'Bank transfer',
    description: 'Bank transfer',
    rawDetails: '"JOHN U."',
    status: 'unmatched',
    selected: false,
    aiMatch: {
      confidence: 94,
      isHighConfidence: true,
      targetName: 'J. Umar',
      invoiceNumber: 'INV-92831',
      explanation: 'Name match 98% with patient registry + exact amount match on pending cardiology bill.'
    }
  },
  {
    id: 'REC-002',
    date: 'Sep 12',
    amount: 8500,
    formattedAmount: '₦8,500',
    channel: 'POS card',
    description: 'POS card',
    rawDetails: 'txn 44231',
    status: 'unmatched',
    selected: true,
    aiMatch: {
      confidence: 88,
      isHighConfidence: true,
      targetName: 'M. Bello',
      invoiceNumber: 'INV-93010',
      explanation: 'Terminal ID 02 matched Pharmacy counter at 10:05 + outpatient prescription total.'
    }
  },
  {
    id: 'REC-003',
    date: 'Sep 13',
    amount: 12000,
    formattedAmount: '₦12,000',
    channel: 'Bank transfer',
    description: 'Bank transfer',
    rawDetails: '"ABC DIAG"',
    status: 'unmatched',
    selected: true,
    aiMatch: {
      confidence: 97,
      isHighConfidence: true,
      targetName: 'ABC Diagnostics',
      invoiceNumber: 'INV-93044',
      explanation: 'Vendor corporate code matched partner referral reconciliation ledger.'
    }
  },
  {
    id: 'REC-004',
    date: 'Sep 13',
    amount: 3200,
    formattedAmount: '₦3,200',
    channel: 'USSD',
    description: 'USSD payment',
    rawDetails: 'ref *737*...',
    status: 'unmatched',
    selected: false,
    aiMatch: {
      confidence: 34,
      isHighConfidence: false,
      targetName: 'Unassigned patient',
      explanation: 'Session phone number unlisted in hospital EMR. Requires cashier manual lookup.'
    }
  },
  {
    id: 'REC-005',
    date: 'Sep 13',
    amount: 15000,
    formattedAmount: '₦15,000',
    channel: 'Bank transfer',
    description: 'Bank transfer',
    rawDetails: '"EMMANUEL O."',
    status: 'unmatched',
    selected: false,
    aiMatch: {
      confidence: 91,
      isHighConfidence: true,
      targetName: 'E. Okafor',
      invoiceNumber: 'INV-93050',
      explanation: 'Reference string and deposit slip time matched triage intake.'
    }
  },
  {
    id: 'REC-006',
    date: 'Sep 14',
    amount: 4500,
    formattedAmount: '₦4,500',
    channel: 'USSD',
    description: 'USSD payment',
    rawDetails: 'ref *894*...',
    status: 'unmatched',
    selected: false,
    aiMatch: {
      confidence: 86,
      isHighConfidence: true,
      targetName: 'S. Ibrahim',
      invoiceNumber: 'INV-93062',
      explanation: 'Phone number matched patient mobile for antenatal clinic visit.'
    }
  },
  {
    id: 'REC-007',
    date: 'Sep 14',
    amount: 65000,
    formattedAmount: '₦65,000',
    channel: 'Bank transfer',
    description: 'HMO remittance',
    rawDetails: '"RELIANCE COPAY"',
    status: 'unmatched',
    selected: false,
    aiMatch: {
      confidence: 95,
      isHighConfidence: true,
      targetName: 'Reliance HMO',
      invoiceNumber: 'BATCH-892',
      explanation: 'Monthly remittance schedule matched electronic claims batch.'
    }
  },
  {
    id: 'REC-008',
    date: 'Sep 14',
    amount: 18000,
    formattedAmount: '₦18,000',
    channel: 'POS card',
    description: 'POS card',
    rawDetails: 'txn 44289',
    status: 'unmatched',
    selected: false,
    aiMatch: {
      confidence: 92,
      isHighConfidence: true,
      targetName: 'C. Nwosu',
      invoiceNumber: 'INV-93077',
      explanation: 'Cashier desk 1 terminal transaction matched surgical consult copay.'
    }
  },
  {
    id: 'REC-009',
    date: 'Sep 14',
    amount: 2500,
    formattedAmount: '₦2,500',
    channel: 'USSD',
    description: 'USSD payment',
    rawDetails: 'ref *966*...',
    status: 'unmatched',
    selected: false,
    aiMatch: {
      confidence: 42,
      isHighConfidence: false,
      targetName: 'Multiple candidates (2)',
      explanation: 'Two active invoices found with ₦2,500 balance at OPD registration.'
    }
  },
  {
    id: 'REC-010',
    date: 'Sep 15',
    amount: 35000,
    formattedAmount: '₦35,000',
    channel: 'Bank transfer',
    description: 'Direct transfer',
    rawDetails: '"ZENITH DEPOSIT"',
    status: 'unmatched',
    selected: false,
    aiMatch: {
      confidence: 89,
      isHighConfidence: true,
      targetName: 'K. Danjuma',
      invoiceNumber: 'INV-93090',
      explanation: 'Admission deposit receipt matched Room 304 admission slip.'
    }
  },
  {
    id: 'REC-011',
    date: 'Sep 15',
    amount: 7200,
    formattedAmount: '₦7,200',
    channel: 'POS card',
    description: 'POS card',
    rawDetails: 'txn 44312',
    status: 'unmatched',
    selected: false,
    aiMatch: {
      confidence: 93,
      isHighConfidence: true,
      targetName: 'P. Adeleke',
      invoiceNumber: 'INV-93101',
      explanation: 'Laboratory desk payment matched urgent blood panel order.'
    }
  },
  {
    id: 'REC-012',
    date: 'Sep 15',
    amount: 11500,
    formattedAmount: '₦11,500',
    channel: 'Bank transfer',
    description: 'Bank transfer',
    rawDetails: '"T. ADEYEMI"',
    status: 'unmatched',
    selected: false,
    aiMatch: {
      confidence: 96,
      isHighConfidence: true,
      targetName: 'T. Adeyemi',
      invoiceNumber: 'INV-93105',
      explanation: 'Direct name match with pediatric ward invoice.'
    }
  },
  {
    id: 'REC-013',
    date: 'Sep 15',
    amount: 1800,
    formattedAmount: '₦1,800',
    channel: 'USSD',
    description: 'USSD payment',
    rawDetails: 'ref *737*992',
    status: 'unmatched',
    selected: false,
    aiMatch: {
      confidence: 38,
      isHighConfidence: false,
      targetName: 'Unknown caller',
      explanation: 'Unregistered sender telephone. Needs cashier manual reconciliation.'
    }
  },
  {
    id: 'REC-014',
    date: 'Sep 15',
    amount: 9400,
    formattedAmount: '₦9,400',
    channel: 'POS card',
    description: 'POS card',
    rawDetails: 'txn 44320',
    status: 'unmatched',
    selected: false,
    aiMatch: {
      confidence: 87,
      isHighConfidence: true,
      targetName: 'O. Martins',
      invoiceNumber: 'INV-93114',
      explanation: 'Radiology desk checkout matched X-Ray chest invoice.'
    }
  },
  // Confirmed items already processed
  {
    id: 'REC-050',
    date: 'Sep 10',
    amount: 45000,
    formattedAmount: '₦45,000',
    channel: 'Bank transfer',
    description: 'Bank transfer',
    rawDetails: '"A. BALOGUN"',
    status: 'confirmed',
    selected: false,
    confirmedAt: '2026-09-10 14:30',
    aiMatch: {
      confidence: 98,
      isHighConfidence: true,
      targetName: 'A. Balogun',
      invoiceNumber: 'INV-92710',
      explanation: 'Automated match confirmed into ledger.'
    }
  },
  {
    id: 'REC-051',
    date: 'Sep 11',
    amount: 22000,
    formattedAmount: '₦22,000',
    channel: 'POS card',
    description: 'POS card',
    rawDetails: 'txn 44102',
    status: 'confirmed',
    selected: false,
    confirmedAt: '2026-09-11 11:15',
    aiMatch: {
      confidence: 95,
      isHighConfidence: true,
      targetName: 'H. Danladi',
      invoiceNumber: 'INV-92755',
      explanation: 'Batch reconciled.'
    }
  }
];

export const INITIAL_PROVIDER_TRANSACTIONS: ProviderTransaction[] = [
  {
    id: 'TXN-101',
    time: '09:14',
    patientOrService: 'J. Adeyemi — Consultation',
    amount: 2000,
    formattedAmount: '₦2,000',
    channel: 'USSD',
    status: 'paid'
  },
  {
    id: 'TXN-102',
    time: '09:22',
    patientOrService: 'ABC Diagnostics — Lab claim',
    amount: 12000,
    formattedAmount: '₦12,000',
    channel: 'HMO',
    status: 'pending'
  },
  {
    id: 'TXN-103',
    time: '09:40',
    patientOrService: 'F. Okon — Deposit',
    amount: 50000,
    formattedAmount: '₦50,000',
    channel: 'Transfer',
    status: 'paid'
  },
  {
    id: 'TXN-104',
    time: '10:05',
    patientOrService: 'M. Bello — Pharmacy',
    amount: 8500,
    formattedAmount: '₦8,500',
    channel: 'Card',
    status: 'failed'
  },
  {
    id: 'TXN-105',
    time: '10:21',
    patientOrService: 'T. Yusuf — Ultrasound',
    amount: 8000,
    formattedAmount: '₦8,000',
    channel: 'Bank transfer',
    status: 'paid'
  }
];

export const INITIAL_HMO_CLAIMS: HMOClaim[] = [
  {
    id: 'CLM-4471',
    provider: 'ABC Diagnostics',
    amount: 12000,
    formattedAmount: '₦12,000',
    status: 'submitted',
    statusLabel: 'Submitted',
    isDisputed: false,
    denialRisk: 'high',
    age: '2d',
    patientName: 'Kemi Adeleke',
    diagnosis: 'Routine lipid profile & HbA1c screening'
  },
  {
    id: 'CLM-4472',
    provider: 'Lagoon Hospital',
    amount: 45000,
    formattedAmount: '₦45,000',
    status: 'approved',
    statusLabel: 'Approved',
    isDisputed: false,
    denialRisk: 'low',
    age: '5d',
    preAuthCode: 'PA-LAG-88219',
    patientName: 'Emeka Okonkwo',
    diagnosis: 'Emergency appendectomy pre-auth'
  },
  {
    id: 'CLM-4473',
    provider: 'Sunrise Clinic',
    amount: 8200,
    formattedAmount: '₦8,200',
    status: 'rejected',
    statusLabel: 'Rejected — disputed',
    isDisputed: true,
    denialRisk: 'missing-auth',
    age: '9d',
    patientName: 'Halima Bello',
    diagnosis: 'Pelvic ultrasound without pre-authorization code'
  },
  {
    id: 'CLM-4474',
    provider: 'ABC Diagnostics',
    amount: 21500,
    formattedAmount: '₦21,500',
    status: 'paid',
    statusLabel: 'Paid',
    isDisputed: false,
    denialRisk: 'low',
    age: '14d',
    patientName: 'Babatunde Fashola',
    diagnosis: 'Comprehensive metabolic panel'
  },
  {
    id: 'CLM-4475',
    provider: 'First Care Hospital',
    amount: 68000,
    formattedAmount: '₦68,000',
    status: 'submitted',
    statusLabel: 'Submitted',
    isDisputed: false,
    denialRisk: 'high',
    age: '1d',
    patientName: 'Amina Yusuf',
    diagnosis: 'Inpatient observation & IV antibiotics'
  },
  {
    id: 'CLM-4476',
    provider: 'Lagoon Specialist Hospital',
    amount: 115000,
    formattedAmount: '₦115,000',
    status: 'approved',
    statusLabel: 'Approved',
    isDisputed: false,
    denialRisk: 'low',
    age: '3d',
    preAuthCode: 'PA-LAG-90114',
    patientName: 'Chidi Amadi',
    diagnosis: 'Elective laparoscopic cholecystectomy'
  }
];
