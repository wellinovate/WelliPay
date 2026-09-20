import pg from 'pg';
import dotenv from 'dotenv';
import { ALL_RECONCILIATION_ITEMS, CONFIRMED_RECONCILIATION_ITEMS, UNMATCHED_RECONCILIATION_ITEMS } from './reconciliationData.js';
import { SEED_PROVIDERS, MASTER_DIAGNOSTIC_SERVICES, INITIAL_PROVIDER_TARIFFS, SEED_PAYER_PLAN_RULES } from './directoryData.js';

dotenv.config();

const connectionString = 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_URL || 
  process.env.POSTGRESQL_URL || 
  process.env.PGURI;

let pool = null;

if (connectionString) {
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  pool = new pg.Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });
}

export { pool };

export async function query(text, params) {
  if (!pool) {
    throw new Error('Database pool not initialized. DATABASE_URL environment variable is missing.');
  }
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return res;
}

export async function checkDatabaseHealth() {
  if (!pool) {
    return {
      connected: false,
      status: 'unconfigured',
      message: 'DATABASE_URL is not set in environment variables',
      database: null,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const res = await pool.query(`
      SELECT 
        NOW() as current_time, 
        current_database() as db_name, 
        version() as pg_version
    `);
    
    // Check tables existence
    const tableRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    return {
      connected: true,
      status: 'healthy',
      database: res.rows[0].db_name,
      serverTime: res.rows[0].current_time,
      version: res.rows[0].pg_version.split(' ')[0] + ' ' + res.rows[0].pg_version.split(' ')[1],
      tables: tableRes.rows.map(r => r.table_name),
      tableCount: tableRes.rows.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      connected: false,
      status: 'error',
      message: err.message,
      database: null,
      timestamp: new Date().toISOString(),
    };
  }
}

// ---- Seed data generator: scales to Lagoon Hospital wireframe targets ----

const NIGERIAN_NAMES = [
  'Kemi Adeleke', 'Chinedu Eze', 'Amina Bello', 'Babatunde Fashola',
  'Ngozi Okoro', 'Yusuf Danladi', 'Funmilayo Adebayo', 'Emeka Obi',
  'Halima Suleiman', 'Tunde Bakare', 'Chiamaka Nwosu', 'Ibrahim Musa',
  'Folake Adeyemi', 'Sunday Okafor', 'Zainab Aliyu', 'Kelechi Anyanwu',
  'Grace Effiong', 'Musa Abubakar', 'Blessing Uche', 'Segun Ogundipe',
  'Aisha Garba', 'Chukwuemeka Nnaji', 'Bisi Ogunleye', 'David Etim',
  'Rukayat Bello', 'Obinna Chukwu', 'Fatima Yakubu', 'Wale Ojo',
  'Comfort Ekpo', 'Ahmed Sani', 'John Umar', 'Mariam Bello', 'Jadesola Adeyemi', 'Tariq Yusuf', 'Taiwo Adeyemi'
];

const FEMALE_NAMES = new Set([
  'Kemi Adeleke', 'Amina Bello', 'Ngozi Okoro', 'Funmilayo Adebayo', 'Halima Suleiman',
  'Chiamaka Nwosu', 'Folake Adeyemi', 'Zainab Aliyu', 'Grace Effiong', 'Blessing Uche',
  'Aisha Garba', 'Bisi Ogunleye', 'Rukayat Bello', 'Fatima Yakubu', 'Comfort Ekpo',
  'Mariam Bello', 'Jadesola Adeyemi', 'Grace Okafor', 'Halima Bello', 'Zainab Abiola',
  'Folake Adeleke', 'Ngozi Okonjo', 'Fatima Abubakar'
]);

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Distributes a target total across `count` rows with realistic variance,
// forcing the last row to absorb rounding so the sum matches exactly.
function distributeAmount(targetTotal, count, minAmt, maxAmt) {
  const amounts = [];
  let remaining = targetTotal;
  for (let i = 0; i < count - 1; i++) {
    const roomLeft = count - i - 1;
    const avgRemaining = remaining / (roomLeft + 1);
    const low = Math.max(minAmt, Math.floor(avgRemaining * 0.5));
    const high = Math.min(maxAmt, Math.ceil(avgRemaining * 1.5));
    const amt = randInt(low, high);
    amounts.push(amt);
    remaining -= amt;
  }
  amounts.push(Math.max(minAmt, remaining)); // last row absorbs remainder
  return amounts;
}

function randomPastDate(daysBackMax) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, daysBackMax));
  return d;
}

