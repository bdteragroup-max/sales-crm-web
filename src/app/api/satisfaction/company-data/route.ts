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
        status: {
          notIn: ["Pending", "Lost", "Rejected", "Cancelled", "ยกเลิก", "ไม่ผ่าน"]
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
      orderBy: { createdAt: 'desc' }
    });

    const productSummary = quotations.flatMap(q => {
      if (q.jobs && q.jobs.length > 0) {
        return q.jobs.map(j => ({
          quotationNumber: q.quotationNumber,
          item: j.item,
          jobType: j.jobType
        }));
      }
      
      // Fallback if no jobs exist for the quotation
      return [{
        quotationNumber: q.quotationNumber,
        item: q.subject || q.productType || 'Unknown Item',
        jobType: q.productType || 'N/A'
      }];
    });

    return NextResponse.json({ quotations, productSummary });
  } catch (error) {
    console.error('Error fetching company data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
