import prisma from './src/app/lib/db';

async function main() {
  const ioStatuses = await prisma.installationOrder.findMany({
    select: { status: true },
    distinct: ['status']
  });
  console.log("InstallationOrder statuses:", ioStatuses.map(s => s.status));

  const jobSteps = await prisma.job.findMany({
    select: { currentStep: true },
    distinct: ['currentStep']
  });
  console.log("Job currentSteps:", jobSteps.map(s => s.currentStep));
}

main().catch(console.error).finally(() => prisma.$disconnect());
