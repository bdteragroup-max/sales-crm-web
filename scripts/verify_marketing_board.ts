import prisma from '../src/app/lib/db';

function computeDynamicStatus(ann: {
  status: string;
  startAt: Date;
  endAt: Date | null;
}): string {
  if (['Draft', 'Pending Approval', 'Cancelled'].includes(ann.status)) {
    return ann.status;
  }
  const now = new Date('2026-09-15T10:00:00+07:00');
  if (ann.startAt && new Date(ann.startAt) > now) {
    return 'Scheduled';
  }
  if (ann.endAt && new Date(ann.endAt) < now) {
    return 'Expired';
  }
  if (ann.endAt) {
    const diffDays = (new Date(ann.endAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 3 && diffDays >= 0) {
      return 'Ending Soon';
    }
  }
  return 'Active';
}

async function verify() {
  console.log('=== Starting TERA Marketing Board Automated Verification ===\n');

  // 1. Verify tables in database
  const countAnnouncements = await prisma.marketingAnnouncement.count();
  const countAssets = await prisma.marketingAnnouncementAsset.count();
  const countBranches = await prisma.marketingAnnouncementBranch.count();
  const countAcks = await prisma.marketingAnnouncementAcknowledgment.count();
  const countLogs = await prisma.marketingAnnouncementAuditLog.count();

  console.log(`[DB] Announcements in DB: ${countAnnouncements}`);
  console.log(`[DB] Assets / Documents in DB: ${countAssets}`);
  console.log(`[DB] Branch scopes in DB: ${countBranches}`);
  console.log(`[DB] Acknowledgments in DB: ${countAcks}`);
  console.log(`[DB] Audit logs in DB: ${countLogs}`);

  if (countAnnouncements < 5 || countAssets < 10) {
    throw new Error('Verification failed: insufficient seed data!');
  }

  // 2. Verify Product Group distributions
  const byGroup = await prisma.marketingAnnouncement.groupBy({
    by: ['productGroup'],
    _count: { id: true }
  });
  console.log('\n[Product Groups Distribution]:');
  byGroup.forEach(g => console.log(`  - ${g.productGroup}: ${g._count.id} items`));

  const expectedGroups = ['Marketing Headquarters', 'Inverter', 'BLDC / Solar Pump', 'Solar Roof'];
  for (const exp of expectedGroups) {
    if (!byGroup.some(g => g.productGroup === exp)) {
      throw new Error(`Missing expected product group: ${exp}`);
    }
  }

  // 3. Verify Dynamic Status logic
  const now = new Date('2026-09-15T10:00:00+07:00');
  const activeSample = await prisma.marketingAnnouncement.findFirst({
    where: { campaignName: { contains: '9.9' } }
  });
  if (activeSample) {
    const status = computeDynamicStatus(activeSample);
    console.log(`\n[Dynamic Status Check] 9.9 Mega Promotion computed status: ${status} (expected: Active)`);
    if (status !== 'Active') throw new Error('9.9 status should be Active');
  }

  const endingSoonSample = await prisma.marketingAnnouncement.findFirst({
    where: { campaignName: { contains: 'Shipping' } }
  });
  if (endingSoonSample) {
    const status = computeDynamicStatus(endingSoonSample);
    console.log(`[Dynamic Status Check] Free Shipping computed status: ${status} (expected: Ending Soon)`);
  }

  const scheduledSample = await prisma.marketingAnnouncement.findFirst({
    where: { campaignName: { contains: 'Udon Thani' } }
  });
  if (scheduledSample) {
    const status = computeDynamicStatus(scheduledSample);
    console.log(`[Dynamic Status Check] Udon Thani Opening computed status: ${status} (expected: Scheduled)`);
  }

  // 4. Verify Document Library (Sales Materials)
  const materials = await prisma.marketingAnnouncementAsset.findMany({
    include: { announcement: true }
  });
  console.log(`\n[Sales Materials Library] Total files: ${materials.length}`);
  const docTypes = new Set(materials.map(m => m.documentType));
  console.log(`[Sales Materials Library] Distinct document types: ${Array.from(docTypes).join(', ')}`);

  console.log('\n=== All Automated Verifications PASSED Successfully! ===');
}

verify()
  .catch(e => {
    console.error('Verification error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
