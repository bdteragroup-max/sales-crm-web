'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'

export async function getLocationsByPostalCode(postalCode: string) {
  try {
    return await prisma.postalData.findMany({
      where: { postalCode },
      select: { subDistrict: true, district: true, province: true },
      distinct: ['subDistrict', 'district', 'province'],
      orderBy: [{ province: 'asc' }, { district: 'asc' }, { subDistrict: 'asc' }]
    });
  } catch (error) {
    console.error('Error fetching locations by postal code:', error);
    return [];
  }
}

export async function createCompany(formData: any) {
  try {
    // 1. Tax ID Duplicate Check
    if (formData.taxId) {
      const existing = await prisma.company.findFirst({
        where: { taxId: formData.taxId }
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
      bType = formData.newBusinessType;
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
          companyName: formData.companyName,
          taxId: formData.taxId || null,
          businessType: bType || null,
          customerStatus: formData.customerStatus || 'ลูกค้าใหม่',
          customerType: formData.customerType || 'นิติบุคคล',
          branchOrHeadOffice: formData.branchOrHeadOffice || 'สำนักงานใหญ่',
          province: formData.province || null,
          district: formData.district || null,
          subDistrict: formData.subDistrict || null,
          address: formData.address || null,
          postalCode: formData.postalCode || null,
          assignedUserId: formData.assignedUserId || null,
          billingAddress: formData.billingAddress || null,
          billingSubDistrict: formData.billingSubDistrict || null,
          billingDistrict: formData.billingDistrict || null,
          billingProvince: formData.billingProvince || null,
          billingPostalCode: formData.billingPostalCode || null,
          shippingAddress: formData.shippingAddress || null,
          shippingSubDistrict: formData.shippingSubDistrict || null,
          shippingDistrict: formData.shippingDistrict || null,
          shippingProvince: formData.shippingProvince || null,
          shippingPostalCode: formData.shippingPostalCode || null,
          paymentMethod: formData.paymentMethod || null,
        }
      })

      const finalCompany = await company;

      // If contact name is provided, create the contact atomically
      if (formData.contactName?.trim()) {
        if (formData.contactPhone?.trim()) {
          const existingPhone = await tx.contact.findFirst({
            where: { mobilePhone: formData.contactPhone.trim() }
          });
          if (existingPhone) {
            throw new Error(`เบอร์โทรศัพท์ผู้ติดต่อหลักนี้ถูกใช้งานโดย ${existingPhone.contactName} แล้ว`);
          }
        }
        await tx.contact.create({
          data: {
            companyId: finalCompany.id,
            contactName: formData.contactName.trim(),
            position: formData.contactPosition || null,
            mobilePhone: formData.contactPhone || null,
            email: formData.contactEmail || null,
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
    if (formData.mobilePhone?.trim()) {
      const existing = await prisma.contact.findFirst({
        where: { mobilePhone: formData.mobilePhone.trim() }
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
        contactName: formData.contactName,
        position: formData.position || null,
        mobilePhone: formData.mobilePhone || null,
        email: formData.email || null,
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
  return await prisma.postalData.findMany({
    where: { province },
    select: { district: true },
    distinct: ['district'],
    orderBy: { district: 'asc' }
  });
}

export async function getSubDistricts(province: string, district: string) {
  return await prisma.postalData.findMany({
    where: { province, district },
    select: { subDistrict: true, postalCode: true },
    distinct: ['subDistrict'],
    orderBy: { subDistrict: 'asc' }
  });
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
    if (formData.taxId) {
      const existing = await prisma.company.findFirst({
        where: { 
          taxId: formData.taxId,
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
      bType = formData.newBusinessType;
      await prisma.businessType.upsert({
        where: { name: bType },
        update: {},
        create: { name: bType }
      });
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        companyName: formData.companyName,
        taxId: formData.taxId || null,
        businessType: bType || null,
        customerStatus: formData.customerStatus || 'ลูกค้าใหม่',
        customerType: formData.customerType || 'นิติบุคคล',
        branchOrHeadOffice: formData.branchOrHeadOffice || 'สำนักงานใหญ่',
        province: formData.province || null,
        district: formData.district || null,
        subDistrict: formData.subDistrict || null,
        address: formData.address || null,
        postalCode: formData.postalCode || null,
        assignedUserId: formData.assignedUserId || null,
        billingAddress: formData.billingAddress || null,
        billingSubDistrict: formData.billingSubDistrict || null,
        billingDistrict: formData.billingDistrict || null,
        billingProvince: formData.billingProvince || null,
        billingPostalCode: formData.billingPostalCode || null,
        shippingAddress: formData.shippingAddress || null,
        shippingSubDistrict: formData.shippingSubDistrict || null,
        shippingDistrict: formData.shippingDistrict || null,
        shippingProvince: formData.shippingProvince || null,
        shippingPostalCode: formData.shippingPostalCode || null,
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
    if (formData.mobilePhone?.trim()) {
      const existing = await prisma.contact.findFirst({
        where: {
          mobilePhone: formData.mobilePhone.trim(),
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
        contactName: formData.contactName,
        position: formData.position || null,
        mobilePhone: formData.mobilePhone || null,
        email: formData.email || null,
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
