'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'

export async function createCompany(formData: any) {
  try {
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

    const company = await prisma.company.create({
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
        assignedUserId: formData.assignedUserId || null,
      }
    })
    revalidatePath('/clients')
    return { success: true, data: company }
  } catch (error: any) {
    console.error('Create company error:', error)
    return { success: false, message: 'ไม่สามารถสร้างข้อมูลบริษัทได้' }
  }
}

export async function createContact(formData: any) {
  try {
    const contact = await prisma.contact.create({
      data: {
        companyId: formData.companyId,
        contactName: formData.contactName,
        position: formData.position || null,
        mobilePhone: formData.mobilePhone || null,
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
