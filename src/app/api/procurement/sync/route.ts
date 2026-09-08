import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/app/lib/db';
import { sendPushToUser } from '@/app/lib/pushNotification';
import { isRetroactivePO, getRetroactiveReceivedBy } from '@/app/lib/poHelper';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOW_ROW_NO_REMATCH = false;

const MAX_ROWS_PER_REQUEST = 500;

/* ========== AUTH ========== */
function secretMatches(provided: string | null): boolean {
  const expected = process.env.SYNC_SECRET;
  if (!expected || !provided) return false;
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/* ========== ตัวช่วยอ่าน payload ========== */
function normKey(k: string): string {
  return String(k).toLowerCase().replace(/[\s\-_]/g, '');
}

function isBlank(v: any): boolean {
  // null = "ชีตเว้นว่าง" = ไม่แก้ฟิลด์นี้ (ของเดิมเช็คแต่ undefined กับ ''
  // ทำให้ null ถูกคืนออกไปเลย แล้ว alias ตัวถัดไปไม่ได้ถูกลอง)
  return v === undefined || v === null || v === '' ||
    (typeof v === 'string' && v.trim() === '');
}

type Reader = {
  read: (keys: string[], fuzzy?: string[]) => any;
  rowNumber: number | undefined;
};

function makeReader(payload: any): Reader {
  const map = new Map<string, any>();
  for (const [k, v] of Object.entries(payload)) {
    if (!k || k === 'type' || k === '__row') continue;
    map.set(normKey(k), v);
  }

  return {
    rowNumber: typeof payload.__row === 'number' ? payload.__row : undefined,

    read(keys: string[], fuzzy: string[] = []) {
      for (const key of keys) {
        const v = map.get(normKey(key));
        if (!isBlank(v)) return typeof v === 'string' ? v.trim() : v;
      }
      // fallback แบบ substring — ฝั่ง Apps Script จับคอลัมน์ด้วย substring
      // (เช่น indexOf("จัดส่ง")) ถ้า server จับแบบ exact เท่านั้น header จริง
      // อย่าง "วันที่จัดส่ง" จะหาไม่เจอทั้งที่ค่าถูกส่งมาแล้ว
      for (const frag of fuzzy) {
        const nf = normKey(frag);
        for (const [k, v] of map) {
          if (k.includes(nf) && !isBlank(v)) {
            return typeof v === 'string' ? v.trim() : v;
          }
        }
      }
      return undefined;
    },
  };
}

function cleanDocNo(raw: any): string {
  return String(raw)
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toUpperCase();
}

/* ========== ตัวเลข ========== */
function parseNumber(val: any): number | undefined {
  if (isBlank(val)) return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;

  let s = String(val).trim();

  // เลขบัญชี "xxx-x-xxxxx-x" หรือเบอร์โทร "xxx-xxx-xxxx" ไม่ใช่ยอดเงิน
  if (/^\d{3}[-\s]\d{1}[-\s]\d{5}[-\s]\d{1}$/.test(s) ||
    /^\d{3}[-\s]\d{3}[-\s]\d{4}$/.test(s)) {
    return undefined;
  }

  s = s.replace(/^(?:🧾?\s*ยอด(?:\s*รวม)?\s*[:：]?\s*)/i, '');
  s = s.replace(/\s*(?:หัก\s*\d+%?|[-–]\s*\d+%(?:\s*=\s*[\d,.]+)?).*$/i, '').trim();

  // จัดการกรณีพิมพ์จุดแทนจุลภาค เช่น "34.935.50" -> "34935.50"
  let cleaned = s.replace(/,/g, '');
  const dotCount = (cleaned.match(/\./g) || []).length;
  if (dotCount > 1) {
    const lastDotIdx = cleaned.lastIndexOf('.');
    const integerPart = cleaned.substring(0, lastDotIdx).replace(/\./g, '');
    const decimalPart = cleaned.substring(lastDotIdx + 1);
    cleaned = integerPart + '.' + decimalPart;
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
}

/* ========== วันที่ ==========
   คำนวณด้วย UTC method ทั้งหมด ผลลัพธ์จะเหมือนกันไม่ว่า server จะตั้ง TZ อะไร */

/** ตรึงเที่ยงคืนตามเวลาไทย (UTC+7) */
function createThaiDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d, -7, 0, 0, 0));
}

