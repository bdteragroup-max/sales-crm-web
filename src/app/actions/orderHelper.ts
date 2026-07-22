import prisma from "@/app/lib/db";

export async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const yearBe = now.getFullYear() + 543;
  const shortYearBe = yearBe.toString().slice(-2); // e.g. 69
  const month = now.getMonth() + 1;
  const strMonth = month.toString().padStart(2, '0'); // e.g. 04

  let orderNumber = "";
  let exists = true;

  while (exists) {
    const sequenceRecord = await prisma.orderRunningNumber.upsert({
      where: {
        yearBe_month: {
          yearBe,
          month
        }
      },
      update: {
        lastNumber: { increment: 1 }
      },
      create: {
        yearBe,
        month,
        lastNumber: 1
      }
    });

    const sequence = sequenceRecord.lastNumber.toString().padStart(3, '0');
    orderNumber = `ORD${shortYearBe}${strMonth}${sequence}`;

    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber }
    });

    console.log(`[generateOrderNumber] Checking ${orderNumber} -> existing: ${!!existingOrder}`);

    if (!existingOrder) {
      exists = false;
    }
  }

  return orderNumber;
}
