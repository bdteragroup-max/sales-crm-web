import { PrismaClient } from '../src/generated/client';
const prisma = new PrismaClient();

async function main() {
  const LIST_RENAMES = [
    { old: "To Do", new: "Backlog (Todo)" },
    { old: "In Progress", new: "Assigned to Team" },
    { old: "Review", new: "Product & Service Review" },
    { old: "To Revise", new: "Approval / Revise" },
    { old: "Completed", new: "Done" },
  ];

  for (const rename of LIST_RENAMES) {
    const result = await prisma.kanbanList.updateMany({
      where: { name: rename.old },
      data: { name: rename.new }
    });
    console.log(`Renamed "${rename.old}" to "${rename.new}": ${result.count} lists updated.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
