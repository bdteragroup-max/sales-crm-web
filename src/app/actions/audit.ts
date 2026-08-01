'use server'

import prisma from '@/app/lib/db'

export async function logSuperAdminAction(userId: string, action: string, resource?: string, resourceId?: string, details?: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details,
      }
    })
  } catch (error) {
    console.error('Failed to log super admin action:', error)
  }
}
