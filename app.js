/* ============================================================
   WelliPay — Full App Logic
   All 36 screens, state management, bilingual copy (EN/Pidgin)
   ============================================================ */

'use strict';

/* ── Helpers ─────────────────────────────────────────────── */
const NAIRA = n => {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(n);
  const whole = Math.floor(abs);
  const cents = Math.round((abs - whole) * 100);
  const s = n < 0 ? '-' : '';
  const formatted = cents > 0
    ? abs.toFixed(2)
    : whole.toString();
  return s + '₦' + formatted.toString().replace(/\d(?=(\d{3})+(?:\.\d+)?$)/g, '$&,');
};

const fmtDate = d => {
  if (!d) return '';
  if (typeof d === 'string') return d;
  return d.toLocaleDateString('en-NG', { day:'2-digit', month:'short', year:'numeric' });
};

const pad2 = n => String(n).padStart(2, '0');

const timeNow = () => {
  const d = new Date();
  const h = d.getHours();
  const m = pad2(d.getMinutes());
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${m} ${ampm}`;
};

const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const avatarColors = {
  self:  { bg: '#cbeeff', fg: '#004961' },
  ade:   { bg: '#ffdee6', fg: '#790e3d' },
  faith: { bg: '#d7f0e0', fg: '#1a5c35' },
};
const getAvatarColor = id => avatarColors[id] || { bg: '#eae7e7', fg: '#444141' };
const initials = name => name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

/* ── Real QR Code SVG Generator (Cached & Reactive) ────────── */
const _qrCache = {};
const getQrSvg = (text, color = '#004961') => {
  const key = `${text}_${color}`;
  if (_qrCache[key]) return _qrCache[key];
  if (typeof window !== 'undefined' && window.QRCode && window.QRCode.toString) {
    window.QRCode.toString(text, {
      type: 'svg',
      margin: 1,
      color: { dark: color, light: '#ffffff' }
    }).then(svg => {
      _qrCache[key] = svg;
      document.querySelectorAll(`[data-qr-key="${CSS.escape(key)}"]`).forEach(el => {
        el.innerHTML = svg;
      });
    }).catch(err => console.error('QR Gen error:', err));
  }
  return `<div data-qr-key="${key}" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:160px"><div class="spinner"></div></div>`;
};

/* ── Copy strings (EN + Nigerian Pidgin) ────────────────────*/
const COPY = {
  en: {
    tagline: 'Healthcare payments, simplified.',
    welcomeBody: 'Pay hospital bills, manage family health expenses, and track your spending — all in one place.',
    getStarted: 'Get started',
    terms: 'By continuing, you agree to our Terms & Privacy Policy',
    phoneTitle: 'Enter your number',
    phoneHelper: "We'll send you a one-time code to verify.",
    phoneLabel: 'Phone number',
    sendCode: 'Send code',
    phoneError: 'Please enter a valid 10-digit number.',
    otpTitle: 'Enter the code',
    otpHelper: 'We sent a 6-digit code to +234 ',
    demoCorrect: '✓ Fill correct code',
    demoWrong: '✕ Fill wrong code',
    resendLabel: n => n > 0 ? `Resend in ${n}s` : 'Resend code',
    changeNumber: 'Change number',
    otpWrongMsg: 'Incorrect code. Please try again.',
    otpLockedMsg: 'Too many attempts. Please request a new code.',
    profileTitle: 'Tell us about you',
    fullName: 'Full name',
    dob: 'Date of birth',
    dobHelper: 'Must be 18+',
    emailOpt: 'Email (optional)',
    continue: 'Continue',
    lockTitle: 'Set your app PIN',
    lockHelper: 'Choose a 4-digit PIN to protect your account.',
    setPinLabel: 'Enter your PIN',
    confirmPinLabel: 'Confirm your PIN',
    pinMismatchMsg: "PINs don't match. Please try again.",
    useBiometric: 'Enable Face/Fingerprint instead',
    linkTitle: 'Link your WelliRecord',
    linkDoesLabel: 'What this does:',
    linkDoes: 'Automatically imports your hospital bills from linked facilities.',
    linkNotLabel: 'What it doesn\'t do:',
    linkNot: 'Share your medical records or diagnoses.',
    linkNow: 'Link my WelliRecord',
    linkedSuccessMsg: '✓ WelliRecord linked successfully.',
    skipForNow: 'Skip for now',
    walletIntroTitle: 'Create your WelliPay Wallet',
    walletIntroBody: 'Top up your wallet and pay bills instantly — no card details needed each time.',
    createWallet: 'Create my wallet',
    summaryKicker: 'Total outstanding',
    nextDueKicker: 'Next due',
    due: 'Due',
    payNow: 'Pay now',
    walletKicker: 'Wallet balance',
    recentBills: 'Recent bills',
    noBillsYet: 'No bills yet. Add one below.',
    addBill: '+ Add a bill',
    notifsTitle: 'Notifications',
    noNotifs: 'You\'re all caught up.',
    billsTitle: 'Bills',
    filterAll: 'All',
    filterUnpaid: 'Due',
    filterPaid: 'Paid',
    noBillsFilter: 'No bills match this filter.',
    addBillTitle: 'Add a bill',
    scanFrameHelp: 'Align the QR code on your bill\nwithin the frame',
    enterCodeInstead: 'Enter bill code instead',
    billCode: 'Bill code',
    demoValid: 'Demo: Valid code',
    demoExpired: 'Demo: Expired code',
    demoAlready: 'Demo: Already added',
    billNotFound: 'Bill not found. Please check the code.',
    billExpired: 'This bill code has expired.',
    billAlreadyAdded: 'This bill is already in your account.',
    billAdded: 'Bill added!',
    voidBanner: 'This bill has been cancelled by the facility.',
    showAllLines: n => `Show all ${n} items`,
    collapseLines: 'Show less',
    payerSplit: 'Insurance split',
    youPay: 'You pay',
    hmoPays: 'HMO pays',
    billTotal: 'Bill total',
    total: 'Total',
    shareStatement: 'Share statement',
    reportProblem: 'Report a problem',
    viewReceipt: 'View receipt',
    billChangedMsg: 'This bill was updated by the facility.',
    amountTitle: 'Choose amount',
    payFull: 'Pay full',
    payPart: 'Pay part amount',
    minPartHelper: amt => `Minimum part payment: ${amt}`,
    balanceAfterLabel: rem => `Remaining after this payment: ${rem}`,
    amountTooLow: min => `Minimum amount is ${min}`,
    amountTooHigh: 'Amount cannot exceed the balance due.',
    methodTitle: 'Choose payment method',
    payWithWallet: 'Pay from Wallet',
    payWithWalletSub: bal => `Balance: ${bal}`,
    insufficientWallet: 'Not enough balance',
    payWithCard: 'Debit / Credit card',
    payWithCardSub: 'Visa, Mastercard, Verve',
    payWithTransfer: 'Bank transfer',
    payWithTransferSub: 'Transfer to a one-time account number',
    paymentCancelledMsg: 'Payment was cancelled. Choose a method to try again.',
    confirmTitle: 'Confirm payment',
    youArePaying: 'You are paying',
    method: 'Method',
    totalCharge: 'Total charge',
    confirmBtn: 'Confirm & enter PIN',
    cancel: 'Cancel',
    confirmPinPrompt: 'Enter your 4-digit PIN to confirm',
    confirmFailedMsg: 'Wrong PIN. Please try again.',
    tryAgain: 'Try again',
    openingSecure: 'Opening secure payment…',
    checkingPayment: 'Checking your payment…',
    securePaymentKicker: 'SECURE PAYMENT',
    cardNumberLabel: 'Card number',
    expiryLabel: 'Expiry',
    cvvLabel: 'CVV',
    demoThreeDS: 'Demo: 3DS step',
    demoDecline: 'Demo: Decline',
    transferTitle: 'Bank transfer',
    transferInstruction: 'Transfer the exact amount to the account below. Your payment will be confirmed automatically.',
    bankName: 'Bank',
    accountNumber: 'Account number',
    accountName: 'Account name',
    amount: 'Amount',
    copy: 'Copy',
    expiresIn: 'Expires in',
    transferNote: 'This account number is valid for one payment only. Do not reuse it.',
    iHavePaid: "I've sent the money",
    chooseAnotherMethod: 'Choose a different method',
    transferExpiredMsg: 'This account number has expired.',
    getNewAccount: 'Get a new account number',
    pendingMsg: 'Your payment is being confirmed. This usually takes a few minutes.',
    demoResolveSuccess: 'Demo: Mark successful',
    demoResolveReview: 'Demo: Under review',
    successHeading: 'Payment successful',
    stillToPay: rem => `Balance remaining: ${rem}`,
    payBalanceBtn: 'Pay remaining balance',
    backToBills: 'Back to bills',
    failedHeading: 'Payment failed',
    failReason: {
      declined: 'Your card was declined.',
      expired: 'Session expired.',
      default: 'Something went wrong.',
    },
    useAnotherMethod: 'Use a different method',
    expiredMsg: 'Your session expired. Please try again.',
    underReviewMsg: 'Your payment is being reviewed. We\'ll notify you when it\'s confirmed.',
    contactSupport: 'Contact support',
    receiptTitle: 'Receipt',
    preparingReceipt: 'Preparing your receipt…',
    facilityLabel: 'Facility',
    personLabel: 'Patient',
    methodLabel2: 'Payment method',
    amountPaid: 'Amount paid',
    balanceLabel: 'Remaining balance',
    share: 'Share',
    download: 'Download',
    historyTitle: 'Payments',
    thisMonth: 'This month',
    noPaymentsYet: 'No payments yet.',
    reportTitle: 'Report a problem',
    reportCategoryLabel: 'What\'s the issue?',
    cat_wrongAmt: 'Wrong amount',
    cat_alreadyPaid: 'Already paid',
    cat_duplicate: 'Duplicate charge',
    cat_other: 'Something else',
    reportDescLabel: 'Describe the issue',
    reportDescPlaceholder: 'Tell us what happened…',
    reportSubmit: 'Submit report',
    reportSubmittedMsg: 'Report submitted. We\'ll be in touch.',
    reportdetailTitle: 'Report status',
    ticketLabel: 'Ticket no.',
    statusLabel: 'Status',
    reportFollowupNote: 'A WelliPay agent will contact you within 1 business day.',
    underReviewStatus: 'Under review',
    walletTitle: 'Wallet',
    topUpBtn: 'Top up',
    autoPayLabel: 'Auto-pay bills',
    autoPaySub: 'Automatically pay bills from wallet when they\'re due.',
    walletActivity: 'Activity',
    noWalletActivity: 'No transactions yet.',
    topup_title: 'Top up wallet',
    savings_topup_title: 'Contribute to savings',
    customAmountLabel: 'Or enter custom amount',
    topupPresets: ['₦5,000', '₦10,000', '₦20,000', '₦50,000'],
    insightsTitle: 'Insights',
    scopeMe: 'Just me',
    scopeFamily: 'Whole family',
    spendingKicker: 'Spending — last 4 months',
    familySpendKicker: 'Spending by person',
    upcomingKicker: 'Upcoming expenses',
    noUpcoming: 'No upcoming bills.',
    manageReminders: 'Manage reminders',
    insuranceKicker: 'Insurance utilisation',
    hmoPaidLabel: 'HMO:',
    youPaidLabel: 'You:',
    savingsKicker: 'Savings goal',
    contributeBtn: 'Contribute',
    financingKicker: 'Financing obligations',
    nextInstallment: 'Next installment:',
    payInstallmentBtn: 'Pay next installment',
    noPlans: 'No active financing plans.',
    peopleTitle: 'People',
    addPerson: '+ Add a person',
    addDepTitle: 'Add a person',
    depNameLabel: 'Full name',
    depRelationLabel: 'Relationship',
    depDobLabel: 'Date of birth',
    depSave: 'Save',
    depNameRequired: 'Please enter a name.',
    rel_child: 'Child',
    rel_spouse: 'Spouse',
    rel_parent: 'Parent',
    rel_other: 'Other',
    profile2Title: 'Profile',
    settingsMenu: ['People', 'Security', 'Privacy', 'Notifications', 'Language', 'Help', 'Contact us', 'Legal'],
    deleteAccountLabel: 'Delete account',
    logOut: 'Log out',
    securityTitle: 'Security',
    biometricLabel: 'Face / Fingerprint unlock',
    biometricSub: 'Use biometrics to open the app.',
    changePinLabel: 'Change PIN',
    privacyTitle: 'Privacy & consent',
    hmoShareLabel: 'Share bills with HMO',
    hmoShareSub: 'Allow your insurer to view bill line items.',
    marketingLabel: 'Marketing messages',
    marketingSub: 'Receive offers and promotions from WelliPay.',
    notifprefsTitle: 'Notification preferences',
    billAlertsLabel: 'New bill alerts',
    receiptsLabel: 'Payment receipts',
    promoLabel: 'Promotions',
    languageTitle: 'Language',
    helpTitle: 'Help centre',
    contactTitle: 'Contact us',
    callSupport: 'Call us',
    whatsappSupport: 'WhatsApp',
    emailSupport: 'Email',
    legalTitle: 'Legal',
    termsLink: 'Terms of service',
    privacyLink: 'Privacy policy',
    refundLink: 'Refund policy',
    deleteTitle: 'Delete account',
    deleteWarning: 'Deleting your account will permanently remove all your data, including bills, payment history, and wallet balance. This cannot be undone.',
    deleteFinalWarning: 'Are you absolutely sure? This action is irreversible.',
    deleteConfirmBtn: 'I understand — delete my account',
    deleteFinalBtn: 'Yes, delete permanently',
    deleteCancel: 'Keep my account',
    deleteDoneMsg: 'Your account has been deleted.',
    tabHome: 'Home',
    tabBills: 'Bills',
    tabWallet: 'Wallet',
    tabInsights: 'Insights',
    tabPay: 'Payments',
    tabProfile: 'Profile',
    people: 'Household',
    runAutoPayLabel: b => `Run auto-pay now (${NAIRA(b)})`,
    autoPayRanMsg: b => `Auto-pay ran: ${NAIRA(b)} deducted from wallet.`,
    copiedMsg: 'Copied!',
    payCtaLabel: bal => bal > 0 ? `Pay ${NAIRA(bal)}` : 'Bill is paid',
    payCtaPartial: 'Pay this bill',
    billNo: 'Bill no.',
    dueLabel: 'Due',
    // Dual-Payer & Episode
    episodeTimeline: 'Episode Timeline',
    dualPayerTitle: 'Dual-Payer Responsibility',
    hmoCover: 'HMO Coverage',
    patientSelfPay: 'Patient Self-Pay (PSP)',
    depositApplied: 'Pre-service deposit applied',
    reconcileTitle: 'WelliPay Reconcile™',
    varianceUnderpay: 'HMO Underpayment Variance',
    hmoReceivable: 'HMO Receivable',
    flagDispute: 'Flag HMO Underpayment Dispute',
    disputeSubmitted: 'Dispute flagged with HMO provider desk.',
    // FamilyPay
    familyPay: 'FamilyPay Diaspora Hub',
    diasporaRates: 'Diaspora FX Rates',
    copyLink: 'Copy Web Payment Link',
    shareWhatsapp: 'Share on WhatsApp',
    contributePool: '+ Contribute to Pool',
    funded: 'funded',
    poolTarget: 'Pool Target',
    // WelliPass
    welliPass: 'WelliPass Clearance',
    gatePassTitle: 'Hospital Gate Security Pass',
    scanAtGate: 'Scan at hospital main gate for automated exit clearance',
    doctorSignOff: '1. Doctor Clinical Sign-Off',
    pharmacyClearance: '2. Pharmacy Discharge Clearance',
    hmoRemittance: '3. HMO Remittance Approval',
    pspReconciled: '4. Patient Self-Pay (PSP) Reconciliation',
    balanceFlagged: 'Outstanding Balance Flagged',
    payBalanceNow: 'Pay Balance Now',
    seeCashier: 'Route to Cashier Desk',
    sendNotifications: 'Dispatch Multi-Party WhatsApp & Email',
    notificationsSent: 'Clearance invoice sent to patient & billing desk via WhatsApp and Email.',
    togglePassStatus: 'Demo: Toggle Cleared / Flagged PSP',
    // Rx Pharmacy
    rxTitle: 'Rx Pharmacy Formulary',
    genericSavings: 'WHO/NAFDAC Generic Cost Savings',
    compareMeds: 'Brand vs Generic Comparison',
    brandName: 'Brand Name',
    genericEquiv: 'Generic Bioequivalent',
    substituteGeneric: 'Substitute Generic',
    applyGenerics: 'Apply All Generic Substitutions',
    nafdacReg: 'NAFDAC Reg',
    sendDispensary: 'Send to Hospital Dispensary',
    dispensarySent: 'Prescription sent to outpatient dispensary.',
    // Offline USSD
    ussdTitle: 'Offline USSD Mode',
    zeroDataMode: 'Zero-Data / Low Bandwidth Mode Active',
    zeroDataDesc: 'Settle bills even with zero mobile data or inside hospital basements.',
    dialCode: 'Dial Shortcode',
    offlineVoucher: 'Offline Digital Voucher',
    offlineVerify: 'Verified Offline',
    // Provider Desk
    providerTitle: 'Cashier Workstation (Staff)',
    patientDeskTitle: 'Hospital Desk Ticket',
    deskOperator: 'Hospital Cashier & HMO Desk Lead',
    totalBilled: 'Total Billed Today',
    hmoClaims: 'HMO Claims',
    pspCollected: 'PSP Collected',
    patientsCleared: 'Patients Cleared',
    liveQueue: 'Live Hospital Patient Queue',
    scanInvoice: 'Scan Hospital Invoice QR',
    closeInvoice: 'Close Invoice Review',
    // HealthSave Ajo
    healthSaveTitle: 'HealthSave Smart Ajo',
    totalHealthSavings: 'Total Health Savings',
    createPot: '+ Create New Pot',
    roundupActive: 'Spare Change Round-Up Active',
    quickAddFunds: '+ Quick Add ₦5,000',
    potAddedFunds: '₦5,000 added to HealthSave pot.',
    // HMO Manager
    hmoTitle: 'HMO Policies & Reconcile',
    preAuths: 'Pre-Authorization Approvals',
    // Facilities
    facilitiesTitle: 'Accredited Hospital Facilities',
    emergencyLine: 'Emergency Line',
    wellirecordIntegrated: 'WelliRecord Integrated',
    // Fallback & Gate Security
    fallbackTitle: 'No Phone or Low Battery? Fallback Options',
    fallbackSub: 'Physical thermal slip, SMS to family, or gate security terminal lookup',
    printThermalSlip: 'Print Thermal Gate Slip',
    resendNokSms: 'Resend SMS to Next-of-Kin',
    thermalSlipTitle: 'Discharge Gate Clearance Slip',
    gateTerminalTitle: 'Gate Security Terminal',
    barrierOpen: 'Authorize & Open Barrier',
    barrierOpenedMsg: 'Barrier Raised — Vehicle & Patient Exit Cleared',
    resetStation: 'Reset Station for Next Exit',
    matronOverride: 'Supervisor Emergency Override',
    // Enhanced Hospital Desk & Queue
    cashierWorkstation: 'Cashier Workstation',
    patientDeskTicket: 'Patient Desk Ticket & Check-in',
    queueSearchPlaceholder: 'Search queue by patient, MRN, or bed...',
    filterAll: 'All Patients',
    filterAwaitingPsp: 'Awaiting Co-Pay',
    filterWaitingHmo: 'Waiting HMO',
    filterCleared: 'Cleared',
    collectPayment: 'Collect Payment / Settle',
    cashReceived: 'Accept Cash at Counter',
    posCharge: 'Charge Physical POS Terminal',
    pushUssd: 'Push USSD Prompt to Patient Phone',
    sendWhatsappLink: 'Share WhatsApp Pay Link',
    bedsideRequested: 'Bedside Cashier Settlement Active',
    requestBedside: 'Request Bedside Cashier Settlement',
    ticketTitle: 'Hospital Cashier Queue Ticket',
    nowServing: 'Now Serving',
    patientsAhead: 'patients ahead of you',
    estWait: 'Est. Wait',
    counterAttendant: 'Cashier Attendant',
    payWalletInstant: 'Pay via Wallet (Zero Wait)',
    endShiftReport: 'End Shift / EOD Report',
  },
  pcm: {
    tagline: 'Hospital bills, e don easy.',
    welcomeBody: 'Pay your hospital bill, manage your family health money, and see how you dey spend — everything dey one place.',
    getStarted: 'Make we start',
    terms: 'As you continue, you don agree to our Terms & Privacy Policy',
    phoneTitle: 'Enter your number',
    phoneHelper: 'We go send you one code to verify.',
    phoneLabel: 'Phone number',
    sendCode: 'Send code',
    phoneError: 'Abeg enter correct 10-digit number.',
    otpTitle: 'Enter the code',
    otpHelper: 'We don send 6-digit code go +234 ',
    demoCorrect: '✓ Fill correct code',
    demoWrong: '✕ Fill wrong code',
    resendLabel: n => n > 0 ? `Resend in ${n}s` : 'Resend code',
    changeNumber: 'Change number',
    otpWrongMsg: 'Code no correct. Try again.',
    otpLockedMsg: 'Too many try. Ask for new code.',
    profileTitle: 'Tell us about yourself',
    fullName: 'Full name',
    dob: 'Date of birth',
    dobHelper: 'You must reach 18 years',
    emailOpt: 'Email (optional)',
    continue: 'Continue',
    lockTitle: 'Set your PIN',
    lockHelper: 'Choose 4-digit PIN to protect your account.',
    setPinLabel: 'Enter your PIN',
    confirmPinLabel: 'Confirm your PIN',
    pinMismatchMsg: 'PIN no match. Try again.',
    useBiometric: 'Use Face/Fingerprint instead',
    linkTitle: 'Link your WelliRecord',
    linkDoesLabel: 'Wetin e go do:',
    linkDoes: 'E go pull your hospital bills from linked facilities automatically.',
    linkNotLabel: 'Wetin e no go do:',
    linkNot: 'E no go share your medical records or diagnosis.',
    linkNow: 'Link my WelliRecord',
    linkedSuccessMsg: '✓ WelliRecord don link.',
    skipForNow: 'Skip for now',
    walletIntroTitle: 'Create your WelliPay Wallet',
    walletIntroBody: 'Top up your wallet and pay hospital bills sharp sharp — no need enter card every time.',
    createWallet: 'Create my wallet',
    summaryKicker: 'Total wey you owe',
    nextDueKicker: 'Next due',
    due: 'Due',
    payNow: 'Pay now',
    walletKicker: 'Wallet balance',
    recentBills: 'Recent bills',
    noBillsYet: 'No bills yet. Add one below.',
    addBill: '+ Add bill',
    notifsTitle: 'Notifications',
    noNotifs: 'You don read everything.',
    billsTitle: 'Bills',
    filterAll: 'All',
    filterUnpaid: 'Due',
    filterPaid: 'Paid',
    noBillsFilter: 'No bill match this filter.',
    addBillTitle: 'Add bill',
    scanFrameHelp: 'Put the QR code for your bill\ninside the frame',
    enterCodeInstead: 'Enter bill code instead',
    billCode: 'Bill code',
    demoValid: 'Demo: Valid code',
    demoExpired: 'Demo: Expired code',
    demoAlready: 'Demo: Already added',
    billNotFound: 'Bill no dey. Check the code again.',
    billExpired: 'This bill code don expire.',
    billAlreadyAdded: 'This bill don already dey your account.',
    billAdded: 'Bill don add!',
    voidBanner: 'This bill don cancel by the hospital.',
    showAllLines: n => `Show all ${n} items`,
    collapseLines: 'Show less',
    payerSplit: 'Insurance split',
    youPay: 'You go pay',
    hmoPays: 'HMO go pay',
    billTotal: 'Bill total',
    total: 'Total',
    shareStatement: 'Share statement',
    reportProblem: 'Report problem',
    viewReceipt: 'View receipt',
    billChangedMsg: 'Hospital don update this bill.',
    amountTitle: 'Choose amount',
    payFull: 'Pay full',
    payPart: 'Pay part',
    minPartHelper: amt => `Minimum part payment: ${amt}`,
    balanceAfterLabel: rem => `Wey go remain: ${rem}`,
    amountTooLow: min => `Minimum amount na ${min}`,
    amountTooHigh: 'Amount no fit pass the balance.',
    methodTitle: 'Choose how to pay',
    payWithWallet: 'Pay from Wallet',
    payWithWalletSub: bal => `Balance: ${bal}`,
    insufficientWallet: 'Balance no enough',
    payWithCard: 'Debit / Credit card',
    payWithCardSub: 'Visa, Mastercard, Verve',
    payWithTransfer: 'Bank transfer',
    payWithTransferSub: 'Transfer to one-time account number',
    paymentCancelledMsg: 'Payment cancel. Choose method to try again.',
    confirmTitle: 'Confirm payment',
    youArePaying: 'You wan pay',
    method: 'Method',
    totalCharge: 'Total',
    confirmBtn: 'Confirm & enter PIN',
    cancel: 'Cancel',
    confirmPinPrompt: 'Enter your 4-digit PIN to confirm',
    confirmFailedMsg: 'Wrong PIN. Try again.',
    tryAgain: 'Try again',
    openingSecure: 'Opening secure payment…',
    checkingPayment: 'Checking your payment…',
    securePaymentKicker: 'SECURE PAYMENT',
    cardNumberLabel: 'Card number',
    expiryLabel: 'Expiry',
    cvvLabel: 'CVV',
    demoThreeDS: 'Demo: 3DS step',
    demoDecline: 'Demo: Decline',
    transferTitle: 'Bank transfer',
    transferInstruction: 'Transfer the exact amount go the account below. Your payment go confirm automatically.',
    bankName: 'Bank',
    accountNumber: 'Account number',
    accountName: 'Account name',
    amount: 'Amount',
    copy: 'Copy',
    expiresIn: 'E go expire in',
    transferNote: 'This account number na for one payment only. No use am again.',
    iHavePaid: 'I don send the money',
    chooseAnotherMethod: 'Choose different method',
    transferExpiredMsg: 'This account number don expire.',
    getNewAccount: 'Get new account number',
    pendingMsg: 'Your payment dey verify. E go take small time.',
    demoResolveSuccess: 'Demo: Mark successful',
    demoResolveReview: 'Demo: Under review',
    successHeading: 'Payment successful',
    stillToPay: rem => `Balance wey remain: ${rem}`,
    payBalanceBtn: 'Pay the remaining balance',
    backToBills: 'Back to bills',
    failedHeading: 'Payment no work',
    failReason: {
      declined: 'Your card don decline.',
      expired: 'Session don expire.',
      default: 'Somethng happen. Try again.',
    },
    useAnotherMethod: 'Use different method',
    expiredMsg: 'Your session don expire. Try again.',
    underReviewMsg: 'We dey check your payment. We go notify you when e confirm.',
    contactSupport: 'Contact support',
    receiptTitle: 'Receipt',
    preparingReceipt: 'We dey prepare your receipt…',
    facilityLabel: 'Facility',
    personLabel: 'Patient',
    methodLabel2: 'How you pay',
    amountPaid: 'Amount paid',
    balanceLabel: 'Balance wey remain',
    share: 'Share',
    download: 'Download',
    historyTitle: 'Payments',
    thisMonth: 'This month',
    noPaymentsYet: 'No payments yet.',
    reportTitle: 'Report problem',
    reportCategoryLabel: 'Wetin happen?',
    cat_wrongAmt: 'Wrong amount',
    cat_alreadyPaid: 'I don pay already',
    cat_duplicate: 'Duplicate charge',
    cat_other: 'Something else',
    reportDescLabel: 'Describe the issue',
    reportDescPlaceholder: 'Tell us wetin happen…',
    reportSubmit: 'Submit report',
    reportSubmittedMsg: 'Report don submit. We go reach you.',
    reportdetailTitle: 'Report status',
    ticketLabel: 'Ticket no.',
    statusLabel: 'Status',
    reportFollowupNote: 'WelliPay agent go contact you within 1 working day.',
    underReviewStatus: 'Under review',
    walletTitle: 'Wallet',
    topUpBtn: 'Top up',
    autoPayLabel: 'Auto-pay bills',
    autoPaySub: 'Pay bills from wallet automatically when dem due.',
    walletActivity: 'Activity',
    noWalletActivity: 'No transactions yet.',
    topup_title: 'Top up wallet',
    savings_topup_title: 'Contribute to savings',
    customAmountLabel: 'Or enter your own amount',
    topupPresets: ['₦5,000', '₦10,000', '₦20,000', '₦50,000'],
    insightsTitle: 'Insights',
    scopeMe: 'Just me',
    scopeFamily: 'Whole family',
    spendingKicker: 'Spending — last 4 months',
    familySpendKicker: 'Spending by person',
    upcomingKicker: 'Upcoming bills',
    noUpcoming: 'No upcoming bills.',
    manageReminders: 'Manage reminders',
    insuranceKicker: 'Insurance usage',
    hmoPaidLabel: 'HMO:',
    youPaidLabel: 'You:',
    savingsKicker: 'Savings goal',
    contributeBtn: 'Contribute',
    financingKicker: 'Financing plans',
    nextInstallment: 'Next installment:',
    payInstallmentBtn: 'Pay next installment',
    noPlans: 'No active plans.',
    peopleTitle: 'People',
    addPerson: '+ Add person',
    addDepTitle: 'Add person',
    depNameLabel: 'Full name',
    depRelationLabel: 'Relationship',
    depDobLabel: 'Date of birth',
    depSave: 'Save',
    depNameRequired: 'Abeg enter name.',
    rel_child: 'Child',
    rel_spouse: 'Spouse',
    rel_parent: 'Parent',
    rel_other: 'Other',
    profile2Title: 'Profile',
    settingsMenu: ['People', 'Security', 'Privacy', 'Notifications', 'Language', 'Help', 'Contact us', 'Legal'],
    deleteAccountLabel: 'Delete account',
    logOut: 'Log out',
    securityTitle: 'Security',
    biometricLabel: 'Face / Fingerprint',
    biometricSub: 'Use biometrics to open the app.',
    changePinLabel: 'Change PIN',
    privacyTitle: 'Privacy & consent',
    hmoShareLabel: 'Share bills with HMO',
    hmoShareSub: 'Allow your insurer to see your bill details.',
    marketingLabel: 'Marketing messages',
    marketingSub: 'Receive offers from WelliPay.',
    notifprefsTitle: 'Notification preferences',
    billAlertsLabel: 'New bill alerts',
    receiptsLabel: 'Payment receipts',
    promoLabel: 'Promotions',
    languageTitle: 'Language',
    helpTitle: 'Help centre',
    contactTitle: 'Contact us',
    callSupport: 'Call us',
    whatsappSupport: 'WhatsApp',
    emailSupport: 'Email',
    legalTitle: 'Legal',
    termsLink: 'Terms of service',
    privacyLink: 'Privacy policy',
    refundLink: 'Refund policy',
    deleteTitle: 'Delete account',
    deleteWarning: 'If you delete your account, all your data go disappear — bills, payment history, wallet balance. We no fit bring am back.',
    deleteFinalWarning: 'You sure? This one no fit undo.',
    deleteConfirmBtn: 'I understand — delete my account',
    deleteFinalBtn: 'Yes, delete permanently',
    deleteCancel: 'Keep my account',
    deleteDoneMsg: 'Your account don delete.',
    tabHome: 'Home',
    tabBills: 'Bills',
    tabWallet: 'Wallet',
    tabInsights: 'Insights',
    tabPay: 'Payments',
    tabProfile: 'Profile',
    people: 'Household',
    runAutoPayLabel: b => `Run auto-pay now (${NAIRA(b)})`,
    autoPayRanMsg: b => `Auto-pay run: ${NAIRA(b)} don comot from wallet.`,
    copiedMsg: 'Copied!',
    payCtaLabel: bal => bal > 0 ? `Pay ${NAIRA(bal)}` : 'Bill don pay',
    payCtaPartial: 'Pay this bill',
    billNo: 'Bill no.',
    dueLabel: 'Due',
    // Dual-Payer & Episode
    episodeTimeline: 'Hospital Matter Timeline',
    dualPayerTitle: 'Who Go Pay Wetin',
    hmoCover: 'HMO Contribution',
    patientSelfPay: 'Patient Self-Pay (PSP)',
    depositApplied: 'Deposit wey don enter',
    reconcileTitle: 'WelliPay Reconcile™',
    varianceUnderpay: 'HMO Money wey short',
    hmoReceivable: 'Money wey HMO still dey owe',
    flagDispute: 'Report HMO underpayment',
    disputeSubmitted: 'We don send report go HMO desk.',
    // FamilyPay
    familyPay: 'FamilyPay Diaspora Hub',
    diasporaRates: 'Abroad Money Rates',
    copyLink: 'Copy Web Pay Link',
    shareWhatsapp: 'Share for WhatsApp',
    contributePool: '+ Put Money for Pool',
    funded: 'don complete',
    poolTarget: 'Target Money',
    // WelliPass
    welliPass: 'WelliPass Clearance',
    gatePassTitle: 'Gate Security Pass',
    scanAtGate: 'Scan this code for gate make you fit waka comot',
    doctorSignOff: '1. Doctor Clinical Clearance',
    pharmacyClearance: '2. Pharmacy Medicine Clearance',
    hmoRemittance: '3. HMO Approval',
    pspReconciled: '4. Patient Self-Pay (PSP) Status',
    balanceFlagged: 'Balance Dey We Never Clear',
    payBalanceNow: 'Pay Balance Sharp Sharp',
    seeCashier: 'Go meet Cashier Desk',
    sendNotifications: 'Send WhatsApp & Email Clearance',
    notificationsSent: 'Clearance invoice don reach patient and hospital for WhatsApp and Email.',
    togglePassStatus: 'Demo: Change Cleared / Pending',
    // Rx Pharmacy
    rxTitle: 'Rx Pharmacy Formulary',
    genericSavings: 'Generic Medicine Discount',
    compareMeds: 'Compare Original vs Generic',
    brandName: 'Original Brand',
    genericEquiv: 'Generic Same-Work',
    substituteGeneric: 'Change to Generic',
    applyGenerics: 'Change All to Generic',
    nafdacReg: 'NAFDAC Reg',
    sendDispensary: 'Send go Hospital Pharmacy',
    dispensarySent: 'Prescription don reach hospital pharmacy.',
    // Offline USSD
    ussdTitle: 'Offline USSD Mode',
    zeroDataMode: 'Zero-Data / Low Bandwidth Mode Active',
    zeroDataDesc: 'Pay hospital bill even when data finish or you dey basement.',
    dialCode: 'Dial Shortcode',
    offlineVoucher: 'Offline Digital Voucher',
    offlineVerify: 'Verified Offline',
    // Provider Desk
    providerTitle: 'Hospital Cashier Desk (Staff)',
    patientDeskTitle: 'Hospital Desk Ticket',
    deskOperator: 'Hospital Cashier & HMO Lead',
    totalBilled: 'Total Money Billed Today',
    hmoClaims: 'HMO Claims',
    pspCollected: 'PSP Money Collected',
    patientsCleared: 'Patients Wey Don Waka',
    liveQueue: 'Patients Wey Dey Line',
    scanInvoice: 'Scan Hospital Bill QR',
    closeInvoice: 'Close Bill Review',
    // HealthSave Ajo
    healthSaveTitle: 'HealthSave Smart Ajo',
    totalHealthSavings: 'Total Health Money Wey You Save',
    createPot: '+ Open New Health Pot',
    roundupActive: 'Change Round-Up Dey Active',
    quickAddFunds: '+ Put ₦5,000 Sharp',
    potAddedFunds: '₦5,000 don enter your HealthSave pot.',
    // HMO Manager
    hmoTitle: 'HMO & Reconcile',
    preAuths: 'Approval from HMO',
    // Facilities
    facilitiesTitle: 'Accredited Hospitals',
    emergencyLine: 'Emergency Line',
    wellirecordIntegrated: 'WelliRecord don link',
    // Fallback & Gate Security
    fallbackTitle: 'Phone Don Die or No Smartphone? Other Ways',
    fallbackSub: 'Paper slip, SMS to family, or gate security machine check',
    printThermalSlip: 'Print Paper Gate Slip',
    resendNokSms: 'Resend SMS give Family',
    thermalSlipTitle: 'Discharge Gate Paper Slip',
    gateTerminalTitle: 'Security Gate Machine',
    barrierOpen: 'Allow Person Pass / Open Gate',
    barrierOpenedMsg: 'Gate Don Open — Patient Don Waka Free',
    resetStation: 'Clear Screen for Next Car',
    matronOverride: 'Matron Emergency Override',
    // Enhanced Hospital Desk & Queue
    cashierWorkstation: 'Cashier Machine View',
    patientDeskTicket: 'Patient Desk Ticket & Line',
    queueSearchPlaceholder: 'Find patient name, MRN, or bed...',
    filterAll: 'All Patients',
    filterAwaitingPsp: 'Dey Wait Co-Pay',
    filterWaitingHmo: 'Dey Wait HMO',
    filterCleared: 'Don Pay Finish',
    collectPayment: 'Collect Money / Clear Bill',
    cashReceived: 'Collect Cash for Hand',
    posCharge: 'Chop Card for POS Machine',
    pushUssd: 'Send USSD Prompt to Phone',
    sendWhatsappLink: 'Send WhatsApp Pay Link',
    bedsideRequested: 'Bedside Settlement Dey Active',
    requestBedside: 'Call Cashier Come My Bed',
    ticketTitle: 'Hospital Cashier Queue Ticket',
    nowServing: 'Person Wey Dey Pay Now',
    patientsAhead: 'people dey your front',
    estWait: 'Wait Time',
    counterAttendant: 'Cashier Wey Dey Duty',
    payWalletInstant: 'Pay with Wallet Sharp Sharp',
    endShiftReport: 'Close Shift / Today Money Report',
  }
};

