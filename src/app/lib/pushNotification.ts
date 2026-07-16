import webpush from 'web-push';
import prisma from '@/app/lib/db';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function sendPushToUser(userId: string, payload: { 
  title: string; 
  body: string; 
  url?: string; 
  category: string;
}) { 
  // Rate limiting (5 minutes debounce for same user and category)
  const recentNotif = await prisma.notification.findFirst({
    where: {
      userId,
      type: payload.category, // category maps to type
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
    }
  });

  if (recentNotif) return; // Prevent duplicate sending

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
