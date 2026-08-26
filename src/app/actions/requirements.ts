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
    
    // Fetch all today's requirements to find the true highest counter (safest against string sort issues with >99)
    const todayReqs = await prisma.customerRequirement.findMany({
      where: {
        requirementNumber: {
          startsWith: `REQ-${dateStr}-`
        }
      },
      select: { requirementNumber: true }
    });

    let nextCounter = 1;
    if (todayReqs.length > 0) {
      const counters = todayReqs.map(r => {
        if (!r.requirementNumber) return 0;
        const parts = r.requirementNumber.split('-');
        return parts.length >= 3 ? parseInt(parts[2], 10) : 0;
      }).filter(n => !isNaN(n));
      
      if (counters.length > 0) {
        nextCounter = Math.max(...counters) + 1;
      }
    }

    let record = null;
    let retries = 5;

    while (retries > 0 && !record) {
      const reqNumber = `REQ-${dateStr}-${nextCounter.toString().padStart(2, '0')}`;
      try {
        record = await prisma.customerRequirement.create({
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
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Unique constraint failed, increment and retry
          nextCounter++;
          retries--;
        } else {
          throw error;
        }
      }
    }

    if (!record) {
      throw new Error("Failed to generate a unique requirementNumber after multiple retries");
    }

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
      const quotation = await prisma.quotation.create({
        data: {
          companyId: companyId,
          contactId: contactId,
          salespersonId: user.id,
          status: "ความสนใจ",
          statusChangedAt: new Date(),
          subject: `Requirement: ${companyName}`,
          productType: productType || null,
          requirementDate: new Date(data["วัน/เดือน/ปี"] || Date.now()),
          requirementNumber: record.requirementNumber,
        }
      });

      if (data.marketingLeadId) {
        await (prisma as any).marketingLead.update({
          where: { id: data.marketingLeadId },
          data: {
            assignedTo: { connect: { id: user.id } },
            quotation: { connect: { id: quotation.id } },
          }
        });
        await prisma.$executeRaw`UPDATE "MarketingLead" SET "isContacted" = true WHERE id = ${data.marketingLeadId}`;
        revalidatePath('/marketing');
        revalidatePath('/marketing/[id]', 'page');
        revalidatePath('/sales/leads');
      }
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

    if (data.marketingLeadId) {
      await (prisma as any).marketingLead.update({
        where: { id: data.marketingLeadId },
        data: {
          assignedTo: { connect: { id: user.id } },
        }
      });
      await prisma.$executeRaw`UPDATE "MarketingLead" SET "isContacted" = true WHERE id = ${data.marketingLeadId}`;
      revalidatePath('/marketing');
      revalidatePath('/marketing/[id]', 'page');
      revalidatePath('/sales/leads');
    }

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
