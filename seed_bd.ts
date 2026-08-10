import prisma from './src/app/lib/db';

async function main() {
  const defaultTypes = [
    { name: 'EV', description: 'EV Charging Station Project' },
    { name: 'New Branch', description: 'New Branch Expansion' },
    { name: 'Factory', description: 'Factory Construction/Renovation' },
    { name: 'Dev', description: 'Software Development / Tech' },
    { name: 'Database Management', description: 'Data & Database Tasks' },
    { name: 'RFID', description: 'RFID System Implementation' },
    { name: 'Outsource', description: 'Outsourcing Tasks' },
    { name: 'Kaizen', description: 'Process Improvement (Kaizen)' }
  ];

  let count = 0;
  for (const type of defaultTypes) {
    const existing = await prisma.bDWorkType.findUnique({
      where: { name: type.name }
    });
    
    if (!existing) {
      await prisma.bDWorkType.create({
        data: type
      });
      count++;
    }
  }

  console.log({ success: true, seededCount: count });
}

main().catch(console.error);
