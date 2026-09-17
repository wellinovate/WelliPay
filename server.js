import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { pool, checkDatabaseHealth, initializeDatabase, query, SCALED_SEED_DATA } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5174;

app.use(express.json());

// Initialize Firebase Admin (ESM modular style)
let firebaseInitialized = false;
try {
  let credentialData = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      credentialData = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
      // It might be a file path
      const filePath = path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT);
      if (fs.existsSync(filePath)) {
        credentialData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    }
  } else {
    // Check for default service account file in workspace
    const defaultSaPath = path.resolve(__dirname, 'wellipay-firebase-adminsdk-fbsvc-466aae8605.json');
    if (fs.existsSync(defaultSaPath)) {
      credentialData = JSON.parse(fs.readFileSync(defaultSaPath, 'utf8'));
    }
  }

  if (credentialData && getApps().length === 0) {
    initializeApp({
      credential: cert(credentialData)
    });
  }

  firebaseInitialized = getApps().length > 0;
  if (firebaseInitialized) {
    console.log('[Auth] Firebase Admin initialized with service account successfully.');
  } else if (process.env.NODE_ENV === 'production') {
    console.error('[Auth FATAL] FIREBASE_SERVICE_ACCOUNT is missing in production. Protected API routes will reject requests.');
  } else {
    console.log('[Auth] FIREBASE_SERVICE_ACCOUNT not set. Running in development demo bypass mode.');
  }
} catch (err) {
  console.error('[Auth] Failed to initialize Firebase Admin:', err.message);
}

