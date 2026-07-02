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
    // Handle B.E. (Buddhist Era)
    if (year > 2500) year -= 543;
    // Handle 2-digit years
    if (year < 100) year += 2000;
    
    // Check validity
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  const fallback = new Date(s);
  if (!isNaN(fallback.getTime())) return fallback;
  return undefined;
}

// Helper to find a value by normalizing the key (removing spaces and lowercasing)
function findValue(payload: any, possibleKeys: string[]) {
  const normalizedPayload: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    normalizedPayload[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = v;
  }
  for (const pk of possibleKeys) {
    const nk = pk.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedPayload[nk] !== undefined && normalizedPayload[nk] !== '') {
      return normalizedPayload[nk];
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
    const type = payload.type; // "PR" or "PO"

    if (type === 'PR') {
      const prNumber = findValue(payload, ['PR Number', 'PR', 'PRNumber', 'pr_number']);
      if (!prNumber) {
        return NextResponse.json({ error: 'Missing PR Number' }, { status: 400 });
      }

      await prisma.purchaseRequest.upsert({
        where: { prNumber: String(prNumber) },
        update: {
          no: parseNumber(findValue(payload, ['No', 'Number'])),
          recordedAt: parseDateStr(findValue(payload, ['Date Recorded', 'Date'])),
          projectName: findValue(payload, ['Project Name', 'Project']),
          itemList: findValue(payload, ['Purchase Item', 'Item List', 'Items']),
          requestedBy: findValue(payload, ['Purchasing Requestor', 'Requestor']),
          note: findValue(payload, ['Note', 'Remarks']),
          reportedBy: findValue(payload, ['Notifier', 'Reported By']),
        },
        create: {
          prNumber: String(prNumber),
          no: parseNumber(findValue(payload, ['No', 'Number'])),
          recordedAt: parseDateStr(findValue(payload, ['Date Recorded', 'Date'])),
          projectName: findValue(payload, ['Project Name', 'Project']),
          itemList: findValue(payload, ['Purchase Item', 'Item List', 'Items']),
          requestedBy: findValue(payload, ['Purchasing Requestor', 'Requestor']),
          note: findValue(payload, ['Note', 'Remarks']),
          reportedBy: findValue(payload, ['Notifier', 'Reported By']),
        }
      });

      return NextResponse.json({ success: true, message: `PR ${prNumber} synced` });

    } else if (type === 'PO') {
      const poNumber = findValue(payload, ['PO Number', 'PO', 'PONumber', 'po_number']);
      if (!poNumber) {
        return NextResponse.json({ error: 'Missing PO Number' }, { status: 400 });
      }

      const prNumber = findValue(payload, ['PR Number', 'PR', 'PRNumber', 'pr_number']);
      
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
          no: parseNumber(findValue(payload, ['No', 'Number'])),
          recordedAt: parseDateStr(findValue(payload, ['Date Recorded', 'Date'])),
          prNumber: prNumber ? String(prNumber) : null,
          vendorName: findValue(payload, ['Vendor Name', 'Vendor', 'Supplier']),
          accountNumber: findValue(payload, ['Account Number', 'Account']),
          totalAmount: parseNumber(findValue(payload, ['Total Amount', 'Total'])),
          depositAmount: parseNumber(findValue(payload, ['Deposit Amount', 'Deposit'])),
          remainingAmount: parseNumber(findValue(payload, ['Remaining Amount', 'Remaining'])),
          payment1: parseNumber(findValue(payload, ['Payment 1', 'Payment1'])),
          creditTerm: findValue(payload, ['Credit Term', 'Credit']),
          jobName: findValue(payload, ['Job Name', 'Job']),
          itemList: findValue(payload, ['Purchase Item', 'Item List', 'Items']),
          deliveryDate: parseDateStr(findValue(payload, ['Delivery Date', 'Delivery'])),
          note: findValue(payload, ['Note', 'Remarks']),
          reportedBy: findValue(payload, ['Notifier', 'Reported By']),
        },
        create: {
          poNumber: String(poNumber),
          no: parseNumber(findValue(payload, ['No', 'Number'])),
          recordedAt: parseDateStr(findValue(payload, ['Date Recorded', 'Date'])),
          prNumber: prNumber ? String(prNumber) : null,
          vendorName: findValue(payload, ['Vendor Name', 'Vendor', 'Supplier']),
          accountNumber: findValue(payload, ['Account Number', 'Account']),
          totalAmount: parseNumber(findValue(payload, ['Total Amount', 'Total'])),
          depositAmount: parseNumber(findValue(payload, ['Deposit Amount', 'Deposit'])),
          remainingAmount: parseNumber(findValue(payload, ['Remaining Amount', 'Remaining'])),
          payment1: parseNumber(findValue(payload, ['Payment 1', 'Payment1'])),
          creditTerm: findValue(payload, ['Credit Term', 'Credit']),
          jobName: findValue(payload, ['Job Name', 'Job']),
          itemList: findValue(payload, ['Purchase Item', 'Item List', 'Items']),
          deliveryDate: parseDateStr(findValue(payload, ['Delivery Date', 'Delivery'])),
          note: findValue(payload, ['Note', 'Remarks']),
          reportedBy: findValue(payload, ['Notifier', 'Reported By']),
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
