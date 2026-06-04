"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

export async function saveBulkTelesalesData(data: any[]) {
  const user = await getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  let successCount = 0;
  let errorCount = 0;
  let errors: string[] = [];

  try {
    const parseDate = (d: any) => {
      if (!d) return null;
      if (typeof d === 'number') {
        return new Date((d - 25569) * 86400 * 1000);
      }
      const date = new Date(d);
      return isNaN(date.getTime()) ? null : date;
    };

    // 1. Gather all unique company names from data
    const uniqueCompanyNames = Array.from(new Set(
      data.map(row => String(row["ชื่อบริษัท/บุคคล"] || row["ชื่อบริษัท"] || "").trim()).filter(Boolean)
    ));

    // 2. Fetch existing companies
    const existingCompanies = await prisma.company.findMany({
      where: { companyName: { in: uniqueCompanyNames } },
      select: { id: true, companyName: true }
    });
    
    const companyMap = new Map<string, string>();
    existingCompanies.forEach(c => companyMap.set(c.companyName, c.id));

    // 3. Identify and create missing companies
    const missingCompanies = uniqueCompanyNames.filter(name => !companyMap.has(name));
    
    // We create sequentially to easily map the returned IDs, or createMany then findMany again.
    // Creating sequentially for missing companies is fast enough if missing count is small, 
    // but if missing count is large, createMany is better. Let's do createMany + findMany.
    if (missingCompanies.length > 0) {
      // Pick first row match for customer properties
      const missingData = missingCompanies.map(name => {
        const row = data.find(r => String(r["ชื่อบริษัท/บุคคล"] || r["ชื่อบริษัท"] || "").trim() === name);
        return {
          companyName: name,
          customerType: String(row?.["ประเภทลูกค้า"] || "USER"),
          customerStatus: String(row?.["สถานะลูกค้า"] || "ลูกค้าใหม่"),
        };
      });

      await prisma.company.createMany({
        data: missingData,
        skipDuplicates: true
      });

      // Refetch to get IDs of newly created companies
      const newCompanies = await prisma.company.findMany({
        where: { companyName: { in: missingCompanies } },
        select: { id: true, companyName: true }
      });
      newCompanies.forEach(c => companyMap.set(c.companyName, c.id));
    }

    // 4. Handle Contacts similarly
    // Group by companyId + contactName
    const contactKeys = new Set<string>();
    const contactInputData: { companyId: string, contactName: string, mobilePhone: string }[] = [];
    
    data.forEach(row => {
      const cName = String(row["ชื่อบริษัท/บุคคล"] || row["ชื่อบริษัท"] || "").trim();
      const contactPerson = String(row["ผู้ติดต่อ"] || "").trim();
      const companyId = companyMap.get(cName);
      
      if (companyId && contactPerson) {
        const key = `${companyId}::${contactPerson}`;
        if (!contactKeys.has(key)) {
          contactKeys.add(key);
          contactInputData.push({
            companyId,
            contactName: contactPerson,
            mobilePhone: String(row["เบอร์โทร"] || "")
          });
        }
      }
    });

    // Fetch existing contacts for these companies
    const companyIds = Array.from(new Set(contactInputData.map(c => c.companyId)));
    const existingContacts = await prisma.contact.findMany({
      where: { companyId: { in: companyIds } },
      select: { id: true, companyId: true, contactName: true }
    });

    const contactMap = new Set(existingContacts.map(c => `${c.companyId}::${c.contactName}`));

    const missingContacts = contactInputData.filter(c => !contactMap.has(`${c.companyId}::${c.contactName}`));
    if (missingContacts.length > 0) {
      await prisma.contact.createMany({
        data: missingContacts,
        skipDuplicates: true
      });
    }

    // 5. Build and insert Telesales records
    const telesalesData = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const cName = String(row["ชื่อบริษัท/บุคคล"] || row["ชื่อบริษัท"] || "").trim();
      const companyId = companyMap.get(cName);
      
      if (!companyId) {
        errorCount++;
        errors.push(`Row ${i + 1}: Missing company name`);
        continue;
      }

      const resultParts = [];
      if (row["เข้านำเสนอ"] === "Y" || row["เข้านำเสนอ"] === "YES") resultParts.push("เข้านำเสนอ");
      if (row["เสนอราคา"] === "Y" || row["เสนอราคา"] === "YES") resultParts.push("เสนอราคา");
      if (row["ปิดการขาย"] === "Y" || row["ปิดการขาย"] === "YES") resultParts.push("ปิดการขาย");
      const combinedResult = resultParts.join(", ") || row["ผลลัพธ์"];

      telesalesData.push({
        companyId: companyId,
        userId: user.id,
        callDate: parseDate(row["วันที่โทร"]),
        callStatus: String(row["การรับสาย"] || row["สถานะ"] || ""),
        callOutcome: String(row["ผลลัพธ์"] || row["สถานะการโทร"] || ""),
        forwardTo: String(row["งานส่งต่อ"] || ""),
        conversationSummary: String(row["เนื้อหาที่พูดคุยระหว่างการพูดคุย"] || ""),
        needsOrProblems: String(row["สิ่งที่ลูกค้าต้องการ หรือปัญหาที่ลูกค้าต้องการแก้ไข"] || ""),
        meetingObjective: String(row["วัตถุประสงค์ของการเข้าพบ"] || ""),
        competitorName: String(row["ชื่อคู่แข่ง"] || ""),
        competitorPrice: parseFloat(row["ราคาคู่แข่ง"]) || null,
        competitorPromotion: String(row["โปรโมชั่นคู่แข่ง"] || ""),
        lastMeetingDate: parseDate(row["วันที่เข้าพบล่าสุด"]),
        callbackAt: parseDate(row["นัดโทรกลับวันที่"]),
        result: combinedResult,
      });
      successCount++;
    }

    // Create all telesales records in one query
    // Split into chunks of 1000 to avoid DB limitations on payload size just in case
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < telesalesData.length; i += CHUNK_SIZE) {
      const chunk = telesalesData.slice(i, i + CHUNK_SIZE);
      await prisma.telesale.createMany({
        data: chunk
      });
    }

  } catch (err: any) {
    console.error("Bulk upload error:", err);
    return { success: false, error: err.message || "Failed to process bulk data" };
  }

  revalidatePath("/telesales");
  return { success: true, successCount, errorCount, errors };
}