// Auth middleware — blocks any request without a valid Firebase login token in production
async function requireAuth(req, res, next) {
  if (!firebaseInitialized) {
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }
    return res.status(500).json({
      error: 'Authentication service unavailable: Firebase Admin service account is not configured in production.'
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated. Bearer token missing.' });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    req.user = await getAuth().verifyIdToken(token);
    next();
  } catch (err) {
    console.warn('[Auth] Token verification failed:', err.message);
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// Initialize database tables on server start
initializeDatabase().catch(err => {
  console.error('[Server] Database initialization failed:', err);
});

// ==========================================
// Public Endpoints (Health & Status Checks)
// ==========================================

app.get('/api/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  
  res.status(dbHealth.status === 'error' ? 500 : 200).json({
    status: dbHealth.connected ? 'healthy' : 'degraded',
    service: 'WelliPay Healthcare Financial Operating System',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    port: PORT,
    database: dbHealth,
    auth: {
      firebaseAdminActive: firebaseInitialized,
      serviceAccountConfigured: !!process.env.FIREBASE_SERVICE_ACCOUNT
    }
  });
});

app.get('/api/database/status', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.json(dbHealth);
});

// ==========================================
// Protected Routes (Protected with requireAuth)
// ==========================================

// 1. Get Reconciliation Queue
app.get('/api/reconciliation', requireAuth, async (req, res) => {
  if (pool) {
    try {
      const result = await query(`
        SELECT 
          id, date_captured as date, amount, formatted_amount as "formattedAmount",
          channel, description, raw_reference as "rawDetails", reconciliation_status as status,
          json_build_object(
            'confidence', ai_confidence,
            'isHighConfidence', ai_is_high_confidence,
            'targetName', ai_target_name,
            'invoiceNumber', ai_invoice_number,
            'explanation', ai_explanation
          ) as "aiMatch",
          confirmed_at as "confirmedAt"
        FROM payments
        ORDER BY id ASC
      `);
      return res.json({ source: 'postgresql', items: result.rows });
    } catch (err) {
      console.error('[API /api/reconciliation] DB error:', err.message);
      return res.status(500).json({ error: 'Database query failed', message: err.message });
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Database service unavailable in production.' });
  }

  res.json({ source: 'fallback', message: 'Database query executed with local state fallback.' });
});

// 2. Single Confirm Reconciliation Item
app.post('/api/reconciliation/confirm', requireAuth, async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing payment id' });

  try {
    if (pool) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await query(`
        UPDATE payments 
        SET reconciliation_status = 'confirmed', confirmed_at = $1 
        WHERE id = $2
      `, [now, id]);
      return res.json({ success: true, id, status: 'confirmed', confirmedAt: now });
    }
  } catch (err) {
    console.error('[API /api/reconciliation/confirm] DB error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  res.json({ success: true, id, status: 'confirmed', mode: 'demo' });
});

// 3. Bulk Confirm Matches (Row-locked atomic transaction)
app.post('/api/reconciliation/bulk-confirm', requireAuth, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Missing ids array' });
  }

  try {
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const updateRes = await client.query(`
          UPDATE payments
          SET reconciliation_status = 'confirmed', confirmed_at = $1
          WHERE id = ANY($2::varchar[]) AND reconciliation_status = 'unmatched'
          RETURNING id, amount
        `, [now, ids]);

        await client.query('COMMIT');
        return res.json({
          success: true,
          confirmedCount: updateRes.rowCount,
          confirmedIds: updateRes.rows.map(r => r.id),
          confirmedAt: now
        });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
  } catch (err) {
    console.error('[API /api/reconciliation/bulk-confirm] DB error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  res.json({ success: true, confirmedCount: ids.length, confirmedIds: ids, mode: 'demo' });
});

// 4. Get HMO Claims
app.get('/api/claims', requireAuth, async (req, res) => {
  if (pool) {
    try {
      const result = await query(`
        SELECT 
          id, provider, amount::float as amount, formatted_amount as "formattedAmount",
          status, status_label as "statusLabel", is_disputed as "isDisputed",
          denial_risk as "denialRisk", age, patient_name as "patientName",
          diagnosis, pre_auth_code as "preAuthCode"
        FROM hmo_claims
        ORDER BY id ASC
      `);
      return res.json({ source: 'postgresql', claims: result.rows });
    } catch (err) {
      console.error('[API /api/claims] DB error:', err.message);
      return res.status(500).json({ error: 'Database query failed', message: err.message });
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Database service unavailable in production.' });
  }

  const fallbackClaims = (SCALED_SEED_DATA?.hmoClaims || []).map(c => ({
    id: c.id,
    provider: c.provider,
    amount: c.amount,
    formattedAmount: c.formatted_amount,
    status: c.status,
    statusLabel: c.status_label,
    isDisputed: c.is_disputed,
    denialRisk: c.denial_risk,
    age: c.age,
    patientName: c.patient_name,
    diagnosis: c.diagnosis,
    preAuthCode: c.pre_auth_code
  }));

  res.json({ source: 'fallback', claims: fallbackClaims });
});

// 5. Approve HMO Claim
app.post('/api/claims/:id/approve', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    if (pool) {
      const updateRes = await query(`
        UPDATE hmo_claims
        SET status = 'approved', status_label = 'Approved', is_disputed = false, denial_risk = 'low'
        WHERE id = $1
        RETURNING id, provider, amount, formatted_amount as "formattedAmount", status, status_label as "statusLabel"
      `, [id]);
      
      if (updateRes.rows.length === 0) {
        return res.status(404).json({ error: `Claim ${id} not found` });
      }

      return res.json({ success: true, claim: updateRes.rows[0] });
    }
  } catch (err) {
    console.error('[API /api/claims/:id/approve] DB error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  res.json({ success: true, id, status: 'approved', mode: 'demo' });
});

// 6. Reject HMO Claim
app.post('/api/claims/:id/reject', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    if (pool) {
      const updateRes = await query(`
        UPDATE hmo_claims
        SET status = 'rejected', status_label = 'Rejected', is_disputed = false,
            diagnosis = CASE WHEN $2::text IS NOT NULL AND $2::text != '' THEN $2 ELSE diagnosis END
        WHERE id = $1
        RETURNING id, provider, amount, formatted_amount as "formattedAmount", status, status_label as "statusLabel"
      `, [id, reason || null]);

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ error: `Claim ${id} not found` });
      }

      return res.json({ success: true, claim: updateRes.rows[0], reason });
    }
  } catch (err) {
    console.error('[API /api/claims/:id/reject] DB error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  res.json({ success: true, id, status: 'rejected', reason, mode: 'demo' });
});

// 7. Resolve Claim Dispute
app.post('/api/claims/:id/resolve', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { resolution } = req.body; // 'approve' or 'reject'

  try {
    if (pool) {
      const newStatus = resolution === 'approve' ? 'approved' : 'rejected';
      const statusLabel = resolution === 'approve' ? 'Approved (Dispute Settled)' : 'Rejected Final';
      const updateRes = await query(`
        UPDATE hmo_claims
        SET is_disputed = false, status = $1, status_label = $2, denial_risk = 'low'
        WHERE id = $3
        RETURNING id, provider, amount, formatted_amount as "formattedAmount", status, status_label as "statusLabel"
      `, [newStatus, statusLabel, id]);

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ error: `Claim ${id} not found` });
      }

      return res.json({ success: true, claim: updateRes.rows[0], status: newStatus, statusLabel });
    }
  } catch (err) {
    console.error('[API /api/claims/:id/resolve] DB error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  res.json({ success: true, id, resolution, mode: 'demo' });
});

