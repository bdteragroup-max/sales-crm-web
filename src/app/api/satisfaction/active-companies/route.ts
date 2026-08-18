import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const round = searchParams.get('round');
  const year = searchParams.get('year');
  const method = searchParams.get('method');

  if (!round || !year) {
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
        // Filter for successfully closed sales (based on actual DB statuses)
        status: {
          in: ["เปิดบิลแล้ว", "PO แล้วรอเงินโอน"]
        },
        salespersonId: {
          not: 'cmq7iv42y000004l496tyrofk' // Exclude Mr. Teerawat Pokphet
        },
        OR: [
          { quotationDate: { gte: startDate, lte: endDate } },
          { poDate: { gte: startDate, lte: endDate } },
          { billingDate: { gte: startDate, lte: endDate } }
        ]
      },
      select: {
        companyId: true,
        company: {
          select: {
            id: true,
            companyName: true,
            province: true,
            assignedUser: { select: { fullName: true } },
            contacts: { select: { mobilePhone: true } }
          }
        }
      },
      distinct: ['companyId']
    });

    // Find companies that have already been evaluated in this round/year/method
    const existingSurveys = await prisma.customerSatisfaction.findMany({
      where: {
        surveyRound: parseInt(round),
        surveyYear: parseInt(year),
        ...(method ? { surveyMethod: method } : {})
      },
      select: { companyId: true }
    });
    const evaluatedCompanyIds = new Set(existingSurveys.map(s => s.companyId));

    // Extract unique companies, filtering out any nulls and already evaluated ones
    const companies = quotations
      .map(q => q.company)
      .filter(Boolean)
      .filter(c => c && !evaluatedCompanyIds.has(c.id));

    return NextResponse.json({ companies });
  } catch (error) {
    console.error('Error fetching active companies:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
