import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding initial orders...')
  
  // Get an existing company and user to associate the orders with
  const company = await prisma.company.findFirst()
  const user = await prisma.user.findFirst({ where: { role: 'Sales Representative' } })

  if (!company || !user) {
    console.error('No company or user found. Please run the main seed first.')
    return
  }

  const statuses = ['รอยืนยัน', 'กำลังผลิต', 'กำลังจัดส่ง', 'เสร็จสิ้น']
  const priorities = ['Normal', 'High', 'Urgent']

  for (let i = 1; i <= 10; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const priority = priorities[Math.floor(Math.random() * priorities.length)]
    
    // Random past dates for created at
    const daysAgo = Math.floor(Math.random() * 30)
    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - daysAgo)

    // Target delivery date (future)
    const deliveryDate = new Date(createdAt)
    deliveryDate.setDate(deliveryDate.getDate() + 14 + Math.floor(Math.random() * 14))

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${2026}${String(i).padStart(4, '0')}`,
        companyId: company.id,
        salespersonId: user.id,
        status: status,
        value: 15000 * i,
        priority: priority,
        createdAt: createdAt,
        targetDeliveryDate: deliveryDate
      }
    })

    console.log(`Created order: ${order.orderNumber} with status ${status}`)
  }

  console.log('Finished seeding orders!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
