'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'

export async function createCabinetAssemblyJobs(orderId: string, technicianId: string, count: number) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) throw new Error('Order not found')

    const jobs = []
    for (let i = 1; i <= count; i++) {
      const jobNumber = `${order.orderNumber}-CAB-${i.toString().padStart(2, '0')}`

      const job = await prisma.cabinetAssemblyJob.upsert({
        where: { jobNumber },
        update: {},
        create: {
          orderId,
          technicianId,
          jobNumber,
          cabinetIndex: i,
          status: 'PENDING'
        }
      })
      jobs.push(job)
    }

    revalidatePath('/technician/production')
    return { success: true, jobs }
  } catch (error: any) {
    console.error('Failed to create assembly jobs:', error)
    return { success: false, error: error.message }
  }
}

export async function logAssemblyAction(jobId: string, action: 'START' | 'PAUSE' | 'END', reason?: string) {
  try {
    // Determine new status based on action
    let newStatus = 'IN_PROGRESS'
    if (action === 'PAUSE') newStatus = 'PAUSED'
    if (action === 'END') newStatus = 'COMPLETED'

    await prisma.$transaction(async (tx) => {
      await tx.assemblyTimeLog.create({
        data: {
          cabinetAssemblyJobId: jobId,
          action,
          reason
        }
      })

      await tx.cabinetAssemblyJob.update({
        where: { id: jobId },
        data: { status: newStatus }
      })
    })

    revalidatePath('/technician/production')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to log assembly action:', error)
    return { success: false, error: error.message }
  }
}

export async function submitCabinetQC(jobId: string, qcData: any) {
  try {
    await prisma.$transaction(async (tx) => {
      // End the job if it's not already ended
      const job = await tx.cabinetAssemblyJob.findUnique({
        where: { id: jobId },
        include: { timeLogs: { orderBy: { timestamp: 'asc' } } }
      })

      let normalTimeMinutes = 0;
      let overtimeMinutes = 0;

      if (job) {
        const logs = [...job.timeLogs];
        const now = new Date();

        if (job.status !== 'COMPLETED') {
          await tx.assemblyTimeLog.create({
            data: {
              cabinetAssemblyJobId: jobId,
              action: 'END',
              reason: 'QC Submitted'
            }
          })
          logs.push({ action: 'END', timestamp: now } as any);
        }

        // Calculate time
        let startTime = 0;
        for (const log of logs) {
          if (log.action === 'START') {
            startTime = new Date(log.timestamp).getTime();
          } else if (log.action === 'PAUSE' || log.action === 'END') {
            if (startTime > 0) {
              const endTime = new Date(log.timestamp).getTime();
              let current = startTime;
              while (current < endTime) {
                const d = new Date(current);
                if (d.getHours() >= 18 || d.getHours() < 8) {
                  overtimeMinutes++;
                } else {
                  normalTimeMinutes++;
                }
                current += 60000;
              }
              startTime = 0;
            }
          }
        }

        await tx.cabinetAssemblyJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            normalTimeMinutes,
            overtimeMinutes
          }
        })
      }

      // Create QC Report
      await tx.cabinetQCReport.upsert({
        where: { cabinetAssemblyJobId: jobId },
        update: qcData,
        create: {
          cabinetAssemblyJobId: jobId,
          ...qcData
        }
      })
    })

    revalidatePath('/technician/production')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to submit QC report:', error)
    return { success: false, error: error.message }
  }
}
