async function run() {
  const headers = {
    'Authorization': 'Bearer dev-token',
    'Content-Type': 'application/json'
  };

  console.log('--- 1. CHECK INITIAL DASHBOARD LEAKAGE ---');
  let res = await fetch('http://127.0.0.1:5174/api/dashboard', { headers });
  let data = await res.json();
  console.log('Initial leakage state:', JSON.stringify(data.leakage, null, 2));

  console.log('\n--- 2. CALL POST /api/leakage/bill ---');
  res = await fetch('http://127.0.0.1:5174/api/leakage/bill', {
    method: 'POST',
    headers
  });
  console.log('HTTP Status:', res.status);
  const billData = await res.json();
  console.log('Billing response:', JSON.stringify(billData, null, 2));

  console.log('\n--- 3. CHECK DASHBOARD AFTER BILLING ---');
  res = await fetch('http://127.0.0.1:5174/api/dashboard', { headers });
  data = await res.json();
  console.log('Post-billing leakage state:', JSON.stringify(data.leakage, null, 2));

  console.log('\n--- 4. CHECK INVOICES LIST & METRICS ---');
  res = await fetch('http://127.0.0.1:5174/api/invoices', { headers });
  const invData = await res.json();
  console.log('Invoices metrics:', JSON.stringify(invData.metrics, null, 2));
  console.log('First 4 invoices:');
  invData.invoices.slice(0, 4).forEach(inv => {
    console.log(`- ${inv.invoiceNumber} | ${inv.serviceDescription} | ${inv.formattedAmount} | ${inv.status} (${inv.statusLabel})`);
  });

  console.log('\n--- 5. CALL POST /api/leakage/bill SECOND TIME (EXPECT 409) ---');
  res = await fetch('http://127.0.0.1:5174/api/leakage/bill', {
    method: 'POST',
    headers
  });
  console.log('HTTP Status (second call):', res.status);
  const secondCallData = await res.json();
  console.log('Second call body:', JSON.stringify(secondCallData, null, 2));

  if (res.status === 409) {
    console.log('\n>>> SUCCESS: 409 cleanly returned on second call with zero unbilled orders remaining!');
  } else {
    console.error('\n>>> ERROR: Expected 409 but got ' + res.status);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
