import prisma from './src/app/lib/db';

async function main() {
  const orders = await prisma.order.findMany();
  console.log(`Total Orders: ${orders.length}`);

  const statusCount: Record<string, number> = {};
  for (const o of orders) {
    statusCount[o.status] = (statusCount[o.status] || 0) + 1;
  }
  console.log('Order Statuses:', statusCount);

  // Let's also check if ANY jobs are missing an order
  const jobs = await prisma.job.findMany({
    where: {
      jobType: {
        in: ['งานตู้', 'งานตู้ + ติดตั้ง', 'Cabinet Work', 'Cabinet Work + Installation']
      }
    }
  });

  const jobsWithoutOrder = jobs.filter(j => {
    if (j.quotationId) {
      return !orders.some(o => o.quotationId === j.quotationId);
    }
    return true; 
  });

  console.log(`Jobs missing order: ${jobsWithoutOrder.length}`);
  
  // Show a sample Order for context
  console.log("Sample Order:", orders[0]);
}

main().catch(console.error).finally(() => prisma.$disconnect());
