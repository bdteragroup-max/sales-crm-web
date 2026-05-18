import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const CSV_FILE_PATH = 'C:\\Users\\teragroup\\.gemini\\antigravity\\brain\\42741497-8634-4c45-8cfb-9abf94f9f230\\.system_generated\\steps\\472\\content.md';
const OUTPUT_JSON_PATH = 'C:\\Users\\teragroup\\.gemini\\antigravity\\brain\\42741497-8634-4c45-8cfb-9abf94f9f230\\scratch\\cleaned_sales_data.json';
const REPORT_PATH = 'C:\\Users\\teragroup\\.gemini\\antigravity\\brain\\42741497-8634-4c45-8cfb-9abf94f9f230\\data_review_report.md';

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    // Handle Thai years (Buddhist era)
    if (year > 2500) {
      year -= 543;
    }
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
}

function parseCurrency(valStr: string): number {
  if (!valStr || valStr.trim() === '') return 0;
  const cleaned = valStr.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function main() {
  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  // Skip the first 4 lines of markdown headers
  const lines = content.split('\n');
  const csvContent = lines.slice(4).join('\n');

  const results = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const rawData = results.data as any[];
  
  let validRows = 0;
  let emptyRows = 0;
  let missingQuotationNo = 0;
  let missingCompany = 0;
  let missingAmount = 0;
  let invalidDates = 0;

  const cleanData = [];

  for (const row of rawData) {
    const updateDate = row['วันที่อัพเดท']?.trim();
    const status = row['สถานะใบเสนอราคา']?.trim();
    const quotationNo = row['No.Quotation']?.trim();
    const company = row['ชื่อบริษัท']?.trim();
    const totalAmount = row['ยอดรวมใบเสนอราคา (ก่อน VAT)']?.trim();
    const salesPerson = row['ชื่อนามสกุล']?.trim();

    // Check if row is completely empty (often happens at the end of sheets)
    if (!updateDate && !status && !quotationNo && !company) {
      emptyRows++;
      continue;
    }

    if (!quotationNo) missingQuotationNo++;
    if (!company) missingCompany++;
    
    const parsedAmount = parseCurrency(totalAmount);
    if (parsedAmount === 0 && totalAmount && totalAmount !== '0' && totalAmount !== '0.00') {
      missingAmount++; // Likely parse error or non-numeric
    }

    const parsedDate = parseDate(updateDate);
    if (updateDate && !parsedDate) {
      invalidDates++;
    }

    cleanData.push({
      updateDate: parsedDate,
      status: status || 'Unknown',
      quotationNo: quotationNo || null,
      company: company || 'Unknown Customer',
      totalAmount: parsedAmount,
      salesPerson: salesPerson || 'Unassigned',
      // Store raw for debugging if needed
      _raw: row
    });

    validRows++;
  }

  // Write clean JSON data to scratch
  fs.mkdirSync(path.dirname(OUTPUT_JSON_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(cleanData, null, 2));

  // Generate Report
  const report = `# Data Review Report

I have parsed the Google Sheet data. Here is the summary of the data quality and the cleaning steps I've prepared before importing.

## Overview
*   **Total Rows Parsed**: ${rawData.length}
*   **Valid Rows Processed**: ${validRows}
*   **Empty Rows Skipped**: ${emptyRows}

## Data Quality Issues Found

| Issue Type | Count | Action Taken |
| :--- | :--- | :--- |
| **Missing Quotation Number** | ${missingQuotationNo} | These records will be imported with a \`null\` quotation number but will still be tied to the customer. |
| **Missing Company/Customer Name** | ${missingCompany} | These records will be assigned to a default "Unknown Customer" to preserve the sales value. |
| **Invalid/Unparseable Dates** | ${invalidDates} | The dates have been converted to standard ISO formats. Any completely broken dates are set to \`null\`. Thai Buddhist years (e.g., 2565) were converted to Gregorian (2022). |
| **Unparseable Amounts** | ${missingAmount} | Commas were stripped (e.g., "24,850.00" -> 24850.00). Any non-numeric strings were set to \`0\`. |

## Proposed Schema Mapping

When we import this into the Prisma database, the data will map as follows:
*   \`No.Quotation\` -> \`Quotation.quotationNumber\`
*   \`ชื่อบริษัท\` -> \`Customer.companyName\` (will create unique customers)
*   \`ยอดรวมใบเสนอราคา (ก่อน VAT)\` -> \`Quotation.totalAmount\`
*   \`สถานะใบเสนอราคา\` -> \`Quotation.status\`
*   \`ชื่อนามสกุล\` -> Linked to \`EmployeeSale.fullName\`

> [!TIP]
> The cleaned dataset has been saved internally. If you approve of these cleaning actions (like setting missing companies to "Unknown Customer" and zeroing out invalid amounts), let me know and I will write the final database import script!
`;

  fs.writeFileSync(REPORT_PATH, report);
  console.log("Data cleaned and report generated.");
}

main().catch(console.error);
