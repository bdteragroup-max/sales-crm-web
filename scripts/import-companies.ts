import prisma from '../src/app/lib/db';
import * as xlsx from 'xlsx';
import path from 'path';
import crypto from 'crypto';

async function main() {
  console.log('Starting fast import process...');

  try {
    console.log('Clearing existing contacts and companies...');
    await prisma.contact.deleteMany();
    try {
      await prisma.company.deleteMany();
      console.log('Successfully cleared all existing companies and contacts.');
    } catch (e: any) {
      console.warn('Warning: Could not delete all companies. Error: ' + e.message);
    }
    
    const filePath = path.join(process.cwd(), 'บริษัท_ลูกค้า.xlsx');
    console.log(`Reading Excel file: ${filePath}`);
    
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = rawData[0] as string[];
    const rows = rawData.slice(1) as any[][];
    
    const getVal = (row: any[], headerName: string) => {
      const idx = headers.findIndex(h => h && h.includes(headerName));
      return idx >= 0 ? row[idx] : undefined;
    };

    const users = await prisma.user.findMany();
    const userMap = new Map();
    users.forEach(u => {
      if (u.employeeId) userMap.set(u.employeeId.toUpperCase().trim(), u.id);
    });

    const companyMap = new Map<string, any>();
    const contactsList: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const companyName = getVal(row, 'companyName');
      if (!companyName) continue;
      
      const cleanCompanyName = companyName.toString().trim();
      let company = companyMap.get(cleanCompanyName);
      
      if (!company) {
        const taxId = getVal(row, 'taxId');
        const rawEmployeeId = getVal(row, 'assignedUserId');
        let assignedUserId: string | null = null;
        
        if (rawEmployeeId) {
           const cleanId = rawEmployeeId.toString().toUpperCase().trim();
           assignedUserId = userMap.get(cleanId) || null;
        }

        company = {
          id: crypto.randomUUID(), // Generate ID manually for relation linking
          companyName: cleanCompanyName,
          taxId: taxId ? taxId.toString().trim() : null,
          customerType: getVal(row, 'customerType')?.toString() || null,
          customerStatus: getVal(row, 'customerStatus')?.toString() || null,
          branchOrHeadOffice: getVal(row, 'branchOrHeadOffice')?.toString() || null,
          businessType: getVal(row, 'businessType')?.toString() || null,
          paymentMethod: getVal(row, 'paymentMethod')?.toString() || null,
          address: getVal(row, 'address')?.toString() || null,
          subDistrict: getVal(row, 'subDistrict')?.toString() || null,
          district: getVal(row, 'district')?.toString() || null,
          province: getVal(row, 'province')?.toString() || null,
          postalCode: getVal(row, 'postalCode')?.toString() || null,
          billingAddress: getVal(row, 'billingAddress')?.toString() || null,
          billingSubDistrict: getVal(row, 'billingSubDistrict')?.toString() || null,
          billingDistrict: getVal(row, 'billingDistrict')?.toString() || null,
          billingProvince: getVal(row, 'billingProvince')?.toString() || null,
          billingPostalCode: getVal(row, 'billingPostalCode')?.toString() || null,
          shippingAddress: getVal(row, 'shippingAddress')?.toString() || null,
          shippingSubDistrict: getVal(row, 'shippingSubDistrict')?.toString() || null,
          shippingDistrict: getVal(row, 'shippingDistrict')?.toString() || null,
          shippingProvince: getVal(row, 'shippingProvince')?.toString() || null,
          shippingPostalCode: getVal(row, 'shippingPostalCode')?.toString() || null,
          assignedUserId: assignedUserId,
        };
        companyMap.set(cleanCompanyName, company);
      }

      // Contact
      const contactName = getVal(row, 'contactName');
      if (contactName) {
         contactsList.push({
           companyId: company.id,
           contactName: contactName.toString().trim(),
           position: getVal(row, 'position')?.toString() || null,
           mobilePhone: getVal(row, 'contactPhone')?.toString() || null,
           email: getVal(row, 'contactEmail')?.toString() || null,
           isETaxReceiver: getVal(row, 'isETaxReceiver') === 'Yes' || getVal(row, 'isETaxReceiver') === 'ใช่'
         });
      }
    }

    console.log(`Prepared ${companyMap.size} unique companies and ${contactsList.length} contacts. Inserting...`);

    // Insert Companies in chunks to avoid query size limits
    const companies = Array.from(companyMap.values());
    const chunkSize = 1000;
    
    for (let i = 0; i < companies.length; i += chunkSize) {
      const chunk = companies.slice(i, i + chunkSize);
      await prisma.company.createMany({ data: chunk, skipDuplicates: true });
      console.log(`Inserted companies ${i + 1} to ${i + chunk.length}`);
    }

    // Insert Contacts in chunks
    for (let i = 0; i < contactsList.length; i += chunkSize) {
      const chunk = contactsList.slice(i, i + chunkSize);
      await prisma.contact.createMany({ data: chunk, skipDuplicates: true });
      console.log(`Inserted contacts ${i + 1} to ${i + chunk.length}`);
    }

    console.log('Import complete!');

  } catch (error: any) {
    console.error('Fatal error during import:', error);
  } finally {
    console.log("Disconnecting and exiting...");
    process.exit(0);
  }
}

main();
