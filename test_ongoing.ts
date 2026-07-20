import prisma from './src/app/lib/db';

async function main() {
  const projects = await prisma.project.findMany({
    take: 2,
    include: {
      job: {
        include: {
          paymentTasks: true
        }
      }
    }
  });
  console.log('Projects:', JSON.stringify(projects, null, 2));

  const pos = await prisma.purchaseOrder.findMany({take: 5});
  console.log('POs:', JSON.stringify(pos, null, 2));
}

main().finally(() => prisma.$disconnect());
