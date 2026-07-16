import { NextResponse } from 'next/server';
import prisma from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const { subscription, userId, userAgent } = await req.json();

    if (!subscription || !subscription.endpoint || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert subscription
    await prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        userId,
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
        userAgent: userAgent || null,
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
