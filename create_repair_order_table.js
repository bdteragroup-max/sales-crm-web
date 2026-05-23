const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RepairOrder" (
        "id" TEXT NOT NULL,
        "jobId" TEXT NOT NULL,
        "invoiceNo" TEXT,
        "deliveryMethod" TEXT,
        "deliveryNoteNo" TEXT,
        "receiverName" TEXT,
        "senderName" TEXT,
        "handoverRef" TEXT,
        "phoneNumber" TEXT,
        "workType" TEXT,
        "forwardedBy" TEXT,
        "items" JSONB NOT NULL,
        "symptoms" TEXT,
        "settings" TEXT,
        "checklist" JSONB NOT NULL,
        "receivedDate" TIMESTAMPTZ(6),
        "sentDate" TIMESTAMPTZ(6),
        "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ(6) NOT NULL,
        CONSTRAINT "RepairOrder_pkey" PRIMARY KEY ("id")
      );
    `);
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "RepairOrder_jobId_key" ON "RepairOrder"("jobId");`);
    
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (e) {
      console.log('FK already exists or error:', e.message);
    }
    
    console.log('Table created successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
