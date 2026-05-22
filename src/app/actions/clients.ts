'use server'

import prisma from '@/app/lib/db'
import { teraDb } from '@/app/lib/teraDb'
import { revalidatePath } from 'next/cache'

export async function getLocationsByPostalCode(postalCode: string) {
  try {
    const results = await teraDb.$queryRaw<any[]>`
      SELECT DISTINCT "subDistrict", "district", "province"
      FROM "PostalData"
      WHERE "postalCode" = ${postalCode}
      ORDER BY "province" ASC, "district" ASC, "subDistrict" ASC
    `;
    return results;
  } catch (error) {
    console.error('Error fetching locations by postal code:', error);
    return [];
  }
}

export async function createCompany(formData: any) {
  try {
    // 1. Safe Trimming and Guards
    const trimmedCompanyName = formData.companyName ? String(formData.companyName).trim() : '';
    const trimmedTaxId = formData.taxId ? String(formData.taxId).trim() : null;

    if (!trimmedCompanyName) {
      return { success: false, message: 'กรุณากรอกชื่อบริษัท/ลูกค้า' };
    }

    if (trimmedTaxId) {
      const existing = await prisma.company.findFirst({
        where: { taxId: trimmedTaxId }
      })
      if (existing) {
        return { 
          success: false, 
          message: `พบเลขประจำตัวผู้เสียภาษีนี้ซ้ำในระบบแล้ว! ถูกใช้โดยบริษัท/ลูกค้า: ${existing.companyName}` 
        }
      }
    }

    let bType = formData.businessType;
    if (bType === 'ADD_NEW' && formData.newBusinessType) {
      bType = String(formData.newBusinessType).trim();
      // Upsert to ensure we don't duplicate if it was added by another user simultaneously
      await prisma.businessType.upsert({
        where: { name: bType },
        update: {},
        create: { name: bType }
      });
    }

    // Prepare E-tax receiver flag
    const isETax = formData.isETaxReceiver === 'on' || formData.isETaxReceiver === 'true' || formData.isETaxReceiver === true;

    // 2. Perform Transaction to create Company and optional Contact
    const result = await prisma.$transaction(async (tx) => {
      const company = tx.company.create({
        data: {
          companyName: trimmedCompanyName,
          taxId: trimmedTaxId || null,
          businessType: bType || null,
          customerStatus: formData.customerStatus || 'ลูกค้าใหม่',
          customerType: formData.customerType || 'นิติบุคคล',
          branchOrHeadOffice: formData.branchOrHeadOffice || 'สำนักงานใหญ่',
          province: formData.province || null,
          district: formData.district || null,
          subDistrict: formData.subDistrict || null,
          address: formData.address ? String(formData.address).trim() : null,
          postalCode: formData.postalCode ? String(formData.postalCode).trim() : null,
          assignedUserId: formData.assignedUserId || null,
          billingAddress: formData.billingAddress ? String(formData.billingAddress).trim() : null,
          billingSubDistrict: formData.billingSubDistrict ? String(formData.billingSubDistrict).trim() : null,
          billingDistrict: formData.billingDistrict ? String(formData.billingDistrict).trim() : null,
          billingProvince: formData.billingProvince ? String(formData.billingProvince).trim() : null,
          billingPostalCode: formData.billingPostalCode ? String(formData.billingPostalCode).trim() : null,
          shippingAddress: formData.shippingAddress ? String(formData.shippingAddress).trim() : null,
          shippingSubDistrict: formData.shippingSubDistrict ? String(formData.shippingSubDistrict).trim() : null,
          shippingDistrict: formData.shippingDistrict ? String(formData.shippingDistrict).trim() : null,
          shippingProvince: formData.shippingProvince ? String(formData.shippingProvince).trim() : null,
          shippingPostalCode: formData.shippingPostalCode ? String(formData.shippingPostalCode).trim() : null,
          paymentMethod: formData.paymentMethod || null,
        }
      })

      const finalCompany = await company;

      // If contact name is provided, create the contact atomically
      if (formData.contactName?.trim()) {
        const contactNameTrimmed = String(formData.contactName).trim();
        const contactPhoneTrimmed = formData.contactPhone ? String(formData.contactPhone).trim() : null;
        const contactPositionTrimmed = formData.contactPosition ? String(formData.contactPosition).trim() : null;
        const contactEmailTrimmed = formData.contactEmail ? String(formData.contactEmail).trim() : null;

        if (contactPhoneTrimmed) {
          const existingPhone = await tx.contact.findFirst({
            where: { mobilePhone: contactPhoneTrimmed }
          });
          if (existingPhone) {
            throw new Error(`เบอร์โทรศัพท์ผู้ติดต่อหลักนี้ถูกใช้งานโดย ${existingPhone.contactName} แล้ว`);
          }
        }
        await tx.contact.create({
          data: {
            companyId: finalCompany.id,
            contactName: contactNameTrimmed,
            position: contactPositionTrimmed,
            mobilePhone: contactPhoneTrimmed,
            email: contactEmailTrimmed,
            isETaxReceiver: isETax,
          }
        })
      }

      return finalCompany;
    })

    revalidatePath('/clients')
    return { success: true, data: result }
  } catch (error: any) {
    console.error('Create company error:', error)
    return { success: false, message: 'ไม่สามารถสร้างข้อมูลบริษัทได้' }
  }
}

