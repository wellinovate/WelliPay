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
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
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
  console.log('📝 WELLIPAY PROVIDER COMPLIANCE DASHBOARD TEST SUITE');
  console.log('====================================================\n');

  console.log('1. Baseline summary & Exact 7 Rules Verification...');
  const before = await httpJson('/api/compliance/summary');
  assert(before.statusCode === 200, `Summary returns HTTP 200 (got ${before.statusCode})`);
  
  // Rule verification: exactly 7 rules with typed thresholds and no synthetic status
  assert(Array.isArray(before.body.rules) && before.body.rules.length === 7, `rules array contains exactly 7 rules (got ${before.body.rules?.length})`);
  const expectedCodes = [
    'duplicate_charge',
    'price_mismatch',
    'missing_preauth',
    'copay_exceeds_plan_rule',
    'billed_self_pay_despite_coverage',
    'membership_not_verified',
    'authorized_amount_mismatch',
  ];
  const ruleCodes = before.body.rules.map(r => r.code);
  assert(expectedCodes.every(c => ruleCodes.includes(c)), `All 7 expected rule codes present: ${expectedCodes.join(', ')}`);
  assert(before.body.rules.every(r => r.status === undefined), 'All rules dropped the synthetic status field');
  assert(before.body.rules.every(r => r.threshold === null || (typeof r.threshold?.value === 'number' && typeof r.threshold?.unit === 'string')),
    'All rule thresholds are typed { value, unit } or null');

  // Baseline counts
  const baselineInvoiceCount = before.body.invoiceCount;
  const baselineCritical = before.body.criticalInvoiceCount;

  // Verify Seed Test Fixtures
  console.log('\n2. Verifying seed test fixtures (INV-93401, INV-93402, INV-93403)...');
  const fixDup = before.body.worstInvoices.find(i => i.invoiceNumber === 'INV-93401');
  const fixTariff = before.body.worstInvoices.find(i => i.invoiceNumber === 'INV-93402');
  const fixPreauth = before.body.worstInvoices.find(i => i.invoiceNumber === 'INV-93403');

  assert(!!fixDup && fixDup.worstSeverity === 'critical', 'INV-93401 seeded with duplicate charge critical violation');
  assert(fixDup?.flags.some(f => f.code === 'duplicate_charge' && f.matchingRecord?.details?.type === 'line_item'),
    'INV-93401 flag contains typed matchingRecord details (type: line_item)');

  assert(!!fixTariff && (fixTariff.worstSeverity === 'warning' || fixTariff.isResolved), 'INV-93402 seeded with tariff mismatch warning violation');
  assert(fixTariff?.flags.some(f => f.code === 'price_mismatch' && f.matchingRecord?.details?.type === 'catalogue'),
    'INV-93402 flag contains typed catalogue benchmark details (type: catalogue, variance: +19000)');

  assert(!!fixPreauth && fixPreauth.worstSeverity === 'critical', 'INV-93403 seeded with missing pre-authorisation critical violation');
  assert(fixPreauth?.flags.some(f => f.code === 'missing_preauth' && f.matchingRecord?.details?.type === 'plan_rule'),
    'INV-93403 flag contains typed plan_rule benchmark details (type: plan_rule, threshold: 100000)');

  // Constituent orders integrity on fixtures
  assert(fixDup?.constituentOrders?.length === 2 && fixDup.constituentOrders.every(o => o.id && o.serviceType && o.amount),
    'INV-93401 constituent orders store id, serviceType, amount');

  // --- Create a duplicate-charge invoice with explicit order ID (warning <= ₦50k) ---
  console.log('\n3. Creating an invoice with a duplicate clinical order (warning: ₦24,000 <= ₦50,000 threshold)...');
  const catRes = await httpJson('/api/directory/catalogue/PRV-LAG-01');
  const fbc = catRes.body.catalogue.find(c => c.masterServiceId === 1) || { serviceName: 'Full Blood Count', price: 12000, masterServiceId: 1 };
  const dupOrderRes = await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_name: 'Compliance Test Dup', patient_mrn: 'MRN-LSH-90001',
      payer_type: 'self-pay',
      line_items: [
        { orderId: 'ORD-DUP-DYNAMIC-01', description: fbc.serviceName, quantity: 1, unitPrice: Number(fbc.price), totalAmount: Number(fbc.price), masterServiceId: fbc.masterServiceId, providerId: 'PRV-LAG-01' },
        { orderId: 'ORD-DUP-DYNAMIC-01', description: fbc.serviceName, quantity: 1, unitPrice: Number(fbc.price), totalAmount: Number(fbc.price), masterServiceId: fbc.masterServiceId, providerId: 'PRV-LAG-01' },
      ],
      total_amount: Number(fbc.price) * 2,
    },
  });
  assert(dupOrderRes.statusCode === 200, `Created duplicate order invoice (HTTP ${dupOrderRes.statusCode})`);

  // --- Create a missing-preauth invoice (critical) ---
  console.log('4. Creating an HMO invoice above the plan pre-auth threshold with no pre-auth code (critical)...');
  const preauthRes = await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_name: 'Compliance Test Preauth', patient_mrn: 'MRN-LSH-90002',
      payer_type: 'hmo', payer_name: 'Reliance HMO', plan_name: 'Silver Plan',
      service_description: 'MRI Lumbar Spine', total_amount: 150000,
    },
  });
  assert(preauthRes.statusCode === 200, `Created missing preauth invoice (HTTP ${preauthRes.statusCode})`);

  console.log('\n5. Fetching updated summary and verifying flag classifications...');
  const after = await httpJson('/api/compliance/summary');
  assert(after.body.invoiceCount === baselineInvoiceCount + 2, `invoiceCount increased by 2 (${after.body.invoiceCount})`);
  assert(after.body.criticalInvoiceCount === baselineCritical + 1, `criticalInvoiceCount increased by 1 (${after.body.criticalInvoiceCount})`);

  const worstDup = after.body.worstInvoices.find(i => i.patientName === 'Compliance Test Dup');
  const worstPreauth = after.body.worstInvoices.find(i => i.patientName === 'Compliance Test Preauth');
  assert(!!worstDup && worstDup.worstSeverity === 'warning', 'Duplicate-charge invoice (₦24k) appears in worstInvoices as warning');
  assert(!!worstPreauth && worstPreauth.worstSeverity === 'critical', 'Missing-preauth invoice appears in worstInvoices as critical');

  // --- Resolution Workflow Verification ---
  console.log('\n6. Testing resolution workflow on INV-93402 (Tariff mismatch)...');
  // Attempt invalid resolution (missing reason)
  const invalidRes = await httpJson('/api/compliance/invoices/INV-93402/resolve', {
    method: 'POST',
    body: {},
  });
  assert(invalidRes.statusCode === 400, `Missing reason rejected with HTTP 400 (got ${invalidRes.statusCode})`);

  // Valid resolution (resolving invoice)
  const validRes = await httpJson('/api/compliance/invoices/INV-93402/resolve', {
    method: 'POST',
    body: {
      reason: 'Special corporate agreement tariff approved for executive wellness client',
    },
  });
  assert(validRes.statusCode === 200, `Valid resolution accepted (HTTP ${validRes.statusCode})`);
  assert(validRes.body.resolution?.resolvedBy === 'billing@lagoonhospital.com',
    `Server session enforced resolvedBy: ${validRes.body.resolution?.resolvedBy}`);

  // Fetch summary after resolution
  const afterResolution = await httpJson('/api/compliance/summary');
  const resolvedInv = afterResolution.body.worstInvoices.find(i => i.invoiceNumber === 'INV-93402');
  assert(resolvedInv?.isResolved === true, 'INV-93402 is marked isResolved: true in summary');
  const priceMismatchRule = afterResolution.body.rules.find(r => r.code === 'price_mismatch');
  assert(priceMismatchRule?.resolvedCount >= 1, `price_mismatch resolvedCount incremented to ${priceMismatchRule?.resolvedCount}`);

  // --- Pre-auth stats ---
  console.log('\n7. Confirming pre-authorisation turnaround stats reflect a decided request...');
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
