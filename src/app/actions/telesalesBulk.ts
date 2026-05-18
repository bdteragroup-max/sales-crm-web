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

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      const companyName = row["ชื่อบริษัท/บุคคล"] || row["ชื่อบริษัท"];
      if (!companyName) {
        throw new Error("Missing company name");
      }

      const parseDate = (d: any) => {
        if (!d) return null;
        if (typeof d === 'number') {
          // Excel date serial number
          return new Date((d - 25569) * 86400 * 1000);
        }
        const date = new Date(d);
        return isNaN(date.getTime()) ? null : date;
      };

      // 1. Find/Create Company
      let company = await prisma.company.findFirst({
        where: { companyName: String(companyName) }
      });

      if (!company) {
        company = await prisma.company.create({
          data: {
            companyName: String(companyName),
            customerType: String(row["ประเภทลูกค้า"] || "USER"),
            customerStatus: String(row["สถานะลูกค้า"] || "ลูกค้าใหม่"),
          }
        });
      }

      // 2. Find/Create Contact
      const contactPerson = row["ผู้ติดต่อ"];
      let contact = null;
      if (contactPerson) {
        contact = await prisma.contact.findFirst({
          where: { companyId: company.id, contactName: String(contactPerson) }
        });
        if (!contact) {
          contact = await prisma.contact.create({
            data: {
              companyId: company.id,
              contactName: String(contactPerson),
              mobilePhone: String(row["เบอร์โทร"] || ""),
            }
          });
        }
      }

      // 3. Create Telesale record
      const resultParts = [];
      if (row["เข้านำเสนอ"] === "Y" || row["เข้านำเสนอ"] === "YES") resultParts.push("เข้านำเสนอ");
      if (row["เสนอราคา"] === "Y" || row["เสนอราคา"] === "YES") resultParts.push("เสนอราคา");
      if (row["ปิดการขาย"] === "Y" || row["ปิดการขาย"] === "YES") resultParts.push("ปิดการขาย");
      
      const combinedResult = resultParts.join(", ") || row["ผลลัพธ์"];

      await prisma.telesale.create({
        data: {
          companyId: company.id,
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
        }
      });

      successCount++;
    } catch (err: any) {
      errorCount++;
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  revalidatePath("/telesales");
  return { success: true, successCount, errorCount, errors };
}
