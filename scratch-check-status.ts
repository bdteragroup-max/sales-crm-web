import prisma from './src/app/lib/db';

async function main() {
  const dbOrder = await prisma.order.findFirst();
  if (dbOrder) {
    const dbStatus = dbOrder.status;
    const uiStatus = 'รอยืนยัน';
    
    console.log(`DB Status: "${dbStatus}" (Length: ${dbStatus.length})`);
    console.log(`UI Status: "${uiStatus}" (Length: ${uiStatus.length})`);
    console.log(`Are they exactly equal? ${dbStatus === uiStatus}`);
    
    if (dbStatus !== uiStatus) {
      console.log('DB Char codes:', Array.from(dbStatus).map(c => c.charCodeAt(0)));
      console.log('UI Char codes:', Array.from(uiStatus).map(c => c.charCodeAt(0)));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
