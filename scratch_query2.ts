import prisma from './src/app/lib/db';
async function main() {
  let ro = await prisma.repairOrder.findUnique({
    where: { id: 'cmq8zinq0000204kzi7szgq2y' },
    include: { job: true }
  });
  if (!ro) {
    console.log('Not found by ID, trying by jobId...');
    ro = await prisma.repairOrder.findUnique({
      where: { jobId: 'cmq8zinq0000204kzi7szgq2y' },
      include: { job: true }
    });
  }
  console.log(JSON.stringify(ro, null, 2));
}
main().finally(() => process.exit(0));
