import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const round = searchParams.get('round');
  const year = searchParams.get('year');

  if (!companyId || !round || !year) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Convert Buddhist Era (B.E.) to Common Era (C.E.) and offset timezone
  const ceYear = Number(year) - 543;
  const isRound1 = round === '1';
  
  // Adjusted for timezone UTC+7
  const startDate = new Date(`${ceYear}-${isRound1 ? '01' : '07'}-01T00:00:00+07:00`);
  const endMonth = isRound1 ? '06' : '12';
  const endDay = isRound1 ? '30' : '31';
  const endDate = new Date(`${ceYear}-${endMonth}-${endDay}T23:59:59+07:00`);

  try {
    const quotations = await prisma.quotation.findMany({
      where: {
        companyId,
        NOT: {
          OR: [
            { status: { startsWith: 'ปฏิเสธ' } },
            { status: { startsWith: 'ยกเลิก' } },
            { status: { in: ['Lost', 'Rejected', 'Cancelled', 'Pending', 'ไม่ผ่าน'] } }
          ]
        },
        OR: [
          { quotationDate: { gte: startDate, lte: endDate } },
          { poDate: { gte: startDate, lte: endDate } },
          { billingDate: { gte: startDate, lte: endDate } }
        ]
      },
      include: {
        jobs: true,
        contact: true,
        salesperson: { select: { fullName: true } }
      },
      orderBy: [
        { billingDate: 'desc' },
        { poDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const closedStatuses = ["เปิดบิลแล้ว", "PO แล้วรอเงินโอน", "PO แล้วรอสินค้า"];

    const enrichedQuotations = quotations.map(q => {
      const cleanPo = q.poNumber?.trim() || null;
      const cleanInvoice = q.invoiceNumber?.trim() || null;
      const isRejected = q.status?.startsWith('ปฏิเสธ') || q.status?.startsWith('ยกเลิก') || ['Lost', 'Rejected', 'Cancelled', 'Pending', 'ไม่ผ่าน'].includes(q.status);
      const isClosed = !isRejected && (closedStatuses.includes(q.status) || !!cleanPo || !!q.billingDate);
      return {
        ...q,
        poNumber: cleanPo,
        invoiceNumber: cleanInvoice,
        isClosedSale: isClosed
      };
    });

    const closedQuotations = enrichedQuotations.filter(q => q.isClosedSale);
    const openQuotations = enrichedQuotations.filter(q => !q.isClosedSale);

    const productSummary = enrichedQuotations.flatMap(q => {
      if (q.jobs && q.jobs.length > 0) {
        return q.jobs.map(j => ({
          quotationNumber: q.quotationNumber,
          item: j.item,
          jobType: j.jobType,
          isClosedSale: q.isClosedSale,
          poNumber: q.poNumber,
          invoiceNumber: q.invoiceNumber,
          status: q.status,
          billingDate: q.billingDate,
          poDate: q.poDate
        }));
      }
      
      // Fallback if no jobs exist for the quotation
      return [{
        quotationNumber: q.quotationNumber,
        item: q.subject || q.productType || 'Unknown Item',
        jobType: q.productType || 'N/A',
        isClosedSale: q.isClosedSale,
        poNumber: q.poNumber,
        invoiceNumber: q.invoiceNumber,
        status: q.status,
        billingDate: q.billingDate,
        poDate: q.poDate
      }];
    });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        contacts: {
          select: {
            id: true,
            contactName: true,
            position: true,
            mobilePhone: true,
            email: true
          }
        }
      }
    });

    // Merge and deduplicate contacts from company records and quotation relations
    const contactsMap = new Map<string, any>();
    if (company?.contacts) {
      for (const c of company.contacts) {
        if (c.contactName) contactsMap.set(c.contactName.trim().toLowerCase(), c);
      }
    }
    for (const q of enrichedQuotations) {
      if (q.contact?.contactName) {
        const key = q.contact.contactName.trim().toLowerCase();
        if (!contactsMap.has(key)) {
          contactsMap.set(key, {
            id: q.contact.id,
            contactName: q.contact.contactName,
            position: q.contact.position,
            mobilePhone: q.contact.mobilePhone,
            email: q.contact.email
          });
        }
      }
    }
    const allContacts = Array.from(contactsMap.values());

    const defaultContact = closedQuotations.find(q => q.contact?.contactName)?.contact 
      || quotations.find(q => q.contact?.contactName)?.contact 
      || allContacts[0] 
      || null;
    const defaultContactName = defaultContact?.contactName || null;
    const defaultPhone = defaultContact?.mobilePhone || null;

    const latestPoNumber = closedQuotations.find(q => q.poNumber)?.poNumber || null;
    const latestInvoiceNumber = closedQuotations.find(q => q.invoiceNumber)?.invoiceNumber || null;
    const latestClosedDate = closedQuotations[0]?.billingDate || closedQuotations[0]?.poDate || closedQuotations[0]?.quotationDate || null;
    const latestQuotationNumber = closedQuotations[0]?.quotationNumber || quotations[0]?.quotationNumber || null;
    const closedStatus = closedQuotations[0]?.status || (quotations[0]?.status ?? null);
    const totalClosedAmount = closedQuotations.reduce((sum, q) => sum + (q.actualClosingAmount ?? q.totalAmountBeforeVat ?? 0), 0);
    const salespersonName = closedQuotations[0]?.salesperson?.fullName || quotations[0]?.salesperson?.fullName || null;

    return NextResponse.json({
      quotations: enrichedQuotations,
      closedQuotations,
      openQuotations,
      productSummary,
      contacts: allContacts,
      defaultContactName,
      defaultPhone,
      isClosedSale: closedQuotations.length > 0,
      latestPoNumber,
      latestInvoiceNumber,
      latestClosedDate,
      latestQuotationNumber,
      closedStatus,
      totalClosedAmount,
      salespersonName
    });
  } catch (error) {
    console.error('Error fetching company data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
