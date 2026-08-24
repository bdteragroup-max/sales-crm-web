import webpush from 'web-push';
import prisma from '@/app/lib/db';

const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
const formattedSubject = vapidSubject.includes('@') && !vapidSubject.startsWith('mailto:') 
  ? `mailto:${vapidSubject}` 
  : vapidSubject;

webpush.setVapidDetails(
  formattedSubject,
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function sendPushToUser(userId: string, payload: { 
  title: string; 
  body: string; 
  url?: string; 
  category: string;
}) { 
  // 1. Send to the original target user
  await _sendPushToUserCore(userId, payload);

  // 2. Automatically CC SUPER_ADMIN users for all system operations
  try {
    const superAdmins = await prisma.user.findMany({
      where: { role: { contains: 'SUPER_ADMIN', mode: 'insensitive' }, isActive: true },
      select: { id: true }
    });

    for (const sa of superAdmins) {
      if (sa.id === userId) continue; // Already sent

      // Deduplicate: Prevent spamming SUPER_ADMINs when sendPushToUser is called in a batch loop (e.g. Promise.all)
      // Check if an identical notification was sent to this SUPER_ADMIN within the last 1 minute
      const recent = await prisma.notification.findFirst({
        where: {
          userId: sa.id,
          title: payload.title,
          message: payload.body,
          createdAt: { gte: new Date(Date.now() - 60 * 1000) }
        }
      });

      if (!recent) {
        await _sendPushToUserCore(sa.id, payload);
      }
    }
  } catch (err) {
    console.error("Failed to CC super admins", err);
  }
}

async function _sendPushToUserCore(userId: string, payload: { 
  title: string; 
  body: string; 
  url?: string; 
  category: string;
}) { 
  // Map to existing Notification schema fields
  await prisma.notification.create({
    data: {
      userId,
      title: payload.title,
      message: payload.body, // body maps to message
      linkUrl: payload.url,  // url maps to linkUrl
      type: payload.category // category maps to type
    }
  });

  const subscriptions = await prisma.pushSubscription.findMany({ 
    where: { userId } 
  }); 

  const results = await Promise.allSettled( 
    subscriptions.map(sub => 
      webpush.sendNotification( 
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, 
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url,
          icon: '/logo.png', // Or whichever icon we want
        }) 
      ) 
    ) 
  ); 

  // Automatically delete expired subscriptions 
  results.forEach(async (result, i) => { 
    if (result.status === 'rejected' && (result.reason?.statusCode === 410 || result.reason?.statusCode === 404)) {
      await prisma.pushSubscription.delete({
        where: { endpoint: subscriptions[i].endpoint }
      });
    }
  });
}