function fixDate(d: Date): Date {
  const y = d.getUTCFullYear();
  if (y >= 1950 && y <= 1999) {
    // Sheets ตีความ '69' เป็น 1969 แต่ผู้ใช้หมายถึง พ.ศ. 2569 → 2026
    const out = new Date(d.getTime());
    out.setUTCFullYear(y + 57);
    return out;
  }
  if (y > 2500) {
    const out = new Date(d.getTime());
    out.setUTCFullYear(y - 543);
    return out;
  }
  return d;
}

function twoDigitYearToGregorian(yy: number): number {
  return yy >= 50 ? 2500 + yy - 543 : 2000 + yy;
}

const THAI_MONTHS: [string[], number][] = [
  [['ม.ค.', 'มกราคม'], 0],
  [['ก.พ.', 'กุมภาพันธ์'], 1],
  [['มี.ค.', 'มีนาคม'], 2],
  [['เม.ย.', 'เมษายน'], 3],
  [['พ.ค.', 'พฤษภาคม'], 4],
  [['มิ.ย.', 'มิถุนายน'], 5],
  [['ก.ค.', 'กรกฎาคม'], 6],
  [['ส.ค.', 'สิงหาคม'], 7],
  [['ก.ย.', 'กันยายน'], 8],
  [['ต.ค.', 'ตุลาคม'], 9],
  [['พ.ย.', 'พฤศจิกายน'], 10],
  [['ธ.ค.', 'ธันวาคม'], 11],
];

function parseDateStr(str: any): Date | undefined {
  if (isBlank(str)) return undefined;
  if (str instanceof Date) return fixDate(new Date(str.getTime()));

  const s = String(str).trim();

  // 1. ISO ที่ Apps Script ส่งมาเมื่อเซลล์มีเวลาติดมาด้วย
  if (s.includes('T') && s.endsWith('Z')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return fixDate(d);
  }

  // 2. yyyy-MM-dd (รูปแบบหลักที่ Apps Script ส่งมา)
  const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    if (m >= 0 && m <= 11 && d >= 1 && d <= 31) return fixDate(createThaiDate(y, m, d));
  }

  // 3. มีเวลาติดมาแบบ "7/2/2026 13:45:29" → ปล่อยให้ native parse
  if (s.includes(':')) {
    const native = new Date(s);
    if (!isNaN(native.getTime())) return fixDate(native);
  }

  // 4. yyyy-MM-dd ที่ฝังอยู่กลางข้อความ
  const isoLoose = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoLoose) {
    const y = parseInt(isoLoose[1], 10);
    const m = parseInt(isoLoose[2], 10) - 1;
    const d = parseInt(isoLoose[3], 10);
    if (m >= 0 && m <= 11 && d >= 1 && d <= 31) return fixDate(createThaiDate(y, m, d));
  }

  // 5. dd/MM/yyyy หรือ dd-MM-yy
  const dmRegex = /(\d{1,2})\s*([\/\-])\s*(\d{1,2})(?:\s*\2\s*(\d{2,4}))?/g;
  let match: RegExpExecArray | null;
  while ((match = dmRegex.exec(s)) !== null) {
    const d = parseInt(match[1], 10);
    const m = parseInt(match[3], 10) - 1;
    const yStr = match[4];
    if (d >= 1 && d <= 31 && m >= 0 && m <= 11) {
      let y = new Date().getUTCFullYear();
      if (yStr) {
        const raw = parseInt(yStr, 10);
        y = raw < 100 ? twoDigitYearToGregorian(raw) : raw;
      }
      return fixDate(createThaiDate(y, m, d));
    }
  }

  // 6. เดือนภาษาไทย เช่น "1-3 ก.ค. 69"
  const monthAlt = THAI_MONTHS.flatMap(([names]) => names)
    .join('|')
    .replace(/\./g, '\\.');
  const thaiRegex = new RegExp(`(\\d{1,2})\\s*(${monthAlt})\\s*(\\d{2,4})?`, 'g');
  while ((match = thaiRegex.exec(s)) !== null) {
    const d = parseInt(match[1], 10);
    const monthStr = match[2];
    const yStr = match[3];

    const found = THAI_MONTHS.find(([names]) => names.some(n => monthStr.includes(n)));
    if (found && d >= 1 && d <= 31) {
      let y = new Date().getUTCFullYear();
      if (yStr) {
        const raw = parseInt(yStr, 10);
        y = raw < 100 ? twoDigitYearToGregorian(raw) : raw;
      }
      return fixDate(createThaiDate(y, found[1], d));
    }
  }

  const fallback = new Date(s);
  if (!isNaN(fallback.getTime())) return fixDate(fallback);

  return undefined;
}

