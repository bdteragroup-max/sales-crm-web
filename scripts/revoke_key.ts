import prisma from '../src/app/lib/db';
async function revoke() { 
  await prisma.externalApiKey.updateMany({ 
    where: { hashedKey: '372510ac12abb705d2ed768a1f4a8cd21859a50953159a5a54f6e748d100ab83' }, 
    data: { revokedAt: new Date() } 
  }); 
  console.log('Revoked!'); 
} 
revoke().catch(console.error).finally(() => prisma.$disconnect());
