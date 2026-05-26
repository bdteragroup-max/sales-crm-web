import { PrismaClient } from '../../generated/tera-client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import path from 'path'

const prismaClientSingleton = () => {
  let dbUrl = process.env.TERA_DB_URL;
  if (!dbUrl) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      const envFile = fs.readFileSync(envPath, 'utf-8');
      const match = envFile.match(/TERA_DB_URL="?([^"\n]+)"?/);
      if (match) dbUrl = match[1];
    } catch (e) {
      console.warn("Failed to load TERA_DB_URL from .env file");
    }
  }

  if (!dbUrl) {
    console.error("TERA_DB_URL is not defined in environment or .env file! Database connections will fail.");
  }

  const pool = new Pool({ 
    connectionString: dbUrl || undefined,
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