function generateDynamicTimestamps(totalCount) {
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  // Clinics open ~08:00 (480 mins). If current time is early, span back appropriately.
  const startOfDayMinutes = Math.min(480, Math.max(360, currentTotalMinutes - 180));
  const span = Math.max(90, currentTotalMinutes - startOfDayMinutes);

  const times = [];
  for (let i = 0; i < totalCount; i++) {
    // i = 0 is latest (2 to 4 mins ago); as i increases, steps back towards morning
    const progress = i / Math.max(1, totalCount - 1);
    const minutesAgo = Math.floor(Math.pow(progress, 1.15) * (span - 4)) + 2;
    const txnMins = Math.max(startOfDayMinutes, currentTotalMinutes - minutesAgo);
    const h = Math.floor(txnMins / 60) % 24;
    const m = txnMins % 60;
    times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  // times is chronologically DESC
  return times;
}

function getClinicalServiceForAmount(amount) {
  if (amount >= 70000) {
    return pick([
      'Emergency Inpatient Admission Deposit',
      'Elective Surgical Pre-auth Deposit',
      'Maternity Care & Delivery Suite Booking'
    ]);
  }
  if (amount >= 22000) {
    return pick([
      'CT Abdominal Imaging Scan',
      'Cardiology Echocardiogram & Specialist Review',
      'Endoscopy Diagnostic Procedure',
      'Consultant Pediatrician Extended Review'
    ]);
  }
  if (amount >= 8000) {
    return pick([
      'Pelvic & Abdominal Ultrasound Scan',
      'Comprehensive Metabolic Blood Panel',
      'Electrocardiogram (ECG) & Chest X-Ray',
      'Wound Debridement & Minor Suturing',
      'Dental Scaling, Polishing & Triage'
    ]);
  }
  return pick([
    'Outpatient Pharmacy Prescription Checkout',
    'Rapid Malaria & Widal Diagnostic Screen',
    'Routine Antenatal Triage & BP Check',
    'Pediatric Immunization Administration',
    'General Medical Consultation Copay'
  ]);
}

function generateRealisticDirectAmounts(targetTotal, count) {
  const amounts = [];
  let remaining = targetTotal;

  // 2 High-value surgical/admission deposits (75k - 115k)
  const high1 = randInt(105, 118) * 1000;
  const high2 = randInt(65, 82) * 1000;
  amounts.push(high1, high2);
  remaining -= (high1 + high2);

  // 6 Specialized diagnostic/consultation procedures (22k - 45k)
  for (let i = 0; i < 6; i++) {
    const amt = randInt(22, 42) * 1000;
    amounts.push(amt);
    remaining -= amt;
  }

  // 18 Standard outpatient procedures & comprehensive labs (8k - 20k)
  for (let i = 0; i < 18; i++) {
    const amt = randInt(8, 20) * 1000;
    amounts.push(amt);
    remaining -= amt;
  }

  // 26 Routine pharmacy, rapid test & triage copays (1.5k - 6.5k)
  const routineCount = count - amounts.length;
  for (let i = 0; i < routineCount - 1; i++) {
    const avgRoutine = remaining / (routineCount - i);
    const low = Math.max(1500, Math.floor(avgRoutine * 0.4));
    const high = Math.min(8500, Math.ceil(avgRoutine * 1.6));
    const amt = Math.round(randInt(low, high) / 500) * 500;
    amounts.push(amt);
    remaining -= amt;
  }
  // Final absorber guarantees exact match to the single kobo
  amounts.push(remaining);

  // Shuffle so high, medium, and low amounts are naturally distributed
  for (let i = amounts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [amounts[i], amounts[j]] = [amounts[j], amounts[i]];
  }
  return amounts;
}

export function generateScaledSeedData() {
  // ---- 1. Patient-direct transactions -> target ₦640,000 ----
  const PATIENT_DIRECT_TARGET = 640000;
  const PATIENT_TXN_COUNT = 52;
  const patientTxnAmounts = generateRealisticDirectAmounts(PATIENT_DIRECT_TARGET, PATIENT_TXN_COUNT);
  const CHANNELS = ['POS card', 'USSD', 'Bank transfer', 'Card'];

  const patientDirectTxns = patientTxnAmounts.map((amount) => ({
    patient_or_service: `${pick(NIGERIAN_NAMES)} — ${getClinicalServiceForAmount(amount)}`,
    amount,
    formatted_amount: `₦${amount.toLocaleString()}`,
    channel: pick(CHANNELS),
    status: 'paid', // All 52 paid transactions sum to exactly ₦640,000 for patientDirect
  }));

  // 2 HMO remittance transactions received today
  const hmoRemittanceTxns = [
    {
      patient_or_service: 'Reliance HMO — Capitation Remittance (Batch REL-09)',
      amount: 1200000,
      formatted_amount: '₦1,200,000',
      channel: 'HMO',
      status: 'paid',
    },
    {
      patient_or_service: 'Hygeia HMO — Settled Claims Remittance',
      amount: 700000,
      formatted_amount: '₦700,000',
      channel: 'HMO',
      status: 'paid',
    },
  ];

  // 1 Corporate retainer payment received today
  const corporateRetainerTxns = [
    {
      patient_or_service: 'Dangote Industries — Retainer Settlement (Sept)',
      amount: 300000,
      formatted_amount: '₦300,000',
      channel: 'Corporate',
      status: 'paid',
    },
  ];

  // 4 Failed cashier attempts realistically spaced out across the day
  const failedTxns = [
    { patient_or_service: 'M. Bello — Outpatient Pharmacy Checkout', amount: 8500, formatted_amount: '₦8,500', channel: 'Card', status: 'failed' },
    { patient_or_service: 'Chinedu Eze — Pelvic Ultrasound Deposit', amount: 15000, formatted_amount: '₦15,000', channel: 'POS card', status: 'failed' },
    { patient_or_service: 'Kemi Adeleke — Comprehensive Blood Panel', amount: 12000, formatted_amount: '₦12,000', channel: 'USSD', status: 'failed' },
    { patient_or_service: 'Sunday Okafor — Specialist Consultation Copay', amount: 20000, formatted_amount: '₦20,000', channel: 'Card', status: 'failed' },
  ];

  // Combine all 59 transactions
  const combinedRaw = [...patientDirectTxns, ...hmoRemittanceTxns, ...corporateRetainerTxns, ...failedTxns];
  const timestamps = generateDynamicTimestamps(combinedRaw.length);

  // Assign timestamps in descending order (most recent first)
  const rawTransactions = combinedRaw.map((t, idx) => ({
    time_captured: timestamps[idx],
    ...t,
  }));

  // Ensure strict chronological DESC sort
  rawTransactions.sort((a, b) => b.time_captured.localeCompare(a.time_captured));

  const allTransactions = rawTransactions.map((t, idx) => ({
    id: `TXN-${String(101 + idx)}`,
    ...t,
  }));

  // ---- 2. HMO claims -> target ₦1,900,000 outstanding receivables + settled remittances ----
  const HMO_RECEIVABLES_TARGET = 1900000;
  const OUTSTANDING_CLAIM_COUNT = 48;
  const claimAmounts = distributeAmount(HMO_RECEIVABLES_TARGET, OUTSTANDING_CLAIM_COUNT, 8000, 90000);
  const PROVIDER_NAME = 'Lagoon Specialist Hospital';
  const PAYERS = ['Reliance HMO', 'AXA Mansard', 'Hygeia HMO', 'Leadway Health'];
  const DIAGNOSES = [
    'Routine lipid profile & HbA1c screening',
    'Echocardiography & Doppler imaging',
    'Appendectomy emergency intervention',
    'Comprehensive metabolic panel',
    'Hypertension management & ECG',
    'Antenatal triage & ultrasound',
    'Pediatric observation & malaria test',
    'Full blood count & differential',
    'Renal function panel (E/U/Cr)',
    'Ophthalmic consult & tonometry'
  ];

  const outstandingClaims = claimAmounts.map((amount, i) => {
    const submittedAt = randomPastDate(21); // spread over last 3 weeks
    const ageDays = Math.max(1, Math.floor((Date.now() - submittedAt.getTime()) / 86400000));
    const isDisputed = i === 2 || i === 15 || i === 29; // ~6% disputed (3 of 48)
    const denialRisk = isDisputed ? 'missing-auth' : (amount > 50000 ? pick(['high', 'low']) : 'low');
    const isApproved = !isDisputed && (i % 4 === 0); // ~25% approved, rest submitted
    const status = isApproved ? 'approved' : 'submitted'; // Counted in hmoReceivables (status IN ('submitted', 'approved'))
    const statusLabel = isDisputed ? 'Flagged for Review' : (isApproved ? 'Approved' : 'Submitted');

    const payer = i === 2 ? 'Reliance HMO' : (i === 15 ? 'AXA Mansard' : (i === 29 ? 'Hygeia HMO' : PAYERS[i % PAYERS.length]));
    const diagnosis = i === 2 ? 'Appendectomy emergency intervention' : pick(DIAGNOSES);
    const patientName = pick(NIGERIAN_NAMES);
    const patientMrn = `MRN-LSH-${10400 + i}`;

    let denialReason = 'Under routine clinical review';
    let planRule = `${payer} Standard Benefit Plan · Routine outpatient tariff`;

    if (isDisputed) {
      if (i === 2) {
        denialReason = 'Missing pre-authorization code';
        planRule = 'Reliance HMO Silver Plan · Pre-authorization mandatory for all inpatient/surgical care regardless of amount, and all procedures exceeding ₦100,000 (POL-SILVER-V3)';
      } else if (i === 15) {
        denialReason = 'Diagnostic code review required';
        planRule = 'AXA Mansard Gold · Pre-auth required for specialist imaging > ₦25,000 (POL-AXA-08)';
      } else {
        denialReason = 'Tariff verification pending with payer';
        planRule = 'Hygeia Corporate Standard · Diagnostic coding validation mandatory (POL-HYG-12)';
      }
    } else if (isApproved) {
      denialReason = 'Pre-auth verified & approved by payer';
      planRule = `${payer} Comprehensive Plan · Tariff pre-cleared`;
    } else if (denialRisk === 'high') {
      denialReason = 'Tariff verification pending with payer';
      planRule = `${payer} Standard Plan · Tariff validation in progress`;
    }

    return {
      id: `CLM-${4470 + i}`,
      provider: PROVIDER_NAME,
      payer,
      amount,
      formatted_amount: `₦${amount.toLocaleString()}`,
      status,
      status_label: statusLabel,
      is_disputed: isDisputed,
      denial_risk: denialRisk,
      denial_reason: denialReason,
      plan_rule: planRule,
      sla_days: 14,
      age: `${ageDays}d`,
      patient_name: patientName,
      patient_mrn: patientMrn,
      diagnosis,
      pre_auth_code: isDisputed ? null : (isApproved ? `PA-${randInt(10000, 99999)}-E` : (Math.random() < 0.3 ? `PA-${randInt(10000, 99999)}-E` : null)),
    };
  });

  // Historical settled/paid claims for Paid Remittances metrics
  const settledClaimAmounts = distributeAmount(850000, 12, 10000, 120000);
  const settledClaims = settledClaimAmounts.map((amount, i) => {
    const submittedAt = randomPastDate(28);
    const ageDays = Math.max(7, Math.floor((Date.now() - submittedAt.getTime()) / 86400000));
    const payer = PAYERS[i % PAYERS.length];
    return {
      id: `CLM-${4520 + i}`,
      provider: PROVIDER_NAME,
      payer,
      amount,
      formatted_amount: `₦${amount.toLocaleString()}`,
      status: 'paid',
      status_label: 'Paid Remittance',
      is_disputed: false,
      denial_risk: 'low',
      denial_reason: 'Settled against remittance advice',
      plan_rule: `${payer} Remittance Schedule Settled`,
      sla_days: 14,
      age: `${ageDays}d`,
      patient_name: pick(NIGERIAN_NAMES),
      patient_mrn: `MRN-LSH-${10500 + i}`,
      diagnosis: pick(DIAGNOSES),
      pre_auth_code: `PA-${randInt(10000, 99999)}-E`,
    };
  });

  const hmoClaims = [...outstandingClaims, ...settledClaims];

  // ---- 3. Patients table: expand to back every claim + named transaction ----
  // Build from the union of names used above so nothing is orphaned.
  const rawPatientNames = [...new Set([
    ...hmoClaims.map(c => c.patient_name),
    ...allTransactions.map(t => t.patient_or_service.split(' — ')[0].trim()),
    'John Umar', 'Mariam Bello', 'Jadesola Adeyemi', 'Tariq Yusuf', 'Taiwo Adeyemi',
    'Kemi Adeleke', 'Amina Bello', 'Babatunde Fashola', 'Chinedu Eze', 'Sunday Okafor'
  ])];

  const canonicalNameMap = {
    'J. Umar': 'John Umar',
    'M. Bello': 'Mariam Bello',
    'T. Yusuf': 'Tariq Yusuf',
    'J. Adeyemi': 'Jadesola Adeyemi',
    'T. Adeyemi': 'Taiwo Adeyemi',
  };

  const allPatientNames = [...new Set(rawPatientNames.map(n => canonicalNameMap[n] || n))];

  // Specific patients with unsettled copay totaling exactly ₦78,000 (matching red KPI card)
  const UNSETTLED_COPAY_MAP = {
    'Sunday Okafor': 7000,
    'Folake Adeyemi': 15000,
    'Ibrahim Musa': 24000,
    'Babatunde Fashola': 32000
  };

  // Real plan names per payer, sourced from SEED_PAYER_PLAN_RULES (the same table
  // the benefit-check/copay engine reads from) so a patient's primary_coverage
  // never names a plan that doesn't exist for that payer. Previously this used a
  // hardcoded, payer-agnostic list that included 'Executive' and 'Premium', which
  // are not real plans anywhere in payer_plan_rules.
  const plansByPayer = SEED_PAYER_PLAN_RULES.reduce((acc, rule) => {
    (acc[rule.payer_name] = acc[rule.payer_name] || []).push(rule.plan_name);
    return acc;
  }, {});

  const patients = allPatientNames.map((name, i) => {
    const isUnsettled = UNSETTLED_COPAY_MAP[name] !== undefined;
    // Unsettled copay patients must have HMO
    const hasHmo = isUnsettled || (i % 5 !== 0); // ~80% insured, rest self-pay
    const outstandingCopay = UNSETTLED_COPAY_MAP[name] || 0;
    const hmoName = hasHmo ? (name === 'Sunday Okafor' ? 'Reliance HMO' : pick(['Hygeia HMO', 'Reliance HMO', 'AXA Mansard', 'Avon HMO', 'Leadway Health'])) : null;
    const gender = FEMALE_NAMES.has(name) ? 'female' : 'male';
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '.');
    const emailDomain = (i % 3 === 0) ? 'gmail.com' : (i % 3 === 1) ? 'yahoo.com' : 'outlook.com';

    // Policy verification status
    let policyVerificationStatus = 'self_pay';
    let policyVerificationLabel = '—';
    if (hasHmo) {
      if (i % 10 === 7) {
        policyVerificationStatus = 'expired';
        policyVerificationLabel = 'Expired 31 Aug';
      } else if (i % 10 === 9) {
        policyVerificationStatus = 'not_checked';
        policyVerificationLabel = 'Not checked';
      } else {
        policyVerificationStatus = 'verified';
        policyVerificationLabel = `Verified ${pick(['10 Sep', '12 Sep', '14 Sep'])}`;
      }
    }

    const birthYear = 1968 + (i * 7) % 32;
    const birthMonth = String(1 + (i * 3) % 12).padStart(2, '0');
    const birthDay = String(1 + (i * 5) % 28).padStart(2, '0');

    return {
      id: `PAT-${String(1001 + i)}`,
      mrn: `MRN-LSH-${String(10001 + i)}`,
      full_name: name,
      phone: `+234 ${pick(['802', '803', '805', '809', '813', '814', '818'])} ${randInt(100, 999)} ${randInt(1000, 9999)}`,
      email: `${cleanName}@${emailDomain}`,
      gender,
      date_of_birth: `${birthYear}-${birthMonth}-${birthDay}`,
      primary_coverage: hasHmo ? `${hmoName} (${pick(plansByPayer[hmoName])})` : 'Self-Pay / Direct',
      hmo_name: hmoName,
      hmo_policy_number: hasHmo ? `POL-${randInt(100000, 999999)}` : null,
      hmo_enrollee_id: hasHmo ? `ENR-${randInt(10000, 99999)}` : null,
      outstanding_copay: outstandingCopay,
      status: 'active',
      policy_verification_status: policyVerificationStatus,
      policy_verification_label: policyVerificationLabel,
    };
  });

  const totalPaidToday = allTransactions.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0);
  const paidDirect = allTransactions.filter(t => t.status === 'paid' && !['HMO', 'Corporate'].includes(t.channel)).reduce((s, t) => s + t.amount, 0);
  const hmoReceivablesTotal = outstandingClaims.reduce((s, c) => s + c.amount, 0);
  console.log('[Seed Generator] Total today ledger:', totalPaidToday);
  console.log('[Seed Generator] Patient direct total:', paidDirect);
  console.log('[Seed Generator] HMO receivables total:', hmoReceivablesTotal);
  console.log('[Seed Generator] Total patients:', patients.length);
  console.log('[Seed Generator] Total reconciliation items:', ALL_RECONCILIATION_ITEMS.length);
  console.log('[Seed Generator] Confirmed reconciliation items:', CONFIRMED_RECONCILIATION_ITEMS.length);

  return { providerTransactions: allTransactions, hmoClaims, patients, reconciliationItems: ALL_RECONCILIATION_ITEMS };
}

