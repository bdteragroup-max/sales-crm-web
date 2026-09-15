import prisma from '../src/app/lib/db';

async function test() {
  console.log('Testing database connection...');
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test, NOW() as current_time`;
    console.log('Database connection SUCCESSFUL:', result);
  } catch (error: any) {
    console.error('Database connection FAILED:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Full Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
