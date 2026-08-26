import prisma from './src/app/lib/db';

async function checkMedals() {
  const month = 8;
  const year = 2026;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  
  try {
    const technicianUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { contains: 'technician', mode: 'insensitive' } },
          { role: { contains: 'ช่าง', mode: 'insensitive' } },
          { role: { contains: 'service', mode: 'insensitive' } },
          { role: { contains: 'installation', mode: 'insensitive' } }
        ],
        employeeId: { not: '' }
      }
    });

    const results = [];
    
    for (const user of technicianUsers) {
      // 1. Cabinet Assembly Jobs
      const cabinetJobs = await prisma.cabinetAssemblyJob.count({
        where: {
          technicianId: user.id,
          status: 'COMPLETED',
          updatedAt: { gte: monthStart, lt: monthEnd },
          qcReport: {
            qcStatus: { contains: 'Completed', mode: 'insensitive' }
          }
        }
      });

      // 2. Assigned Tasks (TechnicianTask)
      const assignedTasks = await prisma.technicianTask.count({
        where: {
          technicianIds: { has: user.id },
          AND: [
            {
              OR: [
                { status: { contains: 'Completed', mode: 'insensitive' } },
                { status: 'DONE' },
                { completedAt: { not: null } }
              ]
            },
            {
              OR: [
                { completedAt: { gte: monthStart, lt: monthEnd } },
                { updatedAt: { gte: monthStart, lt: monthEnd } }
              ]
            }
          ]
        }
      });

      const totalTasks = cabinetJobs + assignedTasks;

      // Medals Threshold: 10, 20, 30
      let targetTierGold = 0;
      if (totalTasks >= 30) targetTierGold = 3;
      else if (totalTasks >= 20) targetTierGold = 2;
      else if (totalTasks >= 10) targetTierGold = 1;

      results.push({
        name: user.fullName,
        role: user.role,
        cabinetJobs,
        assignedTasks,
        totalTasks,
        medals: targetTierGold
      });
    }
    
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkMedals();
