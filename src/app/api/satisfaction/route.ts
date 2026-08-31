import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const round = searchParams.get('round');
    const year = searchParams.get('year');

    const where: any = {};
    if (round) where.surveyRound = parseInt(round);
    if (year) where.surveyYear = parseInt(year);

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

    return NextResponse.json(surveys);
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

    return NextResponse.json(newSurvey, { status: 201 });
  } catch (error) {
    console.error('Error creating survey:', error);
    return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 });
  }
}
