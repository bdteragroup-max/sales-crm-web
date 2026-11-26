import { PrismaClient } from '../../generated/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import path from 'path'
import { hasSurveyExtendedFieldsInRuntime } from './surveySignaturesDb'
import { hasRequisitionExtendedFieldsInRuntime } from './requisitionSignaturesDb'

const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning: string | Error, ...args: unknown[]) {
  if (typeof warning === 'string' && warning.includes('Calling client.query() when the client is already executing a query')) {
    return;
  }
  if (typeof warning !== 'string' && warning?.message && warning.message.includes('Calling client.query() when the client is already executing a query')) {
    return;
  }
  return Reflect.apply(originalEmitWarning as (...a: unknown[]) => void, process, [warning, ...args]);
};

const prismaClientSingleton = () => {
  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      const envFile = fs.readFileSync(envPath, 'utf-8');
      const match = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
      if (match) dbUrl = match[1];
    } catch {
      console.warn("Failed to load DATABASE_URL from .env file");
    }
  }
  const pool = new Pool({ 
    connectionString: dbUrl || undefined,
    max: 8, // Keep combined pool sizes (db 8 + teraDb 4 + paymentRequests 4 = 16) safely within Supabase connection_limit=20
    idleTimeoutMillis: 15000, // Recycle idle sockets before PgBouncer/NAT drops them silently
    connectionTimeoutMillis: 10000, // Fail fast on stalled TCP/TLS handshakes so DAL/callers can retry on a clean socket
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
    allowExitOnIdle: true,
  })

  // Prevent unhandled errors on idle clients from terminating the connection or app
  pool.on('error', (err) => {
    // Supabase pgBouncer terminates idle connections periodically, which is expected
    if (err.message.includes('Connection terminated') || err.message.includes('timeout') || err.message.includes('closed')) {
      return;
    }
    console.warn('Unexpected error on idle client (primary db pool):', err.message)
  })

  const adapter = new PrismaPg(pool, { disposeExternalPool: true })
  const client = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  })
  return client
}

declare global {
  var prisma_instance_v37: undefined | ReturnType<typeof prismaClientSingleton>
}

const cachedPrisma = globalThis.prisma_instance_v37;
const hasStockModels =
  cachedPrisma &&
  typeof (cachedPrisma as unknown as Record<string, unknown>).stockCategory !== 'undefined';
const hasSolarCleaningModel =
  cachedPrisma &&
  typeof (cachedPrisma as unknown as Record<string, unknown>).solarCleaningInspection !== 'undefined';
const hasSalesCommissionModel =
  cachedPrisma &&
  typeof (cachedPrisma as unknown as Record<string, unknown>).salesCommissionRequest !== 'undefined';
const hasLogisticsModels =
  cachedPrisma &&
  typeof (cachedPrisma as unknown as Record<string, unknown>).logisticsTrip !== 'undefined' &&
  typeof (cachedPrisma as unknown as Record<string, unknown>).logisticsTripStop !== 'undefined';
const hasBankStatementModels =
  cachedPrisma &&
  typeof (cachedPrisma as unknown as Record<string, unknown>).bankStatementBatch !== 'undefined' &&
  typeof (cachedPrisma as unknown as Record<string, unknown>).bankStatementTransaction !== 'undefined';
const isCacheCompatible =
  Boolean(hasStockModels) &&
  Boolean(hasSolarCleaningModel) &&
  Boolean(hasSalesCommissionModel) &&
  Boolean(hasLogisticsModels) &&
  Boolean(hasBankStatementModels) &&
  hasSurveyExtendedFieldsInRuntime(cachedPrisma) &&
  hasRequisitionExtendedFieldsInRuntime(cachedPrisma);

if (cachedPrisma && !isCacheCompatible) {
  cachedPrisma.$disconnect?.().catch(() => {});
}

const prisma = isCacheCompatible ? cachedPrisma! : prismaClientSingleton();

export default prisma

globalThis.prisma_instance_v37 = prisma

