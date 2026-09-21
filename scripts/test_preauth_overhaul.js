/**
 * Automated Test Suite for Pre-Authorisation Workflow Overhaul
 * Tests:
 * 1. GET /api/preauth-requests - list retrieval with clinical fields
 * 2. Status filtering on /api/preauth-requests?status=...
 * 3. POST /api/preauth-requests - creating request with clinical diagnosis, urgency, planned date, enrollee ID
 * 4. GET /api/preauth-requests/:id - detail and timeline retrieval
 * 5. PATCH /api/preauth-requests/:id/status - transition to approved with code and expiry
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5174';

async function runTests() {
  console.log('🧪 RUNNING PRE-AUTHORISATION WORKFLOW OVERHAUL TEST SUITE...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  const authHeaders = {
    'Authorization': 'Bearer dev-token',
    'Content-Type': 'application/json'
  };

  try {
    // 1. GET /api/preauth-requests
    console.log('1. Testing GET /api/preauth-requests...');
    const listRes = await fetch(`${BASE_URL}/api/preauth-requests`, { headers: authHeaders });
    assert(listRes.status === 200, `List endpoint returns 200 OK (got ${listRes.status})`);

    const listData = await listRes.json();
    assert(Array.isArray(listData.preAuths), 'Response contains preAuths array');
    assert(listData.preAuths.length > 0, `Pre-auths list is populated with initial fallback/seeded items (count: ${listData.preAuths.length})`);

    // Verify clinical fields on existing items
    const sample = listData.preAuths[0];
    assert('diagnosis' in sample, 'Pre-auth object contains diagnosis field');
    assert('urgency' in sample, 'Pre-auth object contains urgency field');
    assert('requestedAmount' in sample || 'requested_amount' in sample, 'Pre-auth object contains requested amount');

    // 2. Status filtering
    console.log('\n2. Testing status filtering on GET /api/preauth-requests?status=approved...');
    const approvedRes = await fetch(`${BASE_URL}/api/preauth-requests?status=approved`, { headers: authHeaders });
    assert(approvedRes.status === 200, `Status filter returns 200 OK (got ${approvedRes.status})`);
    const approvedData = await approvedRes.json();
    const allApproved = approvedData.preAuths.every(p => p.status === 'approved');
    assert(allApproved, 'All returned records have status = approved');

    // 3. POST /api/preauth-requests with full clinical details
    console.log('\n3. Testing POST /api/preauth-requests with new clinical intake fields...');
    const newRequestPayload = {
      patientName: 'Amina Yusuf',
      patientMrn: 'MRN-LAG-0042',
      payerName: 'Hygeia HMO',
      planName: 'Hygeia Gold Classic',
      enrolleeId: 'HYG-882910',
      serviceDescription: 'MRI Brain (with contrast)',
      requestedAmount: 185000,
      diagnosis: 'Persistent chronic migraine with aura refractory to treatment',
      plannedDate: '2026-10-15',
      urgency: 'urgent',
      clinicalJustification: 'Refractory hemi-cranial headache unresponsive to prophylactic medication; imaging required to exclude vascular malformation.'
    };

    const postRes = await fetch(`${BASE_URL}/api/preauth-requests`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(newRequestPayload)
    });

    assert(postRes.status === 201, `POST returns 201 Created (got ${postRes.status})`);
    const createdData = await postRes.json();
    assert(Boolean(createdData.preAuth?.id), `Created pre-auth has valid ID: ${createdData.preAuth?.id}`);
    assert(createdData.preAuth?.diagnosis === newRequestPayload.diagnosis, 'Saved diagnosis matches payload');
    assert(createdData.preAuth?.urgency === 'urgent', 'Saved urgency is urgent');
    assert(createdData.preAuth?.planName === newRequestPayload.planName, 'Saved planName matches payload');
    assert(createdData.preAuth?.enrolleeId === newRequestPayload.enrolleeId, 'Saved enrolleeId matches payload');
    assert(createdData.preAuth?.requestedAmount === 185000, 'Saved requestedAmount matches payload');

    const newId = createdData.preAuth.id;

    // 4. GET /api/preauth-requests/:id
    console.log('\n4. Testing GET /api/preauth-requests/:id (detail & timeline)...');
    const detailRes = await fetch(`${BASE_URL}/api/preauth-requests/${newId}`, { headers: authHeaders });
    assert(detailRes.status === 200, `Detail returns 200 OK (got ${detailRes.status})`);
    const detailData = await detailRes.json();
    assert(detailData.preAuth?.id === newId, 'Detail returns matching ID');
    assert(Array.isArray(detailData.timeline), 'Detail returns status timeline');
    assert(detailData.timeline.length >= 1, `Timeline has initial event (count: ${detailData.timeline.length})`);

    // 5. PATCH /api/preauth-requests/:id/status transitions
    console.log('\n5. Testing PATCH /api/preauth-requests/:id/status transitions...');
    // Verify invalid jump directly from requested -> approved is blocked with 409
    const invalidJumpRes = await fetch(`${BASE_URL}/api/preauth-requests/${newId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'approved',
        approvalCode: 'INVALID-JUMP',
        approvedAmount: 185000
      })
    });
    assert(invalidJumpRes.status === 409, `Invalid status jump directly to approved is rejected with 409 Conflict (got ${invalidJumpRes.status})`);

    // Step 1: requested -> submitted
    const submitRes = await fetch(`${BASE_URL}/api/preauth-requests/${newId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'submitted',
        note: 'Submitted electronically to Hygeia HMO provider portal.'
      })
    });
    assert(submitRes.status === 200, `Transition to submitted returns 200 OK (got ${submitRes.status})`);

    // Step 2: submitted -> under_review
    const reviewRes = await fetch(`${BASE_URL}/api/preauth-requests/${newId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'under_review',
        note: 'Payer assigned medical adjudicator; under clinical desk review.'
      })
    });
    assert(reviewRes.status === 200, `Transition to under_review returns 200 OK (got ${reviewRes.status})`);

    // Step 3: under_review -> approved
    const approveRes = await fetch(`${BASE_URL}/api/preauth-requests/${newId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'approved',
        approvalCode: 'HYG-AUTH-2026-9811',
        approvedAmount: 185000,
        expiryDate: '2026-11-15',
        note: 'Approved in full by medical director.'
      })
    });
    assert(approveRes.status === 200, `Transition to approved returns 200 OK (got ${approveRes.status})`);
    const approvedResult = await approveRes.json();
    assert(approvedResult.preAuth?.status === 'approved', 'Status updated to approved');
    assert(approvedResult.preAuth?.authCode === 'HYG-AUTH-2026-9811', 'Approval code saved');
    assert(approvedResult.preAuth?.approvedAmount === 185000, 'Approved amount saved');
    assert(Boolean(approvedResult.preAuth?.expiryDate), 'Expiry date saved');

    // 6. Verify detail now reflects updated status and full timeline
    console.log('\n6. Verifying updated detail and timeline...');
    const updatedDetailRes = await fetch(`${BASE_URL}/api/preauth-requests/${newId}`, { headers: authHeaders });
    const updatedDetail = await updatedDetailRes.json();
    assert(updatedDetail.preAuth?.status === 'approved', 'Detail shows status=approved');
    assert(updatedDetail.timeline.length >= 3, `Timeline has all status events (count: ${updatedDetail.timeline.length})`);

  } catch (err) {
    console.error('💥 Unexpected test error:', err);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`PRE-AUTH TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