/** ดึงวันที่จริงจากรูปแบบเลขเอกสาร PR69-E0104 / PO69-E0104 */
function dateFromDocNumber(docNo: string, prefix: 'PR' | 'PO'): Date | undefined {
  const m = docNo.match(new RegExp(`^${prefix}(\\d{2})-[EPG](\\d{2})(\\d{2})`));
  if (!m) return undefined;
  const yy = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const dd = parseInt(m[3], 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return undefined;
  return createThaiDate(twoDigitYearToGregorian(yy), mm - 1, dd);
}

/* ========== เขียนเฉพาะที่เปลี่ยน ==========
   full sync ทุก 15 นาทีของเดิม update ทุกแถวเสมอ ทำให้ updatedAt ขยับ
   และ hook/รายงานของแผนกอื่นเห็นเป็นการแก้ไขใหม่ตลอด */

function toComparable(v: any): any {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'object' && typeof (v as any).toNumber === 'function') {
    return (v as any).toNumber();   // Prisma Decimal
  }
  if (typeof v === 'string') return v.trim();
  return v;
}

/** คืนเฉพาะฟิลด์ที่ค่าต่างจากใน DB — ข้าม undefined (= ชีตว่าง = ไม่แก้) */
function pickChanged<T extends Record<string, any>>(existing: any, data: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (toComparable(existing?.[k]) !== toComparable(v)) {
      (out as any)[k] = v;
    }
  }
  return out;
}

/* ========== แจ้งเตือน (รวมเป็นครั้งเดียวต่อ request) ========== */
type NewDoc = { type: 'PR' | 'PO'; number: string };

async function notifyNewDocs(docs: NewDoc[]) {
  if (docs.length === 0) return;
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: { contains: 'จัดซื้อ', mode: 'insensitive' } },
          { role: { contains: 'procurement', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (users.length === 0) return;

    const title = docs.length === 1
      ? `มี ${docs[0].type} ใหม่เข้าสู่ระบบ`
      : `มีเอกสารจัดซื้อใหม่ ${docs.length} รายการ`;

    const shown = docs.slice(0, 5).map(d => d.number).join(', ');
    const body = docs.length <= 5
      ? shown
      : `${shown} และอีก ${docs.length - 5} รายการ`;

    // ยิงรวมครั้งเดียว ไม่ใช่แถวละ push — กันมือถือทีมจัดซื้อเด้งรัวตอน backfill
    await Promise.allSettled(
      users.map(u =>
        sendPushToUser(u.id, {
          title,
          body,
          url: '/admin/procurement/dashboard',
          category: 'PROCUREMENT_NEW_ENTRY',
        })
      )
    );
  } catch (e) {
    console.error('Failed to notify procurement:', e);
  }
}

