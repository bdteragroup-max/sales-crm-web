const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { role: true, fullName: true }
  });
  const roles = [...new Set(users.map(u => u.role))];
  console.log("Unique roles:", roles);
  
  const serviceManagers = users.filter(u => 
    (u.role.toLowerCase().includes('manager') || u.role.includes('ผู้จัดการ')) && 
    (u.role.toLowerCase().includes('service') || u.role.includes('บริการ') || u.role.includes('ช่าง'))
  );
  console.log("Service Managers:", serviceManagers);
}
main().catch(console.error).finally(() => prisma.$disconnect());
