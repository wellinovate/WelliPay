// ============================================================================
// WELLIPAY MASTER SERVICE DIRECTORY & PROVIDER CATALOGUE SEED DATA
// Laboratory & Diagnostic Vertical (39 Standard Services across 10 Departments)
// ============================================================================

export const SEED_PROVIDERS = [
  {
    id: 'PRV-LAG-01',
    name: 'Lagoon Specialist Hospital',
    provider_type: 'hospital',
    email: 'billing@lagoonhospitals.com',
    phone: '+234 1 800 524 666',
    address: '8 Marine Road, Apapa / Victoria Island, Lagos',
    is_active: true
  },
  {
    id: 'PRV-ABC-01',
    name: 'ABC Diagnostics',
    provider_type: 'laboratory',
    email: 'info@abcdiagnostics.ng',
    phone: '+234 1 700 222 345',
    address: 'Plot 14, Commercial Avenue, Yaba, Lagos',
    is_active: true
  },
  {
    id: 'PRV-WPL-01',
    name: 'Wellness Point Lab',
    provider_type: 'laboratory',
    email: 'reception@wellnesspoint.ng',
    phone: '+234 803 456 7890',
    address: '22 Admiralty Way, Lekki Phase 1, Lagos',
    is_active: true
  }
];

export const MASTER_DIAGNOSTIC_SERVICES = [
  // 1. Haematology
  {
    provider_type: 'laboratory',
    department: 'Haematology',
    service_name: 'Full Blood Count (FBC with 5-part diff)',
    service_code: 'LAB-HEM-FBC',
    description: 'Automated complete blood count with 5-part differential, platelets, and RBC indices',
    specimen_type: 'Whole Blood (EDTA)',
    benchmark_turnaround: 'Same day (2-4 hrs)'
  },
  {
    provider_type: 'laboratory',
    department: 'Haematology',
    service_name: 'Erythrocyte Sedimentation Rate (ESR)',
    service_code: 'LAB-HEM-ESR',
    description: 'Westergren ESR measurement for systemic inflammatory monitoring',
    specimen_type: 'Whole Blood (Citrate)',
    benchmark_turnaround: 'Same day (2 hrs)'
  },
  {
    provider_type: 'laboratory',
    department: 'Haematology',
    service_name: 'Coagulation Profile (PT/INR & PTTK)',
    service_code: 'LAB-HEM-COAG',
    description: 'Prothrombin Time, International Normalized Ratio, and Partial Thromboplastin Time with Kaolin',
    specimen_type: 'Citrated Plasma',
    benchmark_turnaround: 'Same day (4 hrs)'
  },
  {
    provider_type: 'laboratory',
    department: 'Haematology',
    service_name: 'Hemoglobin Electrophoresis (Genotype)',
    service_code: 'LAB-HEM-GENO',
    description: 'Alkaline hemoglobin electrophoresis for screening Hb variants (AA, AS, SS, AC, SC)',
    specimen_type: 'Whole Blood (EDTA)',
    benchmark_turnaround: '24 hours'
  },
  {
    provider_type: 'laboratory',
    department: 'Haematology',
    service_name: 'Blood Grouping & Rhesus Factor',
    service_code: 'LAB-HEM-BGRH',
    description: 'ABO forward and reverse grouping with Rh(D) agglutination typing',
    specimen_type: 'Whole Blood (EDTA)',
    benchmark_turnaround: 'Same day (1 hr)'
  },

  // 2. Chemical Pathology
  {
    provider_type: 'laboratory',
    department: 'Chemical Pathology',
    service_name: 'Electrolytes, Urea & Creatinine (E/U/Cr)',
    service_code: 'LAB-CHM-EUCR',
    description: 'Sodium, Potassium, Chloride, Bicarbonate, Urea, and Creatinine with eGFR calculation',
    specimen_type: 'Serum (SST)',
    benchmark_turnaround: 'Same day (4 hrs)'
  },
  {
    provider_type: 'laboratory',
    department: 'Chemical Pathology',
    service_name: 'Liver Function Tests (LFT)',
    service_code: 'LAB-CHM-LFT',
    description: 'Total and Direct Bilirubin, AST, ALT, Alkaline Phosphatase, Total Protein, and Albumin',
    specimen_type: 'Serum (SST)',
    benchmark_turnaround: 'Same day (4 hrs)'
  },
  {
    provider_type: 'laboratory',
    department: 'Chemical Pathology',
    service_name: 'Lipid Profile Panel',
    service_code: 'LAB-CHM-LIP',
    description: 'Total Cholesterol, HDL Cholesterol, LDL Cholesterol, Triglycerides, and Atherogenic Ratio',
    specimen_type: 'Fasting Serum (10-12h)',
    benchmark_turnaround: 'Same day (4 hrs)'
  },
  {
    provider_type: 'laboratory',
    department: 'Chemical Pathology',
    service_name: 'Fasting Blood Glucose & HbA1c',
    service_code: 'LAB-CHM-GLUC',
    description: 'Acute fasting plasma glucose combined with 90-day glycated hemoglobin assessment',
    specimen_type: 'Fluoride Oxalate + EDTA',
    benchmark_turnaround: 'Same day (2-4 hrs)'
  },
  {
    provider_type: 'laboratory',
    department: 'Chemical Pathology',
    service_name: 'Extended Renal Function Tests (RFT)',
    service_code: 'LAB-CHM-RFT',
    description: 'Serum Uric Acid, Calcium, Inorganic Phosphate, Total Protein, Albumin, and 24h Creatinine Clearance',
    specimen_type: 'Serum + 24h Urine',
    benchmark_turnaround: '24 hours'
  },

  // 3. Medical Microbiology
  {
    provider_type: 'laboratory',
    department: 'Medical Microbiology',
    service_name: 'Urinalysis (Automated + Microscopy)',
    service_code: 'LAB-MIC-URN',
    description: 'Multiparameter chemical reagent strip testing plus centrifuged sediment light microscopy',
    specimen_type: 'Clean Catch Midstream Urine',
    benchmark_turnaround: 'Same day (1 hr)'
  },
  {
    provider_type: 'laboratory',
    department: 'Medical Microbiology',
    service_name: 'Urine Microscopy, Culture & Sensitivity',
    service_code: 'LAB-MIC-UMCS',
    description: 'Quantitative bacterial culture on CLED/MacConkey agar with CLSI antibiotic sensitivity discs',
    specimen_type: 'Sterile Midstream Clean Catch',
    benchmark_turnaround: '48-72 hours'
  },
  {
    provider_type: 'laboratory',
    department: 'Medical Microbiology',
    service_name: 'Stool Microscopy, Culture & Sensitivity',
    service_code: 'LAB-MIC-SMCS',
    description: 'Formol-ether concentration microscopy for ova/cysts and enteric pathogen culture on XLD/DCA',
    specimen_type: 'Fresh Stool Specimen',
    benchmark_turnaround: '48-72 hours'
  },
  {
    provider_type: 'laboratory',
    department: 'Medical Microbiology',
    service_name: 'Blood Culture & Sensitivity (Dual Aerobic)',
    service_code: 'LAB-MIC-BCS',
    description: 'Automated continuous-monitoring blood culture bottles with pathogen speciation and antibiogram',
    specimen_type: 'Sterile Venipuncture Blood',
    benchmark_turnaround: '5-7 days'
  },
  {
    provider_type: 'laboratory',
    department: 'Medical Microbiology',
    service_name: 'High Vaginal Swab (HVS) M/C/S',
    service_code: 'LAB-MIC-HVS',
    description: 'Wet mount for Trichomonas and clue cells, Gram stain for bacterial vaginosis, and culture',
    specimen_type: 'Sterile Dacron Swab',
    benchmark_turnaround: '48 hours'
  },

  // 4. Immunology & Serology
  {
    provider_type: 'laboratory',
    department: 'Immunology & Serology',
    service_name: 'Malaria Parasite (MP by Giemsa & RDT)',
    service_code: 'LAB-IMM-MAL',
    description: 'Gold-standard Giemsa thick/thin film quantification plus dual Pf/Pan histidine-rich protein RDT',
    specimen_type: 'Whole Blood (EDTA)',
    benchmark_turnaround: 'Same day (1 hr)'
  },
  {
    provider_type: 'laboratory',
    department: 'Immunology & Serology',
    service_name: 'Hepatitis B Surface Antigen (HBsAg)',
    service_code: 'LAB-IMM-HBS',
    description: 'Enzyme-linked immunosorbent assay / chemiluminescence for qualitative detection of HBsAg',
    specimen_type: 'Serum (SST)',
    benchmark_turnaround: 'Same day (2 hrs)'
  },
  {
    provider_type: 'laboratory',
    department: 'Immunology & Serology',
    service_name: 'Hepatitis C Antibody Screen (Anti-HCV)',
    service_code: 'LAB-IMM-HCV',
    description: 'Third-generation recombinant antigen EIA/chemiluminescent microparticle immunoassay',
    specimen_type: 'Serum (SST)',
    benchmark_turnaround: 'Same day (2 hrs)'
  },
  {
    provider_type: 'laboratory',
    department: 'Immunology & Serology',
    service_name: 'Retroviral Screen (HIV 1 & 2 Rapid + Conf)',
    service_code: 'LAB-IMM-HIV',
    description: 'National serial algorithm using Determine HIV-1/2, Stat-Pak confirmation, and Uni-Gold tiebreaker',
    specimen_type: 'Serum or Whole Blood',
    benchmark_turnaround: 'Same day (1 hr)'
  },
  {
    provider_type: 'laboratory',
    department: 'Immunology & Serology',
    service_name: 'Thyroid Function Profile (TSH, FT3, FT4)',
    service_code: 'LAB-IMM-TFT',
    description: 'Automated chemiluminescence immunoassay for Thyroid Stimulating Hormone, Free T3, and Free T4',
    specimen_type: 'Serum (SST)',
    benchmark_turnaround: '24 hours'
  },
  {
    provider_type: 'laboratory',
    department: 'Immunology & Serology',
    service_name: 'Prostate Specific Antigen (Total & Free PSA)',
    service_code: 'LAB-IMM-PSA',
    description: 'Quantitative Total PSA and percentage Free PSA calculation for prostate risk stratification',
    specimen_type: 'Serum (SST)',
    benchmark_turnaround: '24 hours'
  },
  {
    provider_type: 'laboratory',
    department: 'Immunology & Serology',
    service_name: 'Widal Slide Agglutination Test',
    service_code: 'LAB-IMM-WID',
    description: 'Semiquantitative slide agglutination for Salmonella enterica serovars Typhi/Paratyphi O and H antigens',
    specimen_type: 'Serum (SST)',
    benchmark_turnaround: 'Same day (1 hr)'
  },

  // 5. Molecular Diagnostics
  {
    provider_type: 'laboratory',
    department: 'Molecular Diagnostics',
    service_name: 'Hepatitis B Viral DNA (Quantitative PCR)',
    service_code: 'LAB-MOL-HBV',
    description: 'Real-time TaqMan RT-PCR quantification of HBV DNA with lower limit of detection ≤ 10 IU/mL',
    specimen_type: 'EDTA Plasma (Frozen)',
    benchmark_turnaround: '3-5 days'
  },
  {
    provider_type: 'laboratory',
    department: 'Molecular Diagnostics',
    service_name: 'Mycobacterium tuberculosis (GeneXpert MTB/RIF)',
    service_code: 'LAB-MOL-XPT',
    description: 'Automated cartridge-based nested real-time PCR for MTB detection and Rifampicin resistance rpoB gene',
    specimen_type: 'Early Morning Sputum',
    benchmark_turnaround: '24 hours'
  },
  {
    provider_type: 'laboratory',
    department: 'Molecular Diagnostics',
    service_name: 'HPV High-Risk Genotyping (14 Subtypes)',
    service_code: 'LAB-MOL-HPV',
    description: 'Multiplex real-time PCR identifying high-risk oncogenic HPV types 16, 18, and pooled 12 other genotypes',
    specimen_type: 'Cervical Cytology Brush',
    benchmark_turnaround: '3-5 days'
  },

  // 6. Histopathology & Cytology
  {
    provider_type: 'laboratory',
    department: 'Histopathology & Cytology',
    service_name: 'Cervical Pap Smear (Liquid-Based Cytology)',
    service_code: 'LAB-HIS-PAP',
    description: 'Liquid-based thin-layer automated cytology slide preparation with Bethesda System reporting',
    specimen_type: 'PreservCyt Cervical Vial',
    benchmark_turnaround: '3-5 days'
  },
  {
    provider_type: 'laboratory',
    department: 'Histopathology & Cytology',
    service_name: 'Fine Needle Aspiration Cytology (FNAC)',
    service_code: 'LAB-HIS-FNAC',
    description: 'Clinical or ultrasound-guided needle aspiration of palpable mass with Papanicolaou and Giemsa stains',
    specimen_type: 'Alcohol-Fixed Aspirate Smear',
    benchmark_turnaround: '48-72 hours'
  },
  {
    provider_type: 'laboratory',
    department: 'Histopathology & Cytology',
    service_name: 'Routine Tissue Biopsy (Small/Medium)',
    service_code: 'LAB-HIS-BX',
    description: 'Formalin fixation, gross examination, tissue processing, paraffin block sectioning, and H&E diagnostic report',
    specimen_type: '10% Neutral Buffered Formalin',
    benchmark_turnaround: '5-7 days'
  },

  // 7. Diagnostic Ultrasound
  {
    provider_type: 'laboratory',
    department: 'Diagnostic Ultrasound',
    service_name: 'Abdomino-Pelvic Ultrasound',
    service_code: 'ULT-ABD-PEL',
    description: 'Comprehensive high-resolution real-time B-mode sonography of upper abdomen, kidneys, and pelvic organs',
    specimen_type: null,
    benchmark_turnaround: 'Same day (immediate)'
  },
  {
    provider_type: 'laboratory',
    department: 'Diagnostic Ultrasound',
    service_name: 'Obstetric Ultrasound (Anomaly / Growth)',
    service_code: 'ULT-OBS-GRO',
    description: 'Detailed fetal biometry (BPD, HC, AC, FL), placental grading, amniotic fluid volume, and anomaly survey',
    specimen_type: null,
    benchmark_turnaround: 'Same day (immediate)'
  },
  {
    provider_type: 'laboratory',
    department: 'Diagnostic Ultrasound',
    service_name: 'Pelvic / Transvaginal Ultrasound (TVS)',
    service_code: 'ULT-PEL-TVS',
    description: 'High-frequency endovaginal sonography for high-resolution uterine, endometrial, and adnexal evaluation',
    specimen_type: null,
    benchmark_turnaround: 'Same day (immediate)'
  },

  // 8. Diagnostic Radiology (X-Ray)
  {
    provider_type: 'laboratory',
    department: 'Diagnostic Radiology',
    service_name: 'Chest X-Ray (Postero-Anterior / Lateral)',
    service_code: 'RAD-XRY-CXR',
    description: 'Digital radiography of thorax evaluating cardiac silhouette, pulmonary parenchyma, and pleural spaces',
    specimen_type: null,
    benchmark_turnaround: 'Same day (1-2 hrs)'
  },
  {
    provider_type: 'laboratory',
    department: 'Diagnostic Radiology',
    service_name: 'Lumbosacral Spine X-Ray (AP & Lateral)',
    service_code: 'RAD-XRY-LSS',
    description: 'Digital plain radiograph assessing lumbar vertebral alignment, pedicles, disc spaces, and osteophytes',
    specimen_type: null,
    benchmark_turnaround: 'Same day (1-2 hrs)'
  },

  // 9. Cardiology (Non-Invasive)
  {
    provider_type: 'laboratory',
    department: 'Cardiology (Non-Invasive)',
    service_name: 'Resting 12-Lead Electrocardiogram (ECG)',
    service_code: 'CAR-ECG-12L',
    description: 'Computerized 12-lead digital electrocardiography tracing with cardiologist diagnostic interpretation',
    specimen_type: null,
    benchmark_turnaround: 'Same day (immediate)'
  },
  {
    provider_type: 'laboratory',
    department: 'Cardiology (Non-Invasive)',
    service_name: 'Transthoracic Echocardiography (2D/Doppler)',
    service_code: 'CAR-ECH-2D',
    description: '2D, M-mode, color flow, and continuous-wave Doppler ultrasound assessing myocardial and valvular function',
    specimen_type: null,
    benchmark_turnaround: 'Same day (immediate)'
  },

  // 10. Wellness & Preventive Health
  {
    provider_type: 'laboratory',
    department: 'Wellness & Prevention',
    service_name: 'Pre-Employment Medical Examination Panel',
    service_code: 'LAB-WEL-PREEMP',
    description: 'Standard baseline panel: FBC, Urinalysis, Fasting Glucose, Chest X-Ray, HIV, HBsAg, Blood Group & Genotype',
    specimen_type: 'Blood, Urine & Digital X-Ray',
    benchmark_turnaround: '24 hours'
  },
  {
    provider_type: 'laboratory',
    department: 'Wellness & Prevention',
    service_name: 'Comprehensive Executive Health Check',
    service_code: 'LAB-WEL-EXEC',
    description: 'Annual corporate executive health screen: FBC, E/U/Cr, LFT, Fasting Lipids & Glucose, ECG, and Abdominal Scan',
    specimen_type: 'Multidisciplinary Panel',
    benchmark_turnaround: '24-48 hours'
  },
  {
    provider_type: 'laboratory',
    department: 'Wellness & Prevention',
    service_name: 'Well-Woman Comprehensive Health Screen',
    service_code: 'LAB-WEL-WOMAN',
    description: 'FBC, Lipids, Glycemic panel, Pap smear, Pelvic ultrasound, Thyroid panel, and Clinical breast examination',
    specimen_type: 'Gynecologic & Laboratory Battery',
    benchmark_turnaround: '24-48 hours'
  },
  {
    provider_type: 'laboratory',
    department: 'Wellness & Prevention',
    service_name: 'Well-Man Comprehensive Health Screen',
    service_code: 'LAB-WEL-MAN',
    description: 'FBC, Lipids, E/U/Cr, Total & Free PSA, Resting ECG, and Abdomino-Pelvic scan for prostate assessment',
    specimen_type: 'Cardio, Uro & Laboratory Battery',
    benchmark_turnaround: '24-48 hours'
  }
];