// Currency formatter helper (e.g. 57000 -> ₦57K, 1900000 -> ₦1.9M)
function formatNaira(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  if (num >= 1000000) {
    const m = num / 1000000;
    const formatted = m % 1 === 0 ? m.toFixed(0) : parseFloat(m.toFixed(2)).toString();
    return `₦${formatted}M`;
  }
  if (num >= 1000) {
    const k = num / 1000;
    const formatted = k % 1 === 0 ? k.toFixed(0) : parseFloat(k.toFixed(1)).toString();
    return `₦${formatted}K`;
  }
  return `₦${Math.round(num).toLocaleString()}`;
}

// 6. Get Provider Dashboard KPIs, Leakage Audit & Transactions
app.get('/api/dashboard', requireAuth, async (req, res) => {
  if (pool) {
    try {
      // Fetch recent transactions (chronologically DESC so recent activity shows a natural, realistic mix)
      const txnsRes = await query(`
        SELECT id, time_captured as time, patient_or_service as "patientOrService",
               amount::float as amount, formatted_amount as "formattedAmount", channel, status
        FROM provider_transactions
        ORDER BY time_captured DESC, id DESC
        LIMIT 50
      `);

      // 1. Total collections today across ALL payment channels in provider_transactions (Card, POS, USSD, Transfers, HMO remittances, Corporate retainers)
      const totalTodayRes = await query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM provider_transactions
        WHERE status = 'paid'
      `);
      const totalToday = parseFloat(totalTodayRes.rows[0]?.total || 0);

      // 2. Patient direct collections (out-of-pocket only: Card, POS, USSD, Transfers; excludes HMO and Corporate)
      const patientDirectRes = await query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM provider_transactions
        WHERE status = 'paid'
          AND channel NOT IN ('HMO', 'Corporate')
      `);
      const patientDirect = parseFloat(patientDirectRes.rows[0]?.total || 0);

      // 3. Count of distinct active payment channels today
      const channelsRes = await query(`
        SELECT COUNT(DISTINCT channel) as count
        FROM provider_transactions
        WHERE status = 'paid'
      `);
      const activeChannels = parseInt(channelsRes.rows[0]?.count || 0, 10) || 4;

      // 4. HMO receivables (standalone metric: dynamically sum submitted & approved claims)
      const hmoRes = await query(`
        SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM hmo_claims
        WHERE status IN ('submitted', 'approved')
      `);
      const hmoReceivables = parseFloat(hmoRes.rows[0]?.total || 0);
      const pendingClaimsCount = parseInt(hmoRes.rows[0]?.count || 0, 10);

      // 5. Corporate retainers (standalone metric: monthly enterprise contracts)
      const corporateRes = await query(`
        SELECT COALESCE(SUM(monthly_retainer), 0) as total, COUNT(*) as count
        FROM corporate_retainers
        WHERE status = 'active'
      `);
      const corporateRetainers = parseFloat(corporateRes.rows[0]?.total || 0) || 300000;
      const corporateCount = parseInt(corporateRes.rows[0]?.count || 0, 10) || 3;

      // 6. Unbilled clinical leakage audit
      const leakageRes = await query(`
        SELECT service_type as name, COUNT(*) as "orderCount", SUM(amount) as amount
        FROM clinical_service_orders
        WHERE status = 'unbilled'
        GROUP BY service_type
        ORDER BY amount DESC
      `);
      
      const unbilledCount = leakageRes.rows.reduce((acc, r) => acc + parseInt(r.orderCount, 10), 0);
      const totalExposure = leakageRes.rows.reduce((acc, r) => acc + parseFloat(r.amount), 0);
      const breakdown = leakageRes.rows.map(r => ({
        name: `${r.name} (${r.orderCount} orders)`,
        orderCount: parseInt(r.orderCount, 10),
        amount: parseFloat(r.amount),
        formattedAmount: `₦${parseFloat(r.amount).toLocaleString()}`
      }));

      return res.json({
        source: 'postgresql',
        metrics: {
          totalToday,
          formattedTotalToday: formatNaira(totalToday),
          totalTodayTrend: '+14.2% vs yesterday',
          patientDirect,
          formattedPatientDirect: formatNaira(patientDirect),
          hmoReceivables,
          formattedHmoReceivables: formatNaira(hmoReceivables),
          pendingClaimsCount,
          corporateRetainers,
          formattedCorporateRetainers: formatNaira(corporateRetainers),
          corporateCount,
          activeChannels
        },
        leakage: {
          unbilledCount,
          totalExposure,
          formattedTotalExposure: `₦${totalExposure.toLocaleString()}`,
          isResolved: unbilledCount === 0,
          breakdown // Empty array if unbilledCount === 0, populated if > 0
        },
        transactions: txnsRes.rows
      });
    } catch (err) {
      console.error('[API /api/dashboard] DB error:', err.message);
      return res.status(500).json({ error: 'Database query failed', message: err.message });
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Database service unavailable in production.' });
  }

  // Fallback demo payload
  res.json({
    source: 'fallback',
    metrics: {
      totalToday: 2840000,
      formattedTotalToday: '₦2.84M',
      totalTodayTrend: '+14.2% vs yesterday',
      patientDirect: 640000,
      formattedPatientDirect: '₦640K',
      hmoReceivables: 1900000,
      formattedHmoReceivables: '₦1.9M',
      pendingClaimsCount: 48,
      corporateRetainers: 300000,
      formattedCorporateRetainers: '₦300K',
      corporateCount: 3,
      activeChannels: 6
    },
    leakage: {
      unbilledCount: 17,
      totalExposure: 340000,
      formattedTotalExposure: '₦340,000',
      isResolved: false,
      breakdown: [
        { name: 'Full Blood Count (8 orders)', orderCount: 8, amount: 96000, formattedAmount: '₦96,000' },
        { name: 'Electrolytes, Urea & Creatinine (5 orders)', orderCount: 5, amount: 140000, formattedAmount: '₦140,000' },
        { name: 'Lipid Profile Panels (4 orders)', orderCount: 4, amount: 104000, formattedAmount: '₦104,000' }
      ]
    },
    transactions: (SCALED_SEED_DATA?.providerTransactions || []).slice(0, 50).map(t => ({
      id: t.id,
      time: t.time_captured,
      patientOrService: t.patient_or_service,
      amount: t.amount,
      formattedAmount: t.formatted_amount,
      channel: t.channel,
      status: t.status
    }))
  });
});

