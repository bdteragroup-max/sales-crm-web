import prisma from './src/app/lib/db';

async function main() {
  const req = await prisma.materialRequisition.findUnique({
    where: { requisitionNumber: 'REQ-6908-0002' },
    include: { requester: true, approver: true }
  });
  console.log(JSON.stringify(req, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
