-- Migration: Create Payment Requests & Duplicate Control System for Accounting Department
-- Tera Group (TG), Tera Electric (TE), Tera Power (TP)

CREATE TABLE IF NOT EXISTS payment_request_sequences (
  company VARCHAR(20) NOT NULL,
  year_month VARCHAR(10) NOT NULL,
  last_sequence INT NOT NULL DEFAULT 0,
  PRIMARY KEY (company, year_month)
);

CREATE TABLE IF NOT EXISTS payment_requests (
  id VARCHAR(50) PRIMARY KEY,
  pay_number VARCHAR(50) UNIQUE NOT NULL,
  company VARCHAR(20) NOT NULL, -- TG, TE, TP
  branch VARCHAR(100) NOT NULL, -- Head Office, ชลบุรี, ระยอง, ขอนแก่น, เชียงใหม่
  classification VARCHAR(50) NOT NULL, -- VENDOR_BILL, REIMBURSEMENT, BRANCH_SITE, PETTY_CASH, CASH_ADVANCE
  urgency VARCHAR(20) NOT NULL DEFAULT 'NORMAL', -- NORMAL, EMERGENCY
  status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
  
  -- Requester Information
  requester_id VARCHAR(100),
  requester_name VARCHAR(255) NOT NULL,
  requester_department VARCHAR(100),
  requester_phone VARCHAR(50),
  
  -- Supplier / Payee Information
  supplier_name VARCHAR(255) NOT NULL,
  supplier_tax_id VARCHAR(50),
  bank_name VARCHAR(100),
  bank_account_no VARCHAR(100),
  payee_phone VARCHAR(50),
  
  -- Document & Financial Breakdown
  document_date DATE NOT NULL,
  has_no_doc_number BOOLEAN DEFAULT FALSE,
  invoice_number VARCHAR(100),
  subtotal_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  vat_type VARCHAR(20) DEFAULT 'NONE', -- NONE, 7%, CUSTOM
  vat_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  wht_type VARCHAR(20) DEFAULT 'NONE', -- NONE, 1%, 2%, 3%, 5%, CUSTOM
  wht_percent DECIMAL(5, 2) DEFAULT 0.00,
  wht_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  net_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  purpose TEXT NOT NULL,
  cost_center VARCHAR(100),
  po_pr_number VARCHAR(100),
  requested_payment_date DATE,
  submission_channel VARCHAR(50) DEFAULT 'WEB', -- WEB, LINE, EMAIL, PHYSICAL
  
  -- Verification & Approval
  requester_signature_url TEXT,
  supervisor_signature_url TEXT,
  approver_signature_url TEXT,
  ap_checked_by VARCHAR(255),
  ap_checked_at TIMESTAMPTZ,
  ap_notes TEXT,
  supervisor_checked_by VARCHAR(255),
  supervisor_checked_at TIMESTAMPTZ,
  supervisor_notes TEXT,
  approved_by VARCHAR(255),
  approved_at TIMESTAMPTZ,
  approval_limit_tier VARCHAR(50),
  approval_notes TEXT,
  
  -- Payment Execution (Finance)
  paid_date DATE,
  paid_by VARCHAR(255),
  paid_from_bank VARCHAR(100),
  bank_reference_no VARCHAR(100),
  payment_slip_url TEXT,
  payment_notes TEXT,
  
  -- GL Posting (AP) & Physical Originals
  gl_posted_by VARCHAR(255),
  gl_posted_at TIMESTAMPTZ,
  gl_voucher_no VARCHAR(100),
  gl_notes TEXT,
  original_received_by VARCHAR(255),
  original_received_at TIMESTAMPTZ,
  original_stamp_text VARCHAR(255) DEFAULT 'RECEIVED ORIGINAL/PAID',
  original_notes TEXT,
  
  -- Duplicate Prevention Flags
  is_possible_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_reason TEXT,
  duplicate_matches JSONB DEFAULT '[]'::jsonb,
  
  -- Attachments & Cancellation
  attachments JSONB DEFAULT '[]'::jsonb,
  cancelled_reason TEXT,
  cancelled_by VARCHAR(255),
  cancelled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast searches, duplicate checks, and status filtering
CREATE INDEX IF NOT EXISTS idx_payment_requests_company ON payment_requests(company);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_branch ON payment_requests(branch);
CREATE INDEX IF NOT EXISTS idx_payment_requests_supplier ON payment_requests(supplier_name);
CREATE INDEX IF NOT EXISTS idx_payment_requests_invoice ON payment_requests(company, supplier_name, invoice_number);
CREATE INDEX IF NOT EXISTS idx_payment_requests_duplicate_check ON payment_requests(company, supplier_name, net_amount, document_date);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON payment_requests(created_at DESC);

-- Audit Trail Log Table
CREATE TABLE IF NOT EXISTS payment_request_logs (
  id BIGSERIAL PRIMARY KEY,
  payment_request_id VARCHAR(50) NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  performed_by VARCHAR(255) NOT NULL,
  performed_by_id VARCHAR(100),
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_request_logs_req_id ON payment_request_logs(payment_request_id);
