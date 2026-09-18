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
    max: 12, // Balanced for Supabase pooler (max 20) to prevent starvation across dev/worker instances
    idleTimeoutMillis: 5000, // Release idle clients after 5s before Supabase pgBouncer forcibly drops them
    connectionTimeoutMillis: 15000, // 15s connection timeout
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
  })

  // Prevent unhandled errors on idle clients from terminating the connection or app
  pool.on('error', (err) => {
    // Supabase pgBouncer terminates idle connections periodically, which is expected
    if (err.message.includes('Connection terminated') || err.message.includes('timeout') || err.message.includes('closed')) {
      return;
    }
    console.warn('Unexpected error on idle client (primary db pool):', err.message)
  })

  const adapter = new PrismaPg(pool)
  const client = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  })
  return client
}

declare global {
  var prisma_instance_v29: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma_instance_v29 ?? prismaClientSingleton()

export default prisma

globalThis.prisma_instance_v29 = prisma

