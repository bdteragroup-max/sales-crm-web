import webpush from 'web-push';
import prisma from './db';

// Ensure the VAPID details are set. You must have these in your .env
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:test@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

/**
 * Sends a push notification to all users matching the given role condition.
 * @param role The role to target (e.g. 'บัญชี')
 * @param title Title of the push notification
 * @param body Body of the push notification
 * @param url Optional URL to open when clicked
 */
export async function sendPushToRole(role: string, title: string, body: string, url: string = '/') {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping push notification.');
    return;
  }

  try {
    // 1. Find all users matching the role
    const users = await prisma.user.findMany({
      where: {
        role: {
          contains: role,
          mode: 'insensitive'
        },
        isActive: true,
      },
      select: { id: true }
    });

    if (users.length === 0) return;

    const userIds = users.map(u => u.id);

    // 2. Fetch all their push subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: { in: userIds }
      }
    });

    if (subscriptions.length === 0) return;

    // 3. Send out notifications
    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: '/logo.png', // Ensure this exists in public/
    });

    const pushPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          }
        };

        await webpush.sendNotification(pushSubscription, payload);
      } catch (error: any) {
        // If the subscription is invalid/expired (HTTP 410 Gone), we remove it.
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('Subscription expired/deleted, removing from DB:', sub.endpoint);
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error('Failed to send push to endpoint:', sub.endpoint, error);
        }
      }
    });

    await Promise.all(pushPromises);
  } catch (error) {
    console.error('Error in sendPushToRole:', error);
  }
}
