import { PrismaClient } from '../src/generated/client';
import { awardGoldOnDealClosed } from '../src/app/actions/coins';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting retroactive gold award process...');
  
  // Find all quotations that are already marked as closed
  const closedQuotations = await prisma.quotation.findMany({
    where: { status: 'เปิดบิลแล้ว' },
    select: { id: true, quotationNumber: true }
  });

  console.log(`Found ${closedQuotations.length} closed quotations.`);

  for (const q of closedQuotations) {
    try {
      console.log(`Processing ${q.quotationNumber} (${q.id})...`);
      
      // Check if it already has a ledger entry to avoid double awarding
      const existingLedger = await prisma.coin_ledgers.findFirst({
        where: { source_key: `deal_closed:${q.id}:sales` }
      });

      if (existingLedger) {
        console.log(`  -> Already awarded (Ledger ID: ${existingLedger.id}). Skipping.`);
        continue;
      }

      await awardGoldOnDealClosed(q.id);
      console.log(`  -> Successfully awarded gold for ${q.quotationNumber}.`);
    } catch (error) {
      console.error(`  -> Failed to award for ${q.quotationNumber}:`, error);
    }
  }

  console.log('Finished.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