export async function createContact(formData: any) {
  try {
    const contactNameTrimmed = formData.contactName ? String(formData.contactName).trim() : '';
    const mobilePhoneTrimmed = formData.mobilePhone ? String(formData.mobilePhone).trim() : null;
    const positionTrimmed = formData.position ? String(formData.position).trim() : null;
    const emailTrimmed = formData.email ? String(formData.email).trim() : null;

    if (!contactNameTrimmed) {
      return { success: false, message: 'กรุณากรอกชื่อผู้ติดต่อ' };
    }

    if (mobilePhoneTrimmed) {
      const existing = await prisma.contact.findFirst({
        where: { mobilePhone: mobilePhoneTrimmed }
      });
      if (existing) {
        return {
          success: false,
          message: `เบอร์โทรศัพท์นี้ถูกใช้งานโดย ${existing.contactName} แล้ว`
        };
      }
    }
    const isETax = formData.isETaxReceiver === 'on' || formData.isETaxReceiver === 'true' || formData.isETaxReceiver === true;
    const contact = await prisma.contact.create({
      data: {
        companyId: formData.companyId,
        contactName: contactNameTrimmed,
        position: positionTrimmed,
        mobilePhone: mobilePhoneTrimmed,
        email: emailTrimmed,
        isETaxReceiver: isETax,
      }
    })
    revalidatePath('/clients')
    return { success: true, data: contact }
  } catch (error: any) {
    console.error('Create contact error:', error)
    return { success: false, message: 'ไม่สามารถสร้างข้อมูลผู้ติดต่อได้' }
  }
}

export async function getDistricts(province: string) {
  const results = await teraDb.$queryRaw<any[]>`
    SELECT DISTINCT "district"
    FROM "PostalData"
    WHERE "province" = ${province}
    ORDER BY "district" ASC
  `;
  return results;
}

export async function getSubDistricts(province: string, district: string) {
  const results = await teraDb.$queryRaw<any[]>`
    SELECT DISTINCT "subDistrict", "postalCode"
    FROM "PostalData"
    WHERE "province" = ${province} AND "district" = ${district}
    ORDER BY "subDistrict" ASC
  `;
  return results;
}

export async function searchPostalData(query: string) {
  return await prisma.postalData.findMany({
    where: {
      OR: [
        { postalCode: { startsWith: query } },
        { subDistrict: { contains: query } },
        { district: { contains: query } },
        { province: { contains: query } },
      ]
    },
    take: 10
  });
}

