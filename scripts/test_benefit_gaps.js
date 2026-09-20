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
  console.log('📝 WELLIPAY MEMBERSHIP STATUS + REMAINING BENEFIT TEST');
  console.log('====================================================\n');

  // --- Test 1: patients list carries real, varied policy verification status ---
  console.log('1. GET /api/patients returns real policyVerificationStatus values...');
  const patientsRes = await httpJson('/api/patients');
  const statuses = new Set(patientsRes.body.patients.map(p => p.policyVerificationStatus));
  assert(statuses.has('verified'), 'At least one patient is verified');
  assert(statuses.has('expired'), 'At least one patient is expired (not silently defaulted to verified)');
  assert(statuses.has('not_checked'), 'At least one patient is not_checked');
  assert(statuses.has('self_pay'), 'At least one patient is self_pay');

  const expiredPatient = patientsRes.body.patients.find(p => p.policyVerificationStatus === 'expired');
  const verifiedPatient = patientsRes.body.patients.find(p => p.policyVerificationStatus === 'verified');
  assert(!!expiredPatient && !!verifiedPatient, 'Found both an expired-membership patient and a verified one to test against');

  // --- Test 2: single-patient endpoint carries the same fields ---
  console.log('\n2. GET /api/patients/:id carries the same status fields...');
  const singleRes = await httpJson(`/api/patients/${expiredPatient.id}`);
  assert(singleRes.body.patient?.policyVerificationStatus === 'expired',
    `Single-patient endpoint reports expired (${singleRes.body.patient?.policyVerificationStatus})`);

  // --- Test 3: payer-plans carries a real annualBenefitLimit ---
  console.log('\n3. GET /api/payer-plans carries a real annualBenefitLimit per plan...');
  const planMatch = verifiedPatient.primaryCoverage.match(/\((.*?)\)/);
  const planName = planMatch ? planMatch[1] : null;
  assert(!!planName, `Resolved a real plan name for the verified patient (${planName})`);
  const plansRes = await httpJson(`/api/payer-plans?payer=${encodeURIComponent(verifiedPatient.hmoName)}`);
  const plan = plansRes.body.plans.find(p => p.planName === planName);
  assert(!!plan && plan.annualBenefitLimit > 0, `Plan has a nonzero annualBenefitLimit (₦${plan?.annualBenefitLimit})`);

  // --- Test 4: benefit-usage endpoint computes remaining correctly ---
  console.log('\n4. GET /api/patients/:id/benefit-usage computes remaining from claim history...');
  const usageBefore = await httpJson(`/api/patients/${verifiedPatient.id}/benefit-usage?payerName=${encodeURIComponent(verifiedPatient.hmoName)}&planName=${encodeURIComponent(planName)}`);
  assert(usageBefore.statusCode === 200, `Benefit usage returns HTTP 200 (got ${usageBefore.statusCode})`);
  assert(usageBefore.body.annualLimit === plan.annualBenefitLimit, 'annualLimit matches the plan rule');
  assert(usageBefore.body.remaining === usageBefore.body.annualLimit - usageBefore.body.usedThisYear, 'remaining = annualLimit - usedThisYear');

  // Create an HMO invoice with a claim_amount for this patient/payer/plan and confirm usage increases.
  const claimAmount = 200000;
  await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_id: verifiedPatient.id, patient_name: verifiedPatient.fullName, patient_mrn: verifiedPatient.mrn,
      payer_type: 'hmo', payer_name: verifiedPatient.hmoName, plan_name: planName,
      service_description: 'Comprehensive Metabolic Panel', total_amount: claimAmount + 20000,
      claim_amount: claimAmount, copay_amount: 20000,
    },
  });
  const usageAfter = await httpJson(`/api/patients/${verifiedPatient.id}/benefit-usage?payerName=${encodeURIComponent(verifiedPatient.hmoName)}&planName=${encodeURIComponent(planName)}`);
  assert(usageAfter.body.usedThisYear === usageBefore.body.usedThisYear + claimAmount,
    `usedThisYear increased by the new invoice's claim_amount (₦${usageAfter.body.usedThisYear})`);
  assert(usageAfter.body.remaining === usageAfter.body.annualLimit - usageAfter.body.usedThisYear,
    'remaining recalculated correctly after the new claim');

  // --- Test 5: benefit-usage for a plan with no annual limit on file ---
  console.log('\n5. A payer/plan with no annual_benefit_limit returns annualLimit:null, remaining:null...');
  const noLimitRes = await httpJson(`/api/patients/${verifiedPatient.id}/benefit-usage?payerName=Nonexistent%20Payer&planName=Nonexistent%20Plan`);
  assert(noLimitRes.body.annualLimit === null, 'annualLimit is null for an unknown payer/plan');
  assert(noLimitRes.body.remaining === null, 'remaining is null when there is no limit to subtract from');

  // --- Test 6: Patient Bill Audit flags an HMO invoice for an expired-membership patient ---
  console.log('\n6. Patient Bill Audit flags membership_not_verified for an expired-membership patient...');
  const expiredPlanMatch = expiredPatient.primaryCoverage.match(/\((.*?)\)/);
  const expiredPlanName = expiredPlanMatch ? expiredPlanMatch[1] : 'Standard Benefit Plan';
  const expiredInv = await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_id: expiredPatient.id, patient_name: expiredPatient.fullName, patient_mrn: expiredPatient.mrn,
      payer_type: 'hmo', payer_name: expiredPatient.hmoName, plan_name: expiredPlanName,
      service_description: 'Full Blood Count', total_amount: 12000,
    },
  });
  const expiredAudit = await httpJson(`/api/invoices/${expiredInv.body.invoice.invoice_number}/audit`);
  const membershipFlag = expiredAudit.body.flags.find(f => f.code === 'membership_not_verified');
  assert(!!membershipFlag, `membership_not_verified flag raised (${membershipFlag?.message})`);
  assert(membershipFlag?.severity === 'critical', 'Expired membership is severity:critical');

  // Same check for a verified-membership patient should NOT flag.
  const verifiedInv = await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_id: verifiedPatient.id, patient_name: verifiedPatient.fullName, patient_mrn: verifiedPatient.mrn,
      payer_type: 'hmo', payer_name: verifiedPatient.hmoName, plan_name: planName,
      service_description: 'Full Blood Count', total_amount: 12000,
    },
  });
  const verifiedAudit = await httpJson(`/api/invoices/${verifiedInv.body.invoice.invoice_number}/audit`);
  assert(!verifiedAudit.body.flags.find(f => f.code === 'membership_not_verified'),
    'A verified-membership patient does NOT raise membership_not_verified');

  console.log('\n====================================================');
  if (failures === 0) console.log('🏁 ALL MEMBERSHIP STATUS + REMAINING BENEFIT TESTS PASSED');
  else console.log(`🔥 ${failures} ASSERTION(S) FAILED`);
  console.log('====================================================');

  process.exit(failures === 0 ? 0 : 1);
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
