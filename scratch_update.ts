import prisma from './src/app/lib/db';
async function main() {
  const ro = await prisma.repairOrder.findUnique({
    where: { jobId: 'cmq8zinkl000104kz6mu21hwf' }
  });
  if (ro) {
    const cl = ro.checklist as any;
    cl.Cover = true;
    cl.TermCover = true;
    await prisma.repairOrder.update({
      where: { id: ro.id },
      data: { checklist: cl }
    });
    console.log('Updated checklist in DB');
  }
}
main().finally(() => process.exit(0));
