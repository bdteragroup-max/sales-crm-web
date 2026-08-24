import prisma from './src/app/lib/db';

async function main() {
  const ticketNumbers = ['TK-20260824-003', 'TK-20260824-004'];

  for (const ticketNumber of ticketNumbers) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { ticketNumber }
    });

    if (ticket) {
      await prisma.supportTicket.delete({
        where: { id: ticket.id }
      });
      console.log(`Successfully deleted ticket ${ticketNumber}`);
    } else {
      console.log(`Ticket ${ticketNumber} not found.`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