/* ========== ผลลัพธ์ต่อแถว ========== */
type RowResult = {
  ok: boolean;
  row?: number;
  key?: string;
  action?: 'created' | 'updated' | 'unchanged';
  error?: string;
};

/* ========== PR ========== */
async function syncPR(payload: any, newDocs: NewDoc[]): Promise<RowResult> {
  const r = makeReader(payload);

  const rawPr = r.read(['PR Number', 'PR', 'PRNumber', 'pr_number', 'เลขที่ PR', 'เลข PR'], ['เลขที่pr']);
  if (!rawPr) return { ok: false, row: r.rowNumber, error: 'Missing PR Number' };
  const prNumber = cleanDocNo(rawPr);

  const rowNo = parseNumber(r.read(['No', 'Number', 'ลำดับ']));
  const data = {
    no: rowNo,
    recordedAt:
      dateFromDocNumber(prNumber, 'PR') ??
      parseDateStr(r.read(['Date Recorded', 'Date', 'วันที่', 'วันที่บันทึก'], ['วันที่'])),
    projectName: r.read(['Project Name', 'Project', 'ชื่อโครงการ', 'โครงการ']),
    itemList: r.read(['Purchase Item', 'Item List', 'Items', 'รายการ', 'รายการสินค้า', 'สินค้า', 'รายการจัดซื้อ']),
    requestedBy: r.read(['Purchasing Requestor', 'Requestor', 'ผู้ขอซื้อ', 'ผู้เบิก', 'ผู้ขอจัดซื้อ']),
    note: r.read(['Note', 'Remarks', 'หมายเหตุ']),
    reportedBy: r.read(['Notifier', 'Reported By', 'ผู้แจ้ง', 'ผู้แจ้ง สถานะ / เลขที่ PO']),
  };

  let existing = await prisma.purchaseRequest.findUnique({ where: { prNumber } });

  if (!existing && ALLOW_ROW_NO_REMATCH && rowNo) {
    const candidate = await prisma.purchaseRequest.findFirst({ where: { no: rowNo } });
    if (candidate) {
      existing = candidate;
      await prisma.purchaseOrder.updateMany({
        where: { prNumber: candidate.prNumber },
        data: { prNumber },
      });
    }
  }

  if (!existing) {
    try {
      await prisma.purchaseRequest.create({ data: { prNumber, ...data } });
      newDocs.push({ type: 'PR', number: prNumber });
      return { ok: true, row: r.rowNumber, key: prNumber, action: 'created' };
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e;
      existing = await prisma.purchaseRequest.findUnique({ where: { prNumber } });
      if (!existing) throw e;
    }
  }

  const changed = pickChanged(existing, { prNumber, ...data });
  if (Object.keys(changed).length === 0) {
    return { ok: true, row: r.rowNumber, key: prNumber, action: 'unchanged' };
  }

  await prisma.purchaseRequest.update({ where: { id: existing.id }, data: changed });
  return { ok: true, row: r.rowNumber, key: prNumber, action: 'updated' };
}

