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

function fixDate(d: Date): Date {
  let y = d.getFullYear();
  // 1. Google Sheets misinterpreted e.g. '69' as '1969', but user meant BE '2569' -> '2026'
  if (y >= 1950 && y <= 1999) {
    d.setFullYear(y + 57);
  }
  // 2. User literally typed '2569', and it was parsed as year 2569. We want Gregorian 2026.
  else if (y > 2500) {
    d.setFullYear(y - 543);
  }
  return d;
}

// Ensure the date is strictly anchored to midnight in Thailand (UTC+7) 
// regardless of where the backend server is geographically hosted.
function createThaiDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d, -7, 0, 0, 0));
}

function parseDateStr(str: any): Date | undefined {
  if (!str) return undefined;
  if (str instanceof Date) return fixDate(new Date(str.getTime()));
  
  const s = String(str).trim();
  if (!s) return undefined;

  // 1. If it's already an ISO string sent by Google Apps Script, parse it directly to preserve exact time
  if (s.includes('T') && s.endsWith('Z')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return fixDate(d);
  }

  let parsedDate: Date | undefined;

  // 1.5. If the string contains a time (e.g. "7/2/2026 13:45:29"), it's likely system-generated in American format.
  if (s.includes(':')) {
    const nativeDate = new Date(s);
    if (!isNaN(nativeDate.getTime())) return fixDate(nativeDate);
  }

  // 2. Try ISO-like YYYY-MM-DD
  const isoMatch = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    let y = parseInt(isoMatch[1], 10);
    let m = parseInt(isoMatch[2], 10) - 1;
    let d = parseInt(isoMatch[3], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      return fixDate(createThaiDate(y, m, d));
    }
  }

  // 2. Try DD/MM/YYYY or DD-MM-YYYY anywhere in the string
  const dmRegex = /(\d{1,2})\s*([\/\-])\s*(\d{1,2})(?:\s*\2\s*(\d{2,4}))?/g;
  let match;
  while ((match = dmRegex.exec(s)) !== null) {
    let d = parseInt(match[1], 10);
    let m = parseInt(match[3], 10) - 1;
    let yStr = match[4];
    
    if (d >= 1 && d <= 31 && m >= 0 && m <= 11) {
      let y = new Date().getFullYear(); // default to current year
      if (yStr) {
        y = parseInt(yStr, 10);
        if (y < 100) {
          if (y >= 50) y += 2500;
          else y += 2000;
        }
      }
      parsedDate = createThaiDate(y, m, d);
      break;
    }
  }

  if (parsedDate) return fixDate(parsedDate);

  // 3. Try Thai text months (e.g., "1-3 ก.ค. 69" -> extract "3 ก.ค. 69")
  const thaiMonthNames = [
    "ม.ค.", "มกราคม", "ก.พ.", "กุมภาพันธ์", "มี.ค.", "มีนาคม", 
    "เม.ย.", "เมษายน", "พ.ค.", "พฤษภาคม", "มิ.ย.", "มิถุนายน", 
    "ก.ค.", "กรกฎาคม", "ส.ค.", "สิงหาคม", "ก.ย.", "กันยายน", 
    "ต.ค.", "ตุลาคม", "พ.ย.", "พฤศจิกายน", "ธ.ค.", "ธันวาคม"
  ];
  
  const thaiRegexStr = `(\\d{1,2})\\s*(${thaiMonthNames.join('|').replace(/\./g, '\\.')})\\s*(\\d{2,4})?`;
  const thaiRegex = new RegExp(thaiRegexStr, 'g');
  
  while ((match = thaiRegex.exec(s)) !== null) {
    let d = parseInt(match[1], 10);
    let monthStr = match[2];
    let yStr = match[3];
    
    let m = -1;
    if (monthStr.includes("ม.ค.") || monthStr.includes("มกราคม")) m = 0;
    else if (monthStr.includes("ก.พ.") || monthStr.includes("กุมภาพันธ์")) m = 1;
    else if (monthStr.includes("มี.ค.") || monthStr.includes("มีนาคม")) m = 2;
    else if (monthStr.includes("เม.ย.") || monthStr.includes("เมษายน")) m = 3;
    else if (monthStr.includes("พ.ค.") || monthStr.includes("พฤษภาคม")) m = 4;
    else if (monthStr.includes("มิ.ย.") || monthStr.includes("มิถุนายน")) m = 5;
    else if (monthStr.includes("ก.ค.") || monthStr.includes("กรกฎาคม")) m = 6;
    else if (monthStr.includes("ส.ค.") || monthStr.includes("สิงหาคม")) m = 7;
    else if (monthStr.includes("ก.ย.") || monthStr.includes("กันยายน")) m = 8;
    else if (monthStr.includes("ต.ค.") || monthStr.includes("ตุลาคม")) m = 9;
    else if (monthStr.includes("พ.ย.") || monthStr.includes("พฤศจิกายน")) m = 10;
    else if (monthStr.includes("ธ.ค.") || monthStr.includes("ธันวาคม")) m = 11;

    if (d >= 1 && d <= 31 && m >= 0) {
      let y = new Date().getFullYear();
      if (yStr) {
        y = parseInt(yStr, 10);
        if (y < 100) {
          if (y >= 50) y += 2500;
          else y += 2000;
        }
      }
      parsedDate = createThaiDate(y, m, d);
      break;
    }
  }

  if (parsedDate) return fixDate(parsedDate);

  const fallback = new Date(s);
  if (!isNaN(fallback.getTime())) {
    return fixDate(fallback);
  }
  
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

    } else if (type === 'GR') {
      const poNumber = findValue(payload, ['PO Number', 'PO', 'PONumber', 'po_number', 'เลขที่ใบสั่งซื้อ', 'เลขที่สั่งซื้อ', 'เลข PO']);
      if (!poNumber) {
        return NextResponse.json({ error: 'Missing PO Number for GR' }, { status: 400 });
      }

      const sequenceNo = parseNumber(findValue(payload, ['No', 'Number', 'ลำดับ', 'ลำดับที่']));
      const seqVal = sequenceNo || 0; // Default to 0 if no sequence is provided

      // Upsert PO first to prevent FK constraint failure
      await prisma.purchaseOrder.upsert({
        where: { poNumber: String(poNumber) },
        update: {},
        create: { poNumber: String(poNumber) }
      });

      const parsedReceivedAt = parseDateStr(findValue(payload, ['Date Received', 'วันที่รับของ', 'วันที่ส่งมอบ']));
      const payloadReceivedAt = parsedReceivedAt ? parsedReceivedAt : undefined;

      const payloadDelivNote = findValue(payload, ['Delivery Note Number', 'Delivery Note', 'เลขที่ใบส่งของ', 'ใบส่งของ']);
      const payloadRecipient = findValue(payload, ['Recipient', 'ผู้รับ', 'ผู้รับของ', 'ผุ้รับของ']);

      const isCompleteStr = findValue(payload, ['Complete Delivery', 'ส่งครบ']) || '';
      const isIncompleteStr = findValue(payload, ['Incomplete Delivery', 'ส่งไม่ครบ']) || '';

      await prisma.goodsReceipt.upsert({
        where: {
          poNumber_sequenceNo: {
            poNumber: String(poNumber),
            sequenceNo: seqVal
          }
        },
        update: {
          recordedAt: parseDateStr(findValue(payload, ['Date Recorded', 'Date', 'วัน/เดือน/ปี', 'วันที่', 'วันที่บันทึก'])),
          company: findValue(payload, ['Company', 'บริษัท']),
          item: findValue(payload, ['Purchase Item', 'Item', 'รายการ', 'สินค้า']),
          quantity: parseNumber(findValue(payload, ['Quantity', 'จำนวนสั่ง', 'จำนวน'])),
          totalAmount: parseNumber(findValue(payload, ['Total Amount', 'Total', 'ยอดรวม', 'ยอด'])),
          creditTerm: findValue(payload, ['Credit Term', 'Credit', 'เครดิตเทอม', 'เครดิต']),
          status: findValue(payload, ['Status', 'สถานะ']),
          targetDeliveryDate: parseDateStr(findValue(payload, ['Target Delivery Date', 'วันที่นัดส่ง', 'กำหนดส่ง'])),
          deliveredQuantity: parseNumber(findValue(payload, ['Quantity Delivered', 'จำนวนส่ง', 'จำนวนส่งมอบ'])),
          receivedAt: payloadReceivedAt,
          deliveryNoteNumber: payloadDelivNote !== undefined ? String(payloadDelivNote) : undefined,
          recipient: payloadRecipient !== undefined ? String(payloadRecipient) : undefined,
          isCompleteDelivery: String(isCompleteStr).toLowerCase() === 'true' || String(isCompleteStr) === '1' || String(isCompleteStr).includes('ครบ'),
          isIncompleteDelivery: String(isIncompleteStr).toLowerCase() === 'true' || String(isIncompleteStr) === '1' || String(isIncompleteStr).includes('ไม่ครบ')
        },
        create: {
          poNumber: String(poNumber),
          sequenceNo: seqVal,
          recordedAt: parseDateStr(findValue(payload, ['Date Recorded', 'Date', 'วัน/เดือน/ปี', 'วันที่', 'วันที่บันทึก'])),
          company: findValue(payload, ['Company', 'บริษัท']),
          item: findValue(payload, ['Purchase Item', 'Item', 'รายการ', 'สินค้า']),
          quantity: parseNumber(findValue(payload, ['Quantity', 'จำนวนสั่ง', 'จำนวน'])),
          totalAmount: parseNumber(findValue(payload, ['Total Amount', 'Total', 'ยอดรวม', 'ยอด'])),
          creditTerm: findValue(payload, ['Credit Term', 'Credit', 'เครดิตเทอม', 'เครดิต']),
          status: findValue(payload, ['Status', 'สถานะ']),
          targetDeliveryDate: parseDateStr(findValue(payload, ['Target Delivery Date', 'วันที่นัดส่ง', 'กำหนดส่ง'])),
          deliveredQuantity: parseNumber(findValue(payload, ['Quantity Delivered', 'จำนวนส่ง', 'จำนวนส่งมอบ'])),
          receivedAt: parsedReceivedAt,
          deliveryNoteNumber: payloadDelivNote ? String(payloadDelivNote) : null,
          recipient: payloadRecipient ? String(payloadRecipient) : null,
          isCompleteDelivery: String(isCompleteStr).toLowerCase() === 'true' || String(isCompleteStr) === '1' || String(isCompleteStr).includes('ครบ'),
          isIncompleteDelivery: String(isIncompleteStr).toLowerCase() === 'true' || String(isIncompleteStr) === '1' || String(isIncompleteStr).includes('ไม่ครบ')
        }
      });

      return NextResponse.json({ success: true, message: `GR for PO ${poNumber} synced` });

    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Procurement sync error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
