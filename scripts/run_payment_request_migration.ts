import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

const envPath = path.join(process.cwd(), '.env');
const cfg = dotenv.parse(fs.readFileSync(envPath));
const pool = new Pool({ connectionString: cfg.DATABASE_URL });

async function run() {
  console.log('Running Payment Requests migration...');
  try {
    const sqlPath = path.join(process.cwd(), 'scripts', 'create_payment_request_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('Payment Request tables created successfully in PostgreSQL database!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
