import prisma from './src/app/lib/db';
async function generateBoqNumberForDate(date: Date): Promise<string> {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `BOQ-${year}${month}-`;

  const highestBoq = await prisma.customerRequirement.findFirst({
    where: {
      boqNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      boqNumber: 'desc',
    },
  });

  let nextSequence = 1;
  if (highestBoq && highestBoq.boqNumber) {
    const sequencePart = highestBoq.boqNumber.replace(prefix, '');
    const currentSequence = parseInt(sequencePart, 10);
    if (!isNaN(currentSequence)) {
      nextSequence = currentSequence + 1;
    }
  }

  return `${prefix}${nextSequence.toString().padStart(3, '0')}`;
}

async function main() {
  console.log("Backfilling boqNumber for existing estimations...");
  const existingEstimations = await prisma.customerRequirement.findMany({
    where: {
      estimationStatus: "ESTIMATED",
      boqNumber: null,
    },
    orderBy: {
      estimatedAt: 'asc', // Process oldest first
    },
  });

  console.log(`Found ${existingEstimations.length} estimated items without a boqNumber.`);

  for (const req of existingEstimations) {
    const targetDate = req.estimatedAt || req.createdAt || new Date();
    const boqNumber = await generateBoqNumberForDate(targetDate);
    
    await prisma.customerRequirement.update({
      where: { id: req.id },
      data: { boqNumber },
    });
    console.log(`Updated Requirement ID ${req.id} with BOQ: ${boqNumber}`);
  }

  console.log("Backfill completed successfully.");
}

main().catch(console.error).finally(() => process.exit(0));
