import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repairOrder = await prisma.repairOrder.findUnique({
      where: { jobId: id },
      include: {
        job: true
      }
    });

    if (!repairOrder) {
      // If no repair order exists yet, we can return null and handle it on frontend
      // Or we can return a 404. Let's return 404 and let frontend handle it as "not found -> create new"
      return NextResponse.json(null);
    }

    return NextResponse.json(repairOrder);
  } catch (error) {
    console.error('Error fetching repair order:', error);
    return NextResponse.json({ error: 'Failed to fetch repair order' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const repairOrder = await prisma.repairOrder.upsert({
      where: { jobId: id },
      update: {
        invoiceNo: data.invoiceNo,
        deliveryMethod: data.deliveryMethod,
        deliveryNoteNo: data.deliveryNoteNo,
        receiverName: data.receiverName,
        senderName: data.senderName,
        handoverRef: data.handoverRef,
        phoneNumber: data.phoneNumber,
        workType: data.workType,
        forwardedBy: data.forwardedBy,
        items: data.items || [],
        symptoms: data.symptoms,
        settings: data.settings,
        checklist: data.checklist || {},
        checklistImages: data.checklistImages || null,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : null,
        sentDate: data.sentDate ? new Date(data.sentDate) : null,
        company: data.company,
        customerCompany: data.customerCompany,
        customerAddress: data.customerAddress,
        salesPerson: data.salesPerson,
      },
      create: {
        jobId: id,
        invoiceNo: data.invoiceNo,
        deliveryMethod: data.deliveryMethod,
        deliveryNoteNo: data.deliveryNoteNo,
        receiverName: data.receiverName,
        senderName: data.senderName,
        handoverRef: data.handoverRef,
        phoneNumber: data.phoneNumber,
        workType: data.workType,
        forwardedBy: data.forwardedBy,
        items: data.items || [],
        symptoms: data.symptoms,
        settings: data.settings,
        checklist: data.checklist || {},
        checklistImages: data.checklistImages || null,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : null,
        sentDate: data.sentDate ? new Date(data.sentDate) : null,
        company: data.company,
        customerCompany: data.customerCompany,
        customerAddress: data.customerAddress,
        salesPerson: data.salesPerson,
      }
    });

    return NextResponse.json(repairOrder);
  } catch (error) {
    console.error('Error saving repair order:', error);
    return NextResponse.json({ error: 'Failed to save repair order' }, { status: 500 });
  }
}
