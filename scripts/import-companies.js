const { PrismaClient } = require('../src/generated/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting import process...');

  try {
    console.log('Clearing existing contacts and companies...');
    await prisma.contact.deleteMany();
    try {
      await prisma.company.deleteMany();
      console.log('Successfully cleared all existing companies and contacts.');
    } catch (e) {
      console.warn('Warning: Could not delete all companies. Some may be tied to existing Orders/Quotations. Error: ' + e.message);
    }
    
    const filePath = path.join(process.cwd(), 'บริษัท_ลูกค้า.xlsx');
    console.log(`Reading Excel file: ${filePath}`);
    
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Read raw data
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Map headers to indices
    const headers = rawData[0];
    const rows = rawData.slice(1);
    
    const getVal = (row, headerName) => {
      const idx = headers.findIndex(h => h && h.includes(headerName));
      return idx >= 0 ? row[idx] : undefined;
    };

    // Cache users for fast lookup by employeeId
    const users = await prisma.user.findMany();
    const userMap = new Map();
    users.forEach(u => {
      if (u.employeeId) userMap.set(u.employeeId.toUpperCase().trim(), u.id);
    });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const companyName = getVal(row, 'companyName');
      if (!companyName) continue; // Skip empty rows

      try {
        const taxId = getVal(row, 'taxId');
        const rawEmployeeId = getVal(row, 'assignedUserId');
        let assignedUserId = null;
        
        if (rawEmployeeId) {
           const cleanId = rawEmployeeId.toString().toUpperCase().trim();
           assignedUserId = userMap.get(cleanId) || null;
        }

        const companyData = {
          companyName: companyName.toString().trim(),
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

        // Check for duplicates
        let company = await prisma.company.findFirst({
          where: { companyName: companyData.companyName }
        });

        if (company) {
          // Update
          company = await prisma.company.update({
            where: { id: company.id },
            data: companyData
          });
        } else {
          // Create
          company = await prisma.company.create({
            data: companyData
          });
        }

        // Handle Contact
        const contactName = getVal(row, 'contactName');
        if (contactName) {
           const contactData = {
             companyId: company.id,
             contactName: contactName.toString().trim(),
             position: getVal(row, 'position')?.toString() || null,
             mobilePhone: getVal(row, 'contactPhone')?.toString() || null,
             email: getVal(row, 'contactEmail')?.toString() || null,
             isETaxReceiver: getVal(row, 'isETaxReceiver') === 'Yes' || getVal(row, 'isETaxReceiver') === 'ใช่'
           };

           // Check if contact already exists for this company
           const existingContact = await prisma.contact.findFirst({
             where: { companyId: company.id, contactName: contactData.contactName }
           });

           if (existingContact) {
             await prisma.contact.update({
               where: { id: existingContact.id },
               data: contactData
             });
           } else {
             await prisma.contact.create({
               data: contactData
             });
           }
        }
        
        successCount++;
      } catch (err) {
        console.error(`Error processing row ${i + 2} (${companyName}):`, err.message);
        errorCount++;
      }
    }

    console.log(`Import complete! Successfully imported/updated ${successCount} companies. Errors: ${errorCount}.`);

  } catch (error) {
    console.error('Fatal error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
