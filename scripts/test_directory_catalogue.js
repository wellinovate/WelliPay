import http from 'http';

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:5174${path}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let body;
        try {
          body = JSON.parse(data);
        } catch (e) {
          body = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 RUNNING MASTER DIRECTORY & PROVIDER CATALOGUE TEST SUITE...');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Master Service Directory
    const masterRes = await makeRequest('/api/directory/master?provider_type=laboratory');
    assert(masterRes.status === 200, 'Master directory returns HTTP 200');
    assert(masterRes.body.success === true, 'Master directory success is true');
    assert(masterRes.body.services && masterRes.body.services.length >= 39, `Master directory has at least 39 services (got ${masterRes.body.services?.length})`);
    assert(masterRes.body.departments && masterRes.body.departments.length === 10, `Master directory has exactly 10 departments (got ${masterRes.body.departments?.length}: ${masterRes.body.departments?.join(', ')})`);

    // Verify departments
    const expectedDepts = [
      'Haematology', 'Chemical Pathology', 'Medical Microbiology',
      'Immunology & Serology', 'Molecular Diagnostics', 'Histopathology & Cytology',
      'Diagnostic Ultrasound', 'Diagnostic Radiology', 'Cardiology (Non-Invasive)',
      'Wellness & Prevention'
    ];
    for (const d of expectedDepts) {
      assert(masterRes.body.departments.includes(d), `Department list includes '${d}'`);
    }

    // 2. Providers List
    const provRes = await makeRequest('/api/directory/providers');
    assert(provRes.status === 200, 'Providers endpoint returns HTTP 200');
    assert(provRes.body.providers && provRes.body.providers.length >= 3, `Providers endpoint returns at least 3 providers (got ${provRes.body.providers?.length})`);

    const names = provRes.body.providers.map(p => p.name);
    assert(names.includes('Lagoon Specialist Hospital'), "Includes exact 'Lagoon Specialist Hospital'");
    assert(names.includes('ABC Diagnostics'), "Includes exact 'ABC Diagnostics'");
    assert(names.includes('Wellness Point Lab'), "Includes exact 'Wellness Point Lab'");

    // 3. Provider Catalogue - Lagoon
    const lagCatRes = await makeRequest('/api/directory/catalogue/PRV-LAG-01');
    assert(lagCatRes.status === 200, 'Lagoon catalogue returns HTTP 200');
    assert(lagCatRes.body.catalogue && lagCatRes.body.catalogue.length > 0, `Lagoon has seeded catalogue entries (got ${lagCatRes.body.catalogue?.length})`);

    const fbcItem = lagCatRes.body.catalogue.find(c => c.serviceCode === 'LAB-HEM-FBC');
    assert(fbcItem !== undefined, 'Lagoon catalogue contains Full Blood Count');
    if (fbcItem) {
      assert(Number(fbcItem.price) === 12000, `Lagoon FBC price is ₦12,000 (got ${fbcItem.price})`);
      assert(fbcItem.isPublished === true, 'Lagoon FBC is published');
    }

    // 4. Provider Catalogue - ABC Diagnostics
    const abcCatRes = await makeRequest('/api/directory/catalogue/PRV-ABC-01');
    assert(abcCatRes.status === 200, 'ABC Diagnostics catalogue returns HTTP 200');
    const abcFbc = abcCatRes.body.catalogue.find(c => c.serviceCode === 'LAB-HEM-FBC');
    assert(abcFbc !== undefined, 'ABC Diagnostics catalogue contains Full Blood Count');
    if (abcFbc) {
      assert(Number(abcFbc.price) === 8500, `ABC Diagnostics FBC price is ₦8,500 (got ${abcFbc.price})`);
    }

    // 5. Auth Enforcement on Write Endpoints
    const unauthPost = await makeRequest('/api/directory/catalogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { provider_id: 'PRV-LAG-01', master_service_id: 1, price: 10000 }
    });
    assert(unauthPost.status === 401, `Unauthenticated POST /api/directory/catalogue rejected with HTTP 401 (got ${unauthPost.status})`);

    const unauthPatch = await makeRequest('/api/directory/catalogue/1/publish', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { is_published: false }
    });
    assert(unauthPatch.status === 401, `Unauthenticated PATCH /api/directory/catalogue/:id/publish rejected with HTTP 401 (got ${unauthPatch.status})`);

    // 6. Authenticated Write Endpoints (using dev-token in non-production)
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer dev-token'
    };

    // Upsert a service for Wellness Point Lab
    const authPost = await makeRequest('/api/directory/catalogue', {
      method: 'POST',
      headers: authHeaders,
      body: {
        provider_id: 'PRV-WPL-01',
        master_service_id: 6, // E/U/Cr
        price: 24000,
        turnaround_time: 'Same day (4 hrs)',
        hmo_accepted: ['Reliance HMO'],
        is_published: true
      }
    });
    assert(authPost.status === 201, `Authenticated POST /api/directory/catalogue succeeded with HTTP 201 (got ${authPost.status})`);

    // Toggle publish state
    const catId = authPost.body.item?.id || 1;
    const authPatch = await makeRequest(`/api/directory/catalogue/${catId}/publish`, {
      method: 'PATCH',
      headers: authHeaders,
      body: { is_published: false }
    });
    assert(authPatch.status === 200, `Authenticated PATCH /api/directory/catalogue/:id/publish succeeded with HTTP 200 (got ${authPatch.status})`);
    assert(authPatch.body.item?.is_published === false, 'is_published updated to false');

    console.log(`\n====================================================`);
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`====================================================`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTests();
