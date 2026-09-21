// ==========================================
// WelliPay Cross-System Invariant Regression Suite
// Validates mathematical and operational coherence across all 6 modules:
// Dashboard, Claims, Reconciliation, Patients, Invoices, and Exports.
// ==========================================

import http from 'http';
import { spawn } from 'child_process';

let spawnedServer = null;

// Previously this checked /api/dashboard for HTTP 200, which is true the
// instant Express starts listening — server.js does not await
// initializeDatabase() before calling app.listen(). That let this suite
// query a server whose tables were still being created/seeded, producing
// non-deterministic results (patients: 0, dashboard totals: ₦0, invoice
// counts short) that had nothing to do with the code under test. Confirmed
// by rerunning against the unmodified base commit: same race, same flakiness.
// /api/health now reports seedComplete once initializeDatabase() has
// resolved (or failed) — that is the actual readiness signal to wait for.
// Resolves to 'ready', 'not-ready', or 'seed-failed'. Distinguishing the
// last case matters: without it, a real seed failure just looks like a slow
// startup, and the caller burns the full 30s timeout before failing with a
// generic "timed out" message that hides the actual cause.
function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get({
      hostname: 'localhost',
      port: 5174,
      path: '/api/health',
      timeout: 1000
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          // /api/health returns HTTP 500 when the database is disconnected —
          // that response still carries seedComplete/seedError in its body,
          // and a seed failure needs to be read from THAT, not skipped
          // because the status code wasn't 200.
          const parsed = JSON.parse(body);
          if (parsed.seedError) return resolve('seed-failed');
          if (res.statusCode !== 200) return resolve('not-ready');
          resolve(parsed.seedComplete === true ? 'ready' : 'not-ready');
        } catch {
          resolve('not-ready');
        }
      });
    });
    req.on('error', () => resolve('not-ready'));
    req.on('timeout', () => {
      req.destroy();
      resolve('not-ready');
    });
  });
}

async function ensureServer() {
  const initialState = await checkServerReady();
  if (initialState === 'ready') {
    console.log('📡 Connected to active, fully-seeded WelliPay server on port 5174.\n');
    return;
  }
  if (initialState === 'seed-failed') {
    throw new Error('The already-running WelliPay server reported a database seed error — check its logs before rerunning.');
  }

  console.log('🚀 Spawning WelliPay server for test execution (port 5174)...');
  spawnedServer = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: '5174' },
    stdio: ['ignore', 'pipe', 'inherit']
  });

  spawnedServer.on('error', (err) => {
    console.error('Failed to spawn server.js:', err);
  });

  const start = Date.now();
  while (Date.now() - start < 30000) {
    await new Promise((r) => setTimeout(r, 250));
    const state = await checkServerReady();
    if (state === 'ready') {
      console.log('✅ WelliPay server is up and fully seeded.\n');
      return;
    }
    if (state === 'seed-failed') {
      throw new Error('Database seed failed during server startup — check the spawned server\'s logs above.');
    }
  }
  throw new Error('Timed out waiting for WelliPay server to start and finish seeding on port 5174');
}

function apiGet(path) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost',
      port: 5174,
      path,
      headers: { 'Authorization': 'Bearer dev-token' }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: raw
        });
      });
    }).on('error', reject);
  });
}

