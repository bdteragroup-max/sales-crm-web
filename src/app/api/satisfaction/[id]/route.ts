import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { resolveInstallationStatusBatch } from '@/app/lib/satisfactionServerHelper';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const survey = await prisma.customerSatisfaction.findUnique({
      where: { id },
      include: {
        company: true,
        surveyor: true,
      }
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    const installStatusMap = await resolveInstallationStatusBatch([{
      companyId: survey.companyId,
      companyName: survey.company?.companyName,
      quotationNumbers: survey.quotationIds || []
    }]);

    const enrichedSurvey = {
      ...survey,
      installationStatus: installStatusMap.get(survey.companyId) || {
        status: 'UNKNOWN',
        label: 'ไม่มีข้อมูลงานติดตั้ง',
        badgeText: 'ไม่มีงานติดตั้ง',
        color: 'gray'
      }
    };

    return NextResponse.json(enrichedSurvey);
  } catch (error) {
    console.error('Error fetching survey:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { analysisNote, actionPlan } = body;

    const updatedSurvey = await prisma.customerSatisfaction.update({
      where: { id },
      data: {
        analysisNote,
        actionPlan
      }
    });

    return NextResponse.json(updatedSurvey);
  } catch (error) {
    console.error('Error updating survey:', error);
    return NextResponse.json({ error: 'Failed to update survey' }, { status: 500 });
  }
}
