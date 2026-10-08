'use server';

import prisma from '@/app/lib/db';
import { revalidatePath } from 'next/cache';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { getUser } from '@/app/lib/dal';
import {
  isSuperUser,
  isAccountingManager,
  isAccountingStaff,
  canManageAllPaymentRequests,
  isSupervisorOrManager,
  canSupervisorApproveRequest,
} from '@/app/lib/roleHelper';
import type { AttachmentCheckItem } from '@/lib/attachmentUtils';
import {
  normalizeAttachmentName,
  isDistinctiveAttachmentName,
  visualHammingDistance,
  normalizeInvoiceNo,
} from '@/lib/attachmentUtils';

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
  ap_signature_url?: string | null;
  ap_checked_by?: string | null;
  ap_checked_at?: string | null;
  ap_notes?: string | null;
  supervisor_checked_by?: string | null;
  supervisor_checked_at?: string | null;
  supervisor_notes?: string | null;
  assigned_supervisor_id?: string | null;
  assigned_supervisor_name?: string | null;
  accounting_manager_checked_by?: string | null;
  accounting_manager_checked_at?: string | null;
  accounting_manager_notes?: string | null;
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
  items?: RequisitionItem[];
  credit_card_deduction?: number;
  cancelled_reason?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type RequisitionItem = {
  id?: string;
  billDate: string;
  supplierName: string;
  supplierTaxId?: string;
  invoiceNumber?: string;
  description: string;
  amount: number;
  vatType?: string;
  vatAmount?: number;
  whtType?: string;
  whtPercent?: number;
  whtAmount?: number;
  netAmount?: number;
  remarks?: string;
  paidByCreditCard?: boolean;
  isIrregularBill?: boolean;
  substituteCertificateUrl?: string;
  substituteCertificateFileName?: string;
  substituteGroupKey?: string;
  quantity?: number;
  unitPrice?: number;
  requesterSignatureUrl?: string;
  approverName?: string;
  approverPosition?: string;
  approverSignatureUrl?: string;
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
    ap_signature_url: row.ap_signature_url || null,
    subtotal_amount: Number(row.subtotal_amount || 0),
    vat_amount: Number(row.vat_amount || 0),
    wht_percent: Number(row.wht_percent || 0),
    wht_amount: Number(row.wht_amount || 0),
    net_amount: Number(row.net_amount || 0),
    credit_card_deduction: Number(row.credit_card_deduction || 0),
    items: Array.isArray(row.items) ? row.items : [],
  };
}

function sanitizePaymentRequestLog(row: any): PaymentRequestLog {
  if (!row) return row;
  return {
    ...row,
    created_at: toTimestampString(row.created_at) || '',
  };
}

