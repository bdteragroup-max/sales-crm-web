import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export type SupportedBankCode = 'KBANK' | 'SCB' | 'BBL' | 'KTB' | 'BAY' | 'TTB' | 'OTHER';

export interface BankStatementColumnMapping {
  headerRowIndex: number;
  dateCol: number;
  timeCol: number | null;
  creditCol: number | null;
  debitCol: number | null;
  amountCol: number | null;
  typeCol: number | null;
  balanceCol: number | null;
  descriptionCol: number | null;
  channelCol: number | null;
  referenceCol: number | null;
  counterpartyCol: number | null;
}

export interface ParsedBankTransactionRow {
  rowNumber: number;
  transactionDate: string; // YYYY-MM-DD
  transactionTime: string | null;
  txType: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number | null;
  channel: string | null;
  referenceNo: string | null;
  description: string;
  counterpartyName: string | null;
}

export interface ParsedBankStatementResult {
  fileName: string;
  sheetName: string | null;
  rawRows: string[][];
  headers: string[];
  mapping: BankStatementColumnMapping;
  detectedBankName: SupportedBankCode;
  detectedAccountNumber: string | null;
  detectedAccountName: string | null;
  rows: ParsedBankTransactionRow[];
  skippedRowsCount: number;
  totalCreditAmount: number;
  totalDebitAmount: number;
  creditCount: number;
  debitCount: number;
  periodStart: string | null;
  periodEnd: string | null;
}

const THAI_MONTH_MAP: Record<string, number> = {
  'ม.ค.': 1, 'มกราคม': 1, 'jan': 1, 'january': 1,
  'ก.พ.': 2, 'กุมภาพันธ์': 2, 'feb': 2, 'february': 2,
  'มี.ค.': 3, 'มีนาคม': 3, 'mar': 3, 'march': 3,
  'เม.ย.': 4, 'เมษายน': 4, 'apr': 4, 'april': 4,
  'พ.ค.': 5, 'พฤษภาคม': 5, 'may': 5,
  'มิ.ย.': 6, 'มิถุนายน': 6, 'jun': 6, 'june': 6,
  'ก.ค.': 7, 'กรกฎาคม': 7, 'jul': 7, 'july': 7,
  'ส.ค.': 8, 'สิงหาคม': 8, 'aug': 8, 'august': 8,
  'ก.ย.': 9, 'กันยายน': 9, 'sep': 9, 'sept': 9, 'september': 9,
  'ต.ค.': 10, 'ตุลาคม': 10, 'oct': 10, 'october': 10,
  'พ.ย.': 11, 'พฤศจิกายน': 11, 'nov': 11, 'november': 11,
  'ธ.ค.': 12, 'ธันวาคม': 12, 'dec': 12, 'december': 12,
};

function cleanCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const bangkokStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(v);
    const [rawY, mo, da] = bangkokStr.split('-');
    const yNum = Number(rawY);
    const y = yNum >= 2400 ? yNum - 543 : yNum;
    return `${y}-${mo}-${da}`;
  }
  return String(v).replace(/\u00a0/g, ' ').trim();
}

