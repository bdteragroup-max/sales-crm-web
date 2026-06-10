import prisma from '../src/app/lib/db'

async function main() {
  const telesales = await prisma.telesale.findMany()
  console.log(`Found ${telesales.length} telesales to process.`)
  
  let updatedCount = 0
  for (const t of telesales) {
    if (!t.callbackAt) continue
    
    // Subtract 7 hours from the stored UTC date
    // 7 hours = 7 * 60 * 60 * 1000 = 25200000 ms
    const oldDate = new Date(t.callbackAt)
    const newDate = new Date(oldDate.getTime() - 25200000)
    
    await prisma.telesale.update({
      where: { id: t.id },
      data: { callbackAt: newDate }
    })
    
    updatedCount++
  }
  
  console.log(`Successfully updated ${updatedCount} telesales callbackAt!`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
