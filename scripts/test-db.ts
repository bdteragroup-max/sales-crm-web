import prisma from '../src/app/lib/db';

async function main() {
  console.log("Starting DB diagnostics...");

  console.time("Count Companies");
  const companyCount = await prisma.company.count();
  console.timeEnd("Count Companies");
  console.log("Total Companies:", companyCount);

  console.time("Count PostalData");
  const postalCount = await prisma.postalData.count();
  console.timeEnd("Count PostalData");
  console.log("Total PostalData:", postalCount);

  console.time("Query Provinces Distinct");
  const provinces = await prisma.postalData.findMany({
    select: { province: true },
    distinct: ['province'],
    orderBy: { province: 'asc' }
  });
  console.timeEnd("Query Provinces Distinct");
  console.log("Total Distinct Provinces:", provinces.length);

  console.time("Query Companies Detailed");
  const companies = await prisma.company.findMany({
    orderBy: { companyName: 'asc' },
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
  console.timeEnd("Query Companies Detailed");
  console.log("Fetched Companies:", companies.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