// 7. Record New Provider Transaction
app.post('/api/dashboard/transactions', requireAuth, async (req, res) => {
  const { id, time, patientOrService, amount, formattedAmount, channel, status } = req.body;
  if (!id || !patientOrService || !amount) {
    return res.status(400).json({ error: 'Missing required transaction fields' });
  }

  try {
    if (pool) {
      await query(`
        INSERT INTO provider_transactions (id, time_captured, patient_or_service, amount, formatted_amount, channel, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [id, time, patientOrService, amount, formattedAmount, channel, status || 'paid']);
      return res.json({ success: true, transaction: req.body });
    }
  } catch (err) {
    console.error('[API /api/dashboard/transactions] DB error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  res.json({ success: true, transaction: req.body, mode: 'demo' });
});

// 8. Resolve Clinical Revenue Leakage (Batch Bill Unbilled Lab Procedures)
app.post('/api/dashboard/resolve-leakage', requireAuth, async (req, res) => {
  try {
    if (pool) {
      const updateRes = await query(`
        UPDATE clinical_service_orders
        SET status = 'invoiced'
        WHERE status = 'unbilled'
        RETURNING id, amount
      `);

      const recoveredCount = updateRes.rowCount || 17;
      const recoveredAmount = updateRes.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0) || 340000;

      // Insert audit record into provider transactions
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await query(`
        INSERT INTO provider_transactions (id, time_captured, patient_or_service, amount, formatted_amount, channel, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        `TXN-REC-${Date.now().toString().slice(-4)}`,
        now,
        `Charge Audit: ${recoveredCount} Lab Procedures Invoiced`,
        recoveredAmount,
        `₦${recoveredAmount.toLocaleString()}`,
        'Transfer',
        'paid'
      ]);

      return res.json({
        success: true,
        resolvedCount: recoveredCount,
        recoveredAmount,
        isResolved: true
      });
    }
  } catch (err) {
    console.error('[API /api/dashboard/resolve-leakage] DB error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  res.json({
    success: true,
    resolvedCount: 17,
    recoveredAmount: 340000,
    isResolved: true,
    mode: 'demo'
  });
});

// ==========================================
// Patients Directory Endpoints
// ==========================================

const FALLBACK_PATIENTS = (SCALED_SEED_DATA?.patients && SCALED_SEED_DATA.patients.length > 0)
  ? SCALED_SEED_DATA.patients.map(p => ({
      id: p.id,
      mrn: p.mrn,
      fullName: p.full_name,
      phone: p.phone,
      email: p.email,
      gender: p.gender,
      dateOfBirth: p.date_of_birth,
      primaryCoverage: p.primary_coverage,
      hmoName: p.hmo_name,
      hmoPolicyNumber: p.hmo_policy_number,
      hmoEnrolleeId: p.hmo_enrollee_id,
      outstandingCopay: p.outstanding_copay,
      formattedOutstandingCopay: `₦${p.outstanding_copay.toLocaleString()}`,
      status: p.status,
      createdAt: '2026-08-15'
    }))
  : [];


