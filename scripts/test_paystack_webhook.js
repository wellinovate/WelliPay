import 'dotenv/config';
import crypto from 'crypto';
import http from 'http';

const secret = process.env.PAYSTACK_SECRET_KEY || 'sk_test_f43b07569efb42794e7b45b89e41a41b3239ff55';

const payload = JSON.stringify({
  event: 'charge.success',
  data: {
    id: 9988776655,
    reference: 'INV-2026-001-TEST',
    amount: 1500000, // ₦15,000.00
    customer: {
      email: 'test.patient@lagoon.ng'
    }
  }
});

const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');

const req = http.request({
  hostname: 'localhost',
  port: 5174,
  path: '/api/webhooks/paystack',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-paystack-signature': hash,
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Body:', data);
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on('error', (err) => {
  console.error('Request Error:', err);
  process.exit(1);
});

req.write(payload);
req.end();
