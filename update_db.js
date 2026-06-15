require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  const alterStatements = [
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "projectCategory" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "department" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "province" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "district" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "projectValue" DECIMAL(15,2);`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "securityDeposit" DECIMAL(15,2);`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "penaltyPerDay" DECIMAL(15,2);`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "amountIncludingVat" DECIMAL(15,2);`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "installment1" DECIMAL(15,2);`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "installment2" DECIMAL(15,2);`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "installment3" DECIMAL(15,2);`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "installment4" DECIMAL(15,2);`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "firstPayment" DECIMAL(15,2);`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "secondPayment" DECIMAL(15,2);`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "contractNumber" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "documentNumber" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "deliveryDocNumber" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "jbNumber" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "certCompletionRequestNo" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "certRequestStatus" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "depositRefundRequestNo" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "contractSignatory" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "contractReturnStatus" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "remarks" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "pathFolder" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "statusPictureUrl" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "updateCompanyProfile" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "projectDuration" INTEGER;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "projectDurationUnit" TEXT;`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "contractSigningDate" TIMESTAMPTZ(6);`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "deliveryDate" TIMESTAMPTZ(6);`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "paymentDate" TIMESTAMPTZ(6);`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "depositCollectionSchedule" TIMESTAMPTZ(6);`,

    `CREATE TABLE IF NOT EXISTS "ProjectEquipment" (
        "id" TEXT NOT NULL,
        "projectId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "registrationNumber" TEXT,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "status" TEXT NOT NULL DEFAULT 'ใช้งาน',
        "details" TEXT,
        "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProjectEquipment_pkey" PRIMARY KEY ("id")
    );`
  ];

  for (const statement of alterStatements) {
    try {
      console.log(`Executing: ${statement}`);
      await client.query(statement);
    } catch (e) {
      console.error(`Failed: ${statement}`);
      console.error(e);
    }
  }
  
  try {
      console.log(`Adding Foreign Key...`);
      await client.query(`ALTER TABLE "ProjectEquipment" ADD CONSTRAINT "ProjectEquipment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  } catch(e) {
      console.error("FK creation skipped or failed:", e.message);
  }

  console.log("Database updated manually.");
}

main()
  .catch(console.error)
  .finally(() => client.end());
