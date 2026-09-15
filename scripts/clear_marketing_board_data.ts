import prisma from '../src/app/lib/db';

async function clearData() {
  console.log('=== Clearing All Marketing Board Data ===\n');

  // Delete child records first to respect FKs (even though cascades exist)
  const delLogs = await prisma.marketingAnnouncementAuditLog.deleteMany({});
  console.log(`Deleted ${delLogs.count} audit logs.`);

  const delAcks = await prisma.marketingAnnouncementAcknowledgment.deleteMany({});
  console.log(`Deleted ${delAcks.count} acknowledgments.`);

  const delAssets = await prisma.marketingAnnouncementAsset.deleteMany({});
  console.log(`Deleted ${delAssets.count} assets/documents.`);

  const delBranches = await prisma.marketingAnnouncementBranch.deleteMany({});
  console.log(`Deleted ${delBranches.count} branch scope records.`);

  const delAnn = await prisma.marketingAnnouncement.deleteMany({});
  console.log(`Deleted ${delAnn.count} announcements.`);

  // Verify counts
  const remainingAnn = await prisma.marketingAnnouncement.count();
  const remainingAssets = await prisma.marketingAnnouncementAsset.count();

  console.log(`\nRemaining announcements: ${remainingAnn}`);
  console.log(`Remaining assets: ${remainingAssets}`);

  if (remainingAnn === 0 && remainingAssets === 0) {
    console.log('\n=== All Marketing Board Data Successfully Cleared! ===');
  } else {
    throw new Error('Some data could not be cleared!');
  }

  await prisma.$disconnect();
}

clearData().catch((err) => {
  console.error('Error clearing marketing board data:', err);
  process.exit(1);
});
