import 'dotenv/config';
import crypto from 'crypto';
import http from 'http';

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_f43b07569efb42794e7b45b89e41a41b3239ff55';

function fetchJson(path, options = {}) {
  return new Promise((resolve, reject) => {
    const isPost = options.method === 'POST';
    const bodyStr = options.body ? JSON.stringify(options.body) : null;

    const req = http.request({
      hostname: 'localhost',
      port: 5174,
      path,
      method: options.method || 'GET',
      headers: {
        ...(options.headers || {}),
        ...(bodyStr ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr)
        } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function sendSignedWebhook(payloadObj) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payloadObj);
    const sig = crypto.createHmac('sha512', SECRET_KEY).update(bodyStr).digest('hex');

    const req = http.request({
      hostname: 'localhost',
      port: 5174,
      path: '/api/webhooks/paystack',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': sig,
        'Content-Length': Buffer.byteLength(bodyStr)
      }
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

async function runPatientPaymentFlow() {
  console.log('====================================================');
  console.log('🏥 END-TO-END PATIENT CHECKOUT & RECONCILIATION FLOW');
  console.log('====================================================\n');

  const invoiceNum = 'INV-93105';

  // 1. Patient opens public payment URL: /pay/INV-93105
  console.log(`1. Patient retrieves public invoice /api/public/invoice/${invoiceNum}...`);
  const invRes1 = await fetchJson(`/api/public/invoice/${invoiceNum}`);
  console.log('   Invoice Data:', invRes1.data.invoice?.invoice_number, '| Status:', invRes1.data.invoice?.status, '| Total:', invRes1.data.invoice?.formatted_amount);
  
  if (invRes1.statusCode !== 200 || !invRes1.data.invoice) {
    console.error('   ❌ Failed to load public invoice');
    process.exit(1);
  }

  // 2. Patient enters email and initializes Paystack transaction
  console.log(`\n2. Patient initializes payment /api/public/invoice/${invoiceNum}/pay...`);
  const email = 't.adeyemi@lagoon.ng';
  const payInitRes = await fetchJson(`/api/public/invoice/${invoiceNum}/pay`, {
    method: 'POST',
    body: { email }
  });

  console.log('   Payment Init Status:', payInitRes.statusCode);
  console.log('   Reference Generated:', payInitRes.data?.reference);
  console.log('   Access Code:        ', payInitRes.data?.access_code);
  console.log('   Authorization URL:  ', payInitRes.data?.authorization_url);

  if (payInitRes.statusCode !== 200 || !payInitRes.data?.reference) {
    console.error('   ❌ Failed to initialize Paystack payment');
    process.exit(1);
  }

  const generatedRef = payInitRes.data.reference;

  // 3. Patient completes payment on Paystack (card 4084...); Paystack emits charge.success webhook
  console.log(`\n3. Paystack emits charge.success webhook for ${generatedRef}...`);
  const webhookTxnId = Date.now();
  const webhookRes = await sendSignedWebhook({
    event: 'charge.success',
    data: {
      id: webhookTxnId,
      reference: generatedRef,
      amount: Math.round(Number(invRes1.data.invoice.total_amount) * 100),
      channel: 'card',
      customer: { email }
    }
  });
  console.log('   Webhook Acknowledgment:', webhookRes.statusCode, `(${webhookRes.body})`);

  // Wait for processing
  await new Promise(r => setTimeout(r, 500));

  // 4. Patient view auto-refreshes: /api/public/invoice/INV-93105
  console.log(`\n4. Verifying invoice state after webhook auto-match...`);
  const invRes2 = await fetchJson(`/api/public/invoice/${invoiceNum}`);
  const updatedInv = invRes2.data.invoice;
  console.log('   Post-Payment State: [', updatedInv?.invoice_number, '] status="', updatedInv?.status, '", label="', updatedInv?.status_label, '", paid=₦', updatedInv?.paid_amount);

  const isReconciled = updatedInv?.status === 'paid' && updatedInv?.status_label === 'Reconciled';
  console.log(isReconciled ? '   ✅ [PASS] Invoice is RECONCILED and marked PAID!' : '   ❌ [FAIL] Invoice status was not updated to paid');

  // 5. Check duplicate payment rejection (409 Conflict)
  console.log(`\n5. Verifying invoice cannot be double-paid...`);
  const doublePayRes = await fetchJson(`/api/public/invoice/${invoiceNum}/pay`, {
    method: 'POST',
    body: { email }
  });
  console.log('   Double-Pay Attempt HTTP Status:', doublePayRes.statusCode, `(${doublePayRes.data?.error || ''})`);
  const doublePayBlocked = doublePayRes.statusCode === 409;
  console.log(doublePayBlocked ? '   ✅ [PASS] Double-payment correctly blocked with HTTP 409 Conflict!' : '   ❌ [FAIL] Did not block double-payment');

  console.log('\n====================================================');
  console.log(`🏁 PATIENT CHECKOUT E2E FLOW: ${isReconciled && doublePayBlocked ? 'ALL TESTS PASSED' : 'TESTS FAILED'}`);
  console.log('====================================================');

  if (!isReconciled || !doublePayBlocked) {
    process.exit(1);
  }
}

runPatientPaymentFlow().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
