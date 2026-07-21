import prisma from '../src/app/lib/db';
import { generateOrderNumber } from '../src/app/actions/orderHelper';

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      orderNumber: {
        startsWith: 'QT'
      }
    }
  });

  console.log(`Found ${orders.length} orders to update.`);

  for (const order of orders) {
    const newNumber = await generateOrderNumber();
    await prisma.order.update({
      where: { id: order.id },
      data: { orderNumber: newNumber }
    });
    console.log(`Updated Order ${order.id}: ${order.orderNumber} -> ${newNumber}`);
  }

  console.log('Finished updating order numbers.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
