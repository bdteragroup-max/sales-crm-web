import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/app/lib/dal";
import prisma from "@/app/lib/db";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();

    const { requiredDeliveryDate } = body;

    const job = await prisma.job.update({
      where: { id },
      data: {
        requiredDeliveryDate: requiredDeliveryDate ? new Date(requiredDeliveryDate) : null,
      },
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("PATCH /api/jobs/[id] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
