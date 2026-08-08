'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'

export async function submitQCReview(
  jobId: string, 
  qcStatus: 'Passed' | 'Needs Correction', 
  qcNotes: string, 
  qcCorrections: string, 
  inspectorName: string
) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update the QC Report
      await tx.cabinetQCReport.update({
        where: { cabinetAssemblyJobId: jobId },
        data: {
          qcStatus,
          qcNotes,
          qcCorrections,
          qcInspectorName: inspectorName
        }
      })

      const job = await tx.cabinetAssemblyJob.findUnique({
        where: { id: jobId },
        include: { order: { include: { cabinetAssemblyJobs: { include: { qcReport: true } } } } }
      })

      if (!job) throw new Error('Job not found')

      // 2. Handle Rejection (Needs Correction)
      if (qcStatus === 'Needs Correction') {
        // Send back to technician
        await tx.cabinetAssemblyJob.update({
          where: { id: jobId },
          data: { status: 'PENDING' } // Technician needs to START it again
        })
        
        // Log action
        await tx.assemblyTimeLog.create({
          data: {
            cabinetAssemblyJobId: jobId,
            action: 'PAUSE', // logically pausing the flow until they start again
            reason: 'QC Rejected: ' + qcCorrections
          }
        })
      } 
      // 3. Handle Approval (Passed)
      else if (qcStatus === 'Passed') {
        const orderId = job.orderId;
        const allJobsInOrder = job.order.cabinetAssemblyJobs;
        
        const allPassed = allJobsInOrder.every(j => {
          if (j.id === jobId) return true; // because we just passed it
          return j.qcReport?.qcStatus === 'Passed'
        })

        if (allPassed) {
          // Update Order Status to "รอจัดส่ง" (Ready for Shipment)
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'รอจัดส่ง' }
          })
        }
      }
    })

    revalidatePath('/production/qc')
    revalidatePath('/technician/production')
    revalidatePath('/orders')

    return { success: true }
  } catch (error: any) {
    console.error('Failed to submit QC review:', error)
    return { success: false, error: error.message }
  }
}
