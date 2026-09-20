/**
 * Automated Test Suite for Phase 1: Cost Estimation
 * Tests price-lookup endpoint, HTTP status codes (400, 401, 404, 409, 200),
 * and payload integrity for canonical providers.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5174';

async function runTests() {
  console.log('🧪 RUNNING COST ESTIMATION (PHASE 1) TEST SUITE...\n');
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

  // Not a passed assertion — recorded and printed separately so a skip never
  // silently reads as a pass in the final tally.
  function skip(message, reason) {
    console.log(`⚠️  [SKIP] ${message} (${reason})`);
  }

  try {
    // requireAuth bypasses authentication entirely (no Bearer token required
    // at all) whenever Firebase Admin isn't configured — the case in local
    // dev and CI. The "unauthenticated rejected" check below can only hold
    // when Firebase Admin is actually active.
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json().catch(() => ({}));
    const firebaseActive = healthData?.auth?.firebaseAdminActive === true;

    // 1. Unauthenticated request should be rejected (401) — only when Firebase Admin is active.
    if (firebaseActive) {
      const unauthRes = await fetch(`${BASE_URL}/api/cost-estimate?providerId=PRV-LAG-01&masterServiceId=1`);
      assert(unauthRes.status === 401, 'Unauthenticated request rejected with HTTP 401');
    } else {
      skip('Unauthenticated request rejected with HTTP 401', 'Firebase Admin not configured — requireAuth bypasses all auth in this mode');
    }

    // 2. Missing providerId (400)
    const missingProvRes = await fetch(`${BASE_URL}/api/cost-estimate?masterServiceId=1`, {
      headers: { Authorization: 'Bearer dev-token' }
    });
    assert(missingProvRes.status === 400, 'Missing providerId rejected with HTTP 400');
    const missingProvData = await missingProvRes.json();
    assert(missingProvData.error.includes('providerId'), 'Error message identifies missing providerId');

    // 3. Missing masterServiceId (400)
    const missingMasterRes = await fetch(`${BASE_URL}/api/cost-estimate?providerId=PRV-LAG-01`, {
      headers: { Authorization: 'Bearer dev-token' }
    });
    assert(missingMasterRes.status === 400, 'Missing masterServiceId rejected with HTTP 400');

    // 4. Valid Lagoon Specialist Hospital FBC (masterServiceId: 1)
    const lagoonFbcRes = await fetch(`${BASE_URL}/api/cost-estimate?providerId=PRV-LAG-01&masterServiceId=1`, {
      headers: { Authorization: 'Bearer dev-token' }
    });
    assert(lagoonFbcRes.status === 200, 'Lagoon FBC returned HTTP 200');
    const lagoonFbcData = await lagoonFbcRes.json();
    assert(lagoonFbcData.estimate !== undefined, 'Response contains estimate object');
    assert(lagoonFbcData.estimate.price === 12000, `Lagoon FBC tariff is ₦12,000 (got ${lagoonFbcData.estimate.price})`);
    assert(lagoonFbcData.estimate.isPublished === true, 'Lagoon FBC is live published');
    assert(lagoonFbcData.estimate.serviceCode === 'LAB-HEM-FBC', 'Lagoon FBC serviceCode matches LAB-HEM-FBC');
    assert(lagoonFbcData.estimate.department === 'Haematology', 'Lagoon FBC department is Haematology');
    assert(Array.isArray(lagoonFbcData.estimate.hmoAccepted), 'hmoAccepted is an array');
    assert(lagoonFbcData.estimate.hmoAccepted.includes('Reliance HMO'), 'Lagoon accepts Reliance HMO');

    // 5. Valid ABC Diagnostics FBC (masterServiceId: 1) - Provider Tariff Variance
    const abcFbcRes = await fetch(`${BASE_URL}/api/cost-estimate?providerId=PRV-ABC-01&masterServiceId=1`, {
      headers: { Authorization: 'Bearer dev-token' }
    });
    assert(abcFbcRes.status === 200, 'ABC Diagnostics FBC returned HTTP 200');
    const abcFbcData = await abcFbcRes.json();
    assert(abcFbcData.estimate.price === 8500, `ABC Diagnostics tariff is ₦8,500 (got ${abcFbcData.estimate.price})`);
    assert(abcFbcData.estimate.serviceCode === 'LAB-HEM-FBC', 'ABC Diagnostics serviceCode is LAB-HEM-FBC');

    // 6. Valid Lagoon E/U/Cr (masterServiceId: 6)
    const lagoonEucrRes = await fetch(`${BASE_URL}/api/cost-estimate?providerId=PRV-LAG-01&masterServiceId=6`, {
      headers: { Authorization: 'Bearer dev-token' }
    });
    assert(lagoonEucrRes.status === 200, 'Lagoon E/U/Cr returned HTTP 200');
    const lagoonEucrData = await lagoonEucrRes.json();
    assert(lagoonEucrData.estimate.price === 28000, `Lagoon E/U/Cr tariff is ₦28,000 (got ${lagoonEucrData.estimate.price})`);

    // 7. Unpriced / Unoffered investigation (404)
    const unofferedRes = await fetch(`${BASE_URL}/api/cost-estimate?providerId=PRV-LAG-01&masterServiceId=9999`, {
      headers: { Authorization: 'Bearer dev-token' }
    });
    assert(unofferedRes.status === 404, 'Unoffered/unpriced test rejected with HTTP 404');
    const unofferedData = await unofferedRes.json();
    assert(unofferedData.error.includes('not offer'), '404 error message explains test is not offered/priced');

    // 8. Unpublished draft investigation (409)
    // In seed tariffs, Wellness Point Lab TFT (masterServiceId: 20) has is_published = false
    const unpublishedRes = await fetch(`${BASE_URL}/api/cost-estimate?providerId=PRV-WPL-01&masterServiceId=20`, {
      headers: { Authorization: 'Bearer dev-token' }
    });
    assert(unpublishedRes.status === 409, 'Unpublished draft tariff rejected with HTTP 409 Conflict');
    const unpublishedData = await unpublishedRes.json();
    assert(unpublishedData.error.includes('not yet published live'), '409 error message explains draft status');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`COST ESTIMATION SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