/* ── Seed data ───────────────────────────────────────────── */
const PEOPLE = [
  { id: 'self',  name: 'Jay Umar',     relation: 'You',     relationKey: 'self' },
  { id: 'ade',   name: 'Ade Okoro',    relation: 'Son, 9',  relationKey: 'child' },
  { id: 'faith', name: 'Faith Oghene', relation: 'Spouse',  relationKey: 'spouse' },
];

const mkLines = n => {
  const names = ['Consultation','Lab test — Full blood count','X-ray — Chest','Nursing care','Ward admission (per night)','Dressing and wound care','IV fluids','Paracetamol 500mg','Amoxicillin 500mg','Physiotherapy session'];
  const prices = [1500,3000,5000,8000,12000];
  const items = [];
  for (let i = 0; i < n; i++) {
    const price = prices[i % prices.length];
    const rep = Math.floor(i / names.length);
    items.push({ name: names[i % names.length] + (rep > 0 ? ` (${rep+1})` : ''), qty: 1, price, total: price });
  }
  if (n > 2) items.push({ name: 'Facility discount', qty: 1, price: -3000, total: -3000, discount: true });
  return items;
};

const BILLS_SEED = [
  {
    id: 'b1',
    personId: 'self',
    facility: 'Dovers Hospitals',
    date: '21 Sep 2026',
    billNo: 'DH-88213',
    status: 'unpaid',
    amountDue: 20000,
    amountTotal: 100000,
    hmoAmount: 80000,
    patientSelfPay: 20000,
    hasSplit: true,
    minPart: 5000,
    lines: mkLines(23),
    changed: true,
    episodeId: 'ep1',
    depositPaid: 0,
    depositApplied: 0,
    payerAllocations: [
      { id:'pa1', payerType:'hmo', payerName:'Hygeia HMO (Comprehensive Tier)', allocatedAmount:80000, paidAmount:75000, status:'approved', approvalCode:'AUTH-HYG-8821', notes:'Covers 80% based on accredited hospital tariff schedule' },
      { id:'pa2', payerType:'patient_self_pay', payerName:'Patient Self-Pay (PSP)', allocatedAmount:20000, paidAmount:0, status:'pending', notes:'Remaining 20% patient co-responsibility' },
    ],
    reconciliation: { expectedHmo:80000, receivedHmo:75000, variance:5000, status:'underpaid' },
  },
  {
    id: 'b2',
    personId: 'self',
    facility: 'Redeemer Specialist Clinic',
    date: '10 Sep 2026',
    billNo: 'RSC-33021',
    status: 'overdue',
    amountDue: 10000,
    amountTotal: 40000,
    hmoAmount: 30000,
    patientSelfPay: 10000,
    hasSplit: true,
    minPart: 2000,
    lines: mkLines(4),
    episodeId: 'ep2',
    payerAllocations: [
      { id:'pa5', payerType:'hmo', payerName:'Reliance HMO (Classic Care)', allocatedAmount:30000, paidAmount:30000, status:'approved', approvalCode:'AUTH-REL-3302' },
      { id:'pa6', payerType:'patient_self_pay', payerName:'Patient Self-Pay (PSP)', allocatedAmount:10000, paidAmount:0, status:'pending' },
    ],
  },
  { id:'b3', personId:'ade',   facility:'Lagoon Diagnostics Centre',                            date:'18 Sep 2026', billNo:'LDC-90211',  status:'partly_paid', amountDue:6000,  amountTotal:15000, minPart:2000,  lines:mkLines(3) },
  { id:'b4', personId:'self',  facility:"St. Augustine's Medical Centre",                       date:'02 Sep 2026', billNo:'SAMC-70142', status:'paid',        amountDue:0,     amountTotal:45000, lines:mkLines(5), hmoAmount:35000, patientSelfPay:10000, hasSplit:true },
  { id:'b5', personId:'faith', facility:'Grace Family Clinic',                                  date:'28 Aug 2026', billNo:'GFC-10938',  status:'void',        amountDue:0,     amountTotal:12000, lines:mkLines(2) },
  {
    id: 'b6',
    personId: 'self',
    facility: 'Sunrise Medical Diagnostics Limited',
    date: '20 Sep 2026',
    billNo: 'SMD-55210',
    status: 'awaiting_hmo',
    amountDue: 8000,
    amountTotal: 75000,
    hmoAmount: 55000,
    patientSelfPay: 20000,
    depositPaid: 5000,
    depositApplied: 5000,
    hasSplit: true,
    minPart: 5000,
    lines: mkLines(6),
    episodeId: 'ep1',
    payerAllocations: [
      { id:'pa10', payerType:'hmo', payerName:'Reliance HMO (Primary)', allocatedAmount:55000, paidAmount:55000, status:'approved', approvalCode:'AUTH-REL-5521' },
      { id:'pa11', payerType:'patient_self_pay', payerName:'Patient Self-Pay (Deposit ₦5k + Paid ₦7k + Due ₦8k)', allocatedAmount:20000, paidAmount:12000, status:'pending' },
    ],
  },
  { id:'b7', personId:'ade',   facility:'Dovers Hospitals',                                     date:'10 Sep 2026', billNo:'DH-88401',   status:'unpaid',      amountDue:5000,  amountTotal:5000,  minPart:2000,  lines:mkLines(2) },
  { id:'b8', personId:'faith', facility:'Grace Family Clinic',                                  date:'02 Sep 2026', billNo:'GFC-10877',  status:'paid',        amountDue:0,     amountTotal:9000,  lines:mkLines(3) },
  { id:'b9', personId:'self',  facility:'Redeemer Specialist Clinic',                           date:'25 Sep 2026', billNo:'RSC-33199',  status:'unpaid',      amountDue:15000, amountTotal:15000, minPart:5000,  lines:mkLines(4) },
];

/* ── Episodes Seed (Dual-Payer Timeline) ─────────────────── */
const EPISODES_SEED = [
  {
    id: 'ep1',
    episodeNo: 'EP-2026-088',
    title: 'Acute Malaria & Enteric Fever (Typhoid) Episode',
    facility: 'Dovers Hospitals',
    personId: 'self',
    startDate: '19 Sep 2026',
    status: 'active',
    items: [
      { id:'epi1', category:'Consultation', description:'Initial Specialist Physician Consultation & Vitals', date:'19 Sep 2026', totalCost:15000, hmoContribution:10000, patientSelfPay:5000, paid:5000, status:'cleared' },
      { id:'epi2', category:'Laboratory', description:'Comprehensive Blood Panel (FBC, Widal, Malaria Pf parasite density)', date:'20 Sep 2026', totalCost:40000, hmoContribution:30000, patientSelfPay:10000, paid:7000, status:'partly_paid' },
      { id:'epi3', category:'Medication', description:'Artesunate IV injections, Oral Ciprofloxacin & Supportive Electrolytes', date:'21 Sep 2026', totalCost:20000, hmoContribution:15000, patientSelfPay:5000, paid:0, status:'unpaid' },
    ],
    depositPaid: 0,
    depositApplied: 0,
    totalCost: 75000,
    hmoCover: 55000,
    patientSelfPay: 20000,
    patientPaid: 12000,
    patientDue: 8000,
    hmoReceivable: { expected:55000, received:50000, variance:5000, status:'underpaid' },
  },
  {
    id: 'ep2',
    episodeNo: 'EP-2026-094',
    title: 'Diagnostic Laparoscopy & Short-Stay Observation',
    facility: 'Redeemer Specialist Clinic',
    personId: 'self',
    startDate: '14 Sep 2026',
    endDate: '16 Sep 2026',
    status: 'completed',
    items: [
      { id:'epi4', category:'Consultation', description:'Pre-operative Anesthetic Review & Consent', date:'14 Sep 2026', totalCost:20000, hmoContribution:16000, patientSelfPay:4000, paid:4000, status:'cleared' },
      { id:'epi5', category:'Procedure', description:'Diagnostic Laparoscopic Imaging & Biopsy', date:'15 Sep 2026', totalCost:45000, hmoContribution:35000, patientSelfPay:10000, paid:10000, status:'cleared' },
      { id:'epi6', category:'Ward/Bed', description:'Day-Stay Inpatient Observation & Nursing Support', date:'16 Sep 2026', totalCost:35000, hmoContribution:29000, patientSelfPay:6000, paid:6000, status:'cleared' },
    ],
    depositPaid: 25000,
    depositApplied: 20000,
    refundCredit: 5000,
    totalCost: 100000,
    hmoCover: 80000,
    patientSelfPay: 20000,
    patientPaid: 20000,
    patientDue: 0,
    hmoReceivable: { expected:80000, received:80000, variance:0, status:'balanced' },
  },
];

/* ── FamilyPay Diaspora Hub Seed ─────────────────────────── */
const FAMILY_PAY_SEED = [
  {
    id: 'fp1',
    billId: 'b2',
    patientName: 'Amina Bello',
    hospitalName: 'Redeemer Specialist Clinic',
    serviceDescription: 'Laparoscopic Surgery Co-Payment & Ward',
    totalAmountNgn: 55000,
    webLinkUrl: 'https://wellipay.ng/pay/BL-9482?sponsor=fam',
    shortCode: 'WLI-FAM-749',
    currencyRates: { USD:1550, GBP:2000, EUR:1700, CAD:1150 },
    poolTargetNgn: 55000,
    poolCollectedNgn: 35000,
    contributors: [
      { id:'c1', name:'Tunde Adeyemi', relation:'Brother (London, UK)', amountNgn:30000, currency:'GBP', foreignAmount:15, date:'Today, 11:20 am', message:'Wishing Amina a super speedy recovery! Love from London.' },
      { id:'c2', name:'Blessing Okafor', relation:'Cousin (Lagos)', amountNgn:5000, currency:'NGN', foreignAmount:5000, date:'Today, 12:45 pm', message:'Contribution towards discharge drugs.' },
    ],
    status: 'active',
  },
  {
    id: 'fp2',
    billId: 'b1',
    patientName: 'Amina Bello',
    hospitalName: 'St. Nicholas Hospital',
    serviceDescription: 'Specialist Investigation & Pathology',
    totalAmountNgn: 12000,
    webLinkUrl: 'https://wellipay.ng/pay/BL-4019?sponsor=fam',
    shortCode: 'WLI-FAM-332',
    currencyRates: { USD:1550, GBP:2000, EUR:1700, CAD:1150 },
    poolTargetNgn: 12000,
    poolCollectedNgn: 12000,
    contributors: [
      { id:'c3', name:'Uncle Emeka', relation:'Uncle (Atlanta, USA)', amountNgn:12000, currency:'USD', foreignAmount:7.74, date:'Yesterday, 8:10 pm', message:'Covered in full. Stay strong!' },
    ],
    status: 'funded',
  },
];

/* ── WelliPass Hospital Clearance Seed ───────────────────── */
const WELLIPASS_SEED = [
  {
    id: 'wp1',
    billId: 'b2',
    episodeId: 'ep2',
    patientName: 'Amina Bello',
    hospitalName: 'Redeemer Specialist Clinic',
    ward: 'Surgical Ward 3, Bed 12',
    admissionDate: '21 Sep 2026',
    dischargeDate: '24 Sep 2026',
    doctorSignOff: { cleared:true, officerName:'Dr. O. Alabi (Consultant Surgeon)', timestamp:'Today, 9:15 am', notes:'Surgical recovery uneventful. Wound dressed. Oral antibiotics prescribed for 5 days.' },
    pharmacyClearance: { cleared:true, officerName:'Pharm. K. Danladi', timestamp:'Today, 9:45 am', returnsReconciled:true, notes:'Take-home medications dispensed. 0 unused ampoules returned.' },
    hmoRemittance: { cleared:true, officerName:'HMO Desk Officer S. Eze', timestamp:'Today, 10:10 am', approvedAmount:130000, notes:'Pre-auth code HYG-SURG-7749 validated. Tariff claim ₦130,000 certified.' },
    pspReconciled: { cleared:true, officerName:'Cashier R. Bello', timestamp:'Today, 10:35 am', pspPaid:55000, balanceDue:0, notes:'Patient Self-Pay (PSP) ₦55,000 paid via FamilyPay & HealthSave. Zero balance.' },
    overallStatus: 'cleared',
    gatePassCode: 'WP-PASS-LAG-2026-4401',
    clearedAt: 'Today, 10:35 am',
    securityGuardVerified: false,
  },
  {
    id: 'wp2',
    billId: 'b1',
    episodeId: 'ep1',
    patientName: 'Jay Umar',
    hospitalName: 'Dovers Hospitals',
    ward: 'Medical Ward A, Bed 4',
    admissionDate: '19 Sep 2026',
    dischargeDate: 'Pending',
    doctorSignOff: { cleared:true, officerName:'Dr. Chidi Nwosu', timestamp:'Today, 8:30 am', notes:'Vital signs normal. Pathology results reviewed.' },
    pharmacyClearance: { cleared:true, officerName:'Pharm. Joy Ibrahim', timestamp:'Today, 9:00 am', returnsReconciled:true },
    hmoRemittance: { cleared:true, officerName:'Desk Lead M. Adeleke', timestamp:'Today, 9:30 am', approvedAmount:30000 },
    pspReconciled: { cleared:false, officerName:'Cashier Desk 2', timestamp:'Pending', pspPaid:12000, balanceDue:8000, notes:'Outstanding PSP ₦8,000 pending settlement.' },
    overallStatus: 'pending',
    gatePassCode: 'WP-PEND-LAG-2026-0881',
  },
];

/* ── Rx Pharmacy Formulary Seed ──────────────────────────── */
const RX_ORDERS_SEED = [
  {
    id: 'rx1',
    billId: 'b1',
    doctorName: 'Dr. O. Alabi',
    clinicName: 'Redeemer Specialist Clinic Outpatient',
    date: '24 Sep 2026',
    status: 'pending_dispense',
    totalBrandCost: 34000,
    totalGenericCost: 13000,
    savingsWithGeneric: 21000,
    items: [
      { id:'rx_it1', brandName:'Coartem 80/480mg (Novartis)', brandPrice:12500, genericName:'Artemether + Lumefantrine 80/480mg', genericPrice:4500, dosage:'1 tab b.i.d for 3 days', nafdacRegNo:'A4-4821', formularyTier:'Tier 1 (100% HMO)', hmoCoverBrand:4500, pspBrand:8000, hmoCoverGeneric:4500, pspGeneric:0, selectedOption:'generic' },
      { id:'rx_it2', brandName:'Augmentin 1g (GSK)', brandPrice:18000, genericName:'Amoxicillin + Clavulanic Acid 1g', genericPrice:7500, dosage:'1 tab b.i.d for 7 days', nafdacRegNo:'04-1189', formularyTier:'Tier 1 (100% HMO)', hmoCoverBrand:7500, pspBrand:10500, hmoCoverGeneric:7500, pspGeneric:0, selectedOption:'generic' },
      { id:'rx_it3', brandName:'Panadol Extra (GSK)', brandPrice:3500, genericName:'Paracetamol BP 500mg', genericPrice:1000, dosage:'2 tabs t.i.d p.r.n', nafdacRegNo:'04-0312', formularyTier:'Tier 1 (100% HMO)', hmoCoverBrand:1000, pspBrand:2500, hmoCoverGeneric:1000, pspGeneric:0, selectedOption:'generic' },
    ],
  },
];

/* ── Offline USSD Bank Seed ──────────────────────────────── */
const USSD_BANKS_SEED = [
  { bankCode:'gtb', bankName:'Guaranty Trust Bank (GTBank)', ussdPrefix:'*737*', sampleString:'*737*50*20000*108#' },
  { bankCode:'zenith', bankName:'Zenith Bank', ussdPrefix:'*966*', sampleString:'*966*6*20000*88213#' },
  { bankCode:'access', bankName:'Access Bank', ussdPrefix:'*901*', sampleString:'*901*3*20000*88213#' },
  { bankCode:'firstbank', bankName:'First Bank of Nigeria', ussdPrefix:'*894*', sampleString:'*894*894*20000*88213#' },
  { bankCode:'uba', bankName:'United Bank for Africa (UBA)', ussdPrefix:'*919*', sampleString:'*919*8*20000*88213#' },
  { bankCode:'wellipay', bankName:'WelliPay Direct Shortcode (Zero-Data)', ussdPrefix:'*347*88*', sampleString:'*347*88*88213#' },
];

const OFFLINE_VOUCHERS_SEED = [
  { id:'ov1', billId:'b1', billCode:'BL-4019', patientName:'Jay Umar', hospitalName:'Dovers Hospitals', amount:20000, issuedAt:'Today, 11:00 am', expiresAt:'Tomorrow, 11:00 am', voucherToken:'WP-VOUCH-78A2-E40B-991C', qrPayload:'WP://OFFLINE/VOUCHER/b1/20000/78A2E40B', verifiedOffline:true },
];

/* ── Provider Billing Desk Seed ──────────────────────────── */
const PROVIDER_DESK_SEED = {
  facilityId: 'fac2',
  facilityName: 'Redeemer Specialist Clinic',
  location: 'Ground Floor, Room 102 (Beside Outpatient Pharmacy)',
  counterNumber: 'Counter #04',
  deskPhone: '+234 1 271 5002',
  operatorName: 'Sister Chinyere Eze',
  role: 'Hospital Cashier & HMO Desk Lead',
  currentServingToken: '#A-12',
  shift: {
    shiftId: 'SFT-04',
    cashierName: 'Sister Chinyere Eze',
    startedAt: '08:00 am',
    cashInTill: 85000,
    posCollected: 265000,
    hmoClaimsBatched: 14,
    eodClosed: false,
  },
  todaysStats: { totalBilled:1240000, hmoClaims:890000, pspCollected:350000, patientsCount:18 },
  liveQueue: [
    {
      id:'q0',
      token:'#A-14',
      patientName:'Jay Umar',
      welliRecordId:'LAG-4401',
      service:'Laparoscopic Hernioplasty & Ward Care',
      ward:'Male Surgical 3B, Bed 12',
      totalAmount:75000,
      hmoName:'Hygeia HMO (Gold Plan)',
      hmoApproved:55000,
      pspAmount:20000,
      status:'awaiting_psp',
      doctorSignoff:'Dr. F. Adeleke (Signed ✓)',
      pharmacyClearance:'Pharm. K. Danladi (Returns Reconciled ✓)',
      phone:'+234 803 123 4567',
      nokName:'Fatima Umar (Wife)',
      nokPhone:'+234 802 345 6789',
      createdAt:'11:30 am',
      bedsideRequested: false,
    },
    {
      id:'q1',
      token:'#A-15',
      patientName:'Amina Bello',
      welliRecordId:'WR-8849-LAG',
      service:'Appendectomy Surgical Follow-up',
      ward:'Female Surgical 2A, Bed 04',
      totalAmount:40000,
      hmoName:'Hygeia HMO (Gold Plan)',
      hmoApproved:30000,
      pspAmount:10000,
      status:'awaiting_psp',
      doctorSignoff:'Dr. O. Alabi (Signed ✓)',
      pharmacyClearance:'Pharm. K. Danladi (Returns Reconciled ✓)',
      phone:'+234 803 999 9999',
      nokName:'Suleiman Bello (Brother)',
      nokPhone:'+234 802 111 2233',
      createdAt:'10:45 am',
      bedsideRequested: true,
    },
    {
      id:'q2',
      token:'#A-16',
      patientName:'Babajide Adeleke',
      welliRecordId:'WR-1209-LAG',
      service:'MRI Brain & Contrast Scan',
      ward:'Neurology Ward 1, Bed 09',
      totalAmount:120000,
      hmoName:'AXA Mansard (Platinum)',
      hmoApproved:95000,
      pspAmount:25000,
      status:'awaiting_adjudication',
      doctorSignoff:'Dr. C. Nwosu (Signed ✓)',
      pharmacyClearance:'Pending Return Review',
      phone:'+234 802 555 4433',
      nokName:'Folake Adeleke (Spouse)',
      nokPhone:'+234 803 444 8877',
      createdAt:'11:15 am',
      bedsideRequested: false,
    },
    {
      id:'q3',
      token:'#A-13',
      patientName:'Grace Okafor',
      welliRecordId:'WR-5512-LAG',
      service:'Antenatal Comprehensive Panel',
      ward:'Maternity Ward, Bed 03',
      totalAmount:35000,
      hmoName:'Reliance HMO',
      hmoApproved:35000,
      pspAmount:0,
      status:'cleared',
      doctorSignoff:'Dr. B. Adeyemi (Signed ✓)',
      pharmacyClearance:'Pharm. J. Ibrahim (Clear ✓)',
      phone:'+234 805 123 7890',
      nokName:'Emeka Okafor (Husband)',
      nokPhone:'+234 803 777 9900',
      createdAt:'09:20 am',
      bedsideRequested: false,
    },
  ],
  sampleInvoices: [
    { code:'BL-9482', patientName:'Amina Bello', amount:185000, hmoApproved:130000, pspDue:55000, pspPaid:55000, service:'Laparoscopic Appendectomy & Ward', createdAt:'Today, 8:00 am', status:'cleared' },
    { code:'BL-4019', patientName:'Babajide Adeleke', amount:42000, hmoApproved:30000, pspDue:12000, pspPaid:4000, service:'Laboratory Panel & Culture', createdAt:'Yesterday, 3:30 pm', status:'awaiting_psp' },
  ]
};

/* ── HealthSave Smart Ajo Pots Seed ──────────────────────── */
const HEALTHSAVE_POTS_SEED = [
  {
    id: 'pot1',
    title: 'Emergency Medical Reserve',
    category: 'Emergency',
    targetAmount: 50000,
    currentAmount: 7000,
    monthlyContribution: 5000,
    interestYieldAnnual: 11.5,
    roundUpEnabled: true,
    autoDeductDay: 28,
    history: [
      { id:'ptx1', date:'Today, 9:00 am', amount:250, type:'roundup', note:'Spare change roundup from hospital pharmacy payment' },
      { id:'ptx2', date:'20 Sep 2026', amount:5000, type:'deposit', note:'Monthly standing order contribution' },
      { id:'ptx3', date:'1 Sep 2026', amount:1750, type:'interest', note:'Monthly compound interest yield (11.5% APY)' },
    ],
  },
  {
    id: 'pot2',
    title: 'Maternity & Delivery Fund',
    category: 'Maternity',
    targetAmount: 150000,
    currentAmount: 45000,
    monthlyContribution: 15000,
    interestYieldAnnual: 12.0,
    roundUpEnabled: true,
    autoDeductDay: 25,
    history: [
      { id:'ptx4', date:'15 Sep 2026', amount:15000, type:'deposit', note:'Antenatal care target contribution' },
      { id:'ptx5', date:'15 Aug 2026', amount:15000, type:'deposit', note:'Antenatal care target contribution' },
    ],
  },
  {
    id: 'pot3',
    title: 'Elderly Parents Healthcare Pot',
    category: 'Elderly Care',
    targetAmount: 80000,
    currentAmount: 28000,
    monthlyContribution: 10000,
    interestYieldAnnual: 11.0,
    roundUpEnabled: false,
    autoDeductDay: 1,
    history: [
      { id:'ptx6', date:'1 Sep 2026', amount:10000, type:'deposit', note:'Parents monthly hypertensive meds reserve' },
    ],
  },
];

/* ── HMO Policies & PreAuth Seed ─────────────────────────── */
const HMO_SEED = [
  { id:'hmo1', provider:'Hygeia HMO', policyNo:'HYG-882910-A', enrolleeName:'Jay Umar', planTier:'Comprehensive Gold', coPayPercent:20, annualLimit:2500000, usedAmount:480000, status:'active', expiryDate:'31 Dec 2026', coveredPersons:['self','ade'] },
  { id:'hmo2', provider:'Reliance HMO', policyNo:'REL-440219-B', enrolleeName:'Jay Umar', planTier:'Executive Corporate Plan', coPayPercent:10, annualLimit:5000000, usedAmount:1120000, status:'active', expiryDate:'30 Jun 2027', coveredPersons:['self','faith','ade'] },
  { id:'hmo3', provider:'AXA Mansard', policyNo:'AXA-992104-C', enrolleeName:'Faith Oghene', planTier:'Platinum Family Cover', coPayPercent:15, annualLimit:3000000, usedAmount:250000, status:'active', expiryDate:'15 Nov 2026', coveredPersons:['faith','ade'] },
];

const PREAUTH_SEED = [
  { id:'pa1', hmoPolicyId:'hmo1', facility:'Dovers Hospitals', procedure:'Elective Herniorrhaphy Surgery', estimatedCost:350000, coveredAmount:280000, patientPortion:70000, status:'approved', requestDate:'20 Sep 2026', approvalCode:'AUTH-HYG-9021', notes:'Pre-auth approved for surgeon fee, anesthesia, and 2-night semi-private ward admission.' },
  { id:'pa2', hmoPolicyId:'hmo1', facility:'Lagoon Diagnostics Centre', procedure:'Lumbar Spine MRI with Contrast', estimatedCost:140000, coveredAmount:126000, patientPortion:14000, status:'approved', requestDate:'17 Sep 2026', approvalCode:'AUTH-HYG-6603', notes:'Prior approval valid for 14 days at accredited imaging centres.' },
];

/* ── Hospital Facilities Seed ────────────────────────────── */
const FACILITIES_SEED = [
  { id:'fac1', name:'Dovers Hospitals', category:'Hospital', state:'Lagos', address:'14 Admiralty Way, Lekki Phase 1', phone:'+234 1 270 4400', emergency:'112 / +234 803 000 1122', welliRecordIntegrated:true, acceptedHmos:['Hygeia HMO','Reliance HMO','AXA Mansard'] },
  { id:'fac2', name:'Redeemer Specialist Clinic', category:'Clinic', state:'Lagos', address:'28 Isaac John St, GRA Ikeja', phone:'+234 1 497 2200', emergency:'+234 802 333 4455', welliRecordIntegrated:true, acceptedHmos:['Reliance HMO','Leadway Health','Hygeia HMO'] },
  { id:'fac3', name:'Lagoon Diagnostics Centre', category:'Diagnostic Centre', state:'Lagos', address:'Burma Road, Victoria Island', phone:'+234 1 280 5500', emergency:'+234 809 111 8899', welliRecordIntegrated:true, acceptedHmos:['All Major HMOs'] },
  { id:'fac4', name:'St. Nicholas Hospital', category:'Hospital', state:'Lagos', address:'57 Campbell St, Lagos Island', phone:'+234 1 263 1234', emergency:'+234 800 642 4652', welliRecordIntegrated:false, acceptedHmos:['Hygeia HMO','AXA Mansard'] },
];

const PAYMENTS_SEED = [
  { id:'WP512340', billId:'b4', facility:"St. Augustine's Medical Centre", amount:45000, method:'card',     date:'02 Sep 2026', time:'11:20 am', status:'successful', personId:'self' },
  { id:'WP512298', billId:'b8', facility:'Grace Family Clinic',            amount:9000,  method:'transfer', date:'02 Sep 2026', time:'3:05 pm',  status:'successful', personId:'faith' },
  { id:'WP511870', billId:'b5', facility:'Grace Family Clinic',            amount:0,     method:'card',     date:'28 Aug 2026', time:'9:00 am',  status:'failed',     personId:'faith' },
  { id:'WP511500', billId:'b3', facility:'Lagoon Diagnostics Centre',      amount:9000,  method:'transfer', date:'18 Sep 2026', time:'1:15 pm',  status:'successful', personId:'ade' },
  { id:'WP508110', billId:'b1', facility:'Dovers Hospitals',               amount:12000, method:'card',     date:'10 Jun 2026', time:'10:00 am', status:'successful', personId:'self' },
  { id:'WP509220', billId:'b7', facility:'Dovers Hospitals',               amount:18000, method:'transfer', date:'22 Jul 2026', time:'2:30 pm',  status:'successful', personId:'ade' },
  { id:'WP510440', billId:'b2', facility:'Redeemer Specialist Clinic',     amount:6000,  method:'card',     date:'14 Aug 2026', time:'4:15 pm',  status:'successful', personId:'self' },
];

const NOTIFS_SEED = [
  { id:'n1', title:'New bill from Dovers Hospitals', body:'₦20,000 — Bill no. DH-88213', time:'2 hours ago', icon:'📄', bg:'var(--color-accent-100)', fg:'var(--color-accent-800)', billId:'b1', unread:true },
  { id:'n2', title:'Payment confirmed', body:'₦45,000 paid to St. Augustine\'s', time:'3 days ago', icon:'✓', bg:'var(--color-accent-100)', fg:'var(--color-accent-800)', unread:true },
  { id:'n3', title:'Bill overdue', body:'Redeemer Specialist Clinic — ₦8,500', time:'5 days ago', icon:'⚠', bg:'var(--color-process-yellow)', fg:'var(--color-neutral-900)', billId:'b2', unread:false },
  { id:'n4', title:'Auto-pay ran', body:'₦5,000 deducted from wallet', time:'1 week ago', icon:'₦', bg:'var(--color-accent-100)', fg:'var(--color-accent-800)', unread:false },
];

const WALLETS_SEED = { self: 15000, ade: 0, faith: 0 };

const SAVINGS_GOAL = { name: 'Surgery fund', target: 100000, saved: 32000 };

const FINANCING_PLANS = [
  { id:'fp1', facility:'Dovers Hospitals', totalInstallments:4, paidInstallments:1, perInstallment:10000, nextDue:'15 Oct 2026', billId:'b1' }
];

const SPEND_DATA = {
  self:   [{ month:'Jun', amount:12000 }, { month:'Jul', amount:0 }, { month:'Aug', amount:6000 }, { month:'Sep', amount:65000 }],
  ade:    [{ month:'Jun', amount:0 }, { month:'Jul', amount:18000 }, { month:'Aug', amount:0 }, { month:'Sep', amount:9000 }],
  faith:  [{ month:'Jun', amount:0 }, { month:'Jul', amount:0 }, { month:'Aug', amount:9000 }, { month:'Sep', amount:0 }],
};

const FAQS = [
  { q: 'How do I add a bill?', a: 'Tap "Add a bill" on the Home screen. You can scan the QR code on your bill or enter the bill code manually.' },
  { q: 'Which payment methods are supported?', a: 'You can pay using your WelliPay wallet, a debit/credit card (Visa, Mastercard, Verve), or bank transfer.' },
  { q: 'How does the wallet work?', a: 'Top up your wallet once, then use it to pay bills instantly without entering card details each time.' },
  { q: 'Can I pay for a family member?', a: 'Yes. Add dependants under People in your profile and switch to their view to see and pay their bills.' },
  { q: 'What is WelliRecord?', a: 'WelliRecord links your hospital record so bills appear automatically when facilities raise them.' },
];