/* ========== PO ========== */
async function syncPO(payload: any, newDocs: NewDoc[]): Promise<RowResult> {
  const r = makeReader(payload);

  const rawPo = r.read(['PO Number', 'PO', 'PONumber', 'po_number', 'เลขที่ PO', 'เลข PO'], ['เลขที่po']);
  if (!rawPo) return { ok: false, row: r.rowNumber, error: 'Missing PO Number' };
  const poNumber = cleanDocNo(rawPo);

  const rawPr = r.read([
    'PR Number', 'PR', 'PRNumber', 'pr_number',
    'อ้างอิง PR', 'เลขที่ PR', 'เลข PR', 'เลขที่ PR (ref)',
  ]);
  const prNumber = rawPr ? cleanDocNo(rawPr) : null;

  const rowNo = parseNumber(r.read(['No', 'Number', 'ลำดับ']));
  const note = r.read(['Note', 'Remarks', 'หมายเหตุ']);
  const jobName = r.read(['Job Name', 'Job', 'ชื่องาน', 'รหัสงาน']);
  const itemList = r.read(['Purchase Item', 'Item List', 'Items', 'รายการ', 'รายการสินค้า', 'สินค้า', 'รายการจัดซื้อ']);
  const reportedBy = r.read(['Notifier', 'Reported By', 'ผู้แจ้ง']);

  const recordedAt =
    dateFromDocNumber(poNumber, 'PO') ??
    parseDateStr(r.read(['Date Recorded', 'Date', 'วันที่', 'วันที่บันทึก'], ['วันที่บันทึก']));

  // fuzzy ตรงนี้สำคัญ: Apps Script normalize คอลัมน์ที่ "มีคำว่าจัดส่ง" ทุกคอลัมน์
  // header จริงอย่าง "วันที่จัดส่ง" / "กำหนดจัดส่ง" จะ exact-match ไม่ติด
  const deliveryDate = parseDateStr(
    r.read(
      ['Delivery Date', 'Delivery', 'วันส่งมอบ', 'กำหนดส่ง', 'วันที่ส่ง', 'วันจัดส่ง'],
      ['จัดส่ง', 'ส่งมอบ', 'นัดส่ง']
    )
  );

  const rawAccount = r.read(['Account Number', 'Account', 'เลขที่บัญชี', 'บัญชี']);
  const accountNumber = (rawAccount && (rawAccount.includes('🧾') || rawAccount.includes('ยอด:'))) ? null : rawAccount;

  // ดึงยอดจัดซื้อของ PO: รองรับทุกชื่อหัวคอลัมน์ + Fuzzy Search + Fallback ครอบคลุมทุกกรณี
  let rawTotal = parseNumber(
    r.read(
      [
        'Total Amount', 'Total', 'ยอดรวม', 'ยอดจัดซื้อ', 'จำนวนเงิน', 'ยอดเงิน', 'ยอด',
        'มูลค่า', 'ราคารวม', 'ยอดสั่งซื้อ', 'ยอด po', 'ยอดpo', 'ยอดสุทธิ', 'รวมเงิน', 'จำนวนเงินรวม', 'ยอดเงินรวม'
      ],
      ['ยอดรวม', 'ยอดจัดซื้อ', 'จำนวนเงิน', 'ยอดเงิน', 'ราคารวม', 'ยอดสั่งซื้อ', 'ยอดเงินรวม', 'มูลค่า']
    )
  );

  const depositAmount = parseNumber(r.read(['Deposit Amount', 'Deposit', 'มัดจำ', 'ยอดมัดจำ']));

  // Fallback 1: ถ้าช่องยอดรวมไม่ได้กรอก แต่ในช่องเลขที่บัญชีมี '🧾ยอด: ...' หรือ 'ยอด: ...' ให้ดึงยอดมาใช้
  if ((rawTotal === undefined || rawTotal === null || rawTotal === 0) && rawAccount && rawAccount.includes('ยอด:')) {
    rawTotal = parseNumber(rawAccount);
  }

  // Fallback 2: ถ้าช่องยอดรวมยังว่าง แต่ในหมายเหตุ (note) มีระบุ "ยอด: ..." หรือ "🧾ยอด:"
  if ((rawTotal === undefined || rawTotal === null || rawTotal === 0) && note) {
    const noteMatch = note.match(/(?:🧾?\s*ยอด(?:\s*รวม)?\s*[:：]?\s*)([0-9.,]+)/i);
    if (noteMatch) {
      rawTotal = parseNumber(noteMatch[1]);
    }
  }

  // Fallback 3: ถ้าช่องยอดรวมยังว่าง แต่มีกรอกยอดมัดจำไว้เดี่ยวๆ
  if ((rawTotal === undefined || rawTotal === null || rawTotal === 0) && depositAmount && depositAmount > 0) {
    rawTotal = Math.abs(depositAmount);
  }

  const rawCreditTerm = r.read(['Credit Term', 'Credit', 'เครดิตเทอม', 'เครดิต']);
  let resolvedJobName = jobName;
  let creditTerm = rawCreditTerm;
  if (rawCreditTerm && (rawCreditTerm.includes('ชื่องาน') || rawCreditTerm.includes('📌'))) {
    const extractedJob = rawCreditTerm.replace(/^[📌\s]*ชื่องาน\s*[:：]?\s*/i, '').trim();
    if (!resolvedJobName && extractedJob) {
      resolvedJobName = extractedJob;
    }
    creditTerm = null;
  }

  const data = {
    no: rowNo,
    recordedAt,
    prNumber,
    vendorName: r.read(['Vendor Name', 'Vendor', 'Supplier', 'ผู้ขาย', 'ชื่อผู้ขาย', 'ร้านค้า', 'ซัพพลายเออร์', 'บริษัทผู้ขาย']),
    accountNumber,
    totalAmount: rawTotal,
    depositAmount,
    remainingAmount: parseNumber(r.read(['Remaining Amount', 'Remaining', 'คงเหลือ', 'ยอดคงเหลือ', 'ส่วนที่เหลือ'])),
    payment1: parseNumber(r.read(['Payment 1', 'Payment1', 'จ่ายครั้งที่ 1', 'งวดที่ 1', 'จ่ายงวดที่1'])),
    creditTerm,
    jobName: resolvedJobName,
    itemList,
    deliveryDate,
    note,
    reportedBy,
  };

  // สร้าง PR ตั้งต้นก่อน กัน FK พัง — ใช้ upsert เพราะหลายแถวอาจอ้าง PR ใบเดียวกัน
  if (prNumber) {
    await prisma.purchaseRequest.upsert({
      where: { prNumber },
      update: {},
      create: {
        prNumber,
        projectName: jobName ?? null,
        itemList: itemList ?? null,
        recordedAt: recordedAt ?? null,
        requestedBy: reportedBy && reportedBy !== 'ไม่ทราบชื่อ' ? reportedBy : null,
        note: note
          ? `[สร้างอัตโนมัติจาก PO ${poNumber}] ${note}`
          : `[สร้างอัตโนมัติจาก PO ${poNumber}]`,
      },
    });

    // เติมข้อมูลให้ PR ที่ยังว่าง — เฉพาะฟิลด์ที่ว่างจริง ไม่ทับของที่คนกรอกไว้
    const pr = await prisma.purchaseRequest.findUnique({ where: { prNumber } });
    if (pr) {
      const fill: Record<string, any> = {};
      if (!pr.projectName && jobName) fill.projectName = jobName;
      if (!pr.itemList && itemList) fill.itemList = itemList;
      if (!pr.recordedAt && recordedAt) fill.recordedAt = recordedAt;
      if (!pr.requestedBy && reportedBy && reportedBy !== 'ไม่ทราบชื่อ') fill.requestedBy = reportedBy;
      if (Object.keys(fill).length > 0) {
        await prisma.purchaseRequest.update({ where: { id: pr.id }, data: fill });
      }
    }
  }

  let existing = await prisma.purchaseOrder.findUnique({ where: { poNumber } });

  if (!existing && ALLOW_ROW_NO_REMATCH && rowNo) {
    const candidate = await prisma.purchaseOrder.findFirst({ where: { no: rowNo } });
    if (candidate) {
      existing = candidate;
      await prisma.goodsReceipt.updateMany({
        where: { poNumber: candidate.poNumber },
        data: { poNumber },
      });
    }
  }

  const isRetroactive = isRetroactivePO(note);

  if (!existing) {
    const receiveFields = isRetroactive
      ? {
        receiveStatus: 'Received',
        receivedBy: getRetroactiveReceivedBy(reportedBy),
        receivedAt: deliveryDate || recordedAt || new Date(),
      }
      : {};
    try {
      await prisma.purchaseOrder.create({ data: { poNumber, ...data, ...receiveFields } });
      newDocs.push({ type: 'PO', number: poNumber });
      return { ok: true, row: r.rowNumber, key: poNumber, action: 'created' };
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e;
      existing = await prisma.purchaseOrder.findUnique({ where: { poNumber } });
      if (!existing) throw e;
    }
  }

  // เคารพงานคลัง/รับของ: ตั้ง receive อัตโนมัติเฉพาะตอนที่ยังไม่มีใครกรอกไว้
  const autoReceive =
    isRetroactive && !existing.receivedBy && existing.receiveStatus !== 'Received'
      ? {
        receiveStatus: 'Received',
        receivedBy: getRetroactiveReceivedBy(reportedBy),
        receivedAt: deliveryDate || recordedAt || new Date(),
      }
      : {};

  const changed = pickChanged(existing, { poNumber, ...data, ...autoReceive });
  if (Object.keys(changed).length === 0) {
    return { ok: true, row: r.rowNumber, key: poNumber, action: 'unchanged' };
  }

  await prisma.purchaseOrder.update({ where: { id: existing.id }, data: changed });
  return { ok: true, row: r.rowNumber, key: poNumber, action: 'updated' };
}

