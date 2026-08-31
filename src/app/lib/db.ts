import { PrismaClient } from '../../generated/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import path from 'path'

const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning: any, ...args: any[]) {
  if (typeof warning === 'string' && warning.includes('Calling client.query() when the client is already executing a query')) {
    return;
  }
  if (warning && warning.message && warning.message.includes('Calling client.query() when the client is already executing a query')) {
    return;
  }
  return originalEmitWarning.call(process, warning, ...args);
};

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
  const pool = new Pool({ 
    connectionString: dbUrl || undefined,
    max: 50,
    idleTimeoutMillis: 10000,
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
  var prisma_instance_v26: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma_instance_v26 ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma_instance_v26 = prisma
