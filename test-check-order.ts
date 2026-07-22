import prisma from './src/app/lib/db';

async function main() {
  const order = await prisma.order.findUnique({
    where: { orderNumber: 'ORD69-07022' },
    include: {
      quotation: {
        include: {
          jobs: true
        }
      },
      company: true
    }
  });
  
  console.log('Order:', JSON.stringify({
    id: order?.id,
    orderNumber: order?.orderNumber,
    quotationId: order?.quotationId,
    company: order?.company?.companyName,
    quotationNumber: order?.quotation?.quotationNumber,
    jobCount: order?.quotation?.jobs?.length,
    jobs: order?.quotation?.jobs?.map(j => ({
      jobNumber: j.jobNumber,
      jobType: j.jobType,
      item: j.item
    }))
  }, null, 2));
}

main().finally(() => prisma.$disconnect());
