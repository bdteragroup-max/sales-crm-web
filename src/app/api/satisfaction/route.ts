import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import { resolveInstallationStatusBatch, resolveSalespersonBatch } from '@/app/lib/satisfactionServerHelper';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const round = searchParams.get('round');
    const year = searchParams.get('year');

    const where: any = {};
    if (round && round !== 'all') where.surveyRound = parseInt(round);
    if (year && year !== 'all') where.surveyYear = parseInt(year);

    const surveys = await prisma.customerSatisfaction.findMany({
      where,
      include: {
        company: {
          include: {
            assignedUser: {
              select: { fullName: true }
            }
          }
        },
        surveyor: true,
      },
      orderBy: { surveyDate: 'desc' },
    });

    const batchItems = surveys.map(s => ({
      companyId: s.companyId,
      companyName: s.company?.companyName,
      quotationNumbers: s.quotationIds || []
    }));

    const [installStatusMap, salespersonMap] = await Promise.all([
      resolveInstallationStatusBatch(batchItems),
      resolveSalespersonBatch(surveys.map(s => ({
        companyId: s.companyId,
        quotationNumbers: s.quotationIds || [],
        assignedUserFullName: s.company?.assignedUser?.fullName
      })))
    ]);

    const enrichedSurveys = surveys.map(s => {
      const salespersonName = s.company?.assignedUser?.fullName || salespersonMap.get(s.companyId) || null;
      return {
        ...s,
        salespersonName,
        company: {
          ...s.company,
          assignedUser: s.company?.assignedUser || (salespersonName ? { fullName: salespersonName } : null)
        },
        installationStatus: installStatusMap.get(s.companyId) || {
          status: 'UNKNOWN',
          label: 'ไม่มีข้อมูลงานติดตั้ง',
          badgeText: 'ไม่มีงานติดตั้ง',
          color: 'gray'
        }
      };
    });

    return NextResponse.json(enrichedSurveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      surveyRound,
      surveyYear,
      surveyMethod,
      companyId,
      province,
      phone,
      contactName,
      quotationIds,
      scorePrice,
      scoreQuality,
      scoreDelivery,
      scoreSales,
      scoreSupport,
      scoreAfterSales,
      purchaseReasons,
      suggestions,
      callNotes,
      criteriaComments,
    } = body;

    const surveyBy = user.id;

    const scores = [scorePrice, scoreQuality, scoreDelivery, scoreSales, scoreSupport, scoreAfterSales];
    const scoreAverage = scores.reduce((a, b) => a + b, 0) / scores.length;

    const newSurvey = await prisma.customerSatisfaction.create({
      data: {
        surveyRound,
        surveyYear,
        surveyMethod,
        surveyBy,
        companyId,
        province,
        phone,
        contactName: contactName ? String(contactName).trim() : null,
        quotationIds,
        scorePrice,
        scoreQuality,
        scoreDelivery,
        scoreSales,
        scoreSupport,
        scoreAfterSales,
        scoreAverage,
        purchaseReasons,
        suggestions,
        callNotes,
        criteriaComments,
      }
    });

    // If the company does not have an assignedUserId, auto-link to the quotation's salesperson
    if (companyId) {
      try {
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          select: { assignedUserId: true }
        });
        if (!company?.assignedUserId) {
          const qList = Array.isArray(quotationIds) ? quotationIds.filter(Boolean) : [];
          const quote = await prisma.quotation.findFirst({
            where: {
              OR: [
                ...(qList.length > 0 ? [{ quotationNumber: { in: qList } }] : []),
                { companyId }
              ],
              salespersonId: { not: null }
            },
            select: { salespersonId: true },
            orderBy: [
              { billingDate: 'desc' },
              { poDate: 'desc' },
              { createdAt: 'desc' }
            ]
          });
          if (quote?.salespersonId) {
            await prisma.company.update({
              where: { id: companyId },
              data: { assignedUserId: quote.salespersonId }
            });
          }
        }
      } catch (linkErr) {
        console.warn('Failed to auto-link company assignedUserId:', linkErr);
      }
    }

    return NextResponse.json(newSurvey, { status: 201 });
  } catch (error) {
    console.error('Error creating survey:', error);
    return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 });
  }
}
