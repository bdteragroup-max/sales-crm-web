import prisma from '../app/lib/db'

async function run() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED) {
    console.error("Cannot run seeder in production.");
    process.exit(1);
  }

  const adminUser = await prisma.user.findFirst();
  if (!adminUser) {
    console.error("No user found in DB to use for createdByUserId");
    process.exit(1);
  }

  console.log("Cleaning up previous test data...")
  await prisma.marketingLead.deleteMany({
    where: { adCampaignId: { startsWith: 'TEST-' } }
  });
  await prisma.adPerformance.deleteMany({
    where: { campaignId: { startsWith: 'TEST-' } }
  });
  await prisma.adCampaign.deleteMany({
    where: { id: { startsWith: 'TEST-' } }
  });
  await prisma.adAccount.deleteMany({
    where: { name: 'TERA Main' }
  });

  console.log("Seeding test data...")
  let channelFace = await prisma.adChannel.findFirst({ where: { name: 'Facebook' } })
  let channelTiktok = await prisma.adChannel.findFirst({ where: { name: 'TikTok' } })
  let channelGoogle = await prisma.adChannel.findFirst({ where: { name: 'Google' } })
  
  if (!channelFace) channelFace = await prisma.adChannel.create({ data: { name: 'Facebook' } });
  if (!channelTiktok) channelTiktok = await prisma.adChannel.create({ data: { name: 'TikTok' } });
  if (!channelGoogle) channelGoogle = await prisma.adChannel.create({ data: { name: 'Google' } });

  let accountTera = await prisma.adAccount.findFirst({ where: { name: 'TERA Main' } });
  if (!accountTera) accountTera = await prisma.adAccount.create({ data: { name: 'TERA Main' } });

  // 1. Campaign with multiple performance rows spanning the month boundary (Aug 28th - Sept 3rd)
  await prisma.adCampaign.create({
    data: {
      id: 'TEST-BOUND-1',
      campaignId: 'TEST-BOUND-1-FB',
      name: '[TEST] Facebook Boundary',
      budget: 5000,
      channelId: channelFace!.id,
      accountId: accountTera!.id,
      startDate: new Date('2026-08-01T00:00:00Z'),
      endDate: new Date('2026-09-30T00:00:00Z'),
      createdBy: 'SEEDER',
      performances: {
        create: [
          { dateFrom: new Date('2026-08-28T00:00:00Z'), dateTo: new Date('2026-08-31T00:00:00Z'), spend: 1000, impressions: 5000, linkClicks: 100, dedupeKey: 'TEST-1-AUG', createdBy: 'SEEDER' },
          { dateFrom: new Date('2026-09-01T00:00:00Z'), dateTo: new Date('2026-09-03T00:00:00Z'), spend: 800, impressions: 4000, linkClicks: 80, dedupeKey: 'TEST-1-SEP', createdBy: 'SEEDER' }
        ]
      },
      leads: {
        create: [
          { customerName: 'Test Customer 1', leadSource: 'Facebook', createdByUserId: adminUser!.id, createdAt: new Date('2026-08-31T16:00:00Z') }, // 23:00 BKK
          { customerName: 'Test Customer 2', leadSource: 'Facebook', createdByUserId: adminUser!.id, createdAt: new Date('2026-08-31T19:00:00Z') }  // 02:00 BKK
        ]
      }
    }
  });

  // 2. Campaign with longer lifetime than filtered month (Partial Lifetime)
  await prisma.adCampaign.create({
    data: {
      id: 'TEST-PARTIAL-1',
      campaignId: 'TEST-PARTIAL-1-TK',
      name: '[TEST] TikTok Partial Lifetime',
      budget: 10000,
      channelId: channelTiktok!.id,
      startDate: new Date('2026-07-01T00:00:00Z'),
      endDate: new Date('2026-10-31T00:00:00Z'),
      createdBy: 'SEEDER',
      performances: {
        create: [
          { dateFrom: new Date('2026-08-01T00:00:00Z'), dateTo: new Date('2026-08-15T00:00:00Z'), spend: 2000, impressions: 10000, dedupeKey: 'TEST-PARTIAL-AUG1', createdBy: 'SEEDER' }
        ]
      }
    }
  });

  // 3. Campaign with 0 performance rows
  await prisma.adCampaign.create({
    data: {
      id: 'TEST-EMPTY-1',
      campaignId: 'TEST-EMPTY-1-GG',
      name: '[TEST] Google Empty',
      budget: 3000,
      channelId: channelGoogle!.id,
      startDate: new Date('2026-08-01T00:00:00Z'),
      endDate: new Date('2026-08-31T00:00:00Z'),
      createdBy: 'SEEDER'
    }
  });

  // 4. Performance row outside its campaign lifetime (Orphan Row)
  await prisma.adCampaign.create({
    data: {
      id: 'TEST-ORPHAN-1',
      campaignId: 'TEST-ORPHAN-1-FB',
      name: '[TEST] Facebook Orphan Row',
      budget: 1000,
      channelId: channelFace!.id,
      startDate: new Date('2026-08-10T00:00:00Z'),
      endDate: new Date('2026-08-20T00:00:00Z'),
      createdBy: 'SEEDER',
      performances: {
        create: [
          { dateFrom: new Date('2026-08-21T00:00:00Z'), dateTo: new Date('2026-08-25T00:00:00Z'), spend: 500, impressions: 1000, dedupeKey: 'TEST-ORPHAN-AUG21', createdBy: 'SEEDER' }, // Orphan
          { dateFrom: new Date('2026-08-10T00:00:00Z'), dateTo: new Date('2026-08-15T00:00:00Z'), spend: 200, impressions: 500, dedupeKey: 'TEST-ORPHAN-AUG10', createdBy: 'SEEDER' }   // Valid
        ]
      }
    }
  });

  console.log("Seeding complete!");
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
