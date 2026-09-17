async function run() {
  const headers = {
    'Authorization': 'Bearer dev-token',
    'Content-Type': 'application/json'
  };

  console.log('--- 1. CHECK INITIAL DASHBOARD & REVENUE METRICS ---');
  let res = await fetch('http://127.0.0.1:5174/api/dashboard', { headers });
  let data = await res.json();
  const preTotalToday = data.metrics.totalToday;
  const prePatientDirect = data.metrics.patientDirect;
  console.log('Initial totalToday:', preTotalToday, `(${data.metrics.formattedTotalToday})`);
  console.log('Initial patientDirect:', prePatientDirect, `(${data.metrics.formattedPatientDirect})`);
  console.log('Initial leakage state:', JSON.stringify(data.leakage, null, 2));

  console.log('\n--- 2. CALL POST /api/leakage/bill ---');
  res = await fetch('http://127.0.0.1:5174/api/leakage/bill', {
    method: 'POST',
    headers
  });
  console.log('HTTP Status:', res.status);
  const billData = await res.json();
  console.log('Billing response:', JSON.stringify(billData, null, 2));

  console.log('\n--- 3. CHECK DASHBOARD AFTER BILLING (VERIFY REVENUE DID NOT CHANGE) ---');
  res = await fetch('http://127.0.0.1:5174/api/dashboard', { headers });
  data = await res.json();
  const postTotalToday = data.metrics.totalToday;
  const postPatientDirect = data.metrics.patientDirect;
  console.log('Post-billing totalToday:', postTotalToday, `(${data.metrics.formattedTotalToday})`);
  console.log('Post-billing patientDirect:', postPatientDirect, `(${data.metrics.formattedPatientDirect})`);
  console.log('Post-billing leakage state:', JSON.stringify(data.leakage, null, 2));

  if (postTotalToday !== preTotalToday) {
    console.error(`\n>>> FAILURE: totalToday changed from ${preTotalToday} to ${postTotalToday}!`);
    process.exit(1);
  } else {
    console.log(`\n>>> VERIFIED: totalToday remained strictly unchanged at ${postTotalToday}!`);
  }

  if (postPatientDirect !== prePatientDirect) {
    console.error(`\n>>> FAILURE: patientDirect changed from ${prePatientDirect} to ${postPatientDirect}!`);
    process.exit(1);
  } else {
    console.log(`>>> VERIFIED: patientDirect remained strictly unchanged at ${postPatientDirect}!`);
  }

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
