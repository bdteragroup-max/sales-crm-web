import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { createFacilityRepairCore } from "@/app/actions/facility-repairs";

// We assume there's a helper for API key validation
function validateApiKey(req: Request) {
  // Simplified for this example
  const apiKey = req.headers.get("x-api-key");
  return apiKey === process.env.EXTERNAL_API_KEY; // or whatever the CRM uses
}

export async function GET(req: Request) {
  if (!validateApiKey(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const repairs = await prisma.facilityRepairRequest.findMany({
    where: {
      OR: [
        { reporterEmail: email },
        { reporter: { email } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(repairs);
}

export async function POST(req: Request) {
  if (!validateApiKey(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  let reporterId = undefined;

  if (data.reporterEmail) {
    const user = await prisma.user.findFirst({ where: { email: data.reporterEmail } });
    if (user) reporterId = user.id;
  }

  const repair = await createFacilityRepairCore({
    ...data,
    reporterId,
    sourceModule: "checkin"
  });

  return NextResponse.json(repair);
}