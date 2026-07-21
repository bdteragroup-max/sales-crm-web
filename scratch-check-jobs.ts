import prisma from './src/app/lib/db';

async function main() {
  const jobs = await prisma.job.findMany({
    where: {
      jobNumber: { in: ['JB69-070106', 'JB69-070107'] }
    },
    include: { quotation: true }
  });

  for (const job of jobs) {
    console.log(`\n=== Job: ${job.jobNumber} ===`);
    console.log(`Type: ${job.jobType}, Status: ${job.currentStep}, QuotationId: ${job.quotationId}`);
    
    if (job.quotationId) {
      const order = await prisma.order.findFirst({
        where: { quotationId: job.quotationId }
      });
      if (order) {
        console.log(`Found Order: ${order.orderNumber}, Status: ${order.status}, SalespersonId: ${order.salespersonId}`);
        const salesperson = await prisma.user.findUnique({ where: { id: order.salespersonId || '' } });
        console.log(`Order Salesperson: ${salesperson?.fullName} (${salesperson?.role})`);
      } else {
        console.log(`NO ORDER FOUND FOR THIS QUOTATION!`);
      }
    } else {
      console.log(`NO QUOTATION ID FOR THIS JOB!`);
    }
  }

  // Find Suwanna
  const suwanna = await prisma.user.findFirst({
    where: { fullName: { contains: 'สุวรรณา' } }
  });
  if (suwanna) {
    console.log(`\nSuwanna ID: ${suwanna.id}, Role: ${suwanna.role}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