export async function updateCompany(companyId: string, formData: any) {
  try {
    const trimmedCompanyName = formData.companyName ? String(formData.companyName).trim() : '';
    const trimmedTaxId = formData.taxId ? String(formData.taxId).trim() : null;

    if (!trimmedCompanyName) {
      return { success: false, message: 'กรุณากรอกชื่อบริษัท/ลูกค้า' };
    }

    if (trimmedTaxId) {
      const existing = await prisma.company.findFirst({
        where: { 
          taxId: trimmedTaxId,
          id: { not: companyId }
        }
      })
      if (existing) {
        return { 
          success: false, 
          message: `พบเลขประจำตัวผู้เสียภาษีนี้ซ้ำในระบบแล้ว! ถูกใช้โดยบริษัท/ลูกค้า: ${existing.companyName}` 
        }
      }
    }

    let bType = formData.businessType;
    if (bType === 'ADD_NEW' && formData.newBusinessType) {
      bType = String(formData.newBusinessType).trim();
      await prisma.businessType.upsert({
        where: { name: bType },
        update: {},
        create: { name: bType }
      });
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        companyName: trimmedCompanyName,
        taxId: trimmedTaxId || null,
        businessType: bType || null,
        customerStatus: formData.customerStatus || 'ลูกค้าใหม่',
        customerType: formData.customerType || 'นิติบุคคล',
        branchOrHeadOffice: formData.branchOrHeadOffice || 'สำนักงานใหญ่',
        province: formData.province || null,
        district: formData.district || null,
        subDistrict: formData.subDistrict || null,
        address: formData.address ? String(formData.address).trim() : null,
        postalCode: formData.postalCode ? String(formData.postalCode).trim() : null,
        assignedUserId: formData.assignedUserId || null,
        billingAddress: formData.billingAddress ? String(formData.billingAddress).trim() : null,
        billingSubDistrict: formData.billingSubDistrict ? String(formData.billingSubDistrict).trim() : null,
        billingDistrict: formData.billingDistrict ? String(formData.billingDistrict).trim() : null,
        billingProvince: formData.billingProvince ? String(formData.billingProvince).trim() : null,
        billingPostalCode: formData.billingPostalCode ? String(formData.billingPostalCode).trim() : null,
        shippingAddress: formData.shippingAddress ? String(formData.shippingAddress).trim() : null,
        shippingSubDistrict: formData.shippingSubDistrict ? String(formData.shippingSubDistrict).trim() : null,
        shippingDistrict: formData.shippingDistrict ? String(formData.shippingDistrict).trim() : null,
        shippingProvince: formData.shippingProvince ? String(formData.shippingProvince).trim() : null,
        shippingPostalCode: formData.shippingPostalCode ? String(formData.shippingPostalCode).trim() : null,
        paymentMethod: formData.paymentMethod || null,
      }
    })

    revalidatePath('/clients')
    return { success: true, data: company }
  } catch (error: any) {
    console.error('Update company error:', error)
    return { success: false, message: error.message || 'ไม่สามารถอัปเดตข้อมูลบริษัทได้' }
  }
}

export async function updateContact(contactId: string, formData: any) {
  try {
    const contactNameTrimmed = formData.contactName ? String(formData.contactName).trim() : '';
    const mobilePhoneTrimmed = formData.mobilePhone ? String(formData.mobilePhone).trim() : null;
    const positionTrimmed = formData.position ? String(formData.position).trim() : null;
    const emailTrimmed = formData.email ? String(formData.email).trim() : null;

    if (!contactNameTrimmed) {
      return { success: false, message: 'กรุณากรอกชื่อผู้ติดต่อ' };
    }

    if (mobilePhoneTrimmed) {
      const existing = await prisma.contact.findFirst({
        where: {
          mobilePhone: mobilePhoneTrimmed,
          id: { not: contactId }
        }
      });
      if (existing) {
        return {
          success: false,
          message: `เบอร์โทรศัพท์นี้ถูกใช้งานโดย ${existing.contactName} แล้ว`
        };
      }
    }

    const isETax = formData.isETaxReceiver === 'on' || formData.isETaxReceiver === 'true' || formData.isETaxReceiver === true;
    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        companyId: formData.companyId,
        contactName: contactNameTrimmed,
        position: positionTrimmed,
        mobilePhone: mobilePhoneTrimmed,
        email: emailTrimmed,
        isETaxReceiver: isETax,
      }
    })
    revalidatePath('/clients')
    return { success: true, data: contact }
  } catch (error: any) {
    console.error('Update contact error:', error)
    return { success: false, message: error.message || 'ไม่สามารถอัปเดตข้อมูลผู้ติดต่อได้' }
  }
}

export async function reassignCompanyAdministrator(companyId: string, assignedUserId: string | null) {
  try {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        assignedUserId: assignedUserId || null
      }
    });
    revalidatePath('/clients');
    return { success: true, data: company };
  } catch (error: any) {
    console.error('Reassign administrator error:', error);
    return { success: false, message: 'ไม่สามารถมอบหมายผู้ดูแลบัญชีใหม่ได้' };
  }
}

export async function checkTaxIdExists(taxId: string, excludeCompanyId?: string) {
  try {
    if (!taxId || taxId.trim() === '') {
      return { exists: false };
    }
    const existing = await prisma.company.findFirst({
      where: {
        taxId: taxId.trim(),
        ...(excludeCompanyId ? { id: { not: excludeCompanyId } } : {})
      },
      select: { companyName: true }
    });
    if (existing) {
      return { exists: true, companyName: existing.companyName };
    }
    return { exists: false };
  } catch (error) {
    console.error('Error checking Tax ID:', error);
    return { exists: false };
  }
}
