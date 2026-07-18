import webpush from 'web-push';
import prisma from './db';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:bd.teragroup@gmail.com';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
}

export async function sendWebPush(userIds: string[], title: string, message: string, url: string = '/jobs') {
  if (!publicVapidKey || !privateVapidKey) {
    console.warn('VAPID keys not configured. Skipping push notification.');
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId: { in: userIds },
    },
  });

  const payload = JSON.stringify({
    title,
    body: message,
    url,
  });

  const promises = subscriptions.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, payload);
    } catch (error: any) {
      console.error(`Error sending push notification to endpoint ${sub.endpoint}:`, error);
      if (error.statusCode === 404 || error.statusCode === 410) {
        // Subscription has expired or is no longer valid, delete it
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      }
    }
  });

  await Promise.all(promises);
}
