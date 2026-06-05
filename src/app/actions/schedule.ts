'use server'

import prisma from '@/app/lib/db'
import { teraDb } from '@/app/lib/teraDb'
import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'

export async function getStaffSchedules(preFetchedUser?: any) {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const user = preFetchedUser || await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    let whereClause: any = { userId: user.id }
    if (user.role === 'ผู้จัดการ' || (user.role || '').toLowerCase() === 'sales manager') {
      const subordinates = await teraDb.employees.findMany({
        where: { supervisor_id: user.employeeId, is_active: true },
        select: { emp_id: true }
      })
      const subEmpIds = subordinates.map(s => s.emp_id)

      const teamUsers = await prisma.user.findMany({
        where: { employeeId: { in: subEmpIds }, isActive: true },
        select: { id: true }
      })
      const subUserIds = teamUsers.map(u => u.id)

      whereClause = {
        OR: [
          { userId: { in: subUserIds } },
          { userId: user.id }
        ]
      }
    }

    const schedules = await prisma.schedule.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            fullName: true
          }
        },
        company: {
          select: {
            companyName: true,
            businessType: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    return { success: true, data: schedules }
  } catch (error: any) {
    console.error('Error fetching schedules:', error)
    return { success: false, error: 'Failed to fetch schedules' }
  }
}

export async function createSchedule(data: { userId: string, title: string, description?: string, date: string, time?: string, status?: string }) {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const targetUserId = data.userId || user.id

    // If user is not manager, they can only create for themselves.
    // If user is manager, they can create for themselves or their subordinates.
    if (user.role !== 'ผู้จัดการ' && (user.role || '').toLowerCase() !== 'sales manager') {
      if (targetUserId !== user.id) {
        return { success: false, error: 'Access Denied. You can only create your own schedule.' }
      }
    } else {
      // Manager check: is targetUserId a subordinate or self?
      if (targetUserId !== user.id) {
        // Fetch subordinates from TERA_db to verify
        const subordinates = await teraDb.employees.findMany({
          where: { supervisor_id: user.employeeId, is_active: true },
          select: { emp_id: true }
        });
        const subEmpIds = subordinates.map(s => s.emp_id);
        
        const subordinate = await prisma.user.findFirst({
          where: {
            id: targetUserId,
            employeeId: { in: subEmpIds }
          }
        })
        if (!subordinate) {
          return { success: false, error: 'Access Denied. You can only create schedules for your subordinates.' }
        }
      }
    }

    // Combine date and time
    let scheduleDate = new Date(data.date)
    if (data.time) {
      const [hours, minutes] = data.time.split(':').map(Number)
      scheduleDate.setHours(hours, minutes)
    }

    // Find or create company if companyName is provided
    let companyId = null
    const companyName = (data as any).companyName
    if (companyName) {
      let company = await prisma.company.findFirst({
        where: { companyName }
      })

      if (!company) {
        // Create basic company info
        company = await prisma.company.create({
          data: {
            companyName,
            taxId: (data as any).taxId,
            address: (data as any).address,
            subDistrict: (data as any).subDistrict,
            district: (data as any).district,
            province: (data as any).province,
            postalCode: (data as any).postalCode,
            businessType: (data as any).businessType,
          }
        })
      }
      companyId = company.id
    }

    const schedule = await prisma.schedule.create({
      data: {
        userId: targetUserId,
        companyId,
        title: data.title,
        description: data.description,
        date: scheduleDate,
        status: data.status || 'Planned'
      },
      include: {
        company: true
      }
    })

    return { success: true, data: schedule }
  } catch (error: any) {
    console.error('Error creating schedule:', error)
    return { success: false, error: 'Failed to create schedule' }
  }
}
export async function updateSchedule(id: string, data: { 
  title?: string, 
  description?: string, 
  date?: string, 
  time?: string, 
  status?: string,
  presentationStatus?: string,
  quotationNumber?: string,
  poNumber?: string,
  invoiceNumber?: string,
  notes?: string,
  visitReport?: string
}) {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const schedule = await prisma.schedule.findUnique({
      where: { id }
    })

    if (!schedule) {
      return { success: false, error: 'Schedule not found' }
    }

    // Access check: self or subordinate
    if (user.role !== 'ผู้จัดการ' && (user.role || '').toLowerCase() !== 'sales manager' && schedule.userId !== user.id) {
      return { success: false, error: 'Access Denied.' }
    }

    // Combine date and time if provided
    let scheduleDate = schedule.date
    if (data.date) {
      scheduleDate = new Date(data.date)
      if (data.time) {
        const [hours, minutes] = data.time.split(':').map(Number)
        scheduleDate.setHours(hours, minutes)
      } else {
        // Keep old time but change date
        scheduleDate.setHours(schedule.date.getHours(), schedule.date.getMinutes())
      }
    } else if (data.time) {
      // Keep old date but change time
      scheduleDate = new Date(schedule.date)
      const [hours, minutes] = data.time.split(':').map(Number)
      scheduleDate.setHours(hours, minutes)
    }

    // Find or create company if companyName is provided
    let companyId = schedule.companyId
    const companyName = (data as any).companyName
    if (companyName) {
      let company = await prisma.company.findFirst({
        where: { companyName }
      })

      if (!company) {
        company = await prisma.company.create({
          data: {
            companyName,
            taxId: (data as any).taxId,
            address: (data as any).address,
            subDistrict: (data as any).subDistrict,
            district: (data as any).district,
            province: (data as any).province,
            postalCode: (data as any).postalCode,
            businessType: (data as any).businessType,
          }
        })
      }
      companyId = company.id
    }

    const updated = await prisma.schedule.update({
      where: { id },
      data: {
        ...(data.title !== undefined        ? { title: data.title }                        : {}),
        ...(data.description !== undefined  ? { description: data.description }            : {}),
        ...(scheduleDate !== schedule.date  ? { date: scheduleDate }                       : {}),
        ...(data.status !== undefined       ? { status: data.status }                      : {}),
        ...(companyId !== undefined         ? { companyId }                                : {}),
        ...(data.presentationStatus !== undefined ? { presentationStatus: data.presentationStatus } : {}),
        ...(data.quotationNumber !== undefined    ? { quotationNumber: data.quotationNumber }       : {}),
        ...(data.poNumber !== undefined           ? { poNumber: data.poNumber }                     : {}),
        ...(data.invoiceNumber !== undefined      ? { invoiceNumber: data.invoiceNumber }           : {}),
        ...(data.notes !== undefined              ? { notes: data.notes }                           : {}),
        ...(data.visitReport !== undefined        ? { visitReport: data.visitReport }               : {}),
      },
      include: {
        company: true
      }
    })


    return { success: true, data: updated }
  } catch (error: any) {
    console.error('Error updating schedule:', error)
    return { success: false, error: 'Failed to update schedule' }
  }
}

export async function deleteSchedule(id: string) {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const schedule = await prisma.schedule.findUnique({
      where: { id }
    })

    if (!schedule) {
      return { success: false, error: 'Schedule not found' }
    }

    if (user.role !== 'ผู้จัดการ' && (user.role || '').toLowerCase() !== 'sales manager' && schedule.userId !== user.id) {
      return { success: false, error: 'Access Denied.' }
    }

    await prisma.schedule.delete({
      where: { id }
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting schedule:', error)
    return { success: false, error: 'Failed to delete schedule' }
  }
}
