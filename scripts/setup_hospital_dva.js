import 'dotenv/config';
import axios from 'axios';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
if (!PAYSTACK_SECRET) {
  console.error('Missing PAYSTACK_SECRET_KEY in environment');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${PAYSTACK_SECRET}`,
  'Content-Type': 'application/json'
};

async function setupHospitalDVA() {
  console.log('1. Creating or fetching hospital customer profile on Paystack...');
  let customerCode;
  try {
    const customerRes = await axios.post('https://api.paystack.co/customer', {
      email: 'collections@lagoonspecialisthospital.ng',
      first_name: 'Lagoon Specialist',
      last_name: 'Hospital',
      phone: '+2348000000000',
    }, { headers });

    customerCode = customerRes.data.data.customer_code;
    console.log('   Customer created:', customerCode);
  } catch (err) {
    if (err.response?.data?.data?.customer_code) {
      customerCode = err.response.data.data.customer_code;
      console.log('   Existing customer found:', customerCode);
    } else if (err.response?.data?.message?.includes('Customer already exists') || err.response?.data?.message?.includes('email already in use')) {
      // Fetch existing customer by email
      const fetchRes = await axios.get('https://api.paystack.co/customer/collections@lagoonspecialisthospital.ng', { headers });
      customerCode = fetchRes.data.data.customer_code;
      console.log('   Fetched existing customer:', customerCode);
    } else {
      throw err;
    }
  }

  // Step 2: Create the Dedicated Virtual Account (test mode uses 'test-bank' provider)
  console.log('2. Requesting Dedicated Virtual Account (DVA)...');
  const dvaRes = await axios.post('https://api.paystack.co/dedicated_account', {
    customer: customerCode,
    preferred_bank: 'test-bank', // sandbox provider; switch to 'wema-bank' or similar in live mode
  }, { headers });

  const account = dvaRes.data.data;
  console.log('\n====================================================');
  console.log('🎉 HOSPITAL DVA CREATED SUCCESSFULLY:');
  console.log('====================================================');
  console.log('  Account Number:', account.account_number);
  console.log('  Bank:          ', account.bank?.name || account.bank);
  console.log('  Account Name:  ', account.account_name);
  console.log('  Customer Code: ', customerCode);
  console.log('====================================================\n');
}

setupHospitalDVA().catch(err => {
  console.error('DVA setup failed:', err.response?.data || err.message);
});