export function parseMoneyNumber(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  const str = cleanCell(raw);
  if (!str || str === '-' || str === '--') return null;

  let negative = false;
  let cleaned = str;
  if (/^\(.*\)$/.test(cleaned)) {
    negative = true;
    cleaned = cleaned.slice(1, -1);
  }
  cleaned = cleaned.replace(/[฿,\s]/g, '').replace(/THB/gi, '').trim();
  if (cleaned.startsWith('-')) {
    negative = true;
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return negative ? -num : num;
}

function normalizeYear(rawYear: number): number {
  if (rawYear >= 2400) return rawYear - 543;
  if (rawYear >= 0 && rawYear < 100) {
    // Handle 2-digit Thai BE year (e.g. 68, 69) vs AD year (25, 26)
    return rawYear >= 50 ? 2500 + rawYear - 543 : 2000 + rawYear;
  }
  return rawYear;
}

export function parseBankDateAndTime(rawDate: unknown, rawTime?: unknown): { date: string; time: string | null } | null {
  let timeStr = cleanCell(rawTime) || null;
  if (timeStr) {
    const timeMatch = timeStr.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
    timeStr = timeMatch ? timeMatch[1] : null;
  }

  if (typeof rawDate === 'number' && Number.isFinite(rawDate) && rawDate > 25000 && rawDate < 90000) {
    // Excel serial date number
    const parsed = XLSX.SSF.parse_date_code(rawDate);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const y = normalizeYear(parsed.y);
      const date = `${y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
      if (!timeStr && (parsed.H || parsed.M)) {
        timeStr = `${String(parsed.H || 0).padStart(2, '0')}:${String(parsed.M || 0).padStart(2, '0')}`;
      }
      return { date, time: timeStr };
    }
  }

  const text = cleanCell(rawDate);
  if (!text) return null;

  // Extract inline time if bundled inside date column
  let dateOnly = text;
  const inlineTimeMatch = text.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
  if (inlineTimeMatch) {
    if (!timeStr) timeStr = inlineTimeMatch[1];
    dateOnly = text.replace(inlineTimeMatch[0], '').trim();
  }

  // Match ISO YYYY-MM-DD or YYYY/MM/DD
  let m = dateOnly.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const y = normalizeYear(Number(m[1]));
    const mo = Number(m[2]);
    const da = Number(m[3]);
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      return { date: `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`, time: timeStr };
    }
  }

  // Match DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY
  m = dateOnly.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) {
    const da = Number(m[1]);
    const mo = Number(m[2]);
    const y = normalizeYear(Number(m[3]));
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      return { date: `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`, time: timeStr };
    }
  }

  // Match "25 Nov 2026" or "25 พ.ย. 2569"
  m = dateOnly.match(/^(\d{1,2})[\s-]+([^\s\d-]+)[\s-]+(\d{2,4})$/);
  if (m) {
    const da = Number(m[1]);
    const mo = THAI_MONTH_MAP[m[2].toLowerCase()];
    const y = normalizeYear(Number(m[3]));
    if (mo && da >= 1 && da <= 31) {
      return { date: `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`, time: timeStr };
    }
  }

  return null;
}

function matchHeaderScore(cell: string, patterns: RegExp[]): number {
  const lower = cell.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!lower) return 0;
  for (let i = 0; i < patterns.length; i++) {
    if (patterns[i].test(lower)) return patterns.length - i;
  }
  return 0;
}

const HEADER_RULES = {
  date: [/^(วันที่|date|trans(?:action)?\s*date|posting\s*date|วันทำรายการ)$/i, /วันที่|trans.*date|\bdate\b/i],
  time: [/^(เวลา|time|trans(?:action)?\s*time)$/i, /เวลา|\btime\b/i],
  credit: [/^(ฝาก|เงินเข้า|ฝากเงิน|credit(?:\s*amount)?|deposit(?:\s*amount)?|cash\s*in)$/i, /ฝาก|เงินเข้า|credit|deposit/i],
  debit: [/^(ถอน|เงินออก|ถอนเงิน|debit(?:\s*amount)?|withdrawal(?:\s*amount)?|cash\s*out)$/i, /ถอน|เงินออก|debit|withdraw/i],
  amount: [/^(จำนวนเงิน|ยอดเงิน|amount|trans(?:action)?\s*amount)$/i, /จำนวนเงิน|ยอดเงิน|amount/i],
  type: [/^(ประเภท|รายการฝาก\/ถอน|dr\/cr|dc|tx\s*type|type)$/i, /dr\/cr|ประเภท/i],
  balance: [/^(ยอดคงเหลือ|คงเหลือ|balance|ending\s*balance)$/i, /คงเหลือ|balance/i],
  description: [
    /^(รายละเอียด|คำอธิบาย|description|particulars|details|narrative|memo)$/i,
    /รายละเอียด|คำอธิบาย|description|particulars|details/i,
    /^(รายการ|transaction)$/i,
  ],
  channel: [/^(ช่องทาง|channel|สาขา\/เครื่อง|teller)$/i, /ช่องทาง|channel/i, /^รายการ$/i],
  reference: [/^(เลขอ้างอิง|เลขที่อ้างอิง|อ้างอิง|ref(?:erence)?(?:\s*no\.?)?|cheque\s*no\.?)$/i, /อ้างอิง|reference|\bref\b/i],
  counterparty: [/^(คู่ค้า|ผู้โอน|บัญชีปลายทาง\/ต้นทาง|จาก\/ถึง|counterparty|from\/to)$/i, /ผู้โอน|คู่ค้า|counterparty/i],
};

function detectColumnMapping(rawRows: string[][]): BankStatementColumnMapping {
  let bestRowIdx = 0;
  let bestTotalScore = -1;

  const limit = Math.min(rawRows.length, 30);
  for (let r = 0; r < limit; r++) {
    const row = rawRows[r] || [];
    const hasDate = row.some((c) => matchHeaderScore(c, HEADER_RULES.date) > 0);
    const hasAmt = row.some(
      (c) =>
        matchHeaderScore(c, HEADER_RULES.credit) > 0 ||
        matchHeaderScore(c, HEADER_RULES.debit) > 0 ||
        matchHeaderScore(c, HEADER_RULES.amount) > 0
    );
    let score = 0;
    if (hasDate) score += 10;
    if (hasAmt) score += 10;
    row.forEach((c) => {
      if (matchHeaderScore(c, HEADER_RULES.description) > 0) score += 3;
      if (matchHeaderScore(c, HEADER_RULES.balance) > 0) score += 3;
      if (matchHeaderScore(c, HEADER_RULES.time) > 0) score += 2;
      if (matchHeaderScore(c, HEADER_RULES.reference) > 0) score += 2;
    });
    if (score > bestTotalScore) {
      bestTotalScore = score;
      bestRowIdx = r;
    }
  }

  const headerRow = rawRows[bestRowIdx] || [];
  const pickCol = (patterns: RegExp[], exclude = new Set<number>()): number | null => {
    let bestCol: number | null = null;
    let bestScore = 0;
    headerRow.forEach((cell, idx) => {
      if (exclude.has(idx)) return;
      const s = matchHeaderScore(cell, patterns);
      if (s > bestScore) {
        bestScore = s;
        bestCol = idx;
      }
    });
    return bestCol;
  };

  const used = new Set<number>();
  const dateCol = pickCol(HEADER_RULES.date) ?? 0;
  used.add(dateCol);
  const timeCol = pickCol(HEADER_RULES.time, used);
  if (timeCol !== null) used.add(timeCol);
  const creditCol = pickCol(HEADER_RULES.credit, used);
  if (creditCol !== null) used.add(creditCol);
  const debitCol = pickCol(HEADER_RULES.debit, used);
  if (debitCol !== null) used.add(debitCol);
  const amountCol = creditCol === null && debitCol === null ? pickCol(HEADER_RULES.amount, used) : null;
  if (amountCol !== null) used.add(amountCol);
  const typeCol = pickCol(HEADER_RULES.type, used);
  if (typeCol !== null) used.add(typeCol);
  const balanceCol = pickCol(HEADER_RULES.balance, used);
  if (balanceCol !== null) used.add(balanceCol);
  const referenceCol = pickCol(HEADER_RULES.reference, used);
  if (referenceCol !== null) used.add(referenceCol);
  const channelCol = pickCol(HEADER_RULES.channel, used);
  if (channelCol !== null) used.add(channelCol);
  const counterpartyCol = pickCol(HEADER_RULES.counterparty, used);
  if (counterpartyCol !== null) used.add(counterpartyCol);
  const descriptionCol = pickCol(HEADER_RULES.description, used);

  return {
    headerRowIndex: bestRowIdx,
    dateCol,
    timeCol,
    creditCol,
    debitCol,
    amountCol,
    typeCol,
    balanceCol,
    descriptionCol,
    channelCol,
    referenceCol,
    counterpartyCol,
  };
}

function detectBankMetadata(rawRows: string[][], fileName: string) {
  const topText = rawRows
    .slice(0, 20)
    .map((r) => r.join(' '))
    .join('\n');
  const combined = `${fileName}\n${topText}`.toLowerCase();

  let detectedBankName: SupportedBankCode = 'OTHER';
  if (/kasikorn|kbank|กสิกร/i.test(combined)) detectedBankName = 'KBANK';
  else if (/\bscb\b|siam commercial|ไทยพาณิชย์/i.test(combined)) detectedBankName = 'SCB';
  else if (/bangkok bank|\bbbl\b|กรุงเทพ/i.test(combined)) detectedBankName = 'BBL';
  else if (/krungthai|\bktb\b|กรุงไทย/i.test(combined)) detectedBankName = 'KTB';
  else if (/krungsri|\bbay\b|กรุงศรี/i.test(combined)) detectedBankName = 'BAY';
  else if (/\bttb\b|tmbthanachart|ทหารไทย/i.test(combined)) detectedBankName = 'TTB';

  const acctMatch = topText.match(/(?:เลขที่บัญชี|account\s*(?:no\.?|number)|acct\.?\s*no\.?)\s*[:\-]?\s*([0-9-]{8,20})/i)
    || topText.match(/\b(\d{3}-\d{1}-\d{5}-\d{1}|\d{3}-\d{6}-\d{1})\b/);
  const detectedAccountNumber = acctMatch ? acctMatch[1].trim() : null;

  const acctNameMatch = topText.match(/(?:ชื่อบัญชี|account\s*name)\s*[:\-]?\s*([^\n,;]+)/i);
  const detectedAccountName = acctNameMatch ? acctNameMatch[1].trim().slice(0, 160) : null;

  return { detectedBankName, detectedAccountNumber, detectedAccountName };
}

function inferCounterpartyName(description: string): string | null {
  if (!description) return null;
  const patterns = [
    /(?:รับโอนจาก|โอนจาก|จาก|โอนไป|จ่ายให้|ถึง)\s*(?:บัญชี\s*)?(?:x+-?\d+|นาย|นาง|น\.ส\.|คุณ|บจก\.?|บริษัท|หจก\.?)?\s*([ก-๙A-Za-z0-9.\s]{3,60})/i,
    /(?:FROM|TO)\s+(?:MR\.?|MRS\.?|MS\.?|CO\.?,?\s*LTD\.?)?\s*([A-Za-z0-9.\s]{3,60})/i,
  ];
  for (const pat of patterns) {
    const m = description.match(pat);
    if (m && m[1]) {
      const cleaned = m[1].replace(/\s+/g, ' ').trim();
      if (cleaned.length >= 3) return cleaned.slice(0, 120);
    }
  }
  return null;
}

function isSummaryOrFooterRow(rowText: string): boolean {
  const lower = rowText.toLowerCase();
  return /ยอดยกมา|ยอดยกไป|ยอดรวม|brought\s*forward|carried\s*forward|opening\s*balance|closing\s*balance|total\s*(?:credit|debit|amount)|ending\s*balance/.test(
    lower
  );
}

export function extractTransactionsFromMatrix(
  rawRows: string[][],
  fileName: string,
  sheetName: string | null,
  overrideMapping?: Partial<BankStatementColumnMapping>
): ParsedBankStatementResult {
  const autoMapping = detectColumnMapping(rawRows);
  const mapping: BankStatementColumnMapping = {
    ...autoMapping,
    ...(overrideMapping || {}),
  };

  const headers = (rawRows[mapping.headerRowIndex] || []).map((h, i) => h || `คอลัมน์ ${i + 1}`);
  const meta = detectBankMetadata(rawRows, fileName);

  const rows: ParsedBankTransactionRow[] = [];
  let skippedRowsCount = 0;
  let totalCreditAmount = 0;
  let totalDebitAmount = 0;
  let creditCount = 0;
  let debitCount = 0;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  for (let r = mapping.headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r] || [];
    const joined = row.join(' ').trim();
    if (!joined) continue;
    if (isSummaryOrFooterRow(joined)) {
      skippedRowsCount++;
      continue;
    }

    const parsedDt = parseBankDateAndTime(
      row[mapping.dateCol],
      mapping.timeCol !== null ? row[mapping.timeCol] : undefined
    );
    if (!parsedDt) {
      skippedRowsCount++;
      continue;
    }

    let txType: 'CREDIT' | 'DEBIT' | null = null;
    let amount = 0;

    if (mapping.creditCol !== null || mapping.debitCol !== null) {
      const creditVal = mapping.creditCol !== null ? parseMoneyNumber(row[mapping.creditCol]) : null;
      const debitVal = mapping.debitCol !== null ? parseMoneyNumber(row[mapping.debitCol]) : null;
      if (creditVal !== null && Math.abs(creditVal) > 0) {
        txType = 'CREDIT';
        amount = Math.abs(creditVal);
      } else if (debitVal !== null && Math.abs(debitVal) > 0) {
        txType = 'DEBIT';
        amount = Math.abs(debitVal);
      }
    }

    if (txType === null && mapping.amountCol !== null) {
      const amtVal = parseMoneyNumber(row[mapping.amountCol]);
      if (amtVal !== null && amtVal !== 0) {
        const typeStr = mapping.typeCol !== null ? cleanCell(row[mapping.typeCol]).toUpperCase() : '';
        if (typeStr.includes('DR') || typeStr.includes('DEBIT') || typeStr.includes('ถอน') || typeStr.includes('ออก') || amtVal < 0) {
          txType = 'DEBIT';
        } else {
          txType = 'CREDIT';
        }
        amount = Math.abs(amtVal);
      }
    }

    if (!txType || amount <= 0) {
      skippedRowsCount++;
      continue;
    }

    const balanceAfter = mapping.balanceCol !== null ? parseMoneyNumber(row[mapping.balanceCol]) : null;
    const rawDesc = mapping.descriptionCol !== null ? cleanCell(row[mapping.descriptionCol]) : '';
    const channel = mapping.channelCol !== null ? cleanCell(row[mapping.channelCol]) || null : null;
    const referenceNo = mapping.referenceCol !== null ? cleanCell(row[mapping.referenceCol]) || null : null;
    const explicitCounterparty =
      mapping.counterpartyCol !== null ? cleanCell(row[mapping.counterpartyCol]) || null : null;

    const description =
      rawDesc ||
      [channel, explicitCounterparty, referenceNo].filter(Boolean).join(' • ') ||
      (txType === 'CREDIT' ? 'เงินโอนเข้าบัญชี' : 'รายการหัก/โอนออก');

    const counterpartyName = explicitCounterparty || inferCounterpartyName(description);

    if (txType === 'CREDIT') {
      totalCreditAmount += amount;
      creditCount++;
    } else {
      totalDebitAmount += amount;
      debitCount++;
    }

    if (!periodStart || parsedDt.date < periodStart) periodStart = parsedDt.date;
    if (!periodEnd || parsedDt.date > periodEnd) periodEnd = parsedDt.date;

    rows.push({
      rowNumber: r + 1,
      transactionDate: parsedDt.date,
      transactionTime: parsedDt.time,
      txType,
      amount: Math.round((amount + Number.EPSILON) * 100) / 100,
      balanceAfter,
      channel,
      referenceNo,
      description,
      counterpartyName,
    });
  }

  return {
    fileName,
    sheetName,
    rawRows,
    headers,
    mapping,
    ...meta,
    rows,
    skippedRowsCount,
    totalCreditAmount: Math.round((totalCreditAmount + Number.EPSILON) * 100) / 100,
    totalDebitAmount: Math.round((totalDebitAmount + Number.EPSILON) * 100) / 100,
    creditCount,
    debitCount,
    periodStart,
    periodEnd,
  };
}

function decodeCsvBufferWithThaiFallback(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const utf8Text = new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '');
  // If UTF-8 decoding emits replacement chars, Thai bank CSV is almost certainly TIS-620 / Windows-874
  if (utf8Text.includes('\uFFFD')) {
    try {
      return new TextDecoder('windows-874').decode(bytes);
    } catch {
      return utf8Text;
    }
  }
  return utf8Text;
}

export function parseBankStatementFileBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  overrideMapping?: Partial<BankStatementColumnMapping>
): ParsedBankStatementResult {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt')) {
    const csvText = decodeCsvBufferWithThaiFallback(buffer);
    const parsed = Papa.parse<string[]>(csvText, {
      skipEmptyLines: false,
    });
    const rawRows = (parsed.data || []).map((row) =>
      Array.isArray(row) ? row.map((cell) => cleanCell(cell)) : []
    );
    return extractTransactionsFromMatrix(rawRows, fileName, null, overrideMapping);
  }

  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0] || null;
  if (!sheetName) {
    throw new Error('ไม่พบชีตข้อมูลในไฟล์ Excel');
  }
  const sheet = workbook.Sheets[sheetName];
  const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: '',
  });
  const rawRows = rawMatrix.map((row) =>
    Array.isArray(row) ? row.map((cell) => cleanCell(cell)) : []
  );
  return extractTransactionsFromMatrix(rawRows, fileName, sheetName, overrideMapping);
}
