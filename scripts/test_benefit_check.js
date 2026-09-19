/**
 * Automated Test Suite for Phase 2: HMO Benefit Check & Copay Calculation Engine
 * Tests payer plans directory, policy coverage evaluation, copay mathematics,
 * pre-authorization threshold triggers, out-of-network handling, and policy exclusions.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5174';

async function runTests() {
  console.log('🧪 RUNNING HMO BENEFIT CHECK & COPAY SUITE (PHASE 2)...\n');
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

  try {
    // 1. Payer Plans Directory Endpoint
    const plansRes = await fetch(`${BASE_URL}/api/payer-plans`);
    assert(plansRes.status === 200, 'GET /api/payer-plans returned HTTP 200');
    const plansData = await plansRes.json();
    assert(plansData.success === true, 'Payer plans success is true');
    assert(Array.isArray(plansData.plans) && plansData.plans.length >= 11, `Seeded at least 11 plans across payers (got ${plansData.plans?.length})`);

    // Verify canonical payers in plans list
    const payerNames = new Set(plansData.plans.map(p => p.payerName));
    assert(payerNames.has('Reliance HMO'), 'Includes Reliance HMO plans');
    assert(payerNames.has('AXA Mansard'), 'Includes AXA Mansard plans');
    assert(payerNames.has('Hygeia HMO'), 'Includes Hygeia HMO plans');
    assert(payerNames.has('Leadway Health'), 'Includes Leadway Health plans');

    // Filter by payer
    const relianceRes = await fetch(`${BASE_URL}/api/payer-plans?payer=Reliance%20HMO`);
    const relianceData = await relianceRes.json();
    assert(relianceData.plans.every(p => p.payerName === 'Reliance HMO'), 'Payer filter returns only Reliance HMO plans');

    // 2. Authentication Protection
    const unauthRes = await fetch(`${BASE_URL}/api/benefit-check?providerId=PRV-LAG-01&masterServiceId=1&payerName=Reliance%20HMO&planName=Silver%20Plan`);
    assert(unauthRes.status === 401, 'Unauthenticated benefit check rejected with HTTP 401');

    // 3. Missing Parameters (400)
    const missingRes = await fetch(`${BASE_URL}/api/benefit-check?providerId=PRV-LAG-01&masterServiceId=1`, {
      headers: { Authorization: 'Bearer dev-token' }
    });
    assert(missingRes.status === 400, 'Missing parameters rejected with HTTP 400');

    // 4. In-Network Standard Covered Service (Lagoon FBC + Reliance HMO Silver Plan)
    // FBC price: ₦12,000, Silver Plan copay: 20%, preauth threshold: ₦100,000
    const covRes = await fetch(`${BASE_URL}/api/benefit-check?providerId=PRV-LAG-01&masterServiceId=1&payerName=Reliance%20HMO&planName=Silver%20Plan`, {
      headers: { Authorization: 'Bearer dev-token' }
    });
    assert(covRes.status === 200, 'Covered benefit check returned HTTP 200');
    const covData = (await covRes.json()).benefitCheck;
    assert(covData.status === 'covered', 'Benefit status is covered');
    assert(covData.isCovered === true, 'isCovered is true');
    assert(covData.isNetworkAccepted === true, 'isNetworkAccepted is true');
    assert(covData.price === 12000, `Gross tariff is ₦12,000 (got ${covData.price})`);
    assert(covData.copayPercentage === 20, 'Copay percentage is 20%');
    assert(covData.patientCopayAmount === 2400, `Patient copay is exactly ₦2,400 (got ${covData.patientCopayAmount})`);
    assert(covData.hmoCoverageAmount === 9600, `HMO receivable coverage is ₦9,600 (got ${covData.hmoCoverageAmount})`);
    assert(covData.preAuthRequired === false, 'Pre-auth not required for routine ₦12k procedure');

    // 5. Pre-Authorization Threshold Trigger (Lagoon E/U/Cr + AXA Mansard Gold Plan)
    // E/U/Cr price: ₦28,000, Gold Plan preauth threshold: ₦25,000 (POL-AXA-08), copay: 10%
    const preAuthRes = await fetch(`${BASE_URL}/api/benefit-check?providerId=PRV-LAG-01&masterServiceId=6&payerName=AXA%20Mansard&planName=Gold%20Plan`, {
      headers: { Authorization: 'Bearer dev-token' }
    });
    assert(preAuthRes.status === 200, 'Pre-auth trigger check returned HTTP 200');
    const preAuthData = (await preAuthRes.json()).benefitCheck;
    assert(preAuthData.status === 'covered', 'Benefit is covered under Gold Plan');
    assert(preAuthData.price === 28000, 'Price is ₦28,000');
    assert(preAuthData.preAuthRequired === true, 'preAuthRequired is TRUE (₦28,000 >= ₦25,000 threshold)');
    assert(preAuthData.preAuthThreshold === 25000, 'preAuthThreshold is ₦25,000');
    assert(preAuthData.copayPercentage === 10, 'Copay percentage is 10%');
    assert(preAuthData.patientCopayAmount === 2800, `Patient copay is ₦2,800 (got ${preAuthData.patientCopayAmount})`);
    assert(preAuthData.hmoCoverageAmount === 25200, `HMO receivable is ₦25,200 (got ${preAuthData.hmoCoverageAmount})`);

    // 6. Out-of-Network Provider (Wellness Point Lab + AXA Mansard)
    // WPL accepts only Reliance HMO & Hygeia HMO in seed tariffs; AXA Mansard is Out-of-Network
    const oonRes = await fetch(`${BASE_URL}/api/benefit-check?providerId=PRV-WPL-01&masterServiceId=9&payerName=AXA%20Mansard&planName=Gold%20Plan`, {
      headers: { Authorization: 'Bearer dev-token' }
    });
    assert(oonRes.status === 200, 'Out-of-network check returned HTTP 200');
    const oonData = (await oonRes.json()).benefitCheck;
    assert(oonData.status === 'out_of_network', 'Benefit status is out_of_network');
    assert(oonData.isCovered === false, 'isCovered is false for OON');
    assert(oonData.isNetworkAccepted === false, 'isNetworkAccepted is false');
    assert(oonData.patientCopayAmount === 14000, `Patient responsible for 100% tariff (got ${oonData.patientCopayAmount})`);
    assert(oonData.hmoCoverageAmount === 0, 'HMO coverage is ₦0');

    // 7. Explicitly Excluded Service (Lagoon Pre-Employment Panel + Reliance HMO Standard Benefit Plan)
    // Pre-Employment panel is in excluded_services for Reliance HMO Standard Benefit Plan
    const exclRes = await fetch(`${BASE_URL}/api/benefit-check?providerId=PRV-LAG-01&masterServiceId=36&payerName=Reliance%20HMO&planName=Standard%20Benefit%20Plan`, {
      headers: { Authorization: 'Bearer dev-token' }
    });
    assert(exclRes.status === 200, 'Excluded service check returned HTTP 200');
    const exclData = (await exclRes.json()).benefitCheck;
    assert(exclData.status === 'excluded', 'Benefit status is excluded');
    assert(exclData.isCovered === false, 'isCovered is false for excluded service');
    assert(exclData.isNetworkAccepted === true, 'Provider is accepted in-network');
    assert(exclData.patientCopayAmount === 35000, `Patient responsible for 100% of excluded service (got ${exclData.patientCopayAmount})`);
    assert(exclData.hmoCoverageAmount === 0, 'HMO coverage is ₦0 for excluded service');
    assert(exclData.note.includes('excluded'), 'Advisory note explains policy exclusion');

    // 8. Reusable Shared Foundation Verification (Zero Duplicated Pricing Logic)
    // Verify that Phase 1 cost estimate for Lagoon FBC matches the tariff inside Benefit Check
    const estRes = await fetch(`${BASE_URL}/api/cost-estimate?providerId=PRV-LAG-01&masterServiceId=1`, {
      headers: { Authorization: 'Bearer dev-token' }
    });
    const estData = (await estRes.json()).estimate;
    assert(estData.price === covData.price, `Phase 1 estimate price (₦${estData.price}) equals Phase 2 base tariff (₦${covData.price})`);
    assert(estData.turnaroundTime === covData.turnaroundTime, 'Turnaround time consistent across Phase 1 and Phase 2');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`BENEFIT CHECK SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
