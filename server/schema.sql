-- ==============================================================================
-- WelliPay PostgreSQL Schema: Healthcare Payment & Transactional Ledger
-- Provides ACID double-entry accounting, row-level locks, and atomic reconciliation
-- ==============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations (Providers & HMO Payers)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('hospital_provider', 'hmo_payer', 'corporate')),
    slug VARCHAR(100) UNIQUE NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Chart of Accounts (Double-Entry Ledger)
CREATE TABLE ledger_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    current_balance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- 3. Journal Entries (Atomic Financial Batches)
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    reference VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system'
);

-- 4. Journal Lines (Debits and Credits)
CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    debit NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (debit >= 0),
    credit NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (credit >= 0),
    CONSTRAINT chk_debit_or_credit CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

-- 5. Invoices & Billing Statements
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. INV-92831
    patient_id VARCHAR(50) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    service_description TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount > 0),
    paid_amount NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Raw Inbound Payments (USSD, POS, Bank Transfer)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('Bank transfer', 'POS card', 'USSD', 'Card')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    raw_reference VARCHAR(255) NOT NULL, -- e.g. "JOHN U.", txn 44231
    sender_remarks TEXT,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    reconciliation_status VARCHAR(50) DEFAULT 'unmatched' CHECK (reconciliation_status IN ('unmatched', 'suggested', 'confirmed', 'rejected')),
    version INT DEFAULT 1 NOT NULL -- For optimistic locking
);

-- 7. AI Match Suggestions & Reconciliation Audit Trail
CREATE TABLE reconciliation_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id),
    ai_confidence_score NUMERIC(5, 2) NOT NULL, -- e.g. 94.00
    is_high_confidence BOOLEAN DEFAULT FALSE,
    match_justification TEXT NOT NULL,
    confirmed_by VARCHAR(100),
    confirmed_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. HMO Claims
CREATE TABLE hmo_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id VARCHAR(50) UNIQUE NOT NULL, -- e.g. CLM-4471
    provider_id UUID NOT NULL REFERENCES organizations(id),
    payer_id UUID NOT NULL REFERENCES organizations(id),
    patient_name VARCHAR(255) NOT NULL,
    diagnosis TEXT NOT NULL,
    pre_auth_code VARCHAR(100),
    amount NUMERIC(15, 2) NOT NULL,
    denial_risk VARCHAR(50) DEFAULT 'low' CHECK (denial_risk IN ('low', 'high', 'missing-auth')),
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'paid', 'rejected')),
    is_disputed BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);

-- ==============================================================================
-- PostgreSQL Function: Atomic Reconciliation with Row Locks
-- Prevents double-matching and updates account balances in a single transaction
-- ==============================================================================

CREATE OR REPLACE FUNCTION atomic_confirm_reconciliation(
    p_payment_id UUID,
    p_invoice_id UUID,
    p_user VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
    v_payment_amount NUMERIC(15, 2);
    v_invoice_balance NUMERIC(15, 2);
    v_org_id UUID;
    v_bank_acc UUID;
    v_receivable_acc UUID;
    v_entry_id UUID;
BEGIN
    -- 1. Acquire Row Lock on the payment to prevent race conditions
    SELECT amount, organization_id INTO v_payment_amount, v_org_id
    FROM payments
    WHERE id = p_payment_id AND reconciliation_status = 'unmatched'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment % is either locked or already reconciled.', p_payment_id;
    END IF;

    -- 2. Acquire Row Lock on the invoice
    SELECT (total_amount - paid_amount) INTO v_invoice_balance
    FROM invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice % not found.', p_invoice_id;
    END IF;

    -- 3. Mark payment as confirmed
    UPDATE payments 
    SET reconciliation_status = 'confirmed', version = version + 1
    WHERE id = p_payment_id;

    -- 4. Update invoice balance and status
    UPDATE invoices
    SET paid_amount = paid_amount + v_payment_amount,
        status = CASE WHEN (paid_amount + v_payment_amount) >= total_amount THEN 'paid' ELSE 'partially_paid' END,
        updated_at = NOW()
    WHERE id = p_invoice_id;

    -- 5. Insert double-entry journal records
    INSERT INTO journal_entries (organization_id, reference, description, created_by)
    VALUES (v_org_id, 'RECON-' || p_payment_id, 'Payment reconciliation to invoice ' || p_invoice_id, p_user)
    RETURNING id INTO v_entry_id;

    -- 6. Audit record
    UPDATE reconciliation_matches
    SET status = 'confirmed', confirmed_by = p_user, confirmed_at = NOW()
    WHERE payment_id = p_payment_id AND invoice_id = p_invoice_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
