import {
  type AttachmentCheckItem,
  formatDateToISO,
  hasDistinctActivitySubject,
  isDistinctiveAttachmentName,
  isSystemSubstituteCertificate,
  normalizeAttachmentName,
  normalizeInvoiceNo,
  visualHammingDistance,
} from '@/lib/attachmentUtils';

export interface ExistingRowItem {
  description?: string | null;
  supplierName?: string | null;
  amount?: number | string | null;
  billDate?: string | null;
}

export interface ExistingRowContext {
  id: string;
  pay_number: string;
  company?: string;
  branch?: string;
  supplier_name?: string | null;
  supplier_tax_id?: string | null;
  invoice_number?: string | null;
  net_amount?: number | string | null;
  document_date?: string | Date | null;
  purpose?: string | null;
  items?: ExistingRowItem[];
}

export interface AttachmentMatchEvaluation {
  matchType: string;
  severity: 'EXACT' | 'POSSIBLE';
  reason: string;
}

function toIsoDate(d: unknown): string | null {
  if (!d) return null;
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const iso = formatDateToISO(String(d));
  if (iso) return iso;
  const s = String(d);
  return s.includes('T') ? s.split('T')[0] : s;
}

function collectRowSubjectText(att: AttachmentCheckItem, row: ExistingRowContext): string {
  const parts: string[] = [];
  if (att?.extractedDescription) parts.push(String(att.extractedDescription));
  if (row.purpose) parts.push(String(row.purpose));
  if (Array.isArray(row.items)) {
    for (const it of row.items) {
      if (it?.description) parts.push(String(it.description));
    }
  }
  return parts.join(' ').trim();
}

export function isRecordInvoiceCorroborated(
  item: AttachmentCheckItem,
  recTaxId: string | null | undefined,
  recAmt: number | undefined,
  recSupplier: string | null | undefined
): boolean {
  const cleanTax = (recTaxId || '').replace(/\D/g, '');
  const taxMatch = !!(item.extractedTaxId && cleanTax && item.extractedTaxId === cleanTax);
  const effItemAmt = item.extractedAmount ?? item.currentAmount;
  const amtMatch = !!(effItemAmt !== undefined && recAmt !== undefined && recAmt > 0 && Math.abs(effItemAmt - recAmt) < 1.0);
  const effItemSupp = (item.currentSupplier || item.extractedSupplier || '').trim().toLowerCase();
  const effRecSupp = (recSupplier || '').trim().toLowerCase();
  const suppMatch = !!(
    effItemSupp.length >= 3 &&
    effRecSupp.length >= 3 &&
    (effItemSupp.includes(effRecSupp) || effRecSupp.includes(effItemSupp))
  );
  return taxMatch || amtMatch || suppMatch;
}

/**
 * Evaluates a candidate attachment against an existing attachment in a DB payment request.
 * Keeps cryptographic/QR/barcode/OCR-invoice proof strict while preventing false-positive
 * blocks across recurring same-activity claims (such as generated บก.111 certificates or
 * shared template layouts for different employees/vehicles/dates).
 */
