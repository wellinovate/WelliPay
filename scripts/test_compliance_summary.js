import 'dotenv/config';
import http from 'http';

function httpJson(path, options = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = options.body ? JSON.stringify(options.body) : null;
    const req = http.request({
      hostname: 'localhost', port: 5174, path, method: options.method || 'GET',
      headers: {
        Authorization: 'Bearer dev-token',
        ...(bodyStr ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`   ✅ ${msg}`);
  else { console.error(`   ❌ ${msg}`); failures++; }
}

async function run() {
  console.log('====================================================');
  console.log('📝 WELLIPAY PROVIDER COMPLIANCE DASHBOARD TEST');
  console.log('====================================================\n');

  console.log('1. Baseline summary before adding any flagged invoices...');
  const before = await httpJson('/api/compliance/summary');
  assert(before.statusCode === 200, `Summary returns HTTP 200 (got ${before.statusCode})`);
  const baselineInvoiceCount = before.body.invoiceCount;
  const baselineCritical = before.body.criticalInvoiceCount;

  // --- Create a duplicate-charge invoice (warning) ---
  console.log('\n2. Creating an invoice with a duplicate charge (warning)...');
  const catRes = await httpJson('/api/directory/catalogue/PRV-LAG-01');
  const fbc = catRes.body.catalogue.find(c => c.masterServiceId === 1);
  await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_name: 'Compliance Test Dup', patient_mrn: 'MRN-LSH-90001',
      payer_type: 'self-pay',
      line_items: [
        { description: fbc.serviceName, quantity: 1, unitPrice: Number(fbc.price), totalAmount: Number(fbc.price), masterServiceId: fbc.masterServiceId, providerId: 'PRV-LAG-01' },
        { description: fbc.serviceName, quantity: 1, unitPrice: Number(fbc.price), totalAmount: Number(fbc.price), masterServiceId: fbc.masterServiceId, providerId: 'PRV-LAG-01' },
      ],
      total_amount: Number(fbc.price) * 2,
    },
  });

  // --- Create a missing-preauth invoice (critical) ---
  console.log('3. Creating an HMO invoice above the plan pre-auth threshold with no pre-auth code (critical)...');
  await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_name: 'Compliance Test Preauth', patient_mrn: 'MRN-LSH-90002',
      payer_type: 'hmo', payer_name: 'Reliance HMO', plan_name: 'Silver Plan',
      service_description: 'MRI Lumbar Spine', total_amount: 150000,
    },
  });

  console.log('\n4. Fetching the updated summary...');
  const after = await httpJson('/api/compliance/summary');
  assert(after.body.invoiceCount === baselineInvoiceCount + 2, `invoiceCount increased by 2 (${after.body.invoiceCount})`);
  assert(after.body.criticalInvoiceCount === baselineCritical + 1, `criticalInvoiceCount increased by 1 (${after.body.criticalInvoiceCount})`);
  assert((after.body.flagCounts.duplicate_charge || 0) >= 1, `flagCounts.duplicate_charge counted (${after.body.flagCounts.duplicate_charge})`);
  assert((after.body.flagCounts.missing_preauth || 0) >= 1, `flagCounts.missing_preauth counted (${after.body.flagCounts.missing_preauth})`);

  const worstDup = after.body.worstInvoices.find(i => i.patientName === 'Compliance Test Dup');
  const worstPreauth = after.body.worstInvoices.find(i => i.patientName === 'Compliance Test Preauth');
  assert(!!worstDup && worstDup.worstSeverity === 'warning', 'Duplicate-charge invoice appears in worstInvoices as warning');
  assert(!!worstPreauth && worstPreauth.worstSeverity === 'critical', 'Missing-preauth invoice appears in worstInvoices as critical');

  // Critical-severity invoices should sort before warnings.
  const firstCriticalIdx = after.body.worstInvoices.findIndex(i => i.worstSeverity === 'critical');
  const firstWarningIdx = after.body.worstInvoices.findIndex(i => i.worstSeverity === 'warning');
  if (firstCriticalIdx !== -1 && firstWarningIdx !== -1) {
    assert(firstCriticalIdx < firstWarningIdx, 'Critical invoices sort before warnings in worstInvoices');
  }

  // --- Pre-auth stats ---
  console.log('\n5. Confirming pre-auth turnaround stats reflect a decided request...');
  const paCreate = await httpJson('/api/preauth-requests', {
    method: 'POST',
    body: {
      patient_name: 'Compliance Test PA', payer_name: 'Reliance HMO', provider_name: 'Lagoon Specialist Hospital',
      service_description: 'CT Scan', requested_amount: 90000,
    },
  });
  const paId = paCreate.body.preAuth.id;
  await httpJson(`/api/preauth-requests/${paId}/status`, { method: 'PATCH', body: { status: 'submitted' } });
  await httpJson(`/api/preauth-requests/${paId}/status`, { method: 'PATCH', body: { status: 'under_review' } });
  await httpJson(`/api/preauth-requests/${paId}/status`, { method: 'PATCH', body: { status: 'rejected', rejection_reason: 'Not covered' } });

  const finalSummary = await httpJson('/api/compliance/summary');
  assert(finalSummary.body.preAuth.totalRequests >= 1, `preAuth.totalRequests reflects the new request (${finalSummary.body.preAuth.totalRequests})`);
  assert(finalSummary.body.preAuth.rejectedCount >= 1, `preAuth.rejectedCount reflects the rejection (${finalSummary.body.preAuth.rejectedCount})`);
  assert(finalSummary.body.preAuth.rejectionRate !== null && finalSummary.body.preAuth.rejectionRate > 0,
    `preAuth.rejectionRate computed (${finalSummary.body.preAuth.rejectionRate}%)`);
  assert(finalSummary.body.preAuth.avgTurnaroundHours !== null, `preAuth.avgTurnaroundHours computed (${finalSummary.body.preAuth.avgTurnaroundHours}h)`);

  console.log('\n====================================================');
  if (failures === 0) console.log('🏁 ALL PROVIDER COMPLIANCE DASHBOARD TESTS PASSED');
  else console.log(`🔥 ${failures} ASSERTION(S) FAILED`);
  console.log('====================================================');

  process.exit(failures === 0 ? 0 : 1);
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
