import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { sendPushToUser } from '@/app/lib/pushNotification';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { target } = body; // "SALES" | "SERVICE"

    const survey = await prisma.customerSatisfaction.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    if (target === "SALES") {
      const relatedUsers = await prisma.quotation.findMany({
        where: { companyId: survey.companyId },
        select: { salespersonId: true },
      });

      for (const user of relatedUsers) {
        if (user.salespersonId) {
          await sendPushToUser(user.salespersonId, {
            title: "📊 New satisfaction survey results",
            body: `${survey.company.companyName} — Average score ${survey.scoreAverage.toFixed(1)}/5`,
            url: `/marketing/satisfaction/${survey.id}`,
            category: "SATISFACTION"
          });
        }
      }
    } else if (target === "SERVICE") {
      const relatedInstalls = await prisma.installationOrder.findMany({
        where: { company: survey.company.companyName },
        select: { technicianUserId: true },
      });

      for (const install of relatedInstalls) {
        if (install.technicianUserId) {
          await sendPushToUser(install.technicianUserId, {
            title: "📊 New satisfaction survey results",
            body: `${survey.company.companyName} — Average score ${survey.scoreAverage.toFixed(1)}/5`,
            url: `/marketing/satisfaction/${survey.id}`,
            category: "SATISFACTION"
          });
        }
      }
    }

    const updatedSurvey = await prisma.customerSatisfaction.update({
      where: { id },
      data: {
        sharedToSales: target === "SALES" ? true : survey.sharedToSales,
        sharedToService: target === "SERVICE" ? true : survey.sharedToService,
        sharedAt: new Date()
      }
    });

    return NextResponse.json(updatedSurvey);
  } catch (error) {
    console.error('Error sharing survey:', error);
    return NextResponse.json({ error: 'Failed to share survey' }, { status: 500 });
  }
}