export function evaluateAttachmentCandidateMatch(
  item: AttachmentCheckItem,
  att: AttachmentCheckItem,
  row: ExistingRowContext
): AttachmentMatchEvaluation | null {
  const isSubCert = isSystemSubstituteCertificate(item) || isSystemSubstituteCertificate(att);

  // 0. QR Code / PromptPay Transfer Slip Payload Match (unique per bank transfer)
  if (item.qrPayload && att.qrPayload) {
    const qr1 = item.qrPayload.trim();
    const qr2 = String(att.qrPayload).trim();
    if (qr1 === qr2 || (qr1.length >= 15 && qr2.length >= 15 && (qr1.includes(qr2) || qr2.includes(qr1)))) {
      return {
        matchType: 'ATTACHMENT_QR',
        severity: 'EXACT',
        reason: `ตรวจพบรหัส QR Code/สลิปโอนเงินตรงกัน 100% (ตรงกับ "${att.fileName || 'เอกสารเดิม'}" แม้ถ่ายจากคนละกล้อง/ต่างมุม)`,
      };
    }
  }

  // 0.1 Barcode Match
  if (item.barcode && att.barcode && item.barcode.trim() === String(att.barcode).trim()) {
    return {
      matchType: 'ATTACHMENT_BARCODE',
      severity: 'EXACT',
      reason: `ตรวจพบบาร์โค้ดบนเอกสารตรงกัน (${item.barcode})`,
    };
  }

  // 0.2 OCR Invoice Number + Corroborated Tax ID / Amount / Supplier
  if (item.extractedInvoiceNo && att.extractedInvoiceNo) {
    const normInvIn = normalizeInvoiceNo(item.extractedInvoiceNo);
    const normInvAtt = normalizeInvoiceNo(att.extractedInvoiceNo);
    if (normInvIn.length >= 4 && normInvIn === normInvAtt) {
      const effAttAmt = att.extractedAmount ?? (row.net_amount ? Number(row.net_amount) : undefined);
      if (
        isRecordInvoiceCorroborated(
          item,
          att.extractedTaxId || row.supplier_tax_id,
          effAttAmt,
          att.extractedSupplier || row.supplier_name
        )
      ) {
        return {
          matchType: 'ATTACHMENT_OCR',
          severity: 'EXACT',
          reason: `ตรวจพบข้อมูล OCR เลขที่ใบกำกับภาษี "${item.extractedInvoiceNo}" ตรงกับเอกสาร "${att.fileName || 'เอกสารเดิม'}" (ถ่ายจากต่างกล้อง)`,
        };
      }
    }
  }

  const candSubjectText = [item.extractedDescription, item.currentPurpose].filter(Boolean).join(' ').trim();
  const attSubjectText = collectRowSubjectText(att, row);
  const subjectConflict = hasDistinctActivitySubject(candSubjectText, attSubjectText);

  const effItemAmt = item.currentAmount || item.extractedAmount;
  const effAttAmt = att.extractedAmount || (row.net_amount ? Number(row.net_amount) : undefined);
  const amtConflict = !!(
    effItemAmt !== undefined &&
    effAttAmt !== undefined &&
    Math.abs(effItemAmt - effAttAmt) >= 1.0
  );

  const itemExtDate = toIsoDate(item.extractedDate);
  const attExtDate = toIsoDate(att.extractedDate);
  const extractedDateConflict = !!(itemExtDate && attExtDate && itemExtDate !== attExtDate);

  const itemFormDate = itemExtDate || toIsoDate(item.currentDate);
  const attFormDate = attExtDate || toIsoDate(row.document_date);
  const anyDateConflict = !!(itemFormDate && attFormDate && itemFormDate !== attFormDate);

  // 1. Exact SHA-256 binary hash
  if (item.fileHash && att.fileHash && item.fileHash.toLowerCase() === String(att.fileHash).toLowerCase()) {
    // Generated บก.111 certificates with differing subjects/dates/amounts are separate claims
    if (isSubCert && (subjectConflict || anyDateConflict || amtConflict)) {
      return null;
    }
    return {
      matchType: 'ATTACHMENT_HASH',
      severity: 'EXACT',
      reason: `ไฟล์ดิจิทัลตรงกัน 100% (SHA-256 ตรงกับ "${att.fileName || 'เอกสารเดิม'}")`,
    };
  }

  // System-generated บก.111 certificates share standard templates & truncated filenames
  // so they must not trigger visual-layout or filename-similarity matches.
  if (isSubCert) {
    return null;
  }

  // 2. Conflict Detection before Visual / OCR-stamp / Filename heuristics
  const qrConflict = !!(item.qrPayload && att.qrPayload && item.qrPayload.trim() !== String(att.qrPayload).trim());
  const normItemInv = normalizeInvoiceNo(item.extractedInvoiceNo);
  const normAttInv = normalizeInvoiceNo(att.extractedInvoiceNo || row.invoice_number);
  const invConflict = !!(normItemInv.length >= 4 && normAttInv.length >= 4 && normItemInv !== normAttInv);

  const effItemSupp = (item.currentSupplier || item.extractedSupplier || '').trim().toLowerCase();
  const effAttSupp = (att.extractedSupplier || row.supplier_name || '').trim().toLowerCase();
  const suppConflict = !!(
    effItemSupp.length >= 4 &&
    effAttSupp.length >= 4 &&
    !effItemSupp.includes(effAttSupp) &&
    !effAttSupp.includes(effItemSupp)
  );

  const hasMajorConflict = qrConflict || invConflict || amtConflict;
  if (hasMajorConflict) {
    return null;
  }

  // Visual perceptual hash check
  let bestDist = 999;
  if (item.visualHash && att.visualHash) {
    bestDist = Math.min(bestDist, visualHammingDistance(item.visualHash, att.visualHash));
  }
  if (item.coreVisualHash && att.coreVisualHash) {
    bestDist = Math.min(bestDist, visualHammingDistance(item.coreVisualHash, att.coreVisualHash));
  }

  let sharedTokenCount = 0;
  if (
    Array.isArray(item.distinctiveTokens) &&
    Array.isArray(att.distinctiveTokens) &&
    item.distinctiveTokens.length > 0 &&
    att.distinctiveTokens.length > 0
  ) {
    const attTokenSet = new Set(att.distinctiveTokens.map((t: string) => String(t).toLowerCase()));
    sharedTokenCount = item.distinctiveTokens.filter((t) => attTokenSet.has(t.toLowerCase())).length;
  }

  const amtMatch = !!(effItemAmt !== undefined && effAttAmt !== undefined && Math.abs(effItemAmt - effAttAmt) < 0.1);
  const suppMatch = !!(effItemSupp && effAttSupp && (effItemSupp.includes(effAttSupp) || effAttSupp.includes(effItemSupp)));
  const phoneMatch = !!(item.extractedPhone && att.extractedPhone && item.extractedPhone === att.extractedPhone);

  // Tier A: Virtually Identical Pixels (diff <= 2 bits, >= 96.8%)
  if (bestDist <= 2 && !suppConflict) {
    const similarity = (((64 - bestDist) / 64) * 100).toFixed(1);
    if (subjectConflict || extractedDateConflict) {
      return {
        matchType: 'ATTACHMENT_VISUAL',
        severity: 'POSSIBLE',
        reason: `ภาพเอกสารคล้ายกับ "${att.fileName || 'เอกสารเดิม'}" (${similarity}%) แต่รายละเอียดกิจกรรม/ผู้รับหรือวันที่แตกต่างกัน`,
      };
    }
    return {
      matchType: 'ATTACHMENT_VISUAL',
      severity: 'EXACT',
      reason: `ตรวจพบรูปภาพเอกสารตรงกัน ${similarity}% (ตรงกับ "${att.fileName || 'เอกสารเดิม'}")`,
    };
  }

  // Tier B: Corroborated Visual Match (diff <= 8 bits, >= 87.5%) — requires same subject/date
  if (
    bestDist <= 8 &&
    !suppConflict &&
    !subjectConflict &&
    !extractedDateConflict &&
    (amtMatch || phoneMatch || (suppMatch && sharedTokenCount >= 2))
  ) {
    const similarity = (((64 - bestDist) / 64) * 100).toFixed(1);
    const extraDetails = [
      amtMatch ? `ยอดเงินตรงกัน (${Number(effAttAmt).toLocaleString()} ฿)` : '',
      suppMatch ? `ผู้ขายตรงกัน (${row.supplier_name})` : '',
      phoneMatch ? `เบอร์โทรตรายางร้านตรงกัน` : '',
      sharedTokenCount >= 2 ? `ข้อความบนบิลตรงกัน` : '',
    ]
      .filter(Boolean)
      .join(', ');
    return {
      matchType: 'ATTACHMENT_VISUAL_CONTEXT',
      severity: 'EXACT',
      reason: `ตรวจพบลักษณะเอกสารใกล้เคียงกัน ${similarity}% (${extraDetails}) ตรงกับคำขอเดิม (${row.pay_number})`,
    };
  }

  // Tier C: Distinctive Phone/Stamp Match + Same Exact Amount (when not different subject/date)
  if (phoneMatch && amtMatch && !subjectConflict && !extractedDateConflict) {
    return {
      matchType: 'ATTACHMENT_OCR',
      severity: 'EXACT',
      reason: `ตรวจพบเบอร์โทรบนตรายางร้าน (${item.extractedPhone}) และยอดเงิน (${effItemAmt} ฿) ตรงกับคำขอเดิม (${row.pay_number})`,
    };
  }

  // 3. Normalized Distinctive Filename + Similarity (circumstantial: POSSIBLE warning only)
  // Guarded against different SHA-256 hashes, suppliers, subjects, and dates.
  const diffFileHash = !!(
    item.fileHash &&
    att.fileHash &&
    item.fileHash.toLowerCase() !== String(att.fileHash).toLowerCase()
  );
  if (!diffFileHash && !suppConflict && !subjectConflict && !anyDateConflict && item.fileName && att.fileName) {
    const normIn = normalizeAttachmentName(item.fileName);
    const normAtt = normalizeAttachmentName(att.fileName);
    if (normIn && normIn === normAtt && isDistinctiveAttachmentName(normIn)) {
      if (item.visualHash && att.visualHash) {
        const dist = visualHammingDistance(item.visualHash, att.visualHash);
        if (dist <= 8) {
          return {
            matchType: 'ATTACHMENT_VISUAL',
            severity: 'EXACT',
            reason: `ตรวจพบชื่อเอกสารและลายนิ้วมือภาพตรงกับ "${att.fileName}"`,
          };
        }
      } else if (item.fileSize && att.fileSize) {
        const ratio = item.fileSize / att.fileSize;
        if (ratio >= 0.4 && ratio <= 2.5) {
          return {
            matchType: 'ATTACHMENT_NAME_SIMILAR',
            severity: 'POSSIBLE',
            reason: `ชื่อเอกสารตรงกัน (${att.fileName}) และขนาดไฟล์ใกล้เคียงกับคำขอเดิม (${row.pay_number})`,
          };
        }
      } else {
        return {
          matchType: 'ATTACHMENT_NAME_SIMILAR',
          severity: 'POSSIBLE',
          reason: `ชื่อเอกสารตรงกัน (${att.fileName}) กับคำขอเดิม (${row.pay_number})`,
        };
      }
    }
  }

  return null;
}

