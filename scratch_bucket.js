const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe("INSERT INTO storage.buckets (id, name, public) VALUES ('marketing_assets', 'marketing_assets', true) ON CONFLICT DO NOTHING;");
  
  // Also create a policy to allow public uploads/reads if necessary
  await prisma.$executeRawUnsafe(`
    CREATE POLICY "marketing_assets_public_insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'marketing_assets');
  `).catch(e => console.log('Policy insert may already exist: ', e.message));

  await prisma.$executeRawUnsafe(`
    CREATE POLICY "marketing_assets_public_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'marketing_assets');
  `).catch(e => console.log('Policy select may already exist: ', e.message));

  console.log('Bucket created!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
