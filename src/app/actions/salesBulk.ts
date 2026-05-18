"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

export async function saveBulkSalesData(records: any[]) {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Retrieve user's EmployeeSale profile to fetch default branch and team leader
  const employeeSale = await prisma.employeeSale.findUnique({
    where: { userId: user.id }
  });

  // Retrieve user's most recent quotation to use as a fallback for branch and team leader history
  const lastQuotation = await prisma.quotation.findFirst({
    where: { salespersonId: user.id, NOT: { salesBranch: null } },
    orderBy: { createdAt: 'desc' }
  });

  const defaultBranch = employeeSale?.branch || lastQuotation?.salesBranch || null;
  const defaultTeamLeader = employeeSale?.teamLeader || lastQuotation?.salesTeamLeader || null;

  let successCount = 0;
  let errorCount = 0;
  let errors = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    try {
      const getRowVal = (keys: string[]) => {
        for (const k of keys) {
          const cleanK = k.replace(/[\r\n\s]+/g, '').toLowerCase();
          for (const rowKey of Object.keys(row)) {
            const cleanRowKey = rowKey.replace(/[\r\n\s]+/g, '').toLowerCase();
            if (cleanRowKey === cleanK) {
              return row[rowKey];
            }
          }
        }
        return undefined;
      };

      const companyName = getRowVal(["ชื่อบริษัท"])?.toString().trim();
      if (!companyName) {
        throw new Error("ไม่พบชื่อบริษัท (Missing Company Name)");
      }

      // Map row fields
      const requirementNumber = getRowVal(["เลขที่ Requirement", "เลขที่ใบความต้องการลูกค้า"])?.toString();
      const requirementDateRaw = getRowVal(["วันที่ Requirement", "วันที่เอกสารใบความต้องการ"])?.toString();
      const quotationNumber = getRowVal(["เลขที่ใบเสนอราคา", "No.Quotation"])?.toString();
      const quotationDateRaw = getRowVal(["วันที่ใบเสนอราคา", "วันออกใบเสนอราคา"])?.toString();
      const status = getRowVal(["สถานะ", "สถานะใบเสนอราคา"])?.toString() || "Pending";
      const rejectReason = getRowVal(["เหตุผลที่ปฏิเสธ"])?.toString();
      
      const salesBeforeVat = parseFloat(getRowVal(["ยอดขายก่อน VAT", "ยอดขายก่อนภาษีมูลค่าเพิ่ม"])?.toString()) || 0;
      const transportationFee = parseFloat(getRowVal(["ค่าขนส่ง"])?.toString()) || 0;
      const installationFee = parseFloat(getRowVal(["ค่าติดตั้ง", "ค่าติดตั้ง/ค่าบริการ", "ค่าติดตั้งบริการ"])?.toString()) || 0;
      const totalAmountBeforeVat = salesBeforeVat + transportationFee + installationFee;

      const actualClosingAmount = parseFloat(getRowVal(["ยอดปิดการขายจริง", "ยอดปิดจริง(บาท)", "ยอดปิดจริง"])?.toString()) || null;
      const poDateRaw = getRowVal(["วันที่ PO", "วันที่เปิด PO จากลูกค้า", "วันที่เปิดPOจากลูกค้า"])?.toString();
      const billingDateRaw = getRowVal(["วันที่วางบิล", "วันที่เปิดบิล"])?.toString();
      const invoiceNumber = getRowVal(["เลขที่ใบแจ้งหนี้", "เลขที่บิลขาย"])?.toString();
      const winLossReason = getRowVal(["เหตุผลที่ชนะ/แพ้", "เหตุผลที่ลูกค้าซื้อ/ไม่ซื้อสินค้ากับบริษัทฯ", "เหตุผลที่ลูกค้าซื้อไม่ซื้อสินค้ากับบริษัทฯ"])?.toString();

      const taxId = getRowVal(["เลขประจำตัวผู้เสียภาษี"])?.toString();
      const branchOrHeadOffice = getRowVal(["สาขา/สำนักงานใหญ่", "สาขาสำนักงานใหญ่"])?.toString();
      const postalCode = getRowVal(["รหัสไปรษณีย์"])?.toString();
      const province = getRowVal(["จังหวัด", "Area"])?.toString();
      const district = getRowVal(["อำเภอ/เขต", "อำเภอเขต"])?.toString();
      const subDistrict = getRowVal(["ตำบล/แขวง", "ตำบลแขวง"])?.toString();
      const address = getRowVal(["ที่อยู่"])?.toString();
      
      const contactName = getRowVal(["ชื่อผู้ติดต่อ", "ชื่อลูกค้า"])?.toString();
      const position = getRowVal(["ตำแหน่ง"])?.toString();
      const mobilePhone = getRowVal(["เบอร์โทรศัพท์มือถือ", "มือถือ"])?.toString();
      
      const businessType = getRowVal(["ประเภทธุรกิจ"])?.toString();
      const customerAccessChannel = getRowVal(["ช่องทางการเข้าถึงลูกค้า", "ช่องทางที่ลูกค้าเข้ามา"])?.toString();
      const customerType = getRowVal(["ประเภทลูกค้า"])?.toString();
      const customerStatus = getRowVal(["สถานะลูกค้า"])?.toString();
      const productInterest = getRowVal(["สินค้าที่สนใจ", "หัวข้อ/รายการที่ลูกค้าสนใจ/รายการที่เสนอขาย"])?.toString();
      const productType = getRowVal(["ประเภทสินค้า"])?.toString();

      const followUp1Raw = getRowVal(["ติดตามครั้งที่ 1", "ติดตาม 1"])?.toString();
      const followUp2Raw = getRowVal(["ติดตามครั้งที่ 2", "ติดตาม 2"])?.toString();
      const followUp3Raw = getRowVal(["ติดตามครั้งที่ 3", "ติดตาม 3"])?.toString();
      const followUp4Raw = getRowVal(["ติดตามครั้งที่ 4", "ติดตาม 4"])?.toString();

      const remarks = getRowVal(["หมายเหตุ"])?.toString();
      const salesBranch = getRowVal(["สาขาการขาย"])?.toString()?.trim() || defaultBranch;
      const salesTeamLeader = getRowVal(["หัวหน้าทีมขาย", "หัวหน้าทีม"])?.toString()?.trim() || defaultTeamLeader;
      const createdAtRaw = getRowVal(["วันที่สร้าง", "วันที่อัพเดท"])?.toString();

      const parseDate = (d?: any) => {
        if (!d) return null;
        if (d instanceof Date) {
          return isNaN(d.getTime()) ? null : d;
        }
        const str = d.toString().trim();
        if (!str) return null;

        // If it's a purely numeric string, treat it strictly as Excel serial number
        if (/^\d+(\.\d+)?$/.test(str)) {
          const serial = parseFloat(str);
          if (serial > 30000 && serial < 60000) {
            const excelEpoch = new Date(1899, 11, 30);
            const parsed = new Date(excelEpoch.getTime() + serial * 86400000);
            return isNaN(parsed.getTime()) ? null : parsed;
          }
          return null;
        }

        // If it's a serialized Date string (e.g. 2026-05-15T00:00:00.000Z)
        const isoParsed = new Date(str);
        if (!isNaN(isoParsed.getTime()) && str.includes('-') && str.indexOf('-') === 4) {
          let year = isoParsed.getFullYear();
          if (year > 2400) {
            isoParsed.setFullYear(year - 543);
          }
          return isoParsed;
        }

        // Try YYYY-MM-DD
        const yyyymmdd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (yyyymmdd) {
          let year = parseInt(yyyymmdd[1]);
          const month = parseInt(yyyymmdd[2]) - 1;
          const day = parseInt(yyyymmdd[3]);
          if (year > 2400) year -= 543;
          const parsed = new Date(year, month, day);
          return isNaN(parsed.getTime()) ? null : parsed;
        }

        // Try DD/MM/YYYY
        const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (ddmmyyyy) {
          const day = parseInt(ddmmyyyy[1]);
          const month = parseInt(ddmmyyyy[2]) - 1;
          let year = parseInt(ddmmyyyy[3]);
          if (year > 2400) year -= 543;
          const parsed = new Date(year, month, day);
          return isNaN(parsed.getTime()) ? null : parsed;
        }

        // Native parsing fallback
        const nativeParsed = new Date(str);
        if (!isNaN(nativeParsed.getTime())) {
          let year = nativeParsed.getFullYear();
          if (year > 2400) {
            nativeParsed.setFullYear(year - 543);
          }
          return nativeParsed;
        }
        return null;
      };

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

      const createdAtParsed = parseDate(createdAtRaw) || parseDate(quotationDateRaw) || parseDate(requirementDateRaw);

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
          ...(createdAtParsed ? { createdAt: createdAtParsed } : {})
        }
      });

      successCount++;
    } catch (error: any) {
      errorCount++;
      errors.push(`Row ${i + 2}: ${error.message || 'Failed to insert'}`);
    }
  }

  revalidatePath("/sales");
  revalidatePath("/");
  
  return { 
    success: true, 
    successCount, 
    errorCount, 
    errors 
  };
}
