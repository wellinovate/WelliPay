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

function findFlag(flags, code) {
  return flags.find(f => f.code === code);
}

async function run() {
  console.log('====================================================');
  console.log('📝 WELLIPAY PATIENT BILL AUDIT TEST');
  console.log('====================================================\n');

  const HOSPITAL_PROVIDER_ID = 'PRV-LAG-01';

  // Real catalogue entries for the hospital, needed to build realistic
  // line items (id 1 = FBC at 12000, id 8 = Lipid Profile at 26000).
  const catRes = await httpJson(`/api/directory/catalogue/${HOSPITAL_PROVIDER_ID}`);
  const fbc = catRes.body.catalogue.find(c => c.masterServiceId === 1);
  const lipid = catRes.body.catalogue.find(c => c.masterServiceId === 8);
  assert(!!fbc && !!lipid, 'Loaded real catalogue entries (FBC, Lipid Profile) to build test invoices from');

  // Real plan rule for Reliance HMO's Silver Plan (20% copay, ₦100,000 preauth threshold).
  const planRes = await httpJson('/api/payer-plans?payer=Reliance%20HMO');
  const silver = planRes.body.plans.find(p => p.planName === 'Silver Plan');
  assert(!!silver && silver.copayPercentage === 20 && silver.preauthThreshold === 100000,
    `Silver Plan rule loaded correctly (copay ${silver?.copayPercentage}%, preauth threshold ₦${silver?.preauthThreshold})`);

  // --- Test 1: clean bill — correctly priced, catalogue-linked, self-pay ---
  console.log('\n1. A clean, correctly priced self-pay invoice should audit clean...');
  const cleanInv = await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_name: 'Ifeoma Balogun', patient_mrn: 'MRN-LSH-20001',
      payer_type: 'self-pay',
      line_items: [
        { description: fbc.serviceName, quantity: 1, unitPrice: Number(fbc.price), totalAmount: Number(fbc.price), masterServiceId: fbc.masterServiceId, providerId: HOSPITAL_PROVIDER_ID },
      ],
      total_amount: Number(fbc.price),
    },
  });
  const cleanInvNum = cleanInv.body.invoice?.invoice_number;
  assert(!!cleanInvNum, `Clean invoice created (${cleanInvNum})`);
  const cleanAudit = await httpJson(`/api/invoices/${cleanInvNum}/audit`);
  assert(cleanAudit.statusCode === 200, `Audit endpoint returns HTTP 200 (got ${cleanAudit.statusCode})`);
  assert(cleanAudit.body.clean === true, `Clean invoice reports clean:true (flags: ${JSON.stringify(cleanAudit.body.flags)})`);

  // --- Test 2: price mismatch ---
  console.log('\n2. A line item billed above the published catalogue tariff...');
  const priceMismatchInv = await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_name: 'Segun Adeyemi', patient_mrn: 'MRN-LSH-20002',
      payer_type: 'self-pay',
      line_items: [
        { description: fbc.serviceName, quantity: 1, unitPrice: Number(fbc.price) + 5000, totalAmount: Number(fbc.price) + 5000, masterServiceId: fbc.masterServiceId, providerId: HOSPITAL_PROVIDER_ID },
      ],
      total_amount: Number(fbc.price) + 5000,
    },
  });
  const pmAudit = await httpJson(`/api/invoices/${priceMismatchInv.body.invoice.invoice_number}/audit`);
  const pmFlag = findFlag(pmAudit.body.flags, 'price_mismatch');
  assert(!!pmFlag, `price_mismatch flag raised (${pmFlag?.message})`);
  assert(pmFlag?.catalogueAmount === Number(fbc.price), `Flagged catalogue amount matches published tariff (₦${pmFlag?.catalogueAmount})`);

  // --- Test 3: tariff unknown (no catalogue link — the pre-fix scenario) ---
  console.log('\n3. A line item with no catalogue link (free-text only)...');
  const unlinkedInv = await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_name: 'Grace Okon', patient_mrn: 'MRN-LSH-20003',
      payer_type: 'self-pay',
      line_items: [
        { description: 'Miscellaneous Procedure Not In Catalogue', quantity: 1, unitPrice: 7000, totalAmount: 7000 },
      ],
      total_amount: 7000,
    },
  });
  const unlinkedAudit = await httpJson(`/api/invoices/${unlinkedInv.body.invoice.invoice_number}/audit`);
  const tuFlag = findFlag(unlinkedAudit.body.flags, 'tariff_unknown');
  assert(!!tuFlag, `tariff_unknown flag raised for an unlinked line item (${tuFlag?.message})`);
  assert(unlinkedAudit.body.clean === true, 'An invoice with only info-severity flags still reports clean:true');

  // --- Test 4: duplicate line items ---
  console.log('\n4. The same catalogue service billed twice on one invoice...');
  const dupInv = await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_name: 'Femi Ojo', patient_mrn: 'MRN-LSH-20004',
      payer_type: 'self-pay',
      line_items: [
        { description: fbc.serviceName, quantity: 1, unitPrice: Number(fbc.price), totalAmount: Number(fbc.price), masterServiceId: fbc.masterServiceId, providerId: HOSPITAL_PROVIDER_ID },
        { description: fbc.serviceName, quantity: 1, unitPrice: Number(fbc.price), totalAmount: Number(fbc.price), masterServiceId: fbc.masterServiceId, providerId: HOSPITAL_PROVIDER_ID },
      ],
      total_amount: Number(fbc.price) * 2,
    },
  });
  const dupAudit = await httpJson(`/api/invoices/${dupInv.body.invoice.invoice_number}/audit`);
  const dupFlag = findFlag(dupAudit.body.flags, 'duplicate_charge');
  assert(!!dupFlag && dupFlag.lineItemIds.length === 2, `duplicate_charge flag raised covering both line items (${dupFlag?.message})`);

  // --- Test 5: missing pre-auth above plan threshold ---
  console.log('\n5. An HMO bill above the plan\'s pre-auth threshold with no pre-auth code on file...');
  const bigBill = 150000; // > Silver Plan's ₦100,000 threshold
  const missingPreauthInv = await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_name: 'Ngozi Chukwu', patient_mrn: 'MRN-LSH-20005',
      payer_type: 'hmo', payer_name: 'Reliance HMO', plan_name: 'Silver Plan',
      policy_number: 'REL-9911-B',
      line_items: [
        { description: lipid.serviceName, quantity: 1, unitPrice: bigBill, totalAmount: bigBill, masterServiceId: lipid.masterServiceId, providerId: HOSPITAL_PROVIDER_ID },
      ],
      total_amount: bigBill,
      copay_amount: Math.round(bigBill * 0.20),
      claim_amount: bigBill - Math.round(bigBill * 0.20),
    },
  });
  const mpAudit = await httpJson(`/api/invoices/${missingPreauthInv.body.invoice.invoice_number}/audit`);
  const mpFlag = findFlag(mpAudit.body.flags, 'missing_preauth');
  assert(!!mpFlag, `missing_preauth flag raised for a ₦${bigBill} Silver Plan bill with no pre-auth code (${mpFlag?.message})`);
  assert(mpFlag?.severity === 'critical', 'missing_preauth is severity:critical');

  // Same bill, but with a pre-auth code on file — should NOT flag.
  const withPreauthInv = await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_name: 'Ngozi Chukwu', patient_mrn: 'MRN-LSH-20005',
      payer_type: 'hmo', payer_name: 'Reliance HMO', plan_name: 'Silver Plan',
      pre_auth_code: 'REL-AUTH-77441',
      line_items: [
        { description: lipid.serviceName, quantity: 1, unitPrice: bigBill, totalAmount: bigBill, masterServiceId: lipid.masterServiceId, providerId: HOSPITAL_PROVIDER_ID },
      ],
      total_amount: bigBill,
      copay_amount: Math.round(bigBill * 0.20),
    },
  });
  const wpAudit = await httpJson(`/api/invoices/${withPreauthInv.body.invoice.invoice_number}/audit`);
  assert(!findFlag(wpAudit.body.flags, 'missing_preauth'), 'Same bill with a pre-auth code on file does NOT raise missing_preauth');

  // --- Test 6: copay doesn't match the plan's copay percentage ---
  console.log("\n6. A copay amount that doesn't match the plan's copay percentage...");
  const wrongCopayInv = await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_name: 'Bola Fashina', patient_mrn: 'MRN-LSH-20006',
      payer_type: 'hmo', payer_name: 'Reliance HMO', plan_name: 'Silver Plan',
      pre_auth_code: 'REL-AUTH-11223',
      line_items: [
        { description: fbc.serviceName, quantity: 1, unitPrice: Number(fbc.price), totalAmount: Number(fbc.price), masterServiceId: fbc.masterServiceId, providerId: HOSPITAL_PROVIDER_ID },
      ],
      total_amount: Number(fbc.price),
      copay_amount: Number(fbc.price), // billed patient the full amount, not the 20% Silver Plan copay
    },
  });
  const wcAudit = await httpJson(`/api/invoices/${wrongCopayInv.body.invoice.invoice_number}/audit`);
  const wcFlag = findFlag(wcAudit.body.flags, 'copay_exceeds_plan_rule');
  assert(!!wcFlag, `copay_exceeds_plan_rule flag raised (${wcFlag?.message})`);
  assert(wcFlag?.severity === 'critical', 'Overcharged copay is severity:critical (patient charged more than the plan rule)');

  // --- Test 7: billed self-pay despite HMO coverage on file ---
  console.log('\n7. A patient with HMO coverage on file, billed as self-pay...');
  const patientsRes = await httpJson('/api/patients');
  let coveredPatient = (patientsRes.body.patients || []).find(p => p.hmoName);
  if (!coveredPatient) {
    // Fall back to creating one directly isn't available via a public endpoint,
    // so skip gracefully if seed data has no HMO-covered patient.
    console.log('   (no HMO-covered patient in seed data — skipping this check)');
  } else {
    const selfPayDespiteInv = await httpJson('/api/invoices', {
      method: 'POST',
      body: {
        patient_id: coveredPatient.id, patient_name: coveredPatient.fullName, patient_mrn: coveredPatient.mrn,
        payer_type: 'self-pay',
        line_items: [
          { description: fbc.serviceName, quantity: 1, unitPrice: Number(fbc.price), totalAmount: Number(fbc.price), masterServiceId: fbc.masterServiceId, providerId: HOSPITAL_PROVIDER_ID },
        ],
        total_amount: Number(fbc.price),
      },
    });
    const sdAudit = await httpJson(`/api/invoices/${selfPayDespiteInv.body.invoice.invoice_number}/audit`);
    const sdFlag = findFlag(sdAudit.body.flags, 'billed_self_pay_despite_coverage');
    assert(!!sdFlag, `billed_self_pay_despite_coverage flag raised (${sdFlag?.message})`);
  }

  // --- Test 8: linked pre-authorization's approved amount differs from the bill ---
  console.log('\n8. A bill that differs from its linked pre-authorization\'s approved amount...');
  const paCreate = await httpJson('/api/preauth-requests', {
    method: 'POST',
    body: {
      patient_name: 'Yusuf Danladi', payer_name: 'Reliance HMO', provider_name: 'Lagoon Specialist Hospital',
      service_description: 'CT Scan — Abdomen', requested_amount: 130000,
    },
  });
  const paId = paCreate.body.preAuth.id;
  await httpJson(`/api/preauth-requests/${paId}/status`, { method: 'PATCH', body: { status: 'submitted' } });
  await httpJson(`/api/preauth-requests/${paId}/status`, { method: 'PATCH', body: { status: 'under_review' } });
  await httpJson(`/api/preauth-requests/${paId}/status`, { method: 'PATCH', body: { status: 'approved', approved_amount: 110000, auth_code: 'REL-AUTH-55009' } });

  const mismatchBillInv = await httpJson('/api/invoices', {
    method: 'POST',
    body: {
      patient_name: 'Yusuf Danladi', patient_mrn: 'MRN-LSH-20008',
      payer_type: 'hmo', payer_name: 'Reliance HMO', plan_name: 'Comprehensive Plan',
      line_items: [
        { description: lipid.serviceName, quantity: 1, unitPrice: 130000, totalAmount: 130000, masterServiceId: lipid.masterServiceId, providerId: HOSPITAL_PROVIDER_ID },
      ],
      total_amount: 130000,
    },
  });
  const mismatchInvNum = mismatchBillInv.body.invoice.invoice_number;
  await httpJson(`/api/preauth-requests/${paId}/link-invoice`, { method: 'PATCH', body: { invoice_number: mismatchInvNum } });

  const authMismatchAudit = await httpJson(`/api/invoices/${mismatchInvNum}/audit`);
  const amFlag = findFlag(authMismatchAudit.body.flags, 'authorized_amount_mismatch');
  assert(!!amFlag, `authorized_amount_mismatch flag raised (${amFlag?.message})`);
  assert(amFlag?.approvedAmount === 110000 && amFlag?.billedAmount === 130000,
    `Flag carries both the approved (₦${amFlag?.approvedAmount}) and billed (₦${amFlag?.billedAmount}) amounts`);

  // --- Test 9: audit on a non-existent invoice returns 404 ---
  console.log('\n9. Auditing an invoice number that does not exist...');
  const notFound = await httpJson('/api/invoices/INV-99999999/audit');
  assert(notFound.statusCode === 404, `Non-existent invoice returns HTTP 404 (got ${notFound.statusCode})`);

  console.log('\n====================================================');
  if (failures === 0) console.log('🏁 ALL PATIENT BILL AUDIT TESTS PASSED');
  else console.log(`🔥 ${failures} ASSERTION(S) FAILED`);
  console.log('====================================================');

  process.exit(failures === 0 ? 0 : 1);
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
