import prisma from './src/app/lib/db';
async function main() {
  const ro = await prisma.repairOrder.findUnique({
    where: { jobId: 'cmq8zinkl000104kz6mu21hwf' },
    include: { job: true }
  });
  console.log(JSON.stringify(ro, null, 2));
}
main().finally(() => process.exit(0));
