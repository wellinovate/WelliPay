import pg from 'pg';
import dotenv from 'dotenv';

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
        diagnosis TEXT,
        pre_auth_code VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

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
        service_type VARCHAR(100) NOT NULL,
        category VARCHAR(50) DEFAULT 'Laboratory',
        amount NUMERIC(15, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'unbilled',
        performed_at TIMESTAMPTZ DEFAULT NOW(),
        invoice_id VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS corporate_retainers (
        id VARCHAR(50) PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        monthly_retainer NUMERIC(15, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        coverage_details VARCHAR(255)
      );
    `);

    // 2. Check if payments table has seed data
    const countRes = await pool.query('SELECT COUNT(*) FROM payments');
    const count = parseInt(countRes.rows[0].count, 10);

    if (count === 0) {
      console.log('[DB] Seeding initial WelliPay payments and organizations into PostgreSQL...');
      
      // Seed Organizations
      await pool.query(`
        INSERT INTO organizations (id, name, type) VALUES 
        ('org-lagoon', 'Lagoon Specialist Hospital', 'hospital_provider'),
        ('org-reliance', 'Reliance HMO', 'hmo_payer')
        ON CONFLICT (id) DO NOTHING;
      `);

      // Seed Initial Payments
      await pool.query(`
        INSERT INTO payments (id, organization_id, channel, amount, formatted_amount, raw_reference, description, reconciliation_status, date_captured, ai_target_name, ai_invoice_number, ai_confidence, ai_is_high_confidence, ai_explanation) VALUES
        ('REC-001', 'org-lagoon', 'Bank transfer', 25000, '₦25,000', '"JOHN U."', 'Bank transfer', 'unmatched', 'Sep 12', 'J. Umar', 'INV-92831', 94, true, 'Name match 98% with patient registry + exact amount match on pending cardiology bill.'),
        ('REC-002', 'org-lagoon', 'POS card', 8500, '₦8,500', 'txn 44231', 'POS card', 'unmatched', 'Sep 12', 'M. Bello', 'INV-93010', 88, true, 'Terminal ID 02 matched Pharmacy counter at 10:05 + outpatient prescription total.'),
        ('REC-003', 'org-lagoon', 'Bank transfer', 12000, '₦12,000', '"ABC DIAG"', 'Bank transfer', 'unmatched', 'Sep 13', 'ABC Diagnostics', 'INV-93044', 97, true, 'Vendor corporate code matched partner referral reconciliation ledger.'),
        ('REC-004', 'org-lagoon', 'USSD', 3200, '₦3,200', 'ref *737*...', 'USSD payment', 'unmatched', 'Sep 13', 'Unassigned patient', NULL, 34, false, 'Session phone number unlisted in hospital EMR. Requires cashier manual lookup.'),
        ('REC-005', 'org-lagoon', 'Bank transfer', 15000, '₦15,000', '"EMMANUEL O."', 'Bank transfer', 'unmatched', 'Sep 13', 'E. Okafor', 'INV-93050', 91, true, 'Reference string and deposit slip time matched triage intake.'),
        ('REC-006', 'org-lagoon', 'USSD', 4500, '₦4,500', 'ref *894*...', 'USSD payment', 'unmatched', 'Sep 14', 'S. Ibrahim', 'INV-93062', 86, true, 'Phone number matched patient mobile for antenatal clinic visit.'),
        ('REC-007', 'org-lagoon', 'Bank transfer', 65000, '₦65,000', '"RELIANCE COPAY"', 'HMO remittance', 'unmatched', 'Sep 14', 'Reliance HMO', 'BATCH-892', 95, true, 'Monthly remittance schedule matched electronic claims batch.')
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    // 3. Seed HMO Claims if empty
    const claimCountRes = await pool.query('SELECT COUNT(*) FROM hmo_claims');
    if (parseInt(claimCountRes.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding HMO claims...');
      await pool.query(`
        INSERT INTO hmo_claims (id, provider, amount, formatted_amount, status, status_label, is_disputed, denial_risk, age, patient_name, diagnosis, pre_auth_code) VALUES
        ('CLM-4471', 'ABC Diagnostics', 12000, '₦12,000', 'submitted', 'Submitted', false, 'high', '2d', 'Kemi Adeleke', 'Routine lipid profile & HbA1c screening', NULL),
        ('CLM-4472', 'Lagoon Hospital', 45000, '₦45,000', 'approved', 'Approved', false, 'low', '5d', 'Emeka Okonkwo', 'Emergency appendectomy pre-auth', 'PA-LAG-88219'),
        ('CLM-4473', 'Sunrise Clinic', 8200, '₦8,200', 'rejected', 'Rejected — disputed', true, 'missing-auth', '9d', 'Halima Bello', 'Pelvic ultrasound without pre-authorization code', NULL),
        ('CLM-4474', 'ABC Diagnostics', 21500, '₦21,500', 'paid', 'Paid', false, 'low', '14d', 'Babatunde Fashola', 'Comprehensive metabolic panel', NULL)
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    // 4. Seed Provider Transactions if empty
    const txnCountRes = await pool.query('SELECT COUNT(*) FROM provider_transactions');
    if (parseInt(txnCountRes.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding provider transactions...');
      await pool.query(`
        INSERT INTO provider_transactions (id, time_captured, patient_or_service, amount, formatted_amount, channel, status) VALUES
        ('TXN-101', '09:14', 'J. Adeyemi — Consultation', 2000, '₦2,000', 'USSD', 'paid'),
        ('TXN-102', '09:22', 'ABC Diagnostics — Lab claim', 12000, '₦12,000', 'HMO', 'pending'),
        ('TXN-103', '09:40', 'F. Okon — Deposit', 50000, '₦50,000', 'Transfer', 'paid'),
        ('TXN-104', '10:05', 'M. Bello — Pharmacy', 8500, '₦8,500', 'Card', 'failed'),
        ('TXN-105', '10:21', 'T. Yusuf — Ultrasound', 8000, '₦8,000', 'Bank transfer', 'paid')
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    // 5. Seed 17 Clinical Service Orders for Revenue Leakage Audit if empty
    const labCountRes = await pool.query('SELECT COUNT(*) FROM clinical_service_orders');
    if (parseInt(labCountRes.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding 17 unbilled clinical service orders...');
      await pool.query(`
        INSERT INTO clinical_service_orders (id, patient_name, service_type, category, amount, status) VALUES
        -- 8 Full Blood Count orders (₦96,000 total, ₦12,000 each)
        ('LAB-FBC-01', 'Patient FBC-01', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-02', 'Patient FBC-02', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-03', 'Patient FBC-03', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-04', 'Patient FBC-04', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-05', 'Patient FBC-05', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-06', 'Patient FBC-06', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-07', 'Patient FBC-07', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        ('LAB-FBC-08', 'Patient FBC-08', 'Full Blood Count', 'Hematology', 12000, 'unbilled'),
        -- 5 Electrolytes, Urea & Creatinine orders (₦140,000 total, ₦28,000 each)
        ('LAB-EUC-01', 'Patient EUC-01', 'Electrolytes, Urea & Creatinine', 'Chemical Pathology', 28000, 'unbilled'),
        ('LAB-EUC-02', 'Patient EUC-02', 'Electrolytes, Urea & Creatinine', 'Chemical Pathology', 28000, 'unbilled'),
        ('LAB-EUC-03', 'Patient EUC-03', 'Electrolytes, Urea & Creatinine', 'Chemical Pathology', 28000, 'unbilled'),
        ('LAB-EUC-04', 'Patient EUC-04', 'Electrolytes, Urea & Creatinine', 'Chemical Pathology', 28000, 'unbilled'),
        ('LAB-EUC-05', 'Patient EUC-05', 'Electrolytes, Urea & Creatinine', 'Chemical Pathology', 28000, 'unbilled'),
        -- 4 Lipid Profile Panels (₦104,000 total, ₦26,000 each)
        ('LAB-LIP-01', 'Patient LIP-01', 'Lipid Profile Panels', 'Chemical Pathology', 26000, 'unbilled'),
        ('LAB-LIP-02', 'Patient LIP-02', 'Lipid Profile Panels', 'Chemical Pathology', 26000, 'unbilled'),
        ('LAB-LIP-03', 'Patient LIP-03', 'Lipid Profile Panels', 'Chemical Pathology', 26000, 'unbilled'),
        ('LAB-LIP-04', 'Patient LIP-04', 'Lipid Profile Panels', 'Chemical Pathology', 26000, 'unbilled')
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

    return { initialized: true };
  } catch (err) {
    console.error('[DB] Error initializing database tables:', err);
    return { initialized: false, error: err.message };
  }
}