/* ========== GR ========== */
async function syncGR(payload: any): Promise<RowResult> {
  const r = makeReader(payload);

  const rawPo = r.read([
    'PO Number', 'PO', 'PONumber', 'po_number',
    'เลขที่ใบสั่งซื้อ', 'เลขที่สั่งซื้อ', 'เลข PO',
  ]);
  if (!rawPo) return { ok: false, row: r.rowNumber, error: 'Missing PO Number for GR' };
  const poNumber = cleanDocNo(rawPo);

  const seqVal = parseNumber(r.read(['No', 'Number', 'ลำดับ', 'ลำดับที่'])) || 0;

  await prisma.purchaseOrder.upsert({
    where: { poNumber },
    update: {},
    create: { poNumber },
  });

  const isCompleteStr = String(r.read(['Complete Delivery', 'ส่งครบ']) ?? '');
  const isIncompleteStr = String(r.read(['Incomplete Delivery', 'ส่งไม่ครบ']) ?? '');

  const fields = {
    recordedAt: parseDateStr(r.read(['Date Recorded', 'Date', 'วัน/เดือน/ปี', 'วันที่', 'วันที่บันทึก'])),
    company: r.read(['Company', 'บริษัท']),
    item: r.read(['Purchase Item', 'Item', 'รายการ', 'สินค้า']),
    quantity: parseNumber(r.read(['Quantity', 'จำนวนสั่ง', 'จำนวน'])),
    totalAmount: parseNumber(r.read(['Total Amount', 'Total', 'ยอดรวม', 'ยอด'])),
    creditTerm: r.read(['Credit Term', 'Credit', 'เครดิตเทอม', 'เครดิต']),
    status: r.read(['Status', 'สถานะ']),
    targetDeliveryDate: parseDateStr(r.read(['Target Delivery Date', 'วันที่นัดส่ง', 'กำหนดส่ง'], ['นัดส่ง'])),
    deliveredQuantity: parseNumber(r.read(['Quantity Delivered', 'จำนวนส่ง', 'จำนวนส่งมอบ'])),
    receivedAt: parseDateStr(r.read(['Date Received', 'วันที่รับของ', 'วันที่ส่งมอบ'])),
    deliveryNoteNumber: r.read(['Delivery Note Number', 'Delivery Note', 'เลขที่ใบส่งของ', 'ใบส่งของ']),
    recipient: r.read(['Recipient', 'ผู้รับ', 'ผู้รับของ', 'ผุ้รับของ']),
    isCompleteDelivery:
      isCompleteStr.toLowerCase() === 'true' || isCompleteStr === '1' || isCompleteStr.includes('ครบ'),
    isIncompleteDelivery:
      isIncompleteStr.toLowerCase() === 'true' || isIncompleteStr === '1' || isIncompleteStr.includes('ไม่ครบ'),
  };

  const existing = await prisma.goodsReceipt.findUnique({
    where: { poNumber_sequenceNo: { poNumber, sequenceNo: seqVal } },
  });

  if (!existing) {
    await prisma.goodsReceipt.create({
      data: { poNumber, sequenceNo: seqVal, ...fields },
    });
    return { ok: true, row: r.rowNumber, key: `${poNumber}#${seqVal}`, action: 'created' };
  }

  const changed = pickChanged(existing, fields);
  if (Object.keys(changed).length === 0) {
    return { ok: true, row: r.rowNumber, key: `${poNumber}#${seqVal}`, action: 'unchanged' };
  }

  await prisma.goodsReceipt.update({ where: { id: existing.id }, data: changed });
  return { ok: true, row: r.rowNumber, key: `${poNumber}#${seqVal}`, action: 'updated' };
}

