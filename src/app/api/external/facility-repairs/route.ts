import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { createFacilityRepairCore } from "@/app/actions/facility-repairs";
import { hashApiKey } from "@/lib/apiKey";

async function validateApiKey(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')

  if (!apiKey) return { error: 'Missing API key', status: 401 }

  const hashedKey = hashApiKey(apiKey)
  const keyRecord = await prisma.externalApiKey.findUnique({
    where: { hashedKey },
  })

  if (!keyRecord || keyRecord.revokedAt) {
    return { error: 'Invalid or revoked API key', status: 401 }
  }

  // Allow ticket:create scope for facility repairs as well since they are related
  if (!keyRecord.scope.includes('ticket:create')) {
    return { error: 'Key does not have permission', status: 403 }
  }

  prisma.externalApiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => { })

  return { keyRecord }
}

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  
  const email = req.nextUrl.searchParams.get("email");
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

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let reporterId = undefined;

  if (data.reporterEmail) {
    const user = await prisma.user.findFirst({ where: { email: data.reporterEmail } });
    if (user) reporterId = user.id;
  }

  try {
    const repair = await createFacilityRepairCore({
      ...data,
      reporterId,
      sourceModule: "checkin"
    });

    return NextResponse.json(repair);
  } catch (error: any) {
    console.error('Error creating facility repair:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