export const INITIAL_PROVIDER_TARIFFS = [
  // Lagoon Specialist Hospital (Diagnostic Wing)
  {
    provider_id: 'PRV-LAG-01',
    service_code: 'LAB-HEM-FBC',
    price: 12000,
    turnaround_time: 'Same day (2-4 hrs)',
    turnaround_hours: 4,
    hmo_accepted: ['Reliance HMO', 'AXA Mansard', 'Hygeia HMO', 'Leadway Health', 'Avon HMO'],
    is_published: true,
    effective_date: '2026-01-01',
    last_edited_by: 'Dr. K. Balogun · Revenue Cycle Lead'
  },
  {
    provider_id: 'PRV-LAG-01',
    service_code: 'LAB-CHM-EUCR',
    price: 28000,
    turnaround_time: 'Same day (4 hrs)',
    turnaround_hours: 4,
    hmo_accepted: ['Reliance HMO', 'AXA Mansard', 'Hygeia HMO', 'Leadway Health', 'Avon HMO'],
    is_published: true,
    effective_date: '2026-01-01',
    last_edited_by: 'Dr. K. Balogun · Revenue Cycle Lead'
  },
  {
    provider_id: 'PRV-LAG-01',
    service_code: 'LAB-CHM-LIP',
    price: 26000,
    turnaround_time: 'Same day (4 hrs)',
    turnaround_hours: 4,
    hmo_accepted: ['Reliance HMO', 'AXA Mansard', 'Hygeia HMO', 'Leadway Health', 'Avon HMO'],
    is_published: true,
    effective_date: '2026-01-01',
    last_edited_by: 'Dr. K. Balogun · Revenue Cycle Lead'
  },
  {
    provider_id: 'PRV-LAG-01',
    service_code: 'LAB-CHM-GLUC',
    price: 15000,
    turnaround_time: 'Same day (2-4 hrs)',
    turnaround_hours: 4,
    hmo_accepted: ['Reliance HMO', 'AXA Mansard', 'Hygeia HMO', 'Avon HMO'],
    is_published: true,
    effective_date: '2026-01-01',
    last_edited_by: 'Dr. K. Balogun · Revenue Cycle Lead'
  },
  {
    provider_id: 'PRV-LAG-01',
    service_code: 'LAB-CHM-LFT',
    price: 25000,
    turnaround_time: 'Same day (4 hrs)',
    turnaround_hours: 4,
    hmo_accepted: ['Reliance HMO', 'AXA Mansard', 'Hygeia HMO', 'Avon HMO'],
    is_published: true,
    effective_date: '2026-01-01',
    last_edited_by: 'Dr. K. Balogun · Revenue Cycle Lead'
  },
  {
    provider_id: 'PRV-LAG-01',
    service_code: 'CAR-ECG-12L',
    price: 18000,
    turnaround_time: 'Same day (immediate)',
    turnaround_hours: 1,
    hmo_accepted: ['Reliance HMO', 'AXA Mansard', 'Avon HMO'],
    is_published: true,
    effective_date: '2026-01-01',
    last_edited_by: 'Dr. K. Balogun · Revenue Cycle Lead'
  },
  {
    provider_id: 'PRV-LAG-01',
    service_code: 'ULT-ABD-PEL',
    price: 22000,
    turnaround_time: 'Same day (immediate)',
    turnaround_hours: 1,
    hmo_accepted: ['Reliance HMO', 'AXA Mansard', 'Leadway Health', 'Avon HMO'],
    is_published: true,
    effective_date: '2026-01-01',
    last_edited_by: 'Dr. K. Balogun · Revenue Cycle Lead'
  },
  {
    provider_id: 'PRV-LAG-01',
    service_code: 'RAD-XRY-CXR',
    price: 18000,
    turnaround_time: 'Same day (1-2 hrs)',
    turnaround_hours: 2,
    hmo_accepted: ['Reliance HMO', 'AXA Mansard', 'Hygeia HMO', 'Leadway Health', 'Avon HMO'],
    is_published: true,
    effective_date: '2026-01-01',
    last_edited_by: 'Dr. K. Balogun · Revenue Cycle Lead'
  },
  {
    provider_id: 'PRV-LAG-01',
    service_code: 'LAB-WEL-PREEMP',
    price: 35000,
    turnaround_time: '24 hours',
    turnaround_hours: 24,
    hmo_accepted: ['Reliance HMO', 'AXA Mansard'],
    is_published: true,
    effective_date: '2026-01-01',
    last_edited_by: 'Dr. K. Balogun · Revenue Cycle Lead'
  },

  // ABC Diagnostics (Referral Diagnostic Partner)
  {
    provider_id: 'PRV-ABC-01',
    service_code: 'LAB-HEM-FBC',
    price: 8500,
    turnaround_time: 'Same day (2-4 hrs)',
    hmo_accepted: ['Reliance HMO', 'AXA Mansard', 'Hygeia HMO'],
    is_published: true
  },
  {
    provider_id: 'PRV-ABC-01',
    service_code: 'LAB-CHM-EUCR',
    price: 20000,
    turnaround_time: 'Same day (4 hrs)',
    hmo_accepted: ['Reliance HMO', 'AXA Mansard', 'Hygeia HMO'],
    is_published: true
  },
  {
    provider_id: 'PRV-ABC-01',
    service_code: 'LAB-CHM-LIP',
    price: 12000,
    turnaround_time: 'Same day (4 hrs)',
    hmo_accepted: ['Reliance HMO', 'AXA Mansard', 'Hygeia HMO'],
    is_published: true
  },
  {
    provider_id: 'PRV-ABC-01',
    service_code: 'LAB-MIC-URN',
    price: 3500,
    turnaround_time: 'Same day (1 hr)',
    hmo_accepted: ['Reliance HMO', 'AXA Mansard'],
    is_published: true
  },
  {
    provider_id: 'PRV-ABC-01',
    service_code: 'LAB-MIC-UMCS',
    price: 12000,
    turnaround_time: '48-72 hours',
    hmo_accepted: ['Reliance HMO', 'AXA Mansard'],
    is_published: true
  },
  {
    provider_id: 'PRV-ABC-01',
    service_code: 'LAB-IMM-HBS',
    price: 5000,
    turnaround_time: 'Same day (2 hrs)',
    hmo_accepted: ['Reliance HMO', 'AXA Mansard'],
    is_published: true
  },
  {
    provider_id: 'PRV-ABC-01',
    service_code: 'LAB-HIS-PAP',
    price: 25000,
    turnaround_time: '3-5 days',
    hmo_accepted: ['Reliance HMO', 'AXA Mansard'],
    is_published: true
  },

  // Wellness Point Lab
  {
    provider_id: 'PRV-WPL-01',
    service_code: 'LAB-HEM-FBC',
    price: 9000,
    turnaround_time: 'Same day (2-4 hrs)',
    hmo_accepted: ['Reliance HMO', 'Hygeia HMO'],
    is_published: true
  },
  {
    provider_id: 'PRV-WPL-01',
    service_code: 'LAB-CHM-GLUC',
    price: 14000,
    turnaround_time: 'Same day (2-4 hrs)',
    hmo_accepted: ['Reliance HMO', 'Hygeia HMO'],
    is_published: true
  },
  {
    provider_id: 'PRV-WPL-01',
    service_code: 'LAB-IMM-MAL',
    price: 3000,
    turnaround_time: 'Same day (1 hr)',
    hmo_accepted: ['Reliance HMO', 'Hygeia HMO'],
    is_published: true
  },
  {
    provider_id: 'PRV-WPL-01',
    service_code: 'LAB-IMM-TFT',
    price: 28000,
    turnaround_time: '24 hours',
    hmo_accepted: ['Reliance HMO'],
    is_published: false
  }
];