export const SCALED_SEED_DATA = generateScaledSeedData();

export async function initializeDatabase() {
  if (!pool) {
    console.log('[DB] DATABASE_URL not set. Running in static / demo mode.');
    return { initialized: false, reason: 'no_connection_string' };
  }

  try {
    console.log('[DB] Connecting to PostgreSQL database...');
    
    // 1. Create Core Tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(50) PRIMARY KEY,
        organization_id VARCHAR(50) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        amount NUMERIC(15, 2) NOT NULL,
        formatted_amount VARCHAR(50) NOT NULL,
        raw_reference VARCHAR(255) NOT NULL,
        description VARCHAR(255) NOT NULL,
        reconciliation_status VARCHAR(50) DEFAULT 'unmatched',
        date_captured VARCHAR(50) NOT NULL,
        ai_target_name VARCHAR(255),
        ai_invoice_number VARCHAR(100),
        ai_confidence NUMERIC(5, 2),
        ai_is_high_confidence BOOLEAN DEFAULT FALSE,
        ai_explanation TEXT,
        confirmed_at VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Referenced by the Paystack webhook's INSERT INTO payments since that
      -- handler was written, but never added here — on any database created
      -- from this schema alone (a fresh install, not one that inherited them
      -- some other way), every charge.success webhook fails on this insert
      -- and the whole reconciliation transaction rolls back silently. Fixed
      -- here rather than left as a known gap because it blocks all payment
      -- reconciliation, not just the per-invoice DVA matching added alongside it.
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS paystack_transaction_id BIGINT;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS paystack_reference TEXT;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS raw_customer_email TEXT;

      CREATE TABLE IF NOT EXISTS hmo_claims (
        id VARCHAR(50) PRIMARY KEY,
        provider VARCHAR(255) NOT NULL,
        amount NUMERIC(15, 2) NOT NULL,
        formatted_amount VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        status_label VARCHAR(100),
        is_disputed BOOLEAN DEFAULT FALSE,
        denial_risk VARCHAR(50) DEFAULT 'low',
        age VARCHAR(50) NOT NULL,
        patient_name VARCHAR(255),
        patient_mrn VARCHAR(100),
        payer VARCHAR(100),
        diagnosis TEXT,
        pre_auth_code VARCHAR(100),
        denial_reason TEXT,
        plan_rule TEXT,
        sla_days INT DEFAULT 14,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE hmo_claims ADD COLUMN IF NOT EXISTS payer VARCHAR(100);
      ALTER TABLE hmo_claims ADD COLUMN IF NOT EXISTS patient_mrn VARCHAR(100);
      ALTER TABLE hmo_claims ADD COLUMN IF NOT EXISTS denial_reason TEXT;
      ALTER TABLE hmo_claims ADD COLUMN IF NOT EXISTS plan_rule TEXT;
      ALTER TABLE hmo_claims ADD COLUMN IF NOT EXISTS sla_days INT DEFAULT 14;

        CREATE TABLE IF NOT EXISTS provider_transactions (
        id VARCHAR(50) PRIMARY KEY,
        time_captured VARCHAR(50) NOT NULL,
        patient_or_service VARCHAR(255) NOT NULL,
        amount NUMERIC(15, 2) NOT NULL,
        formatted_amount VARCHAR(50) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clinical_service_orders (
        id VARCHAR(50) PRIMARY KEY,
        patient_name VARCHAR(255) NOT NULL,
        patient_mrn VARCHAR(100),
        service_type VARCHAR(100) NOT NULL,
        category VARCHAR(50) DEFAULT 'Laboratory',
        amount NUMERIC(15, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'unbilled',
        performed_at TIMESTAMPTZ DEFAULT NOW(),
        invoice_id VARCHAR(50)
      );

      ALTER TABLE clinical_service_orders ADD COLUMN IF NOT EXISTS patient_mrn VARCHAR(100);

      CREATE TABLE IF NOT EXISTS corporate_retainers (
        id VARCHAR(50) PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        monthly_retainer NUMERIC(15, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        coverage_details VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(50) PRIMARY KEY,
        mrn VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        gender VARCHAR(20),
        date_of_birth VARCHAR(50),
        primary_coverage VARCHAR(100),
        hmo_name VARCHAR(100),
        hmo_policy_number VARCHAR(100),
        hmo_enrollee_id VARCHAR(100),
        outstanding_copay NUMERIC(15, 2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(50) PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        patient_id VARCHAR(50),
        patient_name VARCHAR(255) NOT NULL,
        patient_mrn VARCHAR(100),
        service_description TEXT NOT NULL,
        total_amount NUMERIC(15, 2) NOT NULL,
        formatted_amount VARCHAR(50) NOT NULL,
        paid_amount NUMERIC(15, 2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'pending',
        status_label VARCHAR(100) DEFAULT 'Pending Payment',
        due_date VARCHAR(50),
        paid_date VARCHAR(50),
        is_inpatient BOOLEAN DEFAULT FALSE,
        discharge_status VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS patient_mrn VARCHAR(100);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_date VARCHAR(50);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_inpatient BOOLEAN DEFAULT FALSE;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discharge_status VARCHAR(50);

      -- Payer/HMO context captured at invoice creation (Estimator and manual
      -- invoice form both submit these). Previously accepted in the POST body
      -- and echoed back in the create response only, never persisted, so a
      -- page reload silently lost which payer, plan, copay split and pre-auth
      -- code applied to the invoice.
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payer_type VARCHAR(20);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payer_name VARCHAR(255);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS policy_number VARCHAR(100);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS copay_amount NUMERIC(15, 2);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS claim_amount NUMERIC(15, 2);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pre_auth_code VARCHAR(50);

      -- Per-invoice Paystack Dedicated Virtual Account (DVA). Each invoice
      -- provisions its own bank-transfer account at creation, so an incoming
      -- transfer can be matched by the exact receiving account number instead
      -- of relying on the patient having typed the invoice number correctly
      -- into their banking app's narration field. Nullable: provisioning is
      -- best-effort against the Paystack API and never blocks invoice
      -- creation, so an invoice can legitimately have no dedicated account
      -- (Paystack unreachable, DVA product not yet approved for the merchant,
      -- etc.) — the shared/legacy narration-matching path in the webhook
      -- handler is the fallback for exactly that case.
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS dedicated_account_number VARCHAR(20);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS dedicated_account_bank VARCHAR(100);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS dedicated_account_name VARCHAR(255);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paystack_customer_code VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_invoices_dedicated_account_number ON invoices(dedicated_account_number);

      CREATE TABLE IF NOT EXISTS reconciliation_entries (
        id SERIAL PRIMARY KEY,
        date TIMESTAMPTZ DEFAULT NOW(),
        amount NUMERIC(15, 2) NOT NULL,
        description TEXT,
        channel VARCHAR(50) DEFAULT 'Paystack',
        matched_invoice_id VARCHAR(50),
        reconciliation_status VARCHAR(50) DEFAULT 'unmatched',
        confidence_score NUMERIC(5, 2),
        paystack_transaction_id BIGINT UNIQUE,
        paystack_reference TEXT,
        raw_customer_email TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE reconciliation_entries
        ADD COLUMN IF NOT EXISTS paystack_transaction_id BIGINT UNIQUE,
        ADD COLUMN IF NOT EXISTS paystack_reference TEXT,
        ADD COLUMN IF NOT EXISTS raw_customer_email TEXT;

      CREATE TABLE IF NOT EXISTS providers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        provider_type VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE providers ADD COLUMN IF NOT EXISTS provider_type VARCHAR(50);

      CREATE TABLE IF NOT EXISTS master_service_directory (
        id SERIAL PRIMARY KEY,
        provider_type VARCHAR(50) NOT NULL,
        department VARCHAR(100) NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        service_code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        specimen_type VARCHAR(100),
        benchmark_turnaround VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS provider_catalogue (
        id SERIAL PRIMARY KEY,
        provider_id VARCHAR(50) NOT NULL REFERENCES providers(id),
        master_service_id INTEGER NOT NULL REFERENCES master_service_directory(id),
        price NUMERIC(15, 2) NOT NULL,
        turnaround_time VARCHAR(100),
        availability VARCHAR(50) DEFAULT 'available',
        hmo_accepted TEXT[],
        is_published BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(provider_id, master_service_id)
      );

      CREATE TABLE IF NOT EXISTS payer_plan_rules (
        id SERIAL PRIMARY KEY,
        payer_name VARCHAR(100) NOT NULL,
        plan_name VARCHAR(100) NOT NULL,
        copay_percentage NUMERIC(5,2) NOT NULL,
        preauth_threshold NUMERIC(15,2),
        deductible NUMERIC(15,2) DEFAULT 0,
        covered_categories TEXT[],
        excluded_services TEXT[],
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(payer_name, plan_name)
      );

      ALTER TABLE hmo_claims ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50);
      ALTER TABLE clinical_service_orders ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50);
      ALTER TABLE clinical_service_orders ADD COLUMN IF NOT EXISTS master_service_id INTEGER;

      -- Multi-vendor EHR integration (external ingestion API, see docs/multi-vendor-ehr-integration.md)

      -- LOINC/CPT anchoring for master_service_directory: nullable, intentionally left unpopulated
      -- here. These are real, externally-verifiable clinical coding identifiers (LOINC for labs,
      -- CPT for procedures) — they must be filled in by someone who can check each one against the
      -- actual LOINC/CPT registries, not guessed or invented. An external EHR integration that
      -- matches on a wrong code silently misroutes clinical orders, so leave these NULL until verified
      -- rather than filling them with plausible-looking placeholders.
      ALTER TABLE master_service_directory ADD COLUMN IF NOT EXISTS loinc_code VARCHAR(20);
      ALTER TABLE master_service_directory ADD COLUMN IF NOT EXISTS cpt_code VARCHAR(20);

      -- One API credential per (provider, vendor) pairing. The raw key is shown to the caller
      -- exactly once at creation time (see POST /api/admin/integration-credentials); only its
      -- SHA-256 hash is ever stored, matching the pattern already used for Paystack webhook
      -- signature verification (HMAC over a shared secret, never the secret itself in the DB).
      CREATE TABLE IF NOT EXISTS integration_credentials (
        id SERIAL PRIMARY KEY,
        provider_id VARCHAR(50) NOT NULL REFERENCES providers(id),
        vendor_name VARCHAR(100) NOT NULL,
        key_prefix VARCHAR(20) NOT NULL UNIQUE,
        key_hash VARCHAR(128) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_used_at TIMESTAMPTZ
      );

      -- Per-facility patient identity mapping for third-party EHRs (see EMPI design notes: a
      -- third-party vendor's patient id is only unique within that vendor+facility pairing, so it
      -- is never written into WelliPay's own global patients.mrn column, which would risk collisions
      -- across unrelated systems).
      CREATE TABLE IF NOT EXISTS patient_external_ids (
        id SERIAL PRIMARY KEY,
        provider_id VARCHAR(50) NOT NULL REFERENCES providers(id),
        external_patient_id VARCHAR(150) NOT NULL,
        patient_id VARCHAR(50) NOT NULL REFERENCES patients(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(provider_id, external_patient_id)
      );

      -- Idempotent order ingestion: a vendor may retry a failed delivery, so the same
      -- (provider_id, idempotency_key) pair must never create two orders.
      ALTER TABLE clinical_service_orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);
      ALTER TABLE clinical_service_orders ADD COLUMN IF NOT EXISTS source_vendor VARCHAR(100);
      ALTER TABLE clinical_service_orders ADD COLUMN IF NOT EXISTS patient_id VARCHAR(50);
      CREATE UNIQUE INDEX IF NOT EXISTS clinical_service_orders_provider_idempotency_key
        ON clinical_service_orders (provider_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL;
    `);

    // 2. Seed Organizations
    await pool.query(`
      INSERT INTO organizations (id, name, type) VALUES 
      ('org-lagoon', 'Lagoon Specialist Hospital', 'hospital_provider'),
      ('org-reliance', 'Reliance HMO', 'hmo_payer')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Payments (all 45 items: 12 unmatched + 33 confirmed) if empty
    const paymentCountRes = await pool.query('SELECT COUNT(*) FROM payments');
    if (parseInt(paymentCountRes.rows[0].count, 10) === 0) {
      console.log(`[DB] Seeding ${SCALED_SEED_DATA.reconciliationItems.length} reconciliation payments (${CONFIRMED_RECONCILIATION_ITEMS.length} confirmed)...`);
      for (const p of SCALED_SEED_DATA.reconciliationItems) {
        await pool.query(`
          INSERT INTO payments (id, organization_id, channel, amount, formatted_amount, raw_reference, description, reconciliation_status, date_captured, ai_target_name, ai_invoice_number, ai_confidence, ai_is_high_confidence, ai_explanation, confirmed_at)
          VALUES ($1, 'org-lagoon', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO UPDATE SET
            channel = EXCLUDED.channel,
            amount = EXCLUDED.amount,
            formatted_amount = EXCLUDED.formatted_amount,
            raw_reference = EXCLUDED.raw_reference,
            description = EXCLUDED.description,
            reconciliation_status = EXCLUDED.reconciliation_status,
            date_captured = EXCLUDED.date_captured,
            ai_target_name = EXCLUDED.ai_target_name,
            ai_invoice_number = EXCLUDED.ai_invoice_number,
            ai_confidence = EXCLUDED.ai_confidence,
            ai_is_high_confidence = EXCLUDED.ai_is_high_confidence,
            ai_explanation = EXCLUDED.ai_explanation,
            confirmed_at = EXCLUDED.confirmed_at;
        `, [
          p.id, p.channel, p.amount, p.formattedAmount, p.rawDetails, p.description,
          p.status, p.date, p.aiMatch?.targetName || null, p.aiMatch?.invoiceNumber || null,
          p.aiMatch?.confidence || 0, p.aiMatch?.isHighConfidence ?? false,
          p.aiMatch?.explanation || null, p.confirmedAt || null
        ]);
      }
    }

    // 3. Seed HMO Claims (48 claims scaling to ₦1,900,000 + 12 settled remittances) if empty
    const claimsCountRes = await pool.query('SELECT COUNT(*) FROM hmo_claims');
    if (parseInt(claimsCountRes.rows[0].count, 10) === 0) {
      console.log(`[DB] Seeding ${SCALED_SEED_DATA.hmoClaims.length} scaled HMO claims (target ₦1,900,000)...`);
      for (const c of SCALED_SEED_DATA.hmoClaims) {
        await pool.query(`
          INSERT INTO hmo_claims (
            id, provider, amount, formatted_amount, status, status_label, is_disputed,
            denial_risk, age, patient_name, patient_mrn, payer, diagnosis, pre_auth_code,
            denial_reason, plan_rule, sla_days
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            provider = EXCLUDED.provider,
            amount = EXCLUDED.amount,
            formatted_amount = EXCLUDED.formatted_amount,
            status = EXCLUDED.status,
            status_label = EXCLUDED.status_label,
            is_disputed = EXCLUDED.is_disputed,
            denial_risk = EXCLUDED.denial_risk,
            age = EXCLUDED.age,
            patient_name = EXCLUDED.patient_name,
            patient_mrn = EXCLUDED.patient_mrn,
            payer = EXCLUDED.payer,
            diagnosis = EXCLUDED.diagnosis,
            pre_auth_code = EXCLUDED.pre_auth_code,
            denial_reason = EXCLUDED.denial_reason,
            plan_rule = EXCLUDED.plan_rule,
            sla_days = EXCLUDED.sla_days;
        `, [
          c.id, c.provider, c.amount, c.formatted_amount, c.status, c.status_label,
          c.is_disputed, c.denial_risk, c.age, c.patient_name, c.patient_mrn, c.payer,
          c.diagnosis, c.pre_auth_code, c.denial_reason, c.plan_rule, c.sla_days || 14
        ]);
      }
    }

    // 4. Seed Provider Transactions (52 patient direct + 2 HMO remittances + 1 corporate retainer + 4 failed) if empty
    const txCountRes = await pool.query('SELECT COUNT(*) FROM provider_transactions');
    if (parseInt(txCountRes.rows[0].count, 10) === 0) {
      console.log(`[DB] Seeding ${SCALED_SEED_DATA.providerTransactions.length} scaled provider transactions (target ₦640,000 direct, ₦2.84M total)...`);
      for (const t of SCALED_SEED_DATA.providerTransactions) {
        await pool.query(`
          INSERT INTO provider_transactions (id, time_captured, patient_or_service, amount, formatted_amount, channel, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            time_captured = EXCLUDED.time_captured,
            patient_or_service = EXCLUDED.patient_or_service,
            amount = EXCLUDED.amount,
            formatted_amount = EXCLUDED.formatted_amount,
            channel = EXCLUDED.channel,
            status = EXCLUDED.status;
        `, [t.id, t.time_captured, t.patient_or_service, t.amount, t.formatted_amount, t.channel, t.status]);
      }
    }

    // 5. Seed 17 Clinical Service Orders for Revenue Leakage Audit if empty
    const labCountRes = await pool.query('SELECT COUNT(*) FROM clinical_service_orders');
    if (parseInt(labCountRes.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding 17 unbilled clinical service orders...');
      await pool.query(`
        INSERT INTO clinical_service_orders (id, patient_name, patient_mrn, service_type, category, amount, status) VALUES
        -- 8 Full Blood Count orders (₦96,000 total, ₦12,000 each)
        ('LAB-FBC-01', 'Chinedu Eze', 'MRN-LSH-10008', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-02', 'Halima Bello', 'MRN-LSH-10003', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-03', 'Adebayo Adeleke', 'MRN-LSH-10012', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-04', 'Kemi Adeleke', 'MRN-LSH-10001', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-05', 'Babatunde Fashola', 'MRN-LSH-10007', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-06', 'Ngozi Okonjo', 'MRN-LSH-10014', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-07', 'Emeka Okonkwo', 'MRN-LSH-10002', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-08', 'Fatima Abubakar', 'MRN-LSH-10016', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        -- 5 Electrolytes, Urea & Creatinine orders (₦140,000 total, ₦28,000 each)
        ('LAB-EUC-01', 'Grace Okafor', 'MRN-LSH-10015', 'Electrolytes, Urea & Creatinine', 'Chemical Pathology', 28000, 'unbilled'),
        ('LAB-EUC-02', 'Oluwaseun Bakare', 'MRN-LSH-10017', 'Electrolytes, Urea & Creatinine', 'Chemical Pathology', 28000, 'unbilled'),
        ('LAB-EUC-03', 'Taiwo Adeyemi', 'MRN-LSH-10004', 'Electrolytes, Urea & Creatinine', 'Chemical Pathology', 28000, 'unbilled'),
        ('LAB-EUC-04', 'Mariam Bello', 'MRN-LSH-10005', 'Electrolytes, Urea & Creatinine', 'Chemical Pathology', 28000, 'unbilled'),
        ('LAB-EUC-05', 'John Umar', 'MRN-LSH-10006', 'Electrolytes, Urea & Creatinine', 'Chemical Pathology', 28000, 'unbilled'),
        -- 4 Lipid Profile Panels (₦104,000 total, ₦26,000 each)
        ('LAB-LIP-01', 'Ibrahim Danjuma', 'MRN-LSH-10018', 'Lipid Profile Panels', 'Chemical Pathology', 26000, 'unbilled'),
        ('LAB-LIP-02', 'Zainab Abiola', 'MRN-LSH-10019', 'Lipid Profile Panels', 'Chemical Pathology', 26000, 'unbilled'),
        ('LAB-LIP-03', 'Samuel Ogundipe', 'MRN-LSH-10020', 'Lipid Profile Panels', 'Chemical Pathology', 26000, 'unbilled'),
        ('LAB-LIP-04', 'Folake Adeleke', 'MRN-LSH-10021', 'Lipid Profile Panels', 'Chemical Pathology', 26000, 'unbilled')
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    // 6. Seed Corporate Retainers if empty
    const corpCountRes = await pool.query('SELECT COUNT(*) FROM corporate_retainers');
    if (parseInt(corpCountRes.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding 3 enterprise corporate retainers...');
      await pool.query(`
        INSERT INTO corporate_retainers (id, company_name, monthly_retainer, status, coverage_details) VALUES
        ('RET-001', 'Dangote Industries Executive Retainer', 120000, 'active', 'Tier 1 Executive Staff Full Medical Coverage'),
        ('RET-002', 'MTN Nigeria Corporate Health Account', 100000, 'active', 'Enterprise Triage & Outpatient Health Retainer'),
        ('RET-003', 'Standard Chartered Corporate Retainer', 80000, 'active', 'Executive Health Check & Annual Pathology Retainer')
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    // 7. Seed Patients (backing all claims and transactions) if empty
    const patientCountRes = await pool.query('SELECT COUNT(*) FROM patients');
    if (parseInt(patientCountRes.rows[0].count, 10) === 0) {
      console.log(`[DB] Seeding ${SCALED_SEED_DATA.patients.length} scaled patient records...`);
      for (const p of SCALED_SEED_DATA.patients) {
        await pool.query(`
          INSERT INTO patients (id, mrn, full_name, phone, email, gender, date_of_birth, primary_coverage, hmo_name, hmo_policy_number, hmo_enrollee_id, outstanding_copay, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            mrn = EXCLUDED.mrn,
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            gender = EXCLUDED.gender,
            date_of_birth = EXCLUDED.date_of_birth,
            primary_coverage = EXCLUDED.primary_coverage,
            hmo_name = EXCLUDED.hmo_name,
            hmo_policy_number = EXCLUDED.hmo_policy_number,
            hmo_enrollee_id = EXCLUDED.hmo_enrollee_id,
            outstanding_copay = EXCLUDED.outstanding_copay,
            status = EXCLUDED.status;
        `, [p.id, p.mrn, p.full_name, p.phone, p.email, p.gender, p.date_of_birth, p.primary_coverage, p.hmo_name, p.hmo_policy_number, p.hmo_enrollee_id, p.outstanding_copay, p.status]);
      }
    }

    // 8. Seed Invoices if empty
    const invoiceCountRes = await pool.query('SELECT COUNT(*) FROM invoices');
    if (parseInt(invoiceCountRes.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding 4 foundational invoices...');
      await pool.query(`
        INSERT INTO invoices (
          id, invoice_number, patient_id, patient_name, patient_mrn, service_description,
          total_amount, formatted_amount, paid_amount, status, status_label,
          due_date, paid_date, is_inpatient, discharge_status
        ) VALUES
        ('INV-93105', 'INV-93105', 'PAT-1082', 'Taiwo Adeyemi', 'MRN-LSH-10004', 'Pediatric Inpatient Observation', 11500, '₦11,500', 0, 'pending', 'Pending Payment', '2026-09-19', NULL, true, 'awaiting_settlement'),
        ('INV-92831', 'INV-92831', 'PAT-1094', 'John Umar', 'MRN-LSH-10006', 'Cardiology Consultation & ECG', 25000, '₦25,000', 25000, 'paid', 'Reconciled', '2026-09-17', '2026-09-17', false, NULL),
        ('INV-93010', 'INV-93010', 'PAT-1102', 'Mariam Bello', 'MRN-LSH-10005', 'Pharmacy Prescription Checkout', 8500, '₦8,500', 8500, 'paid', 'Reconciled', '2026-09-17', '2026-09-17', false, NULL),
        ('INV-93044', 'INV-93044', 'PAT-1120', 'ABC Diagnostics', 'EXT-ACC-1120', 'Referred Pathology Panel Batch', 12000, '₦12,000', 12000, 'paid', 'Reconciled', '2026-09-17', '2026-09-17', false, NULL)
        ON CONFLICT (id) DO UPDATE SET
          patient_name = EXCLUDED.patient_name,
          patient_mrn = EXCLUDED.patient_mrn,
          service_description = EXCLUDED.service_description,
          total_amount = EXCLUDED.total_amount,
          formatted_amount = EXCLUDED.formatted_amount,
          paid_amount = EXCLUDED.paid_amount,
          status = EXCLUDED.status,
          status_label = EXCLUDED.status_label,
          due_date = EXCLUDED.due_date,
          paid_date = EXCLUDED.paid_date,
          is_inpatient = EXCLUDED.is_inpatient,
          discharge_status = EXCLUDED.discharge_status;
      `);
    }

    // 9. Seed Providers if empty
    const providerCountRes = await pool.query('SELECT COUNT(*) FROM providers');
    if (parseInt(providerCountRes.rows[0].count, 10) === 0) {
      console.log(`[DB] Seeding ${SEED_PROVIDERS.length} canonical providers...`);
      for (const prv of SEED_PROVIDERS) {
        await pool.query(`
          INSERT INTO providers (id, name, provider_type, email, phone, address, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            provider_type = EXCLUDED.provider_type,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            is_active = EXCLUDED.is_active;
        `, [prv.id, prv.name, prv.provider_type, prv.email, prv.phone, prv.address, prv.is_active]);
      }
    }

    // 10. Seed Master Service Directory if empty
    const masterCountRes = await pool.query('SELECT COUNT(*) FROM master_service_directory');
    if (parseInt(masterCountRes.rows[0].count, 10) === 0) {
      console.log(`[DB] Seeding ${MASTER_DIAGNOSTIC_SERVICES.length} standardized master diagnostic services...`);
      for (const s of MASTER_DIAGNOSTIC_SERVICES) {
        await pool.query(`
          INSERT INTO master_service_directory (provider_type, department, service_name, service_code, description, specimen_type, benchmark_turnaround, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, true)
          ON CONFLICT (service_code) DO UPDATE SET
            provider_type = EXCLUDED.provider_type,
            department = EXCLUDED.department,
            service_name = EXCLUDED.service_name,
            description = EXCLUDED.description,
            specimen_type = EXCLUDED.specimen_type,
            benchmark_turnaround = EXCLUDED.benchmark_turnaround;
        `, [s.provider_type, s.department, s.service_name, s.service_code, s.description, s.specimen_type, s.benchmark_turnaround]);
      }
    }

    // 11. Seed Provider Catalogue Tariffs if empty
    const catalogueCountRes = await pool.query('SELECT COUNT(*) FROM provider_catalogue');
    if (parseInt(catalogueCountRes.rows[0].count, 10) === 0) {
      console.log(`[DB] Seeding ${INITIAL_PROVIDER_TARIFFS.length} initial provider catalogue tariffs...`);
      for (const t of INITIAL_PROVIDER_TARIFFS) {
        const masterRes = await pool.query('SELECT id FROM master_service_directory WHERE service_code = $1', [t.service_code]);
        if (masterRes.rows.length > 0) {
          const masterId = masterRes.rows[0].id;
          await pool.query(`
            INSERT INTO provider_catalogue (provider_id, master_service_id, price, turnaround_time, availability, hmo_accepted, is_published)
            VALUES ($1, $2, $3, $4, 'available', $5, $6)
            ON CONFLICT (provider_id, master_service_id) DO UPDATE SET
              price = EXCLUDED.price,
              turnaround_time = EXCLUDED.turnaround_time,
              hmo_accepted = EXCLUDED.hmo_accepted,
              is_published = EXCLUDED.is_published;
          `, [t.provider_id, masterId, t.price, t.turnaround_time, t.hmo_accepted, t.is_published]);
        }
      }
    }

    // 12. Seed Payer Plan Rules if empty
    const rulesCountRes = await pool.query('SELECT COUNT(*) FROM payer_plan_rules');
    if (parseInt(rulesCountRes.rows[0].count, 10) === 0) {
      console.log(`[DB] Seeding ${SEED_PAYER_PLAN_RULES.length} payer plan coverage rules...`);
      for (const r of SEED_PAYER_PLAN_RULES) {
        await pool.query(`
          INSERT INTO payer_plan_rules (
            payer_name, plan_name, copay_percentage, preauth_threshold, deductible, covered_categories, excluded_services, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (payer_name, plan_name) DO UPDATE SET
            copay_percentage = EXCLUDED.copay_percentage,
            preauth_threshold = EXCLUDED.preauth_threshold,
            deductible = EXCLUDED.deductible,
            covered_categories = EXCLUDED.covered_categories,
            excluded_services = EXCLUDED.excluded_services,
            is_active = EXCLUDED.is_active;
        `, [
          r.payer_name,
          r.plan_name,
          r.copay_percentage,
          r.preauth_threshold,
          r.deductible || 0,
          r.covered_categories,
          r.excluded_services || [],
          r.is_active ?? true
        ]);
      }
    }

    // 13. Run Canonical Provider & Service Backfill Updates
    await pool.query(`
      UPDATE hmo_claims SET provider_id = 'PRV-LAG-01' WHERE (provider = 'Lagoon Specialist Hospital' OR provider = 'Lagoon Hospital') AND provider_id IS NULL;
      UPDATE hmo_claims SET provider_id = 'PRV-ABC-01' WHERE provider = 'ABC Diagnostics' AND provider_id IS NULL;
      UPDATE invoices SET provider_id = 'PRV-ABC-01' WHERE (patient_mrn = 'EXT-ACC-1120' OR patient_name = 'ABC Diagnostics') AND provider_id IS NULL;
      UPDATE invoices SET provider_id = 'PRV-LAG-01' WHERE provider_id IS NULL;
      UPDATE clinical_service_orders SET provider_id = 'PRV-LAG-01' WHERE provider_id IS NULL;
      UPDATE clinical_service_orders SET master_service_id = (SELECT id FROM master_service_directory WHERE service_code = 'LAB-HEM-FBC') WHERE service_type = 'Full Blood Count' AND master_service_id IS NULL;
      UPDATE clinical_service_orders SET master_service_id = (SELECT id FROM master_service_directory WHERE service_code = 'LAB-CHM-EUCR') WHERE service_type = 'Electrolytes, Urea & Creatinine' AND master_service_id IS NULL;
      UPDATE clinical_service_orders SET master_service_id = (SELECT id FROM master_service_directory WHERE service_code = 'LAB-CHM-LIP') WHERE service_type = 'Lipid Profile Panels' AND master_service_id IS NULL;
    `);

    // HMO remittance matching (see docs/hmo-remittance-reconciliation.md).
    // One remittance (a single incoming payment from a payer) can settle many
    // claims at once, often at less than the claimed amount per claim — the
    // existing reconciliation_entries table is one-payment-to-one-invoice and
    // can't represent that shape. expected_amount is captured on the line at
    // match time (not read live off hmo_claims.amount) so a later edit to the
    // claim can never silently rewrite historical variance.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hmo_remittances (
        id VARCHAR(50) PRIMARY KEY,
        payer VARCHAR(100) NOT NULL,
        amount_received NUMERIC(15, 2) NOT NULL,
        reference VARCHAR(150),
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status VARCHAR(50) NOT NULL DEFAULT 'unmatched',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hmo_remittance_lines (
        id VARCHAR(50) PRIMARY KEY,
        remittance_id VARCHAR(50) NOT NULL REFERENCES hmo_remittances(id),
        claim_id VARCHAR(50) NOT NULL REFERENCES hmo_claims(id),
        expected_amount NUMERIC(15, 2) NOT NULL,
        paid_amount NUMERIC(15, 2) NOT NULL,
        variance NUMERIC(15, 2) NOT NULL,
        variance_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(claim_id)
      );

      -- Pre-Authorization Tracker. Previously "pre-auth" was only ever a
      -- free-text code a user typed into hmo_claims.pre_auth_code or
      -- invoices.pre_auth_code — nothing tracked the request itself through
      -- its lifecycle. This table is the tracked entity; pre_authorization_events
      -- is its status timeline (what patients/providers see as "what was
      -- requested, and where it stands now"). invoice_id and claim_id are
      -- nullable FKs populated once the request reaches that stage — a
      -- pre-auth is requested before an invoice necessarily exists, and a
      -- claim is only submitted after the service is completed.
      CREATE TABLE IF NOT EXISTS pre_authorizations (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50),
        patient_name VARCHAR(255) NOT NULL,
        patient_mrn VARCHAR(100),
        provider_id VARCHAR(50),
        provider_name VARCHAR(255) NOT NULL,
        payer_name VARCHAR(100) NOT NULL,
        service_description TEXT NOT NULL,
        clinical_justification TEXT,
        documentation_notes TEXT,
        requested_amount NUMERIC(15, 2) NOT NULL,
        formatted_amount VARCHAR(50) NOT NULL,
        approved_amount NUMERIC(15, 2),
        status VARCHAR(30) NOT NULL DEFAULT 'requested',
        auth_code VARCHAR(100),
        rejection_reason TEXT,
        invoice_id VARCHAR(50) REFERENCES invoices(id),
        claim_id VARCHAR(50) REFERENCES hmo_claims(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS pre_authorization_events (
        id SERIAL PRIMARY KEY,
        pre_auth_id VARCHAR(50) NOT NULL REFERENCES pre_authorizations(id),
        status VARCHAR(30) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_preauth_events_preauth_id ON pre_authorization_events(pre_auth_id);
      CREATE INDEX IF NOT EXISTS idx_preauth_status ON pre_authorizations(status);
    `);

    return { initialized: true };
  } catch (err) {
    console.error('[DB] Error initializing database tables:', err);
    return { initialized: false, error: err.message };
  }
}
