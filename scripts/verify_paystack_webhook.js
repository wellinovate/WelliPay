import 'dotenv/config';
import crypto from 'crypto';
import http from 'http';
import https from 'https';

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_f43b07569efb42794e7b45b89e41a41b3239ff55';

function sendWebhook(targetUrl, payloadObj) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const bodyStr = JSON.stringify(payloadObj);
    const signature = crypto.createHmac('sha512', SECRET_KEY).update(bodyStr).digest('hex');

    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature,
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function fetchJson(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    client.get({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: { 'Authorization': 'Bearer dev-token' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

async function runWebhookVerification() {
  console.log('====================================================');
  console.log('💳 WELLIPAY PAYSTACK AUTO-MATCH & IDEMPOTENCY TEST');
  console.log('====================================================\n');

  // Step 1: Check initial status of INV-93105
  console.log('1. Checking initial invoice status for INV-93105...');
  const invBefore = await fetchJson('http://localhost:5174/api/invoices');
  const targetInvBefore = (invBefore.data.invoices || []).find(i => i.invoiceNumber === 'INV-93105');
  console.log(`   Initial State: [${targetInvBefore?.invoiceNumber}] status="${targetInvBefore?.status}", label="${targetInvBefore?.statusLabel}", paid=₦${targetInvBefore?.paidAmount}`);
  
  if (targetInvBefore?.status !== 'pending') {
    console.warn('   ⚠️  Invoice is not currently pending. (May have been matched in a prior test)');
  }

  // Step 2: Send valid Paystack charge.success webhook with reference 'INV-93105'
  const txnId = 987650001;
  const eventPayload = {
    event: 'charge.success',
    data: {
      id: txnId,
      reference: 'INV-93105',
      amount: 1150000, // ₦11,500.00
      customer: {
        email: 't.adeyemi@lagoon.ng'
      }
    }
  };

  console.log(`\n2. Dispatching charge.success webhook for ${eventPayload.data.reference} (txn ${txnId})...`);
  const res1 = await sendWebhook('http://localhost:5174/api/webhooks/paystack', eventPayload);
  console.log(`   Webhook Response: HTTP ${res1.statusCode} (${res1.body || 'OK'})`);

  // Allow asynchronous processPaystackEvent to execute
  await new Promise(r => setTimeout(r, 500));

  // Step 3: Verify invoice was updated to paid & reconciled
  console.log('\n3. Verifying invoice update in /api/invoices...');
  const invAfter = await fetchJson('http://localhost:5174/api/invoices');
  const targetInvAfter = (invAfter.data.invoices || []).find(i => i.invoiceNumber === 'INV-93105');
  console.log(`   Updated State: [${targetInvAfter?.invoiceNumber}] status="${targetInvAfter?.status}", label="${targetInvAfter?.statusLabel}", paid=₦${targetInvAfter?.paidAmount}`);

  const autoMatchPassed = targetInvAfter?.status === 'paid' && targetInvAfter?.statusLabel === 'Reconciled';
  console.log(autoMatchPassed ? '   ✅ [PASS] Auto-match successfully flipped invoice to paid / Reconciled!' : '   ❌ [FAIL] Invoice was not updated to paid');

  // Step 4: Test Idempotency - Re-send EXACT same webhook event
  console.log(`\n4. Dispatching DUPLICATE webhook with identical txn ${txnId} (Idempotency Test)...`);
  const res2 = await sendWebhook('http://localhost:5174/api/webhooks/paystack', eventPayload);
  console.log(`   Duplicate Webhook Response: HTTP ${res2.statusCode} (${res2.body || 'OK'})`);

  // Step 5: Check Reconciliation Queue
  const reconRes = await fetchJson('http://localhost:5174/api/reconciliation');
  const reconItems = reconRes.data.items || [];
  const matchingEntries = reconItems.filter(i => i.id === `PAY-PSTK-${txnId}`);
  console.log(`\n5. Checking Reconciliation Queue: found ${matchingEntries.length} record(s) matching ID PAY-PSTK-${txnId}`);
  const idempotencyPassed = matchingEntries.length === 1;
  console.log(idempotencyPassed ? '   ✅ [PASS] Idempotency confirmed: exactly 1 queue entry created, duplicate skipped!' : `   ❌ [FAIL] Found ${matchingEntries.length} entries (expected exactly 1)`);

  if (matchingEntries[0]) {
    console.log(`   Entry Status: status="${matchingEntries[0].status}", channel="${matchingEntries[0].channel}", confidence=${matchingEntries[0].aiMatch?.confidence}%`);
  }

  console.log('\n====================================================');
  console.log(`🏁 PAYSTACK WEBHOOK VERIFICATION: ${autoMatchPassed && idempotencyPassed ? 'ALL TESTS PASSED' : 'TESTS FAILED'}`);
  console.log('====================================================');

  if (!autoMatchPassed || !idempotencyPassed) {
    process.exit(1);
  }
}

runWebhookVerification().catch(err => {
  console.error('Fatal error in webhook verification:', err);
  process.exit(1);
});
