const { PrismaClient } = require("./src/generated/client"); 
const prisma = new PrismaClient(); 
async function main() { 
  const types = await prisma.checkins.findMany({ distinct: ["type"], select: { type: true } }); 
  console.log("types", types); 
} 
main().finally(() => prisma.$disconnect());
