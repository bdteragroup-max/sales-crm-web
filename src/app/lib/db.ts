import { PrismaClient } from '../../generated/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const prismaClientSingleton = () => {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 10, // Reduced to prevent EMAXCONNSESSION
    idleTimeoutMillis: 60000,
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
  var prisma_instance_v5: undefined | ReturnType<typeof prismaClientSingleton>
}

// Using a versioned key to force re-initialization after schema changes
const prisma = globalThis.prisma_instance_v5 ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma_instance_v5 = prisma
