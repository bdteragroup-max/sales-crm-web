const fs = require('fs');
const { Pool } = require('pg');
const dotenv = require('dotenv');

const cfg = dotenv.parse(fs.readFileSync('.env'));
const pool = new Pool({ connectionString: cfg.DATABASE_URL });

async function run() {
  try {
    const sql = fs.readFileSync('scripts/create_marketing_board_tables.sql', 'utf8');
    console.log('Applying migration...');
    await pool.query(sql);
    console.log('Marketing Board tables successfully created!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
