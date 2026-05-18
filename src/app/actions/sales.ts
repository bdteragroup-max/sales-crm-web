"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

const VALID_WIN_LOSS_REASONS = [
  "ราคาแพงกว่าคู่แข่ง",
  "ลูกค้าเลื่อนการดำเนินโครงการ",
  "สเปกสินค้าไม่ตรงตามความต้องการ",
  "แพ้ให้คู่แข่ง (โปรดระบุรายละเอียด)",
  "งบประมาณไม่ได้รับการอนุมัติ",
  "อื่นๆ (โปรดระบุ)"
];

export async function generateNextQuotationNumber(companyAbbr: string) {
  const user = await getUser();
  if (!user) return null;

  try {
    const now = new Date();
    // Use Buddhist Era (BE) Year - 2 digits (e.g., 2569 -> 69)
    const beYear = (now.getFullYear() + 543).toString().slice(-2);
    
    // Date format MMDD
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePart = `${month}${day}`;

    // Find sequence for today and this company abbr
    // In a real app, you might want to query by prefix
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const count = await prisma.quotation.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        quotationNumber: {
          contains: `-${companyAbbr}`
        }
      }
    });

    const sequence = count + 1;
    return `QT${beYear}-${companyAbbr}${datePart}-${sequence}`;
  } catch (error) {
    console.error("Error generating quotation number:", error);
    return null;
  }
}

export async function searchCompanies(query: string) {
  if (!query || query.length < 2) return [];
  
  try {
    const companies = await prisma.company.findMany({
      where: {
        companyName: {
          contains: query,
          mode: 'insensitive'
        }
      },
      take: 5
    });
    return companies;
  } catch (error) {
    console.error("Error searching companies:", error);
    return [];
  }
}

export async function searchContacts(query: string, companyId?: string) {
  if (!query || query.length < 1) return [];
  
  try {
    const contacts = await prisma.contact.findMany({
      where: {
        contactName: {
          contains: query,
          mode: 'insensitive'
        },
        ...(companyId ? { companyId } : {})
      },
      include: {
        company: true
      },
      take: 5
    });
    return contacts;
  } catch (error) {
    console.error("Error searching contacts:", error);
    return [];
  }
}

export async function searchCompetitors(query: string) {
  if (!query || query.length < 1) return [];
  
  try {
    const competitors = await prisma.competitor.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive'
        }
      },
      take: 5
    });
    return competitors;
  } catch (error) {
    console.error("Error searching competitors:", error);
    return [];
  }
}

export async function getPostalInfo(postalCode: string) {
  if (!postalCode || postalCode.length < 5) return [];
  
  try {
    const data = await prisma.postalData.findMany({
      where: { postalCode }
    });
    return data;
  } catch (error) {
    console.error("Error fetching postal info:", error);
    return [];
  }
}

