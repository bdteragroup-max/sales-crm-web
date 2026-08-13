"use server";

import prisma from "@/app/lib/db";
import { generateOrderNumber } from "./orderHelper";
import { getUser } from "@/app/lib/dal";
import { getCompanyWhereClause } from "@/app/lib/visibility";
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

export async function searchCompanies(query: string, surveyExcludeFilter?: { round: string, year: string, method: string }) {
  if (!query || query.length < 2) return [];
  
  try {
    const user = await getUser();
    const whereClause: any = {
      companyName: {
        contains: query,
        mode: 'insensitive'
      }
    };
    
    if (user) {
      if (!whereClause.AND) whereClause.AND = [];
      whereClause.AND.push(getCompanyWhereClause(user as any));
    }

    if (surveyExcludeFilter) {
      const { round, year, method } = surveyExcludeFilter;
      const evaluated = await prisma.customerSatisfaction.findMany({
        where: {
          surveyRound: parseInt(round),
          surveyYear: parseInt(year),
          surveyMethod: method
        },
        select: { companyId: true }
      });
      const evaluatedIds = evaluated.map(s => s.companyId);
      if (evaluatedIds.length > 0) {
        if (!whereClause.AND) whereClause.AND = [];
        whereClause.AND.push({
          id: { notIn: evaluatedIds }
        });
      }
    }

    const companies = await prisma.company.findMany({
      where: whereClause,
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
    const user = await getUser();
    const whereClause: any = {
      contactName: {
        contains: query,
        mode: 'insensitive'
      },
      ...(companyId ? { companyId } : {})
    };
    
    if (user) {
      whereClause.company = getCompanyWhereClause(user as any);
    }

    const contacts = await prisma.contact.findMany({
      where: whereClause,
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
    
    if (quotationNumber && quotationNumber.trim() !== '') {
      const existing = await prisma.quotation.findFirst({
        where: { quotationNumber: quotationNumber.trim() }
      });
      if (existing) {
        return { success: false, error: `เลขที่ใบเสนอราคา ${quotationNumber} มีอยู่ในระบบแล้ว (Quotation number already exists)` };
      }
    }
    const rejectReason = formData.get("rejectReason") as string;
    const jobType = formData.get("jobType") as string;
    const paymentMethod = formData.get("paymentMethod") as string;
    const installmentsRaw = formData.get("installments") as string;
    let installments = undefined;
    try {
      if (installmentsRaw) installments = JSON.parse(installmentsRaw).map((i: any) => ({ ...i, amount: Number(i.amount) || 0, dueDate: new Date(i.dueDate || new Date()) }));
    } catch(e) {}
    
    const salesBeforeVat = parseFloat(formData.get("salesBeforeVat") as string) || 0;
    const transportationFee = parseFloat(formData.get("transportationFee") as string) || 0;
    const installationFee = parseFloat(formData.get("installationFee") as string) || 0;
    const totalAmountBeforeVat = salesBeforeVat + transportationFee + installationFee;

    const actualClosingAmount = parseFloat(formData.get("actualClosingAmount") as string) || null;
    const poDateRaw = formData.get("poDate") as string;
    const poNumber = formData.get("poNumber") as string;
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

    const salesOrderDateRaw = formData.get("salesOrderDate") as string;
    const deliveryDateRaw = formData.get("deliveryDate") as string;
    const creditTerms = formData.get("creditTerms") as string;
    const creditDocsUrl = formData.get("creditDocsUrl") as string;
    const billingRegulations = formData.get("billingRegulations") as string;
    const billingDocsUrl = formData.get("billingDocsUrl") as string;
    const percentageTerms = formData.get("percentageTerms") as string;
    const paymentDateRaw = formData.get("paymentDate") as string;
    const workName = formData.get("workName") as string;

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

    let finalBillingDate = parseDate(billingDateRaw);
    if (status === 'เปิดบิลแล้ว' && !finalBillingDate) {
      return { success: false, error: "กรุณาระบุวันเปิดบิลขาย (Please enter Billing Date)" };
    }
    let finalPoDate = parseDate(poDateRaw);
    if (status?.startsWith('PO') && !finalPoDate) {
      return { success: false, error: "กรุณาระบุวันเปิด P/O (Please enter PO Date)" };
    }

    const newQuotation = await prisma.quotation.create({
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
        poDate: finalPoDate,
        poNumber: poNumber || null,
        billingDate: finalBillingDate,
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

    try {
      await prisma.companyInteraction.create({
        data: {
          companyId: company.id,
          userId: user.id,
          type: 'quotation',
          title: `สร้างใบเสนอราคา ${quotationNumber || ''}`,
          description: `สถานะ: ${status}\nหัวข้อ: ${productInterest || '-'}\nมูลค่า(ก่อน VAT): ${salesBeforeVat || 0}`,
          occurredAt: new Date()
        }
      });
    } catch (e) {
      console.error('Failed to log quotation interaction', e);
    }

    // Auto-create an Order if status is closed (เปิดบิลแล้ว / PO...)
    let awardedGold = 0;
    let awardMessage = '';
    if (status === 'เปิดบิลแล้ว' || status?.startsWith('PO')) {
      const existingOrder = await prisma.order.findFirst({
        where: { quotationId: newQuotation.id }
      });
      const isCabinetJob = ['งานตู้', 'งานตู้ + ติดตั้ง', 'Cabinet Work', 'Cabinet Work + Installation'].includes(jobType || '');
      if (!existingOrder && company.id && isCabinetJob) {
        const finalOrderNumber = await generateOrderNumber();
        const newOrder = await prisma.order.create({
          data: {
            orderNumber: finalOrderNumber,
            companyId: company.id,
            quotationId: newQuotation.id,
            salespersonId: user.id,
            value: actualClosingAmount || totalAmountBeforeVat || 0,
            status: 'รอยืนยัน',
          }
        });
        await prisma.orderStatusLog.create({
          data: {
            orderId: newOrder.id,
            userId: user.id,
            fromStatus: 'System',
            toStatus: 'รอยืนยัน'
          }
        });
        revalidatePath("/orders");
      }
      
      // Auto-create Job
      const { createJobFromQuotation } = await import('@/app/actions/jobs');
      const companyCode = formData.get("companyCode") as string;
      const jobDocumentsRaw = formData.get("jobDocuments") as string;
      let jobDocuments;
      if (jobDocumentsRaw) {
        try {
          jobDocuments = JSON.parse(jobDocumentsRaw);
        } catch (e) {
          console.error("Error parsing jobDocuments", e);
        }
      }

      await createJobFromQuotation({
        quotationId: newQuotation.id,
        poNumber: poNumber,
        companyCode: companyCode || undefined,
        jobType: jobType || undefined,
        closedDate: finalBillingDate || finalPoDate || new Date(),
        paymentMethod: paymentMethod || undefined,
        installments: installments,
        salesOrderDate: parseDate(salesOrderDateRaw) || undefined,
        deliveryDate: parseDate(deliveryDateRaw) || undefined,
        creditTerms: creditTerms || undefined,
        creditDocsUrl: creditDocsUrl || undefined,
        billingRegulations: billingRegulations || undefined,
        billingDocsUrl: billingDocsUrl || undefined,
        percentageTerms: percentageTerms || undefined,
        paymentDate: parseDate(paymentDateRaw) || undefined,
        workName: workName || undefined,
        jobDocuments: jobDocuments,
      });
    }

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return { success: true, awardedGold, awardMessage };

  } catch (error) {
    console.error("Error saving sales data:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล (Failed to save data): " + ((error as Error)?.message || String(error)) };
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

    if (quotationNumber && quotationNumber.trim() !== '') {
      const existing = await prisma.quotation.findFirst({
        where: { quotationNumber: quotationNumber.trim() }
      });
      if (existing && existing.id !== quotationId) {
        return { success: false, error: `เลขที่ใบเสนอราคา ${quotationNumber} มีอยู่ในระบบแล้ว (Quotation number already exists)` };
      }
    }
    const rejectReason = formData.get("rejectReason") as string;
    const jobType = formData.get("jobType") as string;
    const paymentMethod = formData.get("paymentMethod") as string;
    const installmentsRaw = formData.get("installments") as string;
    let installments = undefined;
    try {
      if (installmentsRaw) installments = JSON.parse(installmentsRaw).map((i: any) => ({ ...i, amount: Number(i.amount) || 0, dueDate: new Date(i.dueDate || new Date()) }));
    } catch(e) {}
    
    const salesBeforeVat = parseFloat(formData.get("salesBeforeVat") as string) || 0;
    const transportationFee = parseFloat(formData.get("transportationFee") as string) || 0;
    const installationFee = parseFloat(formData.get("installationFee") as string) || 0;
    const totalAmountBeforeVat = salesBeforeVat + transportationFee + installationFee;

    const actualClosingAmount = parseFloat(formData.get("actualClosingAmount") as string) || null;
    const poDateRaw = formData.get("poDate") as string;
    const poNumber = formData.get("poNumber") as string;
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

    const salesOrderDateRaw = formData.get("salesOrderDate") as string;
    const deliveryDateRaw = formData.get("deliveryDate") as string;
    const creditTerms = formData.get("creditTerms") as string;
    const creditDocsUrl = formData.get("creditDocsUrl") as string;
    const billingRegulations = formData.get("billingRegulations") as string;
    const billingDocsUrl = formData.get("billingDocsUrl") as string;
    const percentageTerms = formData.get("percentageTerms") as string;
    const paymentDateRaw = formData.get("paymentDate") as string;
    const workName = formData.get("workName") as string;

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

    let finalBillingDate = parseDate(billingDateRaw);
    if (status === 'เปิดบิลแล้ว' && !finalBillingDate) {
      return { success: false, error: "กรุณาระบุวันเปิดบิลขาย (Please enter Billing Date)" };
    }
    let finalPoDate = parseDate(poDateRaw);
    if (status?.startsWith('PO') && !finalPoDate) {
      return { success: false, error: "กรุณาระบุวันเปิด P/O (Please enter PO Date)" };
    }

    const updatedQuotation = await prisma.quotation.update({
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
        poDate: finalPoDate,
        poNumber: poNumber || null,
        billingDate: finalBillingDate,
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

    // Auto-create an Order if status is closed (เปิดบิลแล้ว / PO...)
    let awardedGold = 0;
    let awardMessage = '';
    if (status === 'เปิดบิลแล้ว' || status?.startsWith('PO')) {
      const existingOrder = await prisma.order.findFirst({
        where: { quotationId: updatedQuotation.id }
      });
      const isCabinetJob = ['งานตู้', 'งานตู้ + ติดตั้ง', 'Cabinet Work', 'Cabinet Work + Installation'].includes(jobType || '');
      if (!existingOrder && company.id && isCabinetJob) {
        const finalOrderNumber = await generateOrderNumber();
        const newOrder = await prisma.order.create({
          data: {
            orderNumber: finalOrderNumber,
            companyId: company.id,
            quotationId: updatedQuotation.id,
            salespersonId: user.id,
            value: actualClosingAmount || totalAmountBeforeVat || 0,
            status: 'รอยืนยัน',
          }
        });
        await prisma.orderStatusLog.create({
          data: {
            orderId: newOrder.id,
            userId: user.id,
            fromStatus: 'System',
            toStatus: 'รอยืนยัน'
          }
        });
        revalidatePath("/orders");
      }
      
      // Auto-create Job
      const { createJobFromQuotation } = await import('@/app/actions/jobs');
      const companyCode = formData.get("companyCode") as string;
      const jobDocumentsRaw = formData.get("jobDocuments") as string;
      let jobDocuments;
      if (jobDocumentsRaw) {
        try {
          jobDocuments = JSON.parse(jobDocumentsRaw);
        } catch (e) {
          console.error("Error parsing jobDocuments", e);
        }
      }

      await createJobFromQuotation({
        quotationId: updatedQuotation.id,
        poNumber: poNumber,
        companyCode: companyCode || undefined,
        jobType: jobType || undefined,
        closedDate: finalBillingDate || finalPoDate || new Date(),
        paymentMethod: paymentMethod || undefined,
        installments: installments,
        salesOrderDate: parseDate(salesOrderDateRaw) || undefined,
        deliveryDate: parseDate(deliveryDateRaw) || undefined,
        creditTerms: creditTerms || undefined,
        creditDocsUrl: creditDocsUrl || undefined,
        billingRegulations: billingRegulations || undefined,
        billingDocsUrl: billingDocsUrl || undefined,
        percentageTerms: percentageTerms || undefined,
        paymentDate: parseDate(paymentDateRaw) || undefined,
        workName: workName || undefined,
        jobDocuments: jobDocuments,
      });
    }

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return { success: true, id: updatedQuotation.id, awardedGold, awardMessage };

  } catch (error) {
    console.error("Error updating sales data:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล (Failed to update data): " + ((error as Error)?.message || String(error)) };
  }
}

export async function deleteQuotation(id: string) {
  const user = await getUser();
  if (!user) return { success: false, error: "Unauthorized" };
  
  try {
    // First, find and delete all related jobs (this will cascade to installation orders, repair orders, etc.)
    const jobs = await prisma.job.findMany({ where: { quotationId: id } });
    const jobIds = jobs.map(j => j.id);
    
    if (jobIds.length > 0) {
      await prisma.job.deleteMany({
        where: { id: { in: jobIds } }
      });
    }

    // Delete any orders linked to this quotation
    await prisma.order.deleteMany({
      where: { quotationId: id }
    });

    // Finally, delete the quotation itself
    await prisma.quotation.delete({
      where: { id }
    });
    
    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/pipeline");
    return { success: true };
  } catch (error) {
    console.error("Error deleting quotation:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการลบข้อมูล (Failed to delete data)" };
  }
}
