import prisma from './src/app/lib/db';
import { generateBoqNumberForDate } from './generateBoqNumberForDate';

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
