const { execSync } = require('child_process');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
process.env.DATABASE_URL = envConfig.DATABASE_URL;

try {
  const result = execSync('npx prisma db execute --stdin < scratch_bucket.sql', { encoding: 'utf-8', env: process.env });
  console.log('Success:', result);
} catch (e) {
  console.error('Error:', e.stderr || e.message);
}