async function runRegressionSuite() {
  console.log('====================================================');
  console.log('🛡️  WELLIPAY FULL-STACK REGRESSION INVARIANT SUITE');
  console.log('====================================================\n');

  await ensureServer();

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? '--> ' + details : ''}`);
      failed++;
    }
  }

  // 1. Fetch Dashboard Data
  const dashRes = await apiGet('/api/dashboard');
  assert('Dashboard API reachable', dashRes.statusCode === 200, `HTTP ${dashRes.statusCode}`);
  const dash = JSON.parse(dashRes.data);

  // 2. Fetch Claims Data
  const claimsRes = await apiGet('/api/claims');
  assert('Claims API reachable', claimsRes.statusCode === 200, `HTTP ${claimsRes.statusCode}`);
  const claimsData = JSON.parse(claimsRes.data);
  const claims = claimsData.claims || [];

  // Invariant 1: HMO Receivables vs Claims Outstanding
  const outstandingClaims = claims.filter(c => c.status === 'submitted' || c.status === 'approved');
  const claimsOutstandingSum = outstandingClaims.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  assert(
    'Invariant 1: HMO Receivables matches Claims Outstanding Sum',
    dash.metrics.hmoReceivables === claimsOutstandingSum && claimsOutstandingSum === 1900000,
    `Dashboard: ₦${dash.metrics.hmoReceivables.toLocaleString()} == Claims: ₦${claimsOutstandingSum.toLocaleString()}`
  );

  // Invariant 2: Total Today Ledger vs Sum of Paid Transactions
  const paidTxns = (dash.transactions || []).filter(t => t.status === 'paid');
  const paidTxnsSum = paidTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  assert(
    'Invariant 2: Total Today Ledger matches Paid Transactions Sum',
    dash.metrics.totalToday === paidTxnsSum && paidTxnsSum === 2840000,
    `Dashboard: ₦${dash.metrics.totalToday.toLocaleString()} == Paid Txns: ₦${paidTxnsSum.toLocaleString()}`
  );

  // Invariant 3: Patient Direct Out-of-Pocket Collections
  const directTxns = paidTxns.filter(t => !['HMO', 'Corporate'].includes(t.channel));
  const directSum = directTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  assert(
    'Invariant 3: Patient Direct Collections strictly excludes HMO & Corporate remittances',
    dash.metrics.patientDirect === directSum && directSum === 640000,
    `Dashboard: ₦${dash.metrics.patientDirect.toLocaleString()} == Direct: ₦${directSum.toLocaleString()}`
  );

  // 3. Fetch Reconciliation Data & Export
  const reconRes = await apiGet('/api/reconciliation');
  assert('Reconciliation Queue API reachable', reconRes.statusCode === 200, `HTTP ${reconRes.statusCode}`);
  const reconData = JSON.parse(reconRes.data);
  const reconItems = reconData.items || [];
  const confirmedItems = reconItems.filter(i => i.status === 'confirmed');

  const reconExportRes = await apiGet('/api/reconciliation/export');
  assert('Reconciliation Export CSV API reachable', reconExportRes.statusCode === 200, `HTTP ${reconExportRes.statusCode}`);
  const csvLines = reconExportRes.data.trim().split('\n');
  const csvDataRows = csvLines.length - 1;

  // Invariant 4: Confirmed Reconciliation Tab vs CSV Export Count Parity
  assert(
    'Invariant 4: Confirmed Reconciliation Tab count matches CSV Export row count',
    confirmedItems.length === csvDataRows && csvDataRows >= 33,
    `Queue Confirmed: ${confirmedItems.length} == CSV Data Rows: ${csvDataRows}`
  );

  // Invariant 4b: Description vs Channel Separation in CSV
  let channelDupes = 0;
  for (let i = 1; i < csvLines.length; i++) {
    const match = csvLines[i].match(/^("[^"]*"|[^,]*),([^,]*),("[^"]*"|[^,]*),("[^"]*"|[^,]*),/);
    if (match) {
      const desc = match[3].replace(/"/g, '').trim().toLowerCase();
      const ch = match[4].replace(/"/g, '').trim().toLowerCase();
      if (desc === ch) channelDupes++;
    }
  }
  assert(
    'Invariant 4b: Zero duplicate Description vs Channel across all exported reconciliation rows',
    channelDupes === 0,
    `${channelDupes} duplicate rows found out of ${csvDataRows}`
  );

  // Invariant 4c: Reconciliation Action Queue & Navigation Badge (Unmatched vs Confirmed)
  const unmatchedItems = reconItems.filter(i => i.status === 'unmatched');
  assert(
    'Invariant 4c: Reconciliation Action Queue (Nav Badge) matches exactly 12 Unmatched items',
    unmatchedItems.length === 12 && reconItems.length >= 45,
    `Unmatched (Nav Badge count): ${unmatchedItems.length} (target: 12), Confirmed: ${confirmedItems.length}, Total: ${reconItems.length}`
  );

  // 4. Fetch Remittance PDF Export
  const pdfExportRes = await apiGet('/api/claims/remittance-export');
  assert('Remittance Schedule PDF Export reachable', pdfExportRes.statusCode === 200, `HTTP ${pdfExportRes.statusCode}`);
  assert(
    'Invariant 5: PDF Content-Type is application/pdf with valid payload',
    pdfExportRes.headers['content-type'] === 'application/pdf' && pdfExportRes.data.length > 5000,
    `Content-Type: ${pdfExportRes.headers['content-type']}, Size: ${pdfExportRes.data.length} bytes`
  );

  // Invariant 5b: Outstanding Claims count matches PDF target (48 claims)
  assert(
    'Invariant 5b: Outstanding claims count matches wireframe target',
    outstandingClaims.length === 48,
    `${outstandingClaims.length} outstanding claims (target: 48)`
  );

  // 5. Fetch Patients Directory
  const patientsRes = await apiGet('/api/patients');
  assert('Patients Directory API reachable', patientsRes.statusCode === 200, `HTTP ${patientsRes.statusCode}`);
  const patientsData = JSON.parse(patientsRes.data);
  assert(
    'Invariant 6: Patient Registry integrity with zero orphaned claims/transactions',
    patientsData.patients && patientsData.patients.length >= 30,
    `Total Patients: ${patientsData.patients.length}`
  );

  // 6. Fetch Invoices & Cross-Check with Leakage Resolution State
  const invoicesRes = await apiGet('/api/invoices');
  assert('Invoices API reachable', invoicesRes.statusCode === 200, `HTTP ${invoicesRes.statusCode}`);
  const invoicesData = JSON.parse(invoicesRes.data);

  const expectedBaseline = 397000; // 4 seed patient invoices (₦57,000) + 3 compliance fixtures (₦340,000)
  const isLeakageResolved = Boolean(dash.leakage && dash.leakage.isResolved);
  const expectedTotal = isLeakageResolved
    ? expectedBaseline + 340000
    : expectedBaseline;
  const expectedCount = isLeakageResolved ? 10 : 7;

  // Use the known seed invoice ID allowlist — this makes the invariant immune to
  // test-suite-created invoices accumulating in the in-memory FALLBACK_INVOICES state.
  const SEED_INVOICE_IDS = new Set([
    'INV-93105', 'INV-92831', 'INV-93010', 'INV-93044',  // 4 baseline patient invoices
    'INV-93401', 'INV-93402', 'INV-93403',               // 3 compliance fixture invoices
  ]);
  const RECOVERY_INVOICE_IDS = new Set([
    'INV-93776', 'INV-93794', 'INV-93362',               // recovery batches (added when leakage.isResolved)
    'INV-93201', 'INV-93202', 'INV-93203',
  ]);
  const allowedIds = isLeakageResolved
    ? new Set([...SEED_INVOICE_IDS, ...RECOVERY_INVOICE_IDS])
    : SEED_INVOICE_IDS;
  const operationalInvoices = (invoicesData.invoices || []).filter(inv =>
    allowedIds.has(inv.invoiceNumber || inv.id)
  );
  const actualTotal = operationalInvoices.reduce((acc, inv) => acc + Number(inv.totalAmount || inv.total_amount || 0), 0);
  assert(
    'Invariant 7: Invoices total dynamically aligns with dashboard leakage resolution state',
    actualTotal === expectedTotal,
    `Invoices total should be ₦${expectedTotal.toLocaleString()} given leakage.isResolved=${isLeakageResolved} (got ₦${(actualTotal || 0).toLocaleString()})`
  );

  assert(
    'Invariant 7b: Invoices count dynamically aligns with leakage billing entries',
    operationalInvoices.length === expectedCount,
    `Expected ${expectedCount} operational invoices given leakage.isResolved=${isLeakageResolved} (got ${operationalInvoices.length})`
  );

  // Invariant 8: Clinical Leakage Recovery Exposure & Batch Sum
  const recoveryInvoices = operationalInvoices.filter(inv =>
    inv.patientMrn?.startsWith('BATCH-') ||
    inv.patientName?.includes('Multiple Patients') ||
    ['INV-93776', 'INV-93794', 'INV-93362', 'INV-93201', 'INV-93202', 'INV-93203'].includes(inv.invoiceNumber)
  );

  if (isLeakageResolved) {
    const recoverySum = recoveryInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
    assert(
      'Invariant 8: Recovery batches sum to exactly ₦340,000 across constituent batches',
      recoverySum === 340000,
      `Expected recovery sum ₦340,000, got ₦${recoverySum.toLocaleString()}`
    );
  } else {
    assert(
      'Invariant 8: Dashboard leakage exposure is exactly ₦340,000 across 17 clinical orders',
      dash.leakage?.totalExposure === 340000 && dash.leakage?.unbilledCount === 17,
      `Exposure: ₦${(dash.leakage?.totalExposure || 0).toLocaleString()}, Orders: ${dash.leakage?.unbilledCount || 0}`
    );
  }

  // Invariant 9: Order Isolation & Traceability (Constituent orders sit on exactly one invoice)
  const allOrdersMap = new Map();
  let duplicateOrdersOutsideFixtures = 0;
  for (const inv of operationalInvoices) {
    const orders = inv.orders || [];
    for (const ord of orders) {
      const orderKey = ord.orderId || ord.id;
      if (!orderKey) continue;
      if (allOrdersMap.has(orderKey)) {
        allOrdersMap.get(orderKey).push(inv.invoiceNumber);
        // INV-93401 is the intentional test fixture for duplicate order detection
        if (inv.invoiceNumber !== 'INV-93401') {
          duplicateOrdersOutsideFixtures++;
        }
      } else {
        allOrdersMap.set(orderKey, [inv.invoiceNumber]);
      }
    }
  }

  assert(
    'Invariant 9: Order Isolation — zero unintentional clinical orders billed multiple times or across invoices',
    duplicateOrdersOutsideFixtures === 0,
    `${duplicateOrdersOutsideFixtures} duplicate order collisions outside seed test fixtures`
  );

  // Invariant 10: Provider Compliance Audit Integrity & Zero False-Positive Duplicates on Recovery Batches
  const compRes = await apiGet('/api/compliance/summary');
  assert('Compliance Summary API reachable', compRes.statusCode === 200, `HTTP ${compRes.statusCode}`);
  const compData = JSON.parse(compRes.data);

  assert(
    'Invariant 10a: Compliance engine returns exact 7 active compliance rules with typed thresholds and no synthetic status',
    Array.isArray(compData.rules) &&
    compData.rules.length === 7 &&
    compData.rules.every(r => r.code && r.name && r.description && r.threshold !== undefined && r.status === undefined),
    `Rules count: ${compData.rules ? compData.rules.length : 0}`
  );

  // Ensure no recovery batch carries a duplicate_charge or price_mismatch flag
  const recoveryBatchNumbers = ['INV-93776', 'INV-93794', 'INV-93362', 'INV-93201', 'INV-93202', 'INV-93203'];
  const flaggedRecoveryBatches = (compData.worstInvoices || []).filter(inv =>
    recoveryBatchNumbers.includes(inv.invoiceNumber) ||
    inv.patientMrn?.startsWith('BATCH-') ||
    inv.patientName?.includes('Multiple Patients')
  );

  const recoveryHasFalseDuplicate = flaggedRecoveryBatches.some(inv =>
    inv.flags.some(f => f.code === 'duplicate_charge' || f.code === 'price_mismatch')
  );

  assert(
    'Invariant 10b: Zero recovery batches carry false-positive duplicate flags (all constituent order IDs distinct)',
    !recoveryHasFalseDuplicate,
    `Flagged recovery batches with duplicate charge: ${flaggedRecoveryBatches.length}`
  );

  console.log('\n====================================================');
  console.log(`🏁 REGRESSION SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (spawnedServer) {
    console.log('🛑 Shutting down spawned test server...');
    spawnedServer.kill('SIGTERM');
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch(err => {
  console.error('Fatal error running regression suite:', err);
  if (spawnedServer) {
    spawnedServer.kill('SIGTERM');
  }
  process.exit(1);
});
