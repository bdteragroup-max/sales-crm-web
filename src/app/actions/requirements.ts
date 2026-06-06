"use server";

import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';

export async function saveCustomerRequirementHistory(data: any) {
  const user = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    const companyName = data["ชื่อบริษัท"] || 'Unknown';
    const address = data["ที่อยู่บริษัท"] || null;
    const contactName = data["ชื่อผู้ติดต่อ"] || 'Unknown';
    const mobilePhone = data["เบอร์โทร"] || null;

    let companyId: string | undefined;
    let contactId: string | undefined;

    if (companyName && companyName !== 'Unknown') {
      let company = await prisma.company.findFirst({
        where: { companyName }
      });

      if (!company) {
        company = await prisma.company.create({
          data: {
            companyName,
            address,
          }
        });
      } else if (address && !company.address) {
        // update address if it was empty
        company = await prisma.company.update({
          where: { id: company.id },
          data: { address }
        });
      }
      companyId = company.id;

      if (contactName && contactName !== 'Unknown') {
        let contact = await prisma.contact.findFirst({
          where: { companyId: company.id, contactName }
        });
        if (!contact) {
          contact = await prisma.contact.create({
            data: {
              companyId: company.id,
              contactName,
              mobilePhone,
            }
          });
        }
        contactId = contact.id;
      }
    }

    // Generate Requirement Number
    const now = new Date();
    const dd = now.getDate().toString().padStart(2, '0');
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = now.getFullYear().toString();
    const dateStr = `${dd}${mm}${yyyy}`;
    
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));
    
    const count = await prisma.customerRequirement.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        }
      }
    });
    
    const reqNumber = `REQ-${dateStr}-${(count + 1).toString().padStart(2, '0')}`;

    const record = await prisma.customerRequirement.create({
      data: {
        requirementNumber: reqNumber,
        companyName: companyName,
        contactName: contactName,
        salesperson: data["พนักงานขายที่ดูแล"] || user.fullName,
        date: new Date(data["วัน/เดือน/ปี"] || Date.now()),
        formData: data,
        userId: user.id
      }
    });

    // Determine main product type for Pipeline
    let productType = "";
    if (data["สินค้า_INVERTER"]) productType = "INVERTER";
    else if (data["สินค้า_MOTOR"]) productType = "MOTOR";
    else if (data["สินค้า_PUMP"]) productType = "PUMP";
    else if (data["สินค้า_SOLAR_ROOF"]) productType = "SOLAR ROOF";
    else if (data["สินค้า_SOLAR_PUMP"]) productType = "SOLAR PUMP";
    else if (data["สินค้า_MDB"]) productType = "MDB";
    else if (data["สินค้า_DB"]) productType = "DB";
    else if (data["สินค้า_CONTROL"]) productType = "CONTROL";

    // Auto-create Pipeline record
    if (companyId) {
      await prisma.quotation.create({
        data: {
          companyId: companyId,
          contactId: contactId,
          salespersonId: user.id,
          status: "ความสนใจ",
          subject: `Requirement: ${companyName}`,
          productType: productType || null,
          requirementDate: new Date(data["วัน/เดือน/ปี"] || Date.now()),
          requirementNumber: reqNumber,
        }
      });
    }

    revalidatePath('/sales/requirements');
    return { success: true, record };
  } catch (error: any) {
    console.error("Failed to save CustomerRequirement history", error);
    return { success: false, error: error.message };
  }
}

export async function updateCustomerRequirementHistory(id: string, data: any) {
  try {
    const user = await getUser();
    if (!user) throw new Error("Unauthorized");

    let companyName = data["ชื่อบริษัท"] || "ไม่ระบุบริษัท";
    let contactName = data["ชื่อผู้ติดต่อ"] || "";

    const record = await prisma.customerRequirement.update({
      where: { id },
      data: {
        companyName: companyName,
        contactName: contactName,
        salesperson: data["พนักงานขายที่ดูแล"] || user.fullName,
        date: new Date(data["วัน/เดือน/ปี"] || Date.now()),
        formData: data,
      }
    });

    revalidatePath('/sales/requirements');
    return { success: true, record };
  } catch (error: any) {
    console.error("Failed to update CustomerRequirement history", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCustomerRequirementHistory(id: string) {
  try {
    const user = await getUser();
    if (!user) throw new Error("Unauthorized");

    await prisma.customerRequirement.delete({
      where: { id }
    });

    revalidatePath('/sales/requirements');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete CustomerRequirement history", error);
    return { success: false, error: error.message };
  }
}
