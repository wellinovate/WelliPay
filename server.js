import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, checkDatabaseHealth, initializeDatabase, query } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5174;

app.use(express.json());

// Initialize database tables on server start
initializeDatabase().catch(err => {
  console.error('[Server] Database initialization failed:', err);
});

// 1. Comprehensive Health Check (checks process, server, and PostgreSQL)
app.get('/api/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  
  res.status(dbHealth.status === 'error' ? 500 : 200).json({
    status: dbHealth.connected ? 'healthy' : 'degraded',
    service: 'WelliPay Healthcare Financial Operating System',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    port: PORT,
    database: dbHealth,
  });
});

// 2. Database Status Check Endpoint
app.get('/api/database/status', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.json(dbHealth);
});

// 3. API: Get Reconciliation Queue
app.get('/api/reconciliation', async (req, res) => {
  try {
    if (pool) {
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
    }
  } catch (err) {
    console.error('[API /api/reconciliation] DB error, falling back to mock:', err.message);
  }

  // Graceful fallback if database is not active yet
  res.json({ source: 'fallback', message: 'Database query executed with local state fallback.' });
});

// 4. API: Single Confirm Reconciliation Item
app.post('/api/reconciliation/confirm', async (req, res) => {
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

// 5. API: Bulk Confirm Matches (Row-locked atomic transaction)
app.post('/api/reconciliation/bulk-confirm', async (req, res) => {
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

        // Acquire row lock and update status
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

// 6. API: Get HMO Claims
app.get('/api/claims', async (req, res) => {
  try {
    if (pool) {
      const result = await query(`
        SELECT 
          id, provider, amount, formatted_amount as "formattedAmount",
          status, status_label as "statusLabel", is_disputed as "isDisputed",
          denial_risk as "denialRisk", age, patient_name as "patientName",
          diagnosis, pre_auth_code as "preAuthCode"
        FROM hmo_claims
        ORDER BY id ASC
      `);
      return res.json({ source: 'postgresql', claims: result.rows });
    }
  } catch (err) {
    console.error('[API /api/claims] DB error:', err.message);
  }

  res.json({ source: 'fallback', message: 'HMO claims ready.' });
});

// 7. API: Resolve Claim Dispute
app.post('/api/claims/:id/resolve', async (req, res) => {
  const { id } = req.params;
  const { resolution } = req.body; // 'approve' or 'reject'

  try {
    if (pool) {
      const newStatus = resolution === 'approve' ? 'approved' : 'rejected';
      const statusLabel = resolution === 'approve' ? 'Approved (Dispute Settled)' : 'Rejected Final';
      await query(`
        UPDATE hmo_claims
        SET is_disputed = false, status = $1, status_label = $2, denial_risk = 'low'
        WHERE id = $3
      `, [newStatus, statusLabel, id]);
      return res.json({ success: true, id, status: newStatus, statusLabel });
    }
  } catch (err) {
    console.error('[API /api/claims/:id/resolve] DB error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  res.json({ success: true, id, resolution, mode: 'demo' });
});

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
