"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";

export async function getUnreadNotifications(userId: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          isRead: false,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return { success: true, data: notifications };
    } catch (error: any) {
      const isTransient = error?.message?.includes('timeout') ||
        error?.message?.includes('terminated') ||
        error?.message?.includes('closed') ||
        error?.message?.includes('ECONNRESET');

      if (attempt === 0 && isTransient) {
        // Wait briefly for connection re-establishment then retry
        await new Promise(r => setTimeout(r, 300));
        continue;
      }
      console.error("Error fetching notifications:", error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "Failed to fetch notifications after retry" };
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: error.message };
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, error: error.message };
  }
}
