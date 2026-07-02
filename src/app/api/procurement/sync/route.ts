import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

const SYNC_SECRET = process.env.SYNC_SECRET || 'YOUR_SECRET_HERE';

function parseNumber(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
}

function parseDateStr(str: any): Date | undefined {
  if (!str) return undefined;
  if (str instanceof Date) return str;
  const s = String(str).trim();
  if (!s) return undefined;

  // Attempt dd/MM/yyyy or dd-MM-yyyy
  const parts = s.split(/[\/\-]/);
  if (parts.length >= 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    // Handle 2-digit years
    if (year < 100) {
      if (year >= 50) {
        // Assume it's a Buddhist Era year abbreviated (e.g., 69 -> 2569)
        year += 2500;
      } else {
        // Assume it's a Gregorian year abbreviated (e.g., 26 -> 2026)
        year += 2000;
      }
    }

    // Handle B.E. (Buddhist Era)
    if (year > 2500) year -= 543;

    // Check validity
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  const fallback = new Date(s);
  if (!isNaN(fallback.getTime())) return fallback;
  return undefined;
}

// Helper to find a value by normalizing the key (removing spaces, dashes)
function findValue(payload: any, possibleKeys: string[]) {
  const normalizedPayload: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k) {
      normalizedPayload[String(k).toLowerCase().replace(/[\s\-_]/g, '')] = v;
    }
  }

  for (const key of possibleKeys) {
    const normKey = key.toLowerCase().replace(/[\s\-_]/g, '');
    if (normalizedPayload[normKey] !== undefined && normalizedPayload[normKey] !== '') {
      return normalizedPayload[normKey];
    }
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-sync-secret');
    if (secret !== SYNC_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    console.log('Received sync payload:', JSON.stringify(payload, null, 2));

    const type = payload.type; // "PR" or "PO"

    if (type === 'PR') {
      const prNumber = findValue(payload, ['PR Number', 'PR', 'PRNumber', 'pr_number', 'เลขที่ PR', 'เลข PR']);
      if (!prNumber) {
        return NextResponse.json({ error: 'Missing PR Number' }, { status: 400 });
      }

      await prisma.purchaseRequest.upsert({
        where: { prNumber: String(prNumber) },
        update: {
          no: parseNumber(findValue(payload, ['No', 'Number', 'ลำดับ'])),
          recordedAt: parseDateStr(findValue(payload, ['Date Recorded', 'Date', 'วันที่', 'วันที่บันทึก'])),
          projectName: findValue(payload, ['Project Name', 'Project', 'ชื่อโครงการ', 'โครงการ']),
          itemList: findValue(payload, ['Purchase Item', 'Item List', 'Items', 'รายการ', 'รายการสินค้า', 'สินค้า', 'รายการจัดซื้อ']),
          requestedBy: findValue(payload, ['Purchasing Requestor', 'Requestor', 'ผู้ขอซื้อ', 'ผู้เบิก', 'ผู้ขอจัดซื้อ']),
          note: findValue(payload, ['Note', 'Remarks', 'หมายเหตุ']),
          reportedBy: findValue(payload, ['Notifier', 'Reported By', 'ผู้แจ้ง', 'ผู้แจ้ง สถานะ / เลขที่ PO', 'ผู้แจ้งสถานะ/เลขที่po']),
        },
        create: {
          prNumber: String(prNumber),
          no: parseNumber(findValue(payload, ['No', 'Number', 'ลำดับ'])),
          recordedAt: parseDateStr(findValue(payload, ['Date Recorded', 'Date', 'วันที่', 'วันที่บันทึก'])),
          projectName: findValue(payload, ['Project Name', 'Project', 'ชื่อโครงการ', 'โครงการ']),
          itemList: findValue(payload, ['Purchase Item', 'Item List', 'Items', 'รายการ', 'รายการสินค้า', 'สินค้า', 'รายการจัดซื้อ']),
          requestedBy: findValue(payload, ['Purchasing Requestor', 'Requestor', 'ผู้ขอซื้อ', 'ผู้เบิก', 'ผู้ขอจัดซื้อ']),
          note: findValue(payload, ['Note', 'Remarks', 'หมายเหตุ']),
          reportedBy: findValue(payload, ['Notifier', 'Reported By', 'ผู้แจ้ง', 'ผู้แจ้ง สถานะ / เลขที่ PO', 'ผู้แจ้งสถานะ/เลขที่po']),
        }
      });

      return NextResponse.json({ success: true, message: `PR ${prNumber} synced` });

    } else if (type === 'PO') {
      const poNumber = findValue(payload, ['PO Number', 'PO', 'PONumber', 'po_number', 'เลขที่ PO', 'เลข PO']);
      if (!poNumber) {
        return NextResponse.json({ error: 'Missing PO Number' }, { status: 400 });
      }

      const prNumber = findValue(payload, ['PR Number', 'PR', 'PRNumber', 'pr_number', 'อ้างอิง PR', 'เลขที่ PR', 'เลข PR', 'เลขที่ PR (ref)']);

      // Upsert PR first to prevent FK constraint failure
      if (prNumber) {
        await prisma.purchaseRequest.upsert({
          where: { prNumber: String(prNumber) },
          update: {},
          create: { prNumber: String(prNumber) }
        });
      }

      await prisma.purchaseOrder.upsert({
        where: { poNumber: String(poNumber) },
        update: {
          no: parseNumber(findValue(payload, ['No', 'Number', 'ลำดับ'])),
          recordedAt: parseDateStr(findValue(payload, ['Date Recorded', 'Date', 'วันที่', 'วันที่บันทึก'])),
          prNumber: prNumber ? String(prNumber) : null,
          vendorName: findValue(payload, ['Vendor Name', 'Vendor', 'Supplier', 'ผู้ขาย', 'ชื่อผู้ขาย', 'ร้านค้า', 'ซัพพลายเออร์', 'บริษัทผู้ขาย']),
          accountNumber: findValue(payload, ['Account Number', 'Account', 'เลขที่บัญชี', 'บัญชี']),
          totalAmount: parseNumber(findValue(payload, ['Total Amount', 'Total', 'ยอดรวม', 'ยอดจัดซื้อ', 'จำนวนเงิน', 'ยอดเงิน', 'ยอด'])),
          depositAmount: parseNumber(findValue(payload, ['Deposit Amount', 'Deposit', 'มัดจำ', 'ยอดมัดจำ'])),
          remainingAmount: parseNumber(findValue(payload, ['Remaining Amount', 'Remaining', 'คงเหลือ', 'ยอดคงเหลือ', 'ส่วนที่เหลือ'])),
          payment1: parseNumber(findValue(payload, ['Payment 1', 'Payment1', 'จ่ายครั้งที่ 1', 'งวดที่ 1', 'จ่ายงวดที่1'])),
          creditTerm: findValue(payload, ['Credit Term', 'Credit', 'เครดิตเทอม', 'เครดิต']),
          jobName: findValue(payload, ['Job Name', 'Job', 'ชื่องาน', 'รหัสงาน']),
          itemList: findValue(payload, ['Purchase Item', 'Item List', 'Items', 'รายการ', 'รายการสินค้า', 'สินค้า', 'รายการจัดซื้อ']),
          deliveryDate: parseDateStr(findValue(payload, ['Delivery Date', 'Delivery', 'วันส่งมอบ', 'กำหนดส่ง', 'วันที่ส่ง', 'วันจัดส่ง'])),
          note: findValue(payload, ['Note', 'Remarks', 'หมายเหตุ']),
          reportedBy: findValue(payload, ['Notifier', 'Reported By', 'ผู้แจ้ง']),
        },
        create: {
          poNumber: String(poNumber),
          no: parseNumber(findValue(payload, ['No', 'Number', 'ลำดับ'])),
          recordedAt: parseDateStr(findValue(payload, ['Date Recorded', 'Date', 'วันที่', 'วันที่บันทึก'])),
          prNumber: prNumber ? String(prNumber) : null,
          vendorName: findValue(payload, ['Vendor Name', 'Vendor', 'Supplier', 'ผู้ขาย', 'ชื่อผู้ขาย', 'ร้านค้า', 'ซัพพลายเออร์', 'บริษัทผู้ขาย']),
          accountNumber: findValue(payload, ['Account Number', 'Account', 'เลขที่บัญชี', 'บัญชี']),
          totalAmount: parseNumber(findValue(payload, ['Total Amount', 'Total', 'ยอดรวม', 'ยอดจัดซื้อ', 'จำนวนเงิน', 'ยอดเงิน', 'ยอด'])),
          depositAmount: parseNumber(findValue(payload, ['Deposit Amount', 'Deposit', 'มัดจำ', 'ยอดมัดจำ'])),
          remainingAmount: parseNumber(findValue(payload, ['Remaining Amount', 'Remaining', 'คงเหลือ', 'ยอดคงเหลือ', 'ส่วนที่เหลือ'])),
          payment1: parseNumber(findValue(payload, ['Payment 1', 'Payment1', 'จ่ายครั้งที่ 1', 'งวดที่ 1', 'จ่ายงวดที่1'])),
          creditTerm: findValue(payload, ['Credit Term', 'Credit', 'เครดิตเทอม', 'เครดิต']),
          jobName: findValue(payload, ['Job Name', 'Job', 'ชื่องาน', 'รหัสงาน']),
          itemList: findValue(payload, ['Purchase Item', 'Item List', 'Items', 'รายการ', 'รายการสินค้า', 'สินค้า', 'รายการจัดซื้อ']),
          deliveryDate: parseDateStr(findValue(payload, ['Delivery Date', 'Delivery', 'วันส่งมอบ', 'กำหนดส่ง', 'วันที่ส่ง', 'วันจัดส่ง'])),
          note: findValue(payload, ['Note', 'Remarks', 'หมายเหตุ']),
          reportedBy: findValue(payload, ['Notifier', 'Reported By', 'ผู้แจ้ง']),
        }
      });

      return NextResponse.json({ success: true, message: `PO ${poNumber} synced` });

    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Procurement sync error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
