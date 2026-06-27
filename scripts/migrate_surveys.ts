import { PrismaClient } from '@prisma/client';
// import { google } from 'googleapis'; // Requires `npm install googleapis`
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Configuration
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || 'YOUR_SHEET_ID_HERE';
const RANGE = 'Surveys!A2:ZZ'; // Adjust based on your actual sheet name and data range

/**
 * Maps a single row from Google Sheets to the nested Prisma Survey structure.
 * You will need to adjust the indices based on the actual column order in your Google Sheet
 * as defined in the field-traceability-matrix.
 */
function mapRowToSurvey(row: any[]) {
  // Example mapping (adjust indices to match your actual sheet columns):
  const [
    surveyNumber, // 0
    surveyDateStr, // 1
    companyName, // 2
    projectName, // 3
    projectLocation, // 4
    coordinatorName, // 5
    coordinatorPhone, // 6
    salespersonName, // 7
    // ... Add more fields
  ] = row;

  // Placeholder for transformed data
  return {
    surveyNumber: surveyNumber || `MIG-${Date.now()}`,
    surveyDate: surveyDateStr ? new Date(surveyDateStr) : new Date(),
    customerName: companyName || '',
    projectName: projectName || '',
    projectLocation: projectLocation || '',
    coordinatorName: coordinatorName || '',
    coordinatorPhone: coordinatorPhone || '',
    status: 'Completed', // Assuming migrated surveys are completed
    version: 1,
    // Add nested structures here (usageBehavior, electricalProfile, etc.)
  };
}

async function migrateData() {
  console.log('Starting Site Survey Migration...');
  
  // 1. Authenticate with Google Sheets (Uncomment and configure to use)
  /*
  const auth = new google.auth.GoogleAuth({
    keyFile: 'path/to/your/service-account.json', // Your Google Service Account key
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
  });
  const rows = response.data.values;
  */
  
  // MOCK ROWS FOR DEMONSTRATION
  const rows: any[][] = []; 
  
  if (!rows || rows.length === 0) {
    console.log('No data found in the spreadsheet.');
    return;
  }

  console.log(`Found ${rows.length} rows to migrate.`);

  // 2. Fetch dependencies (e.g., Salespeople)
  const users = await prisma.user.findMany({ where: { role: 'ตัวแทนฝ่ายขาย' } });
  const defaultSalesperson = users.length > 0 ? users[0] : null;

  if (!defaultSalesperson) {
    console.warn('No salesperson found in the database. Surveys must have a valid salespersonId.');
    return;
  }

  // 3. Process each row
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const surveyData = mapRowToSurvey(row);

      // We'll use Prisma's nested create/upsert to insert the survey
      await prisma.siteSurvey.upsert({
        where: { surveyNumber: surveyData.surveyNumber },
        update: {
          // If you want to update existing surveys during migration rerun
          surveyDate: surveyData.surveyDate,
          customerName: surveyData.customerName,
          projectName: surveyData.projectName,
          projectLocation: surveyData.projectLocation,
        },
        create: {
          ...surveyData,
          salespersonId: defaultSalesperson.id,
          // usageBehavior: { create: { ... } },
          // electricalProfile: { create: { ... } },
          // tariffSelection: { create: { ... } },
          // structure: { create: { ... } },
          // qa: { create: { ... } },
        } as any
      });

      console.log(`[OK] Migrated survey: ${surveyData.surveyNumber}`);
      successCount++;
    } catch (error: any) {
      console.error(`[ERROR] Failed to migrate row ${i + 2}:`, error.message);
      failCount++;
    }
  }

  console.log(`\nMigration Summary:`);
  console.log(`Total Success: ${successCount}`);
  console.log(`Total Failed: ${failCount}`);
}

migrateData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
