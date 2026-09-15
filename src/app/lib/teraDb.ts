import { PrismaClient } from '../../generated/tera-client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import path from 'path'

const prismaClientSingleton = () => {
  let dbUrl = process.env.TERA_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      const envFile = fs.readFileSync(envPath, 'utf-8');
      const match = envFile.match(/TERA_DB_URL="?([^"\n]+)"?/);
      if (match) {
        dbUrl = match[1];
      } else {
        // Fallback to DATABASE_URL in .env if TERA_DB_URL is missing
        const dbMatch = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
        if (dbMatch) dbUrl = dbMatch[1];
      }
    } catch (e) {
      console.warn("Failed to load TERA_DB_URL from .env file");
    }
  }

  if (!dbUrl) {
    console.error("TERA_DB_URL is not defined in environment or .env file! Database connections will fail.");
  }

  const pool = new Pool({ 
    connectionString: dbUrl || undefined,
    max: 10, // Increased from 3 to 10 to prevent connection timeouts
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  })

  // Prevent unhandled errors on idle clients from terminating the connection or app
  pool.on('error', (err) => {
    console.warn('Unexpected error on idle client (teraDb pool):', err.message)
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

const globalForTera = global as unknown as { tera_instance_v5: ReturnType<typeof prismaClientSingleton> }
export const teraDb = globalForTera.tera_instance_v5 ?? prismaClientSingleton()

globalForTera.tera_instance_v5 = teraDb

