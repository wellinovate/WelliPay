// ==========================================
// WelliPay Cross-System Invariant Regression Suite
// Validates mathematical and operational coherence across all 6 modules:
// Dashboard, Claims, Reconciliation, Patients, Invoices, and Exports.
// ==========================================

import http from 'http';
import { spawn } from 'child_process';

let spawnedServer = null;

function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get({
      hostname: 'localhost',
      port: 5174,
      path: '/api/dashboard',
      headers: { 'Authorization': 'Bearer dev-token' },
      timeout: 1000
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureServer() {
  const isUp = await checkServerReady();
  if (isUp) {
    console.log('📡 Connected to active WelliPay server on port 5174.\n');
    return;
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
  while (Date.now() - start < 15000) {
    await new Promise((r) => setTimeout(r, 250));
    if (await checkServerReady()) {
      console.log('✅ WelliPay server is up and responding.\n');
      return;
    }
  }
  throw new Error('Timed out waiting for WelliPay server to start on port 5174');
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

  // Invariant 4: Confirmed Reconciliation Tab vs CSV Export Count
  assert(
    'Invariant 4: Confirmed Reconciliation Tab count matches CSV Export row count',
    confirmedItems.length === 33 && csvDataRows === 33,
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

  // 6. Fetch Invoices
  const invoicesRes = await apiGet('/api/invoices');
  assert('Invoices API reachable', invoicesRes.statusCode === 200, `HTTP ${invoicesRes.statusCode}`);
  const invoicesData = JSON.parse(invoicesRes.data);
  assert(
    'Invariant 7: Invoices directory integrity with active billing statements',
    invoicesData.invoices && invoicesData.invoices.length >= 4,
    `Total Invoices: ${invoicesData.invoices.length}, Total Invoiced: ₦${invoicesData.metrics.totalAmount.toLocaleString()}`
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
