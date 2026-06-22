import prisma from '../src/app/lib/db'

async function main() {
  console.log('Restoring legitimately verified payment tasks...')
  const result = await prisma.paymentTask.updateMany({
    where: {
      note: {
        not: null
      }
    },
    data: {
      status: 'ตรวจสอบและบันทึกแล้ว',
      paidDate: new Date(),
    }
  })

  // We should also update the job paymentStatus if all their paymentTasks are completed
  const verifiedTasks = await prisma.paymentTask.findMany({
    where: { note: { not: null } }
  })
  
  const jobIds = [...new Set(verifiedTasks.map(t => t.jobId))]
  
  for (const jobId of jobIds) {
    const pendingTasks = await prisma.paymentTask.count({
      where: {
        jobId: jobId,
        status: { not: 'ตรวจสอบและบันทึกแล้ว' }
      }
    });

    if (pendingTasks === 0) {
      await prisma.job.update({
        where: { id: jobId },
        data: { paymentStatus: 'paid' }
      });
    }
  }

  console.log(`Successfully restored ${result.count} payment tasks to 'ตรวจสอบและบันทึกแล้ว'.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
