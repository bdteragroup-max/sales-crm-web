import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(process.cwd(), '.env');
  const envFile = fs.readFileSync(envPath, 'utf-8');
  const match = envFile.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (!match) {
    throw new Error('DATABASE_URL not found in environment or .env');
  }
  return match[1];
}

async function run() {
  console.log('Running Bank Statement tables migration...');
  const pool = new Pool({ connectionString: loadDatabaseUrl() });
  try {
    const sqlPath = path.join(process.cwd(), 'scripts', 'create_bank_statement_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('Bank Statement tables created/verified successfully in PostgreSQL!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
