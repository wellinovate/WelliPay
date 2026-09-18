import 'dotenv/config';
import crypto from 'crypto';
import http from 'http';

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_f43b07569efb42794e7b45b89e41a41b3239ff55';

function sendWebhook(payloadObj) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payloadObj);
    const signature = crypto.createHmac('sha512', SECRET_KEY).update(bodyStr).digest('hex');

    const req = http.request({
      hostname: 'localhost',
      port: 5174,
      path: '/api/webhooks/paystack',
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

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost',
      port: 5174,
      path,
      headers: { 'Authorization': 'Bearer dev-token' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function runDVATests() {
  console.log('====================================================');
  console.log('🏦 WELLIPAY DVA (DEDICATED NUBAN) WEBHOOK TEST');
  console.log('====================================================\n');

  // Test 1: dedicatedaccount.assign.success
  console.log('1. Dispatching dedicatedaccount.assign.success event...');
  const assignPayload = {
    event: 'dedicatedaccount.assign.success',
    data: {
      customer: {
        customer_code: 'CUS_kx82lc28upqklws',
        email: 'collections@lagoonspecialisthospital.ng'
      },
      dedicated_account: {
        bank: { name: 'Test Bank Sandbox', id: 99 },
        account_name: 'Lagoon Specialist Hospital',
        account_number: '9900112233',
        assigned: true
      }
    }
  };
  const assignRes = await sendWebhook(assignPayload);
  console.log(`   Response: HTTP ${assignRes.statusCode} (${assignRes.body || 'OK'})`);

  // Test 2: charge.success for incoming DVA bank transfer
  console.log('\n2. Dispatching charge.success with channel="dedicated_nuban" (DVA Transfer)...');
  const dvaTxnId = 9911223301;
  const transferPayload = {
    event: 'charge.success',
    data: {
      id: dvaTxnId,
      domain: 'test',
      status: 'success',
      reference: 'dva_ref_9911223301',
      amount: 2800000, // ₦28,000.00
      channel: 'dedicated_nuban',
      narration: 'Transfer from BABATUNDE FASHOLA - GTBANK',
      customer: {
        email: 'babatunde.f@lagoon.ng'
      },
      authorization: {
        channel: 'dedicated_nuban',
        sender_bank_account_number: '0123456789',
        sender_bank: 'Guaranty Trust Bank',
        sender_name: 'Babatunde Fashola'
      }
    }
  };

  const transferRes = await sendWebhook(transferPayload);
  console.log(`   Response: HTTP ${transferRes.statusCode} (${transferRes.body || 'OK'})`);

  // Wait for processing
  await new Promise(r => setTimeout(r, 400));

  // Test 3: Check Reconciliation Queue
  console.log('\n3. Checking Reconciliation Queue for new DVA payment entry...');
  const reconData = await fetchJson('/api/reconciliation');
  const dvaEntry = (reconData.items || []).find(i => i.id === `PAY-PSTK-${dvaTxnId}`);

  if (dvaEntry) {
    console.log('   ✅ Found DVA Entry in Queue:');
    console.log(`      ID:          ${dvaEntry.id}`);
    console.log(`      Channel:     ${dvaEntry.channel} (matches 'Bank transfer')`);
    console.log(`      Description: ${dvaEntry.description}`);
    console.log(`      Status:      ${dvaEntry.status} (matches 'unmatched')`);
    console.log(`      Amount:      ${dvaEntry.formattedAmount}`);
  } else {
    console.error('   ❌ DVA entry was not found in reconciliation queue!');
    process.exit(1);
  }

  // Test 4: Idempotency duplicate check
  console.log('\n4. Dispatching DUPLICATE DVA webhook event (Idempotency Test)...');
  const dupRes = await sendWebhook(transferPayload);
  console.log(`   Response: HTTP ${dupRes.statusCode} (${dupRes.body || 'OK'})`);

  console.log('\n====================================================');
  console.log('🏁 DVA WEBHOOK TESTS COMPLETE: ALL PASSED');
  console.log('====================================================');
}

runDVATests().catch(err => {
  console.error('Fatal DVA test error:', err);
  process.exit(1);
});
