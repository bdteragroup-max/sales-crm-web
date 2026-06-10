import prisma from '../src/app/lib/db'

async function main() {
  const schedules = await prisma.schedule.findMany()
  console.log(`Found ${schedules.length} schedules to process.`)
  
  let updatedCount = 0
  for (const s of schedules) {
    if (!s.date) continue
    
    // Subtract 7 hours from the stored UTC date
    // 7 hours = 7 * 60 * 60 * 1000 = 25200000 ms
    const oldDate = new Date(s.date)
    const newDate = new Date(oldDate.getTime() - 25200000)
    
    await prisma.schedule.update({
      where: { id: s.id },
      data: { date: newDate }
    })
    
    updatedCount++
  }
  
  console.log(`Successfully updated ${updatedCount} schedules!`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
