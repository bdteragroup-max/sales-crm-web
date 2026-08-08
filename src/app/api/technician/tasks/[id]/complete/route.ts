import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const body = await request.json();
    
    const task = await prisma.technicianTask.update({
      where: { id: params.id },
      data: {
        status: "DONE",
        completedAt: new Date(),
        completedNote: body.completedNote,
        photosBefore: body.photosBefore,
        photosAfter: body.photosAfter
      }
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
