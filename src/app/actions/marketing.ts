'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'

export async function createMarketingLead(data: {
  customerName: string
  phoneNumber?: string
  productOfInterest?: string
  productType?: string
  conversationContent?: string
  createdByUserId: string
}) {
  try {
    const lead = await (prisma as any).marketingLead.create({
      data: {
        customerName: data.customerName,
        phoneNumber: data.phoneNumber,
        productOfInterest: data.productOfInterest,
        productType: data.productType,
        conversationContent: data.conversationContent,
        createdByUserId: data.createdByUserId,
      }
    })
    revalidatePath('/marketing')
    return { success: true, data: lead }
  } catch (error: any) {
    console.error("Error creating marketing lead:", error)
    return { success: false, error: error.message || 'Failed to create lead' }
  }
}

export async function getMarketingLeads() {
  try {
    const leads = await (prisma as any).marketingLead.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        quotation: {
          select: {
            status: true,
            salesperson: {
              select: {
                fullName: true,
              }
            }
          }
        },
        createdBy: {
          select: {
            fullName: true,
          }
        },
        assignedTo: {
          select: {
            fullName: true,
          }
        }
      }
    })
    
    // TEMPORARY FIX: Bypass Prisma cache for isContacted
    if (leads.length > 0) {
      const ids = leads.map((l: any) => `'${l.id}'`).join(',');
      const rawStatuses = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id", "isContacted" FROM "MarketingLead" WHERE "id" IN (${ids})`
      );
      const statusMap = new Map(rawStatuses.map(r => [r.id, r.isContacted]));
      leads.forEach((l: any) => l.isContacted = statusMap.get(l.id) || false);
    }

    return { success: true, data: leads }
  } catch (error: any) {
    console.error("Error fetching marketing leads:", error)
    return { success: false, error: error.message || 'Failed to fetch leads' }
  }
}

export async function getAssignedLeads(userId: string) {
  try {
    const leads = await (prisma as any).marketingLead.findMany({
      where: { assignedToId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            fullName: true,
          }
        }
      }
    })
    
    if (leads.length > 0) {
      const ids = leads.map((l: any) => `'${l.id}'`).join(',');
      const rawStatuses = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id", "isContacted" FROM "MarketingLead" WHERE "id" IN (${ids})`
      );
      const statusMap = new Map(rawStatuses.map(r => [r.id, r.isContacted]));
      leads.forEach((l: any) => l.isContacted = statusMap.get(l.id) || false);
    }

    return { success: true, data: leads }
  } catch (error: any) {
    console.error("Error fetching assigned leads:", error)
    return { success: false, error: error.message || 'Failed to fetch assigned leads' }
  }
}

