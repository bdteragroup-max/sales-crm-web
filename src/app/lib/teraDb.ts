import { PrismaClient } from '../../generated/tera-client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const prismaClientSingleton = () => {
  const pool = new Pool({ 
    connectionString: process.env.TERA_DB_URL,
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

const globalForTera = global as unknown as { tera_instance_v4: ReturnType<typeof prismaClientSingleton> }
export const teraDb = globalForTera.tera_instance_v4 ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForTera.tera_instance_v4 = teraDb
