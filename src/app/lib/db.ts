import { PrismaClient } from '../../generated/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import path from 'path'

const prismaClientSingleton = () => {
  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      const envFile = fs.readFileSync(envPath, 'utf-8');
      const match = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
      if (match) dbUrl = match[1];
    } catch (e) {
      console.warn("Failed to load DATABASE_URL from .env file");
    }
  }

  if (!dbUrl) {
    console.error("DATABASE_URL is not defined in environment or .env file! Database connections will fail.");
  }

  const pool = new Pool({ 
    connectionString: dbUrl || undefined,
    max: 50, // Increased to 50 for heavy multi-tab usage
    idleTimeoutMillis: 10000, // Free up unused connections faster
    connectionTimeoutMillis: 10000,
  })
  const adapter = new PrismaPg(pool)
  const client = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  })
  return client
}

declare global {
  var prisma_instance_v14: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma_instance_v14 ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma_instance_v14 = prisma
