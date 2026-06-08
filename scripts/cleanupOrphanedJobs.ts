import prisma from '../src/app/lib/db';

async function main() {
  console.log("Looking for orphaned jobs (jobs with a quotation number but no linked quotation ID)...");
  
  const orphanedJobs = await prisma.job.findMany({
    where: {
      quotationNumber: { not: "" },
      quotationId: null
    }
  });

  if (orphanedJobs.length === 0) {
    console.log("No orphaned jobs found.");
    return;
  }

  console.log(`Found ${orphanedJobs.length} orphaned jobs:`, orphanedJobs.map(j => j.jobNumber).join(", "));
  
  for (const job of orphanedJobs) {
    await prisma.job.delete({ where: { id: job.id } });
    console.log(`Deleted job ${job.jobNumber}`);
  }
  
  console.log("Cleanup complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
