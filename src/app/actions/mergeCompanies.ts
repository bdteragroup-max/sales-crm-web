'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'

export async function mergeCompanies(sourceCompanyId: string, targetCompanyId: string) {
  try {
    if (!sourceCompanyId || !targetCompanyId) {
      return { success: false, message: 'กรุณาระบุบริษัทให้ครบถ้วน' }
    }

    if (sourceCompanyId === targetCompanyId) {
      return { success: false, message: 'ไม่สามารถผสานบริษัทเดียวกันได้' }
    }

    // Check if both companies exist
    const sourceCompany = await prisma.company.findUnique({ where: { id: sourceCompanyId } });
    const targetCompany = await prisma.company.findUnique({ where: { id: targetCompanyId } });

    if (!sourceCompany || !targetCompany) {
      return { success: false, message: 'ไม่พบข้อมูลบริษัทที่ระบุ' }
    }

    // Perform transaction to update relations and delete source
    await prisma.$transaction(async (tx) => {
      // 1. Process Contacts
      const sourceContacts = await tx.contact.findMany({
        where: { companyId: sourceCompanyId }
      });
      const targetContacts = await tx.contact.findMany({
        where: { companyId: targetCompanyId }
      });

      for (const sContact of sourceContacts) {
        const duplicate = targetContacts.find(t => 
          (sContact.mobilePhone && t.mobilePhone === sContact.mobilePhone) ||
          (sContact.contactName && t.contactName && sContact.contactName.trim().toLowerCase() === t.contactName.trim().toLowerCase())
        );

        if (duplicate) {
          // Re-point Quotations that reference this duplicate contact
          await tx.quotation.updateMany({
            where: { contactId: sContact.id },
            data: { contactId: duplicate.id }
          });
          // Delete the duplicate source contact so it doesn't block company deletion
          await tx.contact.delete({
            where: { id: sContact.id }
          });
        } else {
          // Move unique contact to target company
          await tx.contact.update({
            where: { id: sContact.id },
            data: { companyId: targetCompanyId }
          });
          targetContacts.push({ ...sContact, companyId: targetCompanyId });
        }
      }

      // 2. Update Quotations
      await tx.quotation.updateMany({
        where: { companyId: sourceCompanyId },
        data: { companyId: targetCompanyId }
      });

      // 3. Update Orders
      await tx.order.updateMany({
        where: { companyId: sourceCompanyId },
        data: { companyId: targetCompanyId }
      });

      // 4. Update Schedules
      await tx.schedule.updateMany({
        where: { companyId: sourceCompanyId },
        data: { companyId: targetCompanyId }
      });

      // 5. Update Telesales
      await tx.telesale.updateMany({
        where: { companyId: sourceCompanyId },
        data: { companyId: targetCompanyId }
      });

      // 6. Delete Source Company
      await tx.company.delete({
        where: { id: sourceCompanyId }
      });
    });

    revalidatePath('/clients');
    return { success: true, message: 'ผสานบริษัทสำเร็จ' };
  } catch (error: any) {
    console.error('Merge companies error:', error);
    return { success: false, message: 'เกิดข้อผิดพลาดในการผสานบริษัท' };
  }
}
