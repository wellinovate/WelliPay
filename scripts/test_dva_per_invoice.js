import 'dotenv/config';
import crypto from 'crypto';
import http from 'http';
import pg from 'pg';

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_f43b07569efb42794e7b45b89e41a41b3239ff55';
const DATABASE_URL = process.env.DATABASE_URL;

function sendWebhook(payloadObj) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payloadObj);
    const signature = crypto.createHmac('sha512', SECRET_KEY).update(bodyStr).digest('hex');
    const req = http.request({
      hostname: 'localhost', port: 5174, path: '/api/webhooks/paystack', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature, 'Content-Length': Buffer.byteLength(bodyStr) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

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
  if (cond) { console.log(`   ✅ ${msg}`); }
  else { console.error(`   ❌ ${msg}`); failures++; }
}

async function run() {
  console.log('====================================================');
  console.log('🏦 WELLIPAY PER-INVOICE DVA PROVISIONING + MATCHING TEST');
  console.log('====================================================\n');

  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // --- Test 1: invoice creation degrades gracefully with no reachable Paystack ---
    console.log('1. Creating invoice with no PAYSTACK_SECRET_KEY reachable (graceful degradation)...');
    const createRes = await httpJson('/api/invoices', {
      method: 'POST',
      body: {
        patient_name: 'Chidinma Okoro',
        service_description: 'Antenatal Panel',
        total_amount: 22000,
      },
    });
    assert(createRes.statusCode === 200, `Invoice creation returns HTTP 200 (got ${createRes.statusCode})`);
    const invoiceNumber = createRes.body.invoice?.invoice_number;
    assert(!!invoiceNumber, `Invoice number assigned (${invoiceNumber})`);
    assert(createRes.body.invoice?.dedicated_account_number == null, 'dedicated_account_number is null immediately after creation (no live Paystack in this environment)');

    // Give the fire-and-forget background provisioning attempt a moment to
    // fail (no network / no key) and confirm it did NOT crash the process or
    // leave the invoice in a broken state.
    await new Promise(r => setTimeout(r, 500));
    const afterRes = await client.query('SELECT dedicated_account_number, status FROM invoices WHERE invoice_number = $1', [invoiceNumber]);
    assert(afterRes.rows[0].status === 'pending', 'Invoice still in normal pending state after background provisioning attempt');
    assert(afterRes.rows[0].dedicated_account_number == null, 'dedicated_account_number remains null in DB (provisioning failed silently, as expected)');

    // --- Test 2: exact dedicated-account match (simulating a successful provisioning) ---
    console.log('\n2. Simulating a provisioned DVA for this invoice, then a matching bank transfer...');
    const fakeAccountNumber = '8810234567';
    await client.query(
      `UPDATE invoices SET dedicated_account_number = $1, dedicated_account_bank = 'Wema Bank', dedicated_account_name = 'Lagoon Specialist Hospital / Chidinma Okoro' WHERE invoice_number = $2`,
      [fakeAccountNumber, invoiceNumber]
    );

    const dvaTxnId = 7712340001;
    const dvaMatchPayload = {
      event: 'charge.success',
      data: {
        id: dvaTxnId,
        reference: `dva_ref_${dvaTxnId}`,
        amount: 2200000,
        channel: 'dedicated_nuban',
        narration: 'TRF FROM CHIDINMA OKORO',
        customer: { email: 'chidinma.o@example.com' },
        authorization: {
          channel: 'dedicated_nuban',
          receiver_bank_account_number: fakeAccountNumber,
          sender_bank_account_number: '0234567891',
        },
      },
    };
    const dvaMatchRes = await sendWebhook(dvaMatchPayload);
    assert(dvaMatchRes.statusCode === 200, `Webhook accepted (HTTP ${dvaMatchRes.statusCode})`);
    await new Promise(r => setTimeout(r, 400));

    const invAfterMatch = await client.query('SELECT status, status_label, paid_amount FROM invoices WHERE invoice_number = $1', [invoiceNumber]);
    assert(invAfterMatch.rows[0].status === 'paid', `Invoice auto-marked paid by exact DVA-account match (status=${invAfterMatch.rows[0].status})`);
    assert(Number(invAfterMatch.rows[0].paid_amount) === 22000, `paid_amount recorded correctly (${invAfterMatch.rows[0].paid_amount})`);

    const reconAfterMatch = await client.query('SELECT reconciliation_status, confidence_score FROM reconciliation_entries WHERE paystack_transaction_id = $1', [dvaTxnId]);
    assert(reconAfterMatch.rows[0].reconciliation_status === 'confirmed', 'Reconciliation entry confirmed');
    assert(Number(reconAfterMatch.rows[0].confidence_score) === 100, `Confidence 100 for exact dedicated-account match (got ${reconAfterMatch.rows[0].confidence_score})`);

    // --- Test 3: narration fallback (transfer lands on shared/legacy DVA, not this invoice's) ---
    console.log('\n3. Creating a second invoice, sending a transfer to an UNKNOWN account with the invoice number in narration...');
    const createRes2 = await httpJson('/api/invoices', {
      method: 'POST',
      body: { patient_name: 'Ifeoma Nnadi', service_description: 'Malaria Panel', total_amount: 9500 },
    });
    const invoiceNumber2 = createRes2.body.invoice?.invoice_number;
    assert(!!invoiceNumber2, `Second invoice created (${invoiceNumber2})`);

    const narrationTxnId = 7712340002;
    const narrationPayload = {
      event: 'charge.success',
      data: {
        id: narrationTxnId,
        reference: `dva_ref_${narrationTxnId}`,
        amount: 950000,
        channel: 'dedicated_nuban',
        narration: `Transfer for ${invoiceNumber2} - IFEOMA NNADI`,
        customer: { email: 'ifeoma.n@example.com' },
        authorization: {
          channel: 'dedicated_nuban',
          receiver_bank_account_number: '0000000000', // shared/legacy DVA, not provisioned for any invoice
        },
      },
    };
    const narrationRes = await sendWebhook(narrationPayload);
    assert(narrationRes.statusCode === 200, `Webhook accepted (HTTP ${narrationRes.statusCode})`);
    await new Promise(r => setTimeout(r, 400));

    const inv2After = await client.query('SELECT status FROM invoices WHERE invoice_number = $1', [invoiceNumber2]);
    assert(inv2After.rows[0].status === 'paid', `Second invoice matched and paid via narration fallback (status=${inv2After.rows[0].status})`);
    const recon2 = await client.query('SELECT confidence_score FROM reconciliation_entries WHERE paystack_transaction_id = $1', [narrationTxnId]);
    assert(Number(recon2.rows[0].confidence_score) === 90, `Confidence 90 for narration-text match (got ${recon2.rows[0].confidence_score})`);

    // --- Test 4: no match at all (unknown account, no parseable narration) ---
    console.log('\n4. Sending a transfer with no matching account and no parseable narration (should stay unmatched for manual review)...');
    const unmatchedTxnId = 7712340003;
    const unmatchedPayload = {
      event: 'charge.success',
      data: {
        id: unmatchedTxnId,
        reference: `dva_ref_${unmatchedTxnId}`,
        amount: 500000,
        channel: 'dedicated_nuban',
        narration: 'Transfer from GTBANK mobile app',
        customer: { email: 'unknown@example.com' },
        authorization: { channel: 'dedicated_nuban', receiver_bank_account_number: '0000000000' },
      },
    };
    const unmatchedRes = await sendWebhook(unmatchedPayload);
    assert(unmatchedRes.statusCode === 200, `Webhook accepted (HTTP ${unmatchedRes.statusCode})`);
    await new Promise(r => setTimeout(r, 400));
    const recon3 = await client.query('SELECT reconciliation_status, confidence_score FROM reconciliation_entries WHERE paystack_transaction_id = $1', [unmatchedTxnId]);
    assert(recon3.rows[0].reconciliation_status === 'unmatched', 'Left unmatched for manual cashier review');
    assert(recon3.rows[0].confidence_score === null, 'reconciliation_entries.confidence_score left null for unmatched (unchanged pre-existing behavior)');
    const payment3 = await client.query(`SELECT ai_confidence FROM payments WHERE id = $1`, [`PAY-PSTK-${unmatchedTxnId}`]);
    assert(Number(payment3.rows[0].ai_confidence) === 40, `payments.ai_confidence defaults to 40 for unmatched DVA transfer (got ${payment3.rows[0].ai_confidence})`);

    // --- Test 5: public invoice endpoint surfaces dedicated account details ---
    console.log('\n5. Confirming the public invoice endpoint surfaces the dedicated account (for the still-open invoice)...');
    const createRes3 = await httpJson('/api/invoices', {
      method: 'POST',
      body: { patient_name: 'Tunde Bakare', service_description: 'Consultation', total_amount: 5000 },
    });
    const invoiceNumber3 = createRes3.body.invoice?.invoice_number;
    await client.query(
      `UPDATE invoices SET dedicated_account_number = '9900556677', dedicated_account_bank = 'Wema Bank', dedicated_account_name = 'Lagoon Specialist Hospital / Tunde Bakare' WHERE invoice_number = $1`,
      [invoiceNumber3]
    );
    const publicRes = await new Promise((resolve, reject) => {
      http.get({ hostname: 'localhost', port: 5174, path: `/api/public/invoice/${invoiceNumber3}` }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
      }).on('error', reject);
    });
    assert(publicRes.body.invoice?.dedicated_account_number === '9900556677', 'Public invoice endpoint returns dedicated_account_number');
    assert(publicRes.body.invoice?.dedicated_account_bank === 'Wema Bank', 'Public invoice endpoint returns dedicated_account_bank');

    console.log('\n====================================================');
    if (failures === 0) {
      console.log('🏁 ALL DVA-PER-INVOICE TESTS PASSED');
    } else {
      console.log(`🔥 ${failures} ASSERTION(S) FAILED`);
    }
    console.log('====================================================');
  } finally {
    await client.end();
  }

  process.exit(failures === 0 ? 0 : 1);
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
