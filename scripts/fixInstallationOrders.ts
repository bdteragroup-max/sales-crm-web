import prisma from '../src/app/lib/db';

async function main() {
  console.log("Looking for installation orders with missing jobId...");
  
  const orphanedOrders = await prisma.installationOrder.findMany({
    where: {
      jobId: null
    }
  });

  if (orphanedOrders.length === 0) {
    console.log("No orphaned installation orders found.");
    return;
  }

  for (const order of orphanedOrders) {
    console.log(`Found order ${order.installationNo} without jobId, attempting to link...`);
    // Try to find the job based on jobName or quotationNo
    const job = await prisma.job.findFirst({
      where: {
        OR: [
          { quotationNumber: order.quotationNo || undefined },
          { item: order.jobName || undefined }
        ]
      }
    });

    if (job) {
      await prisma.installationOrder.update({
        where: { id: order.id },
        data: { jobId: job.id }
      });
      console.log(`Linked ${order.installationNo} to Job ${job.jobNumber}`);
    } else {
      console.log(`Could not find a matching job for ${order.installationNo}`);
    }
  }
  
  console.log("Cleanup complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