/* ── Status meta ─────────────────────────────────────────── */
const statusMeta = status => ({
  unpaid:       { label:'Unpaid',        bg:'var(--color-neutral-200)',     fg:'var(--color-neutral-800)',     icon:'● ' },
  overdue:      { label:'Overdue',       bg:'var(--color-process-yellow)',  fg:'var(--color-neutral-900)',     icon:'⚠ ' },
  partly_paid:  { label:'Part paid',     bg:'var(--color-accent-100)',      fg:'var(--color-accent-800)',      icon:'◐ ' },
  paid:         { label:'Paid',          bg:'var(--color-accent-100)',      fg:'var(--color-accent-800)',      icon:'✓ ' },
  void:         { label:'Cancelled',     bg:'var(--color-neutral-200)',     fg:'var(--color-neutral-700)',     icon:'✕ ' },
  awaiting_hmo: { label:'Waiting HMO',   bg:'var(--color-accent-100)',      fg:'var(--color-accent-800)',      icon:'⏱ ' },
  pending:      { label:'Confirming',    bg:'var(--color-process-yellow)',  fg:'var(--color-neutral-900)',     icon:'⏱ ' },
  failed:       { label:'Not completed', bg:'var(--color-accent-2-100)',    fg:'var(--color-accent-2-800)',    icon:'✕ ' },
  expired:      { label:'Timed out',     bg:'var(--color-neutral-200)',     fg:'var(--color-neutral-700)',     icon:'⏱ ' },
  under_review: { label:'Being checked', bg:'var(--color-accent-100)',      fg:'var(--color-accent-800)',      icon:'⏱ ' },
  successful:   { label:'Successful',    bg:'var(--color-accent-100)',      fg:'var(--color-accent-800)',      icon:'✓ ' },
})[status] || { label:'Unknown', bg:'var(--color-neutral-200)', fg:'var(--color-neutral-800)', icon:'● ' };

const methodLabel = m => ({ card:'Card', transfer:'Bank transfer', wallet:'Wallet' })[m] || m;

/* ══════════════════════════════════════════════════════════
   WelliPayApp — central state manager + renderer
══════════════════════════════════════════════════════════ */
class WelliPayApp {
  constructor(rootEl) {
    this.root = rootEl;
    this.state = this._initState();
    this._transferTimer = null;
    this._cardTimer = null;
    this._otpResendTimer = null;
    this._toastTimer = null;
    this._render();
  }

  _initState() {
    return {
      screen: 'welcome',
      prevScreens: [],
      lang: 'en',
      phone: '',
      otp: '',
      otpTries: 5,
      otpLocked: false,
      otpResendCountdown: 0,
      profName: 'Jay Umar',
      pinStage: 'set',  // 'set' | 'confirm'
      pinEntry: '',
      pinFirst: '',
      pinMismatch: false,
      appPin: '1234',
      biometricEnabled: false,
      linkState: 'idle', // 'idle' | 'loading' | 'success' | 'notfound'
      activePerson: 'self',
      showPersonSheet: false,
      unreadCount: 2,
      billFilter: 'all',
      showAllLinesForBill: null,
      addBillMode: 'scan',
      addBillCode: '',
      addBillState: 'idle', // 'idle' | 'error' | 'success'
      addBillError: '',
      // payment session
      payBillId: null,
      payContext: 'bill', // 'bill' | 'topup' | 'savings' | 'installment'
      payAmountMode: 'full',
      payPartAmount: '',
      payPartError: '',
      payMethod: null,
      payMethodBanner: false,
      confirmSubStage: 'idle', // 'idle' | 'pinning' | 'failed'
      confirmPinEntry: '',
      cardStage: 'loading', // 'loading' | 'ready' | 'checking'
      payOutcome: null, // null | 'pending' | 'success' | 'failed' | 'expired' | 'review'
      payFailReason: 'default',
      transferState: 'active', // 'active' | 'expired'
      transferSecondsLeft: 3600,
      transferAccountNo: '9021445678',
      toastMsg: '',
      lastPayRef: '',
      lastPayAmount: 0,
      lastPayRemaining: 0,
      historyFilter: 'all',
      reportBillId: null,
      reportCategory: '',
      reportDesc: '',
      reportSubmitted: false,
      reportTicket: '',
      deleteStage: 'idle', // 'idle' | 'confirming' | 'done'
      // prefs
      bioEnabled: false,
      hmoShare: true,
      marketing: false,
      notifBills: true,
      notifReceipts: true,
      notifPromo: false,
      // dependant form
      depName: '',
      depRelation: 'child',
      depDob: '',
      depError: '',
      // wallet / savings topup
      topupPresetIdx: null,
      topupCustom: '',
      // insights scope
      insightScope: 'me',
      // data (mutable copies)
      bills: BILLS_SEED.map(b => ({ ...b, lines: [...b.lines] })),
      payments: [...PAYMENTS_SEED],
      wallets: { ...WALLETS_SEED },
      people: PEOPLE.map(p => ({ ...p })),
      walletAutoPay: { self: false, ade: false, faith: false },
      walletTxns: [
        { id:'wt1', personId:'self', label:'Top up', amount:15000, date:'15 Sep 2026', sign:1 },
      ],
      savingsGoal: { ...SAVINGS_GOAL },
      financingPlans: FINANCING_PLANS.map(p => ({ ...p })),
      // New modules state
      familyPayList: FAMILY_PAY_SEED.map(f => ({ ...f, contributors: [...f.contributors] })),
      activeFamilyPayId: 'fp1',
      familyFxCurrency: 'GBP',
      welliPassList: WELLIPASS_SEED.map(w => ({ ...w, doctorSignOff: {...w.doctorSignOff}, pharmacyClearance: {...w.pharmacyClearance}, hmoRemittance: {...w.hmoRemittance}, pspReconciled: {...w.pspReconciled} })),
      activeWelliPassId: 'wp1',
      welliPassView: 'pass', // 'pass' | 'security'
      rxOrders: RX_ORDERS_SEED.map(r => ({ ...r, items: r.items.map(it => ({ ...it })) })),
      activeRxOrderId: 'rx1',
      ussdBanks: [...USSD_BANKS_SEED],
      ussdSelectedBank: 'gtb',
      ussdActiveSim: null, // null | { title, prompt }
      providerDesk: { ...PROVIDER_DESK_SEED, liveQueue: [...PROVIDER_DESK_SEED.liveQueue] },
      providerInvoiceModal: null, // null | invoice
      healthSavePots: HEALTHSAVE_POTS_SEED.map(p => ({ ...p, history: [...p.history] })),
      activePotId: 'pot1',
      episodes: EPISODES_SEED.map(e => ({ ...e, items: e.items.map(it => ({ ...it })) })),
      activeEpisodeId: 'ep1',
      hmoPolicies: [...HMO_SEED],
      preAuthRequests: [...PREAUTH_SEED],
      facilities: [...FACILITIES_SEED],
      facilitiesSearch: '',
      thermalSlipModal: null,
      welliPassFallbackOpen: false,
      gateSearchQuery: 'LAG-4401',
      gateActiveResult: 'LAG-4401',
      gateBarrierOpened: false,
      deskMode: 'cashier', // 'cashier' | 'patient'
      deskFilterTab: 'all', // 'all' | 'awaiting_psp' | 'waiting_hmo' | 'cleared'
      deskSearchQuery: '',
      deskPatientActionModal: null,
      deskBedsideRequested: false,
      deskEodReportModal: false,
      showSafeArea: false,
      deviceView: 'iphone11',
    };
  }

  /* ── Getters ───────────────────────────────────────────── */
  get t() { return COPY[this.state.lang]; }
  get activePerson() { return this.state.people.find(p => p.id === this.state.activePerson); }
  get activePersonName() { return this.activePerson ? this.activePerson.name : 'Jay Umar'; }
  get activeBills() { return this.state.bills.filter(b => b.personId === this.state.activePerson); }
  get activeWallet() { return this.state.wallets[this.state.activePerson] || 0; }
  get selectedBill() { return this.state.bills.find(b => b.id === this.state.payBillId); }

  /* ── Navigation ────────────────────────────────────────── */
  go(screen) {
    const prev = this.state.screen;
    this.state.prevScreens.push(prev);
    if (this.state.prevScreens.length > 20) this.state.prevScreens.shift();
    this.state.screen = screen;
    this._clearTimers();
    this._render();
    const body = document.querySelector('.scr-body');
    if (body) body.scrollTop = 0;
    this._onEnterScreen(screen);
  }

  goBack() {
    const prev = this.state.prevScreens.pop();
    if (prev) {
      this.state.screen = prev;
      this._clearTimers();
      this._render();
      const body = document.querySelector('.scr-body');
      if (body) body.scrollTop = 0;
      this._onEnterScreen(prev);
    }
  }

  _onEnterScreen(screen) {
    if (screen === 'cardpay') {
      this.state.cardStage = 'loading';
      this._render();
      this._cardTimer = setTimeout(() => {
        this.state.cardStage = 'ready';
        this._render();
      }, 900);
    }
    if (screen === 'transfer') {
      this.state.transferState = 'active';
      this.state.transferSecondsLeft = 3600;
      this._startTransferCountdown();
    }
    if (screen === 'otp') {
      this.state.otpResendCountdown = 30;
      this._startOtpResend();
    }
  }

  _clearTimers() {
    clearTimeout(this._cardTimer);
    clearInterval(this._transferTimer);
    clearInterval(this._otpResendTimer);
  }

  _startTransferCountdown() {
    this._transferTimer = setInterval(() => {
      this.state.transferSecondsLeft--;
      if (this.state.transferSecondsLeft <= 0) {
        this.state.transferState = 'expired';
        clearInterval(this._transferTimer);
      }
      this._render();
    }, 1000);
  }

  _startOtpResend() {
    this._otpResendTimer = setInterval(() => {
      if (this.state.otpResendCountdown > 0) {
        this.state.otpResendCountdown--;
        this._render();
      } else {
        clearInterval(this._otpResendTimer);
      }
    }, 1000);
  }

