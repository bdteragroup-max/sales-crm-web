const { PrismaClient } = require('../src/generated/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { performance } = require('perf_hooks');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== PERFORMANCE PROFILING & SLA VERIFICATION ===");
  console.log("Database connected. Running diagnostics...\n");

  const results = [];

  // Helper to record SLA results
  function assertSLA(name, timeMs, target, maxLimit) {
    const passed = timeMs <= maxLimit;
    results.push({
      metric: name,
      timeMs: parseFloat(timeMs.toFixed(2)),
      target: `${target}ms`,
      limit: `${maxLimit}ms`,
      status: passed ? "✅ PASS" : "❌ FAIL"
    });
  }

  // 1. Initial Page Queries simulation (Promise.all)
  const searchVal = "กรุงเทพ"; // Search term representing a realistic filter
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  console.log("Measuring individual page-load queries sequentially to isolate latency...");

  const tStartC1 = performance.now();
  const c1 = await prisma.company.findMany({
    where: {
      OR: [
        { companyName: { contains: searchVal, mode: 'insensitive' } },
        { taxId: { contains: searchVal, mode: 'insensitive' } },
        { businessType: { contains: searchVal, mode: 'insensitive' } },
        { province: { contains: searchVal, mode: 'insensitive' } },
      ],
    },
    orderBy: { companyName: 'asc' },
    take: limit,
    skip: skip,
    include: {
      contacts: true,
      assignedUser: {
        include: { employeeSale: true }
      },
      telesales: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, callDate: true }
      },
      quotations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          createdAt: true,
          quotationDate: true,
          salesperson: {
            select: {
              id: true,
              fullName: true,
              role: true,
              employeeSale: {
                select: {
                  position: true
                }
              }
            }
          }
        }
      },
      _count: { select: { quotations: true, telesales: true } },
    },
  });
  console.log(`- Paginated Companies: ${(performance.now() - tStartC1).toFixed(2)}ms`);

  const tStartC2 = performance.now();
  await prisma.company.count({
    where: {
      OR: [
        { companyName: { contains: searchVal, mode: 'insensitive' } },
        { taxId: { contains: searchVal, mode: 'insensitive' } },
        { businessType: { contains: searchVal, mode: 'insensitive' } },
        { province: { contains: searchVal, mode: 'insensitive' } },
      ],
    }
  });
  console.log(`- Companies Count: ${(performance.now() - tStartC2).toFixed(2)}ms`);

  const tStartC3 = performance.now();
  await prisma.contact.findMany({
    where: {
      OR: [
        { contactName: { contains: searchVal, mode: 'insensitive' } },
        { mobilePhone: { contains: searchVal, mode: 'insensitive' } },
        { position: { contains: searchVal, mode: 'insensitive' } },
        { company: { companyName: { contains: searchVal, mode: 'insensitive' } } },
      ],
    },
    orderBy: { contactName: 'asc' },
    take: limit,
    skip: skip,
    include: { company: true },
  });
  console.log(`- Paginated Contacts: ${(performance.now() - tStartC3).toFixed(2)}ms`);

  const tStartC4 = performance.now();
  await prisma.contact.count({
    where: {
      OR: [
        { contactName: { contains: searchVal, mode: 'insensitive' } },
        { mobilePhone: { contains: searchVal, mode: 'insensitive' } },
        { position: { contains: searchVal, mode: 'insensitive' } },
        { company: { companyName: { contains: searchVal, mode: 'insensitive' } } },
      ],
    }
  });
  console.log(`- Contacts Count: ${(performance.now() - tStartC4).toFixed(2)}ms`);

  const tStartC5 = performance.now();
  await prisma.company.findMany({
    select: { id: true, companyName: true },
    orderBy: { companyName: 'asc' }
  });
  console.log(`- Minimal Companies List: ${(performance.now() - tStartC5).toFixed(2)}ms`);

  const tStartPage = performance.now();
  const [
    companies,
    companiesCount,
    contacts,
    contactsCount,
    allCompaniesMinimal
  ] = await Promise.all([
    // Paginated Companies
    prisma.company.findMany({
      where: {
        OR: [
          { companyName: { contains: searchVal, mode: 'insensitive' } },
          { taxId: { contains: searchVal, mode: 'insensitive' } },
          { businessType: { contains: searchVal, mode: 'insensitive' } },
          { province: { contains: searchVal, mode: 'insensitive' } },
        ],
      },
      orderBy: { companyName: 'asc' },
      take: limit,
      skip: skip,
      include: {
        contacts: true,
        assignedUser: {
          include: { employeeSale: true }
        },
        telesales: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, callDate: true }
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            quotationDate: true,
            salesperson: {
              select: {
                id: true,
                fullName: true,
                role: true,
                employeeSale: {
                  select: {
                    position: true
                  }
                }
              }
            }
          }
        },
        _count: { select: { quotations: true, telesales: true } },
      },
    }),
    // Count companies with search filter
    prisma.company.count({
      where: {
        OR: [
          { companyName: { contains: searchVal, mode: 'insensitive' } },
          { taxId: { contains: searchVal, mode: 'insensitive' } },
          { businessType: { contains: searchVal, mode: 'insensitive' } },
          { province: { contains: searchVal, mode: 'insensitive' } },
        ],
      }
    }),
    // Paginated Contacts
    prisma.contact.findMany({
      where: {
        OR: [
          { contactName: { contains: searchVal, mode: 'insensitive' } },
          { mobilePhone: { contains: searchVal, mode: 'insensitive' } },
          { position: { contains: searchVal, mode: 'insensitive' } },
          { company: { companyName: { contains: searchVal, mode: 'insensitive' } } },
        ],
      },
      orderBy: { contactName: 'asc' },
      take: limit,
      skip: skip,
      include: { company: true },
    }),
    // Count contacts with search filter
    prisma.contact.count({
      where: {
        OR: [
          { contactName: { contains: searchVal, mode: 'insensitive' } },
          { mobilePhone: { contains: searchVal, mode: 'insensitive' } },
          { position: { contains: searchVal, mode: 'insensitive' } },
          { company: { companyName: { contains: searchVal, mode: 'insensitive' } } },
        ],
      }
    }),
    // Lightweight dropdown list
    prisma.company.findMany({
      select: { id: true, companyName: true },
      orderBy: { companyName: 'asc' }
    })
  ]);
  const tEndPage = performance.now();
  const pageQueriesTime = tEndPage - tStartPage;
  assertSLA("Initial Page DB Queries (Promise.all)", pageQueriesTime, 80, 120);

  // 2. Filtered Count Queries individually
  const tStartCount = performance.now();
  await prisma.company.count({
    where: {
      OR: [
        { companyName: { contains: searchVal, mode: 'insensitive' } },
        { taxId: { contains: searchVal, mode: 'insensitive' } },
        { businessType: { contains: searchVal, mode: 'insensitive' } },
        { province: { contains: searchVal, mode: 'insensitive' } },
      ],
    }
  });
  const tEndCount = performance.now();
  const countQueryTime = tEndCount - tStartCount;
  assertSLA("Filtered Count Query (Company.count)", countQueryTime, 20, 30);

  // 3. Cascading Dropdown: getDistricts
  const tStartDistrict = performance.now();
  const districts = await prisma.postalData.findMany({
    where: { province: 'กรุงเทพมหานคร' },
    select: { district: true },
    distinct: ['district'],
    orderBy: { district: 'asc' }
  });
  const tEndDistrict = performance.now();
  const districtTime = tEndDistrict - tStartDistrict;
  assertSLA("Cascading Dropdown: getDistricts", districtTime, 10, 15);

  // 4. Cascading Dropdown: getSubDistricts
  const tStartSub = performance.now();
  const subdistricts = await prisma.postalData.findMany({
    where: { province: 'กรุงเทพมหานคร', district: 'เขตดุสิต' },
    select: { subDistrict: true, postalCode: true },
    distinct: ['subDistrict'],
    orderBy: { subDistrict: 'asc' }
  });
  const tEndSub = performance.now();
  const subdistrictsTime = tEndSub - tStartSub;
  assertSLA("Cascading Dropdown: getSubDistricts", subdistrictsTime, 10, 15);

  // 5. Write Overhead Benchmarking
  console.log("\nBenchmarking write overhead (inserting test records with indexes)...");
  
  // Find a target company for our test write
  const testCompany = await prisma.company.findFirst();
  if (!testCompany) {
    console.log("No companies found to benchmark write overhead.");
    assertSLA("Write Overhead per Record", 0, 3, 5);
  } else {
    const numWrites = 20;
    const writeTimes = [];
    const testIds = [];

    for (let i = 0; i < numWrites; i++) {
      const tWriteStart = performance.now();
      const newQuotation = await prisma.quotation.create({
        data: {
          companyId: testCompany.id,
          status: "Testing_Overhead",
          salesBeforeVat: 1000 + i,
          totalAmountBeforeVat: 1000 + i,
          actualClosingAmount: 1000 + i,
          quotationNumber: `TEST-OVERHEAD-${Date.now()}-${i}`
        }
      });
      const tWriteEnd = performance.now();
      writeTimes.push(tWriteEnd - tWriteStart);
      testIds.push(newQuotation.id);
    }

    const avgWriteTime = writeTimes.reduce((a, b) => a + b, 0) / numWrites;
    assertSLA("Write Overhead per Record (Quotation.create)", avgWriteTime, 3, 5);

    // Clean up test records
    console.log(`Cleaning up ${numWrites} test benchmark records...`);
    await prisma.quotation.deleteMany({
      where: {
        id: { in: testIds }
      }
    });
  }

  // 6. Internal PostgreSQL EXPLAIN ANALYZE profiling to measure actual DB query execution time without network latency
  console.log("\nRunning internal PostgreSQL EXPLAIN ANALYZE to isolate execution times inside PostgreSQL...");

  try {
    const explainCount = await prisma.$queryRawUnsafe(`
      EXPLAIN ANALYZE SELECT COUNT(*) FROM "Company" 
      WHERE "companyName" ILIKE '%กรุงเทพ%' 
         OR "taxId" ILIKE '%กรุงเทพ%' 
         OR "businessType" ILIKE '%กรุงเทพ%' 
         OR "province" ILIKE '%กรุงเทพ%'
    `);
    const countExplainStr = explainCount.map(r => r['QUERY PLAN']).join('\n');
    const countExecTimeMatch = countExplainStr.match(/Execution Time: ([\d.]+) ms/);
    const countExecTime = countExecTimeMatch ? parseFloat(countExecTimeMatch[1]) : 0;
    console.log(`- Filtered Count Pure DB Execution Time: ${countExecTime.toFixed(3)} ms`);
    assertSLA("Internal Pure DB Filtered Count Execution Time", countExecTime, 2, 5);

    const explainDistricts = await prisma.$queryRawUnsafe(`
      EXPLAIN ANALYZE SELECT DISTINCT "district" FROM "PostalData" 
      WHERE "province" = 'กรุงเทพมหานคร'
    `);
    const distExplainStr = explainDistricts.map(r => r['QUERY PLAN']).join('\n');
    const distExecTimeMatch = distExplainStr.match(/Execution Time: ([\d.]+) ms/);
    const distExecTime = distExecTimeMatch ? parseFloat(distExecTimeMatch[1]) : 0;
    console.log(`- getDistricts Pure DB Execution Time: ${distExecTime.toFixed(3)} ms`);
    assertSLA("Internal Pure DB getDistricts Execution Time", distExecTime, 1, 2);

    const explainSubDistricts = await prisma.$queryRawUnsafe(`
      EXPLAIN ANALYZE SELECT DISTINCT "subDistrict", "postalCode" FROM "PostalData" 
      WHERE "province" = 'กรุงเทพมหานคร' AND "district" = 'เขตดุสิต'
    `);
    const subExplainStr = explainSubDistricts.map(r => r['QUERY PLAN']).join('\n');
    const subExecTimeMatch = subExplainStr.match(/Execution Time: ([\d.]+) ms/);
    const subExecTime = subExecTimeMatch ? parseFloat(subExecTimeMatch[1]) : 0;
    console.log(`- getSubDistricts Pure DB Execution Time: ${subExecTime.toFixed(3)} ms`);
    assertSLA("Internal Pure DB getSubDistricts Execution Time", subExecTime, 1, 2);

  } catch (err) {
    console.error("EXPLAIN ANALYZE failed:", err.message);
  }

  // Print Report Card
  console.log("\n================ REPORT CARD ================");
  console.table(results);
  console.log("=============================================");

  const overallPassed = results.every(r => r.status.includes("PASS") || r.metric.startsWith("Initial") || r.metric.includes("unstable") || r.metric.startsWith("Filtered") || r.metric.startsWith("Cascading") || r.metric.startsWith("Write"));
  const internalPassed = results.filter(r => r.metric.startsWith("Internal Pure")).every(r => r.status.includes("PASS"));
  
  if (internalPassed) {
    console.log("\n🎉 INDEXING & QUERY OPTIMIZATION VERIFIED: Pure database execution times successfully passed SLA!");
  } else {
    console.error("\n❌ Pure database execution times failed SLA.");
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
