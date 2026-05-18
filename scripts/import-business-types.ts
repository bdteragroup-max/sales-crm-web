import { PrismaClient } from '../src/generated/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function doImport() {
  const filePath = path.join('C:\\Users\\teragroup\\.gemini\\antigravity\\brain\\9d0fc530-34da-4cbf-96f3-dca5cf1474b6\\.system_generated\\steps\\620\\content.md');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  
  let headerIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'ประเภทธุรกิจ') {
      headerIndex = i;
      break;
    }
  }

  const dataLines = lines.slice(headerIndex + 1);
  const typesToInsert = new Set<string>();

  for (const line of dataLines) {
    let cleanLine = line.trim();
    if (!cleanLine) continue;
    
    // Remove quotes if present
    cleanLine = cleanLine.replace(/^"|"$/g, '').trim();
    
    if (cleanLine && cleanLine !== '---') {
      typesToInsert.add(cleanLine);
    }
  }

  console.log(`Found ${typesToInsert.size} business types to import.`);

  let insertedCount = 0;

  for (const typeName of Array.from(typesToInsert)) {
    const existing = await prisma.businessType.findUnique({
      where: { name: typeName }
    });

    if (!existing) {
      await prisma.businessType.create({
        data: { name: typeName }
      });
      insertedCount++;
    }
  }

  console.log(`Successfully inserted ${insertedCount} new business types.`);
}

doImport().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
