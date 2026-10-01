'use server';

import prisma from '@/app/lib/db';
import { revalidatePath } from 'next/cache';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { getUser } from '@/app/lib/dal';
import { isAccountingManager } from '@/app/lib/roleHelper';

let poolInstance: Pool | null = null;
function getPool(): Pool {
  if (!poolInstance) {
    let dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      try {
        const envPath = path.join(process.cwd(), '.env');
        const envFile = fs.readFileSync(envPath, 'utf-8');
        const match = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
        if (match) dbUrl = match[1];
      } catch (e) {
        console.warn('Failed to load DATABASE_URL in paymentRequests actions');
      }
    }
    poolInstance = new Pool({ connectionString: dbUrl });
  }
  return poolInstance;
}

export type PaymentRequestRecord = {
  id: string;
  pay_number: string;
  company: 'TG' | 'TE' | 'TP';
  branch: string;
  classification: 'VENDOR_BILL' | 'REIMBURSEMENT' | 'BRANCH_SITE' | 'PETTY_CASH' | 'CASH_ADVANCE';
  urgency: 'NORMAL' | 'EMERGENCY';
  status: string;
  requester_id?: string | null;
  requester_name: string;
  requester_department?: string | null;
  requester_phone?: string | null;
  supplier_name: string;
  supplier_tax_id?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_account_name?: string | null;
  payment_method?: string | null;
  payee_phone?: string | null;
  document_date: string;
  has_no_doc_number: boolean;
  invoice_number?: string | null;
  subtotal_amount: number;
  vat_type: string;
  vat_amount: number;
  wht_type: string;
  wht_percent: number;
  wht_amount: number;
  net_amount: number;
  purpose: string;
  cost_center?: string | null;
  po_pr_number?: string | null;
  requested_payment_date?: string | null;
  submission_channel: string;
  requester_signature_url?: string | null;
  supervisor_signature_url?: string | null;
  approver_signature_url?: string | null;
  ap_checked_by?: string | null;
  ap_checked_at?: string | null;
  ap_notes?: string | null;
  supervisor_checked_by?: string | null;
  supervisor_checked_at?: string | null;
  supervisor_notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_limit_tier?: string | null;
  approval_notes?: string | null;
  paid_date?: string | null;
  paid_by?: string | null;
  paid_from_bank?: string | null;
  bank_reference_no?: string | null;
  payment_slip_url?: string | null;
  payment_notes?: string | null;
  gl_posted_by?: string | null;
  gl_posted_at?: string | null;
  gl_voucher_no?: string | null;
  gl_notes?: string | null;
  original_received_by?: string | null;
  original_received_at?: string | null;
  original_stamp_text?: string | null;
  original_notes?: string | null;
  is_possible_duplicate: boolean;
  duplicate_reason?: string | null;
  duplicate_matches?: any;
  attachments?: any;
  cancelled_reason?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRequestLog = {
  id: number;
  payment_request_id: string;
  action: string;
  performed_by: string;
  performed_by_id?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  notes?: string | null;
  created_at: string;
};

// Date sanitization helpers to prevent React runtime error: Objects are not valid as a React child (found: [object Date])
function toDateString(d: any): string | null {
  if (!d) return null;
  if (d instanceof Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const str = String(d);
  return str.includes('T') ? str.split('T')[0] : str;
}

function toTimestampString(d: any): string | null {
  if (!d) return null;
  if (d instanceof Date) {
    return d.toISOString();
  }
  return String(d);
}

function sanitizePaymentRequest(row: any): PaymentRequestRecord {
  if (!row) return row;
  return {
    ...row,
    document_date: toDateString(row.document_date) || '',
    requested_payment_date: toDateString(row.requested_payment_date),
    paid_date: toDateString(row.paid_date),
    created_at: toTimestampString(row.created_at) || '',
    updated_at: toTimestampString(row.updated_at) || '',
    ap_checked_at: toTimestampString(row.ap_checked_at),
    supervisor_checked_at: toTimestampString(row.supervisor_checked_at),
    approved_at: toTimestampString(row.approved_at),
    gl_posted_at: toTimestampString(row.gl_posted_at),
    original_received_at: toTimestampString(row.original_received_at),
    cancelled_at: toTimestampString(row.cancelled_at),
    requester_signature_url: row.requester_signature_url || null,
    supervisor_signature_url: row.supervisor_signature_url || null,
    approver_signature_url: row.approver_signature_url || null,
    subtotal_amount: Number(row.subtotal_amount || 0),
    vat_amount: Number(row.vat_amount || 0),
    wht_percent: Number(row.wht_percent || 0),
    wht_amount: Number(row.wht_amount || 0),
    net_amount: Number(row.net_amount || 0),
  };
}

function sanitizePaymentRequestLog(row: any): PaymentRequestLog {
  if (!row) return row;
  return {
    ...row,
    created_at: toTimestampString(row.created_at) || '',
  };
}

// Helper: Calculate Thai Buddhist Era YYMM
function getCurrentYYMM(): string {
  const d = new Date();
  const yearBE = d.getFullYear() + 543;
  const yy = String(yearBE).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

// Generate atomic, non-reusable running number: PAY-[COMPANY]-[YYMM]-[00001]
export async function generateNextPayNumber(company: 'TG' | 'TE' | 'TP'): Promise<string> {
  const pool = getPool();
  const ym = getCurrentYYMM();
  const res = await pool.query(
    `INSERT INTO payment_request_sequences (company, year_month, last_sequence)
     VALUES ($1, $2, 1)
     ON CONFLICT (company, year_month)
     DO UPDATE SET last_sequence = payment_request_sequences.last_sequence + 1
     RETURNING last_sequence`,
    [company, ym]
  );
  const seq = res.rows[0].last_sequence;
  return `PAY-${company}-${ym}-${String(seq).padStart(5, '0')}`;
}

// Duplicate Detection Engine
export async function checkDuplicates(params: {
  company: string;
  supplierName: string;
  invoiceNumber?: string | null;
  hasNoDocNumber?: boolean;
  netAmount: number;
  documentDate: string;
  branch?: string;
  excludeId?: string;
}) {
  const pool = getPool();
  const { company, supplierName, invoiceNumber, hasNoDocNumber, netAmount, documentDate, branch, excludeId } = params;

  let exactMatches: any[] = [];
  let possibleMatches: any[] = [];

  // 1. Exact Duplicate: Company + Supplier + Invoice Number (if invoice exists and not marked hasNoDocNumber)
  if (!hasNoDocNumber && invoiceNumber && invoiceNumber.trim().length > 0) {
    const cleanInv = invoiceNumber.trim();
    const cleanSupplier = supplierName.trim();
    const query = `
      SELECT id, pay_number, company, supplier_name, invoice_number, net_amount, document_date, status, created_at
      FROM payment_requests
      WHERE company = $1
        AND LOWER(TRIM(supplier_name)) = LOWER($2)
        AND LOWER(TRIM(invoice_number)) = LOWER($3)
        AND status != 'CANCELLED'
        ${excludeId ? `AND id != $4` : ''}
      LIMIT 5
    `;
    const values = excludeId ? [company, cleanSupplier, cleanInv, excludeId] : [company, cleanSupplier, cleanInv];
    const res = await pool.query(query, values);
    exactMatches = res.rows.map((r: any) => ({
      ...r,
      document_date: toDateString(r.document_date) || '',
      created_at: toTimestampString(r.created_at) || '',
      net_amount: Number(r.net_amount || 0),
    }));
  }

  // 2. Possible Duplicate: Company + Supplier + Net Amount (+/- 1 Baht) + Document Date + Branch/CostCenter
  if (supplierName && netAmount > 0 && documentDate) {
    const cleanSupplier = supplierName.trim();
    const query = `
      SELECT id, pay_number, company, branch, supplier_name, invoice_number, net_amount, document_date, status, created_at
      FROM payment_requests
      WHERE company = $1
        AND LOWER(TRIM(supplier_name)) = LOWER($2)
        AND ABS(net_amount - $3) < 1.00
        AND document_date = $4
        AND status != 'CANCELLED'
        ${excludeId ? `AND id != $5` : ''}
      LIMIT 5
    `;
    const values = excludeId
      ? [company, cleanSupplier, netAmount, documentDate, excludeId]
      : [company, cleanSupplier, netAmount, documentDate];
    const res = await pool.query(query, values);
    // Filter out if already in exact matches
    const exactIds = new Set(exactMatches.map(m => m.id));
    possibleMatches = res.rows
      .filter((r: any) => !exactIds.has(r.id))
      .map((r: any) => ({
        ...r,
        document_date: toDateString(r.document_date) || '',
        created_at: toTimestampString(r.created_at) || '',
        net_amount: Number(r.net_amount || 0),
      }));
  }

  return {
    isExactDuplicate: exactMatches.length > 0,
    isPossibleDuplicate: possibleMatches.length > 0,
    exactMatches,
    possibleMatches,
  };
}

export async function getPaymentRequests(filters: {
  company?: string;
  branch?: string;
  status?: string;
  classification?: string;
  urgency?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  tab?: string; // ALL, PENDING_REVIEW, PENDING_APPROVAL, APPROVED_PAYMENT_LIST, PAID, DUPLICATES, CLOSED
  requesterId?: string;
  requesterName?: string;
} = {}) {
  const pool = getPool();
  const whereClauses: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (filters.requesterId && filters.requesterName) {
    whereClauses.push(`(requester_id = $${paramIdx} OR requester_name ILIKE $${paramIdx + 1})`);
    values.push(filters.requesterId, `%${filters.requesterName}%`);
    paramIdx += 2;
  } else if (filters.requesterId) {
    whereClauses.push(`requester_id = $${paramIdx++}`);
    values.push(filters.requesterId);
  } else if (filters.requesterName) {
    whereClauses.push(`requester_name ILIKE $${paramIdx++}`);
    values.push(`%${filters.requesterName}%`);
  }

  if (filters.company && filters.company !== 'ALL') {
    whereClauses.push(`company = $${paramIdx++}`);
    values.push(filters.company);
  }

  if (filters.branch && filters.branch !== 'ALL') {
    whereClauses.push(`branch = $${paramIdx++}`);
    values.push(filters.branch);
  }

  if (filters.classification && filters.classification !== 'ALL') {
    whereClauses.push(`classification = $${paramIdx++}`);
    values.push(filters.classification);
  }

  if (filters.urgency && filters.urgency !== 'ALL') {
    whereClauses.push(`urgency = $${paramIdx++}`);
    values.push(filters.urgency);
  }

  // Tab Filtering (Standard accounting operational views)
  if (filters.tab) {
    switch (filters.tab) {
      case 'PENDING_REVIEW':
        whereClauses.push(`status IN ('SUBMITTED', 'DUPLICATE_CHECK', 'DOCUMENT_CHECK')`);
        break;
      case 'PENDING_APPROVAL':
        whereClauses.push(`status = 'ACCOUNTING_CHECKED'`);
        break;
      case 'APPROVED_PAYMENT_LIST':
        whereClauses.push(`status IN ('APPROVED', 'READY_TO_PAY')`);
        break;
      case 'PAID':
        whereClauses.push(`status IN ('PAID', 'POSTED_TO_GL', 'ORIGINAL_RECEIVED')`);
        break;
      case 'DUPLICATES':
        whereClauses.push(`(status = 'HOLD_DUPLICATE' OR is_possible_duplicate = TRUE)`);
        break;
      case 'CLOSED':
        whereClauses.push(`status = 'CLOSED'`);
        break;
      case 'CANCELLED':
        whereClauses.push(`status = 'CANCELLED'`);
        break;
      default:
        break;
    }
  } else if (filters.status && filters.status !== 'ALL') {
    whereClauses.push(`status = $${paramIdx++}`);
    values.push(filters.status);
  }

  if (filters.search && filters.search.trim()) {
    const q = `%${filters.search.trim()}%`;
    whereClauses.push(`(
      pay_number ILIKE $${paramIdx} OR
      supplier_name ILIKE $${paramIdx} OR
      invoice_number ILIKE $${paramIdx} OR
      requester_name ILIKE $${paramIdx} OR
      purpose ILIKE $${paramIdx} OR
      po_pr_number ILIKE $${paramIdx}
    )`);
    values.push(q);
    paramIdx++;
  }

  if (filters.dateFrom) {
    whereClauses.push(`document_date >= $${paramIdx++}`);
    values.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    whereClauses.push(`document_date <= $${paramIdx++}`);
    values.push(filters.dateTo);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const sql = `
    SELECT *
    FROM payment_requests
    ${whereSql}
    ORDER BY created_at DESC
  `;

  const res = await pool.query(sql, values);
  return res.rows.map(sanitizePaymentRequest);
}

// Get Dashboard Statistics
export async function getPaymentRequestDashboardStats() {
  const pool = getPool();
  const sql = `
    SELECT
      COUNT(*)::int as total_count,
      COALESCE(SUM(net_amount), 0)::float as total_amount,
      COUNT(CASE WHEN status IN ('SUBMITTED', 'DUPLICATE_CHECK', 'DOCUMENT_CHECK') THEN 1 END)::int as pending_review_count,
      COALESCE(SUM(CASE WHEN status IN ('SUBMITTED', 'DUPLICATE_CHECK', 'DOCUMENT_CHECK') THEN net_amount ELSE 0 END), 0)::float as pending_review_amount,
      COUNT(CASE WHEN status = 'ACCOUNTING_CHECKED' THEN 1 END)::int as pending_approval_count,
      COALESCE(SUM(CASE WHEN status = 'ACCOUNTING_CHECKED' THEN net_amount ELSE 0 END), 0)::float as pending_approval_amount,
      COUNT(CASE WHEN status IN ('APPROVED', 'READY_TO_PAY') THEN 1 END)::int as ready_to_pay_count,
      COALESCE(SUM(CASE WHEN status IN ('APPROVED', 'READY_TO_PAY') THEN net_amount ELSE 0 END), 0)::float as ready_to_pay_amount,
      COUNT(CASE WHEN status IN ('PAID', 'POSTED_TO_GL', 'ORIGINAL_RECEIVED', 'CLOSED') THEN 1 END)::int as paid_count,
      COALESCE(SUM(CASE WHEN status IN ('PAID', 'POSTED_TO_GL', 'ORIGINAL_RECEIVED', 'CLOSED') THEN net_amount ELSE 0 END), 0)::float as paid_amount,
      COUNT(CASE WHEN status = 'HOLD_DUPLICATE' OR is_possible_duplicate = TRUE THEN 1 END)::int as duplicate_alert_count,
      COUNT(CASE WHEN status = 'PAID' AND original_received_at IS NULL THEN 1 END)::int as missing_originals_count,
      COUNT(CASE WHEN urgency = 'EMERGENCY' AND status NOT IN ('PAID', 'CLOSED', 'CANCELLED') THEN 1 END)::int as urgent_pending_count
    FROM payment_requests
    WHERE status != 'CANCELLED'
  `;
  const res = await pool.query(sql);
  return res.rows[0];
}

// Get single request by ID with full audit log
export async function getPaymentRequestById(id: string) {
  const pool = getPool();
  const reqRes = await pool.query('SELECT * FROM payment_requests WHERE id = $1', [id]);
  if (reqRes.rows.length === 0) return null;

  const logsRes = await pool.query(
    'SELECT * FROM payment_request_logs WHERE payment_request_id = $1 ORDER BY created_at ASC',
    [id]
  );

  return {
    ...sanitizePaymentRequest(reqRes.rows[0]),
    logs: logsRes.rows.map(sanitizePaymentRequestLog),
  };
}

// Create new Payment Request
export async function createPaymentRequest(data: {
  company: 'TG' | 'TE' | 'TP';
  branch: string;
  classification: 'VENDOR_BILL' | 'REIMBURSEMENT' | 'BRANCH_SITE' | 'PETTY_CASH' | 'CASH_ADVANCE';
  urgency: 'NORMAL' | 'EMERGENCY';
  requester_id?: string;
  requester_name: string;
  requester_department?: string;
  requester_phone?: string;
  supplier_name: string;
  supplier_tax_id?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_account_name?: string;
  payment_method?: string;
  payee_phone?: string;
  document_date: string;
  has_no_doc_number: boolean;
  invoice_number?: string;
  subtotal_amount: number;
  vat_type?: string;
  vat_amount?: number;
  wht_type?: string;
  wht_percent?: number;
  wht_amount?: number;
  net_amount?: number;
  purpose: string;
  cost_center?: string;
  po_pr_number?: string;
  requested_payment_date?: string;
  submission_channel?: string;
  attachments?: any[];
}) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Calculations
    const subtotal = Number(data.subtotal_amount) || 0;
    const vat = Number(data.vat_amount) || 0;
    const wht = Number(data.wht_amount) || 0;
    const net = data.net_amount !== undefined ? Number(data.net_amount) : Math.round((subtotal + vat - wht) * 100) / 100;

    // 2. Run Duplicate Check
    const dupCheck = await checkDuplicates({
      company: data.company,
      supplierName: data.supplier_name,
      invoiceNumber: data.invoice_number,
      hasNoDocNumber: data.has_no_doc_number,
      netAmount: net,
      documentDate: data.document_date,
      branch: data.branch,
    });

    let initialStatus = 'SUBMITTED';
    let isPossibleDuplicate = false;
    let duplicateReason: string | null = null;
    let duplicateMatches: any[] = [];

    if (dupCheck.isExactDuplicate) {
      initialStatus = 'HOLD_DUPLICATE';
      isPossibleDuplicate = true;
      const firstMatch = dupCheck.exactMatches[0];
      duplicateReason = `[Exact Duplicate] ตรวจพบเลขที่เอกสาร ${firstMatch.invoice_number} ของ ${firstMatch.supplier_name} ตรงกับใบขอจ่าย ${firstMatch.pay_number} (ระงับชั่วคราวเพื่อตรวจสอบ)`;
      duplicateMatches = dupCheck.exactMatches;
    } else if (dupCheck.isPossibleDuplicate) {
      isPossibleDuplicate = true;
      const firstMatch = dupCheck.possibleMatches[0];
      duplicateReason = `[Possible Duplicate] ตรวจพบยอดเงิน ${net.toLocaleString()} บาท วันที่ ${data.document_date} ตรงกับใบขอจ่าย ${firstMatch.pay_number}`;
      duplicateMatches = dupCheck.possibleMatches;
    }

    // 3. Generate Running Number
    const ym = getCurrentYYMM();
    const seqRes = await client.query(
      `INSERT INTO payment_request_sequences (company, year_month, last_sequence)
       VALUES ($1, $2, 1)
       ON CONFLICT (company, year_month)
       DO UPDATE SET last_sequence = payment_request_sequences.last_sequence + 1
       RETURNING last_sequence`,
      [data.company, ym]
    );
    const seq = seqRes.rows[0].last_sequence;
    const payNumber = `PAY-${data.company}-${ym}-${String(seq).padStart(5, '0')}`;
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 4. Insert Record
    await client.query(
      `INSERT INTO payment_requests (
        id, pay_number, company, branch, classification, urgency, status,
        requester_id, requester_name, requester_department, requester_phone,
        supplier_name, supplier_tax_id, bank_name, bank_account_no, bank_account_name, payment_method, payee_phone,
        document_date, has_no_doc_number, invoice_number,
        subtotal_amount, vat_type, vat_amount, wht_type, wht_percent, wht_amount, net_amount,
        purpose, cost_center, po_pr_number, requested_payment_date, submission_channel,
        is_possible_duplicate, duplicate_reason, duplicate_matches, attachments
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33,
        $34, $35, $36, $37
      )`,
      [
        id,
        payNumber,
        data.company,
        data.branch,
        data.classification,
        data.urgency || 'NORMAL',
        initialStatus,
        data.requester_id || null,
        data.requester_name,
        data.requester_department || null,
        data.requester_phone || null,
        data.supplier_name,
        data.supplier_tax_id || null,
        data.bank_name || null,
        data.bank_account_no || null,
        data.bank_account_name || null,
        data.payment_method || 'BANK_TRANSFER',
        data.payee_phone || null,
        data.document_date,
        data.has_no_doc_number || false,
        data.has_no_doc_number ? null : (data.invoice_number?.trim() || null),
        subtotal,
        data.vat_type || 'NONE',
        vat,
        data.wht_type || 'NONE',
        data.wht_percent || 0.0,
        wht,
        net,
        data.purpose,
        data.cost_center || null,
        data.po_pr_number || null,
        data.requested_payment_date || null,
        data.submission_channel || 'WEB',
        isPossibleDuplicate,
        duplicateReason,
        JSON.stringify(duplicateMatches),
        JSON.stringify(data.attachments || []),
      ]
    );

    // 5. Audit Log
    const logNote = isPossibleDuplicate
      ? `สร้างคำขอเบิกจ่าย (ระบบส่งสัญญาณเตือน: ${duplicateReason})`
      : 'สร้างคำขอเบิกจ่ายในระบบกลางสำเร็จ';

    await client.query(
      `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
       VALUES ($1, 'CREATED', $2, 'DRAFT', $3, $4)`,
      [id, data.requester_name, initialStatus, logNote]
    );

    await client.query('COMMIT');
    revalidatePath('/accounting/payment-requests');

    return {
      success: true,
      id,
      payNumber,
      status: initialStatus,
      isPossibleDuplicate,
      duplicateReason,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating payment request:', error);
    return { success: false, error: error.message || 'Failed to create payment request' };
  } finally {
    client.release();
  }
}

// AP Review: Verify documents, tax, PO/PR, and duplicate check
export async function apReviewPaymentRequest(
  id: string,
  data: {
    status: 'DOCUMENT_CHECK' | 'ACCOUNTING_CHECKED' | 'HOLD_DUPLICATE' | 'RETURN_DOCUMENT';
    notes?: string;
    checkedBy: string;
  }
) {
  const pool = getPool();
  const currentReq = await pool.query('SELECT status, pay_number FROM payment_requests WHERE id = $1', [id]);
  if (currentReq.rows.length === 0) return { success: false, error: 'Request not found' };

  const prevStatus = currentReq.rows[0].status;

  await pool.query(
    `UPDATE payment_requests
     SET status = $1,
         ap_checked_by = $2,
         ap_checked_at = NOW(),
         ap_notes = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [data.status, data.checkedBy, data.notes || null, id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'AP_CHECKED', $2, $3, $4, $5)`,
    [id, data.checkedBy, prevStatus, data.status, data.notes || 'AP ดำเนินการตรวจสอบเอกสารและภาษี']
  );

  revalidatePath('/accounting/payment-requests');
  revalidatePath(`/accounting/payment-requests/${id}`);
  return { success: true };
}

// Supervisor Review: Focus on anomalies, missing bill numbers, duplicate validation
export async function supervisorReviewPaymentRequest(
  id: string,
  data: {
    status: 'ACCOUNTING_CHECKED' | 'RETURN_DOCUMENT' | 'HOLD_DUPLICATE';
    notes?: string;
    reviewedBy: string;
  }
) {
  const currentUser = await getUser();
  if (!currentUser || !isAccountingManager(currentUser.role)) {
    return {
      success: false,
      error: 'เฉพาะผู้จัดการฝ่ายบัญชี (Accounting Manager) เท่านั้นที่มีสิทธิ์สอบทานขั้นตอนนี้',
    };
  }

  const pool = getPool();
  const currentReq = await pool.query('SELECT status FROM payment_requests WHERE id = $1', [id]);
  if (currentReq.rows.length === 0) return { success: false, error: 'Request not found' };
  const prevStatus = currentReq.rows[0].status;

  await pool.query(
    `UPDATE payment_requests
     SET status = $1,
         supervisor_checked_by = $2,
         supervisor_checked_at = NOW(),
         supervisor_notes = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [data.status, data.reviewedBy, data.notes || null, id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'SUPERVISOR_CHECKED', $2, $3, $4, $5)`,
    [id, data.reviewedBy, prevStatus, data.status, data.notes || 'หัวหน้าฝ่ายบัญชีสอบทานรายการ']
  );

  revalidatePath('/accounting/payment-requests');
  revalidatePath(`/accounting/payment-requests/${id}`);
  return { success: true };
}

// Manager / Executive Approval based on Approval Matrix
export async function approvePaymentRequest(
  id: string,
  data: {
    approvedBy: string;
    notes?: string;
  }
) {
  const pool = getPool();
  const reqRes = await pool.query('SELECT net_amount, status FROM payment_requests WHERE id = $1', [id]);
  if (reqRes.rows.length === 0) return { success: false, error: 'Request not found' };

  const prevStatus = reqRes.rows[0].status;
  if (prevStatus === 'ACCOUNTING_CHECKED') {
    const currentUser = await getUser();
    if (!currentUser || !isAccountingManager(currentUser.role)) {
      return {
        success: false,
        error: 'เฉพาะผู้จัดการฝ่ายบัญชี (Accounting Manager) เท่านั้นที่มีสิทธิ์สอบทานและอนุมัติขั้นตอนนี้',
      };
    }
  }

  const net = Number(reqRes.rows[0].net_amount);

  let limitTier = 'ไม่เกิน 3,000 บาท';
  if (net > 30000) {
    limitTier = 'เกิน 30,000 บาท (อนุมัติระดับผู้บริหาร/การเงินส่วนกลาง)';
  } else if (net > 10000) {
    limitTier = '10,001 - 30,000 บาท (ผู้จัดการฝ่ายที่เกี่ยวข้อง)';
  } else if (net > 3000) {
    limitTier = '3,001 - 10,000 บาท (หัวหน้าสาขา/หัวหน้าแผนก)';
  }

  // Transitions to READY_TO_PAY (Approved Payment List for Finance)
  await pool.query(
    `UPDATE payment_requests
     SET status = 'READY_TO_PAY',
         approved_by = $1,
         approved_at = NOW(),
         approval_limit_tier = $2,
         approval_notes = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [data.approvedBy, limitTier, data.notes || null, id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'APPROVED', $2, $3, 'READY_TO_PAY', $4)`,
    [id, data.approvedBy, prevStatus, data.notes || `อนุมัติการจ่ายเงินเรียบร้อยแล้ว (${limitTier}) ส่งต่อเข้า Approved Payment List`]
  );

  revalidatePath('/accounting/payment-requests');
  revalidatePath(`/accounting/payment-requests/${id}`);
  return { success: true, limitTier };
}

// Finance Disbursement Execution: "Finance processes payments only for items with APPROVED or READY TO PAY status"
export async function financeDisbursePayment(
  id: string,
  data: {
    paidDate: string;
    paidBy: string;
    paidFromBank: string;
    bankReferenceNo: string;
    paymentSlipUrl?: string;
    paymentNotes?: string;
  }
) {
  const pool = getPool();
  const reqRes = await pool.query('SELECT status, pay_number, net_amount FROM payment_requests WHERE id = $1', [id]);
  if (reqRes.rows.length === 0) return { success: false, error: 'Request not found' };

  const current = reqRes.rows[0];
  if (current.status !== 'APPROVED' && current.status !== 'READY_TO_PAY') {
    return {
      success: false,
      error: `ไม่สามารถจ่ายเงินได้ เนื่องจากสถานะปัจจุบันคือ "${current.status}" ฝ่ายการเงินจะจ่ายเงินได้เฉพาะรายการที่มีสถานะ APPROVED หรือ READY TO PAY เท่านั้น`,
    };
  }

  // Check if bankReferenceNo is duplicated (Post-payment protection)
  if (data.bankReferenceNo && data.bankReferenceNo.trim().length > 0) {
    const dupRefRes = await pool.query(
      `SELECT pay_number, net_amount, paid_date
       FROM payment_requests
       WHERE bank_reference_no = $1 AND id != $2
       LIMIT 1`,
      [data.bankReferenceNo.trim(), id]
    );
    if (dupRefRes.rows.length > 0) {
      const match = dupRefRes.rows[0];
      return {
        success: false,
        error: `เลขที่อ้างอิงการโอน ${data.bankReferenceNo} ซ้ำกับใบขอจ่าย ${match.pay_number} (จ่ายเมื่อ ${match.paid_date}) กรุณาตรวจสอบสลิปโอนเงิน`,
      };
    }
  }

  await pool.query(
    `UPDATE payment_requests
     SET status = 'PAID',
         paid_date = $1,
         paid_by = $2,
         paid_from_bank = $3,
         bank_reference_no = $4,
         payment_slip_url = $5,
         payment_notes = $6,
         updated_at = NOW()
     WHERE id = $7`,
    [
      data.paidDate,
      data.paidBy,
      data.paidFromBank,
      data.bankReferenceNo.trim(),
      data.paymentSlipUrl || null,
      data.paymentNotes || null,
      id,
    ]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'PAID', $2, $3, 'PAID', $4)`,
    [
      id,
      data.paidBy,
      current.status,
      `ฝ่ายการเงินโอนจ่ายเงินสำเร็จ อ้างอิงโอน: ${data.bankReferenceNo} บัญชี: ${data.paidFromBank} ${data.paymentNotes ? `(${data.paymentNotes})` : ''}`,
    ]
  );

  revalidatePath('/accounting/payment-requests');
  revalidatePath(`/accounting/payment-requests/${id}`);
  return { success: true };
}

// AP GL Posting: Record Express / Odoo Journal Voucher
export async function postPaymentRequestToGL(
  id: string,
  data: {
    glVoucherNo: string;
    glPostedBy: string;
    glNotes?: string;
  }
) {
  const pool = getPool();
  const reqRes = await pool.query('SELECT status FROM payment_requests WHERE id = $1', [id]);
  if (reqRes.rows.length === 0) return { success: false, error: 'Request not found' };
  const prevStatus = reqRes.rows[0].status;

  await pool.query(
    `UPDATE payment_requests
     SET status = 'POSTED_TO_GL',
         gl_voucher_no = $1,
         gl_posted_by = $2,
         gl_posted_at = NOW(),
         gl_notes = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [data.glVoucherNo.trim(), data.glPostedBy, data.glNotes || null, id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'POSTED_TO_GL', $2, $3, 'POSTED_TO_GL', $4)`,
    [id, data.glPostedBy, prevStatus, `บันทึกบัญชี Express/Odoo เรียบร้อยแล้ว เลขที่ใบสำคัญ: ${data.glVoucherNo}`]
  );

  revalidatePath('/accounting/payment-requests');
  revalidatePath(`/accounting/payment-requests/${id}`);
  return { success: true };
}

// Original Document Receipt & Stamp
export async function recordOriginalDocumentReceipt(
  id: string,
  data: {
    originalReceivedBy: string;
    stampText?: string;
    notes?: string;
  }
) {
  const pool = getPool();
  const reqRes = await pool.query('SELECT status, pay_number FROM payment_requests WHERE id = $1', [id]);
  if (reqRes.rows.length === 0) return { success: false, error: 'Request not found' };
  const prevStatus = reqRes.rows[0].status;

  const defaultStamp = `RECEIVED ORIGINAL/PAID - ${new Date().toLocaleDateString('th-TH')}`;
  const finalStamp = data.stampText?.trim() || defaultStamp;

  await pool.query(
    `UPDATE payment_requests
     SET original_received_by = $1,
         original_received_at = NOW(),
         original_stamp_text = $2,
         original_notes = $3,
         status = CASE WHEN status = 'POSTED_TO_GL' THEN 'CLOSED' ELSE 'ORIGINAL_RECEIVED' END,
         updated_at = NOW()
     WHERE id = $4`,
    [data.originalReceivedBy, finalStamp, data.notes || null, id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'ORIGINAL_RECEIVED', $2, $3, 'ORIGINAL_RECEIVED', $4)`,
    [id, data.originalReceivedBy, prevStatus, `ได้รับเอกสารตัวจริงแล้ว ปั๊มตรา: "${finalStamp}" โดย ${data.originalReceivedBy}`]
  );

  revalidatePath('/accounting/payment-requests');
  revalidatePath(`/accounting/payment-requests/${id}`);
  return { success: true };
}

// Cancel Payment Request (Retains record for audit trail - no deletion)
export async function cancelPaymentRequest(
  id: string,
  data: {
    reason: string;
    cancelledBy: string;
  }
) {
  const pool = getPool();
  const reqRes = await pool.query('SELECT status, pay_number FROM payment_requests WHERE id = $1', [id]);
  if (reqRes.rows.length === 0) return { success: false, error: 'Request not found' };
  const prevStatus = reqRes.rows[0].status;

  if (prevStatus === 'PAID' || prevStatus === 'POSTED_TO_GL' || prevStatus === 'CLOSED') {
    return { success: false, error: 'ไม่สามารถยกเลิกรายการที่จ่ายเงินแล้วได้' };
  }

  await pool.query(
    `UPDATE payment_requests
     SET status = 'CANCELLED',
         cancelled_reason = $1,
         cancelled_by = $2,
         cancelled_at = NOW(),
         updated_at = NOW()
     WHERE id = $3`,
    [data.reason, data.cancelledBy, id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'CANCELLED', $2, $3, 'CANCELLED', $4)`,
    [id, data.cancelledBy, prevStatus, `ยกเลิกคำขอเบิกจ่าย เหตุผล: ${data.reason}`]
  );

  revalidatePath('/accounting/payment-requests');
  revalidatePath(`/accounting/payment-requests/${id}`);
  return { success: true };
}

// Add attachments to existing request
export async function addPaymentRequestAttachments(
  id: string,
  newAttachments: { url: string; fileName: string; fileType?: string }[],
  userName: string
) {
  const pool = getPool();
  const reqRes = await pool.query('SELECT attachments FROM payment_requests WHERE id = $1', [id]);
  if (reqRes.rows.length === 0) return { success: false, error: 'Request not found' };

  const existing = Array.isArray(reqRes.rows[0].attachments) ? reqRes.rows[0].attachments : [];
  const updated = [...existing, ...newAttachments];

  await pool.query(
    `UPDATE payment_requests
     SET attachments = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(updated), id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, notes)
     VALUES ($1, 'ATTACHMENT_ADDED', $2, $3)`,
    [id, userName, `แนบเอกสารเพิ่มเติม ${newAttachments.length} ไฟล์`]
  );

  revalidatePath('/accounting/payment-requests');
  revalidatePath(`/accounting/payment-requests/${id}`);
  return { success: true };
}

export type SystemBranch = {
  id: string;
  name: string;
};

export async function getSystemBranches(): Promise<SystemBranch[]> {
  try {
    const rawBranches = await prisma.branches.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    });
    if (rawBranches && rawBranches.length > 0) {
      return rawBranches.map((b) => ({ id: b.id, name: b.name }));
    }
  } catch (err) {
    console.error('Failed to query prisma.branches in getSystemBranches:', err);
  }

  return [
    { id: 'BKK-HQ', name: 'สำนักงานใหญ่' },
    { id: 'BKK-WH', name: 'Tera Warehouse 62' },
    { id: 'CMI01', name: 'เชียงใหม่' },
    { id: 'KK01', name: 'ขอนแก่น' },
    { id: 'KRI01', name: 'กาญจนบุรี' },
    { id: 'NRT', name: 'นครศรีธรรมราช' },
    { id: 'PSNL01', name: 'พิษณุโลก' },
    { id: 'ROI01', name: 'ร้อยเอ็ด' },
    { id: 'SMK', name: 'สมุทรสาคร' },
    { id: 'SN01', name: 'สกลนคร' },
    { id: 'SRN01', name: 'สุรินทร์' },
    { id: 'SRT01', name: 'สุราษฎร์ธานี' },
    { id: 'UB01', name: 'อุบลราชธานี' },
    { id: 'UDN01', name: 'อุดรธานี' },
  ];
}

export async function getUserProfileDetails(userId: string, employeeId?: string | null) {
  let defaultBranch = 'สำนักงานใหญ่';
  let defaultDept = '';
  let defaultPhone = '';

  try {
    // 1. TERA_db employees
    if (employeeId) {
      const { teraDb } = await import('@/app/lib/teraDb');
      const emp = await teraDb.employees.findUnique({
        where: { emp_id: employeeId },
        include: { departments: true },
      });
      if (emp) {
        if (emp.departments?.name) defaultDept = emp.departments.name;
        if (emp.phone_number) defaultPhone = emp.phone_number;
        if (emp.branch_id) defaultBranch = emp.branch_id;
      }
    }

    // 2. employeeSale in CRM db
    const empSale = await prisma.employeeSale.findFirst({
      where: {
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(employeeId ? [{ employeeId }] : []),
        ],
      },
    });

    if (empSale) {
      if (!defaultDept && empSale.department) defaultDept = empSale.department;
      if (defaultBranch === 'สำนักงานใหญ่' && empSale.branch) defaultBranch = empSale.branch;
    }
  } catch (err) {
    console.warn('Error querying user profile details for payment request:', err);
  }

  return { defaultBranch, defaultDept, defaultPhone };
}

export async function deletePaymentRequest(id: string) {
  const pool = getPool();
  try {
    await pool.query('DELETE FROM payment_requests WHERE id = $1', [id]);
    revalidatePath('/accounting/payment-requests');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete payment request:', err);
    return { success: false, error: err.message };
  }
}

// Update payment request digital signatures (Prepared by, Verified by, Approved by)
export async function updatePaymentRequestSignatures(
  id: string,
  signatures: {
    preparedBy?: string | null;
    verifiedBy?: string | null;
    approvedBy?: string | null;
  }
) {
  const pool = getPool();
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (signatures.preparedBy !== undefined) {
      fields.push(`requester_signature_url = $${idx++}`);
      values.push(signatures.preparedBy);
    }
    if (signatures.verifiedBy !== undefined) {
      fields.push(`supervisor_signature_url = $${idx++}`);
      values.push(signatures.verifiedBy);
    }
    if (signatures.approvedBy !== undefined) {
      fields.push(`approver_signature_url = $${idx++}`);
      values.push(signatures.approvedBy);
    }

    if (fields.length === 0) return { success: true };

    values.push(id);
    const sql = `UPDATE payment_requests SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`;
    await pool.query(sql, values);

    revalidatePath(`/accounting/payment-requests/${id}`);
    revalidatePath('/accounting/payment-requests');
    revalidatePath('/accounting/payment-requests/new');

    return { success: true };
  } catch (err: any) {
    console.error('Failed to update payment request signatures:', err);
    return { success: false, error: err.message };
  }
}

// Update payment recipient bank details (for AR / AP / Requester updates)
export async function updatePaymentBankDetails(
  id: string,
  data: {
    payment_method?: string;
    bank_name?: string;
    bank_account_no?: string;
    bank_account_name?: string;
    updated_by: string;
  }
) {
  const pool = getPool();
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.payment_method !== undefined) {
      fields.push(`payment_method = $${idx++}`);
      values.push(data.payment_method);
    }
    if (data.bank_name !== undefined) {
      fields.push(`bank_name = $${idx++}`);
      values.push(data.bank_name);
    }
    if (data.bank_account_no !== undefined) {
      fields.push(`bank_account_no = $${idx++}`);
      values.push(data.bank_account_no);
    }
    if (data.bank_account_name !== undefined) {
      fields.push(`bank_account_name = $${idx++}`);
      values.push(data.bank_account_name);
    }

    if (fields.length === 0) return { success: true };

    values.push(id);
    const sql = `UPDATE payment_requests SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`;
    await pool.query(sql, values);

    // Audit log
    const desc = `แก้ไขข้อมูลการโอนเงิน: ${data.bank_name || ''} ${data.bank_account_no || ''} ${data.bank_account_name ? `(${data.bank_account_name})` : ''}`.trim();
    await pool.query(
      `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, notes)
       VALUES ($1, 'UPDATE_BANK_DETAILS', $2, $3)`,
      [id, data.updated_by, desc]
    );

    revalidatePath(`/accounting/payment-requests/${id}`);
    revalidatePath('/accounting/payment-requests');
    revalidatePath('/accounting/payment-requests/new');

    return { success: true };
  } catch (err: any) {
    console.error('Failed to update bank details:', err);
    return { success: false, error: err.message };
  }
}


