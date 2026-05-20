const { PrismaClient } = require('../src/generated/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== Checking today's date and quotations ===");
  const systemNow = new Date();
  console.log("System time:", systemNow.toISOString());

  const bkkTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
  const nowBkk = new Date(bkkTimeStr);
  console.log("Bangkok time string:", bkkTimeStr);
  console.log("Bangkok Date object:", nowBkk.toISOString());

  // Check current date/time values we would evaluate on the dashboard
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  console.log("today evaluated like page.tsx (with our fix):", today.toISOString());
  console.log("today.getDate():", today.getDate());
  console.log("today.getMonth() + 1:", today.getMonth() + 1);
  console.log("today.getFullYear():", today.getFullYear());

  // Search for quotations created or updated today (2026-05-20)
  const startOfDayBkk = new Date("2026-05-20T00:00:00+07:00");
  const endOfDayBkk = new Date("2026-05-20T23:59:59.999+07:00");
  console.log("Range being queried for today:", startOfDayBkk.toISOString(), "to", endOfDayBkk.toISOString());

  const todayQuotations = await prisma.quotation.findMany({
    where: {
      createdAt: {
        gte: startOfDayBkk,
        lte: endOfDayBkk
      }
    },
    include: {
      salesperson: true
    }
  });

  console.log(`Found ${todayQuotations.length} quotations created today:`);
  for (const q of todayQuotations) {
    console.log(`- ID: ${q.id}, Number: ${q.quotationNumber}, Status: ${q.status}, AmountBeforeVat: ${q.totalAmountBeforeVat}, ActualClosingAmount: ${q.actualClosingAmount}, Salesperson: ${q.salesperson?.fullName} (${q.salesperson?.id}), CreatedAt: ${q.createdAt.toISOString()}`);
  }

  // Also query won and PO quotations that might have null dates to see if they exist
  const nullWonQuotes = await prisma.quotation.findMany({
    where: {
      status: 'เปิดบิลแล้ว',
      billingDate: null
    }
  });
  console.log(`\nFound ${nullWonQuotes.length} won (เปิดบิลแล้ว) quotations with billingDate = null`);

  const nullPoQuotes = await prisma.quotation.findMany({
    where: {
      status: { startsWith: 'PO' },
      poDate: null
    }
  });
  console.log(`Found ${nullPoQuotes.length} PO quotations with poDate = null`);

  // Let's also check the manager users
  const managers = await prisma.user.findMany({
    where: {
      role: 'ผู้จัดการ'
    },
    include: {
      employeeSale: true
    }
  });
  console.log("\nManagers in system:");
  for (const m of managers) {
    console.log(`- ID: ${m.id}, Name: ${m.fullName}, teamLeader: ${m.employeeSale?.teamLeader}`);
  }
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
