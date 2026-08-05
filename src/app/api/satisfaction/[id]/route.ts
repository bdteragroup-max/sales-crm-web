import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

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

    return NextResponse.json(survey);
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