/* ========== router ต่อแถว ========== */
async function syncRow(payload: any, newDocs: NewDoc[]): Promise<RowResult> {
  try {
    switch (payload?.type) {
      case 'PR': return await syncPR(payload, newDocs);
      case 'PO': return await syncPO(payload, newDocs);
      case 'GR': return await syncGR(payload);
      default:
        return { ok: false, row: payload?.__row, error: `Invalid type: ${payload?.type}` };
    }
  } catch (e: any) {
    console.error(`sync row ${payload?.__row} (${payload?.type}) failed:`, e?.message || e);
    return { ok: false, row: payload?.__row, error: e?.message || 'Internal error' };
  }
}

/* ========== POST ========== */
export async function POST(req: NextRequest) {
  if (!process.env.SYNC_SECRET) {
    console.error('SYNC_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  if (!secretMatches(req.headers.get('x-sync-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const isBulk = Array.isArray(body?.rows);
  const rows: any[] = isBulk ? body.rows : [body];

  if (rows.length === 0) {
    return NextResponse.json({ success: true, results: [], summary: { created: 0, updated: 0, unchanged: 0, failed: 0 } });
  }
  if (rows.length > MAX_ROWS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Too many rows (${rows.length}), max ${MAX_ROWS_PER_REQUEST}` },
      { status: 413 }
    );
  }

  const newDocs: NewDoc[] = [];
  const results: RowResult[] = [];

  // เรียงลำดับทีละแถวโดยตั้งใจ — การยิงขนานคือต้นเหตุที่ create ชน unique
  // constraint ตอนหลายแถวอ้าง PR ใบเดียวกัน
  for (const row of rows) {
    results.push(await syncRow(row, newDocs));
  }

  await notifyNewDocs(newDocs);

  const summary = {
    created: results.filter(r => r.action === 'created').length,
    updated: results.filter(r => r.action === 'updated').length,
    unchanged: results.filter(r => r.action === 'unchanged').length,
    failed: results.filter(r => !r.ok).length,
  };

  console.log(
    `sync: ${rows.length} rows → created ${summary.created}, ` +
    `updated ${summary.updated}, unchanged ${summary.unchanged}, failed ${summary.failed}`
  );

  // แบบส่งแถวเดียว: คงรูปแบบ response เดิมไว้ให้ client เก่ายังใช้ได้
  if (!isBulk) {
    const r = results[0];
    if (!r.ok) {
      const status = r.error?.startsWith('Missing') || r.error?.startsWith('Invalid type') ? 400 : 500;
      return NextResponse.json({ error: r.error }, { status });
    }
    return NextResponse.json({
      success: true,
      message: `${body.type} ${r.key} synced (${r.action})`,
      action: r.action,
    });
  }

  return NextResponse.json({ success: true, results, summary });
}