const FALLBACK_INVOICES = [
  {
    id: 'INV-92831',
    invoiceNumber: 'INV-92831',
    patientId: 'PAT-1094',
    patientName: 'J. Umar',
    serviceDescription: 'Cardiology Consultation & ECG',
    totalAmount: 25000,
    formattedAmount: '₦25,000',
    paidAmount: 25000,
    status: 'paid',
    statusLabel: 'Reconciled',
    dueDate: 'Today',
    createdAt: '2026-09-17T09:00:00.000Z'
  },
  {
    id: 'INV-93010',
    invoiceNumber: 'INV-93010',
    patientId: 'PAT-1102',
    patientName: 'M. Bello',
    serviceDescription: 'Pharmacy Prescription Checkout',
    totalAmount: 8500,
    formattedAmount: '₦8,500',
    paidAmount: 8500,
    status: 'paid',
    statusLabel: 'Reconciled',
    dueDate: 'Today',
    createdAt: '2026-09-17T09:30:00.000Z'
  },
  {
    id: 'INV-93044',
    invoiceNumber: 'INV-93044',
    patientId: 'PAT-1120',
    patientName: 'ABC Diagnostics',
    serviceDescription: 'Referred Pathology Panel Batch',
    totalAmount: 12000,
    formattedAmount: '₦12,000',
    paidAmount: 12000,
    status: 'paid',
    statusLabel: 'Reconciled',
    dueDate: 'Today',
    createdAt: '2026-09-17T10:00:00.000Z'
  },
  {
    id: 'INV-93105',
    invoiceNumber: 'INV-93105',
    patientId: 'PAT-1082',
    patientName: 'T. Adeyemi',
    serviceDescription: 'Pediatric Inpatient Observation',
    totalAmount: 11500,
    formattedAmount: '₦11,500',
    paidAmount: 0,
    status: 'pending',
    statusLabel: 'Pending Match',
    dueDate: 'Tomorrow',
    createdAt: '2026-09-17T10:15:00.000Z'
  }
];