export async function saveSalesData(formData: FormData) {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const companyName = formData.get("companyName") as string;
    if (!companyName) {
      return { success: false, error: "ชื่อบริษัทเป็นสิ่งจำเป็น (Company Name is required)" };
    }

    const requirementNumber = formData.get("requirementNumber") as string;
    const requirementDateRaw = formData.get("requirementDate") as string;
    const quotationNumber = formData.get("quotationNumber") as string;
    const quotationDateRaw = formData.get("quotationDate") as string;
    const status = formData.get("status") as string;
    const rejectReason = formData.get("rejectReason") as string;
    
    const salesBeforeVat = parseFloat(formData.get("salesBeforeVat") as string) || 0;
    const transportationFee = parseFloat(formData.get("transportationFee") as string) || 0;
    const installationFee = parseFloat(formData.get("installationFee") as string) || 0;
    const totalAmountBeforeVat = salesBeforeVat + transportationFee + installationFee;

    const actualClosingAmount = parseFloat(formData.get("actualClosingAmount") as string) || null;
    const poDateRaw = formData.get("poDate") as string;
    const billingDateRaw = formData.get("billingDate") as string;
    const invoiceNumber = formData.get("invoiceNumber") as string;
    const winLossReason = formData.get("winLossReason") as string;

    const taxId = formData.get("taxId") as string;
    const branchOrHeadOffice = formData.get("branchOrHeadOffice") as string;
    const postalCode = formData.get("postalCode") as string;
    const province = formData.get("province") as string;
    const district = formData.get("district") as string;
    const subDistrict = formData.get("subDistrict") as string;
    const address = formData.get("address") as string;
    const contactName = formData.get("contactName") as string;
    const position = formData.get("position") as string;
    const mobilePhone = formData.get("mobilePhone") as string;
    const businessType = formData.get("businessType") as string;
    const customerAccessChannel = formData.get("customerAccessChannel") as string;
    const customerType = formData.get("customerType") as string;
    const customerStatus = formData.get("customerStatus") as string;
    const productInterest = formData.get("productInterest") as string;
    const productType = formData.get("productType") as string;

    const followUp1Raw = formData.get("followUp1") as string;
    const followUp2Raw = formData.get("followUp2") as string;
    const followUp3Raw = formData.get("followUp3") as string;
    const followUp4Raw = formData.get("followUp4") as string;

    const remarks = formData.get("remarks") as string;
    const salesBranch = formData.get("salesBranch") as string;
    const salesTeamLeader = formData.get("salesTeamLeader") as string;

    const isLostStatus = status && (status.startsWith('ปฏิเสธ') || status.startsWith('ยกเลิก'));
    if (isLostStatus) {
      if (!winLossReason || !winLossReason.trim()) {
        return { success: false, error: "กรุณาระบุกลุ่มสาเหตุการพลาดดีล (Please select a loss reason category)" };
      }
      if (!VALID_WIN_LOSS_REASONS.includes(winLossReason)) {
        return { success: false, error: "กลุ่มสาเหตุการพลาดดีลไม่ถูกต้องตามที่กำหนด (Invalid loss reason category)" };
      }
      if (!rejectReason || !rejectReason.trim()) {
        return { success: false, error: "กรุณาระบุรายละเอียดการพลาดดีลเพิ่มเติม (Please provide additional loss details)" };
      }
    }

    const parseDate = (d: string) => d ? new Date(d) : null;

    // Find or create company
    let company = await prisma.company.findFirst({
      where: { companyName }
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          companyName,
          taxId,
          branchOrHeadOffice,
          businessType,
          customerType,
          customerStatus,
          customerAccessChannel,
          address,
          subDistrict,
          district,
          province,
          postalCode,
          area: province,
        }
      });
    } else {
      // Update existing company with new details
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          taxId: taxId || company.taxId,
          branchOrHeadOffice: branchOrHeadOffice || company.branchOrHeadOffice,
          businessType: businessType || company.businessType,
          customerType: customerType || company.customerType,
          customerStatus: customerStatus || company.customerStatus,
          customerAccessChannel: customerAccessChannel || company.customerAccessChannel,
          address: address || company.address,
          subDistrict: subDistrict || company.subDistrict,
          district: district || company.district,
          province: province || company.province,
          postalCode: postalCode || company.postalCode,
          area: province || company.area,
        }
      });
    }

    let contact = null;
    if (contactName) {
      contact = await prisma.contact.findFirst({
        where: { companyId: company.id, contactName }
      });
      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            companyId: company.id,
            contactName,
            position,
            mobilePhone
          }
        });
      }
    }

    await prisma.quotation.create({
      data: {
        companyId: company.id,
        contactId: contact?.id,
        salespersonId: user.id,
        requirementNumber,
        requirementDate: parseDate(requirementDateRaw),
        quotationNumber,
        quotationDate: parseDate(quotationDateRaw),
        status,
        rejectReason,
        subject: productInterest,
        productType,
        salesBeforeVat,
        transportationFee,
        installationFee,
        totalAmountBeforeVat,
        actualClosingAmount,
        poDate: parseDate(poDateRaw),
        billingDate: parseDate(billingDateRaw),
        invoiceNumber,
        winLossReason,
        remarks,
        salesBranch,
        salesTeamLeader,
        followUp1: parseDate(followUp1Raw),
        followUp2: parseDate(followUp2Raw),
        followUp3: parseDate(followUp3Raw),
        followUp4: parseDate(followUp4Raw),
      }
    });

    revalidatePath("/sales");
    return { success: true };

  } catch (error) {
    console.error("Error saving sales data:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล (Failed to save data)" };
  }
}
export async function updateSalesData(quotationId: string, formData: FormData) {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const companyName = formData.get("companyName") as string;
    if (!companyName) {
      return { success: false, error: "ชื่อบริษัทเป็นสิ่งจำเป็น (Company Name is required)" };
    }

    const requirementNumber = formData.get("requirementNumber") as string;
    const requirementDateRaw = formData.get("requirementDate") as string;
    const quotationNumber = formData.get("quotationNumber") as string;
    const quotationDateRaw = formData.get("quotationDate") as string;
    const status = formData.get("status") as string;
    const rejectReason = formData.get("rejectReason") as string;
    
    const salesBeforeVat = parseFloat(formData.get("salesBeforeVat") as string) || 0;
    const transportationFee = parseFloat(formData.get("transportationFee") as string) || 0;
    const installationFee = parseFloat(formData.get("installationFee") as string) || 0;
    const totalAmountBeforeVat = salesBeforeVat + transportationFee + installationFee;

    const actualClosingAmount = parseFloat(formData.get("actualClosingAmount") as string) || null;
    const poDateRaw = formData.get("poDate") as string;
    const billingDateRaw = formData.get("billingDate") as string;
    const invoiceNumber = formData.get("invoiceNumber") as string;
    const winLossReason = formData.get("winLossReason") as string;

    const taxId = formData.get("taxId") as string;
    const branchOrHeadOffice = formData.get("branchOrHeadOffice") as string;
    const postalCode = formData.get("postalCode") as string;
    const province = formData.get("province") as string;
    const district = formData.get("district") as string;
    const subDistrict = formData.get("subDistrict") as string;
    const address = formData.get("address") as string;
    const contactName = formData.get("contactName") as string;
    const position = formData.get("position") as string;
    const mobilePhone = formData.get("mobilePhone") as string;
    const businessType = formData.get("businessType") as string;
    const customerAccessChannel = formData.get("customerAccessChannel") as string;
    const customerType = formData.get("customerType") as string;
    const customerStatus = formData.get("customerStatus") as string;
    const productInterest = formData.get("productInterest") as string;
    const productType = formData.get("productType") as string;

    const followUp1Raw = formData.get("followUp1") as string;
    const followUp2Raw = formData.get("followUp2") as string;
    const followUp3Raw = formData.get("followUp3") as string;
    const followUp4Raw = formData.get("followUp4") as string;

    const remarks = formData.get("remarks") as string;
    const salesBranch = formData.get("salesBranch") as string;
    const salesTeamLeader = formData.get("salesTeamLeader") as string;

    const isLostStatus = status && (status.startsWith('ปฏิเสธ') || status.startsWith('ยกเลิก'));
    if (isLostStatus) {
      if (!winLossReason || !winLossReason.trim()) {
        return { success: false, error: "กรุณาระบุกลุ่มสาเหตุการพลาดดีล (Please select a loss reason category)" };
      }
      if (!VALID_WIN_LOSS_REASONS.includes(winLossReason)) {
        return { success: false, error: "กลุ่มสาเหตุการพลาดดีลไม่ถูกต้องตามที่กำหนด (Invalid loss reason category)" };
      }
      if (!rejectReason || !rejectReason.trim()) {
        return { success: false, error: "กรุณาระบุรายละเอียดการพลาดดีลเพิ่มเติม (Please provide additional loss details)" };
      }
    }

    const parseDate = (d: string) => d ? new Date(d) : null;

    // Find or create company (same as create)
    let company = await prisma.company.findFirst({
      where: { companyName }
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          companyName,
          taxId,
          branchOrHeadOffice,
          businessType,
          customerType,
          customerStatus,
          customerAccessChannel,
          address,
          subDistrict,
          district,
          province,
          postalCode,
          area: province,
        }
      });
    } else {
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          taxId: taxId || company.taxId,
          branchOrHeadOffice: branchOrHeadOffice || company.branchOrHeadOffice,
          businessType: businessType || company.businessType,
          customerType: customerType || company.customerType,
          customerStatus: customerStatus || company.customerStatus,
          customerAccessChannel: customerAccessChannel || company.customerAccessChannel,
          address: address || company.address,
          subDistrict: subDistrict || company.subDistrict,
          district: district || company.district,
          province: province || company.province,
          postalCode: postalCode || company.postalCode,
          area: province || company.area,
        }
      });
    }

    let contact = null;
    if (contactName) {
      contact = await prisma.contact.findFirst({
        where: { companyId: company.id, contactName }
      });
      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            companyId: company.id,
            contactName,
            position,
            mobilePhone
          }
        });
      }
    }

    await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        companyId: company.id,
        contactId: contact?.id,
        salespersonId: user.id,
        requirementNumber,
        requirementDate: parseDate(requirementDateRaw),
        quotationNumber,
        quotationDate: parseDate(quotationDateRaw),
        status,
        rejectReason,
        subject: productInterest,
        productType,
        salesBeforeVat,
        transportationFee,
        installationFee,
        totalAmountBeforeVat,
        actualClosingAmount,
        poDate: parseDate(poDateRaw),
        billingDate: parseDate(billingDateRaw),
        invoiceNumber,
        winLossReason,
        remarks,
        salesBranch,
        salesTeamLeader,
        followUp1: parseDate(followUp1Raw),
        followUp2: parseDate(followUp2Raw),
        followUp3: parseDate(followUp3Raw),
        followUp4: parseDate(followUp4Raw),
      }
    });

    revalidatePath("/sales");
    return { success: true };

  } catch (error) {
    console.error("Error updating sales data:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล (Failed to update data)" };
  }
}
