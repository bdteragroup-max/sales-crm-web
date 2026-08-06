import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export async function GET() {
  const LIST_RENAMES = [
    { old: "To Do", new: "Backlog (Todo)" },
    { old: "In Progress", new: "Assigned to Team" },
    { old: "Review", new: "Product & Service Review" },
    { old: "To Revise", new: "Approval / Revise" },
    { old: "Completed", new: "Done" },
  ];

  let output = [];
  for (const rename of LIST_RENAMES) {
    const result = await prisma.kanbanList.updateMany({
      where: { name: rename.old },
      data: { name: rename.new }
    });
    output.push(`Renamed "${rename.old}" to "${rename.new}": ${result.count} lists updated.`);
  }

  return NextResponse.json({ success: true, logs: output });
}
