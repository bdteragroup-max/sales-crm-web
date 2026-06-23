import prisma from '../src/app/lib/db'

async function main() {
  const jobsWithoutTasks = await prisma.job.findMany({
    where: {
      paymentTasks: {
        none: {}
      }
    }
  })

  for (const job of jobsWithoutTasks) {
    let dueDate = new Date(job.dateClosed || job.createdAt);
    if (job.paymentMethod?.includes('เครดิต 30 วัน') || job.paymentMethod === 'เครดิต') {
      dueDate.setDate(dueDate.getDate() + 30);
    } else if (job.paymentMethod?.includes('เครดิต 60 วัน')) {
      dueDate.setDate(dueDate.getDate() + 60);
    } else if (job.paymentMethod === 'เก็บเงินหน้างาน' || job.paymentMethod === 'จ่ายแล้ว') {
      dueDate.setDate(dueDate.getDate() + 7);
    }

    await prisma.paymentTask.create({
      data: {
        jobId: job.id,
        status: 'รอดำเนินการ',
        dueDate,
      }
    });
    console.log(`Created payment task for job ${job.jobNumber}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
