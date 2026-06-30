const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    where: { 
      OR: [
        { fullName: { contains: 'Penchan' } }, 
        { fullName: { contains: 'เพ็ญจันทร์' } }, 
        { fullName: { contains: 'Pen' } }
      ] 
    }
  });
  console.log('CRM Users:', users);

  if (prisma.employees) {
    const emps = await prisma.employees.findMany({
      where: { 
        OR: [
          { first_name_en: { contains: 'Penchan' } }, 
          { first_name_th: { contains: 'เพ็ญจันทร์' } }
        ] 
      }
    });
    console.log('HR Employees:', emps);
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
