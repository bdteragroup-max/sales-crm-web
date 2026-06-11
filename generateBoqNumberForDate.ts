import prisma from './src/app/lib/db';

export async function generateBoqNumberForDate(date: Date): Promise<string> {
  const localDateStr = date.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
  const now = new Date(localDateStr);
  
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `BOQ-${year}${month}-`;

  const highestBoq = await prisma.customerRequirement.findFirst({
    where: {
      boqNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      boqNumber: 'desc',
    },
  });

  let nextSequence = 1;
  if (highestBoq && highestBoq.boqNumber) {
    const sequencePart = highestBoq.boqNumber.replace(prefix, '');
    const currentSequence = parseInt(sequencePart, 10);
    if (!isNaN(currentSequence)) {
      nextSequence = currentSequence + 1;
    }
  }

  return `${prefix}${nextSequence.toString().padStart(3, '0')}`;
}
