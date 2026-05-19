const { PrismaClient } = require('../src/generated/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
  console.log("Provinces:", JSON.stringify(provinces.map(p => p.province)));

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

  console.time("Query Contacts Detailed");
  const contacts = await prisma.contact.findMany({
    orderBy: { contactName: 'asc' },
    include: { company: true },
  });
  console.timeEnd("Query Contacts Detailed");
  console.log("Fetched Contacts:", contacts.length);

  console.time("Query Districts in Bangkok");
  const districts = await prisma.postalData.findMany({
    where: { province: 'กรุงเทพมหานคร' },
    select: { district: true },
    distinct: ['district'],
    orderBy: { district: 'asc' }
  });
  console.timeEnd("Query Districts in Bangkok");
  console.log("Fetched Districts:", districts.length);

  console.time("Query SubDistricts in Bangkok, Dusit");
  const subdistricts = await prisma.postalData.findMany({
    where: { province: 'กรุงเทพมหานคร', district: 'เขตดุสิต' },
    select: { subDistrict: true, postalCode: true },
    distinct: ['subDistrict'],
    orderBy: { subDistrict: 'asc' }
  });
  console.timeEnd("Query SubDistricts in Bangkok, Dusit");
  console.log("Fetched Subdistricts:", subdistricts.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
