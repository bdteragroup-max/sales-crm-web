import prisma from './src/app/lib/db'

async function main() {
  const products = await prisma.products.findMany({ select: { id: true, product_name: true, product_code: true } })
  console.log(products)
}

main().catch(console.error).finally(() => prisma.$disconnect())
