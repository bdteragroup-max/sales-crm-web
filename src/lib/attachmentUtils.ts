export interface AttachmentCheckItem {
  fileName?: string;
  fileHash?: string;
  visualHash?: string;
  fileSize?: number;
  qrPayload?: string;
  barcode?: string;
  extractedTaxId?: string;
  extractedInvoiceNo?: string;
  extractedAmount?: number;
  extractedDate?: string;
  extractedSupplier?: string;
}

export function normalizeAttachmentName(name?: string | null): string {
  if (!name) return '';
  let base = name.replace(/\.[a-zA-Z0-9]+$/, '').trim();
  base = base.replace(/(_\d{1,2}|\s*\(\d+\)|\s*-\s*copy(\s*\d+)?|\s*copy(\s*\d+)?)$/i, '').trim();
  return base.toLowerCase();
}

export const GENERIC_ATTACHMENT_STEMS = new Set([
  'image', 'img', 'photo', 'scan', 'doc', 'document', 'file', 'screenshot',
  'receipt', 'download', 'untitled', 'camscanner', 'invoice', 'slip'
]);

export function isDistinctiveAttachmentName(normName: string): boolean {
  if (!normName || normName.length < 4) return false;
  if (GENERIC_ATTACHMENT_STEMS.has(normName)) return false;
  return /\d/.test(normName) || normName.length >= 6;
}

export function visualHammingDistance(h1?: string | null, h2?: string | null): number {
  if (!h1 || !h2 || h1.length !== 16 || h2.length !== 16) return 999;
  let dist = 0;
  for (let i = 0; i < 16; i++) {
    let xor = parseInt(h1[i], 16) ^ parseInt(h2[i], 16);
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

export function normalizeInvoiceNo(inv?: string | null): string {
  if (!inv) return '';
  return inv.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export function extractDocumentFields(text?: string | null): {
  taxId: string | null;
  invoiceNo: string | null;
  amount: number | null;
  date: string | null;
  supplier: string | null;
} {
  if (!text) {
    return { taxId: null, invoiceNo: null, amount: null, date: null, supplier: null };
  }

  const clean = text.replace(/\r/g, ' ');

  // 1. Tax ID (13 digits)
  let taxId: string | null = null;
  const taxIdMatches = clean.match(/(?:เลขประจำตัวผู้เสียภาษี(?:อากร)?|Tax\s*(?:ID|No|Identification)|เลขประจำตัว|TAX\s*ID\s*#)[\s:：#\.\-]*([0-9]{13}|[0-9]{1}[\s\-][0-9]{4}[\s\-][0-9]{5}[\s\-][0-9]{2}[\s\-][0-9]{1})/i);
  if (taxIdMatches) {
    taxId = taxIdMatches[1].replace(/[\s\-]/g, '');
  } else {
    // Standalone 13 digits fallback
    const any13 = clean.match(/\b([0-9]{13})\b/);
    if (any13) taxId = any13[1];
  }

  // 2. Invoice / Receipt Number
  let invoiceNo: string | null = null;
  // Look for standard invoice prefixes followed by colon/separator
  const invMatches = clean.match(/(?:เลขที่(?:\s*ใบกำกับภาษี|\s*ใบเสร็จ|\s*เอกสาร|\s*บิล)?|Invoice\s*(?:No|Number|\#|\.)|Receipt\s*(?:No|\#|\.)|Bill\s*(?:No|\#|\.)|Doc\s*(?:No|\#|\.)|TAX\s*INVOICE\s*NO\.?|INV\s*NO\.?)[\s:：#\.\-]+([A-Za-z0-9\/\-_]{3,30})/i);
  if (invMatches && !/^(?:invoice|receipt|tax|abb|original|copy)$/i.test(invMatches[1].trim())) {
    invoiceNo = invMatches[1].trim();
  }

  // Fallback: search for standard formatted invoice IDs containing letters and numbers (e.g. INV-2026-99182, ABB-12345)
  if (!invoiceNo) {
    const formatMatch = clean.match(/\b(INV[0-9\-_]{3,20}|IV[0-9\-_]{3,20}|ABB[0-9\-_]{3,20}|POS[0-9\-_]{3,20}|RC[0-9\-_]{3,20})\b/i);
    if (formatMatch) {
      invoiceNo = formatMatch[1].trim();
    }
  }

  // 3. Net / Total Amount
  let amount: number | null = null;
  const amtMatches = clean.match(/(?:รวมทั้งสิ้น|ยอดรวมสุทธิ|ยอดชำระ|จำนวนเงินรวม|ยอดเงินสุทธิ|Grand\s*Total|Total\s*Amount|Net\s*Amount|TOTAL|NET)[\s:：#\.\-]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/i);
  if (amtMatches) {
    amount = parseFloat(amtMatches[1].replace(/,/g, ''));
  }

  // 4. Date
  let date: string | null = null;
  const dateMatch = clean.match(/(?:วันที่|Date)[\s:：#\.\-]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i);
  if (dateMatch) {
    date = dateMatch[1].trim();
  } else {
    const rawDate = clean.match(/\b([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.](?:20[2-3][0-9]|25[6-7][0-9]))\b/);
    if (rawDate) {
      date = rawDate[1].trim();
    }
  }

  // 5. Supplier / Store Name
  let supplier: string | null = null;
  const supplierMatch = clean.match(/(?:บริษัท\s+[^\n\r,]+(?:\s+จำกัด(?:\s*\(มหาชน\))?)?|ห้างหุ้นส่วนจำกัด\s+[^\n\r,]+|บจก\.\s+[^\n\r,]+|หจก\.\s+[^\n\r,]+)/);
  if (supplierMatch) {
    supplier = supplierMatch[0].trim();
  }

  return { taxId, invoiceNo, amount, date, supplier };
}
