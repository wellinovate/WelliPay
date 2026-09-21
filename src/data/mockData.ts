import { ReconciliationItem, ProviderTransaction, HMOClaim } from '../types';

export const INITIAL_RECONCILIATION_ITEMS: ReconciliationItem[] = [
  {
    id: 'REC-001',
    date: 'Sep 12',
    amount: 25000,
    formattedAmount: '₦25,000',
    channel: 'Bank transfer',
    description: 'Payment from J. Umar',
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
    description: 'POS Terminal #4 — Receipt 8821',
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
    description: 'Partner referral reconciliation',
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
    description: 'Quickteller USSD Collection',
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
    description: 'Inpatient triage admission deposit',
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
    description: 'Antenatal clinic booking fee',
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
    description: 'HMO remittance schedule',
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
    description: 'Surgical consult copay',
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
    description: 'OPD registration payment',
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
    description: 'Admission deposit — Room 304',
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
    description: 'Urgent blood panel order',
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
    description: 'Pediatric ward inpatient payment',
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
  // Confirmed items (33 items reconciling to the Confirmed (33) tab and CSV export)
  {
    id: 'REC-050',
    date: 'Today, 14:30',
    amount: 45000,
    formattedAmount: '₦45,000',
    channel: 'Bank transfer',
    description: 'Direct corporate retainer settlement',
    rawDetails: '"A. BALOGUN"',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Today, 14:30',
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
    date: 'Today, 11:15',
    amount: 22000,
    formattedAmount: '₦22,000',
    channel: 'POS card',
    description: 'Card payment at pharmacy counter',
    rawDetails: 'txn 44102',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Today, 11:15',
    aiMatch: {
      confidence: 95,
      isHighConfidence: true,
      targetName: 'H. Danladi',
      invoiceNumber: 'INV-92755',
      explanation: 'Batch reconciled.'
    }
  },
  {
    id: 'REC-052',
    date: 'Today, 09:42',
    amount: 8500,
    formattedAmount: '₦8,500',
    channel: 'POS card',
    description: 'POS Terminal #4 — Receipt 8821',
    rawDetails: 'POS/STANBIC/4491',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Today, 09:45',
    aiMatch: {
      confidence: 92,
      isHighConfidence: true,
      targetName: 'M. Bello',
      invoiceNumber: 'INV-93010',
      explanation: 'Terminal timestamp matched outpatient prescription.'
    }
  },
  {
    id: 'REC-053',
    date: 'Yesterday, 16:15',
    amount: 3200,
    formattedAmount: '₦3,200',
    channel: 'POS card',
    description: 'Emergency triage admission',
    rawDetails: 'POS/ZENITH/1102',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Yesterday, 16:20',
    aiMatch: {
      confidence: 94,
      isHighConfidence: true,
      targetName: 'E. Obi',
      invoiceNumber: 'INV-92715',
      explanation: 'Cashier confirmed triage admission copay.'
    }
  },
  {
    id: 'REC-054',
    date: 'Yesterday, 14:30',
    amount: 18500,
    formattedAmount: '₦18,500',
    channel: 'Bank transfer',
    description: 'Post-op physiotherapy session fee',
    rawDetails: 'GTB/NIP/99210041',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Yesterday, 14:35',
    aiMatch: {
      confidence: 96,
      isHighConfidence: true,
      targetName: 'K. Adeleke',
      invoiceNumber: 'INV-92680',
      explanation: 'Reference matched physical therapy session invoice.'
    }
  },
  {
    id: 'REC-055',
    date: 'Yesterday, 11:20',
    amount: 80000,
    formattedAmount: '₦80,000',
    channel: 'Bank transfer',
    description: 'AXA Mansard HMO surgery copay',
    rawDetails: 'FBN/NIP/2209114',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Yesterday, 11:25',
    aiMatch: {
      confidence: 99,
      isHighConfidence: true,
      targetName: 'B. Fashola',
      invoiceNumber: 'INV-92650',
      explanation: 'Approved surgical authorization code linked to claim.'
    }
  },
  {
    id: 'REC-056',
    date: 'Yesterday, 09:10',
    amount: 12000,
    formattedAmount: '₦12,000',
    channel: 'USSD',
    description: 'Quickteller USSD Collection',
    rawDetails: 'ref *737*891',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Yesterday, 09:15',
    aiMatch: {
      confidence: 97,
      isHighConfidence: true,
      targetName: 'ABC Diagnostics',
      invoiceNumber: 'INV-93044',
      explanation: 'Electronic lab request identifier reconciled.'
    }
  },
  {
    id: 'REC-057',
    date: 'Sep 15, 16:40',
    amount: 35000,
    formattedAmount: '₦35,000',
    channel: 'Bank transfer',
    description: 'Admission deposit — Room 304',
    rawDetails: 'ZENITH/NIP/5512',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 15, 16:45',
    aiMatch: {
      confidence: 93,
      isHighConfidence: true,
      targetName: 'K. Danjuma',
      invoiceNumber: 'INV-93090',
      explanation: 'Matched private ward admission deposit.'
    }
  },
  {
    id: 'REC-058',
    date: 'Sep 15, 15:00',
    amount: 9400,
    formattedAmount: '₦9,400',
    channel: 'POS card',
    description: 'Radiology chest X-ray fee',
    rawDetails: 'txn 44320',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 15, 15:05',
    aiMatch: {
      confidence: 95,
      isHighConfidence: true,
      targetName: 'O. Martins',
      invoiceNumber: 'INV-93114',
      explanation: 'Radiology desk checkout matched X-Ray chest invoice.'
    }
  },
  {
    id: 'REC-059',
    date: 'Sep 15, 11:20',
    amount: 65000,
    formattedAmount: '₦65,000',
    channel: 'Bank transfer',
    description: 'HMO remittance schedule',
    rawDetails: 'RELIANCE COPAY',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 15, 11:30',
    aiMatch: {
      confidence: 98,
      isHighConfidence: true,
      targetName: 'Reliance HMO',
      invoiceNumber: 'BATCH-892',
      explanation: 'Monthly remittance schedule matched electronic claims batch.'
    }
  },
  {
    id: 'REC-060',
    date: 'Sep 15, 08:30',
    amount: 28000,
    formattedAmount: '₦28,000',
    channel: 'POS card',
    description: 'Electrolytes, Urea & Creatinine panel',
    rawDetails: 'POS/ACCESS/8812',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 15, 08:35',
    aiMatch: {
      confidence: 96,
      isHighConfidence: true,
      targetName: 'T. Adeyemi',
      invoiceNumber: 'INV-92801',
      explanation: 'Lab pathology request matched POS slip.'
    }
  },
  {
    id: 'REC-061',
    date: 'Sep 14, 17:15',
    amount: 15000,
    formattedAmount: '₦15,000',
    channel: 'POS card',
    description: 'Laboratory desk blood panel',
    rawDetails: 'txn 44312',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 14, 17:20',
    aiMatch: {
      confidence: 94,
      isHighConfidence: true,
      targetName: 'P. Adeleke',
      invoiceNumber: 'INV-93101',
      explanation: 'Laboratory desk payment matched blood panel order.'
    }
  },
  {
    id: 'REC-062',
    date: 'Sep 14, 15:30',
    amount: 4500,
    formattedAmount: '₦4,500',
    channel: 'USSD',
    description: 'Antenatal clinic package deposit',
    rawDetails: 'ref *894*773',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 14, 15:35',
    aiMatch: {
      confidence: 91,
      isHighConfidence: true,
      targetName: 'S. Ibrahim',
      invoiceNumber: 'INV-93062',
      explanation: 'Phone number matched patient mobile for antenatal visit.'
    }
  },
  {
    id: 'REC-063',
    date: 'Sep 14, 12:45',
    amount: 18000,
    formattedAmount: '₦18,000',
    channel: 'POS card',
    description: 'Surgical consult copay',
    rawDetails: 'txn 44289',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 14, 12:50',
    aiMatch: {
      confidence: 95,
      isHighConfidence: true,
      targetName: 'C. Nwosu',
      invoiceNumber: 'INV-93077',
      explanation: 'Terminal receipt matched surgical consult copay.'
    }
  },
  {
    id: 'REC-064',
    date: 'Sep 14, 10:10',
    amount: 25000,
    formattedAmount: '₦25,000',
    channel: 'Bank transfer',
    description: 'Cardiology ECG diagnostic session',
    rawDetails: 'UBA/NIP/881290',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 14, 10:15',
    aiMatch: {
      confidence: 97,
      isHighConfidence: true,
      targetName: 'J. Umar',
      invoiceNumber: 'INV-92831',
      explanation: 'Cardiology specialist bill verified and matched.'
    }
  },
  {
    id: 'REC-065',
    date: 'Sep 13, 16:20',
    amount: 32000,
    formattedAmount: '₦32,000',
    channel: 'POS card',
    description: 'Pediatric outpatient copay',
    rawDetails: 'POS/ZENITH/1102',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 13, 16:25',
    aiMatch: {
      confidence: 93,
      isHighConfidence: true,
      targetName: 'Amina Bello',
      invoiceNumber: 'INV-92850',
      explanation: 'Pediatric outpatient ledger matched.'
    }
  },
  {
    id: 'REC-066',
    date: 'Sep 13, 14:05',
    amount: 14000,
    formattedAmount: '₦14,000',
    channel: 'Bank transfer',
    description: 'Full Blood Count laboratory panel',
    rawDetails: 'LAB/FBC/2026/08',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 13, 14:10',
    aiMatch: {
      confidence: 99,
      isHighConfidence: true,
      targetName: 'Patient FBC-01',
      invoiceNumber: 'INV-92862',
      explanation: 'Lab accession code linked directly to billed order.'
    }
  },
  {
    id: 'REC-067',
    date: 'Sep 13, 11:30',
    amount: 50000,
    formattedAmount: '₦50,000',
    channel: 'Bank transfer',
    description: 'Executive health checkup deposit',
    rawDetails: 'FBN/NIP/770114',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 13, 11:35',
    aiMatch: {
      confidence: 98,
      isHighConfidence: true,
      targetName: 'Chinedu Eze',
      invoiceNumber: 'INV-92875',
      explanation: 'Executive package invoice matched electronic wire.'
    }
  },
  {
    id: 'REC-068',
    date: 'Sep 13, 09:15',
    amount: 7500,
    formattedAmount: '₦7,500',
    channel: 'POS card',
    description: 'Ophthalmology cataract consultation',
    rawDetails: 'txn 44405',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 13, 09:20',
    aiMatch: {
      confidence: 92,
      isHighConfidence: true,
      targetName: 'Funmilayo Adebayo',
      invoiceNumber: 'INV-92890',
      explanation: 'Eye clinic consultation fee cleared at cashier desk.'
    }
  },
  {
    id: 'REC-069',
    date: 'Sep 12, 16:50',
    amount: 11500,
    formattedAmount: '₦11,500',
    channel: 'Bank transfer',
    description: 'Inpatient admission deposit',
    rawDetails: 'GTB/NIP/109283',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 12, 16:55',
    aiMatch: {
      confidence: 96,
      isHighConfidence: true,
      targetName: 'T. Adeyemi',
      invoiceNumber: 'INV-93105',
      explanation: 'Pediatric ward bed admission payment confirmed.'
    }
  },
  {
    id: 'REC-070',
    date: 'Sep 12, 15:10',
    amount: 38000,
    formattedAmount: '₦38,000',
    channel: 'POS card',
    description: 'Orthopedic fracture cast & clinic fee',
    rawDetails: 'POS/GTB/9011',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 12, 15:15',
    aiMatch: {
      confidence: 94,
      isHighConfidence: true,
      targetName: 'Sunday Okafor',
      invoiceNumber: 'INV-92910',
      explanation: 'Orthopedic clinic cast application receipt matched.'
    }
  },
  {
    id: 'REC-071',
    date: 'Sep 12, 13:25',
    amount: 9500,
    formattedAmount: '₦9,500',
    channel: 'POS card',
    description: 'Dental prophylaxis & restoration',
    rawDetails: 'txn 44498',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 12, 13:30',
    aiMatch: {
      confidence: 93,
      isHighConfidence: true,
      targetName: 'Zainab Aliyu',
      invoiceNumber: 'INV-92925',
      explanation: 'Dental clinic procedural checkout verified.'
    }
  },
  {
    id: 'REC-072',
    date: 'Sep 12, 10:40',
    amount: 24000,
    formattedAmount: '₦24,000',
    channel: 'USSD',
    description: 'Ultrasound obstetrics scan',
    rawDetails: 'ref *737*881',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 12, 10:45',
    aiMatch: {
      confidence: 95,
      isHighConfidence: true,
      targetName: 'Kelechi Anyanwu',
      invoiceNumber: 'INV-92940',
      explanation: 'Obstetric scan appointment payment matched.'
    }
  },
  {
    id: 'REC-073',
    date: 'Sep 11, 16:30',
    amount: 16500,
    formattedAmount: '₦16,500',
    channel: 'Bank transfer',
    description: 'Dialysis consumable copay',
    rawDetails: 'ACCESS/NIP/4421',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 11, 16:35',
    aiMatch: {
      confidence: 97,
      isHighConfidence: true,
      targetName: 'Grace Effiong',
      invoiceNumber: 'INV-92955',
      explanation: 'Renal unit session consumable receipt verified.'
    }
  },
  {
    id: 'REC-074',
    date: 'Sep 11, 14:15',
    amount: 42000,
    formattedAmount: '₦42,000',
    channel: 'POS card',
    description: 'Neurology consultation copay',
    rawDetails: 'POS/UBA/3321',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 11, 14:20',
    aiMatch: {
      confidence: 94,
      isHighConfidence: true,
      targetName: 'Musa Abubakar',
      invoiceNumber: 'INV-92970',
      explanation: 'EEG report and neurology consultation copay reconciled.'
    }
  },
  {
    id: 'REC-075',
    date: 'Sep 11, 11:00',
    amount: 6800,
    formattedAmount: '₦6,800',
    channel: 'POS card',
    description: 'Endoscopy pre-procedure deposit',
    rawDetails: 'txn 44521',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 11, 11:05',
    aiMatch: {
      confidence: 91,
      isHighConfidence: true,
      targetName: 'Blessing Uche',
      invoiceNumber: 'INV-92985',
      explanation: 'Gastroenterology clinic prep deposit matched.'
    }
  },
  {
    id: 'REC-076',
    date: 'Sep 11, 09:20',
    amount: 29000,
    formattedAmount: '₦29,000',
    channel: 'USSD',
    description: 'ENT audiometry examination',
    rawDetails: 'ref *966*331',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 11, 09:25',
    aiMatch: {
      confidence: 96,
      isHighConfidence: true,
      targetName: 'Segun Ogundipe',
      invoiceNumber: 'INV-93000',
      explanation: 'Hearing assessment test matched USSD reference.'
    }
  },
  {
    id: 'REC-077',
    date: 'Sep 10, 16:10',
    amount: 13500,
    formattedAmount: '₦13,500',
    channel: 'Bank transfer',
    description: 'Dermatology clinic procedure fee',
    rawDetails: 'ZENITH/NIP/9912',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 10, 16:15',
    aiMatch: {
      confidence: 95,
      isHighConfidence: true,
      targetName: 'Aisha Garba',
      invoiceNumber: 'INV-93015',
      explanation: 'Minor dermatological biopsy copay reconciled.'
    }
  },
  {
    id: 'REC-078',
    date: 'Sep 10, 14:30',
    amount: 55000,
    formattedAmount: '₦55,000',
    channel: 'Bank transfer',
    description: 'Oncology chemotherapy daycare fee',
    rawDetails: 'FBN/NIP/330911',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 10, 14:35',
    aiMatch: {
      confidence: 98,
      isHighConfidence: true,
      targetName: 'Chukwuemeka Nnaji',
      invoiceNumber: 'INV-93030',
      explanation: 'Daycare infusion infusion center invoice matched.'
    }
  },
  {
    id: 'REC-079',
    date: 'Sep 10, 12:15',
    amount: 8200,
    formattedAmount: '₦8,200',
    channel: 'POS card',
    description: 'Wound dressing & surgical nursing',
    rawDetails: 'POS/STANBIC/5501',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 10, 12:20',
    aiMatch: {
      confidence: 93,
      isHighConfidence: true,
      targetName: 'Bisi Ogunleye',
      invoiceNumber: 'INV-93045',
      explanation: 'Outpatient surgical dressing consumables paid.'
    }
  },
  {
    id: 'REC-080',
    date: 'Sep 10, 10:00',
    amount: 31000,
    formattedAmount: '₦31,000',
    channel: 'POS card',
    description: 'Pulmonology spirometry consultation',
    rawDetails: 'txn 44588',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 10, 10:05',
    aiMatch: {
      confidence: 94,
      isHighConfidence: true,
      targetName: 'David Etim',
      invoiceNumber: 'INV-93060',
      explanation: 'Respiratory diagnostic lab fee verified.'
    }
  },
  {
    id: 'REC-081',
    date: 'Sep 09, 15:20',
    amount: 17500,
    formattedAmount: '₦17,500',
    channel: 'USSD',
    description: 'Dietetics & nutrition package',
    rawDetails: 'ref *966*442',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 09, 15:25',
    aiMatch: {
      confidence: 92,
      isHighConfidence: true,
      targetName: 'Rukayat Bello',
      invoiceNumber: 'INV-93075',
      explanation: 'Dietary counseling session confirmed.'
    }
  },
  {
    id: 'REC-082',
    date: 'Sep 09, 11:45',
    amount: 48000,
    formattedAmount: '₦48,000',
    channel: 'Bank transfer',
    description: 'ICU stepdown observation fee',
    rawDetails: 'GTB/NIP/771029',
    status: 'confirmed',
    selected: false,
    confirmedAt: 'Sep 09, 11:50',
    aiMatch: {
      confidence: 99,
      isHighConfidence: true,
      targetName: 'Obinna Chukwu',
      invoiceNumber: 'INV-93095',
      explanation: 'Stepdown monitoring deposit matched wire receipt.'
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
    provider: 'Lagoon Specialist Hospital',
    payer: 'Reliance HMO',
    amount: 12000,
    formattedAmount: '₦12,000',
    status: 'submitted',
    statusLabel: 'Submitted',
    isDisputed: false,
    denialRisk: 'high',
    denialReason: 'Tariff verification pending with payer',
    planRule: 'Reliance HMO Standard Plan · Routine outpatient tariff',
    age: '2d',
    patientName: 'Kemi Adeleke',
    patientMrn: 'MRN-LSH-10401',
    diagnosis: 'Routine lipid profile & HbA1c screening'
  },
  {
    id: 'CLM-4472',
    provider: 'Lagoon Specialist Hospital',
    payer: 'Reliance HMO',
    amount: 30087,
    formattedAmount: '₦30,087',
    status: 'submitted',
    statusLabel: 'Flagged for Review',
    isDisputed: true,
    denialRisk: 'missing-auth',
    denialReason: 'Missing pre-authorisation code',
    planRule: 'Reliance HMO Silver Plan · Pre-authorisation mandatory for all inpatient/surgical care regardless of amount, and all procedures exceeding ₦100,000 (POL-SILVER-V3)',
    age: '18d',
    slaDays: 14,
    patientName: 'Emeka Okonkwo',
    patientMrn: 'MRN-LSH-10402',
    diagnosis: 'Appendectomy emergency intervention'
  },
  {
    id: 'CLM-4473',
    provider: 'Lagoon Specialist Hospital',
    payer: 'AXA Mansard',
    amount: 8200,
    formattedAmount: '₦8,200',
    status: 'submitted',
    statusLabel: 'Submitted',
    isDisputed: false,
    denialRisk: 'low',
    denialReason: 'Under routine clinical review',
    planRule: 'AXA Mansard Standard Benefit Plan',
    age: '5d',
    patientName: 'Halima Bello',
    patientMrn: 'MRN-LSH-10403',
    diagnosis: 'Pelvic ultrasound without pre-authorisation code'
  },
  {
    id: 'CLM-4474',
    provider: 'Lagoon Specialist Hospital',
    payer: 'Hygeia HMO',
    amount: 21500,
    formattedAmount: '₦21,500',
    status: 'paid',
    statusLabel: 'Paid Remittance',
    isDisputed: false,
    denialRisk: 'low',
    denialReason: 'Settled against remittance advice',
    planRule: 'Hygeia HMO Remittance Schedule Settled',
    age: '14d',
    slaDays: 14,
    patientName: 'Babatunde Fashola',
    patientMrn: 'MRN-LSH-10404',
    diagnosis: 'Comprehensive metabolic panel'
  },
  {
    id: 'CLM-4475',
    provider: 'Lagoon Specialist Hospital',
    payer: 'Leadway Health',
    amount: 68000,
    formattedAmount: '₦68,000',
    status: 'submitted',
    statusLabel: 'Submitted',
    isDisputed: false,
    denialRisk: 'high',
    denialReason: 'Tariff verification pending with payer',
    planRule: 'Leadway Health Platinum Plan',
    age: '1d',
    patientName: 'Amina Yusuf',
    patientMrn: 'MRN-LSH-10405',
    diagnosis: 'Inpatient observation & IV antibiotics'
  },
  {
    id: 'CLM-4476',
    provider: 'Lagoon Specialist Hospital',
    payer: 'Reliance HMO',
    amount: 115000,
    formattedAmount: '₦115,000',
    status: 'approved',
    statusLabel: 'Approved',
    isDisputed: false,
    denialRisk: 'low',
    denialReason: 'Pre-auth verified & approved by payer',
    planRule: 'Reliance HMO Silver Plan · Tariff pre-cleared',
    age: '3d',
    preAuthCode: 'PA-LAG-90114',
    patientName: 'Chidi Amadi',
    patientMrn: 'MRN-LSH-10406',
    diagnosis: 'Elective laparoscopic cholecystectomy'
  }
];
