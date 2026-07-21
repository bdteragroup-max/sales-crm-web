import prisma from './src/app/lib/db';

async function main() {
  const jobs = await prisma.job.findMany({
    where: {
      jobNumber: { in: ['JB69-070106', 'JB69-070107'] }
    }
  });

  for (const job of jobs) {
    console.log(`\n=== Job: ${job.jobNumber} ===`);
    console.log(`sellerName: "${job.sellerName}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
