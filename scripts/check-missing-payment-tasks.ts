import prisma from '../src/app/lib/db'

async function main() {
  // Find all jobs that do NOT have any paymentTasks
  const jobsWithoutTasks = await prisma.job.findMany({
    where: {
      paymentTasks: {
        none: {}
      }
    },
    select: {
      id: true,
      jobNumber: true,
      paymentStatus: true,
      paymentMethod: true
    }
  })

  console.log(`Found ${jobsWithoutTasks.length} jobs with NO payment tasks.`);
  if (jobsWithoutTasks.length > 0) {
    console.table(jobsWithoutTasks.slice(0, 10));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