export async function getMarketingLeadById(id: string) {
  try {
    const lead = await (prisma as any).marketingLead.findUnique({
      where: { id },
      include: {
        quotation: {
          select: {
            status: true,
            salesperson: {
              select: {
                id: true,
                fullName: true,
              }
            }
          }
        },
        createdBy: {
          select: {
            fullName: true,
          }
        },
        assignedTo: {
          select: {
            fullName: true,
          }
        }
      }
    })
    
    if (lead) {
      const rawStatuses = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "isContacted" FROM "MarketingLead" WHERE "id" = '${id}'`
      );
      if (rawStatuses.length > 0) {
        lead.isContacted = rawStatuses[0].isContacted;
      }
      
      const company = await prisma.company.findFirst({
        where: { companyName: lead.customerName }
      });
      if (company) {
        const telesales = await prisma.telesale.findMany({
          where: { companyId: company.id },
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { fullName: true } } }
        });
        lead.telesales = telesales;
      } else {
        lead.telesales = [];
      }
    }

    return { success: true, data: lead }
  } catch (error: any) {
    console.error("Error fetching marketing lead:", error)
    return { success: false, error: error.message || 'Failed to fetch lead' }
  }
}

export async function updateMarketingLead(id: string, data: {
  customerName?: string
  phoneNumber?: string
  productOfInterest?: string
  productType?: string
  conversationContent?: string
}) {
  try {
    const lead = await (prisma as any).marketingLead.update({
      where: { id },
      data
    })
    revalidatePath('/marketing')
    revalidatePath(`/marketing/${id}`)
    return { success: true, data: lead }
  } catch (error: any) {
    console.error("Error updating marketing lead:", error)
    return { success: false, error: error.message || 'Failed to update lead' }
  }
}

export async function checkDuplicatePhone(phoneNumber: string) {
  try {
    const contact = await prisma.contact.findFirst({
      where: { mobilePhone: phoneNumber }
    })
    if (contact) {
      const company = await prisma.company.findUnique({
        where: { id: contact.companyId }
      })
      return { 
        success: true, 
        isDuplicate: true, 
        contact: {
          id: contact.id,
          name: contact.contactName,
          companyName: company?.companyName || 'Unknown Company'
        }
      }
    }
    return { success: true, isDuplicate: false }
  } catch (error: any) {
    console.error("Error checking duplicate phone:", error)
    return { success: false, error: error.message || 'Failed to check phone' }
  }
}

export async function forwardLeadToSales(leadId: string, salesRepId: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const lead = await (tx as any).marketingLead.findUnique({ where: { id: leadId } });
      if (!lead) throw new Error("ไม่พบข้อมูล Lead");
      if (lead.isForwarded) throw new Error("Lead นี้ถูกส่งต่อให้ฝ่ายขายไปแล้ว");

      // 1. Assign the Marketing Lead to the salesperson
      const updatedLead = await (tx as any).marketingLead.update({
        where: { id: leadId },
        data: {
          isForwarded: true,
          forwardedAt: new Date(),
          assignedToId: salesRepId
        }
      });

      // 2. Create an In-App Notification
      await tx.notification.create({
        data: {
          userId: salesRepId,
          title: "มี Lead ใหม่จาก Marketing",
          message: `ลูกค้า ${lead.customerName} สนใจ ${lead.productType || lead.productOfInterest || 'สินค้า'}`,
          type: "MARKETING_LEAD",
          linkUrl: "/sales/leads"
        }
      });

      return { lead: updatedLead };
    });

    // 3. Attempt LINE Notification (Outside transaction to not block if LINE fails)
    try {
      const { pushLineMessage, getLineUserIdByCrmUserId, customMarketingLeadMessage } = await import('@/app/lib/lineNotify');
      const salesLineId = await getLineUserIdByCrmUserId(salesRepId);
      
      if (salesLineId) {
        const salesUser = await prisma.user.findUnique({ where: { id: salesRepId }, select: { fullName: true }});
        const msg = customMarketingLeadMessage(result.lead, salesUser?.fullName || 'ฝ่ายขาย');
        await pushLineMessage(salesLineId, [msg]);
      }
    } catch (lineErr) {
      console.error("Failed to send LINE notification for new lead:", lineErr);
    }

    revalidatePath('/marketing');
    revalidatePath(`/marketing/${leadId}`);
    revalidatePath('/sales/leads');
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error forwarding lead:", error)
    return { success: false, error: error.message || 'Failed to forward lead' }
  }
}

export async function searchCompaniesForLead(query: string) {
  if (!query || query.length < 2) return { success: true, data: [] }
  try {
    const companies = await prisma.company.findMany({
      where: {
        companyName: { contains: query, mode: 'insensitive' }
      },
      take: 5,
      select: {
        companyName: true,
        contacts: {
          take: 1,
          select: { mobilePhone: true }
        }
      }
    });
    
    const contacts = await prisma.contact.findMany({
      where: {
        contactName: { contains: query, mode: 'insensitive' }
      },
      take: 5,
      select: {
        contactName: true,
        mobilePhone: true,
        company: { select: { companyName: true } }
      }
    });

    const results: Array<{ name: string, phone: string, type: string }> = []
    
    companies.forEach(c => {
      results.push({
        name: c.companyName,
        phone: c.contacts[0]?.mobilePhone || '',
        type: 'บริษัท'
      })
    })

    contacts.forEach(c => {
      results.push({
        name: c.company ? `${c.company.companyName} (${c.contactName})` : c.contactName,
        phone: c.mobilePhone || '',
        type: 'ผู้ติดต่อ'
      })
    })

    return { success: true, data: results.slice(0, 8) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