const NON_INVOICE_PLACEHOLDERS = new Set([
  'ไม่มี',
  'ไม่มีเลขที่',
  'ไม่ระบุ',
  'บก111',
  'none',
  'null',
  'na',
]);

/**
 * Returns true if the normalized invoice token represents a real document number
 * rather than a Thai/English "no document number" placeholder.
 */
export function isMeaningfulInvoiceToken(cleanInv?: string | null): boolean {
  if (!cleanInv || cleanInv.length < 3) return false;
  return !NON_INVOICE_PLACEHOLDERS.has(cleanInv.toLowerCase());
}

/**
 * Checks whether an amount+supplier+date match should still be raised as a
 * POSSIBLE duplicate warning, filtering out claims that explicitly name
 * different people, vehicle plates, job codes, or billing months.
 */
export function shouldWarnAmountAndDateMatch(
  candidateText?: string | null,
  existingPurpose?: string | null,
  existingMatchingItemDescriptions?: (string | undefined | null)[]
): boolean {
  const cand = (candidateText || '').trim();
  if (!cand) return true;

  if (existingMatchingItemDescriptions && existingMatchingItemDescriptions.length > 0) {
    const validExisting = existingMatchingItemDescriptions
      .map((d) => (d || '').trim())
      .filter((d) => d.length > 0);
    if (validExisting.length > 0) {
      return validExisting.some((d) => !hasDistinctActivitySubject(cand, d));
    }
  }

  const rowPurpose = (existingPurpose || '').trim();
  if (!rowPurpose) return true;
  return !hasDistinctActivitySubject(cand, rowPurpose);
}

