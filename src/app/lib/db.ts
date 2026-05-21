import { PrismaClient } from '../../generated/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const prismaClientSingleton = () => {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 2, // Reduced to 2 to prevent EMAXCONNSESSION in highly concurrent serverless environments
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })
  const adapter = new PrismaPg(pool)
  const client = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  })
  return client
}

declare global {
  var prisma_instance_v10: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma_instance_v10 ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma_instance_v10 = prisma
