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
  console.log('📝 WELLIPAY PRE-AUTHORIZATION TRACKER TEST');
  console.log('====================================================\n');

  // --- Test 1: create a request ---
  console.log('1. Submitting a new pre-authorization request...');
  const createRes = await httpJson('/api/preauth-requests', {
    method: 'POST',
    body: {
      patient_name: 'Amaka Eze',
      patient_mrn: 'MRN-LSH-10099',
      provider_name: 'Lagoon Specialist Hospital',
      payer_name: 'Reliance HMO',
      service_description: 'MRI — Lumbar Spine',
      clinical_justification: 'Persistent lower back pain, suspected disc herniation.',
      requested_amount: 120000,
    },
  });
  assert(createRes.statusCode === 201, `Creation returns HTTP 201 (got ${createRes.statusCode})`);
  const paId = createRes.body.preAuth?.id;
  assert(!!paId && /^PA-\d+$/.test(paId), `Pre-auth id assigned in PA-##### form (${paId})`);
  assert(createRes.body.preAuth?.status === 'requested', 'Initial status is requested');

  // --- Test 2: list includes it ---
  console.log('\n2. Confirming it appears in the list endpoint...');
  const listRes = await httpJson('/api/preauth-requests');
  const found = (listRes.body.preAuths || []).find(p => p.id === paId);
  assert(!!found, 'New request appears in GET /api/preauth-requests');
  assert(found?.formattedAmount === '₦120,000', `formattedAmount correct (${found?.formattedAmount})`);

  // --- Test 3: invalid transition rejected ---
  console.log('\n3. Attempting to skip straight to "approved" (should be rejected)...');
  const badTransition = await httpJson(`/api/preauth-requests/${paId}/status`, {
    method: 'PATCH',
    body: { status: 'approved', approved_amount: 96000 },
  });
  assert(badTransition.statusCode === 409, `Skipping stages rejected with HTTP 409 (got ${badTransition.statusCode})`);

  // --- Test 4: legitimate forward progression ---
  console.log('\n4. Advancing through the legitimate sequence: submitted -> under_review -> approved...');
  const toSubmitted = await httpJson(`/api/preauth-requests/${paId}/status`, { method: 'PATCH', body: { status: 'submitted', note: 'Submitted to Reliance HMO portal' } });
  assert(toSubmitted.statusCode === 200, `requested -> submitted succeeds (HTTP ${toSubmitted.statusCode})`);

  const toReview = await httpJson(`/api/preauth-requests/${paId}/status`, { method: 'PATCH', body: { status: 'under_review' } });
  assert(toReview.statusCode === 200, `submitted -> under_review succeeds (HTTP ${toReview.statusCode})`);

  const approveNoAmount = await httpJson(`/api/preauth-requests/${paId}/status`, { method: 'PATCH', body: { status: 'approved' } });
  assert(approveNoAmount.statusCode === 400, `Approving without approved_amount rejected with HTTP 400 (got ${approveNoAmount.statusCode})`);

  const toApproved = await httpJson(`/api/preauth-requests/${paId}/status`, {
    method: 'PATCH',
    body: { status: 'approved', approved_amount: 96000, auth_code: 'REL-AUTH-88213', note: 'Approved at 80% of tariff' },
  });
  assert(toApproved.statusCode === 200, `under_review -> approved succeeds (HTTP ${toApproved.statusCode})`);
  assert(Number(toApproved.body.preAuth?.approved_amount) === 96000, `approved_amount recorded correctly (${toApproved.body.preAuth?.approved_amount})`);
  assert(toApproved.body.preAuth?.auth_code === 'REL-AUTH-88213', 'auth_code recorded correctly');

  // --- Test 5: timeline reflects every stage ---
  console.log('\n5. Confirming the timeline recorded every stage in order...');
  const detailRes = await httpJson(`/api/preauth-requests/${paId}`);
  const stages = (detailRes.body.timeline || []).map(e => e.status);
  assert(JSON.stringify(stages) === JSON.stringify(['requested', 'submitted', 'under_review', 'approved']),
    `Timeline in order: ${stages.join(' -> ')}`);

  // --- Test 6: create an invoice and link it ---
  console.log('\n6. Creating an invoice and linking this approved pre-auth to it...');
  const invRes = await httpJson('/api/invoices', {
    method: 'POST',
    body: { patient_name: 'Amaka Eze', patient_mrn: 'MRN-LSH-10099', service_description: 'MRI — Lumbar Spine', total_amount: 120000 },
  });
  const invoiceNumber = invRes.body.invoice?.invoice_number;
  assert(!!invoiceNumber, `Invoice created (${invoiceNumber})`);

  const linkRes = await httpJson(`/api/preauth-requests/${paId}/link-invoice`, {
    method: 'PATCH',
    body: { invoice_number: invoiceNumber },
  });
  assert(linkRes.statusCode === 200, `Link-to-invoice succeeds (HTTP ${linkRes.statusCode})`);

  const afterLink = await httpJson(`/api/preauth-requests/${paId}`);
  assert(!!afterLink.body.preAuth?.invoiceId, 'pre_authorizations.invoice_id populated after linking');

  const invoiceDetail = await httpJson(`/api/invoices`);
  // fallback: just re-fetch via public endpoint since /api/invoices GET may paginate differently
  const publicInv = await new Promise((resolve, reject) => {
    http.get({ hostname: 'localhost', port: 5174, path: `/api/public/invoice/${invoiceNumber}` }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
  assert(publicInv.invoice?.pre_auth_code === 'REL-AUTH-88213', `Invoice's pre_auth_code mirrors the auth code (${publicInv.invoice?.pre_auth_code})`);

  // --- Test 7: rejection path on a separate request ---
  console.log('\n7. Testing the rejection path on a second, separate request...');
  const createRes2 = await httpJson('/api/preauth-requests', {
    method: 'POST',
    body: {
      patient_name: 'Tobenna Okafor', payer_name: 'AXA Mansard', provider_name: 'Lagoon Specialist Hospital',
      service_description: 'Elective Cosmetic Consultation', requested_amount: 45000,
    },
  });
  const paId2 = createRes2.body.preAuth?.id;
  await httpJson(`/api/preauth-requests/${paId2}/status`, { method: 'PATCH', body: { status: 'submitted' } });
  await httpJson(`/api/preauth-requests/${paId2}/status`, { method: 'PATCH', body: { status: 'under_review' } });

  const rejectNoReason = await httpJson(`/api/preauth-requests/${paId2}/status`, { method: 'PATCH', body: { status: 'rejected' } });
  assert(rejectNoReason.statusCode === 400, `Rejecting without rejection_reason rejected with HTTP 400 (got ${rejectNoReason.statusCode})`);

  const rejectRes = await httpJson(`/api/preauth-requests/${paId2}/status`, {
    method: 'PATCH', body: { status: 'rejected', rejection_reason: 'Not a covered benefit under this plan.' },
  });
  assert(rejectRes.statusCode === 200, `Rejection succeeds (HTTP ${rejectRes.statusCode})`);

  const furtherAttempt = await httpJson(`/api/preauth-requests/${paId2}/status`, { method: 'PATCH', body: { status: 'submitted' } });
  assert(furtherAttempt.statusCode === 409, `Rejected is terminal — further transition rejected with HTTP 409 (got ${furtherAttempt.statusCode})`);

  // --- Test 8: linking before approval is blocked ---
  console.log('\n8. Confirming an un-approved request cannot be linked to an invoice...');
  const createRes3 = await httpJson('/api/preauth-requests', {
    method: 'POST',
    body: { patient_name: 'Chika Umeh', payer_name: 'Hygeia HMO', provider_name: 'Lagoon Specialist Hospital', service_description: 'CT Scan — Chest', requested_amount: 85000 },
  });
  const paId3 = createRes3.body.preAuth?.id;
  const earlyLink = await httpJson(`/api/preauth-requests/${paId3}/link-invoice`, { method: 'PATCH', body: { invoice_number: invoiceNumber } });
  assert(earlyLink.statusCode === 409, `Linking a still-'requested' pre-auth rejected with HTTP 409 (got ${earlyLink.statusCode})`);

  console.log('\n====================================================');
  if (failures === 0) console.log('🏁 ALL PRE-AUTHORIZATION TRACKER TESTS PASSED');
  else console.log(`🔥 ${failures} ASSERTION(S) FAILED`);
  console.log('====================================================');

  process.exit(failures === 0 ? 0 : 1);
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
