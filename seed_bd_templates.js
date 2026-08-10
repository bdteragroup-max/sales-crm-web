const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = [
      {
        name: 'New Branch Template',
        description: 'Standard procedure for opening a new branch',
        workTypeName: 'New Branch',
        steps: [
          { name: 'Coordinate with Manager', orderIndex: 1, checklist: [{ id: '1', label: 'Discuss branch objectives', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Survey', orderIndex: 2, checklist: [{ id: '1', label: 'Site visit', checked: false, checkedBy: null, checkedAt: null }, { id: '2', label: 'Competitor analysis', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Negotiate Rent', orderIndex: 3, checklist: [{ id: '1', label: 'Propose initial rate', checked: false, checkedBy: null, checkedAt: null }, { id: '2', label: 'Finalize agreement', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Request Documents', orderIndex: 4, checklist: [{ id: '1', label: 'Collect ID/Registration', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Sign Contract', orderIndex: 5, checklist: [{ id: '1', label: 'Sign physical contract', checked: false, checkedBy: null, checkedAt: null }] }
        ]
      },
      {
        name: 'EV Station Template',
        description: 'Standard procedure for EV Charging Station',
        workTypeName: 'EV',
        steps: [
          { name: 'Site Evaluation', orderIndex: 1, checklist: [{ id: '1', label: 'Power capacity check', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Permit Application', orderIndex: 2, checklist: [{ id: '1', label: 'Submit to local authority', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Installation', orderIndex: 3, checklist: [{ id: '1', label: 'Install charger', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Testing', orderIndex: 4, checklist: [{ id: '1', label: 'System test run', checked: false, checkedBy: null, checkedAt: null }] }
        ]
      }
    ];

    let count = 0;
    for (const t of templates) {
      const existing = await prisma.bDWorkflowTemplate.findFirst({
        where: { name: t.name }
      });
      if (!existing) {
        const template = await prisma.bDWorkflowTemplate.create({
          data: {
            name: t.name,
            description: t.description,
            steps: {
              create: t.steps.map(s => ({
                name: s.name,
                orderIndex: s.orderIndex,
                checklist: s.checklist
              }))
            }
          }
        });
        
        // Link to work type
        const workType = await prisma.bDWorkType.findUnique({
          where: { name: t.workTypeName }
        });
        
        if (workType) {
          await prisma.bDWorkType.update({
            where: { id: workType.id },
            data: { defaultTemplateId: template.id }
          });
        }
        count++;
      }
    }
    console.log(`Seeded ${count} templates`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