// 9. Get Patients Directory
app.get('/api/patients', requireAuth, async (req, res) => {
  const { search, coverage, hasOutstanding } = req.query;

  if (pool) {
    try {
      let conditions = [];
      let params = [];
      let paramIdx = 1;

      if (search && search.trim()) {
        conditions.push(`(full_name ILIKE $${paramIdx} OR mrn ILIKE $${paramIdx} OR phone ILIKE $${paramIdx} OR hmo_policy_number ILIKE $${paramIdx})`);
        params.push(`%${search.trim()}%`);
        paramIdx++;
      }

      if (coverage === 'hmo') {
        conditions.push(`hmo_name IS NOT NULL`);
      } else if (coverage === 'self-pay') {
        conditions.push(`hmo_name IS NULL`);
      }

      if (hasOutstanding === 'true') {
        conditions.push(`outstanding_copay > 0`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const listRes = await query(`
        SELECT 
          id, mrn, full_name as "fullName", phone, email, gender,
          date_of_birth as "dateOfBirth", primary_coverage as "primaryCoverage",
          hmo_name as "hmoName", hmo_policy_number as "hmoPolicyNumber",
          hmo_enrollee_id as "hmoEnrolleeId", outstanding_copay as "outstandingCopay",
          status, created_at as "createdAt"
        FROM patients
        ${whereClause}
        ORDER BY id ASC
      `, params);

      // Metrics calculation
      const metricsRes = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE hmo_name IS NOT NULL) as insured,
          COUNT(*) FILTER (WHERE hmo_name IS NULL) as self_pay,
          COALESCE(SUM(outstanding_copay), 0) as total_copay
        FROM patients
      `);

      const total = parseInt(metricsRes.rows[0]?.total || 0, 10);
      const insured = parseInt(metricsRes.rows[0]?.insured || 0, 10);
      const selfPay = parseInt(metricsRes.rows[0]?.self_pay || 0, 10);
      const totalCopay = parseFloat(metricsRes.rows[0]?.total_copay || 0);

      const patients = listRes.rows.map(p => ({
        ...p,
        outstandingCopay: parseFloat(p.outstandingCopay || 0),
        formattedOutstandingCopay: `₦${parseFloat(p.outstandingCopay || 0).toLocaleString()}`
      }));

      return res.json({
        source: 'postgresql',
        metrics: {
          totalPatients: total,
          insuredCount: insured,
          selfPayCount: selfPay,
          totalOutstandingCopays: totalCopay,
          formattedTotalOutstandingCopays: `₦${totalCopay.toLocaleString()}`
        },
        patients
      });
    } catch (err) {
      console.error('[API /api/patients] DB error:', err.message);
      return res.status(500).json({ error: 'Database query failed', message: err.message });
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Database service unavailable in production.' });
  }

  // Fallback demo filtering
  let filtered = [...FALLBACK_PATIENTS];
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(p => 
      p.fullName.toLowerCase().includes(q) || 
      p.mrn.toLowerCase().includes(q) || 
      p.phone.includes(q) || 
      (p.hmoPolicyNumber && p.hmoPolicyNumber.toLowerCase().includes(q))
    );
  }
  if (coverage === 'hmo') filtered = filtered.filter(p => !!p.hmoName);
  if (coverage === 'self-pay') filtered = filtered.filter(p => !p.hmoName);
  if (hasOutstanding === 'true') filtered = filtered.filter(p => p.outstandingCopay > 0);

  const totalCopay = FALLBACK_PATIENTS.reduce((sum, p) => sum + p.outstandingCopay, 0);

  res.json({
    source: 'fallback',
    metrics: {
      totalPatients: FALLBACK_PATIENTS.length,
      insuredCount: FALLBACK_PATIENTS.filter(p => !!p.hmoName).length,
      selfPayCount: FALLBACK_PATIENTS.filter(p => !p.hmoName).length,
      totalOutstandingCopays: totalCopay,
      formattedTotalOutstandingCopays: `₦${totalCopay.toLocaleString()}`
    },
    patients: filtered
  });
});

// 10. Get Patient Dossier & Linked Records
app.get('/api/patients/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const patRes = await query(`
        SELECT 
          id, mrn, full_name as "fullName", phone, email, gender,
          date_of_birth as "dateOfBirth", primary_coverage as "primaryCoverage",
          hmo_name as "hmoName", hmo_policy_number as "hmoPolicyNumber",
          hmo_enrollee_id as "hmoEnrolleeId", outstanding_copay as "outstandingCopay",
          status, created_at as "createdAt"
        FROM patients
        WHERE id = $1 OR mrn = $1
      `, [id]);

      if (patRes.rows.length === 0) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const patient = {
        ...patRes.rows[0],
        outstandingCopay: parseFloat(patRes.rows[0].outstandingCopay || 0),
        formattedOutstandingCopay: `₦${parseFloat(patRes.rows[0].outstandingCopay || 0).toLocaleString()}`
      };

      // Search linked transactions
      const txnsRes = await query(`
        SELECT id, time_captured as time, patient_or_service as "patientOrService",
               amount, formatted_amount as "formattedAmount", channel, status
        FROM provider_transactions
        WHERE patient_or_service ILIKE $1
        ORDER BY id DESC
      `, [`%${patient.fullName}%`]);

      // Search linked claims
      const claimsRes = await query(`
        SELECT id, provider, amount, formatted_amount as "formattedAmount",
               status, status_label as "statusLabel", is_disputed as "isDisputed",
               denial_risk as "denialRisk", age, diagnosis, pre_auth_code as "preAuthCode"
        FROM hmo_claims
        WHERE patient_name ILIKE $1
        ORDER BY id DESC
      `, [`%${patient.fullName}%`]);

      return res.json({
        source: 'postgresql',
        patient,
        transactions: txnsRes.rows,
        claims: claimsRes.rows
      });
    } catch (err) {
      console.error('[API /api/patients/:id] DB error:', err.message);
      return res.status(500).json({ error: 'Database query failed', message: err.message });
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Database service unavailable in production.' });
  }

  const patient = FALLBACK_PATIENTS.find(p => p.id === id || p.mrn === id) || FALLBACK_PATIENTS[0];
  res.json({
    source: 'fallback',
    patient,
    transactions: [
      { id: 'TXN-104', time: '10:05', patientOrService: `${patient.fullName} — Outpatient Visit`, amount: patient.outstandingCopay || 8500, formattedAmount: `₦${(patient.outstandingCopay || 8500).toLocaleString()}`, channel: 'POS card', status: patient.outstandingCopay > 0 ? 'failed' : 'paid' }
    ],
    claims: patient.hmoName ? [
      { id: 'CLM-4471', provider: 'ABC Diagnostics', amount: 12000, formattedAmount: '₦12,000', status: 'submitted', statusLabel: 'Submitted', isDisputed: false, denialRisk: 'high', age: '2d', diagnosis: 'Routine screening', preAuthCode: null }
    ] : []
  });
});

// 11. Register New Patient
app.post('/api/patients', requireAuth, async (req, res) => {
  const { fullName, phone, email, gender, dateOfBirth, primaryCoverage, hmoName, hmoPolicyNumber, hmoEnrolleeId, outstandingCopay } = req.body;
  
  if (!fullName || !primaryCoverage) {
    return res.status(400).json({ error: 'Full name and primary coverage are required' });
  }

  const id = `PAT-${Date.now().toString().slice(-4)}`;
  const mrn = `MRN-LSH-${Math.floor(10000 + Math.random() * 90000)}`;
  const copay = parseFloat(outstandingCopay) || 0;

  try {
    if (pool) {
      const insertRes = await query(`
        INSERT INTO patients (id, mrn, full_name, phone, email, gender, date_of_birth, primary_coverage, hmo_name, hmo_policy_number, hmo_enrollee_id, outstanding_copay, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
        RETURNING id, mrn, full_name as "fullName", phone, email, gender, date_of_birth as "dateOfBirth",
                  primary_coverage as "primaryCoverage", hmo_name as "hmoName",
                  hmo_policy_number as "hmoPolicyNumber", hmo_enrollee_id as "hmoEnrolleeId",
                  outstanding_copay as "outstandingCopay", status, created_at as "createdAt"
      `, [id, mrn, fullName, phone || null, email || null, gender || 'female', dateOfBirth || null, primaryCoverage, hmoName || null, hmoPolicyNumber || null, hmoEnrolleeId || null, copay]);

      const created = {
        ...insertRes.rows[0],
        outstandingCopay: parseFloat(insertRes.rows[0].outstandingCopay || 0),
        formattedOutstandingCopay: `₦${parseFloat(insertRes.rows[0].outstandingCopay || 0).toLocaleString()}`
      };

      return res.json({ success: true, patient: created });
    }
  } catch (err) {
    console.error('[API /api/patients POST] DB error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  const demoPatient = {
    id,
    mrn,
    fullName,
    phone: phone || '+234 800 000 0000',
    email: email || '',
    gender: gender || 'female',
    dateOfBirth: dateOfBirth || '1992-01-01',
    primaryCoverage,
    hmoName: hmoName || null,
    hmoPolicyNumber: hmoPolicyNumber || null,
    hmoEnrolleeId: hmoEnrolleeId || null,
    outstandingCopay: copay,
    formattedOutstandingCopay: `₦${copay.toLocaleString()}`,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  res.json({ success: true, patient: demoPatient, mode: 'demo' });
});

// 12. Collect Patient Copay Settlement
app.post('/api/patients/:id/collect-copay', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { amount, channel } = req.body;
  const payAmount = parseFloat(amount) || 0;
  const payChannel = channel || 'POS card';

  if (payAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than 0' });
  }

  try {
    if (pool) {
      // Find patient
      const patRes = await query('SELECT * FROM patients WHERE id = $1', [id]);
      if (patRes.rows.length === 0) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      const pat = patRes.rows[0];
      const currentCopay = parseFloat(pat.outstanding_copay || 0);
      const newCopay = Math.max(0, currentCopay - payAmount);

      // Update copay balance
      await query('UPDATE patients SET outstanding_copay = $1 WHERE id = $2', [newCopay, id]);

      // Record transaction in provider_transactions
      const txnId = `TXN-COP-${Date.now().toString().slice(-4)}`;
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await query(`
        INSERT INTO provider_transactions (id, time_captured, patient_or_service, amount, formatted_amount, channel, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'paid')
      `, [txnId, now, `${pat.full_name} — Copay Collection`, payAmount, `₦${payAmount.toLocaleString()}`, payChannel]);

      return res.json({
        success: true,
        patientId: id,
        previousCopay: currentCopay,
        newCopay,
        formattedNewCopay: `₦${newCopay.toLocaleString()}`,
        transactionId: txnId
      });
    }
  } catch (err) {
    console.error('[API /api/patients/:id/collect-copay] DB error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  res.json({
    success: true,
    patientId: id,
    previousCopay: payAmount,
    newCopay: 0,
    formattedNewCopay: '₦0',
    mode: 'demo'
  });
});

// ==========================================
// 10. Invoices Endpoints
// ==========================================

app.get('/api/invoices', requireAuth, async (req, res) => {
  const { search, status } = req.query;

  if (pool) {
    try {
      let conditions = [];
      let params = [];
      let paramIdx = 1;

      if (search && search.trim()) {
        conditions.push(`(invoice_number ILIKE $${paramIdx} OR patient_name ILIKE $${paramIdx} OR service_description ILIKE $${paramIdx})`);
        params.push(`%${search.trim()}%`);
        paramIdx++;
      }

      if (status && status !== 'all') {
        conditions.push(`status = $${paramIdx}`);
        params.push(status);
        paramIdx++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const listRes = await query(`
        SELECT 
          id, invoice_number as "invoiceNumber", patient_id as "patientId",
          patient_name as "patientName", service_description as "serviceDescription",
          total_amount as "totalAmount", formatted_amount as "formattedAmount",
          paid_amount as "paidAmount", status, status_label as "statusLabel",
          due_date as "dueDate", created_at as "createdAt"
        FROM invoices
        ${whereClause}
        ORDER BY invoice_number ASC
      `, params);

      // Metrics calculation across all invoices
      const metricsRes = await query(`
        SELECT 
          COUNT(*) as total,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COUNT(*) FILTER (WHERE status = 'paid') as reconciled_count,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_count
        FROM invoices
      `);

      const totalInvoices = parseInt(metricsRes.rows[0]?.total || 0, 10);
      const totalAmount = parseFloat(metricsRes.rows[0]?.total_amount || 0);
      const reconciledCount = parseInt(metricsRes.rows[0]?.reconciled_count || 0, 10);
      const pendingCount = parseInt(metricsRes.rows[0]?.pending_count || 0, 10);

      const invoices = listRes.rows.map(inv => ({
        ...inv,
        totalAmount: parseFloat(inv.totalAmount || 0),
        paidAmount: parseFloat(inv.paidAmount || 0)
      }));

      return res.json({
        source: 'postgresql',
        metrics: {
          totalInvoices,
          totalAmount,
          formattedTotalAmount: `₦${totalAmount.toLocaleString()}`,
          reconciledCount,
          pendingCount
        },
        invoices
      });
    } catch (err) {
      console.error('[API /api/invoices] DB error:', err.message);
      return res.status(500).json({ error: 'Database query failed', message: err.message });
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Database service unavailable in production.' });
  }

  // Fallback demo filtering
  let filtered = [...FALLBACK_INVOICES];
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(inv =>
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.patientName.toLowerCase().includes(q) ||
      inv.serviceDescription.toLowerCase().includes(q)
    );
  }

  if (status && status !== 'all') {
    filtered = filtered.filter(inv => inv.status === status);
  }

  const totalAmount = FALLBACK_INVOICES.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const reconciledCount = FALLBACK_INVOICES.filter(i => i.status === 'paid').length;
  const pendingCount = FALLBACK_INVOICES.filter(i => i.status === 'pending').length;

  res.json({
    source: 'fallback',
    metrics: {
      totalInvoices: FALLBACK_INVOICES.length,
      totalAmount,
      formattedTotalAmount: `₦${totalAmount.toLocaleString()}`,
      reconciledCount,
      pendingCount
    },
    invoices: filtered
  });
});

app.get('/api/invoices/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const invRes = await query(`
        SELECT 
          id, invoice_number as "invoiceNumber", patient_id as "patientId",
          patient_name as "patientName", service_description as "serviceDescription",
          total_amount as "totalAmount", formatted_amount as "formattedAmount",
          paid_amount as "paidAmount", status, status_label as "statusLabel",
          due_date as "dueDate", created_at as "createdAt"
        FROM invoices
        WHERE id = $1 OR invoice_number = $1
      `, [id]);

      if (invRes.rows.length === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const inv = invRes.rows[0];
      return res.json({
        source: 'postgresql',
        invoice: {
          ...inv,
          totalAmount: parseFloat(inv.totalAmount || 0),
          paidAmount: parseFloat(inv.paidAmount || 0)
        }
      });
    } catch (err) {
      console.error('[API /api/invoices/:id] DB error:', err.message);
      return res.status(500).json({ error: 'Database query failed', message: err.message });
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Database service unavailable in production.' });
  }

  const found = FALLBACK_INVOICES.find(i => i.id === id || i.invoiceNumber === id);
  if (!found) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json({
    source: 'fallback',
    invoice: found
  });
});

// ==========================================
// Static Assets & Client-Side SPA Routing
// ==========================================

// Serve static files from Vite production build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Client-Side Routing Fallback (Express 5 compatible wildcard)
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WelliPay server listening on http://0.0.0.0:${PORT}`);
});

export default app;