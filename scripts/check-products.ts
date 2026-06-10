import prisma from '../src/app/lib/db';

async function main() {
  const products = await prisma.quotation.groupBy({
    by: ['productType'],
    _count: { productType: true }
  });
  console.log('Product Types:', products);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