  showToast(msg) {
    this.state.toastMsg = msg;
    this._render();
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.state.toastMsg = '';
      this._render();
    }, 2200);
  }

  /* ── Payment helpers ───────────────────────────────────── */
  get payChosenAmount() {
    const bill = this.selectedBill;
    if (!bill) return this.state.payPartAmount ? parseInt(this.state.topupCustom || this.state.payPartAmount) : 0;
    if (this.state.payAmountMode === 'full') return bill.amountDue;
    const v = parseInt(this.state.payPartAmount.replace(/[^0-9]/g,'')) || 0;
    return v;
  }

  get payTopupAmount() {
    if (this.state.topupPresetIdx !== null) {
      const presets = [5000,10000,20000,50000];
      return presets[this.state.topupPresetIdx] || 0;
    }
    return parseInt(this.state.topupCustom.replace(/[^0-9]/g,'')) || 0;
  }

  get payContextAmount() {
    if (this.state.payContext === 'bill') return this.payChosenAmount;
    if (this.state.payContext === 'topup' || this.state.payContext === 'savings') return this.payTopupAmount;
    if (this.state.payContext === 'installment') {
      const plan = this.state.financingPlans.find(p => p.id === this.state.payBillId);
      return plan ? plan.perInstallment : 0;
    }
    return 0;
  }

  _finalisePayment() {
    const amt = this.payContextAmount;
    const method = this.state.payMethod;
    const ref = 'WP' + Date.now().toString().slice(-6);
    this.state.lastPayRef = ref;
    this.state.lastPayAmount = amt;

    if (this.state.payContext === 'bill') {
      const bill = this.selectedBill;
      if (bill) {
        bill.amountDue = Math.max(0, bill.amountDue - amt);
        bill.status = bill.amountDue === 0 ? 'paid' : 'partly_paid';
      }
      this.state.lastPayRemaining = bill ? bill.amountDue : 0;
    }
    if (this.state.payContext === 'topup') {
      this.state.wallets[this.state.activePerson] = (this.state.wallets[this.state.activePerson] || 0) + amt;
      this.state.walletTxns.unshift({ id: 'wt' + Date.now(), personId: this.state.activePerson, label: 'Top up', amount: amt, date: fmtDate(new Date()), sign: 1 });
    }
    if (this.state.payContext === 'savings') {
      this.state.savingsGoal.saved = Math.min(this.state.savingsGoal.target, this.state.savingsGoal.saved + amt);
    }
    if (this.state.payContext === 'installment') {
      const plan = this.state.financingPlans.find(p => p.id === this.state.payBillId);
      if (plan) plan.paidInstallments++;
    }
    if (method === 'wallet') {
      this.state.wallets[this.state.activePerson] = Math.max(0, (this.state.wallets[this.state.activePerson] || 0) - amt);
      this.state.walletTxns.unshift({ id: 'wt' + Date.now(), personId: this.state.activePerson, label: 'Bill payment', amount: amt, date: fmtDate(new Date()), sign: -1 });
    }

    const now = new Date();
    this.state.payments.unshift({
      id: ref,
      billId: this.state.payBillId,
      facility: this.selectedBill ? this.selectedBill.facility : 'WelliPay',
      amount: amt,
      method: method || 'card',
      date: fmtDate(now),
      time: timeNow(),
      status: 'successful',
      personId: this.state.activePerson,
    });

    this.state.payOutcome = 'success';
    this.go('status');
  }

  /* ── Rail screen list ──────────────────────────────────── */
  static SCREENS = [
    { group:'Sign in & onboarding', items:[
      { id:'S01', key:'welcome',    name:'Welcome' },
      { id:'S02', key:'phone',      name:'Phone entry' },
      { id:'S03', key:'otp',        name:'OTP' },
      { id:'S04', key:'profilesetup', name:'Profile setup' },
      { id:'S05', key:'applock',    name:'App lock (PIN)' },
      { id:'S06', key:'linkwr',     name:'Link WelliRecord' },
      { id:'S06b',key:'walletintro',name:'Create wallet' },
    ]},
    { group:'Home & bills', items:[
      { id:'S07', key:'home',       name:'Home' },
      { id:'S08', key:'notifs',     name:'Notifications' },
      { id:'S09', key:'bills',      name:'Bill list' },
      { id:'S10', key:'billdetail', name:'Bill detail' },
      { id:'S12', key:'addbill',    name:'Add bill' },
      { id:'S57', key:'episodetimeline', name:'Episode timeline' },
    ]},
    { group:'Payment', items:[
      { id:'S13', key:'amount',     name:'Choose amount' },
      { id:'S14', key:'method',     name:'Choose method' },
      { id:'S15', key:'confirm',    name:'Confirm + PIN' },
      { id:'S16', key:'cardpay',    name:'Card payment' },
      { id:'S17', key:'transfer',   name:'Bank transfer' },
      { id:'S18', key:'status',     name:'Payment status' },
      { id:'S19', key:'receipt',    name:'Receipt' },
      { id:'S20', key:'history',    name:'Payment history' },
      { id:'S21', key:'report',     name:'Report a problem' },
      { id:'S22', key:'reportdetail',name:'Report status' },
    ]},
    { group:'Wallet & HealthSave', items:[
      { id:'S23', key:'wallet',     name:'Wallet' },
      { id:'S24', key:'topup',      name:'Top up' },
      { id:'S56', key:'healthsave', name:'HealthSave Smart Ajo' },
    ]},
    { group:'Clinical & Discharge', items:[
      { id:'S52', key:'wellipass',  name:'WelliPass Clearance' },
      { id:'S61', key:'patientdesk',name:'Hospital Desk Ticket' },
      { id:'S53', key:'rxpharmacy', name:'Rx Pharmacy Formulary' },
      { id:'S51', key:'familypay',  name:'FamilyPay Diaspora Hub' },
      { id:'S54', key:'offlineussd',name:'Offline USSD Pay' },
    ]},
    { group:'Provider & Staff (Internal)', items:[
      { id:'S55', key:'providerdesk',name:'Cashier Workstation' },
      { id:'S59', key:'gatesecurity',name:'Gate Security Terminal' },
      { id:'S58', key:'hmomanager', name:'HMO & Reconcile' },
      { id:'S60', key:'facilities', name:'Hospital Directory' },
    ]},
    { group:'Insights', items:[
      { id:'S25', key:'insights',   name:'Insights' },
    ]},
    { group:'People & profile', items:[
      { id:'S36', key:'people',     name:'People' },
      { id:'S37', key:'adddep',     name:'Add dependant' },
      { id:'S42', key:'profile2',   name:'Profile hub' },
      { id:'S43', key:'security',   name:'Security' },
      { id:'S44', key:'privacy',    name:'Privacy' },
      { id:'S45', key:'notifprefs', name:'Notifications prefs' },
      { id:'S46', key:'language',   name:'Language' },
      { id:'S47', key:'help',       name:'Help' },
      { id:'S48', key:'contact',    name:'Contact' },
      { id:'S49', key:'legal',      name:'Legal' },
      { id:'S50', key:'deleteaccount', name:'Delete account' },
    ]},
  ];

  /* ─────────────────────────────────────────────────────────
     RENDER ENGINE
  ───────────────────────────────────────────────────────── */
  _render() {
    this.root.innerHTML = this._html();
    this._bind();
  }

  _html() {
    const s = this.state;
    const isIphone = s.deviceView !== 'android';
    return `
<div class="wp-shell">
  ${this._htmlRail()}
  <div class="wp-stage">
    <div class="wp-toolbar">
      <div class="device-switch-group">
        <button class="device-switch-btn ${isIphone ? 'active' : ''}" id="btn-device-iphone11">
          🍎 iPhone 11 (iOS)
        </button>
        <button class="device-switch-btn ${!isIphone ? 'active' : ''}" id="btn-device-android">
          🤖 Android
        </button>
      </div>
      <span class="wp-toolbar-chip">${isIphone ? '📱 414 × 896 · iOS 18.3' : '📱 412 × 892 · Android 14'}</span>
      <span class="wp-toolbar-chip" style="opacity:.7">${isIphone ? 'Safe Content: 382 × 814 px' : 'Safe Content: 380 × 810 px'}</span>
      <button class="toolbar-safe-toggle ${s.showSafeArea ? 'active' : ''}" id="btn-toggle-safe-area" title="Toggle Visual Safe Area Inset Guides">
        📐 Safe Area Guides: <strong>${s.showSafeArea ? 'ON' : 'OFF'}</strong>
      </button>
    </div>

    ${isIphone ? `
      <!-- iPhone 11 Native Simulator Frame -->
      <div class="phone-frame iphone11-frame">
        <div class="iphone-mute-switch" title="Silent Mode Switch"></div>
        <div class="iphone-vol-up" title="Volume Up"></div>
        <div class="iphone-vol-down" title="Volume Down"></div>
        <div class="iphone-power-btn" title="Side Power / Siri Button"></div>

        <div class="phone-screen iphone-screen">
          <!-- iPhone 11 Notch & Status Bar -->
          <div class="iphone-notch-bar">
            <div class="iphone-notch-left">
              <span class="iphone-time">9:41</span>
            </div>
            <div class="iphone-notch-cutout" title="iPhone 11 Sensor Notch (TrueDepth + Speaker)">
              <div class="iphone-speaker-slit"></div>
              <div class="iphone-camera-lens"></div>
            </div>
            <div class="iphone-notch-right">
              <div class="iphone-cell-bars">
                <span></span><span></span><span></span><span></span>
              </div>
              <span class="iphone-net-type">5G</span>
              <div class="iphone-battery-icon">
                <div class="iphone-battery-fill" style="width:${Math.round(this.activeWallet > 0 ? 88 : 55)}%"></div>
              </div>
            </div>
          </div>

          ${s.showSafeArea ? `
            <!-- Visual Safe Area & Side Inset Overlay -->
            <div class="safe-area-overlay safe-area-ios">
              <div class="safe-area-zone-top">
                <span>Top Inset · 48px</span>
                <span>iPhone 11 Notch & Status Bar</span>
              </div>
              <div class="safe-area-zone-sides">
                <div class="safe-area-side-gutter safe-area-gutter-left">
                  <span class="safe-area-gutter-label">16px Left Side Margin</span>
                </div>
                <div class="safe-area-center-box">
                  <div class="safe-area-center-badge">iPhone 11 Safe Content Box · 382 × 814 px</div>
                </div>
                <div class="safe-area-side-gutter safe-area-gutter-right">
                  <span class="safe-area-gutter-label">16px Right Side Margin</span>
                </div>
              </div>
              <div class="safe-area-zone-bottom">
                <span>iOS Home Indicator Gesture Zone</span>
                <span>Bottom Inset · 34px</span>
              </div>
            </div>
          ` : ''}

          <div class="scr" id="screen-root">
            ${this._htmlScreen(s.screen)}
          </div>
          <div class="iphone-home-bar"><div class="iphone-home-indicator"></div></div>
        </div>
      </div>
    ` : `
      <!-- Android Frame -->
      <div class="android-frame">
        <div class="android-speaker-slit" title="Earpiece Speaker Slit"></div>
        <div class="android-screen">
          <div class="android-status-bar">
            <span style="font-size:12px;font-weight:700">9:41</span>
            <div class="android-camera-punch" title="Front Camera Cutout (Safe Inset: 40px)"></div>
            <div class="android-status-icons">
              <span class="android-net-type">5G</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>
              <svg width="18" height="12" viewBox="0 0 24 16" fill="none"><rect x="0.5" y="0.5" width="20" height="15" rx="3.5" stroke="currentColor" stroke-opacity=".35"/><rect x="2" y="2" width="${Math.round(this.activeWallet > 0 ? 16 : 9)}" height="12" rx="2" fill="currentColor"/><path d="M22 5.5h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1" stroke="currentColor" stroke-opacity=".35"/></svg>
            </div>
          </div>
          ${s.showSafeArea ? `
            <div class="safe-area-overlay safe-area-android">
              <div class="safe-area-zone-top">
                <span>Top Inset · 40px</span>
                <span>Status Bar & Cutout Zone</span>
              </div>
              <div class="safe-area-zone-sides">
                <div class="safe-area-side-gutter safe-area-gutter-left">
                  <span class="safe-area-gutter-label">16px Left Side Margin</span>
                </div>
                <div class="safe-area-center-box">
                  <div class="safe-area-center-badge">Android Safe Content Box · 380 × 810 px</div>
                </div>
                <div class="safe-area-side-gutter safe-area-gutter-right">
                  <span class="safe-area-gutter-label">16px Right Side Margin</span>
                </div>
              </div>
              <div class="safe-area-zone-bottom">
                <span>Gesture Bar Safe Zone</span>
                <span>Bottom Inset · 28px</span>
              </div>
            </div>
          ` : ''}
          <div class="scr" id="screen-root">
            ${this._htmlScreen(s.screen)}
          </div>
          <div class="android-home-bar"><div class="android-home-pill"></div></div>
        </div>
      </div>
    `}
  </div>
</div>`;
  }

  _htmlRail() {
    const s = this.state;
    const groups = WelliPayApp.SCREENS.map(g => `
      <div class="wp-rail-group">${g.group}</div>
      ${g.items.map(it => `
        <button class="wp-rail-link ${s.screen === it.key ? 'active' : ''}" data-goto="${it.key}">
          <span class="wp-rail-id">${it.id}</span>${it.name}
        </button>`).join('')}
    `).join('');
    return `
<div class="wp-rail">
  <div class="wp-rail-brand">WelliPay</div>
  <div class="wp-rail-subtitle">Design Handoff · Interactive</div>
  <div class="wp-rail-simulator-card">
    <div class="rail-sim-title">Simulator & Side Area View</div>
    <div class="rail-sim-switch">
      <button class="rail-sim-btn ${s.deviceView !== 'android' ? 'active' : ''}" id="rail-btn-iphone11">🍎 iPhone 11</button>
      <button class="rail-sim-btn ${s.deviceView === 'android' ? 'active' : ''}" id="rail-btn-android">🤖 Android</button>
    </div>
    <button class="rail-safe-toggle ${s.showSafeArea ? 'active' : ''}" id="rail-btn-safe-area">
      📐 Side & Safe Area Guides: <strong>${s.showSafeArea ? 'ON' : 'OFF'}</strong>
    </button>
  </div>
  <div class="wp-rail-divider"></div>
  <div class="wp-rail-list">${groups}</div>
  <div class="wp-rail-restart">
    <button class="btn btn-ghost" id="btn-restart" style="font-size:12px">↺ Restart</button>
    <button class="btn btn-ghost" id="btn-lang" style="font-size:12px">${s.lang === 'en' ? '🇳🇬 Pidgin' : '🇬🇧 English'}</button>
  </div>
</div>`;
  }

  _htmlScreen(screen) {
    const map = {
      welcome:       () => this._scrWelcome(),
      phone:         () => this._scrPhone(),
      otp:           () => this._scrOtp(),
      profilesetup:  () => this._scrProfileSetup(),
      applock:       () => this._scrAppLock(),
      linkwr:        () => this._scrLinkWR(),
      walletintro:   () => this._scrWalletIntro(),
      home:          () => this._scrHome(),
      notifs:        () => this._scrNotifs(),
      bills:         () => this._scrBills(),
      billdetail:    () => this._scrBillDetail(),
      addbill:       () => this._scrAddBill(),
      amount:        () => this._scrAmount(),
      method:        () => this._scrMethod(),
      confirm:       () => this._scrConfirm(),
      cardpay:       () => this._scrCardPay(),
      transfer:      () => this._scrTransfer(),
      status:        () => this._scrStatus(),
      receipt:       () => this._scrReceipt(),
      history:       () => this._scrHistory(),
      report:        () => this._scrReport(),
      reportdetail:  () => this._scrReportDetail(),
      wallet:        () => this._scrWallet(),
      topup:         () => this._scrTopup(),
      insights:      () => this._scrInsights(),
      people:        () => this._scrPeople(),
      adddep:        () => this._scrAddDep(),
      profile2:      () => this._scrProfile2(),
      security:      () => this._scrSecurity(),
      privacy:       () => this._scrPrivacy(),
      notifprefs:    () => this._scrNotifPrefs(),
      language:      () => this._scrLanguage(),
      help:          () => this._scrHelp(),
      contact:       () => this._scrContact(),
      legal:         () => this._scrLegal(),
      deleteaccount: () => this._scrDeleteAccount(),
      // New modules
      episodetimeline: () => this._scrEpisodeTimeline(),
      familypay:       () => this._scrFamilyPay(),
      wellipass:       () => this._scrWelliPass(),
      patientdesk:     () => this._scrPatientDeskTicket(),
      rxpharmacy:      () => this._scrRxPharmacy(),
      offlineussd:     () => this._scrOfflineUssd(),
      providerdesk:    () => this._scrProviderDesk(),
      gatesecurity:    () => this._scrGateSecurity(),
      healthsave:      () => this._scrHealthSave(),
      hmomanager:      () => this._scrHmoManager(),
      facilities:      () => this._scrFacilities(),
    };
    return (map[screen] || map.welcome)();
  }

  /* ── Status bar time ───────────────────────────────────── */

  /* ──────────────────────────────────────────────────────────
     SCREENS
  ──────────────────────────────────────────────────────────*/

  _scrWelcome() {
    const t = this.t;
    return `
<div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:20px;padding:24px">
  <div class="welcome-logo">WelliPay</div>
  <div style="font-style:italic;opacity:.7;font-size:15px">${t.tagline}</div>
  <p style="max-width:280px;font-size:14px;line-height:1.6;opacity:.8">${t.welcomeBody}</p>
  <div style="display:flex;gap:12px;margin-top:8px">
    <button class="btn ${this.state.lang==='en'?'btn-primary':'btn-secondary'}" id="btn-lang-en" style="min-width:110px">English</button>
    <button class="btn ${this.state.lang==='pcm'?'btn-primary':'btn-secondary'}" id="btn-lang-pcm" style="min-width:110px">Pidgin</button>
  </div>
  <button class="btn btn-primary btn-block" id="btn-welcome-start" style="margin-top:12px;max-width:280px">${t.getStarted}</button>
  <a href="#" id="link-terms" style="font-size:11px;opacity:.55;text-decoration:none;max-width:260px;line-height:1.4">${t.terms}</a>
</div>`;
  }

  _scrPhone() {
    const t = this.t; const s = this.state;
    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button></div>
<div class="scr-body">
  <h1 class="scr-title">${t.phoneTitle}</h1>
  <p style="font-size:13px;opacity:.65;margin-top:4px">${t.phoneHelper}</p>
  <div class="field" style="margin-top:20px">
    <label>${t.phoneLabel}</label>
    <div style="display:flex;gap:8px;align-items:center">
      <span style="font-size:16px;font-weight:600;padding:0 4px;flex:none">+234</span>
      <input class="input" id="inp-phone" value="${s.phone}" placeholder="803 000 0000" type="tel" maxlength="10">
    </div>
  </div>
  ${s.phoneErr ? `<p class="text-danger" style="font-size:13px;margin-top:-8px">${s.phoneErr}</p>` : ''}
</div>
<div class="sticky-cta"><button class="btn btn-primary btn-block" id="btn-sendcode">${t.sendCode}</button></div>`;
  }

  _scrOtp() {
    const t = this.t; const s = this.state;
    const digits = (s.otp || '').split('').concat(Array(6).fill('')).slice(0,6);
    const boxCls = i => digits[i] !== '' ? (s.otpError ? 'error' : 'filled') : '';
    const boxes = Array.from({length:6},(_,i)=>`<div class="otp-box ${boxCls(i)}">${digits[i]}</div>`).join('');
    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button></div>
<div class="scr-body">
  <h1 class="scr-title">${t.otpTitle}</h1>
  <p style="font-size:13px;opacity:.65;margin-top:4px">${t.otpHelper}${s.phone || '080 300 0000'}</p>
  <div class="otp-row">${boxes}</div>
  <input id="otp-hidden-input" type="tel" maxlength="6" value="${s.otp}" style="position:absolute;opacity:0;pointer-events:none">
  ${s.otpError ? `<p class="text-danger" style="font-size:13px;margin-top:12px">${t.otpWrongMsg}</p>` : ''}
  ${s.otpLocked ? `<div class="banner warn mt-3">${t.otpLockedMsg}</div>` : ''}
  <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
    <button class="btn btn-ghost" id="btn-otp-good" style="font-size:12px">${t.demoCorrect}</button>
    <button class="btn btn-ghost" id="btn-otp-bad"  style="font-size:12px">${t.demoWrong}</button>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px">
    <a href="#" id="btn-otp-resend" style="font-size:13px;${s.otpResendCountdown>0?'pointer-events:none;opacity:.5':''}">
      ${typeof t.resendLabel === 'function' ? t.resendLabel(s.otpResendCountdown) : 'Resend code'}
    </a>
    <a href="#" id="btn-change-number" style="font-size:13px">${t.changeNumber}</a>
  </div>
</div>`;
  }

  _scrProfileSetup() {
    const t = this.t; const s = this.state;
    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button></div>
<div class="scr-body">
  <h1 class="scr-title">${t.profileTitle}</h1>
  <div style="margin-top:20px">
    <div class="field"><label>${t.fullName}</label><input class="input" id="inp-profname" value="${s.profName}"></div>
    <div class="field"><label>${t.dob}</label>
      <div style="display:flex;gap:8px">
        <input class="input" placeholder="DD" style="width:68px">
        <input class="input" placeholder="MM" style="width:68px">
        <input class="input" placeholder="YYYY" style="width:86px">
      </div>
      <p style="font-size:12px;opacity:.6;margin-top:4px">${t.dobHelper}</p>
    </div>
    <div class="field"><label>${t.emailOpt}</label><input class="input" placeholder="you@example.com" type="email"></div>
  </div>
</div>
<div class="sticky-cta"><button class="btn btn-primary btn-block" id="btn-profile-continue">${t.continue}</button></div>`;
  }

  _scrAppLock() {
    const t = this.t; const s = this.state;
    const stageLabel = s.pinStage === 'set' ? t.setPinLabel : t.confirmPinLabel;
    const filled = (s.pinEntry || '').length;
    const dots = Array.from({length:4},(_,i)=>`<div class="pin-dot ${i<filled?(s.pinMismatch?'error':'filled'):''}"></div>`).join('');
    return `
<div class="scr-top"></div>
<div class="scr-body" style="text-align:center;padding-top:24px">
  <h1 class="scr-title">${t.lockTitle}</h1>
  <p style="font-size:13px;opacity:.65;margin:4px 0 20px">${t.lockHelper}</p>
  ${s.pinMismatch ? `<div class="banner err mb-3" style="text-align:left">${t.pinMismatchMsg}</div>` : ''}
  <div class="pin-row">${dots}</div>
  <p style="font-size:13px;opacity:.7;margin-bottom:16px">${stageLabel}</p>
  ${this._htmlKeypad('pin')}
  <button class="btn btn-secondary" id="btn-biometric" style="margin-top:20px">${t.useBiometric}</button>
</div>`;
  }

  _scrLinkWR() {
    const t = this.t; const s = this.state;
    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button></div>
<div class="scr-body">
  <h1 class="scr-title">${t.linkTitle}</h1>
  <p style="font-size:14px;line-height:1.6;margin-top:16px"><strong>${t.linkDoesLabel}</strong> ${t.linkDoes}</p>
  <p style="font-size:14px;line-height:1.6;margin-top:12px"><strong>${t.linkNotLabel}</strong> ${t.linkNot}</p>
  ${s.linkState === 'loading' ? `<div style="text-align:center;margin-top:24px"><div class="spinner" style="margin:0 auto"></div><p style="font-size:13px;opacity:.65;margin-top:12px">Searching for your record…</p></div>` : ''}
  ${s.linkState === 'success' ? `<div class="banner info mt-4">${t.linkedSuccessMsg}</div>` : ''}
  ${s.linkState === 'notfound' ? `<div class="banner err mt-4">No WelliRecord found. You can add bills manually.</div>` : ''}
</div>
<div class="sticky-cta" style="display:flex;flex-direction:column;gap:8px">
  ${s.linkState !== 'success' && s.linkState !== 'loading'
    ? `<button class="btn btn-primary btn-block" id="btn-link-now">${t.linkNow}</button>` : ''}
  ${s.linkState === 'success'
    ? `<button class="btn btn-primary btn-block" id="btn-link-continue">${t.continue}</button>` : ''}
  <button class="btn btn-ghost btn-block" id="btn-link-skip">${t.skipForNow}</button>
</div>`;
  }

  _scrWalletIntro() {
    const t = this.t;
    return `
<div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:20px;padding:24px">
  <div class="icon-circle" style="background:var(--color-accent-100);color:var(--color-accent-800);font-size:30px">₦</div>
  <h1 class="scr-title">${t.walletIntroTitle}</h1>
  <p style="max-width:280px;font-size:14px;line-height:1.6;opacity:.75">${t.walletIntroBody}</p>
  <button class="btn btn-primary btn-block" id="btn-create-wallet" style="max-width:280px">${t.createWallet}</button>
  <button class="btn btn-ghost btn-block" id="btn-wallet-skip" style="max-width:280px">${t.skipForNow}</button>
</div>`;
  }

  /* ── Home ─────────────────────────────────────────────── */
  _scrHome() {
    const t = this.t; const s = this.state;
    const bills = this.activeBills.filter(b => ['unpaid','overdue','partly_paid','awaiting_hmo'].includes(b.status));
    const totalDue = bills.reduce((sum,b) => sum + b.amountDue, 0);
    const nextDue = bills.sort((a,b) => (a.overdue ? -1 : 1))[0];
    const recent = this.activeBills.slice(0,4);
    const ac = getAvatarColor(s.activePerson);

    return `
<div class="header-row">
  <button class="person-chip" id="btn-person-chip">
    <div class="avatar avatar-sm" style="background:${ac.bg};color:${ac.fg}">${initials(this.activePersonName)}</div>
    <span class="person-name">${this.activePersonName}</span>
    <span class="person-caret">▾</span>
  </button>
  <button class="bell-btn" id="btn-notifs">
    <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M221.8,175.94C214.11,162.16,208,139.55,208,112a80,80,0,1,0-160,0c0,27.55-6.11,50.16-13.8,63.94A16,16,0,0,0,48,224H96a32,32,0,0,0,64,0h48a16,16,0,0,0,13.8-24.06Z"/></svg>
    ${s.unreadCount > 0 ? '<div class="bell-dot"></div>' : ''}
  </button>
</div>
<div class="scr-body">
  <!-- WelliPass Ready Card -->
  <div class="card row-tap mb-3" id="btn-home-wellipass" style="background:#f0fbf4;border:1px solid #b7eed0">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1e7e48">🏥 WelliPass Ready</div>
        <div style="font-size:14px;font-weight:600;margin-top:2px">Discharge Gate Pass · Amina Bello</div>
        <div style="font-size:11px;opacity:.7">Surgical Ward 3 · Tap for Gate QR Code</div>
      </div>
      <span style="color:#1e7e48;font-size:20px">›</span>
    </div>
  </div>

  <!-- Suite Feature Navigation Chips -->
  <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px">
    <button class="chip" data-goto="wellipass" style="font-size:11px;padding:4px 10px;white-space:nowrap">🏥 WelliPass</button>
    <button class="chip" data-goto="episodetimeline" style="font-size:11px;padding:4px 10px;white-space:nowrap">📊 Episode Split</button>
    <button class="chip" data-goto="familypay" style="font-size:11px;padding:4px 10px;white-space:nowrap">🌍 FamilyPay</button>
    <button class="chip" data-goto="rxpharmacy" style="font-size:11px;padding:4px 10px;white-space:nowrap">💊 Rx Generics</button>
    <button class="chip" data-goto="healthsave" style="font-size:11px;padding:4px 10px;white-space:nowrap">💰 Smart Ajo</button>
    <button class="chip" data-goto="offlineussd" style="font-size:11px;padding:4px 10px;white-space:nowrap">📶 USSD Pay</button>
    <button class="chip" data-goto="patientdesk" style="font-size:11px;padding:4px 10px;white-space:nowrap">🎫 Desk Ticket</button>
    <button class="chip" data-goto="providerdesk" style="font-size:11px;padding:4px 10px;white-space:nowrap">🏢 Cashier (Staff)</button>
  </div>

  <div class="card mb-3">
    <div class="card-kicker">${t.summaryKicker}</div>
    <div class="amount-lg mt-1">${NAIRA(totalDue)}</div>
  </div>
  ${nextDue ? `
  <div class="card mb-3">
    <div class="card-kicker">${t.nextDueKicker}</div>
    <div class="card-title" style="font-size:15px;margin-top:2px">${nextDue.facility}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
      <div class="amount-md">${NAIRA(nextDue.amountDue)}</div>
      <div style="font-size:12px;opacity:.65">${t.due} ${nextDue.date}</div>
    </div>
    <button class="btn btn-primary btn-block mt-2" data-bill-pay="${nextDue.id}">${t.payNow}</button>
  </div>` : ''}
  <div class="card row-tap mb-3" id="btn-go-wallet">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div><div class="card-kicker">${t.walletKicker}</div><div class="amount-md mt-1">${NAIRA(this.activeWallet)}</div></div>
      <span style="opacity:.4;font-size:20px">›</span>
    </div>
  </div>
  <div style="margin-top:4px">
    <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin-bottom:8px">${t.recentBills}</div>
    ${recent.length ? recent.map(b => {
      const sm = statusMeta(b.status);
      return `<div class="card row-tap mb-2" data-bill-open="${b.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div style="min-width:0"><div class="card-title" style="font-size:14px">${b.facility}</div><div style="font-size:11px;opacity:.6;margin-top:2px">${b.date}</div></div>
          <div style="text-align:right;flex:none">
            <div style="font-weight:600;font-size:14px">${NAIRA(b.amountDue || b.amountTotal)}</div>
            <span class="status-pill mt-1" style="background:${sm.bg};color:${sm.fg}">${sm.icon}${sm.label}</span>
          </div>
        </div>
      </div>`;
    }).join('') : `<p style="font-size:13px;opacity:.6">${t.noBillsYet}</p>`}
    <button class="btn btn-secondary btn-block mt-2" id="btn-addbill">${t.addBill}</button>
  </div>
</div>
${this._htmlTabbar('home')}
${s.showPersonSheet ? this._htmlPersonSheet() : ''}`;
  }

  _htmlPersonSheet() {
    const t = this.t;
    return `
<div class="sheet-backdrop" id="sheet-backdrop">
  <div class="sheet-card" id="sheet-content" onclick="event.stopPropagation()">
    <div class="card-kicker mb-3">${t.people}</div>
    ${this.state.people.map(p => {
      const ac = getAvatarColor(p.id);
      return `<button class="row-tap" style="display:flex;align-items:center;gap:10px;padding:10px 4px;width:100%;border:none;background:transparent;text-align:left;font-family:inherit;cursor:pointer" data-person-select="${p.id}">
        <div class="avatar avatar-md" style="background:${ac.bg};color:${ac.fg}">${initials(p.name)}</div>
        <div style="flex:1"><div style="font-weight:600;font-size:14px">${p.name}</div><div style="font-size:12px;opacity:.6">${p.relation}</div></div>
        ${p.id === this.state.activePerson ? '<span style="color:var(--color-accent-700);font-size:16px">✓</span>' : ''}
      </button>`;
    }).join('')}
    <button class="btn btn-ghost btn-block mt-2" id="btn-sheet-adddep">${t.addPerson}</button>
  </div>
</div>`;
  }

  /* ── Notifications ─────────────────────────────────────── */
  _scrNotifs() {
    const t = this.t;
    const today = NOTIFS_SEED.filter(n => n.unread);
    const older  = NOTIFS_SEED.filter(n => !n.unread);
    const mkGroup = (label, items) => items.length === 0 ? '' : `
      <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin:12px 0 6px">${label}</div>
      ${items.map(n => `
        <div class="row-tap" style="display:flex;gap:10px;padding:10px 4px;align-items:flex-start">
          <div style="width:32px;height:32px;border-radius:50%;background:${n.bg};color:${n.fg};display:flex;align-items:center;justify-content:center;flex:none;font-size:14px">${n.icon}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:${n.unread?'600':'400'}">${n.title}</div>
            <div style="font-size:12px;opacity:.65;margin-top:1px">${n.body}</div>
            <div style="font-size:11px;opacity:.5;margin-top:2px">${n.time}</div>
          </div>
          ${n.unread ? '<div class="bell-dot" style="position:static;margin-top:6px;flex:none"></div>' : ''}
        </div>`).join('')}`;
    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button><h1 class="scr-title">${t.notifsTitle}</h1></div>
<div class="scr-body">
  ${today.length || older.length
    ? mkGroup('Today', today) + mkGroup('Earlier', older)
    : `<p style="font-size:13px;opacity:.6;text-align:center;margin-top:40px">${t.noNotifs}</p>`}
</div>`;
  }

  /* ── Bills ─────────────────────────────────────────────── */
  _scrBills() {
    const t = this.t; const s = this.state;
    const all = this.activeBills;
    const filtered = s.billFilter === 'all' ? all
      : s.billFilter === 'unpaid' ? all.filter(b => ['unpaid','overdue','partly_paid','awaiting_hmo'].includes(b.status))
      : all.filter(b => b.status === 'paid');

    return `
<div class="scr-top"><h1 class="scr-title">${t.billsTitle}</h1></div>
<div class="scr-body">
  <div style="display:flex;gap:8px;margin-bottom:16px">
    <button class="chip ${s.billFilter==='all'?'active':''}" data-filter="all">${t.filterAll}</button>
    <button class="chip ${s.billFilter==='unpaid'?'active':''}" data-filter="unpaid">${t.filterUnpaid}</button>
    <button class="chip ${s.billFilter==='paid'?'active':''}" data-filter="paid">${t.filterPaid}</button>
  </div>
  ${filtered.length ? filtered.map(b => {
    const sm = statusMeta(b.status);
    return `<div class="card row-tap mb-2" data-bill-open="${b.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="min-width:0"><div class="card-title" style="font-size:14px">${b.facility}</div><div style="font-size:11px;opacity:.6;margin-top:2px">${b.date}</div></div>
        <div style="text-align:right;flex:none">
          <div style="font-weight:600;font-size:14px">${NAIRA(b.amountDue || b.amountTotal)}</div>
          <span class="status-pill mt-1" style="background:${sm.bg};color:${sm.fg}">${sm.icon}${sm.label}</span>
        </div>
      </div>
    </div>`;
  }).join('') : `<p style="font-size:13px;opacity:.6;text-align:center;margin-top:40px">${t.noBillsFilter}</p>`}
</div>
${this._htmlTabbar('bills')}`;
  }

  /* ── Bill detail ───────────────────────────────────────── */
  _scrBillDetail() {
    const t = this.t; const s = this.state;
    const bill = s.bills.find(b => b.id === s.payBillId);
    if (!bill) return `<div class="scr-body"><p>Bill not found.</p></div>`;
    const sm = statusMeta(bill.status);
    const canPay = ['unpaid','overdue','partly_paid','awaiting_hmo'].includes(bill.status);
    const isPaid = bill.status === 'paid';
    const showAllLines = s.showAllLinesForBill === bill.id;
    const visibleLines = showAllLines ? bill.lines : bill.lines.slice(0,3);
    const hasMore = !showAllLines && bill.lines.length > 3;

    return `
<div class="scr-top">
  <button class="scr-back" id="btn-back">←</button>
  <div class="scr-spacer"></div>
  <button class="scr-back" style="font-size:18px">⋯</button>
</div>
<div class="scr-body">
  <div style="font-size:11px;opacity:.6">${bill.date} · ${bill.billNo}</div>
  <div style="font-size:17px;font-weight:600;margin-top:2px;line-height:1.3">${bill.facility}</div>
  <span class="status-pill mt-2" style="background:${sm.bg};color:${sm.fg}">${sm.icon}${sm.label}</span>
  ${bill.status === 'void' ? `<div class="banner err mt-3">${t.voidBanner}</div>` : ''}
  ${bill.changed ? `<div class="banner warn mt-3">${t.billChangedMsg}</div>` : ''}
  ${canPay || isPaid ? `
  <div style="margin-top:16px">
    <div class="amount-lg">${NAIRA(canPay ? bill.amountDue : bill.amountTotal)}</div>
    <div style="font-size:12px;opacity:.6;margin-top:2px">${canPay ? 'Amount due' : 'Total paid'}</div>
  </div>` : ''}
  <!-- Dual-Payer Responsibility Card -->
  <div class="card mt-3">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="card-kicker">${t.dualPayerTitle}</div>
      <span class="badge-hmo">Primary: HMO</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px">
      <span>${t.hmoCover}</span>
      <span style="font-weight:600;color:var(--color-accent-700)">${NAIRA(bill.hmoAmount || 0)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px">
      <span>${t.patientSelfPay}</span>
      <span style="font-weight:700;color:#a00052">${NAIRA(bill.patientSelfPay || bill.amountDue)}</span>
    </div>
    ${bill.reconciliation ? `
      <div class="divider-line"></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;opacity:.8">
        <span>WelliPay Reconcile™:</span>
        <span style="color:${bill.reconciliation.variance>0?'#a00052':'#1e7e48'};font-weight:600">
          ${bill.reconciliation.variance > 0 ? `⚠️ ${NAIRA(bill.reconciliation.variance)} HMO variance` : '✓ Reconciled'}
        </span>
      </div>
    ` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px">
      <button class="btn btn-secondary" id="btn-bill-goto-episode" style="font-size:11px;padding:6px 4px">📊 Episode Split</button>
      <button class="btn btn-secondary" id="btn-bill-goto-familypay" style="font-size:11px;padding:6px 4px">🌍 FamilyPay</button>
      <button class="btn btn-secondary" id="btn-bill-goto-rx" style="font-size:11px;padding:6px 4px">💊 Rx Generics</button>
      <button class="btn btn-secondary" id="btn-bill-goto-wellipass" style="font-size:11px;padding:6px 4px">🏥 WelliPass</button>
    </div>
  </div>

  <div style="margin-top:16px">
    ${visibleLines.map(ln => `
    <div style="display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--color-divider)">
      <div style="font-size:13px;min-width:0">${ln.name} <span style="opacity:.5">× ${ln.qty}</span></div>
      <div style="font-size:13px;font-weight:600;flex:none;color:${ln.discount?'var(--color-accent-2-700)':''}">${NAIRA(ln.total)}</div>
    </div>`).join('')}
    ${hasMore ? `<div class="row-tap" style="text-align:center;padding:10px;font-size:13px;color:var(--color-accent-700)" id="btn-show-all-lines">${typeof t.showAllLines==='function'?t.showAllLines(bill.lines.length):t.showAllLines}</div>` : ''}
    ${showAllLines && bill.lines.length > 3 ? `<div class="row-tap" style="text-align:center;padding:10px;font-size:13px;color:var(--color-accent-700)" id="btn-collapse-lines">${t.collapseLines}</div>` : ''}
    <div style="display:flex;justify-content:space-between;padding-top:10px;font-weight:600;font-size:14px">
      <span>${t.total}</span><span>${NAIRA(bill.amountTotal)}</span>
    </div>
  </div>
  <div style="margin-top:16px;display:flex;gap:16px">
    <a href="#" style="font-size:13px">${t.shareStatement}</a>
    <a href="#" id="btn-report" style="font-size:13px">${t.reportProblem}</a>
  </div>
</div>
${canPay ? `<div class="sticky-cta"><button class="btn btn-primary btn-block" id="btn-pay-this-bill">${t.payCtaPartial} — ${NAIRA(bill.amountDue)}</button></div>` : ''}
${isPaid ? `<div class="sticky-cta"><button class="btn btn-primary btn-block" id="btn-view-receipt">${t.viewReceipt}</button></div>` : ''}`;
  }

  /* ── Add bill ──────────────────────────────────────────── */
  _scrAddBill() {
    const t = this.t; const s = this.state;
    const showScan = s.addBillMode === 'scan' && s.addBillState !== 'success';
    const showManual = s.addBillMode === 'manual' && s.addBillState !== 'success';
    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button><h1 class="scr-title">${t.addBillTitle}</h1></div>
<div class="scr-body">
  ${showScan ? `
    <div class="scan-frame">${t.scanFrameHelp}</div>
    <a href="#" id="btn-enter-code" style="display:block;text-align:center;margin-top:12px;font-size:14px">${t.enterCodeInstead}</a>
  ` : ''}
  ${showManual ? `
    <div class="field"><label>${t.billCode}</label><input class="input" id="inp-bill-code" value="${s.addBillCode}" placeholder="ABCD-1234" style="text-transform:uppercase;letter-spacing:2px;font-family:ui-monospace,monospace"></div>
    ${s.addBillError ? `<div class="banner err mb-3">${s.addBillError}</div>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-ghost" id="btn-demo-valid" style="font-size:12px">${t.demoValid}</button>
      <button class="btn btn-ghost" id="btn-demo-expired" style="font-size:12px">${t.demoExpired}</button>
      <button class="btn btn-ghost" id="btn-demo-already" style="font-size:12px">${t.demoAlready}</button>
    </div>
  ` : ''}
  ${s.addBillState === 'success' ? `
    <div style="text-align:center;padding-top:40px">
      <div style="font-size:48px">✓</div>
      <div style="font-size:16px;font-weight:600;margin-top:16px">${t.billAdded}</div>
    </div>
  ` : ''}
</div>
${showManual ? `<div class="sticky-cta"><button class="btn btn-primary btn-block" id="btn-submit-code">${t.continue}</button></div>` : ''}`;
  }

  /* ── Choose amount ─────────────────────────────────────── */
  _scrAmount() {
    const t = this.t; const s = this.state;
    const bill = this.selectedBill;
    if (!bill) return `<div class="scr-body"><p>No bill selected.</p></div>`;
    const partAmt = parseInt(s.payPartAmount.replace(/[^0-9]/g,'')) || 0;
    const remaining = bill.amountDue - partAmt;
    const isFull = s.payAmountMode === 'full';
    const selStyle = 'border:1.5px solid var(--color-accent);';

    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button><h1 class="scr-title">${t.amountTitle}</h1></div>
<div class="scr-body">
  <div style="font-size:13px;opacity:.65">${bill.facility}</div>
  <div class="amount-md mt-1">${NAIRA(bill.amountDue)} ${t.dueLabel}</div>
  <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
    <div class="card row-tap" style="${isFull?selStyle:''}" id="btn-pay-full">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600">${t.payFull} — ${NAIRA(bill.amountDue)}</span>
        <span style="width:14px;height:14px;border-radius:50%;border:1.5px solid;border-color:${isFull?'var(--color-accent)':'var(--color-divider)'};background:${isFull?'var(--color-accent)':'transparent'};display:inline-block"></span>
      </div>
    </div>
    <div class="card row-tap" style="${!isFull?selStyle:''}" id="btn-pay-part">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600">${t.payPart}</span>
        <span style="width:14px;height:14px;border-radius:50%;border:1.5px solid;border-color:${!isFull?'var(--color-accent)':'var(--color-divider)'};background:${!isFull?'var(--color-accent)':'transparent'};display:inline-block"></span>
      </div>
      ${!isFull ? `
        <input class="input mt-2" id="inp-part-amount" value="${s.payPartAmount}" placeholder="₦0" type="tel">
        <p style="font-size:12px;opacity:.6;margin-top:4px">${typeof t.minPartHelper==='function'?t.minPartHelper(NAIRA(bill.minPart||0)):t.minPartHelper}</p>
        ${partAmt > 0 && partAmt < bill.amountDue ? `<p style="font-size:12px;margin-top:2px">${typeof t.balanceAfterLabel==='function'?t.balanceAfterLabel(NAIRA(remaining)):''}</p>` : ''}
        ${s.payPartError ? `<p class="text-danger" style="font-size:12px;margin-top:2px">${s.payPartError}</p>` : ''}
      ` : ''}
    </div>
  </div>
</div>
<div class="sticky-cta"><button class="btn btn-primary btn-block" id="btn-continue-amount">${t.continue}</button></div>`;
  }

  /* ── Choose method ─────────────────────────────────────── */
  _scrMethod() {
    const t = this.t; const s = this.state;
    const amt = this.payContextAmount;
    const walletBal = this.activeWallet;
    const walletOk = walletBal >= amt;

    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button><h1 class="scr-title">${t.methodTitle}</h1></div>
<div class="scr-body">
  <div class="amount-md">${NAIRA(amt)}</div>
  ${s.payMethodBanner ? `<div class="banner info mt-3">${t.paymentCancelledMsg}</div>` : ''}
  <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
    <div class="card row-tap" id="btn-method-wallet" style="${!walletOk?'opacity:.5;pointer-events:none':''}">
      <div class="card-title" style="font-size:14px">${t.payWithWallet}</div>
      <div style="font-size:12px;opacity:.7">${walletOk ? (typeof t.payWithWalletSub==='function'?t.payWithWalletSub(NAIRA(walletBal)):'') : t.insufficientWallet} — ${NAIRA(walletBal)}</div>
    </div>
    <div class="card row-tap" id="btn-method-card">
      <div class="card-title" style="font-size:14px">${t.payWithCard}</div>
      <div style="font-size:12px;opacity:.7">${t.payWithCardSub}</div>
    </div>
    <div class="card row-tap" id="btn-method-transfer">
      <div class="card-title" style="font-size:14px">${t.payWithTransfer}</div>
      <div style="font-size:12px;opacity:.7">${t.payWithTransferSub}</div>
    </div>
  </div>
</div>`;
  }

  /* ── Confirm + PIN ─────────────────────────────────────── */
  _scrConfirm() {
    const t = this.t; const s = this.state;
    const amt = this.payContextAmount;
    const bill = this.selectedBill;
    const mLabel = methodLabel(s.payMethod);
    const filled = (s.confirmPinEntry||'').length;
    const dots = Array.from({length:4},(_,i)=>`<div class="pin-dot ${i<filled?(s.confirmPinError?'error':'filled'):''}"></div>`).join('');

    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button><h1 class="scr-title">${t.confirmTitle}</h1></div>
<div class="scr-body">
  ${s.confirmSubStage === 'idle' || !s.confirmSubStage ? `
    <div style="font-size:13px;opacity:.7">${t.youArePaying}</div>
    <div class="amount-lg mt-1">${NAIRA(amt)}</div>
    <div style="font-size:13px;margin-top:4px;opacity:.75">${bill ? bill.facility : ''}</div>
    <div class="divider-line"></div>
    <div style="display:flex;justify-content:space-between;font-size:13px"><span>${t.method}</span><span>${mLabel}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px"><span>${t.totalCharge}</span><span style="font-weight:600">${NAIRA(amt)}</span></div>
    <button class="btn btn-primary btn-block mt-4" id="btn-confirm-start">${t.confirmBtn}</button>
    <button class="btn btn-ghost btn-block mt-2" id="btn-confirm-cancel">${t.cancel}</button>
  ` : s.confirmSubStage === 'pinning' ? `
    <div style="text-align:center;margin-top:16px">
      <p style="font-size:13px;opacity:.75">${t.confirmPinPrompt}</p>
      <div class="pin-row">${dots}</div>
      ${this._htmlKeypad('confirm-pin')}
    </div>
  ` : s.confirmSubStage === 'failed' ? `
    <div class="banner err mb-3">${t.confirmFailedMsg}</div>
    <button class="btn btn-primary btn-block" id="btn-confirm-retry">${t.tryAgain}</button>
  ` : ''}
</div>`;
  }

  /* ── Card payment ──────────────────────────────────────── */
  _scrCardPay() {
    const t = this.t; const s = this.state;
    const amt = this.payContextAmount;
    const bill = this.selectedBill;

    if (s.cardStage === 'loading' || s.cardStage === 'checking') {
      const msg = s.cardStage === 'loading' ? t.openingSecure : t.checkingPayment;
      return `
<div class="scr-top"><button class="scr-back" id="btn-card-cancel">←</button></div>
<div class="scr-body" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;gap:16px">
  <div class="spinner"></div>
  <p style="font-size:14px;opacity:.75">${msg}</p>
</div>`;
    }

    return `
<div class="scr-top"><button class="scr-back" id="btn-card-cancel">←</button></div>
<div class="scr-body">
  <div style="text-align:center;padding:8px 0 20px">
    <div class="card-kicker">${t.securePaymentKicker}</div>
    <div class="amount-lg mt-1">${NAIRA(amt)}</div>
    <div style="font-size:12px;opacity:.6;margin-top:2px">${bill?bill.facility:''}</div>
  </div>
  <div class="card-mock">
    <div class="field"><label>${t.cardNumberLabel}</label><input class="input" value="•••• •••• •••• 4242" disabled></div>
    <div style="display:flex;gap:8px">
      <div class="field" style="flex:1"><label>${t.expiryLabel}</label><input class="input" value="09/29" disabled></div>
      <div class="field" style="flex:1"><label>${t.cvvLabel}</label><input class="input" value="•••" disabled></div>
    </div>
    <button class="btn btn-primary btn-block mt-2" id="btn-card-succeed">Pay ${NAIRA(amt)}</button>
  </div>
  <div style="margin-top:24px">
    <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.45;margin-bottom:6px">Prototype controls</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-ghost" id="btn-card-3ds" style="font-size:12px">${t.demoThreeDS}</button>
      <button class="btn btn-ghost" id="btn-card-decline" style="font-size:12px">${t.demoDecline}</button>
    </div>
  </div>
</div>`;
  }

  /* ── Bank transfer ─────────────────────────────────────── */
  _scrTransfer() {
    const t = this.t; const s = this.state;
    const amt = this.payContextAmount;
    const sec = s.transferSecondsLeft;
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    const timeStr = `${pad2(mins)}:${pad2(secs)}`;
    const isWarn = sec < 300;

    if (s.transferState === 'expired') {
      return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button><h1 class="scr-title">${t.transferTitle}</h1></div>
<div class="scr-body">
  <div class="banner warn mb-4">${t.transferExpiredMsg}</div>
  <button class="btn btn-primary btn-block" id="btn-new-account">${t.getNewAccount}</button>
</div>`;
    }

    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button><h1 class="scr-title">${t.transferTitle}</h1></div>
<div class="scr-body">
  <p style="font-size:13px;line-height:1.6">${t.transferInstruction}</p>
  <div class="card mt-3">
    <div style="display:flex;justify-content:space-between;padding:4px 0"><span style="font-size:12px;opacity:.6">${t.bankName}</span><span style="font-size:13px;font-weight:600">Any Bank</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;align-items:center">
      <span style="font-size:12px;opacity:.6">${t.accountNumber}</span>
      <span style="display:flex;gap:8px;align-items:center">
        <span style="font-size:17px;font-weight:600;font-family:ui-monospace,monospace">${s.transferAccountNo}</span>
        <button class="btn btn-ghost" id="btn-copy-acct" style="font-size:12px;padding:2px 6px">${t.copy}</button>
      </span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:4px 0"><span style="font-size:12px;opacity:.6">${t.accountName}</span><span style="font-size:13px;font-weight:600">WELLIPAY-${this.activePersonName.toUpperCase()}</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;align-items:center">
      <span style="font-size:12px;opacity:.6">${t.amount}</span>
      <span style="display:flex;gap:8px;align-items:center">
        <span style="font-size:13px;font-weight:600">${NAIRA(amt)}</span>
        <button class="btn btn-ghost" id="btn-copy-amt" style="font-size:12px;padding:2px 6px">${t.copy}</button>
      </span>
    </div>
  </div>
  <div style="text-align:center;margin-top:12px;font-size:13px;font-weight:600;color:${isWarn?'var(--color-accent-2-700)':'var(--color-accent-700)'}">${t.expiresIn} ${timeStr}</div>
  <p style="font-size:12px;opacity:.6;margin-top:12px">${t.transferNote}</p>
</div>
<div class="sticky-cta" style="display:flex;flex-direction:column;gap:8px">
  <button class="btn btn-primary btn-block" id="btn-i-paid">${t.iHavePaid}</button>
  <a href="#" id="btn-other-method" style="text-align:center;font-size:13px">${t.chooseAnotherMethod}</a>
</div>
${s.toastMsg ? `<div class="toast">${s.toastMsg}</div>` : ''}`;
  }

  /* ── Payment status ────────────────────────────────────── */
  _scrStatus() {
    const t = this.t; const s = this.state;
    const amt = s.lastPayAmount;
    const rem = s.lastPayRemaining;
    const bill = s.bills.find(b => b.id === s.payBillId);
    const isTopup = s.payContext === 'topup' || s.payContext === 'savings';
    const now = new Date();
    const ref = s.lastPayRef;
    const dateStr = `${fmtDate(now)} at ${timeNow()}`;

    let content = '';
    if (s.payOutcome === 'pending') {
      content = `
        <div class="icon-circle" style="background:var(--color-process-yellow);color:var(--color-neutral-900)">⏱</div>
        <p style="font-size:14px;line-height:1.6;max-width:260px;margin:0 auto">${t.pendingMsg}</p>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap">
          <button class="btn btn-ghost" id="btn-demo-success" style="font-size:12px">${t.demoResolveSuccess}</button>
          <button class="btn btn-ghost" id="btn-demo-review" style="font-size:12px">${t.demoResolveReview}</button>
        </div>`;
    } else if (s.payOutcome === 'success') {
      content = `
        <div class="icon-circle" style="background:var(--color-accent-100);color:var(--color-accent-800)">✓</div>
        <div style="font-size:17px;font-weight:600">${t.successHeading}</div>
        <div style="font-size:13px;opacity:.7">${NAIRA(amt)} · ${bill?bill.facility:''}</div>
        <div style="font-size:11px;opacity:.5">${dateStr} · ${ref}</div>
        ${rem > 0 ? `<div class="banner warn" style="margin-top:8px">${typeof t.stillToPay==='function'?t.stillToPay(NAIRA(rem)):''}</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:20px">
          ${!isTopup ? `<button class="btn btn-primary btn-block" id="btn-view-receipt">${t.viewReceipt}</button>` : ''}
          ${isTopup ? `<button class="btn btn-primary btn-block" id="btn-go-wallet">${t.walletTitle}</button>` : ''}
          ${rem > 0 ? `<button class="btn btn-secondary btn-block" id="btn-pay-balance">${t.payBalanceBtn}</button>` : ''}
          ${!isTopup ? `<button class="btn btn-ghost btn-block" id="btn-back-bills">${t.backToBills}</button>` : ''}
        </div>`;
    } else if (s.payOutcome === 'failed') {
      content = `
        <div class="icon-circle" style="background:var(--color-accent-2-100);color:var(--color-accent-2-800)">✕</div>
        <div style="font-size:17px;font-weight:600">${t.failedHeading}</div>
        <div style="font-size:13px;opacity:.7">${t.failReason[s.payFailReason]||t.failReason.default}</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:20px">
          <button class="btn btn-primary btn-block" id="btn-retry-pay">${t.tryAgain}</button>
          <button class="btn btn-secondary btn-block" id="btn-other-method-status">${t.useAnotherMethod}</button>
        </div>`;
    } else if (s.payOutcome === 'expired') {
      content = `
        <div class="icon-circle" style="background:var(--color-neutral-200);color:var(--color-neutral-700)">⏱</div>
        <p style="font-size:14px">${t.expiredMsg}</p>
        <button class="btn btn-primary btn-block mt-4" id="btn-other-method-status">${t.tryAgain}</button>`;
    } else if (s.payOutcome === 'review') {
      content = `
        <div class="icon-circle" style="background:var(--color-accent-100);color:var(--color-accent-800)">⏱</div>
        <p style="font-size:14px">${t.underReviewMsg}</p>
        <div style="font-size:11px;opacity:.5">${dateStr}</div>
        <button class="btn btn-secondary btn-block mt-4" id="btn-contact-support">${t.contactSupport}</button>`;
    }

    return `
<div class="scr-body" style="display:flex;flex-direction:column;justify-content:center;height:100%;text-align:center;gap:12px;padding:24px">
  ${content}
</div>`;
  }

  /* ── Receipt ───────────────────────────────────────────── */
  _scrReceipt() {
    const t = this.t; const s = this.state;
    const now = new Date();
    const bill = s.bills.find(b => b.id === s.payBillId);
    const mLabel = methodLabel(s.payMethod);

    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button><h1 class="scr-title">${t.receiptTitle}</h1></div>
<div class="scr-body">
  <div class="card">
    <div style="font-size:11px;opacity:.6">${s.lastPayRef}</div>
    <div style="font-size:11px;opacity:.6;margin-top:2px">${fmtDate(now)} at ${timeNow()}</div>
    <div class="divider-line"></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px"><span>${t.facilityLabel}</span><span style="font-weight:600;text-align:right;max-width:60%">${bill?bill.facility:'WelliPay'}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px"><span>${t.personLabel}</span><span>${this.activePersonName}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px"><span>${t.methodLabel2}</span><span>${mLabel}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:15px;margin-top:10px;font-weight:600"><span>${t.amountPaid}</span><span>${NAIRA(s.lastPayAmount)}</span></div>
    ${s.lastPayRemaining > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px;opacity:.7"><span>${t.balanceLabel}</span><span>${NAIRA(s.lastPayRemaining)}</span></div>` : ''}
  </div>
  <div style="display:flex;flex-direction:column;align-items:center;margin-top:20px;gap:6px">
    <div class="qr-placeholder"></div>
    <div style="font-size:11px;opacity:.55;font-family:ui-monospace,monospace">${s.lastPayRef}-VERIFY</div>
  </div>
  <div style="display:flex;gap:8px;margin-top:20px">
    <button class="btn btn-secondary btn-block">${t.share}</button>
    <button class="btn btn-secondary btn-block">${t.download}</button>
  </div>
</div>`;
  }

  /* ── Payment history ───────────────────────────────────── */
  _scrHistory() {
    const t = this.t; const s = this.state;
    const allPay = s.payments;
    const filtered = s.historyFilter === 'month'
      ? allPay.filter(p => p.date.includes('Sep 2026'))
      : allPay;

    const byMonth = {};
    filtered.forEach(p => {
      const mo = p.date.split(' ').slice(1).join(' ');
      if (!byMonth[mo]) byMonth[mo] = [];
      byMonth[mo].push(p);
    });

    return `
<div class="scr-top"><h1 class="scr-title">${t.historyTitle}</h1></div>
<div class="scr-body">
  <div style="display:flex;gap:8px;margin-bottom:16px">
    <button class="chip ${s.historyFilter==='all'?'active':''}" data-hist-filter="all">${t.filterAll}</button>
    <button class="chip ${s.historyFilter==='month'?'active':''}" data-hist-filter="month">${t.thisMonth}</button>
  </div>
  ${Object.keys(byMonth).length ? Object.entries(byMonth).map(([mo,items])=>`
    <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin:12px 0 6px">${mo}</div>
    ${items.map(p => {
      const sm = statusMeta(p.status);
      return `<div class="card row-tap mb-2">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div style="min-width:0"><div class="card-title" style="font-size:14px">${p.facility}</div><div style="font-size:11px;opacity:.6;margin-top:2px">${p.date} · ${methodLabel(p.method)}</div></div>
          <div style="text-align:right;flex:none"><div style="font-weight:600;font-size:14px">${NAIRA(p.amount)}</div><span class="status-pill mt-1" style="background:${sm.bg};color:${sm.fg}">${sm.icon}${sm.label}</span></div>
        </div>
      </div>`;
    }).join('')}`).join('')
    : `<p style="font-size:13px;opacity:.6;text-align:center;margin-top:40px">${t.noPaymentsYet}</p>`}
</div>
${this._htmlTabbar('history')}`;
  }

  /* ── Report ────────────────────────────────────────────── */
  _scrReport() {
    const t = this.t; const s = this.state;
    const bill = s.bills.find(b => b.id === s.reportBillId) || s.bills[0];
    const cats = [
      { key:'wrongAmt', label: t.cat_wrongAmt },
      { key:'alreadyPaid', label: t.cat_alreadyPaid },
      { key:'duplicate', label: t.cat_duplicate },
      { key:'other', label: t.cat_other },
    ];

    if (s.reportSubmitted) {
      return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button><h1 class="scr-title">${t.reportTitle}</h1></div>
<div class="scr-body" style="text-align:center;padding-top:40px">
  <div style="font-size:48px">✓</div>
  <div style="font-size:16px;font-weight:600;margin-top:16px">${t.reportSubmittedMsg}</div>
  <button class="btn btn-primary mt-4" id="btn-view-report-detail">${t.reportdetailTitle}</button>
</div>`;
    }

    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button><h1 class="scr-title">${t.reportTitle}</h1></div>
<div class="scr-body">
  <div style="font-size:12px;opacity:.6">${bill?bill.facility:''} · ${bill?bill.billNo:''}</div>
  <div class="field mt-4">
    <label>${t.reportCategoryLabel}</label>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
      ${cats.map(c=>`<div class="card row-tap" style="${s.reportCategory===c.key?'border:1.5px solid var(--color-accent);':''}" data-report-cat="${c.key}">${c.label}</div>`).join('')}
    </div>
  </div>
  <div class="field">
    <label>${t.reportDescLabel}</label>
    <textarea class="input" id="inp-report-desc" placeholder="${t.reportDescPlaceholder}" rows="4">${s.reportDesc}</textarea>
  </div>
</div>
<div class="sticky-cta"><button class="btn btn-primary btn-block" id="btn-submit-report">${t.reportSubmit}</button></div>`;
  }

  /* ── Report detail ─────────────────────────────────────── */
  _scrReportDetail() {
    const t = this.t; const s = this.state;
    const bill = s.bills.find(b => b.id === s.reportBillId) || s.bills[0];
    const sm = statusMeta('under_review');
    return `
<div class="scr-top"><button class="scr-back" id="btn-bills-tab">←</button><h1 class="scr-title">${t.reportdetailTitle}</h1></div>
<div class="scr-body">
  <div class="card">
    <div class="card-kicker">${t.ticketLabel}</div>
    <div style="font-size:16px;font-weight:600;margin-top:2px">${s.reportTicket || 'RPT-' + uid()}</div>
    <div class="divider-line"></div>
    <div style="display:flex;justify-content:space-between;font-size:13px"><span>${t.statusLabel}</span><span class="status-pill" style="background:${sm.bg};color:${sm.fg}">⏱ ${t.underReviewStatus}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:8px"><span>${t.facilityLabel}</span><span>${bill?bill.facility:''}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:8px"><span>${t.reportCategoryLabel}</span><span>${t['cat_' + (s.reportCategory||'other')]}</span></div>
  </div>
  <p style="font-size:12px;opacity:.65;margin-top:16px">${t.reportFollowupNote}</p>
</div>`;
  }

  /* ── Wallet ────────────────────────────────────────────── */
  _scrWallet() {
    const t = this.t; const s = this.state;
    const bal = this.activeWallet;
    const autoPay = s.walletAutoPay[s.activePerson];
    const eligibleBill = this.activeBills.find(b => ['unpaid','overdue'].includes(b.status) && b.amountDue <= bal);
    const myTxns = s.walletTxns.filter(x => x.personId === s.activePerson);

    return `
<div class="scr-top"><h1 class="scr-title">${t.walletTitle}</h1></div>
<div class="scr-body">
  <div class="card">
    <div class="card-kicker">${this.activePersonName} · ${t.walletKicker}</div>
    <div class="amount-lg mt-1">${NAIRA(bal)}</div>
    <button class="btn btn-primary btn-block mt-3" id="btn-topup">${t.topUpBtn}</button>
  </div>
  <div class="row-tap" style="display:flex;justify-content:space-between;align-items:center;padding:12px 4px;margin-top:12px" id="btn-toggle-autopay">
    <div>
      <div style="font-size:14px;font-weight:600">${t.autoPayLabel}</div>
      <div style="font-size:12px;opacity:.6">${t.autoPaySub}</div>
    </div>
    <div class="toggle-track ${autoPay?'on':''}"><div class="toggle-thumb"></div></div>
  </div>
  ${autoPay && eligibleBill ? `<button class="btn btn-secondary btn-block mt-2" id="btn-run-autopay">${typeof t.runAutoPayLabel==='function'?t.runAutoPayLabel(eligibleBill.amountDue):''}</button>` : ''}
  ${s.toastMsg ? `<div class="banner info mt-3">${s.toastMsg}</div>` : ''}
  <div style="margin-top:20px">
    <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin-bottom:8px">${t.walletActivity}</div>
    ${myTxns.length ? myTxns.map(x=>`
    <div class="card mb-2">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:13px;font-weight:600">${x.label}</div><div style="font-size:11px;opacity:.6;margin-top:2px">${x.date}</div></div>
        <div style="font-weight:600;font-size:14px;color:${x.sign>0?'var(--color-accent-700)':'var(--color-accent-2-700)'}">${x.sign>0?'+':'−'}${NAIRA(x.amount)}</div>
      </div>
    </div>`).join('') : `<p style="font-size:13px;opacity:.6">${t.noWalletActivity}</p>`}
  </div>
</div>
${this._htmlTabbar('wallet')}`;
  }

  /* ── Top up ────────────────────────────────────────────── */
  _scrTopup() {
    const t = this.t; const s = this.state;
    const presets = [5000,10000,20000,50000];
    const isContribute = s.payContext === 'savings';
    const title = isContribute ? t.savings_topup_title : t.topup_title;

    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button><h1 class="scr-title">${title}</h1></div>
<div class="scr-body">
  <p style="font-size:13px;opacity:.65">Balance: ${NAIRA(this.activeWallet)}</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
    ${presets.map((p,i)=>`<button class="chip ${s.topupPresetIdx===i?'active':''}" data-preset="${i}">${NAIRA(p)}</button>`).join('')}
  </div>
  <div class="field mt-4"><label>${t.customAmountLabel}</label><input class="input" id="inp-topup-custom" value="${s.topupCustom}" placeholder="₦0" type="tel"></div>
</div>
<div class="sticky-cta"><button class="btn btn-primary btn-block" id="btn-topup-continue">${t.continue}</button></div>`;
  }

  /* ── Insights ──────────────────────────────────────────── */
  _scrInsights() {
    const t = this.t; const s = this.state;
    const isFamily = s.insightScope === 'family';

    // spending bars
    const spendData = isFamily
      ? [
          { month:'Jun', amount: SPEND_DATA.self[0].amount + SPEND_DATA.ade[0].amount + SPEND_DATA.faith[0].amount },
          { month:'Jul', amount: SPEND_DATA.self[1].amount + SPEND_DATA.ade[1].amount + SPEND_DATA.faith[1].amount },
          { month:'Aug', amount: SPEND_DATA.self[2].amount + SPEND_DATA.ade[2].amount + SPEND_DATA.faith[2].amount },
          { month:'Sep', amount: SPEND_DATA.self[3].amount + SPEND_DATA.ade[3].amount + SPEND_DATA.faith[3].amount },
        ]
      : SPEND_DATA[s.activePerson] || SPEND_DATA.self;

    const maxSpend = Math.max(...spendData.map(d => d.amount), 1);
    const totalSpend = spendData.reduce((sum,d)=>sum+d.amount,0);

    const spendBars = spendData.map(d=>`
      <div class="bar-col">
        <div class="bar-amount">${d.amount>0?NAIRA(d.amount).replace('₦',''):''}</div>
        <div class="bar-fill" style="height:${Math.round((d.amount/maxSpend)*80)+10}px"></div>
        <div class="bar-label">${d.month}</div>
      </div>`).join('');

    // family bars
    const familyBars = isFamily ? PEOPLE.map(p=>{
      const total = SPEND_DATA[p.id].reduce((sum,d)=>sum+d.amount,0);
      const maxFam = Math.max(...PEOPLE.map(pp=>SPEND_DATA[pp.id].reduce((s,d)=>s+d.amount,0)),1);
      return `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>${p.name}</span><span style="font-weight:600">${NAIRA(total)}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.round((total/maxFam)*100)}%;background:var(--color-accent-600)"></div></div>
      </div>`;
    }).join('') : '';

    // upcoming
    const upcoming = this.activeBills.filter(b=>['unpaid','overdue','partly_paid'].includes(b.status));

    // hmo
    const hmoTotal = s.bills.filter(b=>b.hasSplit&&b.personId===s.activePerson).reduce((sum,b)=>sum+(b.hmoAmount||0),0);
    const selfTotal = s.payments.filter(p=>p.personId===s.activePerson&&p.status==='successful').reduce((sum,p)=>sum+p.amount,0);
    const hasHmo = hmoTotal > 0;
    const hmoRatio = hasHmo ? Math.round((hmoTotal/(hmoTotal+selfTotal))*100) : 0;

    // savings
    const sg = s.savingsGoal;
    const savPct = Math.round((sg.saved/sg.target)*100);

    // plans
    const plans = s.financingPlans;

    return `
<div class="scr-top"><h1 class="scr-title">${t.insightsTitle}</h1></div>
<div class="scr-body">
  <div style="display:flex;gap:8px;margin-bottom:20px">
    <button class="chip ${!isFamily?'active':''}" id="btn-scope-me">${t.scopeMe}</button>
    <button class="chip ${isFamily?'active':''}" id="btn-scope-family">${t.scopeFamily}</button>
  </div>
  <div class="card mb-3">
    <div class="card-kicker">${t.spendingKicker}</div>
    <div class="amount-md mt-1">${NAIRA(totalSpend)}</div>
    <div class="bar-chart">${spendBars}</div>
  </div>
  ${isFamily ? `<div class="card mb-3"><div class="card-kicker">${t.familySpendKicker}</div><div style="margin-top:12px">${familyBars}</div></div>` : ''}
  <div style="margin-top:4px">
    <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin-bottom:8px">${t.upcomingKicker}</div>
    ${upcoming.length ? upcoming.map(b=>`<div class="card row-tap mb-2" data-bill-open="${b.id}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:13px;font-weight:600">${b.facility}</div><div style="font-size:11px;opacity:.6;margin-top:2px">${t.dueLabel} ${b.date}</div></div>
        <div style="font-weight:600;font-size:13px">${NAIRA(b.amountDue)}</div>
      </div></div>`).join('')
    : `<p style="font-size:13px;opacity:.6">${t.noUpcoming}</p>`}
    <a href="#" id="btn-manage-reminders" style="font-size:13px;display:block;margin-top:4px">${t.manageReminders}</a>
  </div>
  ${hasHmo ? `<div class="card mt-4">
    <div class="card-kicker">${t.insuranceKicker}</div>
    <div class="stacked-bar mt-3">
      <div style="width:${hmoRatio}%;background:var(--color-accent-600)"></div>
      <div style="flex:1;background:var(--color-neutral-300)"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:6px">
      <span>${t.hmoPaidLabel} ${NAIRA(hmoTotal)}</span>
      <span>${t.youPaidLabel} ${NAIRA(selfTotal)}</span>
    </div>
  </div>` : ''}
  <div class="card mt-4">
    <div class="card-kicker">${t.savingsKicker}</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:4px">
      <div style="font-size:15px;font-weight:600">${sg.name}</div>
      <div style="font-size:12px;opacity:.6">${savPct}%</div>
    </div>
    <div class="progress-track mt-2"><div class="progress-fill" style="width:${savPct}%;background:var(--color-accent-2-600)"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:6px;opacity:.7"><span>${NAIRA(sg.saved)} saved</span><span>${NAIRA(sg.target)} goal</span></div>
    <button class="btn btn-secondary btn-block mt-3" id="btn-contribute-savings">${t.contributeBtn}</button>
  </div>
  <div style="margin-top:20px">
    <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin-bottom:8px">${t.financingKicker}</div>
    ${plans.length ? plans.map(p=>{
      const ratio = Math.round((p.paidInstallments/p.totalInstallments)*100);
      return `<div class="card mb-2">
        <div class="card-title" style="font-size:14px">${p.facility}</div>
        <div style="font-size:12px;opacity:.6;margin-top:2px">${p.paidInstallments} of ${p.totalInstallments} installments paid</div>
        <div class="progress-track mt-2"><div class="progress-fill" style="width:${ratio}%;background:var(--color-accent-600)"></div></div>
        <div style="font-size:12px;opacity:.6;margin-top:6px">${t.nextInstallment} ${NAIRA(p.perInstallment)} · ${p.nextDue}</div>
        <button class="btn btn-secondary btn-block mt-2" data-pay-installment="${p.id}">${t.payInstallmentBtn}</button>
      </div>`;
    }).join('') : `<p style="font-size:13px;opacity:.6">${t.noPlans}</p>`}
  </div>
</div>
${this._htmlTabbar('insights')}`;
  }

  /* ── People ────────────────────────────────────────────── */
  _scrPeople() {
    const t = this.t; const s = this.state;
    return `
<div class="scr-top"><button class="scr-back" id="btn-profile-tab">←</button><h1 class="scr-title">${t.peopleTitle}</h1></div>
<div class="scr-body">
  ${s.people.map(p=>{
    const ac = getAvatarColor(p.id);
    return `<button class="row-tap" style="display:flex;align-items:center;gap:10px;padding:10px 4px;width:100%;border:none;background:transparent;text-align:left;font-family:inherit;cursor:pointer" data-person-select="${p.id}">
      <div class="avatar avatar-md" style="background:${ac.bg};color:${ac.fg}">${initials(p.name)}</div>
      <div style="flex:1"><div style="font-weight:600;font-size:14px">${p.name}</div><div style="font-size:12px;opacity:.6">${p.relation}</div></div>
      ${p.id===s.activePerson?'<span style="color:var(--color-accent-700);font-size:16px">✓</span>':''}
    </button>`;
  }).join('')}
</div>
<div class="sticky-cta"><button class="btn btn-secondary btn-block" id="btn-adddep">${t.addPerson}</button></div>`;
  }

  /* ── Add dependant ─────────────────────────────────────── */
  _scrAddDep() {
    const t = this.t; const s = this.state;
    const rels = ['child','spouse','parent','other'];
    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button><h1 class="scr-title">${t.addDepTitle}</h1></div>
<div class="scr-body">
  <div class="field"><label>${t.depNameLabel}</label><input class="input" id="inp-dep-name" value="${s.depName}"></div>
  <div class="field">
    <label>${t.depRelationLabel}</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
      ${rels.map(r=>`<button class="chip ${s.depRelation===r?'active':''}" data-dep-rel="${r}">${t['rel_'+r]}</button>`).join('')}
    </div>
  </div>
  <div class="field"><label>${t.depDobLabel}</label><input class="input" id="inp-dep-dob" value="${s.depDob}" placeholder="DD/MM/YYYY"></div>
  ${s.depError ? `<div class="banner err">${s.depError}</div>` : ''}
</div>
<div class="sticky-cta"><button class="btn btn-primary btn-block" id="btn-dep-save">${t.depSave}</button></div>`;
  }

  /* ── Profile hub ───────────────────────────────────────── */
  _scrProfile2() {
    const t = this.t; const s = this.state;
    const ac = getAvatarColor(s.activePerson);
    const menuTargets = ['people','security','privacy','notifprefs','language','help','contact','legal'];
    return `
<div class="scr-top"><h1 class="scr-title">${t.profile2Title}</h1></div>
<div class="scr-body">
  <div style="display:flex;align-items:center;gap:12px;padding:8px 4px">
    <div class="avatar avatar-lg" style="background:${ac.bg};color:${ac.fg}">${initials(this.activePersonName)}</div>
    <div>
      <div style="font-size:17px;font-weight:600">${s.profName}</div>
      <div style="font-size:13px;opacity:.6">+234 ${s.phone || '803 000 0000'}</div>
    </div>
  </div>
  <div class="divider-line"></div>
  ${t.settingsMenu.map((label,i)=>`
  <button class="row-tap" style="display:flex;justify-content:space-between;align-items:center;padding:12px 4px;width:100%;border:none;background:transparent;font-family:inherit;cursor:pointer" data-settings="${menuTargets[i]}">
    <span style="font-size:14px">${label}</span><span style="opacity:.4">›</span>
  </button>`).join('')}
  <div class="divider-line"></div>
  <button class="row-tap" style="display:flex;justify-content:space-between;align-items:center;padding:12px 4px;width:100%;border:none;background:transparent;font-family:inherit;cursor:pointer;color:var(--color-accent-2-700)" id="btn-delete-account">
    <span style="font-size:14px">${t.deleteAccountLabel}</span><span style="opacity:.4">›</span>
  </button>
  <button class="btn btn-ghost btn-block mt-4" id="btn-logout">${t.logOut}</button>
</div>
${this._htmlTabbar('profile')}`;
  }

  /* ── Security ──────────────────────────────────────────── */
  _scrSecurity() {
    const t = this.t; const s = this.state;
    return `
<div class="scr-top"><button class="scr-back" id="btn-profile-tab">←</button><h1 class="scr-title">${t.securityTitle}</h1></div>
<div class="scr-body">
  <button class="row-tap" style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px;width:100%;border:none;background:transparent;font-family:inherit;cursor:pointer" id="btn-toggle-bio">
    <div>
      <div style="font-size:14px;font-weight:600">${t.biometricLabel}</div>
      <div style="font-size:12px;opacity:.6">${t.biometricSub}</div>
    </div>
    <div class="toggle-track ${s.bioEnabled?'on':''}"><div class="toggle-thumb"></div></div>
  </button>
  <div class="divider-line"></div>
  <button class="row-tap" style="display:flex;justify-content:space-between;align-items:center;padding:12px 4px;width:100%;border:none;background:transparent;font-family:inherit;cursor:pointer">
    <span style="font-size:14px">${t.changePinLabel}</span><span style="opacity:.4">›</span>
  </button>
</div>`;
  }

  /* ── Privacy ───────────────────────────────────────────── */
  _scrPrivacy() {
    const t = this.t; const s = this.state;
    return `
<div class="scr-top"><button class="scr-back" id="btn-profile-tab">←</button><h1 class="scr-title">${t.privacyTitle}</h1></div>
<div class="scr-body">
  <button class="row-tap" style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px;width:100%;border:none;background:transparent;font-family:inherit;cursor:pointer" id="btn-toggle-hmo">
    <div>
      <div style="font-size:14px;font-weight:600">${t.hmoShareLabel}</div>
      <div style="font-size:12px;opacity:.6">${t.hmoShareSub}</div>
    </div>
    <div class="toggle-track ${s.hmoShare?'on':''}"><div class="toggle-thumb"></div></div>
  </button>
  <div class="divider-line"></div>
  <button class="row-tap" style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px;width:100%;border:none;background:transparent;font-family:inherit;cursor:pointer" id="btn-toggle-marketing">
    <div>
      <div style="font-size:14px;font-weight:600">${t.marketingLabel}</div>
      <div style="font-size:12px;opacity:.6">${t.marketingSub}</div>
    </div>
    <div class="toggle-track ${s.marketing?'on':''}"><div class="toggle-thumb"></div></div>
  </button>
</div>`;
  }

  /* ── Notification prefs ────────────────────────────────── */
  _scrNotifPrefs() {
    const t = this.t; const s = this.state;
    const mkRow = (label, key, id) => `
<button class="row-tap" style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px;width:100%;border:none;background:transparent;font-family:inherit;cursor:pointer" id="${id}">
  <span style="font-size:14px;font-weight:600">${label}</span>
  <div class="toggle-track ${s[key]?'on':''}"><div class="toggle-thumb"></div></div>
</button>`;
    return `
<div class="scr-top"><button class="scr-back" id="btn-profile-tab">←</button><h1 class="scr-title">${t.notifprefsTitle}</h1></div>
<div class="scr-body">
  ${mkRow(t.billAlertsLabel,'notifBills','btn-toggle-notif-bills')}
  <div class="divider-line"></div>
  ${mkRow(t.receiptsLabel,'notifReceipts','btn-toggle-notif-receipts')}
  <div class="divider-line"></div>
  ${mkRow(t.promoLabel,'notifPromo','btn-toggle-notif-promo')}
</div>`;
  }

  /* ── Language ──────────────────────────────────────────── */
  _scrLanguage() {
    const t = this.t; const s = this.state;
    return `
<div class="scr-top"><button class="scr-back" id="btn-profile-tab">←</button><h1 class="scr-title">${t.languageTitle}</h1></div>
<div class="scr-body">
  <div class="card row-tap mb-2" id="btn-lang-en" style="${s.lang==='en'?'border:1.5px solid var(--color-accent);':''}">English</div>
  <div class="card row-tap" id="btn-lang-pcm" style="${s.lang==='pcm'?'border:1.5px solid var(--color-accent);':''}">Pidgin</div>
</div>`;
  }

  /* ── Help ──────────────────────────────────────────────── */
  _scrHelp() {
    const t = this.t;
    return `
<div class="scr-top"><button class="scr-back" id="btn-profile-tab">←</button><h1 class="scr-title">${t.helpTitle}</h1></div>
<div class="scr-body">
  ${FAQS.map(f=>`
  <div style="padding:10px 0">
    <div style="font-size:13px;font-weight:600">${f.q}</div>
    <div style="font-size:12px;opacity:.7;margin-top:2px;line-height:1.5">${f.a}</div>
  </div>
  <div class="divider-line"></div>`).join('')}
  <a href="#" id="btn-contact" style="display:block;margin-top:12px;font-size:13px">${t.contactSupport}</a>
</div>`;
  }

  /* ── Contact ───────────────────────────────────────────── */
  _scrContact() {
    const t = this.t;
    return `
<div class="scr-top"><button class="scr-back" id="btn-back">←</button><h1 class="scr-title">${t.contactTitle}</h1></div>
<div class="scr-body">
  <div class="card row-tap mb-2"><div class="card-title" style="font-size:14px">${t.callSupport}</div><div style="font-size:12px;opacity:.7;margin-top:2px">0800 111 2222</div></div>
  <div class="card row-tap mb-2"><div class="card-title" style="font-size:14px">${t.whatsappSupport}</div><div style="font-size:12px;opacity:.7;margin-top:2px">+234 803 000 0000</div></div>
  <div class="card row-tap"><div class="card-title" style="font-size:14px">${t.emailSupport}</div><div style="font-size:12px;opacity:.7;margin-top:2px">support@wellipay.ng</div></div>
</div>`;
  }

  /* ── Legal ─────────────────────────────────────────────── */
  _scrLegal() {
    const t = this.t;
    return `
<div class="scr-top"><button class="scr-back" id="btn-profile-tab">←</button><h1 class="scr-title">${t.legalTitle}</h1></div>
<div class="scr-body">
  <div class="row-tap" style="display:flex;justify-content:space-between;padding:12px 4px"><span style="font-size:14px">${t.termsLink}</span><span style="opacity:.4">›</span></div>
  <div class="divider-line"></div>
  <div class="row-tap" style="display:flex;justify-content:space-between;padding:12px 4px"><span style="font-size:14px">${t.privacyLink}</span><span style="opacity:.4">›</span></div>
  <div class="divider-line"></div>
  <div class="row-tap" style="display:flex;justify-content:space-between;padding:12px 4px"><span style="font-size:14px">${t.refundLink}</span><span style="opacity:.4">›</span></div>
</div>`;
  }

  /* ── Delete account ────────────────────────────────────── */
  _scrDeleteAccount() {
    const t = this.t; const s = this.state;
    return `
<div class="scr-top"><button class="scr-back" id="btn-profile-tab">←</button><h1 class="scr-title">${t.deleteTitle}</h1></div>
<div class="scr-body">
  ${s.deleteStage === 'idle' ? `<div class="banner err">${t.deleteWarning}</div>` : ''}
  ${s.deleteStage === 'confirming' ? `<div class="banner err">${t.deleteFinalWarning}</div>` : ''}
  ${s.deleteStage === 'done' ? `<div style="text-align:center;padding-top:40px"><div style="font-size:16px;font-weight:600">${t.deleteDoneMsg}</div></div>` : ''}
</div>
${s.deleteStage === 'idle' ? `<div class="sticky-cta"><button class="btn btn-secondary btn-block" id="btn-delete-confirm">${t.deleteConfirmBtn}</button></div>` : ''}
${s.deleteStage === 'confirming' ? `<div class="sticky-cta" style="display:flex;flex-direction:column;gap:8px">
  <button class="btn btn-primary btn-block" id="btn-delete-final">${t.deleteFinalBtn}</button>
  <button class="btn btn-ghost btn-block" id="btn-delete-cancel">${t.deleteCancel}</button>
</div>` : ''}`;
  }

  /* ── S57: Episode Timeline & Dual-Payer Split ───────────── */
  _scrEpisodeTimeline() {
    const t = this.t; const s = this.state;
    const ep = s.episodes.find(e => e.id === s.activeEpisodeId) || s.episodes[0];
    const person = s.people.find(p => p.id === ep.personId) || s.people[0];
    const isUnderpaid = ep.hmoReceivable.status === 'underpaid';

    return `
<div class="scr-top">
  <button class="scr-back" id="btn-back">←</button>
  <h1 class="scr-title">${t.episodeTimeline}</h1>
</div>
<div class="scr-body">
  <div style="font-size:11px;opacity:.6">${ep.episodeNo} · Started ${ep.startDate}</div>
  <div style="font-size:17px;font-weight:600;margin-top:2px;line-height:1.3">${ep.title}</div>
  <div style="font-size:12px;opacity:.7;margin-top:2px">${ep.facility} · Patient: <strong>${person.name}</strong></div>

  <!-- Dual-Payer Responsibility Card -->
  <div class="card mt-3" style="border-top:3px solid var(--color-accent-700)">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="card-kicker">${t.dualPayerTitle}</div>
      <span class="badge-hmo">Primary: HMO</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:8px">
      <div style="font-size:12px;opacity:.7">Total Episode Tariff</div>
      <div class="amount-md">${NAIRA(ep.totalCost)}</div>
    </div>
    <div class="stacked-bar mt-2">
      <div style="width:${Math.round(ep.hmoCover/ep.totalCost*100)}%;background:var(--color-accent-600)"></div>
      <div style="width:${Math.round(ep.patientSelfPay/ep.totalCost*100)}%;background:#d82071"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px">
      <span style="color:var(--color-accent-700)">■ HMO Cover: ${NAIRA(ep.hmoCover)}</span>
      <span style="color:#aa0b56">■ Patient Self-Pay: ${NAIRA(ep.patientSelfPay)}</span>
    </div>
    <div class="divider-line"></div>
    <div style="display:flex;justify-content:space-between;font-size:13px">
      <span>Patient Paid to Date:</span>
      <span style="font-weight:600;color:#1e7e48">${NAIRA(ep.patientPaid)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px">
      <span style="font-weight:600">Remaining Responsibility:</span>
      <span style="font-weight:700;color:var(--color-accent-2-700)">${NAIRA(ep.patientDue)}</span>
    </div>
    ${ep.patientDue > 0 ? `
      <button class="btn btn-primary btn-block mt-3" id="btn-pay-episode-due">Pay ${NAIRA(ep.patientDue)} Now</button>
    ` : `
      <div class="badge-cleared mt-2" style="width:100%;justify-content:center;padding:6px">✓ Patient Responsibility Fully Cleared</div>
    `}
  </div>

  <!-- Itemized Clinical Timeline -->
  <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin:16px 0 8px">Clinical Care Items</div>
  <div class="episode-card">
    ${ep.items.map(it => `
      <div class="timeline-item">
        <div style="flex:1">
          <div style="display:flex;gap:6px;align-items:center">
            <span class="timeline-cat-badge">${it.category}</span>
            <span style="font-size:11px;opacity:.6">${it.date}</span>
          </div>
          <div style="font-size:13px;font-weight:600;margin-top:4px">${it.description}</div>
          <div style="font-size:12px;opacity:.7;margin-top:2px">
            Total ${NAIRA(it.totalCost)} (HMO: ${NAIRA(it.hmoContribution)} | Self-Pay: ${NAIRA(it.patientSelfPay)})
          </div>
        </div>
        <div style="text-align:right;flex:none">
          <span class="status-pill" style="font-size:10px;padding:2px 8px;${it.status==='cleared'?'background:#eafaf1;color:#1e7e48':it.status==='partly_paid'?'background:#fff9e6;color:#8a6400':'background:#fff1f4;color:#a00052'}">
            ${it.status === 'cleared' ? '✓ Cleared' : it.status === 'partly_paid' ? '◐ Part-Paid' : '● Unpaid'}
          </span>
        </div>
      </div>
    `).join('')}
  </div>

  <!-- WelliPay Reconcile™ Provider Underpayment -->
  <div class="card mt-2" style="background:#fffcf0;border:1px solid #fae8a4">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="card-kicker" style="color:#8a6400">${t.reconcileTitle}</div>
      <span class="status-pill" style="background:${isUnderpaid?'#ffe4e6;color:#9f1239':'#dcfce7;color:#166534'}">${isUnderpaid?'⚠️ Underpayment':'✓ Balanced'}</span>
    </div>
    <div style="font-size:12px;opacity:.8;margin-top:4px">
      Expected HMO Tariff: <strong>${NAIRA(ep.hmoReceivable.expected)}</strong><br>
      Received HMO Remittance: <strong>${NAIRA(ep.hmoReceivable.received)}</strong>
    </div>
    ${isUnderpaid ? `
      <div class="banner err mt-2" style="font-size:12px">
        <strong>${NAIRA(ep.hmoReceivable.variance)}</strong> HMO underpayment variance detected on this episode.
      </div>
      <button class="btn btn-secondary btn-block mt-2" id="btn-flag-dispute" style="font-size:12px">${t.flagDispute}</button>
    ` : ''}
  </div>
</div>`;
  }

  /* ── S51: FamilyPay Diaspora & Web Link Hub ─────────────── */
  _scrFamilyPay() {
    const t = this.t; const s = this.state;
    const req = s.familyPayList.find(f => f.id === s.activeFamilyPayId) || s.familyPayList[0];
    const pct = Math.min(100, Math.round((req.poolCollectedNgn / req.poolTargetNgn) * 100));
    const remaining = Math.max(0, req.poolTargetNgn - req.poolCollectedNgn);
    const fxRate = req.currencyRates[s.familyFxCurrency] || 2000;
    const fxSymbol = s.familyFxCurrency === 'GBP' ? '£' : s.familyFxCurrency === 'EUR' ? '€' : '$';

    return `
<div class="scr-top">
  <button class="scr-back" id="btn-back">←</button>
  <h1 class="scr-title">${t.familyPay}</h1>
</div>
<div class="scr-body">
  <div style="font-size:11px;opacity:.6">Patient: <strong>${req.patientName}</strong> · ${req.hospitalName}</div>
  <div style="font-size:16px;font-weight:600;margin-top:2px">${req.serviceDescription}</div>

  <!-- Shareable Web Link Card -->
  <div class="card mt-3">
    <div class="card-kicker">Shareable Diaspora Payment Link</div>
    <div class="field mt-2">
      <input class="input" readonly value="${req.webLinkUrl}" style="font-size:12px;background:var(--color-bg)">
    </div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn btn-primary" id="btn-copy-family-link" style="flex:1;font-size:12px">📋 ${t.copyLink}</button>
      <button class="btn btn-secondary" id="btn-share-family-whatsapp" style="flex:1;font-size:12px">💬 ${t.shareWhatsapp}</button>
    </div>
    <div style="font-size:11px;opacity:.6;margin-top:6px;text-align:center">Shortcode: <strong>${req.shortCode}</strong></div>
  </div>

  <!-- Pool Progress -->
  <div class="card mt-3">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="card-kicker">Family Pool Progress</div>
      <span class="badge-hmo">${pct}% ${t.funded}</span>
    </div>
    <div class="amount-lg mt-1">${NAIRA(req.poolCollectedNgn)}</div>
    <div style="font-size:12px;opacity:.7">Target: ${NAIRA(req.poolTargetNgn)} · Remaining: ${NAIRA(remaining)}</div>
    <div class="progress-track mt-2">
      <div class="progress-fill" style="width:${pct}%;background:var(--color-accent-600)"></div>
    </div>
    <button class="btn btn-primary btn-block mt-3" id="btn-contribute-family-pool">${t.contributePool}</button>
  </div>

  <!-- Diaspora FX Live Rates -->
  <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin:16px 0 8px">${t.diasporaRates}</div>
  <div class="diaspora-fx-row">
    ${Object.keys(req.currencyRates).map(curr => `
      <div class="diaspora-fx-card ${s.familyFxCurrency === curr ? 'active' : ''}" data-fx-curr="${curr}">
        <div style="font-size:11px;font-weight:700">${curr}</div>
        <div style="font-size:13px;font-weight:600;margin-top:2px">₦${req.currencyRates[curr].toLocaleString()}</div>
      </div>
    `).join('')}
  </div>
  <div class="banner info" style="font-size:12px;padding:8px 12px">
    10 ${s.familyFxCurrency} (${fxSymbol}10) = <strong>${NAIRA(10 * fxRate)}</strong> automatically credited in Naira.
  </div>

  <!-- Contributors Wall -->
  <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin:16px 0 8px">Contributors Wall (${req.contributors.length})</div>
  <div class="card">
    ${req.contributors.map(c => `
      <div class="contributor-item">
        <div class="avatar avatar-sm" style="background:#e9f8ff;color:#004961">${initials(c.name)}</div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:13px;font-weight:600">${c.name}</span>
            <span style="font-size:13px;font-weight:700;color:var(--color-accent-700)">+${NAIRA(c.amountNgn)}</span>
          </div>
          <div style="font-size:11px;opacity:.6">${c.relation} · ${c.date}</div>
          ${c.message ? `<div style="font-size:12px;font-style:italic;margin-top:3px;color:var(--color-neutral-700)">"${c.message}"</div>` : ''}
        </div>
      </div>
    `).join('')}
  </div>
</div>`;
  }

  /* ── Thermal Slip Modal Renderer ────────────────────────── */
  _renderThermalSlipModal() {
    const s = this.state;
    const slip = s.thermalSlipModal;
    if (!slip) return '';

    return `
    <div class="thermal-slip-modal" id="modal-thermal-slip">
      <div class="thermal-receipt">
        <div style="display:flex;justify-content:flex-end">
          <button class="btn btn-ghost" id="btn-close-thermal-slip" style="font-size:16px;padding:0 6px">✕</button>
        </div>
        <div class="thermal-header">
          <div style="font-size:15px;font-weight:900;letter-spacing:0.04em">${slip.hospitalName || 'LAGOON HOSPITALS IKOYI'}</div>
          <div style="font-size:9px;opacity:.8">17B Bourdillon Road, Ikoyi, Lagos · Tel: 01-2715000</div>
          <div style="font-size:9px;opacity:.7">CASHIER DESK 04 · POS TERMINAL #WP-882</div>
          <div class="thermal-dashed-line"></div>
          <div class="thermal-title">OFFICIAL DISCHARGE GATE CLEARANCE SLIP</div>
          <div style="font-size:9px;text-transform:uppercase;font-weight:700">80mm POS Thermal Exit Permit</div>
        </div>

        <div class="thermal-row"><span>PATIENT:</span><strong>${slip.patientName}</strong></div>
        <div class="thermal-row"><span>HOSPITAL ID (MRN):</span><strong>${slip.mrn || 'LAG-4401'}</strong></div>
        <div class="thermal-row"><span>PHONE:</span><span>${slip.patientPhone || '+234 803 123 4567'}</span></div>
        <div class="thermal-row"><span>WARD / BED:</span><span>${slip.ward || 'Ward 3B, Bed 12'}</span></div>
        <div class="thermal-row"><span>DOCTOR SIGNOFF:</span><span>${slip.doctorName || 'Dr. F. Adeleke'}</span></div>
        <div class="thermal-row"><span>DISCHARGE DATE:</span><span>${slip.date || '24-SEP-2026 14:30 WAT'}</span></div>

        <div class="thermal-dashed-line"></div>
        <div style="font-weight:700;margin-bottom:2px">BILLING SETTLEMENT SUMMARY:</div>
        <div class="thermal-row"><span>Gross Medical Tariff:</span><span>${NAIRA(slip.totalAmount || 75000)}</span></div>
        <div class="thermal-row"><span>HMO Approved:</span><span>-${NAIRA(slip.hmoApproved || 55000)}</span></div>
        <div class="thermal-row"><span>Patient Self-Pay (PSP):</span><span>-${NAIRA(slip.pspPaid || 20000)}</span></div>
        <div class="thermal-dashed-line"></div>
        <div class="thermal-row" style="font-size:12px;font-weight:800">
          <span>OUTSTANDING BALANCE:</span>
          <span>₦0.00</span>
        </div>
        <div class="thermal-row" style="font-size:10px;font-weight:700;color:#1e7e48">
          <span>FINANCIAL CLEARANCE:</span>
          <span>✓ 100% PAID & CERTIFIED</span>
        </div>

        <div class="thermal-dashed-line"></div>
        <div style="text-align:center;font-size:10px;font-weight:700">GATE SECURITY EXIT PIN:</div>
        <div class="thermal-pin-box">${slip.exitPin || 'EXIT-7749'}</div>

        <div class="thermal-qr-center">
          <div style="width:130px;height:130px;margin:0 auto;background:#fff;padding:4px;border:1px solid #111">
            ${getQrSvg(slip.passCode || 'WP-PASS-LAG-2026-4401', '#000')}
          </div>
          <div style="font-size:9px;margin-top:4px;font-family:ui-monospace,monospace">PASS REF: ${slip.passCode || 'WP-PASS-LAG-2026-4401'}</div>
        </div>

        <div class="barcode-box">||| | |||| || ||| |||| |</div>
        <div style="text-align:center;font-size:9px;opacity:.7">SECURITY HASH: 7F8A-92E1-CLR</div>

        <div class="thermal-dashed-line"></div>
        <div style="font-size:9px;line-height:1.3;text-align:center">
          <strong>NOTICE TO GATE SECURITY:</strong><br>
          Scan QR code or type PIN into Guard Terminal to verify zero balance before barrier release.
          Retain slip as paper audit.
        </div>

        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn btn-primary" id="btn-simulate-pos-print" style="flex:1;font-size:11px">
            🖨️ Send to POS Thermal Printer
          </button>
        </div>
      </div>
    </div>`;
  }

  /* ── S52: WelliPass Hospital Discharge Clearance Pass ───── */
  _scrWelliPass() {
    const t = this.t; const s = this.state;
    const pass = s.welliPassList.find(w => w.id === s.activeWelliPassId) || s.welliPassList[0];
    const isSecurityView = s.welliPassView === 'security';
    const isCleared = pass.overallStatus === 'cleared' && pass.pspReconciled.cleared;

    return `
<div class="scr-top">
  <button class="scr-back" id="btn-back">←</button>
  <h1 class="scr-title">${t.welliPass}</h1>
  <div class="scr-spacer"></div>
  <button class="btn btn-ghost" id="btn-toggle-wellipass-status" style="font-size:11px">⚙️ Toggle Status</button>
</div>
<div class="scr-body">
  <!-- View Switcher -->
  <div style="display:flex;background:var(--color-neutral-200);border-radius:100px;padding:3px;margin-bottom:14px">
    <button class="btn ${!isSecurityView ? 'btn-primary' : 'btn-ghost'}" id="btn-wellipass-view-pass" style="flex:1;border-radius:100px;font-size:12px;padding:6px 0">Patient Gate Pass</button>
    <button class="btn ${isSecurityView ? 'btn-primary' : 'btn-ghost'}" id="btn-wellipass-view-sec" style="flex:1;border-radius:100px;font-size:12px;padding:6px 0">Gate Security View</button>
  </div>

  ${!isSecurityView ? `
    <!-- Header -->
    <div style="font-size:12px;opacity:.7">${pass.hospitalName} · ${pass.ward}</div>
    <div style="font-size:18px;font-weight:700;margin-top:2px">${pass.patientName}</div>
    <div style="font-size:11px;opacity:.6">Discharge Date: ${pass.dischargeDate}</div>

    <!-- Outstanding PSP Warning if not cleared -->
    ${!isCleared ? `
      <div class="banner err mt-3">
        <div>
          <strong>${t.balanceFlagged}</strong>
          <div style="margin-top:2px">${pass.pspReconciled.notes || 'Outstanding balance must be settled before gate clearance is unlocked.'}</div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn btn-primary" id="btn-wellipass-pay-now" style="font-size:11px">${t.payBalanceNow} (₦8,000)</button>
            <button class="btn btn-secondary" id="btn-wellipass-see-cashier" style="font-size:11px">${t.seeCashier}</button>
          </div>
        </div>
      </div>
    ` : `
      <div class="banner info mt-3" style="background:#eafaf1;color:#1e7e48;border:1px solid #b7eed0">
        ✓ <strong>Full Hospital Discharge Clearance Granted</strong>
        <div style="margin-top:2px">All clinical and cashier units have certified zero balance. Present QR code at hospital security gate.</div>
      </div>
    `}

    <!-- Gate Pass QR Card -->
    <div class="qr-gate-card ${!isCleared ? 'locked' : ''}">
      <div class="card-kicker" style="color:var(--color-accent-800)">${t.gatePassTitle}</div>
      <div class="qr-code-box">
        ${getQrSvg(pass.gatePassCode, isCleared ? '#004961' : '#a00052')}
      </div>
      <div class="gate-pass-num">${pass.gatePassCode}</div>
      <div style="font-size:11px;opacity:.65;margin-top:8px">${t.scanAtGate}</div>
    </div>

    <!-- Offline Fallback Hub (Battery Dead / No Smartphone) -->
    <div class="wellipass-fallback-trigger" id="btn-toggle-fallback-drawer">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">🔋</span>
        <div style="text-align:left">
          <div style="font-weight:700;font-size:13px;color:var(--color-primary-900)">${t.fallbackTitle}</div>
          <div style="font-size:11px;opacity:.75">${t.fallbackSub}</div>
        </div>
      </div>
      <span style="font-size:13px;font-weight:700;color:var(--color-accent-700)">${s.welliPassFallbackOpen ? '▲ Close' : '▼ Options'}</span>
    </div>

    ${s.welliPassFallbackOpen ? `
      <div class="wellipass-fallback-box">
        <!-- Option 1: Paper Slip -->
        <div class="fallback-option-card">
          <div class="fallback-opt-title">
            <span>🖨️</span>
            <span>1. Official POS Thermal Paper Slip</span>
          </div>
          <div style="font-size:12px;opacity:.8;margin:4px 0 8px">
            Hospital Billing Desk prints an official stamped 80mm gate slip with your QR code and Exit PIN. Guard can scan paper or read PIN.
          </div>
          <button class="btn btn-secondary" id="btn-wp-view-thermal-slip" style="font-size:11px;padding:6px 12px">
            👁️ Preview / Print Thermal Gate Slip
          </button>
        </div>

        <!-- Option 2: SMS Token -->
        <div class="fallback-option-card">
          <div class="fallback-opt-title">
            <span>💬</span>
            <span>2. Toll-Free Offline SMS Token</span>
          </div>
          <div style="font-size:12px;opacity:.8;margin:4px 0">
            Works on any 2G feature phone ("palasa" / torchlight phone). Exit code sent automatically upon clearance:
          </div>
          <div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:8px;font-size:11px;margin:6px 0;line-height:1.4">
            <div>📱 <strong>Patient Phone:</strong> +234 803 123 4567 <span style="color:#1e7e48;font-weight:600">✓ Delivered</span></div>
            <div>👥 <strong>Next-of-Kin:</strong> Fatima Umar (Wife) +234 802 345 6789 <span style="color:#1e7e48;font-weight:600">✓ Delivered</span></div>
            <div style="margin-top:4px;font-family:ui-monospace,monospace;font-size:12px;color:var(--color-accent-800)">
              SMS text: "WELLIPASS CLEARED: Jay Umar (LAG-4401) cleared to exit. Code: EXIT-7749"
            </div>
          </div>
          <button class="btn btn-ghost" id="btn-wp-resend-sms" style="font-size:11px;padding:4px 8px;border:1px solid var(--color-divider)">
            📲 Resend SMS to Patient & Next-of-Kin
          </button>
        </div>

        <!-- Option 3: Guard Terminal Lookup -->
        <div class="fallback-option-card">
          <div class="fallback-opt-title">
            <span>🛡️</span>
            <span>3. Gate Guard Tablet Direct Look-up</span>
          </div>
          <div style="font-size:12px;opacity:.8;margin:4px 0 8px">
            No phone at all? Tell the security officer your Hospital Card # (<strong>LAG-4401</strong>) or registered Phone # (<strong>0803 123 4567</strong>). The guard terminal instantly displays your GREEN clearance.
          </div>
          <button class="btn btn-primary" id="btn-wp-open-guard-terminal" style="font-size:11px;padding:6px 12px">
            🛡️ Open Gate Security Terminal View →
          </button>
        </div>

        <!-- Option 4: USSD Code -->
        <div class="fallback-option-card" style="margin-bottom:0">
          <div class="fallback-opt-title">
            <span>📞</span>
            <span>4. Dial USSD from Any Borrowed Phone</span>
          </div>
          <div style="font-size:12px;opacity:.8;margin:4px 0">
            Borrow any phone (nurse, relative, or taxi driver) and dial <strong>*384*WELLI#</strong> → Select <em>1. Active Pass</em> → Enter phone to display code: <strong>EXIT-7749</strong>.
          </div>
        </div>
      </div>
    ` : ''}

    <!-- 4-Step Stepper -->
    <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin:16px 0 6px">4-Step Discharge Audit Trail</div>
    <div class="wp-stepper">
      <!-- Step 1: Doctor -->
      <div class="wp-step-item cleared">
        <div class="wp-step-icon cleared">✓</div>
        <div class="wp-step-content">
          <div class="wp-step-title">${t.doctorSignOff}</div>
          <div class="wp-step-sub">${pass.doctorSignOff.officerName} · ${pass.doctorSignOff.timestamp}</div>
          <div class="wp-step-meta">${pass.doctorSignOff.notes}</div>
        </div>
      </div>

      <!-- Step 2: Pharmacy -->
      <div class="wp-step-item cleared">
        <div class="wp-step-icon cleared">✓</div>
        <div class="wp-step-content">
          <div class="wp-step-title">${t.pharmacyClearance}</div>
          <div class="wp-step-sub">${pass.pharmacyClearance.officerName} · ${pass.pharmacyClearance.timestamp}</div>
          <div class="wp-step-meta">${pass.pharmacyClearance.notes || 'Medications dispensed, returns reconciled.'}</div>
        </div>
      </div>

      <!-- Step 3: HMO -->
      <div class="wp-step-item cleared">
        <div class="wp-step-icon cleared">✓</div>
        <div class="wp-step-content">
          <div class="wp-step-title">${t.hmoRemittance}</div>
          <div class="wp-step-sub">${pass.hmoRemittance.officerName} · ${pass.hmoRemittance.timestamp}</div>
          <div class="wp-step-meta">${pass.hmoRemittance.notes || 'Tariff remitted & validated.'}</div>
        </div>
      </div>

      <!-- Step 4: PSP Cashier -->
      <div class="wp-step-item ${isCleared ? 'cleared' : 'pending'}">
        <div class="wp-step-icon ${isCleared ? 'cleared' : 'pending'}">${isCleared ? '✓' : '!'}</div>
        <div class="wp-step-content">
          <div class="wp-step-title">${t.pspReconciled}</div>
          <div class="wp-step-sub">${pass.pspReconciled.officerName} · ${pass.pspReconciled.timestamp}</div>
          <div class="wp-step-meta" style="${!isCleared ? 'color:var(--color-accent-2-700);font-weight:600' : ''}">${pass.pspReconciled.notes}</div>
        </div>
      </div>
    </div>

    <!-- Dispatch Notifications Action -->
    <button class="btn btn-secondary btn-block mt-3" id="btn-wellipass-notify">
      📲 ${t.sendNotifications}
    </button>
  ` : `
    <!-- Security Officer Gate View -->
    <div class="card" style="border:2px solid #28a745;background:#f9fdfa;text-align:center;padding:24px 16px">
      <div style="width:60px;height:60px;border-radius:50%;background:#28a745;color:#fff;font-size:32px;display:flex;align-items:center;justify-content:center;margin:0 auto">✓</div>
      <div style="font-size:20px;font-weight:700;color:#1e7e48;margin-top:12px">VEHICLE & PATIENT CLEARED</div>
      <div style="font-size:13px;opacity:.8;margin-top:4px">Security Guard Scan Station #1 — Main Gate</div>
      <div class="divider-line"></div>
      <div style="text-align:left;font-size:13px;line-height:1.6">
        <strong>Patient:</strong> ${pass.patientName}<br>
        <strong>Hospital:</strong> ${pass.hospitalName}<br>
        <strong>Pass Code:</strong> <span class="gate-pass-num" style="font-size:11px">${pass.gatePassCode}</span><br>
        <strong>Exit PIN:</strong> <span class="gate-pass-num" style="font-size:13px;color:#1e7e48">EXIT-7749</span><br>
        <strong>Doctor Clearance:</strong> Signed by ${pass.doctorSignOff.officerName}<br>
        <strong>Financial Clearance:</strong> Zero Outstanding (HMO + Self-Pay Settled)<br>
        <strong>Timestamp:</strong> 24 Sep 2026, 10:45 am
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-primary" id="btn-wellipass-gate-approve" style="flex:1">Mark Exit Complete</button>
        <button class="btn btn-secondary" id="btn-wp-open-guard-terminal" style="flex:1">Guard Terminal →</button>
      </div>
    </div>
  `}

  ${this._renderThermalSlipModal()}
</div>`;
  }

  /* ── S53: Rx Pharmacy Formulary & Generic Comparator ────── */
  _scrRxPharmacy() {
    const t = this.t; const s = this.state;
    const rx = s.rxOrders.find(r => r.id === s.activeRxOrderId) || s.rxOrders[0];

    let currentTotal = 0;
    let totalPsp = 0;
    rx.items.forEach(it => {
      const isGen = it.selectedOption === 'generic';
      currentTotal += isGen ? it.genericPrice : it.brandPrice;
      totalPsp += isGen ? it.pspGeneric : it.pspBrand;
    });

    return `
<div class="scr-top">
  <button class="scr-back" id="btn-back">←</button>
  <h1 class="scr-title">${t.rxTitle}</h1>
</div>
<div class="scr-body">
  <div style="font-size:11px;opacity:.6">${rx.clinicName} · ${rx.doctorName}</div>
  <div style="font-size:16px;font-weight:600;margin-top:2px">Prescription Formulary Review</div>

  <!-- Savings Banner -->
  <div class="rx-savings-banner mt-3">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.8">Cost Optimization Engine</div>
    <div style="font-size:24px;font-weight:700;margin-top:4px">Save ${NAIRA(rx.savingsWithGeneric)} (62%)</div>
    <div style="font-size:12px;opacity:.9;margin-top:2px">Switching to WHO/NAFDAC approved bioequivalent generics drops Patient Self-Pay to ₦0 under HMO Tier 1!</div>
    <button class="btn btn-secondary mt-3" id="btn-rx-apply-all-generics" style="font-size:12px;background:#fff;color:#004961">
      ⚡ ${t.applyGenerics}
    </button>
  </div>

  <!-- Medication Comparator List -->
  <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin:16px 0 8px">${t.compareMeds}</div>
  ${rx.items.map(it => {
    const isGen = it.selectedOption === 'generic';
    return `
    <div class="rx-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <span class="badge-hmo">${it.formularyTier}</span>
          <div style="font-size:12px;opacity:.6;margin-top:4px">Dosage: ${it.dosage}</div>
        </div>
        <div style="text-align:right">
          <span style="font-size:10px;font-family:ui-monospace,monospace;opacity:.6">${t.nafdacReg}: ${it.nafdacRegNo}</span>
        </div>
      </div>

      <div class="rx-compare-grid mt-2">
        <!-- Brand Side -->
        <div class="rx-side ${!isGen ? 'selected' : ''}" data-rx-id="${it.id}" data-rx-opt="brand">
          <div class="rx-side-title">${t.brandName}</div>
          <div class="rx-side-name">${it.brandName}</div>
          <div class="rx-side-price">${NAIRA(it.brandPrice)}</div>
          <div style="font-size:11px;color:var(--color-accent-2-700);margin-top:2px">Self-Pay: ${NAIRA(it.pspBrand)}</div>
        </div>

        <!-- Generic Side -->
        <div class="rx-side ${isGen ? 'selected' : ''}" data-rx-id="${it.id}" data-rx-opt="generic">
          <div style="display:flex;justify-content:space-between">
            <div class="rx-side-title" style="color:#1e7e48">${t.genericEquiv}</div>
            <span style="font-size:10px;color:#1e7e48;font-weight:700">100% HMO</span>
          </div>
          <div class="rx-side-name">${it.genericName}</div>
          <div class="rx-side-price" style="color:#1e7e48">${NAIRA(it.genericPrice)}</div>
          <div style="font-size:11px;color:#1e7e48;font-weight:600;margin-top:2px">Self-Pay: ₦0 (FREE)</div>
        </div>
      </div>
    </div>`;
  }).join('')}

  <!-- Total Prescription Cost Summary -->
  <div class="card mt-2">
    <div style="display:flex;justify-content:space-between;font-size:13px">
      <span>Total Pharmacy Tariff:</span>
      <span style="font-weight:600">${NAIRA(currentTotal)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:14px;margin-top:4px;color:${totalPsp===0?'#1e7e48':'var(--color-accent-2-700)'}">
      <span style="font-weight:600">Your Co-Payment Responsibility:</span>
      <span style="font-weight:700;font-size:16px">${NAIRA(totalPsp)}</span>
    </div>
  </div>

  <button class="btn btn-primary btn-block mt-3" id="btn-rx-send-dispensary">
    🏥 ${t.sendDispensary}
  </button>
</div>`;
  }

  /* ── S54: Offline USSD & Low-Bandwidth Mode ──────────────── */
  _scrOfflineUssd() {
    const t = this.t; const s = this.state;
    const voucher = OFFLINE_VOUCHERS_SEED[0];

    return `
<div class="scr-top">
  <button class="scr-back" id="btn-back">←</button>
  <h1 class="scr-title">${t.ussdTitle}</h1>
</div>
<div class="scr-body">
  <div class="banner warn" style="background:#1e1e1e;color:#fff;border-radius:8px">
    <div>
      <div style="font-weight:700;color:#4af626">📶 ${t.zeroDataMode}</div>
      <div style="font-size:12px;opacity:.85;margin-top:2px">${t.zeroDataDesc}</div>
    </div>
  </div>

  <!-- Bank USSD Codes -->
  <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin:16px 0 8px">Direct Bank USSD Shortcodes</div>
  ${s.ussdBanks.map(b => `
    <div class="ussd-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;font-weight:600">${b.bankName}</span>
        <button class="btn btn-primary" data-ussd-dial="${b.sampleString}" style="font-size:11px;padding:4px 10px">Dial 📞</button>
      </div>
      <div class="ussd-string-box mt-2">
        <span>${b.sampleString}</span>
        <button class="btn btn-ghost" data-ussd-copy="${b.sampleString}" style="color:#4af626;font-size:11px;padding:2px 6px">Copy</button>
      </div>
    </div>
  `).join('')}

  <!-- Offline Digital Voucher -->
  <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin:16px 0 8px">${t.offlineVoucher}</div>
  <div class="card" style="text-align:center">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span class="badge-cleared">✓ ${t.offlineVerify}</span>
      <span style="font-size:11px;opacity:.6">${voucher.expiresAt}</span>
    </div>
    <div class="amount-lg mt-2">${NAIRA(voucher.amount)}</div>
    <div style="font-size:12px;opacity:.7">${voucher.patientName} · ${voucher.hospitalName}</div>
    <div class="qr-code-box mt-2" style="width:140px;height:140px">
      ${getQrSvg(voucher.qrPayload, '#004961')}
    </div>
    <div class="gate-pass-num" style="font-size:11px">${voucher.voucherToken}</div>
    <div style="font-size:11px;opacity:.6;margin-top:6px">Show to cashier for local offline validation.</div>
  </div>

  <!-- USSD Simulation Modal if active -->
  ${s.ussdActiveSim ? `
    <div class="ussd-sim-modal" id="ussd-sim-modal">
      <div class="ussd-sim-screen">
        <div style="font-size:12px;font-weight:700;color:var(--color-accent-700)">USSD SERVICE CALL</div>
        <div style="font-size:14px;font-weight:600;margin-top:10px">${s.ussdActiveSim.title}</div>
        <div style="font-size:12px;margin-top:6px;color:#555">${s.ussdActiveSim.prompt}</div>
        <div class="field mt-3">
          <input class="input" id="inp-ussd-pin" placeholder="Enter 4-digit PIN" type="password" maxlength="4" style="text-align:center;font-size:16px">
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-ghost" id="btn-ussd-cancel" style="flex:1">Cancel</button>
          <button class="btn btn-primary" id="btn-ussd-send" style="flex:1">Send</button>
        </div>
      </div>
    </div>
  ` : ''}
</div>`;
  }

  /* ── S55: Provider / Hospital Billing Desk Portal ───────── */
  _scrProviderDesk() {
    const t = this.t; const s = this.state;
    const pd = s.providerDesk;
    const isCashier = s.deskMode === 'cashier';

    // Queue filtering for cashier workstation
    const query = (s.deskSearchQuery || '').toLowerCase().trim();
    let queue = pd.liveQueue.filter(q => {
      // Tab filter
      if (s.deskFilterTab === 'awaiting_psp' && q.status !== 'awaiting_psp') return false;
      if (s.deskFilterTab === 'waiting_hmo' && q.status !== 'awaiting_adjudication') return false;
      if (s.deskFilterTab === 'cleared' && q.status !== 'cleared') return false;
      // Search query
      if (query) {
        const matchName = (q.patientName || '').toLowerCase().includes(query);
        const matchMrn = (q.welliRecordId || '').toLowerCase().includes(query);
        const matchWard = (q.ward || '').toLowerCase().includes(query);
        const matchToken = (q.token || '').toLowerCase().includes(query);
        return matchName || matchMrn || matchWard || matchToken;
      }
      return true;
    });

    const totalCount = pd.liveQueue.length;
    const pspCount = pd.liveQueue.filter(q => q.status === 'awaiting_psp').length;
    const hmoCount = pd.liveQueue.filter(q => q.status === 'awaiting_adjudication').length;
    const clearedCount = pd.liveQueue.filter(q => q.status === 'cleared').length;

    return `
<div class="scr-top">
  <button class="scr-back" id="btn-back">←</button>
  <h1 class="scr-title">${t.providerTitle || 'Cashier Workstation'}</h1>
  <div class="scr-spacer"></div>
  <button class="btn btn-ghost" id="btn-provider-go-guard" style="font-size:11px">Guard Terminal →</button>
</div>
<div class="scr-body">
  <!-- Staff Security Banner & Demo Patient Switcher -->
  <div style="background:#e8f4f8;border:1px solid #0088b0;border-radius:6px;padding:6px 10px;font-size:11px;color:#004961;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span>🔒 <strong>Hospital Staff Portal</strong> · Billing Station #04</span>
    <button class="btn btn-ghost" id="btn-goto-patient-ticket" style="font-size:10px;padding:2px 8px;border:1px solid #0088b0;background:#fff;color:#004961">
      Patient View (S61) →
    </button>
  </div>

  <!-- ── CASHIER WORKSTATION VIEW ── -->
  <div style="font-size:11px;opacity:.6">${pd.facilityName} · ${pd.location}</div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px">
    <div style="font-size:16px;font-weight:700">${pd.operatorName} · ${pd.counterNumber}</div>
    <button class="btn btn-ghost" id="btn-desk-eod-report" style="font-size:11px;border:1px solid var(--color-divider);padding:3px 8px">
      📊 ${t.endShiftReport || 'Shift Report'}
    </button>
  </div>

    <!-- Active Shift Summary Bar -->
    <div class="desk-shift-bar mt-2">
      <div>
        <strong>Shift #${pd.shift.shiftId}:</strong> Active (${pd.shift.startedAt} - 4:00 pm)
      </div>
      <div>
        Cash: <strong>${NAIRA(pd.shift.cashInTill)}</strong> | POS: <strong>${NAIRA(pd.shift.posCollected)}</strong>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-lbl">${t.totalBilled}</div>
        <div class="kpi-val">${NAIRA(pd.todaysStats.totalBilled)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">${t.hmoClaims}</div>
        <div class="kpi-val" style="color:var(--color-accent-700)">${NAIRA(pd.todaysStats.hmoClaims)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">${t.pspCollected}</div>
        <div class="kpi-val" style="color:#1e7e48">${NAIRA(pd.todaysStats.pspCollected)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">${t.patientsCleared}</div>
        <div class="kpi-val">${pd.todaysStats.patientsCount}</div>
      </div>
    </div>

    <!-- Quick Action: Scan Invoice -->
    <button class="btn btn-primary btn-block mb-3" id="btn-provider-scan-qr">
      📷 ${t.scanInvoice}
    </button>

    <!-- Search Input Bar -->
    <div style="margin-bottom:8px">
      <input type="text" class="gate-search-input" id="inp-desk-search" placeholder="${t.queueSearchPlaceholder || 'Search queue by patient, MRN, or bed...'}" value="${s.deskSearchQuery}" style="width:100%;font-size:12px;padding:8px 12px">
    </div>

    <!-- Filter Tabs with Counts -->
    <div class="desk-filter-tabs">
      <button class="desk-filter-tab ${s.deskFilterTab==='all'?'active':''}" data-desk-tab="all">
        ${t.filterAll || 'All Patients'} <span class="desk-tab-count">${totalCount}</span>
      </button>
      <button class="desk-filter-tab ${s.deskFilterTab==='awaiting_psp'?'active':''}" data-desk-tab="awaiting_psp">
        ${t.filterAwaitingPsp || 'Awaiting Co-Pay'} <span class="desk-tab-count">${pspCount}</span>
      </button>
      <button class="desk-filter-tab ${s.deskFilterTab==='waiting_hmo'?'active':''}" data-desk-tab="waiting_hmo">
        ${t.filterWaitingHmo || 'Waiting HMO'} <span class="desk-tab-count">${hmoCount}</span>
      </button>
      <button class="desk-filter-tab ${s.deskFilterTab==='cleared'?'active':''}" data-desk-tab="cleared">
        ${t.filterCleared || 'Cleared'} <span class="desk-tab-count">${clearedCount}</span>
      </button>
    </div>

    <!-- Live Patient Queue -->
    <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin:8px 0">${t.liveQueue} (${queue.length})</div>
    ${queue.length === 0 ? `
      <div class="card" style="text-align:center;padding:24px 16px;opacity:.7;font-size:13px">
        No patients match this filter or search query.
      </div>
    ` : queue.map(q => `
      <div class="queue-card" data-queue-item="${q.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="display:flex;gap:8px;align-items:flex-start">
            <span class="queue-token-pill ${q.status==='cleared'?'cleared':'pending'}">${q.token}</span>
            <div>
              <div style="font-size:14px;font-weight:700">${q.patientName}</div>
              <div style="font-size:11px;opacity:.6">${q.welliRecordId} · ${q.ward || 'General Ward'}</div>
              <div style="font-size:11px;opacity:.8;margin-top:1px">${q.service}</div>
            </div>
          </div>
          <span class="status-pill" style="font-size:10px;${q.status==='cleared'?'background:#eafaf1;color:#1e7e48':q.status==='awaiting_psp'?'background:#fff1f4;color:#a00052':'background:#fff9e6;color:#8a6400'}">
            ${q.status === 'cleared' ? '✓ Cleared' : q.status === 'awaiting_psp' ? 'Awaiting Co-Pay' : 'Waiting HMO'}
          </span>
        </div>

        ${q.bedsideRequested ? `
          <div style="background:#fdf8e6;border:1px solid #f1c40f;border-radius:4px;padding:3px 8px;font-size:10px;font-weight:600;color:#8a6400;margin-top:6px">
            🛏️ Bedside Cashier Settlement Requested by Ward
          </div>
        ` : ''}

        <!-- Clinical Badges -->
        <div style="display:flex;gap:6px;font-size:10px;margin-top:6px;flex-wrap:wrap">
          <span style="background:var(--color-bg);border:1px solid var(--color-divider);padding:2px 6px;border-radius:4px">
            🩺 ${q.doctorSignoff || 'Dr. Signoff ✓'}
          </span>
          <span style="background:var(--color-bg);border:1px solid var(--color-divider);padding:2px 6px;border-radius:4px">
            💊 ${q.pharmacyClearance || 'Pharmacy Clear ✓'}
          </span>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:8px;border-top:1px solid var(--color-divider);padding-top:6px">
          <span>Gross: ${NAIRA(q.totalAmount)}</span>
          <span>HMO: ${NAIRA(q.hmoApproved)} | Co-Pay Due: <strong style="${q.pspAmount>0?'color:#a00052':'color:#1e7e48'}">${NAIRA(q.pspAmount)}</strong></span>
        </div>

        <!-- Desk Quick Action Buttons -->
        <div style="display:flex;gap:6px;margin-top:8px">
          <button class="btn btn-primary btn-desk-action-modal" data-desk-action="${q.id}" style="font-size:11px;padding:5px 8px;flex:1.2">
            ⚡ ${q.pspAmount > 0 ? (t.collectPayment || 'Collect Payment') : 'View Clearance'}
          </button>
          <button class="btn btn-secondary btn-print-slip" data-queue-id="${q.id}" style="font-size:11px;padding:5px 8px;flex:1">
            🖨️ ${t.printThermalSlip || 'Slip'}
          </button>
          <button class="btn btn-ghost btn-resend-nok-sms" data-queue-id="${q.id}" style="font-size:11px;padding:5px 8px;flex:1;border:1px solid var(--color-divider)">
            📲 SMS
          </button>
        </div>
      </div>
    `).join('')}

  <!-- Interactive Cashier Settlement Action Modal / Drawer -->
  ${s.deskPatientActionModal ? `
    <div class="ussd-sim-modal" id="modal-desk-settlement">
      <div class="ussd-sim-screen" style="max-width:360px;text-align:left">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;gap:6px;align-items:center">
            <span class="queue-token-pill pending">${s.deskPatientActionModal.token}</span>
            <div class="card-kicker" style="color:var(--color-accent-700)">Desk Payment Settlement</div>
          </div>
          <button class="btn btn-ghost" id="btn-close-desk-action" style="font-size:16px;padding:2px 8px">✕</button>
        </div>

        <div style="font-size:16px;font-weight:700;margin-top:6px">${s.deskPatientActionModal.patientName}</div>
        <div style="font-size:12px;opacity:.7">MRN: <strong>${s.deskPatientActionModal.welliRecordId}</strong> · ${s.deskPatientActionModal.ward || 'Ward 3B'}</div>
        <div style="font-size:11px;opacity:.8;margin-top:2px">${s.deskPatientActionModal.service}</div>

        <div class="card mt-2" style="padding:10px;background:#f9f9f9">
          <div style="display:flex;justify-content:space-between;font-size:12px">
            <span>Gross Bill Amount:</span><strong>${NAIRA(s.deskPatientActionModal.totalAmount)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:2px;color:var(--color-accent-700)">
            <span>HMO Approved:</span><strong>-${NAIRA(s.deskPatientActionModal.hmoApproved)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:14px;margin-top:4px;border-top:1px solid #ddd;padding-top:4px;color:${s.deskPatientActionModal.pspAmount>0?'#a00052':'#1e7e48'};font-weight:800">
            <span>Co-Pay (Patient Self-Pay):</span>
            <span>${NAIRA(s.deskPatientActionModal.pspAmount)}</span>
          </div>
        </div>

        ${s.deskPatientActionModal.pspAmount > 0 ? `
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.6;margin:10px 0 6px">Select Cashier Collection Method:</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn btn-primary" id="btn-settle-cash" style="font-size:12px;justify-content:flex-start;padding:8px 12px">
              💵 ${t.cashReceived || 'Accept Cash at Counter'} (${NAIRA(s.deskPatientActionModal.pspAmount)})
            </button>
            <button class="btn btn-secondary" id="btn-settle-pos" style="font-size:12px;justify-content:flex-start;padding:8px 12px">
              💳 ${t.posCharge || 'Charge Physical POS Terminal'} (Moniepoint/OPay)
            </button>
            <button class="btn btn-ghost" id="btn-settle-ussd" style="font-size:12px;justify-content:flex-start;padding:8px 12px;border:1px solid var(--color-divider)">
              📲 ${t.pushUssd || 'Push USSD Prompt to Patient Phone'}
            </button>
            <button class="btn btn-ghost" id="btn-settle-whatsapp" style="font-size:12px;justify-content:flex-start;padding:8px 12px;border:1px solid var(--color-divider)">
              🔗 ${t.sendWhatsappLink || 'Share WhatsApp Pay Link to Family'}
            </button>
          </div>
        ` : `
          <div class="banner info mt-3" style="background:#eafaf1;color:#1e7e48;border:1px solid #b7eed0">
            ✓ <strong>Zero Outstanding Balance</strong>
            <div style="margin-top:2px">Patient has completed co-pay. Authorize WelliPass exit.</div>
          </div>
          <button class="btn btn-primary btn-block mt-3" id="btn-desk-issue-wellipass">
            🟢 Issue & Print WelliPass Gate Clearance
          </button>
        `}
      </div>
    </div>
  ` : ''}

  <!-- Interactive Invoice Scanner Modal -->
  ${s.providerInvoiceModal ? `
    <div class="ussd-sim-modal" id="modal-invoice-review">
      <div class="ussd-sim-screen" style="max-width:360px;text-align:left">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="card-kicker" style="color:var(--color-accent-700)">Hospital Billing Invoice</div>
          <button class="btn btn-ghost" id="btn-close-invoice-modal" style="font-size:16px;padding:2px 8px">✕</button>
        </div>
        <div style="font-size:16px;font-weight:700;margin-top:4px">${s.providerInvoiceModal.service}</div>
        <div style="font-size:12px;opacity:.7">Patient: <strong>${s.providerInvoiceModal.patientName}</strong> · Code: ${s.providerInvoiceModal.code}</div>

        <div class="qr-code-box mt-2" style="width:130px;height:130px">
          ${getQrSvg(`WP://INVOICE/${s.providerInvoiceModal.code}`, '#004961')}
        </div>

        <div class="card mt-2" style="padding:10px;background:#f9f9f9">
          <div style="display:flex;justify-content:space-between;font-size:12px">
            <span>Gross Bill Amount:</span><strong>${NAIRA(s.providerInvoiceModal.amount)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:2px;color:var(--color-accent-700)">
            <span>HMO Approved:</span><strong>-${NAIRA(s.providerInvoiceModal.hmoApproved)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px;border-top:1px solid #ddd;padding-top:4px;color:#a00052">
            <span>Patient Self-Pay (PSP):</span><strong>${NAIRA(s.providerInvoiceModal.pspDue)}</strong>
          </div>
        </div>

        <div style="margin-top:10px;display:flex;gap:6px">
          <button class="btn btn-secondary" id="btn-invoice-print-slip" style="flex:1;font-size:11px">
            🖨️ Print Thermal Slip
          </button>
          <button class="btn btn-ghost" id="btn-invoice-resend-sms" style="flex:1;font-size:11px;border:1px solid var(--color-divider)">
            📲 SMS to Next-of-Kin
          </button>
        </div>

        <div style="margin-top:8px;display:flex;gap:8px">
          <button class="btn btn-primary" id="btn-invoice-confirm-clear" style="flex:1;font-size:11px">Issue WelliPass</button>
          <button class="btn btn-secondary" id="btn-invoice-send-alert" style="flex:1;font-size:11px">Notify WhatsApp</button>
        </div>
      </div>
    </div>
  ` : ''}

  <!-- EOD Shift Closing Reconciliation Modal -->
  ${s.deskEodReportModal ? `
    <div class="ussd-sim-modal" id="modal-eod-report">
      <div class="ussd-sim-screen" style="max-width:340px;text-align:left">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="card-kicker" style="color:var(--color-accent-700)">Shift End Reconciliation</div>
          <button class="btn btn-ghost" id="btn-close-eod-report" style="font-size:16px;padding:2px 8px">✕</button>
        </div>
        <div style="font-size:16px;font-weight:700;margin-top:4px">${pd.facilityName}</div>
        <div style="font-size:12px;opacity:.7">Cashier: <strong>${pd.operatorName}</strong> · Shift #${pd.shift.shiftId}</div>

        <div class="card mt-2" style="padding:10px;background:#fffdf7;font-family:'Courier New',Courier,monospace;font-size:11px">
          <div style="text-align:center;font-weight:700;border-bottom:1px dashed #444;padding-bottom:4px;margin-bottom:6px">END-OF-DAY AUDIT SUMMARY</div>
          <div style="display:flex;justify-content:space-between"><span>Physical Cash in Till:</span><strong>${NAIRA(pd.shift.cashInTill)}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-top:2px"><span>POS Card Collections:</span><strong>${NAIRA(pd.shift.posCollected)}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-top:2px"><span>HMO Claims Batched:</span><strong>${NAIRA(pd.todaysStats.hmoClaims)}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;border-top:1px dashed #444;padding-top:4px"><span>Total Collections:</span><strong>${NAIRA(pd.todaysStats.pspCollected)}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-top:2px"><span>Patients Cleared:</span><strong>${pd.todaysStats.patientsCount}</strong></div>
        </div>

        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary" id="btn-desk-print-eod" style="flex:1;font-size:11px">🖨️ Print Shift Report</button>
          <button class="btn btn-ghost" id="btn-close-eod-report-btn" style="flex:1;font-size:11px;border:1px solid var(--color-divider)">Close</button>
        </div>
      </div>
    </div>
  ` : ''}

  ${this._renderThermalSlipModal()}
</div>`;
  }

  /* ── S61: Patient Hospital Desk & Queue Ticket ─────────── */
  _scrPatientDeskTicket() {
    const t = this.t; const s = this.state;
    const pd = s.providerDesk;
    const jayItem = pd.liveQueue.find(q => q.welliRecordId === 'LAG-4401') || pd.liveQueue[0];
    const isJayCleared = jayItem.status === 'cleared';

    return `
<div class="scr-top">
  <button class="scr-back" id="btn-back">←</button>
  <h1 class="scr-title">${t.patientDeskTitle || 'Hospital Desk Ticket'}</h1>
  <div class="scr-spacer"></div>
  <button class="btn btn-ghost" id="btn-desk-ticket-go-wp" style="font-size:11px">WelliPass →</button>
</div>
<div class="scr-body">
  <!-- Patient Notice & Demo Staff Switcher -->
  <div style="background:#f4fbfd;border:1px solid #c2e5f0;border-radius:6px;padding:6px 10px;font-size:11px;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span>👤 <strong>Patient Virtual Desk</strong> · In-Clinic Queue Pass</span>
    <button class="btn btn-ghost" id="btn-goto-staff-desk" style="font-size:10px;padding:2px 8px;border:1px solid #0088b0;background:#fff;color:#004961">
      Staff Cashier View (S55) →
    </button>
  </div>

  <!-- ── PATIENT DESK TICKET & CHECK-IN VIEW ── -->
  <div class="patient-desk-ticket">
    <!-- Header Band -->
    <div class="ticket-header-band">
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.85">Central Cashier & Billing Desk</div>
        <div style="font-size:16px;font-weight:700;margin-top:2px">${pd.facilityName}</div>
        <div style="font-size:11px;opacity:.9;margin-top:2px">${pd.location}</div>
      </div>
      <div style="text-align:right">
        <span class="gate-station-badge" style="background:#fff;color:#004961;font-weight:700">${pd.counterNumber}</span>
        <div style="font-size:10px;opacity:.8;margin-top:4px">Duty Lead: Sister Chinyere</div>
      </div>
    </div>

    <!-- Ticket Body -->
    <div class="ticket-body-content">
      <!-- Token & Live Serving Display -->
      <div class="ticket-token-display">
        <div>
          <div style="font-size:10px;text-transform:uppercase;font-weight:700;opacity:.6">Your Queue Ticket</div>
          <div class="giant-token">${jayItem.token}</div>
          <div style="font-size:11px;opacity:.7;margin-top:2px">Patient: <strong>${jayItem.patientName}</strong> (${jayItem.welliRecordId})</div>
        </div>
        <div style="text-align:right">
          <span class="now-serving-badge">● NOW SERVING: ${pd.currentServingToken}</span>
          <div class="wait-time-chip">⏱ 2 Patients Ahead (~6 mins wait)</div>
        </div>
      </div>

      <div class="ticket-perforation"></div>

      <!-- 4-Step Discharge Milestone Tracker -->
      <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.5;margin-bottom:6px">Discharge Milestone Tracker</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;background:var(--color-bg);border:1px solid var(--color-divider);border-radius:6px;padding:8px 10px">
        <span style="color:#1e7e48;font-weight:600">1. Doctor Signoff ✓</span>
        <span style="color:#1e7e48;font-weight:600">2. Pharmacy ✓</span>
        <span style="${isJayCleared ? 'color:#1e7e48;font-weight:600' : 'color:#d6006c;font-weight:700'}">3. Cashier Co-Pay ${isJayCleared ? '✓' : '⏱'}</span>
        <span style="${isJayCleared ? 'color:#0088b0;font-weight:600' : 'opacity:.5'}">4. Gate Exit</span>
      </div>

      <!-- Bedside Cashier Settlement Request -->
      <div class="bedside-banner">
        <div>
          <div style="font-size:12px;font-weight:700;color:#8a6400">🛏️ Too weak to walk down to Room 102?</div>
          <div style="font-size:11px;opacity:.8;margin-top:2px">Request bedside settlement — settle from your bed or an attendant will visit Ward 3B.</div>
        </div>
        <button class="btn ${s.deskBedsideRequested ? 'btn-secondary' : 'btn-primary'}" id="btn-desk-request-bedside" style="font-size:11px;padding:6px 10px;white-space:nowrap">
          ${s.deskBedsideRequested ? '✓ Bedside Requested' : (t.requestBedside || 'Request Bedside')}
        </button>
      </div>

      <!-- Out-of-Pocket Co-Pay Settlement Card -->
      <div class="card" style="padding:14px;background:#fcfdff;border:1px solid #d0e7f2">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--color-accent-800);font-weight:700">Financial Clearance Summary</div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px">
          <span>Gross Medical Tariff:</span><strong>${NAIRA(jayItem.totalAmount)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:2px;color:var(--color-accent-700)">
          <span>HMO Approved (${jayItem.hmoName}):</span><strong>-${NAIRA(jayItem.hmoApproved)}</strong>
        </div>
        <div class="divider-line" style="margin:8px 0"></div>
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;color:${jayItem.pspAmount>0?'#a00052':'#1e7e48'}">
          <span>Patient Self-Pay (Co-Pay):</span>
          <span>${NAIRA(jayItem.pspAmount)}</span>
        </div>

        ${jayItem.pspAmount > 0 ? `
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
            <button class="btn btn-primary btn-block" id="btn-desk-patient-pay-now">
              ⚡ ${t.payWalletInstant || 'Pay via WelliPay Wallet (Instant Zero-Wait)'}
            </button>
            <div style="display:flex;gap:6px">
              <button class="btn btn-secondary" id="btn-desk-patient-familypay" style="flex:1;font-size:11px">
                👨‍👩‍👦 Ask Family (FamilyPay)
              </button>
              <button class="btn btn-ghost" id="btn-desk-patient-ussd" style="flex:1;font-size:11px;border:1px solid var(--color-divider)">
                📞 USSD Pay (*737*...)
              </button>
            </div>
          </div>
        ` : `
          <div class="banner info mt-3" style="background:#eafaf1;color:#1e7e48;border:1px solid #b7eed0">
            ✓ <strong>Bill 100% Paid & Reconciled!</strong>
            <div style="margin-top:2px">Your WelliPass Digital Gate Pass is now unlocked and valid for exit.</div>
            <button class="btn btn-primary mt-2" id="btn-desk-patient-view-wp" style="font-size:11px">
              Open WelliPass Gate Pass →
            </button>
          </div>
        `}
      </div>

      <!-- Attendant Counter Card -->
      <div class="counter-attendant-card">
        <div class="avatar avatar-md" style="background:#004961;color:#fff">CE</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700">Sister Chinyere Eze</div>
          <div style="font-size:11px;opacity:.7">Desk Attendant · Counter #04 · Room 102</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary" id="btn-desk-call-counter" style="font-size:11px;padding:4px 8px">📞 Call</button>
          <button class="btn btn-ghost" id="btn-desk-chat-counter" style="font-size:11px;padding:4px 8px;border:1px solid var(--color-divider)">💬 WhatsApp</button>
        </div>
      </div>
    </div>
  </div>
</div>`;
  }

  /* ── S59: Dedicated Gate Security Guard View ────────────── */
  _scrGateSecurity() {
    const t = this.t; const s = this.state;
    const query = (s.gateSearchQuery || '').trim().toUpperCase();

    // Data matching
    const isJay = !query || query === 'LAG-4401' || query === '08031234567' || query === 'EXIT-7749' || query.includes('JAY') || query.includes('4401');
    const isEmeka = query === 'LAG-2091' || query === '08059918234' || query === 'EXIT-3301' || query.includes('EMEKA') || query.includes('2091');
    const isAisha = query === 'LAG-9920' || query === '08039999999' || query.includes('AISHA') || query.includes('9920');
    const isCleared = isJay || isEmeka;
    const notFound = !isJay && !isEmeka && !isAisha;

    return `
<div class="scr-top">
  <button class="scr-back" id="btn-back">←</button>
  <h1 class="scr-title">${t.gateTerminalTitle || 'Gate Security Terminal'}</h1>
  <div class="scr-spacer"></div>
  <button class="btn btn-ghost" id="btn-gate-switch-to-wp" style="font-size:11px">WelliPass View →</button>
</div>
<div class="scr-body">
  <!-- Station Header -->
  <div class="gate-terminal-header">
    <div>
      <div style="font-size:11px;opacity:.7">LAGOON HOSPITALS IKOYI · MAIN EXIT</div>
      <div style="font-size:15px;font-weight:700;margin-top:2px">Guard Terminal #01 — Barrier A</div>
    </div>
    <span class="gate-station-badge">● Online</span>
  </div>

  <!-- Search Input Bar -->
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.6;margin-bottom:4px">
    Search Patient by MRN, Phone #, or Exit PIN
  </div>
  <div class="gate-search-bar">
    <input type="text" class="gate-search-input" id="inp-gate-search" placeholder="e.g. LAG-4401, 08031234567, EXIT-7749" value="${s.gateSearchQuery}">
    <button class="btn btn-primary" id="btn-gate-search-submit" style="padding:0 16px">🔍 Search</button>
  </div>

  <!-- Quick Demo Search Chips -->
  <div class="gate-preset-chips">
    <button class="gate-chip cleared" data-gate-set="LAG-4401">Jay Umar (LAG-4401) · Cleared ✓</button>
    <button class="gate-chip cleared" data-gate-set="08059918234">Emeka Obi (Phone) · Cleared ✓</button>
    <button class="gate-chip hold" data-gate-set="LAG-9920">Aisha Bello (LAG-9920) · Unsettled ⛔</button>
  </div>

  ${s.gateBarrierOpened ? `
    <!-- Barrier Open Animation Banner -->
    <div class="barrier-open-banner">
      <div style="font-size:28px;margin-bottom:6px">🚧 🟢</div>
      <div>BOOM BARRIER RAISED — VEHICLE / PATIENT EXITED</div>
      <div style="font-size:12px;font-weight:400;opacity:.9;margin-top:4px">Audit log: Gate #01 · Exit confirmed at ${timeNow()} · Officer #SG-104</div>
      <button class="btn btn-secondary mt-3" id="btn-gate-reset-station" style="background:#fff;color:#1e7e48;font-size:12px;font-weight:700">
        ↻ Reset Station for Next Exit
      </button>
    </div>
  ` : ''}

  ${!s.gateBarrierOpened && isCleared ? `
    <!-- Patient Cleared Screen -->
    <div class="gate-status-cleared">
      <div style="width:54px;height:54px;border-radius:50%;background:#28a745;color:#fff;font-size:30px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px">✓</div>
      <div class="gate-alert-banner" style="color:#1e7e48">CLEARED FOR EXIT — PERMIT PASS</div>
      <div style="font-size:12px;color:#1e7e48;margin-top:2px">All clinical units, pharmacy & cashier have certified zero balance.</div>

      <div class="card mt-3" style="text-align:left;background:#fff;padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:16px;font-weight:700">${isJay ? 'Jay Umar' : 'Emeka Obi'}</div>
            <div style="font-size:12px;opacity:.7">MRN: <strong>${isJay ? 'LAG-4401' : 'LAG-2091'}</strong> · Phone: ${isJay ? '+234 803 123 4567' : '+234 805 991 8234'}</div>
          </div>
          <span class="badge-hmo" style="background:#eafaf1;color:#1e7e48;border-color:#b7eed0">PASS ACTIVE</span>
        </div>

        <div class="divider-line" style="margin:8px 0"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
          <div><strong>Ward:</strong> ${isJay ? 'Male Surgical 3B, Bed 12' : 'Cardiology Ward 2, Bed 05'}</div>
          <div><strong>Doctor:</strong> ${isJay ? 'Dr. F. Adeleke (Surg)' : 'Dr. B. Adeyemi'}</div>
          <div><strong>HMO:</strong> ${isJay ? 'Hygeia HMO (Paid)' : 'AXA Mansard (Paid)'}</div>
          <div><strong>Self-Pay:</strong> ₦0.00 Outstanding</div>
        </div>

        <div class="divider-line" style="margin:8px 0"></div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:10px;text-transform:uppercase;opacity:.6">Verified Exit PIN:</div>
            <div class="gate-pass-num" style="font-size:16px;color:#1e7e48">${isJay ? 'EXIT-7749' : 'EXIT-3301'}</div>
          </div>
          <button class="btn btn-secondary" id="btn-gate-view-paper-slip" style="font-size:11px">
            🖨️ View Printed Slip
          </button>
        </div>
      </div>

      <!-- Barrier Action Button -->
      <button class="btn btn-primary btn-block mt-3" id="btn-gate-open-barrier" style="background:#28a745;border-color:#28a745;font-size:14px;padding:12px 0">
        🟢 ${t.barrierOpen || 'Authorize & Open Barrier'}
      </button>
    </div>
  ` : ''}

  ${!s.gateBarrierOpened && isAisha ? `
    <!-- Patient Unsettled / Flagged Screen -->
    <div class="gate-status-hold">
      <div style="width:54px;height:54px;border-radius:50%;background:#a00052;color:#fff;font-size:30px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px">⛔</div>
      <div class="gate-alert-banner" style="color:#a00052">HOLD AT GATE — EXIT NOT PERMITTED</div>
      <div style="font-size:12px;color:#a00052;margin-top:2px">Outstanding patient self-pay balance must be reconciled before exit.</div>

      <div class="card mt-3" style="text-align:left;background:#fff;padding:12px">
        <div style="font-size:16px;font-weight:700">Aisha Bello</div>
        <div style="font-size:12px;opacity:.7">MRN: <strong>LAG-9920</strong> · Phone: +234 803 999 9999</div>
        <div style="font-size:12px;opacity:.7">Ward: Female Medical Ward 1 · Bed 08</div>

        <div class="divider-line" style="margin:8px 0"></div>
        <div class="banner err" style="margin:6px 0">
          <strong>Unpaid Balance: ₦15,000 (Patient Self-Pay)</strong>
          <div style="margin-top:2px">Pharmacy IV Ceftriaxone & Dressing pack unsettled at Billing Desk.</div>
        </div>

        <div style="font-size:11px;line-height:1.4;margin-top:6px;opacity:.8">
          <strong>Protocol for Guard:</strong><br>
          1. Direct patient/escort to Cashier Desk (Room 102).<br>
          2. Patient can pay immediately via WelliPay USSD (*737*...) or Card POS.<br>
          3. Do not open vehicle gate without clearance.
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-secondary" id="btn-gate-call-cashier" style="flex:1;font-size:11px">
          📞 Call Cashier Desk
        </button>
        <button class="btn btn-ghost" id="btn-gate-override" style="flex:1;font-size:11px;color:#a00052;border:1px solid #f5b7c7">
          ⚠️ ${t.matronOverride || 'Matron Medical Override'}
        </button>
      </div>
    </div>
  ` : ''}

  ${!s.gateBarrierOpened && notFound ? `
    <!-- Record Not Found Screen -->
    <div class="card" style="text-align:center;padding:24px 16px">
      <div style="font-size:32px;margin-bottom:8px">🔍</div>
      <div style="font-size:16px;font-weight:700">No Patient Record Found</div>
      <div style="font-size:12px;opacity:.7;margin-top:4px">
        No active discharge pass found for "<strong>${s.gateSearchQuery}</strong>".<br>
        Check the Hospital MRN, phone number, or scan the QR code on the patient's paper thermal slip.
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:center">
        <button class="btn btn-primary" data-gate-set="LAG-4401" style="font-size:12px">Load Jay Umar (LAG-4401)</button>
      </div>
    </div>
  ` : ''}

  <!-- Guard Instructions -->
  <div class="card mt-3" style="background:var(--color-bg);font-size:11px;line-height:1.4">
    <strong>Security Guard Standard Operating Procedure (SOP):</strong>
    <ul style="margin:4px 0 0 16px;padding:0">
      <li>If patient phone is dead, ask for physical 80mm thermal slip or MRN number.</li>
      <li>Exit code must match terminal validation code before barrier is unlocked.</li>
      <li>For ambulance/urgent medical emergencies, contact Chief Security Officer.</li>
    </ul>
  </div>

  ${this._renderThermalSlipModal()}
</div>`;
  }

  /* ── S56: HealthSave Smart Ajo / Micro-Savings Pots ─────── */
  _scrHealthSave() {
    const t = this.t; const s = this.state;
    const totalSaved = s.healthSavePots.reduce((acc, p) => acc + p.currentAmount, 0);

    return `
<div class="scr-top">
  <button class="scr-back" id="btn-back">←</button>
  <h1 class="scr-title">${t.healthSaveTitle}</h1>
</div>
<div class="scr-body">
  <!-- Total Savings Hero Card -->
  <div class="card mb-3" style="background:linear-gradient(135deg, #004961 0%, #006786 100%);color:#fff">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.8">${t.totalHealthSavings}</div>
    <div class="amount-lg mt-1" style="color:#fff">${NAIRA(totalSaved)}</div>
    <div style="font-size:12px;opacity:.9;margin-top:2px">Yielding up to 12.0% annual compound interest for hospital emergencies.</div>
    <div class="banner info mt-3" style="background:rgba(255,255,255,0.15);color:#fff;border:none;padding:8px 12px">
      <span>🔄 ${t.roundupActive}: Spare change automatically rounds to nearest ₦500.</span>
    </div>
  </div>

  <!-- Pots List -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 8px">
    <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.5">Active Health Pots (${s.healthSavePots.length})</div>
    <button class="btn btn-ghost" id="btn-add-pot" style="font-size:12px;color:var(--color-accent-700)">${t.createPot}</button>
  </div>

  ${s.healthSavePots.map(pot => {
    const pct = Math.min(100, Math.round((pot.currentAmount / pot.targetAmount) * 100));
    return `
    <div class="pot-card">
      <span class="pot-tag">${pot.category}</span>
      <div style="font-size:15px;font-weight:600;padding-right:70px">${pot.title}</div>
      <div class="pot-yield mt-1">📈 ${pot.interestYieldAnnual}% Annual Yield</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:10px">
        <div class="amount-md">${NAIRA(pot.currentAmount)}</div>
        <div style="font-size:12px;opacity:.6">Target: ${NAIRA(pot.targetAmount)} (${pct}%)</div>
      </div>
      <div class="progress-track mt-2">
        <div class="progress-fill" style="width:${pct}%;background:var(--color-accent-600)"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
        <div style="font-size:11px;opacity:.65">Auto-deduct: ₦${pot.monthlyContribution.toLocaleString()}/mo</div>
        <button class="btn btn-primary" data-pot-quick-fund="${pot.id}" style="font-size:11px;padding:4px 10px">${t.quickAddFunds}</button>
      </div>
    </div>`;
  }).join('')}
</div>`;
  }

  /* ── S58: HMO Policies & WelliPay Reconcile ──────────────── */
  _scrHmoManager() {
    const t = this.t; const s = this.state;

    return `
<div class="scr-top">
  <button class="scr-back" id="btn-back">←</button>
  <h1 class="scr-title">${t.hmoTitle}</h1>
</div>
<div class="scr-body">
  <!-- Active HMO Policies -->
  <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin-bottom:8px">Active Insurance Coverage</div>
  ${s.hmoPolicies.map(hmo => {
    const pct = Math.round((hmo.usedAmount / hmo.annualLimit) * 100);
    return `
    <div class="card mb-3">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:15px;font-weight:600">${hmo.provider}</div>
          <div style="font-size:12px;opacity:.7">${hmo.planTier} · ${hmo.policyNo}</div>
        </div>
        <span class="badge-cleared">Active</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:12px">
        <span>Annual Limit: ${NAIRA(hmo.annualLimit)}</span>
        <span>Co-Pay: <strong>${hmo.coPayPercent}%</strong></span>
      </div>
      <div class="progress-track mt-2">
        <div class="progress-fill" style="width:${pct}%;background:var(--color-accent-700)"></div>
      </div>
      <div style="font-size:11px;opacity:.6;margin-top:4px">Used: ${NAIRA(hmo.usedAmount)} (${pct}%) · Valid until ${hmo.expiryDate}</div>
    </div>`;
  }).join('')}

  <!-- Pre-Authorizations -->
  <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin:16px 0 8px">${t.preAuths}</div>
  ${s.preAuthRequests.map(pa => `
    <div class="card mb-2">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="font-size:14px;font-weight:600">${pa.procedure}</div>
        <span class="badge-cleared">Approved</span>
      </div>
      <div style="font-size:11px;opacity:.6;margin-top:2px">${pa.facility} · Auth: <strong>${pa.approvalCode}</strong></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:8px">
        <span>HMO Covered: <strong>${NAIRA(pa.coveredAmount)}</strong></span>
        <span>Patient PSP: <strong>${NAIRA(pa.patientPortion)}</strong></span>
      </div>
      <div style="font-size:11px;opacity:.7;margin-top:4px;font-style:italic">"${pa.notes}"</div>
    </div>
  `).join('')}
</div>`;
  }

  /* ── S60: Hospital Facility Directory ───────────────────── */
  _scrFacilities() {
    const t = this.t; const s = this.state;
    const q = (s.facilitiesSearch || '').toLowerCase();
    const list = s.facilities.filter(f => f.name.toLowerCase().includes(q) || f.address.toLowerCase().includes(q));

    return `
<div class="scr-top">
  <button class="scr-back" id="btn-back">←</button>
  <h1 class="scr-title">${t.facilitiesTitle}</h1>
</div>
<div class="scr-body">
  <div class="field mb-3">
    <input class="input" id="inp-facility-search" placeholder="Search hospital name or area..." value="${s.facilitiesSearch||''}">
  </div>

  ${list.map(fac => `
    <div class="card mb-3">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:15px;font-weight:600">${fac.name}</div>
          <div style="font-size:12px;opacity:.7">${fac.address}, ${fac.state}</div>
        </div>
        ${fac.welliRecordIntegrated ? `<span class="badge-hmo">⚡ WelliRecord</span>` : ''}
      </div>
      <div style="font-size:11px;opacity:.8;margin-top:6px">
        Accepted HMOs: <strong>${fac.acceptedHmos.join(', ')}</strong>
      </div>
      <div class="divider-line"></div>
      <div style="display:flex;gap:8px">
        <a href="tel:${fac.phone}" class="btn btn-secondary" style="flex:1;font-size:11px;text-align:center;text-decoration:none">📞 Call</a>
        <a href="tel:${fac.emergency}" class="btn btn-primary" style="flex:1;font-size:11px;text-align:center;text-decoration:none;background:var(--color-accent-2-700)">🚨 Emergency</a>
      </div>
    </div>
  `).join('')}
</div>`;
  }

  /* ── Tab bar helper ────────────────────────────────────── */
  _htmlTabbar(active) {
    const t = this.t;
    const tabs = [
      { key:'home',    label:t.tabHome,     go:'home',    icon:'<path d="M218.83,103.77l-80-75.6a12,12,0,0,0-16.3,0l-80,75.6A20,20,0,0,0,36,118.91V208a20,20,0,0,0,20,20H100a12,12,0,0,0,12-12V168h32v48a12,12,0,0,0,12,12h44a20,20,0,0,0,20-20V118.91A20,20,0,0,0,218.83,103.77Z"/>' },
      { key:'bills',   label:t.tabBills,    go:'bills',   icon:'<path d="M200,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.42,6.67L96,213.2l27.58,17.47a8,8,0,0,0,8.84,0L160,213.2l27.58,17.47A8,8,0,0,0,200,224V48A16,16,0,0,0,200,32ZM160,144H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Zm0-32H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Z"/>' },
      { key:'wallet',  label:t.tabWallet,   go:'wallet',  icon:'<path d="M216,64H72a8,8,0,1,1,0-16H192a8,8,0,0,0,0-16H72A24,24,0,0,0,48,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm-40,88a12,12,0,1,1,12-12A12,12,0,0,1,176,152Z"/>' },
      { key:'insights',label:t.tabInsights, go:'insights',icon:'<path d="M224,200h-8V40a8,8,0,0,0-8-8H160a8,8,0,0,0-8,8V80H96a8,8,0,0,0-8,8v40H40a8,8,0,0,0-8,8v64H24a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16Z"/>' },
      { key:'history', label:t.tabPay,      go:'history', icon:'<path d="M128,24A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V88a8,8,0,0,1,16,0v32h48A8,8,0,0,1,192,128Z"/>' },
      { key:'profile', label:t.tabProfile,  go:'profile2',icon:'<path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.8,40.31,185.68,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8Z"/>' },
    ];
    return `<div class="tabbar">${tabs.map(tab=>`
      <button class="tabbar-item ${tab.key===active?'active':''}" data-goto="${tab.go}">
        <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor">${tab.icon}</svg>
        ${tab.label}
      </button>`).join('')}</div>`;
  }

  /* ── Keypad helper ─────────────────────────────────────── */
  _htmlKeypad(context) {
    const keys = [1,2,3,4,5,6,7,8,9,'',0,'⌫'];
    return `<div class="keypad mt-3">
      ${keys.map(k=>`<button class="keypad-key ${k===''?'empty':''}" data-keypad="${context}" data-key="${k}">${k}</button>`).join('')}
    </div>`;
  }

  /* ──────────────────────────────────────────────────────────
     EVENT BINDING
  ──────────────────────────────────────────────────────────*/
  _bind() {
    const on = (id, ev, fn) => { const el = document.getElementById(id); if(el) el.addEventListener(ev, fn); };
    const onAll = (sel, ev, fn) => document.querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn));

    // Rail navigation
    onAll('[data-goto]', 'click', e => {
      const target = e.currentTarget.dataset.goto;
      if (target === 'home') { this.state.prevScreens = []; this.state.screen = 'home'; this._clearTimers(); this._render(); return; }
      this.go(target);
    });

    on('btn-restart', 'click', () => { this.state = this._initState(); this._clearTimers(); this._render(); });
    on('btn-lang', 'click', () => { this.state.lang = this.state.lang === 'en' ? 'pcm' : 'en'; this._render(); });
    on('btn-toggle-safe-area', 'click', () => { this.state.showSafeArea = !this.state.showSafeArea; this._render(); });

    const s = this.state;

    // Welcome
    on('btn-lang-en',  'click', () => { s.lang='en';  this._render(); });
    on('btn-lang-pcm', 'click', () => { s.lang='pcm'; this._render(); });
    on('btn-welcome-start', 'click', () => this.go('phone'));

    // Phone
    on('inp-phone','input', e => { s.phone = e.target.value.replace(/\D/g,'').slice(0,10); s.phoneErr=''; this._render(); });
    on('btn-sendcode','click', () => {
      if (!s.phone || s.phone.length < 10) { s.phoneErr = this.t.phoneError; this._render(); return; }
      this.go('otp');
    });
    on('btn-back','click', () => this.goBack());

    // OTP
    on('btn-otp-good','click', () => { s.otp='123456'; s.otpError=false; this._render(); setTimeout(()=>this.go('profilesetup'),300); });
    on('btn-otp-bad', 'click', () => { s.otp='000000'; s.otpError=true; s.otpTries--; this._render(); });
    on('btn-otp-resend','click', e => { e.preventDefault(); if(s.otpResendCountdown>0)return; s.otpResendCountdown=30; s.otp=''; s.otpError=false; this._startOtpResend(); this._render(); });
    on('btn-change-number','click', e => { e.preventDefault(); this.go('phone'); });

    // Profile setup
    on('inp-profname','input', e => { s.profName = e.target.value; });
    on('btn-profile-continue','click', () => { this.go('applock'); });

    // App lock / PIN
    this._bindKeypad('pin', (key) => {
      if (s.pinMismatch) { s.pinMismatch=false; s.pinEntry=''; }
      if (key==='⌫') { s.pinEntry=s.pinEntry.slice(0,-1); this._render(); return; }
      if (s.pinEntry.length>=4) return;
      s.pinEntry += key;
      this._render();
      if (s.pinEntry.length===4) {
        if (s.pinStage==='set') { s.pinFirst=s.pinEntry; s.pinEntry=''; s.pinStage='confirm'; this._render(); }
        else {
          if (s.pinEntry===s.pinFirst) { s.appPin=s.pinEntry; s.pinEntry=''; s.pinStage='set'; this.go('linkwr'); }
          else { s.pinMismatch=true; s.pinEntry=''; s.pinFirst=''; s.pinStage='set'; this._render(); }
        }
      }
    });
    on('btn-biometric','click', () => { s.bioEnabled=true; this.go('linkwr'); });

    // Link WR
    on('btn-link-now','click', () => {
      s.linkState='loading'; this._render();
      setTimeout(()=>{ s.linkState=Math.random()>0.3?'success':'notfound'; this._render(); },1200);
    });
    on('btn-link-continue','click', () => this.go('walletintro'));
    on('btn-link-skip','click', () => this.go('walletintro'));

    // Wallet intro
    on('btn-create-wallet','click', () => { s.wallets[s.activePerson]=s.wallets[s.activePerson]||0; this.go('home'); });
    on('btn-wallet-skip','click', () => this.go('home'));

    // Home
    on('btn-person-chip','click', () => { s.showPersonSheet=true; this._render(); });
    on('btn-notifs','click', () => this.go('notifs'));
    on('btn-go-wallet','click', () => this.go('wallet'));
    on('btn-addbill','click', () => { s.addBillMode='scan'; s.addBillState='idle'; s.addBillCode=''; s.addBillError=''; this.go('addbill'); });
    // Bill open from home/bills/insights
    onAll('[data-bill-open]','click', e => {
      s.payBillId = e.currentTarget.dataset.billOpen;
      s.showAllLinesForBill = null;
      this.go('billdetail');
    });
    // Bill pay from home
    onAll('[data-bill-pay]','click', e => {
      const billId = e.currentTarget.dataset.billPay;
      s.payBillId = billId; s.payContext='bill'; s.payAmountMode='full'; s.payPartAmount=''; s.payPartError=''; s.payMethodBanner=false;
      this.go('amount');
    });
    // Person sheet
    on('sheet-backdrop','click', () => { s.showPersonSheet=false; this._render(); });
    onAll('[data-person-select]','click', e => { s.activePerson=e.currentTarget.dataset.personSelect; s.showPersonSheet=false; this._render(); });
    on('btn-sheet-adddep','click', () => { s.showPersonSheet=false; s.depName=''; s.depRelation='child'; s.depDob=''; s.depError=''; this.go('adddep'); });

    // Bill filter
    onAll('[data-filter]','click', e => { s.billFilter=e.currentTarget.dataset.filter; this._render(); });

    // Bill detail
    on('btn-show-all-lines','click', () => { s.showAllLinesForBill=s.payBillId; this._render(); });
    on('btn-collapse-lines','click', () => { s.showAllLinesForBill=null; this._render(); });
    on('btn-pay-this-bill','click', () => {
      s.payContext='bill'; s.payAmountMode='full'; s.payPartAmount=''; s.payPartError=''; s.payMethodBanner=false;
      this.go('amount');
    });
    on('btn-view-receipt','click', () => this.go('receipt'));
    on('btn-report','click', () => { s.reportBillId=s.payBillId; s.reportCategory=''; s.reportDesc=''; s.reportSubmitted=false; this.go('report'); });

    // Add bill
    on('btn-enter-code','click', e => { e.preventDefault(); s.addBillMode='manual'; this._render(); });
    on('inp-bill-code','input', e => { s.addBillCode=e.target.value.toUpperCase(); });
    on('btn-demo-valid','click', () => { s.addBillCode='DH-99999'; s.addBillState='idle'; s.addBillError=''; this._render(); });
    on('btn-demo-expired','click', () => { s.addBillCode='EXP-0001'; this._render(); });
    on('btn-demo-already','click', () => { s.addBillCode='DH-88213'; this._render(); });
    on('btn-submit-code','click', () => {
      const code = s.addBillCode.trim();
      if (!code) return;
      if (code.startsWith('EXP')) { s.addBillError = this.t.billExpired; this._render(); return; }
      if (s.bills.some(b=>b.billNo.replace(/-/g,'')===code.replace(/-/g,''))) { s.addBillError=this.t.billAlreadyAdded; this._render(); return; }
      s.addBillState='success'; this._render();
      setTimeout(()=>this.go('bills'),1200);
    });

    // Choose amount
    on('btn-pay-full','click', () => { s.payAmountMode='full'; s.payPartError=''; this._render(); });
    on('btn-pay-part','click', () => { s.payAmountMode='part'; this._render(); });
    on('inp-part-amount','input', e => { s.payPartAmount=e.target.value; s.payPartError=''; });
    on('btn-continue-amount','click', () => {
      const bill = this.selectedBill;
      if (!bill) return;
      if (s.payAmountMode==='part') {
        const amt = parseInt(s.payPartAmount.replace(/[^0-9]/g,''))||0;
        if (amt < (bill.minPart||0)) { s.payPartError=typeof this.t.amountTooLow==='function'?this.t.amountTooLow(NAIRA(bill.minPart)):this.t.amountTooLow; this._render(); return; }
        if (amt > bill.amountDue) { s.payPartError=this.t.amountTooHigh; this._render(); return; }
      }
      this.go('method');
    });

    // Choose method
    on('btn-method-wallet','click', () => { s.payMethod='wallet'; this.go('confirm'); });
    on('btn-method-card','click', () => { s.payMethod='card'; this.go('confirm'); });
    on('btn-method-transfer','click', () => { s.payMethod='transfer'; this.go('confirm'); });

    // Confirm
    on('btn-confirm-start','click', () => { s.confirmSubStage='pinning'; s.confirmPinEntry=''; s.confirmPinError=false; this._render(); });
    on('btn-confirm-cancel','click', () => { s.payMethodBanner=true; this.go('method'); });
    on('btn-confirm-retry','click', () => { s.confirmSubStage='pinning'; s.confirmPinEntry=''; s.confirmPinError=false; this._render(); });
    this._bindKeypad('confirm-pin', (key) => {
      if (key==='⌫') { s.confirmPinEntry=s.confirmPinEntry.slice(0,-1); this._render(); return; }
      if (s.confirmPinEntry.length>=4) return;
      s.confirmPinEntry += key;
      this._render();
      if (s.confirmPinEntry.length===4) {
        if (s.confirmPinEntry===s.appPin) {
          s.confirmSubStage='idle';
          if (s.payMethod==='wallet') { this._finalisePayment(); }
          else if (s.payMethod==='card') { this.go('cardpay'); }
          else if (s.payMethod==='transfer') { this.go('transfer'); }
        } else {
          s.confirmPinError=true; s.confirmPinEntry=''; s.confirmSubStage='failed'; this._render();
        }
      }
    });

    // Card pay
    on('btn-card-cancel','click', () => { s.payMethodBanner=true; this.go('method'); });
    on('btn-card-succeed','click', () => { s.cardStage='checking'; this._render(); setTimeout(()=>this._finalisePayment(),1000); });
    on('btn-card-3ds','click', () => { s.cardStage='checking'; this._render(); setTimeout(()=>{ s.payOutcome='pending'; this.go('status'); },1200); });
    on('btn-card-decline','click', () => { s.cardStage='checking'; this._render(); setTimeout(()=>{ s.payOutcome='failed'; s.payFailReason='declined'; this.go('status'); },800); });

    // Transfer
    on('btn-copy-acct','click', () => { navigator.clipboard?.writeText(s.transferAccountNo).catch(()=>{}); this.showToast(this.t.copiedMsg); });
    on('btn-copy-amt','click', () => { navigator.clipboard?.writeText(String(this.payContextAmount)).catch(()=>{}); this.showToast(this.t.copiedMsg); });
    on('btn-i-paid','click', () => { s.payOutcome='pending'; this.go('status'); });
    on('btn-other-method','click', e => { e.preventDefault(); s.payMethodBanner=true; clearInterval(this._transferTimer); this.go('method'); });
    on('btn-new-account','click', () => { s.transferState='active'; s.transferSecondsLeft=3600; s.transferAccountNo=String(9000000000+Math.floor(Math.random()*999999999)); this._startTransferCountdown(); this._render(); });

    // Status
    on('btn-demo-success','click', () => { this._finalisePayment(); });
    on('btn-demo-review','click', () => { s.payOutcome='review'; this._render(); });
    on('btn-view-receipt','click', () => this.go('receipt'));
    on('btn-go-wallet','click', () => this.go('wallet'));
    on('btn-pay-balance','click', () => { s.payAmountMode='full'; s.payMethodBanner=false; this.go('method'); });
    on('btn-back-bills','click', () => { s.prevScreens=[]; this.go('bills'); });
    on('btn-retry-pay','click', () => { if(s.payMethod==='card') this.go('cardpay'); else if(s.payMethod==='transfer') this.go('transfer'); });
    on('btn-other-method-status','click', () => { s.payMethodBanner=true; this.go('method'); });
    on('btn-contact-support','click', () => this.go('contact'));

    // History
    onAll('[data-hist-filter]','click', e => { s.historyFilter=e.currentTarget.dataset.histFilter; this._render(); });

    // Report
    onAll('[data-report-cat]','click', e => { s.reportCategory=e.currentTarget.dataset.reportCat; this._render(); });
    on('inp-report-desc','input', e => { s.reportDesc=e.target.value; });
    on('btn-submit-report','click', () => { s.reportSubmitted=true; s.reportTicket='RPT-'+uid(); this._render(); });
    on('btn-view-report-detail','click', () => this.go('reportdetail'));
    on('btn-bills-tab','click', () => this.go('bills'));

    // Wallet
    on('btn-topup','click', () => { s.payContext='topup'; s.topupPresetIdx=null; s.topupCustom=''; this.go('topup'); });
    on('btn-toggle-autopay','click', () => { s.walletAutoPay[s.activePerson]=!s.walletAutoPay[s.activePerson]; this._render(); });
    on('btn-run-autopay','click', () => {
      const bill = this.activeBills.find(b=>['unpaid','overdue'].includes(b.status)&&b.amountDue<=this.activeWallet);
      if (bill) {
        s.wallets[s.activePerson]-=bill.amountDue;
        s.walletTxns.unshift({id:'wt'+Date.now(),personId:s.activePerson,label:'Auto-pay: '+bill.facility,amount:bill.amountDue,date:fmtDate(new Date()),sign:-1});
        bill.amountDue=0; bill.status='paid';
        this.showToast(typeof this.t.autoPayRanMsg==='function'?this.t.autoPayRanMsg(bill.amountTotal):this.t.autoPayRanMsg);
      }
    });

    // Top up
    onAll('[data-preset]','click', e => { s.topupPresetIdx=parseInt(e.currentTarget.dataset.preset); s.topupCustom=''; this._render(); });
    on('inp-topup-custom','input', e => { s.topupCustom=e.target.value; s.topupPresetIdx=null; });
    on('btn-topup-continue','click', () => {
      const amt = this.payTopupAmount;
      if (amt < 500) { this.showToast('Minimum ₦500'); return; }
      s.payMethod='card'; s.confirmSubStage='idle';
      this.go('method');
    });

    // Insights
    on('btn-scope-me','click', () => { s.insightScope='me'; this._render(); });
    on('btn-scope-family','click', () => { s.insightScope='family'; this._render(); });
    on('btn-manage-reminders','click', e => { e.preventDefault(); this.go('notifprefs'); });
    on('btn-contribute-savings','click', () => { s.payContext='savings'; s.topupPresetIdx=null; s.topupCustom=''; this.go('topup'); });
    onAll('[data-pay-installment]','click', e => {
      const planId=e.currentTarget.dataset.payInstallment;
      s.payBillId=planId; s.payContext='installment'; s.payMethod='card'; s.confirmSubStage='idle'; s.payMethodBanner=false;
      this.go('method');
    });

    // People
    on('btn-profile-tab','click', () => this.go('profile2'));
    on('btn-adddep','click', () => { s.depName=''; s.depRelation='child'; s.depDob=''; s.depError=''; this.go('adddep'); });
    onAll('[data-dep-rel]','click', e => { s.depRelation=e.currentTarget.dataset.depRel; this._render(); });
    on('btn-dep-save','click', () => {
      const name=(document.getElementById('inp-dep-name')||{}).value||(s.depName||'');
      if(!name.trim()){s.depError=this.t.depNameRequired;this._render();return;}
      const newId='dep'+Date.now();
      const relLabels={child:'Child',spouse:'Spouse',parent:'Parent',other:'Other'};
      s.people.push({id:newId,name:name.trim(),relation:relLabels[s.depRelation]||'Other',relationKey:s.depRelation});
      s.wallets[newId]=0; s.walletAutoPay[newId]=false;
      s.depName=''; this.go('people');
    });

    // Profile hub
    const settingsTargets=['people','security','privacy','notifprefs','language','help','contact','legal'];
    onAll('[data-settings]','click', e => this.go(e.currentTarget.dataset.settings));
    on('btn-delete-account','click', () => { s.deleteStage='idle'; this.go('deleteaccount'); });
    on('btn-logout','click', () => { this.state=this._initState(); this._clearTimers(); this._render(); });

    // Security
    on('btn-toggle-bio','click', () => { s.bioEnabled=!s.bioEnabled; this._render(); });

    // Privacy
    on('btn-toggle-hmo','click', () => { s.hmoShare=!s.hmoShare; this._render(); });
    on('btn-toggle-marketing','click', () => { s.marketing=!s.marketing; this._render(); });

    // Notif prefs
    on('btn-toggle-notif-bills','click', () => { s.notifBills=!s.notifBills; this._render(); });
    on('btn-toggle-notif-receipts','click', () => { s.notifReceipts=!s.notifReceipts; this._render(); });
    on('btn-toggle-notif-promo','click', () => { s.notifPromo=!s.notifPromo; this._render(); });

    // Language screen
    on('btn-lang-en','click', () => { s.lang='en'; this._render(); });
    on('btn-lang-pcm','click', () => { s.lang='pcm'; this._render(); });

    // Help
    on('btn-contact','click', e => { e.preventDefault(); this.go('contact'); });

    // Delete account
    on('btn-delete-confirm','click', () => { s.deleteStage='confirming'; this._render(); });
    on('btn-delete-final','click', () => { s.deleteStage='done'; this._render(); setTimeout(()=>{this.state=this._initState();this._clearTimers();this._render();},2500); });
    on('btn-delete-cancel','click', () => { this.go('profile2'); });

    // ── NEW MODULE HANDLERS ─────────────────────────────────

    // Home shortcuts
    on('btn-home-wellipass', 'click', () => this.go('wellipass'));

    // Bill detail shortcuts
    on('btn-bill-goto-episode', 'click', () => this.go('episodetimeline'));
    on('btn-bill-goto-familypay', 'click', () => this.go('familypay'));
    on('btn-bill-goto-rx', 'click', () => this.go('rxpharmacy'));
    on('btn-bill-goto-wellipass', 'click', () => this.go('wellipass'));

    // Episode timeline
    on('btn-pay-episode-due', 'click', () => {
      s.payBillId = 'b1'; s.payContext = 'bill'; s.payAmountMode = 'full'; this.go('method');
    });
    on('btn-flag-dispute', 'click', () => {
      s.toastMsg = this.t.disputeSubmitted; this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
    });

    // FamilyPay
    on('btn-copy-family-link', 'click', () => {
      const req = s.familyPayList.find(f => f.id === s.activeFamilyPayId) || s.familyPayList[0];
      if (navigator.clipboard) navigator.clipboard.writeText(req.webLinkUrl);
      s.toastMsg = 'Link copied to clipboard!'; this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 2500);
    });
    on('btn-share-family-whatsapp', 'click', () => {
      const req = s.familyPayList.find(f => f.id === s.activeFamilyPayId) || s.familyPayList[0];
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Please support Amina Bello hospital bill on WelliPay: ' + req.webLinkUrl)}`, '_blank');
    });
    onAll('[data-fx-curr]', 'click', e => {
      s.familyFxCurrency = e.currentTarget.dataset.fxCurr; this._render();
    });
    on('btn-contribute-family-pool', 'click', () => {
      const req = s.familyPayList.find(f => f.id === s.activeFamilyPayId) || s.familyPayList[0];
      req.poolCollectedNgn += 5000;
      req.contributors.unshift({ id:'c'+Date.now(), name:'Jay Umar', relation:'Family Sponsor', amountNgn:5000, currency:'NGN', foreignAmount:5000, date:'Just now', message:'Instant family contribution via WelliPay' });
      s.toastMsg = '₦5,000 contribution added to pool!'; this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 2500);
    });

    // WelliPass
    on('btn-wellipass-view-pass', 'click', () => { s.welliPassView = 'pass'; this._render(); });
    on('btn-wellipass-view-sec', 'click', () => { s.welliPassView = 'security'; this._render(); });
    on('btn-toggle-wellipass-status', 'click', () => {
      const p = s.welliPassList.find(w => w.id === s.activeWelliPassId) || s.welliPassList[0];
      p.pspReconciled.cleared = !p.pspReconciled.cleared;
      p.overallStatus = p.pspReconciled.cleared ? 'cleared' : 'pending';
      this._render();
    });
    on('btn-wellipass-pay-now', 'click', () => {
      s.payBillId = 'b2'; s.payContext = 'bill'; s.payAmountMode = 'full'; this.go('method');
    });
    on('btn-wellipass-see-cashier', 'click', () => this.go('patientdesk'));
    on('btn-wellipass-notify', 'click', () => {
      s.toastMsg = this.t.notificationsSent; this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
    });
    on('btn-wellipass-gate-approve', 'click', () => {
      s.toastMsg = 'Exit gate pass validated. Safe travels!'; this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
    });
    // WelliPass Offline Fallback & Thermal Slip
    on('btn-toggle-fallback-drawer', 'click', () => {
      s.welliPassFallbackOpen = !s.welliPassFallbackOpen; this._render();
    });
    on('btn-wp-view-thermal-slip', 'click', () => {
      s.thermalSlipModal = {
        hospitalName: 'LAGOON HOSPITALS IKOYI',
        patientName: 'Jay Umar',
        mrn: 'LAG-4401',
        patientPhone: '+234 803 123 4567',
        ward: 'Male Surgical 3B, Bed 12',
        doctorName: 'Dr. F. Adeleke',
        date: '24-SEP-2026 14:30 WAT',
        totalAmount: 75000,
        hmoApproved: 55000,
        pspPaid: 20000,
        exitPin: 'EXIT-7749',
        passCode: 'WP-PASS-LAG-2026-4401'
      };
      this._render();
    });
    on('btn-wp-resend-sms', 'click', () => {
      s.toastMsg = 'Toll-free SMS dispatched to Patient & Next-of-Kin (Exit Code: EXIT-7749)!'; this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
    });
    on('btn-wp-open-guard-terminal', 'click', () => {
      s.gateSearchQuery = 'LAG-4401'; s.gateBarrierOpened = false; this.go('gatesecurity');
    });
    on('btn-close-thermal-slip', 'click', () => {
      s.thermalSlipModal = null; this._render();
    });
    on('btn-simulate-pos-print', 'click', () => {
      s.toastMsg = '🖨️ Printing 80mm thermal slip to POS Terminal #WP-882...'; this._render();
      setTimeout(() => {
        s.thermalSlipModal = null;
        s.toastMsg = 'Thermal slip printed successfully!'; this._render();
        setTimeout(() => { s.toastMsg = ''; this._render(); }, 2500);
      }, 1400);
    });

    // Rx Pharmacy
    onAll('[data-rx-id]', 'click', e => {
      const id = e.currentTarget.dataset.rxId;
      const opt = e.currentTarget.dataset.rxOpt;
      const rx = s.rxOrders.find(r => r.id === s.activeRxOrderId) || s.rxOrders[0];
      const it = rx.items.find(x => x.id === id);
      if (it) { it.selectedOption = opt; this._render(); }
    });
    on('btn-rx-apply-all-generics', 'click', () => {
      const rx = s.rxOrders.find(r => r.id === s.activeRxOrderId) || s.rxOrders[0];
      rx.items.forEach(it => it.selectedOption = 'generic');
      s.toastMsg = 'All medications updated to bioequivalent generics!'; this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
    });
    on('btn-rx-send-dispensary', 'click', () => {
      s.toastMsg = this.t.dispensarySent; this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
    });

    // Offline USSD
    onAll('[data-ussd-dial]', 'click', e => {
      const dial = e.currentTarget.dataset.ussdDial;
      s.ussdActiveSim = { title: 'WelliPay Hospital Checkout', prompt: `Paying Dovers Hospitals ₦20,000 for Bill DH-88213\nDial: ${dial}` };
      this._render();
    });
    onAll('[data-ussd-copy]', 'click', e => {
      const code = e.currentTarget.dataset.ussdCopy;
      if (navigator.clipboard) navigator.clipboard.writeText(code);
      s.toastMsg = 'USSD code copied: ' + code; this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 2500);
    });
    on('btn-ussd-cancel', 'click', () => { s.ussdActiveSim = null; this._render(); });
    on('btn-ussd-send', 'click', () => {
      s.ussdActiveSim = null;
      s.toastMsg = 'USSD Payment Request Submitted! SMS receipt arriving shortly.';
      this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3500);
    });

    // Provider Desk & Patient Desk
    on('btn-toggle-desk-cashier', 'click', () => { s.deskMode = 'cashier'; this._render(); });
    on('btn-toggle-desk-patient', 'click', () => { s.deskMode = 'patient'; this._render(); });
    on('btn-goto-patient-ticket', 'click', () => this.go('patientdesk'));
    on('btn-goto-staff-desk', 'click', () => this.go('providerdesk'));
    on('btn-desk-ticket-go-wp', 'click', () => this.go('wellipass'));
    onAll('[data-desk-tab]', 'click', e => {
      s.deskFilterTab = e.currentTarget.dataset.deskTab; this._render();
    });
    on('inp-desk-search', 'input', e => {
      s.deskSearchQuery = e.target.value;
      this._render();
      const inp = document.getElementById('inp-desk-search');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    });
    onAll('.btn-desk-action-modal', 'click', e => {
      e.stopPropagation();
      const qid = e.currentTarget.dataset.deskAction;
      const item = s.providerDesk.liveQueue.find(q => q.id === qid);
      if (item) { s.deskPatientActionModal = { ...item }; this._render(); }
    });
    on('btn-close-desk-action', 'click', () => { s.deskPatientActionModal = null; this._render(); });
    on('btn-settle-cash', 'click', () => {
      const pat = s.deskPatientActionModal;
      if (pat) {
        const qItem = s.providerDesk.liveQueue.find(q => q.id === pat.id);
        const amt = qItem ? qItem.pspAmount : pat.pspAmount;
        if (qItem) {
          s.providerDesk.shift.cashInTill += amt;
          s.providerDesk.todaysStats.pspCollected += amt;
          qItem.pspAmount = 0;
          qItem.status = 'cleared';
          pat.pspAmount = 0;
          pat.status = 'cleared';
        }
        s.toastMsg = `💵 ${NAIRA(amt)} Cash received into cashier till! Patient cleared for exit.`;
        this._render();
        setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
      }
    });
    on('btn-settle-pos', 'click', () => {
      const pat = s.deskPatientActionModal;
      if (pat) {
        const qItem = s.providerDesk.liveQueue.find(q => q.id === pat.id);
        const amt = qItem ? qItem.pspAmount : pat.pspAmount;
        if (qItem) {
          s.providerDesk.shift.posCollected += amt;
          s.providerDesk.todaysStats.pspCollected += amt;
          qItem.pspAmount = 0;
          qItem.status = 'cleared';
          pat.pspAmount = 0;
          pat.status = 'cleared';
        }
        s.toastMsg = `💳 POS Card Payment Approved (${NAIRA(amt)})! Merchant slip printed.`;
        this._render();
        setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
      }
    });
    on('btn-settle-ussd', 'click', () => {
      const pat = s.deskPatientActionModal;
      s.toastMsg = `📲 Interactive USSD prompt (*737*...) pushed to ${pat ? pat.phone : 'patient phone'}!`;
      this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
    });
    on('btn-settle-whatsapp', 'click', () => {
      s.toastMsg = '🔗 WhatsApp payment link copied and dispatched to Next-of-Kin!';
      this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
    });
    on('btn-desk-issue-wellipass', 'click', () => {
      s.deskPatientActionModal = null;
      this.go('wellipass');
    });
    on('btn-desk-eod-report', 'click', () => { s.deskEodReportModal = true; this._render(); });
    on('btn-close-eod-report', 'click', () => { s.deskEodReportModal = false; this._render(); });
    on('btn-close-eod-report-btn', 'click', () => { s.deskEodReportModal = false; this._render(); });
    on('btn-desk-print-eod', 'click', () => {
      s.toastMsg = '🖨️ Printing Shift #4 End-of-Day Reconciliation Report to POS Terminal...';
      this._render();
      setTimeout(() => {
        s.deskEodReportModal = false;
        s.toastMsg = 'Shift report printed successfully!';
        this._render();
        setTimeout(() => { s.toastMsg = ''; this._render(); }, 2500);
      }, 1500);
    });

    // Patient Desk Ticket Actions
    on('btn-desk-request-bedside', 'click', () => {
      s.deskBedsideRequested = !s.deskBedsideRequested;
      const jay = s.providerDesk.liveQueue.find(q => q.welliRecordId === 'LAG-4401');
      if (jay) jay.bedsideRequested = s.deskBedsideRequested;
      s.toastMsg = s.deskBedsideRequested
        ? '🛏️ Bedside settlement requested! Cashier Counter #04 notified for Ward 3B.'
        : 'Bedside request cancelled.';
      this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
    });
    on('btn-desk-patient-pay-now', 'click', () => {
      s.payBillId = 'b1'; s.payContext = 'bill'; s.payAmountMode = 'full'; this.go('method');
    });
    on('btn-desk-patient-familypay', 'click', () => this.go('familypay'));
    on('btn-desk-patient-ussd', 'click', () => this.go('offlineussd'));
    on('btn-desk-patient-view-wp', 'click', () => this.go('wellipass'));
    on('btn-desk-call-counter', 'click', () => {
      s.toastMsg = 'Calling Cashier Counter #04 (+234 1 271 5002)...';
      this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 2500);
    });
    on('btn-desk-chat-counter', 'click', () => {
      s.toastMsg = 'Opening WhatsApp chat with Sister Chinyere Eze...';
      this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 2500);
    });

    on('btn-provider-scan-qr', 'click', () => {
      s.providerInvoiceModal = s.providerDesk.sampleInvoices[0]; this._render();
    });
    on('btn-close-invoice-modal', 'click', () => { s.providerInvoiceModal = null; this._render(); });
    on('btn-invoice-confirm-clear', 'click', () => {
      s.providerInvoiceModal = null;
      this.go('wellipass');
    });
    on('btn-invoice-send-alert', 'click', () => {
      s.toastMsg = 'WhatsApp & Email invoice notifications dispatched!'; this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
    });
    // Provider Desk Slip & SMS
    on('btn-provider-go-guard', 'click', () => {
      s.gateSearchQuery = 'LAG-4401'; s.gateBarrierOpened = false; this.go('gatesecurity');
    });
    onAll('.btn-print-slip', 'click', e => {
      e.stopPropagation();
      const qid = e.currentTarget.dataset.queueId;
      const item = s.providerDesk.liveQueue.find(q => q.id === qid) || s.providerDesk.liveQueue[0];
      s.thermalSlipModal = {
        hospitalName: s.providerDesk.facilityName,
        patientName: item.patientName,
        mrn: item.welliRecordId,
        patientPhone: item.phone || '+234 803 123 4567',
        ward: item.ward || 'Ward 3B, Bed 12',
        doctorName: item.doctorSignoff ? item.doctorSignoff.replace(/\(.*\)/, '') : 'Dr. F. Adeleke',
        date: '24-SEP-2026 14:30 WAT',
        totalAmount: item.totalAmount,
        hmoApproved: item.hmoApproved,
        pspPaid: item.pspAmount,
        exitPin: 'EXIT-7749',
        passCode: 'WP-PASS-LAG-2026-4401'
      };
      this._render();
    });
    onAll('.btn-resend-nok-sms', 'click', e => {
      e.stopPropagation();
      const qid = e.currentTarget.dataset.queueId;
      const item = s.providerDesk.liveQueue.find(q => q.id === qid) || s.providerDesk.liveQueue[0];
      s.toastMsg = `Toll-free SMS dispatched to ${item.patientName} & Next-of-Kin (Exit PIN: EXIT-7749)!`;
      this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
    });
    on('btn-invoice-print-slip', 'click', () => {
      const inv = s.providerInvoiceModal;
      if (inv) {
        s.thermalSlipModal = {
          hospitalName: s.providerDesk.facilityName,
          patientName: inv.patientName,
          mrn: inv.code,
          patientPhone: '+234 803 123 4567',
          ward: 'Ward 3B',
          doctorName: 'Dr. F. Adeleke',
          date: '24-SEP-2026 14:30 WAT',
          totalAmount: inv.amount,
          hmoApproved: inv.hmoApproved,
          pspPaid: inv.pspDue,
          exitPin: 'EXIT-7749',
          passCode: 'WP-PASS-LAG-2026-4401'
        };
        this._render();
      }
    });
    on('btn-invoice-resend-sms', 'click', () => {
      s.toastMsg = 'Toll-free SMS token dispatched to registered Next-of-Kin!';
      this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
    });

    // Gate Security Terminal (S59)
    on('btn-gate-switch-to-wp', 'click', () => this.go('wellipass'));
    on('btn-gate-search-submit', 'click', () => {
      const inp = document.getElementById('inp-gate-search');
      if (inp) s.gateSearchQuery = inp.value;
      s.gateBarrierOpened = false;
      this._render();
    });
    on('inp-gate-search', 'keydown', e => {
      if (e.key === 'Enter') {
        s.gateSearchQuery = e.target.value;
        s.gateBarrierOpened = false;
        this._render();
      }
    });
    onAll('[data-gate-set]', 'click', e => {
      s.gateSearchQuery = e.currentTarget.dataset.gateSet;
      s.gateBarrierOpened = false;
      this._render();
    });
    on('btn-gate-open-barrier', 'click', () => {
      s.gateBarrierOpened = true;
      this._render();
    });
    on('btn-gate-reset-station', 'click', () => {
      s.gateBarrierOpened = false;
      s.gateSearchQuery = 'LAG-4401';
      this._render();
    });
    on('btn-gate-view-paper-slip', 'click', () => {
      s.thermalSlipModal = {
        hospitalName: 'LAGOON HOSPITALS IKOYI',
        patientName: 'Jay Umar',
        mrn: 'LAG-4401',
        patientPhone: '+234 803 123 4567',
        ward: 'Male Surgical 3B, Bed 12',
        doctorName: 'Dr. F. Adeleke',
        date: '24-SEP-2026 14:30 WAT',
        totalAmount: 75000,
        hmoApproved: 55000,
        pspPaid: 20000,
        exitPin: 'EXIT-7749',
        passCode: 'WP-PASS-LAG-2026-4401'
      };
      this._render();
    });
    on('btn-gate-call-cashier', 'click', () => {
      s.toastMsg = 'Connecting to Cashier Desk (+234 1 271 5000)...';
      this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 2500);
    });
    on('btn-gate-override', 'click', () => {
      s.toastMsg = 'Supervisor PIN required for Matron Emergency Medical Override.';
      this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 3000);
    });

    // HealthSave Ajo
    on('btn-add-pot', 'click', () => {
      const newPot = {
        id: 'pot' + Date.now(),
        title: 'Surgical Co-Pay Reserve',
        category: 'Surgery',
        targetAmount: 100000,
        currentAmount: 10000,
        monthlyContribution: 10000,
        interestYieldAnnual: 11.5,
        roundUpEnabled: true,
        autoDeductDay: 15,
        history: [{ id:'ptx'+Date.now(), date:'Today', amount:10000, type:'deposit', note:'Initial health pot seed deposit' }]
      };
      s.healthSavePots.push(newPot);
      s.toastMsg = 'New HealthSave pot created!'; this._render();
      setTimeout(() => { s.toastMsg = ''; this._render(); }, 2500);
    });
    onAll('[data-pot-quick-fund]', 'click', e => {
      const pid = e.currentTarget.dataset.potQuickFund;
      const p = s.healthSavePots.find(x => x.id === pid);
      if (p) {
        p.currentAmount += 5000;
        p.history.unshift({ id:'ptx'+Date.now(), date:'Just now', amount:5000, type:'deposit', note:'Manual quick top-up' });
        s.toastMsg = this.t.potAddedFunds; this._render();
        setTimeout(() => { s.toastMsg = ''; this._render(); }, 2500);
      }
    });

    // Facility Directory
    on('inp-facility-search', 'input', e => {
      s.facilitiesSearch = e.target.value;
      this._render();
      const inp = document.getElementById('inp-facility-search');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    });
  }

  _bindKeypad(context, callback) {
    document.querySelectorAll(`[data-keypad="${context}"]`).forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.key;
        if (key === '') return;
        callback(key === '⌫' ? '⌫' : key);
      });
    });
  }
}

/* ── Boot ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  window._app = new WelliPayApp(root);
});