// Helper: Calculate Thai Buddhist Era YYMM using Thailand Timezone (UTC+7)
function getCurrentYYMM(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const yearStr = parts.find((p) => p.type === 'year')?.value || '2026';
  const mm = parts.find((p) => p.type === 'month')?.value || '10';
  const yearBE = parseInt(yearStr, 10) + 543;
  const yy = String(yearBE).slice(-2);
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

// Attachment Duplicate Detection Engine
export async function checkAttachmentDuplicates(params: {
  fileHashes?: string[];
  items?: AttachmentCheckItem[];
  excludeId?: string;
}) {
  const pool = getPool();
  const { fileHashes = [], items = [], excludeId } = params;

  // Unify check items
  const checkItems: AttachmentCheckItem[] = [...items];
  for (const h of fileHashes) {
    if (typeof h === 'string' && h.trim() && !checkItems.some((it) => it.fileHash === h.trim())) {
      checkItems.push({ fileHash: h.trim() });
    }
  }

  if (checkItems.length === 0) {
    return { isDuplicate: false, matches: [] };
  }

  try {
    let query = `
      SELECT 
        id, pay_number, company, branch, supplier_name, supplier_tax_id, 
        invoice_number, net_amount, document_date, status, requester_name, attachments, created_at
      FROM payment_requests
      WHERE status NOT IN ('CANCELLED', 'REJECTED')
        AND attachments IS NOT NULL
    `;
    const values: any[] = [];
    if (excludeId) {
      values.push(excludeId);
      query += ` AND id != $1`;
    }
    query += ` ORDER BY created_at DESC LIMIT 100`;

    const res = await pool.query(query, values);
    const matches: any[] = [];
    const matchedReqIds = new Set<string>();

    for (const row of res.rows) {
      if (!Array.isArray(row.attachments)) continue;
      for (const att of row.attachments) {
        for (const item of checkItems) {
          let isMatch = false;
          let matchType = '';
          let reason = '';

          // 0. QR Code / PromptPay Transfer Slip Payload Match (100% invariant to camera angle, zoom, phone brand)
          if (item.qrPayload && att.qrPayload) {
            const qr1 = item.qrPayload.trim();
            const qr2 = att.qrPayload.trim();
            if (qr1 === qr2 || (qr1.length >= 15 && qr2.length >= 15 && (qr1.includes(qr2) || qr2.includes(qr1)))) {
              isMatch = true;
              matchType = 'ATTACHMENT_QR';
              reason = `ตรวจพบรหัส QR Code/สลิปโอนเงินตรงกัน 100% (ตรงกับ "${att.fileName || 'เอกสารเดิม'}" แม้ถ่ายจากคนละกล้อง/ต่างมุม)`;
            }
          }

          // 0.1 Barcode Match
          if (!isMatch && item.barcode && att.barcode && item.barcode.trim() === att.barcode.trim()) {
            isMatch = true;
            matchType = 'ATTACHMENT_BARCODE';
            reason = `ตรวจพบบาร์โค้ดบนเอกสารตรงกัน (${item.barcode})`;
          }

          // 0.2 OCR Tax ID + Invoice Number Match (Invariant to separate shots/cameras)
          if (!isMatch && item.extractedInvoiceNo && att.extractedInvoiceNo) {
            const normInvIn = normalizeInvoiceNo(item.extractedInvoiceNo);
            const normInvAtt = normalizeInvoiceNo(att.extractedInvoiceNo);
            if (normInvIn.length >= 4 && normInvIn === normInvAtt) {
              const taxMatch = item.extractedTaxId && att.extractedTaxId && item.extractedTaxId === att.extractedTaxId;
              const amtMatch = item.extractedAmount && att.extractedAmount && Math.abs(item.extractedAmount - att.extractedAmount) < 0.01;
              if (taxMatch || amtMatch) {
                isMatch = true;
                matchType = 'ATTACHMENT_OCR';
                reason = `ตรวจพบข้อมูล OCR เลขที่ใบกำกับภาษี "${item.extractedInvoiceNo}" ${taxMatch ? 'และเลขผู้เสียภาษีตรงกัน' : 'และยอดเงินตรงกัน'} (ถ่ายจากต่างกล้อง)`;
              }
            }
          }

          // 0.3 OCR Match against previous payment request record (invoice_number & supplier_tax_id / net_amount)
          if (!isMatch && item.extractedInvoiceNo && row.invoice_number) {
            const normInvIn = normalizeInvoiceNo(item.extractedInvoiceNo);
            const normInvRow = normalizeInvoiceNo(row.invoice_number);
            if (normInvIn.length >= 4 && normInvIn === normInvRow) {
              const cleanRowTax = (row.supplier_tax_id || '').replace(/\D/g, '');
              const taxMatch = item.extractedTaxId && cleanRowTax && item.extractedTaxId === cleanRowTax;
              const amtMatch = item.extractedAmount && row.net_amount && Math.abs(item.extractedAmount - Number(row.net_amount)) < 0.01;
              if (taxMatch || amtMatch) {
                isMatch = true;
                matchType = 'ATTACHMENT_OCR_RECORD';
                reason = `ตรวจพบเลขที่ใบกำกับภาษี "${item.extractedInvoiceNo}" จากภาพตรงกับคำขอเดิม (${row.pay_number})`;
              }
            }
          }

          // 1. Exact SHA-256 binary hash
          if (!isMatch && item.fileHash && att.fileHash && item.fileHash.toLowerCase() === att.fileHash.toLowerCase()) {
            isMatch = true;
            matchType = 'ATTACHMENT_HASH';
            reason = `ไฟล์ดิจิทัลตรงกัน 100% (SHA-256 ตรงกับ "${att.fileName || 'เอกสารเดิม'}")`;
          }

          // 2. Conflict Detection (Negative proof: If amounts, QR codes, or transaction numbers clearly differ, they CANNOT be duplicates)
          if (!isMatch) {
            const qrConflict = !!(item.qrPayload && att.qrPayload && item.qrPayload.trim() !== att.qrPayload.trim());
            const normItemInv = normalizeInvoiceNo(item.extractedInvoiceNo);
            const normAttInv = normalizeInvoiceNo(att.extractedInvoiceNo || row.invoice_number);
            const invConflict = !!(normItemInv.length >= 4 && normAttInv.length >= 4 && normItemInv !== normAttInv);

            const effectiveItemAmt = item.currentAmount || item.extractedAmount;
            const effectiveAttAmt = att.extractedAmount || (row.net_amount ? Number(row.net_amount) : undefined);
            const amtConflict = !!(
              effectiveItemAmt !== undefined &&
              effectiveAttAmt !== undefined &&
              Math.abs(effectiveItemAmt - effectiveAttAmt) >= 1.00
            );

            const effectiveItemSupp = (item.currentSupplier || item.extractedSupplier || '').trim().toLowerCase();
            const effectiveAttSupp = (att.extractedSupplier || row.supplier_name || '').trim().toLowerCase();
            const suppConflict = !!(
              effectiveItemSupp.length >= 4 &&
              effectiveAttSupp.length >= 4 &&
              !effectiveItemSupp.includes(effectiveAttSupp) &&
              !effectiveAttSupp.includes(effectiveItemSupp)
            );

            const hasMajorConflict = qrConflict || invConflict || amtConflict;

            // Only proceed with visual similarity check if there is NO definitive conflicting data
            if (!hasMajorConflict) {
              let bestDist = 999;
              let hashType = 'ภาพรวม';

              if (item.visualHash && att.visualHash) {
                const d = visualHammingDistance(item.visualHash, att.visualHash);
                if (d < bestDist) {
                  bestDist = d;
                  hashType = 'ภาพรวม';
                }
              }

              if (item.coreVisualHash && att.coreVisualHash) {
                const d = visualHammingDistance(item.coreVisualHash, att.coreVisualHash);
                if (d < bestDist) {
                  bestDist = d;
                  hashType = 'แกนกลางเอกสาร';
                }
              }

              // Shared OCR Token Overlap Check
              let sharedTokenCount = 0;
              if (
                Array.isArray(item.distinctiveTokens) &&
                Array.isArray(att.distinctiveTokens) &&
                item.distinctiveTokens.length > 0 &&
                att.distinctiveTokens.length > 0
              ) {
                const attTokenSet = new Set(att.distinctiveTokens.map((t: string) => t.toLowerCase()));
                sharedTokenCount = item.distinctiveTokens.filter((t: string) => attTokenSet.has(t.toLowerCase())).length;
              }

              // Context alignment: Amount, Supplier, Date
              const amtMatch =
                effectiveItemAmt !== undefined &&
                effectiveAttAmt !== undefined &&
                Math.abs(effectiveItemAmt - effectiveAttAmt) < 0.10;
              const suppMatch =
                effectiveItemSupp &&
                effectiveAttSupp &&
                (effectiveItemSupp.includes(effectiveAttSupp) || effectiveAttSupp.includes(effectiveItemSupp));
              const phoneMatch = !!(item.extractedPhone && att.extractedPhone && item.extractedPhone === att.extractedPhone);

              // Tier A: Virtually Identical Image (diff <= 2 bits out of 64, >= 96.8% identical pixels)
              // Only triggers for the exact same photo (e.g. re-saved / re-compressed JPEG) with no conflict
              if (bestDist <= 2 && !suppConflict) {
                isMatch = true;
                matchType = 'ATTACHMENT_VISUAL';
                const similarity = (((64 - bestDist) / 64) * 100).toFixed(1);
                reason = `ตรวจพบรูปภาพเอกสารตรงกัน ${similarity}% (ตรงกับ "${att.fileName || 'เอกสารเดิม'}")`;
              }
              // Tier B: Corroborated Visual Match (diff <= 8 bits, >= 87.5% similarity) + Confirmed Evidence (Same Amount or Phone or Store)
              // Prevents false positives from common slip layouts (KBank, PromptPay, thermal receipts)
              else if (bestDist <= 8 && (amtMatch || phoneMatch || (suppMatch && sharedTokenCount >= 2))) {
                isMatch = true;
                matchType = 'ATTACHMENT_VISUAL_CONTEXT';
                const similarity = (((64 - bestDist) / 64) * 100).toFixed(1);
                const extraDetails = [
                  amtMatch ? `ยอดเงินตรงกัน (${Number(effectiveAttAmt).toLocaleString()} ฿)` : '',
                  suppMatch ? `ผู้ขายตรงกัน (${row.supplier_name})` : '',
                  phoneMatch ? `เบอร์โทรตรายางร้านตรงกัน` : '',
                  sharedTokenCount >= 2 ? `ข้อความบนบิลตรงกัน` : '',
                ]
                  .filter(Boolean)
                  .join(', ');
                reason = `ตรวจพบลักษณะเอกสารใกล้เคียงกัน ${similarity}% (${extraDetails}) ตรงกับคำขอเดิม (${row.pay_number})`;
              }
              // Tier C: Distinctive Phone/Stamp Match + Same Exact Amount
              else if (phoneMatch && amtMatch) {
                isMatch = true;
                matchType = 'ATTACHMENT_OCR';
                reason = `ตรวจพบเบอร์โทรบนตรายางร้าน (${item.extractedPhone}) และยอดเงิน (${effectiveItemAmt} ฿) ตรงกับคำขอเดิม (${row.pay_number})`;
              }
            }
          }

          // 3. Normalized Distinctive Filename + Similarity
          if (!isMatch && item.fileName && att.fileName) {
            const normIn = normalizeAttachmentName(item.fileName);
            const normAtt = normalizeAttachmentName(att.fileName);
            if (normIn && normIn === normAtt && isDistinctiveAttachmentName(normIn)) {
              if (item.visualHash && att.visualHash) {
                const dist = visualHammingDistance(item.visualHash, att.visualHash);
                if (dist <= 8) {
                  isMatch = true;
                  matchType = 'ATTACHMENT_VISUAL';
                  reason = `ตรวจพบชื่อเอกสารและลายนิ้วมือภาพตรงกับ "${att.fileName}"`;
                }
              } else if (item.fileSize && att.fileSize) {
                const ratio = item.fileSize / att.fileSize;
                if (ratio >= 0.4 && ratio <= 2.5) {
                  isMatch = true;
                  matchType = 'ATTACHMENT_NAME_SIMILAR';
                  reason = `ตรวจพบชื่อเอกสารตรงกัน (${att.fileName}) และขนาดไฟล์ใกล้เคียงกัน`;
                }
              } else {
                isMatch = true;
                matchType = 'ATTACHMENT_NAME_SIMILAR';
                reason = `ตรวจพบชื่อเอกสารตรงกัน (${att.fileName})`;
              }
            }
          }

          if (isMatch && !matchedReqIds.has(row.id)) {
            matchedReqIds.add(row.id);
            matches.push({
              id: row.id,
              pay_number: row.pay_number,
              company: row.company,
              branch: row.branch,
              supplier_name: row.supplier_name,
              supplier_tax_id: row.supplier_tax_id,
              invoice_number: row.invoice_number,
              net_amount: Number(row.net_amount || 0),
              document_date: toDateString(row.document_date) || '',
              created_at: toTimestampString(row.created_at) || '',
              status: row.status,
              requester_name: row.requester_name,
              matchType,
              matchedFileName: att.fileName,
              duplicateFileName: item.fileName,
              reason,
            });
            break;
          }
        }
        if (matchedReqIds.has(row.id)) break;
      }
      if (matches.length >= 5) break;
    }

    return {
      isDuplicate: matches.length > 0,
      matches,
    };
  } catch (err) {
    console.error('Error checking attachment duplicates:', err);
    return { isDuplicate: false, matches: [] };
  }
}

// Duplicate Detection Engine
export async function checkDuplicates(params: {
  company: string;
  supplierName?: string;
  supplierTaxId?: string | null;
  invoiceNumber?: string | null;
  poPrNumber?: string | null;
  hasNoDocNumber?: boolean;
  netAmount?: number;
  documentDate?: string;
  branch?: string;
  excludeId?: string;
  fileHashes?: string[];
  attachmentItems?: AttachmentCheckItem[];
  attachments?: any[];
  items?: RequisitionItem[];
}) {
  const pool = getPool();
  const {
    company,
    supplierName,
    supplierTaxId,
    invoiceNumber,
    poPrNumber,
    hasNoDocNumber,
    netAmount = 0,
    documentDate,
    branch,
    excludeId,
    fileHashes,
    attachmentItems,
    attachments,
    items,
  } = params;

  let exactMatches: any[] = [];
  let possibleMatches: any[] = [];

  // Normalize inputs
  const cleanInv = invoiceNumber ? invoiceNumber.replace(/[^a-zA-Z0-9ก-๙]/g, '').toLowerCase() : '';
  const cleanTaxId = supplierTaxId ? supplierTaxId.replace(/[^0-9]/g, '') : '';
  const cleanSupplier = supplierName ? supplierName.trim() : '';
  const cleanPoPr = poPrNumber ? poPrNumber.trim().toLowerCase() : '';

  // 1. Exact Duplicate Rule:
  // Match company + normalized invoice number + (matching Tax ID OR matching Supplier Name)
  if (!hasNoDocNumber && cleanInv.length >= 3 && (cleanTaxId.length >= 10 || cleanSupplier.length >= 2)) {
    const query = `
      SELECT id, pay_number, company, branch, supplier_name, supplier_tax_id, invoice_number, net_amount, document_date, status, created_at
      FROM payment_requests
      WHERE company = $1
        AND status NOT IN ('CANCELLED', 'REJECTED')
        AND regexp_replace(LOWER(invoice_number), '[^a-zA-Z0-9ก-๙]', '', 'g') = $2
        AND (
          ($3 != '' AND regexp_replace(COALESCE(supplier_tax_id, ''), '[^0-9]', '', 'g') = $3)
          OR ($4 != '' AND LOWER(TRIM(supplier_name)) = LOWER(TRIM($4)))
        )
        ${excludeId ? `AND id != $5` : ''}
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const values = excludeId
      ? [company, cleanInv, cleanTaxId, cleanSupplier, excludeId]
      : [company, cleanInv, cleanTaxId, cleanSupplier];
    const res = await pool.query(query, values);
    exactMatches = res.rows.map((r: any) => ({
      ...r,
      document_date: toDateString(r.document_date) || '',
      created_at: toTimestampString(r.created_at) || '',
      net_amount: Number(r.net_amount || 0),
      matchType: 'INVOICE_NUMBER',
    }));
  }

  // 2. Exact Duplicate by PO / PR Number (if PO/PR is filled)
  if (cleanPoPr.length >= 4 && exactMatches.length === 0) {
    const poQuery = `
      SELECT id, pay_number, company, branch, supplier_name, supplier_tax_id, invoice_number, po_pr_number, net_amount, document_date, status, created_at
      FROM payment_requests
      WHERE company = $1
        AND status NOT IN ('CANCELLED', 'REJECTED')
        AND LOWER(TRIM(po_pr_number)) = $2
        ${excludeId ? `AND id != $3` : ''}
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const poValues = excludeId ? [company, cleanPoPr, excludeId] : [company, cleanPoPr];
    const poRes = await pool.query(poQuery, poValues);
    if (poRes.rows.length > 0) {
      exactMatches = poRes.rows.map((r: any) => ({
        ...r,
        document_date: toDateString(r.document_date) || '',
        created_at: toTimestampString(r.created_at) || '',
        net_amount: Number(r.net_amount || 0),
        matchType: 'PO_PR_NUMBER',
      }));
    }
  }

  // 3. Exact Duplicate by Attachments (Multi-Signal: SHA-256, Visual Hash, Normalized Filename)
  const allAttItems: AttachmentCheckItem[] = [
    ...(attachmentItems || []),
    ...(Array.isArray(attachments) ? attachments : []),
  ].map((it) => ({
    ...it,
    currentAmount: it.currentAmount ?? (netAmount > 0 ? netAmount : undefined),
    currentSupplier: it.currentSupplier ?? (cleanSupplier || undefined),
  }));
  if (fileHashes && fileHashes.length > 0) {
    for (const h of fileHashes) {
      if (typeof h === 'string' && h.trim() && !allAttItems.some((it) => it.fileHash === h.trim())) {
        allAttItems.push({ fileHash: h.trim() });
      }
    }
  }

  if (allAttItems.length > 0 && exactMatches.length === 0) {
    const attDupRes = await checkAttachmentDuplicates({
      items: allAttItems,
      excludeId,
    });
    if (attDupRes.isDuplicate && attDupRes.matches.length > 0) {
      attDupRes.matches.forEach((m) => {
        exactMatches.push({
          ...m,
          matchType: m.matchType || 'ATTACHMENT_HASH',
        });
      });
    }
  }

  // 4. Possible Duplicate: Company + Supplier (or Tax ID) + Net Amount (+/- 1 Baht) + Document Date
  if ((cleanSupplier.length >= 2 || cleanTaxId.length >= 10) && netAmount > 0 && documentDate) {
    const query = `
      SELECT id, pay_number, company, branch, supplier_name, supplier_tax_id, invoice_number, net_amount, document_date, status, created_at
      FROM payment_requests
      WHERE company = $1
        AND status NOT IN ('CANCELLED', 'REJECTED')
        AND (
          ($2 != '' AND LOWER(TRIM(supplier_name)) = LOWER(TRIM($2)))
          OR ($3 != '' AND regexp_replace(COALESCE(supplier_tax_id, ''), '[^0-9]', '', 'g') = $3)
        )
        AND ABS(net_amount - $4) < 1.00
        AND document_date = $5
        ${excludeId ? `AND id != $6` : ''}
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const values = excludeId
      ? [company, cleanSupplier, cleanTaxId, netAmount, documentDate, excludeId]
      : [company, cleanSupplier, cleanTaxId, netAmount, documentDate];
    const res = await pool.query(query, values);

    // Filter out if already in exact matches
    const exactIds = new Set(exactMatches.map((m) => m.id));
    possibleMatches = res.rows
      .filter((r: any) => !exactIds.has(r.id))
      .map((r: any) => ({
        ...r,
        document_date: toDateString(r.document_date) || '',
        created_at: toTimestampString(r.created_at) || '',
        net_amount: Number(r.net_amount || 0),
        matchType: 'AMOUNT_AND_DATE',
      }));
  }

  // 5. Multi-Item Duplicate Check: Check each requisition item across active requests
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itSupplier = it.supplierName ? it.supplierName.trim() : '';
      const itInv = it.invoiceNumber ? it.invoiceNumber.replace(/[^a-zA-Z0-9ก-๙]/g, '').toLowerCase() : '';
      const itAmount = Number(it.amount || 0);
      const itDate = it.billDate || documentDate;

      // 5.1 Item exact invoice check
      if (itInv.length >= 3 && itSupplier.length >= 2) {
        const itemInvQuery = `
          SELECT id, pay_number, company, branch, supplier_name, supplier_tax_id, invoice_number, net_amount, document_date, status, created_at
          FROM payment_requests
          WHERE company = $1
            AND status NOT IN ('CANCELLED', 'REJECTED')
            AND (
              regexp_replace(LOWER(invoice_number), '[^a-zA-Z0-9ก-๙]', '', 'g') = $2
              OR items::text ILIKE $3
            )
            AND (
              LOWER(TRIM(supplier_name)) = LOWER(TRIM($4))
              OR items::text ILIKE $5
            )
            ${excludeId ? `AND id != $6` : ''}
          ORDER BY created_at DESC
          LIMIT 3
        `;
        const itemInvValues = excludeId
          ? [company, itInv, `%"invoiceNumber":"${it.invoiceNumber?.trim()}"%`, itSupplier, `%"supplierName":"${itSupplier}"%`, excludeId]
          : [company, itInv, `%"invoiceNumber":"${it.invoiceNumber?.trim()}"%`, itSupplier, `%"supplierName":"${itSupplier}"%`];

        const itemRes = await pool.query(itemInvQuery, itemInvValues);
        if (itemRes.rows.length > 0) {
          itemRes.rows.forEach((r: any) => {
            exactMatches.push({
              ...r,
              document_date: toDateString(r.document_date) || '',
              created_at: toTimestampString(r.created_at) || '',
              net_amount: Number(r.net_amount || 0),
              matchType: 'ITEM_DUPLICATE',
              matchedItemIndex: i + 1,
              matchedItemDesc: it.description,
              matchedItemSupplier: it.supplierName,
              matchedItemAmount: itAmount,
            });
          });
        }
      }

      // 5.2 Item amount + supplier + date duplicate check
      if (itSupplier.length >= 2 && itAmount > 0 && itDate) {
        const itemAmountQuery = `
          SELECT id, pay_number, company, branch, supplier_name, invoice_number, net_amount, document_date, status, created_at
          FROM payment_requests
          WHERE company = $1
            AND status NOT IN ('CANCELLED', 'REJECTED')
            AND (
              (LOWER(TRIM(supplier_name)) = LOWER(TRIM($2)) AND ABS(net_amount - $3) < 1.00 AND document_date = $4)
              OR (items::text ILIKE $5 AND items::text ILIKE $6)
            )
            ${excludeId ? `AND id != $7` : ''}
          ORDER BY created_at DESC
          LIMIT 3
        `;
        const itemAmountValues = excludeId
          ? [company, itSupplier, itAmount, itDate, `%"supplierName":"${itSupplier}"%`, `%"amount":${itAmount}%`, excludeId]
          : [company, itSupplier, itAmount, itDate, `%"supplierName":"${itSupplier}"%`, `%"amount":${itAmount}%`];

        const itemAmountRes = await pool.query(itemAmountQuery, itemAmountValues);
        if (itemAmountRes.rows.length > 0) {
          const exactIds = new Set(exactMatches.map((m) => m.id));
          itemAmountRes.rows
            .filter((r: any) => !exactIds.has(r.id))
            .forEach((r: any) => {
              possibleMatches.push({
                ...r,
                document_date: toDateString(r.document_date) || '',
                created_at: toTimestampString(r.created_at) || '',
                net_amount: Number(r.net_amount || 0),
                matchType: 'ITEM_AMOUNT_AND_DATE',
                matchedItemIndex: i + 1,
                matchedItemDesc: it.description,
                matchedItemSupplier: it.supplierName,
                matchedItemAmount: itAmount,
              });
            });
        }
      }
    }
  }

  // 6. Attachment Multi-Signal Cross-Check (Invariance across separate cameras, angles, and phone models)
  if (Array.isArray(attachments) && attachments.length > 0) {
    const checkItems: AttachmentCheckItem[] = attachments.map((a: any) => ({
      fileName: a.fileName,
      fileHash: a.fileHash,
      visualHash: a.visualHash,
      coreVisualHash: a.coreVisualHash,
      fileSize: a.fileSize,
      qrPayload: a.qrPayload,
      barcode: a.barcode,
      extractedTaxId: a.extractedTaxId,
      extractedInvoiceNo: a.extractedInvoiceNo,
      extractedAmount: a.extractedAmount,
      extractedDate: a.extractedDate,
      extractedSupplier: a.extractedSupplier,
      extractedPhone: a.extractedPhone,
      extractedDescription: a.extractedDescription,
      extractedLineItems: a.extractedLineItems,
      rawTextSnippet: a.rawTextSnippet,
      distinctiveTokens: a.distinctiveTokens,
      currentAmount: netAmount,
      currentSupplier: cleanSupplier,
    }));

    const attRes = await checkAttachmentDuplicates({
      items: checkItems,
      fileHashes: checkItems.map((c) => c.fileHash).filter(Boolean) as string[],
      excludeId,
    });

    if (attRes.isDuplicate && attRes.matches.length > 0) {
      const exactIds = new Set(exactMatches.map((m) => m.id));
      attRes.matches.forEach((m) => {
        if (!exactIds.has(m.id)) {
          exactMatches.push({
            ...m,
            matchType: m.matchType || 'ATTACHMENT_VISUAL',
          });
        }
      });
    }
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
  const currentUser = await getUser();
  const isStaff = currentUser ? canManageAllPaymentRequests(currentUser.role) : false;
  const isManager = currentUser ? isSupervisorOrManager(currentUser.role) : false;

  // Role Scope Guard:
  // - Accounting staff, Executives, Super Admin: can view all company requests
  // - Department Managers / Supervisors: can view requests needing supervisor approval or all requests
  // - General employees: only see their own requests!
  if (currentUser && !isStaff && !isManager) {
    filters.requesterId = currentUser.id;
    filters.requesterName = currentUser.fullName;
  }

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
      case 'PENDING_SUPERVISOR':
        whereClauses.push(`status = 'PENDING_SUPERVISOR'`);
        break;
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
  const currentUser = await getUser();
  const isStaff = currentUser ? canManageAllPaymentRequests(currentUser.role) : false;
  const isManager = currentUser ? isSupervisorOrManager(currentUser.role) : false;

  let userScopeClause = '';
  const values: any[] = [];
  if (currentUser && !isStaff && !isManager) {
    userScopeClause = ' AND (requester_id = $1 OR requester_name ILIKE $2)';
    values.push(currentUser.id, `%${currentUser.fullName}%`);
  }

  const sql = `
    SELECT
      COUNT(*)::int as total_count,
      COALESCE(SUM(net_amount), 0)::float as total_amount,
      COUNT(CASE WHEN status = 'PENDING_SUPERVISOR' THEN 1 END)::int as pending_supervisor_count,
      COALESCE(SUM(CASE WHEN status = 'PENDING_SUPERVISOR' THEN net_amount ELSE 0 END), 0)::float as pending_supervisor_amount,
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
    WHERE status != 'CANCELLED' ${userScopeClause}
  `;
  const res = await pool.query(sql, values);
  return res.rows[0];
}

// Get single request by ID with full audit log
export async function getPaymentRequestById(id: string) {
  const pool = getPool();
  const currentUser = await getUser();
  const reqRes = await pool.query('SELECT * FROM payment_requests WHERE id = $1', [id]);
  if (reqRes.rows.length === 0) return null;

  const row = reqRes.rows[0];
  const isStaff = currentUser ? canManageAllPaymentRequests(currentUser.role) : false;
  const isManager = currentUser ? isSupervisorOrManager(currentUser.role) : false;
  if (currentUser && !isStaff && !isManager) {
    const isOwner =
      (row.requester_id && row.requester_id === currentUser.id) ||
      (row.requester_name && currentUser.fullName && row.requester_name.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase());
    if (!isOwner) {
      // General employees cannot view requests belonging to other people!
      return null;
    }
  }

  const logsRes = await pool.query(
    'SELECT * FROM payment_request_logs WHERE payment_request_id = $1 ORDER BY created_at ASC',
    [id]
  );

  return {
    ...sanitizePaymentRequest(row),
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
  items?: RequisitionItem[];
  credit_card_deduction?: number;
  requester_signature_url?: string;
  supervisor_signature_url?: string;
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
      supplierTaxId: data.supplier_tax_id,
      invoiceNumber: data.invoice_number,
      poPrNumber: data.po_pr_number,
      hasNoDocNumber: data.has_no_doc_number,
      netAmount: net,
      documentDate: data.document_date,
      branch: data.branch,
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      fileHashes: Array.isArray(data.attachments)
        ? (data.attachments as any[]).map((a: any) => a.fileHash).filter(Boolean)
        : [],
      items: data.items,
    });

    const currentUser = await getUser();
    let assignedSupId: string | null = null;
    let assignedSupName: string | null = null;
    let isManagerOrAdmin = currentUser ? isSupervisorOrManager(currentUser.role) : false;

    if (currentUser?.employeeId) {
      try {
        const { teraDb } = await import('@/app/lib/teraDb');
        const emp = await teraDb.employees.findUnique({
          where: { emp_id: currentUser.employeeId },
        });
        if (emp?.supervisor_id) {
          const sup = await teraDb.employees.findUnique({
            where: { emp_id: emp.supervisor_id },
          });
          if (sup) {
            assignedSupId = sup.emp_id;
            assignedSupName = sup.name;
          }
        }
      } catch (e) {
        console.warn('Error resolving assigned supervisor:', e);
      }
    }

    // Disbursement request initial status:
    // If the requester reports to a direct supervisor, supervisor approval is required (PENDING_SUPERVISOR)
    // If no direct supervisor exists (e.g. Executive / Super Admin), it bypasses directly to AP (SUBMITTED)
    let initialStatus = assignedSupId ? 'PENDING_SUPERVISOR' : (isManagerOrAdmin ? 'SUBMITTED' : 'PENDING_SUPERVISOR');
    let isPossibleDuplicate = false;
    let duplicateReason: string | null = null;
    let duplicateMatches: any[] = [];

    if (dupCheck.isExactDuplicate) {
      initialStatus = 'HOLD_DUPLICATE';
      isPossibleDuplicate = true;
      const firstMatch = dupCheck.exactMatches[0];
      const matchDetail =
        firstMatch.matchType === 'ITEM_DUPLICATE'
          ? `รายการที่ ${firstMatch.matchedItemIndex || 1} "${firstMatch.matchedItemDesc || ''}" ของ ${firstMatch.matchedItemSupplier || ''} ตรงกับใบขอจ่าย ${firstMatch.pay_number}`
          : firstMatch.matchType === 'ATTACHMENT_VISUAL'
          ? `ภาพเอกสารตรงกับ ${firstMatch.matchedFileName || 'เอกสาร'} ในใบขอจ่าย ${firstMatch.pay_number} (ตรวจพบลายนิ้วมือภาพตรงกัน)`
          : firstMatch.matchType === 'ATTACHMENT_NAME_SIMILAR'
          ? `ชื่อเอกสารตรงกับ ${firstMatch.matchedFileName || 'เอกสาร'} ในใบขอจ่าย ${firstMatch.pay_number}`
          : firstMatch.matchType === 'ATTACHMENT_HASH'
          ? `ไฟล์แนบตรงกับเอกสารในใบขอจ่าย ${firstMatch.pay_number}`
          : firstMatch.matchType === 'PO_PR_NUMBER'
            ? `เลขที่ PO/PR ${firstMatch.po_pr_number} ตรงกับใบขอจ่าย ${firstMatch.pay_number}`
            : `เลขที่เอกสาร ${firstMatch.invoice_number || '-'} ของ ${firstMatch.supplier_name} ตรงกับใบขอจ่าย ${firstMatch.pay_number}`;
      duplicateReason = `[Exact Duplicate] ${matchDetail} (ระงับชั่วคราวเพื่อตรวจสอบ)`;
      duplicateMatches = dupCheck.exactMatches;
    } else if (dupCheck.isPossibleDuplicate) {
      isPossibleDuplicate = true;
      const firstMatch = dupCheck.possibleMatches[0];
      const matchDetail =
        firstMatch.matchType === 'ITEM_AMOUNT_AND_DATE'
          ? `รายการที่ ${firstMatch.matchedItemIndex || 1} "${firstMatch.matchedItemDesc || ''}" ยอด ${Number(firstMatch.matchedItemAmount || 0).toLocaleString()} ฿ ใกล้เคียงกับคำขอ ${firstMatch.pay_number}`
          : `ยอดเงิน ${net.toLocaleString()} บาท วันที่ ${data.document_date} ตรงกับใบขอจ่าย ${firstMatch.pay_number}`;
      duplicateReason = `[Possible Duplicate] ${matchDetail}`;
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
        assigned_supervisor_id, assigned_supervisor_name,
        supplier_name, supplier_tax_id, bank_name, bank_account_no, bank_account_name, payment_method, payee_phone,
        document_date, has_no_doc_number, invoice_number,
        subtotal_amount, vat_type, vat_amount, wht_type, wht_percent, wht_amount, net_amount,
        purpose, cost_center, po_pr_number, requested_payment_date, submission_channel,
        is_possible_duplicate, duplicate_reason, duplicate_matches, attachments,
        items, credit_card_deduction,
        requester_signature_url, supervisor_signature_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13,
        $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23,
        $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35,
        $36, $37, $38, $39,
        $40, $41,
        $42, $43
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
        assignedSupId,
        assignedSupName,
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
        JSON.stringify(data.items || []),
        Number(data.credit_card_deduction || 0),
        data.requester_signature_url || null,
        data.supervisor_signature_url || null,
      ]
    );

    // 5. Audit Log
    const logNote = isPossibleDuplicate
      ? `สร้างคำขอเบิกจ่าย (ระบบส่งสัญญาณเตือน: ${duplicateReason})`
      : initialStatus === 'PENDING_SUPERVISOR'
      ? 'สร้างคำขอเบิกจ่ายสำเร็จ - รอหัวหน้างาน/ผู้จัดการฝ่ายอนุมัติก่อนส่งฝ่ายบัญชี'
      : 'สร้างคำขอเบิกจ่ายสำเร็จ (ผู้ขอเบิกมีสิทธิ์ระดับหัวหน้างาน/ผู้จัดการ - ส่งต่อฝ่ายบัญชีทันที)';

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

// Department Supervisor Approval (Step 1: Before Accounting Review)
export async function supervisorApprovePaymentRequest(
  id: string,
  data: {
    notes?: string;
    signatureUrl?: string;
    approvedBy?: string;
  }
) {
  const currentUser = await getUser();
  if (!currentUser) {
    return {
      success: false,
      error: 'ไม่มีสิทธิ์: กรุณาเข้าสู่ระบบก่อนทำรายการ',
    };
  }

  const pool = getPool();
  const currentReq = await pool.query(
    'SELECT status, pay_number, company, branch, requester_id, requester_name, requester_department, assigned_supervisor_id, assigned_supervisor_name FROM payment_requests WHERE id = $1',
    [id]
  );
  if (currentReq.rows.length === 0) return { success: false, error: 'Request not found' };

  const reqRow = currentReq.rows[0];

  // Resolve current user department, branch, and check direct subordinate relationship
  let userDept = '';
  let userBranch = '';
  let isDirectSupervisor = false;
  try {
    const profile = await getUserProfileDetails(currentUser.id, currentUser.employeeId);
    userDept = profile.defaultDept;
    userBranch = profile.defaultBranch;
    if (currentUser.employeeId) {
      const { teraDb } = await import('@/app/lib/teraDb');
      const directSub = await teraDb.employees.findFirst({
        where: {
          supervisor_id: currentUser.employeeId,
          name: { contains: reqRow.requester_name?.trim() },
        },
      });
      if (directSub) isDirectSupervisor = true;
    }
  } catch (e) {
    console.warn('Error verifying supervisor department / hierarchy:', e);
  }

  const auth = canSupervisorApproveRequest({
    userRole: currentUser.role,
    userDepartment: userDept,
    userBranch: userBranch,
    userId: currentUser.id,
    userFullName: currentUser.fullName,
    userEmployeeId: currentUser.employeeId,
    requestRequesterId: reqRow.requester_id,
    requestRequesterName: reqRow.requester_name,
    requestDepartment: reqRow.requester_department,
    requestBranch: reqRow.branch,
    requestAssignedSupervisorId: reqRow.assigned_supervisor_id,
    requestAssignedSupervisorName: reqRow.assigned_supervisor_name,
    isDirectSupervisor,
  });

  if (!auth.canApprove) {
    return {
      success: false,
      error: auth.reason || `ไม่มีสิทธิ์: เฉพาะหัวหน้างานฝ่าย ${reqRow.requester_department || 'ที่เกี่ยวข้อง'} สาขา ${reqRow.branch || ''} เท่านั้นที่สามารถอนุมัติได้`,
    };
  }

  const prevStatus = reqRow.status;
  const approverName = data.approvedBy || currentUser.fullName;

  await pool.query(
    `UPDATE payment_requests
     SET status = 'SUBMITTED',
         supervisor_checked_by = $1,
         supervisor_checked_at = NOW(),
         supervisor_notes = $2,
         supervisor_signature_url = COALESCE($3, supervisor_signature_url),
         updated_at = NOW()
     WHERE id = $4`,
    [approverName, data.notes || 'หัวหน้างานอนุมัติส่งฝ่ายบัญชี', data.signatureUrl || null, id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'SUPERVISOR_APPROVED', $2, $3, 'SUBMITTED', $4)`,
    [id, approverName, prevStatus, data.notes ? `หัวหน้างานอนุมัติส่งฝ่ายบัญชี: ${data.notes}` : 'หัวหน้างานตรวจสอบความถูกต้องและอนุมัติส่งฝ่ายบัญชี (AP)']
  );

  revalidatePath('/accounting/payment-requests');
  revalidatePath(`/accounting/payment-requests/${id}`);
  return { success: true };
}

// Department Supervisor Return (Send back to Requester for revision)
export async function supervisorReturnPaymentRequest(
  id: string,
  data: {
    reason: string;
    returnedBy?: string;
  }
) {
  const currentUser = await getUser();
  if (!currentUser) {
    return {
      success: false,
      error: 'ไม่มีสิทธิ์: กรุณาเข้าสู่ระบบก่อนทำรายการ',
    };
  }

  const pool = getPool();
  const currentReq = await pool.query(
    'SELECT status, pay_number, company, branch, requester_id, requester_name, requester_department, assigned_supervisor_id, assigned_supervisor_name FROM payment_requests WHERE id = $1',
    [id]
  );
  if (currentReq.rows.length === 0) return { success: false, error: 'Request not found' };

  const reqRow = currentReq.rows[0];

  // Resolve current user department, branch, and check direct subordinate relationship
  let userDept = '';
  let userBranch = '';
  let isDirectSupervisor = false;
  try {
    const profile = await getUserProfileDetails(currentUser.id, currentUser.employeeId);
    userDept = profile.defaultDept;
    userBranch = profile.defaultBranch;
    if (currentUser.employeeId) {
      const { teraDb } = await import('@/app/lib/teraDb');
      const directSub = await teraDb.employees.findFirst({
        where: {
          supervisor_id: currentUser.employeeId,
          name: { contains: reqRow.requester_name?.trim() },
        },
      });
      if (directSub) isDirectSupervisor = true;
    }
  } catch (e) {
    console.warn('Error verifying supervisor department / hierarchy:', e);
  }

  const auth = canSupervisorApproveRequest({
    userRole: currentUser.role,
    userDepartment: userDept,
    userBranch: userBranch,
    userId: currentUser.id,
    userFullName: currentUser.fullName,
    userEmployeeId: currentUser.employeeId,
    requestRequesterId: reqRow.requester_id,
    requestRequesterName: reqRow.requester_name,
    requestDepartment: reqRow.requester_department,
    requestBranch: reqRow.branch,
    requestAssignedSupervisorId: reqRow.assigned_supervisor_id,
    requestAssignedSupervisorName: reqRow.assigned_supervisor_name,
    isDirectSupervisor,
  });

  if (!auth.canApprove) {
    return {
      success: false,
      error: auth.reason || `ไม่มีสิทธิ์: เฉพาะหัวหน้างานฝ่าย ${reqRow.requester_department || 'ที่เกี่ยวข้อง'} สาขา ${reqRow.branch || ''} เท่านั้นที่สามารถส่งคืนคำขอนี้ได้`,
    };
  }

  const prevStatus = reqRow.status;
  const returnerName = data.returnedBy || currentUser.fullName;

  await pool.query(
    `UPDATE payment_requests
     SET status = 'RETURN_DOCUMENT',
         supervisor_checked_by = $1,
         supervisor_checked_at = NOW(),
         supervisor_notes = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [returnerName, data.reason, id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'SUPERVISOR_RETURNED', $2, $3, 'RETURN_DOCUMENT', $4)`,
    [id, returnerName, prevStatus, `หัวหน้างานส่งคืนแก้ไข: ${data.reason}`]
  );

  revalidatePath('/accounting/payment-requests');
  revalidatePath(`/accounting/payment-requests/${id}`);
  return { success: true };
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
  const currentUser = await getUser();
  if (!currentUser || !isAccountingStaff(currentUser.role)) {
    return {
      success: false,
      error: 'ไม่มีสิทธิ์: เฉพาะฝ่ายบัญชีเจ้าหนี้ (AP) หรือผู้มีสิทธิ์ฝ่ายบัญชีเท่านั้นที่สามารถตรวจสอบขั้นตอนนี้ได้',
    };
  }

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

  const apLogNote = data.status === 'RETURN_DOCUMENT'
    ? (data.notes ? `AP ส่งคืนแก้ไขเอกสาร: ${data.notes}` : 'AP ส่งคืนแก้ไขเอกสาร')
    : (data.notes || 'AP ดำเนินการตรวจสอบเอกสารและภาษี');

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'AP_CHECKED', $2, $3, $4, $5)`,
    [id, data.checkedBy, prevStatus, data.status, apLogNote]
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
         accounting_manager_checked_by = $2,
         accounting_manager_checked_at = NOW(),
         accounting_manager_notes = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [data.status, data.reviewedBy, data.notes || null, id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'ACCOUNTING_MANAGER_CHECKED', $2, $3, $4, $5)`,
    [id, data.reviewedBy, prevStatus, data.status, data.notes || 'ผู้จัดการฝ่ายบัญชีสอบทานรายการ']
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
  const currentUser = await getUser();
  if (!currentUser || !isAccountingManager(currentUser.role)) {
    return {
      success: false,
      error: 'เฉพาะผู้จัดการฝ่ายบัญชี (Accounting Manager) หรือผู้มีอำนาจอนุมัติเท่านั้นที่มีสิทธิ์อนุมัติการจ่ายเงิน',
    };
  }

  const pool = getPool();
  const reqRes = await pool.query('SELECT net_amount, status FROM payment_requests WHERE id = $1', [id]);
  if (reqRes.rows.length === 0) return { success: false, error: 'Request not found' };

  const prevStatus = reqRes.rows[0].status;

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
  const currentUser = await getUser();
  if (!currentUser || !isAccountingStaff(currentUser.role)) {
    return {
      success: false,
      error: 'ไม่มีสิทธิ์: เฉพาะฝ่ายการเงิน/บัญชีเท่านั้นที่สามารถบันทึกการจ่ายเงินได้',
    };
  }

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
  const currentUser = await getUser();
  if (!currentUser || !isAccountingStaff(currentUser.role)) {
    return {
      success: false,
      error: 'ไม่มีสิทธิ์: เฉพาะฝ่ายบัญชีเท่านั้นที่สามารถบันทึกลงโปรแกรมบัญชี Express/Odoo ได้',
    };
  }

  const pool = getPool();
  const reqRes = await pool.query('SELECT status, original_received_at FROM payment_requests WHERE id = $1', [id]);
  if (reqRes.rows.length === 0) return { success: false, error: 'Request not found' };
  const prevStatus = reqRes.rows[0].status;
  const hasOriginal = !!reqRes.rows[0].original_received_at;
  const newStatus = hasOriginal ? 'CLOSED' : 'POSTED_TO_GL';

  await pool.query(
    `UPDATE payment_requests
     SET status = $1,
         gl_voucher_no = $2,
         gl_posted_by = $3,
         gl_posted_at = NOW(),
         gl_notes = $4,
         updated_at = NOW()
     WHERE id = $5`,
    [newStatus, data.glVoucherNo.trim(), data.glPostedBy, data.glNotes || null, id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'POSTED_TO_GL', $2, $3, $4, $5)`,
    [id, data.glPostedBy, prevStatus, newStatus, `บันทึกบัญชี Express/Odoo เรียบร้อยแล้ว เลขที่ใบสำคัญ: ${data.glVoucherNo}${hasOriginal ? ' (ได้รับเอกสารตัวจริงแล้ว - ปิดรายการสมบูรณ์)' : ''}`]
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
  const currentUser = await getUser();
  if (!currentUser || !isAccountingStaff(currentUser.role)) {
    return {
      success: false,
      error: 'ไม่มีสิทธิ์: เฉพาะฝ่ายบัญชีเท่านั้นที่สามารถบันทึกรับเอกสารตัวจริงได้',
    };
  }

  const pool = getPool();
  const reqRes = await pool.query('SELECT status, gl_voucher_no, gl_posted_at FROM payment_requests WHERE id = $1', [id]);
  if (reqRes.rows.length === 0) return { success: false, error: 'Request not found' };
  const prevStatus = reqRes.rows[0].status;
  const hasGL = !!(reqRes.rows[0].gl_voucher_no || reqRes.rows[0].gl_posted_at || reqRes.rows[0].status === 'POSTED_TO_GL');
  const newStatus = hasGL ? 'CLOSED' : 'ORIGINAL_RECEIVED';

  const defaultStamp = `RECEIVED ORIGINAL/PAID - ${new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}`;
  const finalStamp = data.stampText?.trim() || defaultStamp;

  await pool.query(
    `UPDATE payment_requests
     SET original_received_by = $1,
         original_received_at = NOW(),
         original_stamp_text = $2,
         original_notes = $3,
         status = $4,
         updated_at = NOW()
     WHERE id = $5`,
    [data.originalReceivedBy, finalStamp, data.notes || null, newStatus, id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'ORIGINAL_RECEIVED', $2, $3, $4, $5)`,
    [id, data.originalReceivedBy, prevStatus, newStatus, `ได้รับเอกสารตัวจริงแล้ว ปั๊มตรา: "${finalStamp}" โดย ${data.originalReceivedBy}${hasGL ? ' (ลงบัญชี GL เรียบร้อย - ปิดรายการสมบูรณ์)' : ''}`]
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
  const currentUser = await getUser();
  if (!currentUser) return { success: false, error: 'Unauthorized' };

  const pool = getPool();
  const reqRes = await pool.query('SELECT status, pay_number, requester_id, requester_name FROM payment_requests WHERE id = $1', [id]);
  if (reqRes.rows.length === 0) return { success: false, error: 'Request not found' };
  const current = reqRes.rows[0];

  const isStaff = isAccountingStaff(currentUser.role);
  const isOwner = current.requester_id === currentUser.id || current.requester_name === currentUser.fullName;

  if (!isStaff && !isOwner) {
    return { success: false, error: 'ไม่มีสิทธิ์: คุณสามารถยกเลิกได้เฉพาะคำขอของตนเองเท่านั้น' };
  }

  const prevStatus = current.status;
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
  newAttachments: (AttachmentCheckItem & { url: string; fileType?: string })[],
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

// Resubmit Payment Request after revision
export async function resubmitPaymentRequest(
  id: string,
  data?: {
    notes?: string;
    resubmittedBy?: string;
  }
) {
  const currentUser = await getUser();
  if (!currentUser) return { success: false, error: 'Unauthorized' };

  const pool = getPool();
  const reqRes = await pool.query(
    'SELECT status, pay_number, requester_id, requester_name, ap_checked_by, supervisor_checked_by FROM payment_requests WHERE id = $1',
    [id]
  );
  if (reqRes.rows.length === 0) return { success: false, error: 'Request not found' };

  const current = reqRes.rows[0];
  const isStaff = isAccountingStaff(currentUser.role);
  const isOwner =
    (currentUser.id && current.requester_id === currentUser.id) ||
    (currentUser.fullName && current.requester_name?.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase());

  if (!isStaff && !isOwner) {
    return { success: false, error: 'ไม่มีสิทธิ์: เฉพาะผู้ขอเบิกหรือเจ้าหน้าที่ฝ่ายบัญชีเท่านั้นที่สามารถส่งตรวจคำขอนี้ได้' };
  }

  if (current.status !== 'RETURN_DOCUMENT' && current.status !== 'DRAFT') {
    return { success: false, error: `คำขอนี้อยู่ในสถานะ "${current.status}" ไม่สามารถส่งตรวจใหม่ได้` };
  }

  // If AP had already checked it before returning, it goes back directly to SUBMITTED (AP review)
  // If only supervisor had checked it (or neither), and requester is not manager, it goes to PENDING_SUPERVISOR
  let targetStatus = 'SUBMITTED';
  const role = currentUser.role || '';
  if (!isSupervisorOrManager(role) && !current.supervisor_checked_by && !current.ap_checked_by) {
    targetStatus = 'PENDING_SUPERVISOR';
  } else if (current.ap_checked_by) {
    targetStatus = 'SUBMITTED';
  }

  const resubmitter = data?.resubmittedBy || currentUser.fullName;
  const resubmitNote = data?.notes ? `ผู้ขอเบิกแก้ไขข้อมูลและส่งตรวจอีกครั้ง: ${data.notes}` : 'ผู้ขอเบิกแก้ไขข้อมูลและส่งตรวจอีกครั้ง';

  await pool.query(
    `UPDATE payment_requests
     SET status = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [targetStatus, id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, from_status, to_status, notes)
     VALUES ($1, 'RESUBMITTED', $2, $3, $4, $5)`,
    [id, resubmitter, current.status, targetStatus, resubmitNote]
  );

  revalidatePath('/accounting/payment-requests');
  revalidatePath(`/accounting/payment-requests/${id}`);
  return { success: true, targetStatus };
}

// Update Requisition Details when in editable states (e.g. RETURN_DOCUMENT, DRAFT)
export async function updatePaymentRequestRequisition(
  id: string,
  data: {
    purpose?: string;
    invoice_number?: string | null;
    has_no_doc_number?: boolean;
    supplier_name?: string;
    supplier_tax_id?: string | null;
    document_date?: string;
    requested_payment_date?: string | null;
    subtotal_amount?: number;
    vat_type?: string;
    vat_amount?: number;
    wht_type?: string;
    wht_percent?: number;
    wht_amount?: number;
    net_amount?: number;
    cost_center?: string | null;
    po_pr_number?: string | null;
    urgency?: string;
    items?: RequisitionItem[];
    updated_by: string;
  }
) {
  const currentUser = await getUser();
  if (!currentUser) return { success: false, error: 'Unauthorized' };

  const pool = getPool();
  const reqRes = await pool.query(
    'SELECT status, pay_number, requester_id, requester_name FROM payment_requests WHERE id = $1',
    [id]
  );
  if (reqRes.rows.length === 0) return { success: false, error: 'Request not found' };

  const current = reqRes.rows[0];
  const isStaff = isAccountingStaff(currentUser.role);
  const isOwner =
    (currentUser.id && current.requester_id === currentUser.id) ||
    (currentUser.fullName && current.requester_name?.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase());

  if (!isStaff && !isOwner) {
    return { success: false, error: 'ไม่มีสิทธิ์แก้ไขคำขอนี้' };
  }

  if (!isStaff && !['RETURN_DOCUMENT', 'DRAFT', 'PENDING_SUPERVISOR', 'SUBMITTED'].includes(current.status)) {
    return { success: false, error: `ไม่สามารถแก้ไขข้อมูลได้ในสถานะ "${current.status}"` };
  }

  const itemsJson = data.items ? JSON.stringify(data.items) : null;

  await pool.query(
    `UPDATE payment_requests
     SET purpose = COALESCE($1, purpose),
         invoice_number = $2,
         has_no_doc_number = COALESCE($3, has_no_doc_number),
         supplier_name = COALESCE($4, supplier_name),
         supplier_tax_id = $5,
         document_date = COALESCE($6, document_date),
         requested_payment_date = $7,
         subtotal_amount = COALESCE($8, subtotal_amount),
         vat_type = COALESCE($9, vat_type),
         vat_amount = COALESCE($10, vat_amount),
         wht_type = COALESCE($11, wht_type),
         wht_percent = COALESCE($12, wht_percent),
         wht_amount = COALESCE($13, wht_amount),
         net_amount = COALESCE($14, net_amount),
         cost_center = $15,
         po_pr_number = $16,
         urgency = COALESCE($17, urgency),
         items = CASE WHEN $18::jsonb IS NOT NULL THEN $18::jsonb ELSE items END,
         updated_at = NOW()
     WHERE id = $19`,
    [
      data.purpose,
      data.has_no_doc_number ? null : (data.invoice_number || null),
      data.has_no_doc_number,
      data.supplier_name,
      data.supplier_tax_id || null,
      data.document_date,
      data.requested_payment_date || null,
      data.subtotal_amount,
      data.vat_type,
      data.vat_amount,
      data.wht_type,
      data.wht_percent,
      data.wht_amount,
      data.net_amount,
      data.cost_center || null,
      data.po_pr_number || null,
      data.urgency,
      itemsJson,
      id,
    ]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, notes)
     VALUES ($1, 'UPDATED', $2, $3)`,
    [id, data.updated_by, 'แก้ไขรายละเอียดคำขอเบิกจ่าย']
  );

  revalidatePath('/accounting/payment-requests');
  revalidatePath(`/accounting/payment-requests/${id}`);
  return { success: true };
}

// Delete single attachment
export async function deletePaymentRequestAttachment(
  id: string,
  attachmentIndex: number,
  userName: string
) {
  const pool = getPool();
  const reqRes = await pool.query('SELECT attachments FROM payment_requests WHERE id = $1', [id]);
  if (reqRes.rows.length === 0) return { success: false, error: 'Request not found' };

  const existing = Array.isArray(reqRes.rows[0].attachments) ? [...reqRes.rows[0].attachments] : [];
  if (attachmentIndex < 0 || attachmentIndex >= existing.length) {
    return { success: false, error: 'Invalid attachment index' };
  }

  const removed = existing.splice(attachmentIndex, 1);

  await pool.query(
    `UPDATE payment_requests
     SET attachments = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(existing), id]
  );

  await pool.query(
    `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, notes)
     VALUES ($1, 'ATTACHMENT_DELETED', $2, $3)`,
    [id, userName, `ลบเอกสารแนบ "${removed[0]?.fileName || 'เอกสาร'}"`]
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
  let supervisorName = '';
  let supervisorEmpId = '';

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
        if (emp.supervisor_id) {
          const sup = await teraDb.employees.findUnique({
            where: { emp_id: emp.supervisor_id },
          });
          if (sup?.name) {
            supervisorName = sup.name;
            supervisorEmpId = sup.emp_id;
          }
        }
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

  return { defaultBranch, defaultDept, defaultPhone, supervisorName, supervisorEmpId };
}

export async function deletePaymentRequest(id: string) {
  const currentUser = await getUser();
  if (!currentUser || !isAccountingManager(currentUser.role)) {
    return {
      success: false,
      error: 'ไม่มีสิทธิ์: เฉพาะผู้จัดการฝ่ายบัญชี (Accounting Manager) หรือ Super Admin เท่านั้นที่สามารถลบรายการได้',
    };
  }

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

// Update payment request digital signatures (Prepared by, Supervisor, Verified by, Approved by) and signer names
export async function updatePaymentRequestSignatures(
  id: string,
  signatures: {
    preparedBy?: string | null;
    supervisorApprovedBy?: string | null;
    verifiedBy?: string | null;
    approvedBy?: string | null;
    supervisorCheckedBy?: string | null;
    supervisorCheckedAt?: string | null;
    accountingManagerCheckedBy?: string | null;
    accountingManagerCheckedAt?: string | null;
    apCheckedBy?: string | null;
    apCheckedAt?: string | null;
    approvedByName?: string | null;
    approvedAt?: string | null;
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
    if (signatures.supervisorApprovedBy !== undefined) {
      fields.push(`supervisor_signature_url = $${idx++}`);
      values.push(signatures.supervisorApprovedBy);
    }
    if (signatures.verifiedBy !== undefined) {
      fields.push(`ap_signature_url = $${idx++}`);
      values.push(signatures.verifiedBy);
    }
    if (signatures.approvedBy !== undefined) {
      fields.push(`approver_signature_url = $${idx++}`);
      values.push(signatures.approvedBy);
    }
    if (signatures.supervisorCheckedBy !== undefined) {
      fields.push(`supervisor_checked_by = $${idx++}`);
      values.push(signatures.supervisorCheckedBy);
    }
    if (signatures.supervisorCheckedAt !== undefined) {
      fields.push(`supervisor_checked_at = $${idx++}`);
      values.push(signatures.supervisorCheckedAt);
    }
    if (signatures.accountingManagerCheckedBy !== undefined) {
      fields.push(`accounting_manager_checked_by = $${idx++}`);
      values.push(signatures.accountingManagerCheckedBy);
    }
    if (signatures.accountingManagerCheckedAt !== undefined) {
      fields.push(`accounting_manager_checked_at = $${idx++}`);
      values.push(signatures.accountingManagerCheckedAt);
    }
    if (signatures.apCheckedBy !== undefined) {
      fields.push(`ap_checked_by = $${idx++}`);
      values.push(signatures.apCheckedBy);
    }
    if (signatures.apCheckedAt !== undefined) {
      fields.push(`ap_checked_at = $${idx++}`);
      values.push(signatures.apCheckedAt);
    }
    if (signatures.approvedByName !== undefined) {
      fields.push(`approved_by = $${idx++}`);
      values.push(signatures.approvedByName);
    }
    if (signatures.approvedAt !== undefined) {
      fields.push(`approved_at = $${idx++}`);
      values.push(signatures.approvedAt);
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

// Update Requested Due Date (specifically for Accounting Role / Admin)
export async function updateRequestedPaymentDate(
  id: string,
  data: {
    requested_payment_date?: string | null;
    updated_by: string;
    reason?: string;
  }
) {
  const currentUser = await getUser();
  if (!currentUser) return { success: false, error: 'Unauthorized' };

  const isAccounting =
    isAccountingStaff(currentUser.role) ||
    isAccountingManager(currentUser.role) ||
    isSuperUser(currentUser.role);

  if (!isAccounting) {
    return {
      success: false,
      error: 'สิทธิ์เฉพาะฝ่ายบัญชีหรือผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขวันที่ต้องการให้จ่ายได้',
    };
  }

  const pool = getPool();
  try {
    const reqRes = await pool.query(
      'SELECT id, pay_number, status, requested_payment_date FROM payment_requests WHERE id = $1',
      [id]
    );
    if (reqRes.rows.length === 0) return { success: false, error: 'ไม่พบรายการคำขอเบิกจ่าย' };

    const current = reqRes.rows[0];
    if (current.status === 'CANCELLED') {
      return { success: false, error: 'ไม่สามารถแก้ไขวันที่ต้องการให้จ่ายของคำขอที่ยกเลิกแล้วได้' };
    }

    const prevDateStr = toDateString(current.requested_payment_date) || 'ไม่ได้ระบุ';
    const newDateVal = data.requested_payment_date ? toDateString(data.requested_payment_date) : null;
    const newDateStr = newDateVal || 'ไม่ได้ระบุ';

    await pool.query(
      `UPDATE payment_requests
       SET requested_payment_date = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [newDateVal, id]
    );

    // Audit log
    const reasonText = data.reason?.trim() ? ` (เหตุผล: ${data.reason.trim()})` : '';
    const note = `แก้ไขวันที่ต้องการให้จ่าย (Due Date): จาก ${prevDateStr} เป็น ${newDateStr}${reasonText}`;
    await pool.query(
      `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, notes)
       VALUES ($1, 'UPDATE_DUE_DATE', $2, $3)`,
      [id, data.updated_by || currentUser.fullName || 'ฝ่ายบัญชี', note]
    );

    revalidatePath(`/accounting/payment-requests/${id}`);
    revalidatePath('/accounting/payment-requests');

    return { success: true, requested_payment_date: newDateVal };
  } catch (err: any) {
    console.error('Failed to update requested payment date:', err);
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกวันที่' };
  }
}

