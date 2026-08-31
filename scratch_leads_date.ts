import prisma from './src/app/lib/db'

async function main() {
  const result = await prisma.$queryRaw`
    SELECT DATE("createdAt") as d, COUNT(*)::int as count 
    FROM "MarketingLead" 
    GROUP BY d 
    ORDER BY count DESC 
    LIMIT 10;
  `
  console.log(result)
}

main().catch(console.error).finally(() => prisma.$disconnect())