export const SEED_PAYER_PLAN_RULES = [
  // 1. Reliance HMO
  {
    payer_name: 'Reliance HMO',
    plan_name: 'Silver Plan',
    copay_percentage: 20.00,
    preauth_threshold: 100000,
    deductible: 0,
    covered_categories: ['Haematology', 'Chemical Pathology', 'Medical Microbiology', 'Immunology & Serology', 'Diagnostic Ultrasound', 'Diagnostic Radiology'],
    excluded_services: ['Comprehensive Executive Health Check'],
    is_active: true
  },
  {
    payer_name: 'Reliance HMO',
    plan_name: 'Comprehensive Plan',
    copay_percentage: 10.00,
    preauth_threshold: 150000,
    deductible: 0,
    covered_categories: null,
    excluded_services: [],
    is_active: true
  },
  {
    payer_name: 'Reliance HMO',
    plan_name: 'Standard Benefit Plan',
    copay_percentage: 15.00,
    preauth_threshold: 75000,
    deductible: 0,
    covered_categories: ['Haematology', 'Chemical Pathology', 'Medical Microbiology', 'Immunology & Serology', 'Diagnostic Ultrasound', 'Diagnostic Radiology', 'Cardiology (Non-Invasive)'],
    excluded_services: ['Pre-Employment Medical Examination Panel'],
    is_active: true
  },

  // 2. AXA Mansard
  {
    payer_name: 'AXA Mansard',
    plan_name: 'Gold Plan',
    copay_percentage: 10.00,
    preauth_threshold: 25000,
    deductible: 0,
    covered_categories: null,
    excluded_services: [],
    is_active: true
  },
  {
    payer_name: 'AXA Mansard',
    plan_name: 'Comprehensive Plan',
    copay_percentage: 10.00,
    preauth_threshold: 120000,
    deductible: 0,
    covered_categories: null,
    excluded_services: [],
    is_active: true
  },
  {
    payer_name: 'AXA Mansard',
    plan_name: 'Standard Benefit Plan',
    copay_percentage: 20.00,
    preauth_threshold: 50000,
    deductible: 0,
    covered_categories: ['Haematology', 'Chemical Pathology', 'Medical Microbiology', 'Immunology & Serology', 'Diagnostic Ultrasound', 'Diagnostic Radiology'],
    excluded_services: [],
    is_active: true
  },

  // 3. Hygeia HMO
  {
    payer_name: 'Hygeia HMO',
    plan_name: 'Corporate Standard',
    copay_percentage: 10.00,
    preauth_threshold: 80000,
    deductible: 0,
    covered_categories: null,
    excluded_services: [],
    is_active: true
  },
  {
    payer_name: 'Hygeia HMO',
    plan_name: 'Comprehensive Plan',
    copay_percentage: 15.00,
    preauth_threshold: 100000,
    deductible: 0,
    covered_categories: null,
    excluded_services: [],
    is_active: true
  },
  {
    payer_name: 'Hygeia HMO',
    plan_name: 'Standard Benefit Plan',
    copay_percentage: 20.00,
    preauth_threshold: 60000,
    deductible: 0,
    covered_categories: null,
    excluded_services: [],
    is_active: true
  },

  // 4. Leadway Health
  {
    payer_name: 'Leadway Health',
    plan_name: 'Comprehensive Plan',
    copay_percentage: 10.00,
    preauth_threshold: 120000,
    deductible: 0,
    covered_categories: null,
    excluded_services: [],
    is_active: true
  },
  {
    payer_name: 'Leadway Health',
    plan_name: 'Standard Benefit Plan',
    copay_percentage: 15.00,
    preauth_threshold: 75000,
    deductible: 0,
    covered_categories: null,
    excluded_services: [],
    is_active: true
  },

  // 5. Avon HMO
  {
    payer_name: 'Avon HMO',
    plan_name: 'Avon Plus Plan',
    copay_percentage: 10.00,
    preauth_threshold: 50000,
    deductible: 0,
    covered_categories: null,
    excluded_services: [],
    is_active: true
  },
  {
    payer_name: 'Avon HMO',
    plan_name: 'Avon Executive Plan',
    copay_percentage: 0.00,
    preauth_threshold: 100000,
    deductible: 0,
    covered_categories: null,
    excluded_services: [],
    is_active: true
  }
];
