'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'
import { notifyUser } from '@/app/lib/pushNotification'
import { canViewAllMarketingLeads } from '@/app/lib/roleHelper'
import {
  findDuplicateLeadOrContactByPhone,
  formatDuplicateLeadErrorMessage,
  normalizeLeadPhoneNumber,
} from '@/app/lib/marketingLeadDedup'
import ExcelJS from 'exceljs'

export async function createMarketingLead(data: {
  customerName: string
  phoneNumber?: string
  province?: string | null
  productOfInterest?: string
  productType?: string
  occupation?: string | null
  conversationContent?: string
  createdByUserId: string
  leadSource?: string | null
  campaignSource?: string | null
  adCampaignId?: string | null
}) {
  try {
    const trimmedName = (data.customerName || '').trim()
    if (!trimmedName) {
      return { success: false, error: 'กรุณาระบุชื่อลูกค้าหรือบริษัท' }
    }

    const rawPhone = data.phoneNumber?.trim() || null
    const normalizedPhone = normalizeLeadPhoneNumber(rawPhone)
    const savedPhone = normalizedPhone || rawPhone

    const lead = await prisma.$transaction(async (tx) => {
      if (normalizedPhone) {
        // Serialize concurrent submissions for the same phone number at the DB level
        await tx.$executeRawUnsafe(
          `SELECT pg_advisory_xact_lock(hashtext($1))`,
          `marketing_lead_phone:${normalizedPhone}`
        )

        const dupMatch = await findDuplicateLeadOrContactByPhone(normalizedPhone, { db: tx })
        if (dupMatch) {
          throw new Error(formatDuplicateLeadErrorMessage(dupMatch, savedPhone))
        }
      } else {
        await tx.$executeRawUnsafe(
          `SELECT pg_advisory_xact_lock(hashtext($1))`,
          `marketing_lead_name:${trimmedName.toLowerCase()}`
        )
        const existingSameName = await (tx as any).marketingLead.findFirst({
          where: {
            customerName: { equals: trimmedName, mode: 'insensitive' },
          },
          select: { id: true, customerName: true },
        })
        if (existingSameName) {
          throw new Error(
            `ห้ามลงซ้ำ: ชื่อลูกค้า "${existingSameName.customerName}" มีอยู่ในระบบ Marketing Leads แล้ว`
          )
        }
      }

      return (tx as any).marketingLead.create({
        data: {
          customerName: trimmedName,
          phoneNumber: savedPhone,
          province: data.province?.trim() || null,
          productOfInterest: data.productOfInterest,
          productType: data.productType,
          occupation: data.occupation || null,
          businessType: data.occupation || null,
          conversationContent: data.conversationContent,
          createdByUserId: data.createdByUserId,
          leadSource: data.leadSource || null,
          campaignSource: data.campaignSource || null,
          adCampaignId: data.adCampaignId || null,
        }
      })
    })

    revalidatePath('/marketing')
    revalidatePath('/sales/leads')
    return { success: true, data: lead }
  } catch (error: any) {
    console.error("Error creating marketing lead:", error)
    return { success: false, error: error.message || 'Failed to create lead' }
  }
}

async function attachMatchedCompanyContextToLeads(
  leads: any[],
  options: { includeTelesale?: boolean; includeCustomerStatus?: boolean } = {}
) {
  if (!Array.isArray(leads) || leads.length === 0) return;

  const companyNames = leads.map((l: any) => l.customerName).filter(Boolean);
  const matchedCompanyIds = leads.map((l: any) => l.matchedCompanyId).filter(Boolean);
  const companyNamedLeads = leads.map((l: any) => l.companyName).filter(Boolean);
  const allCompanyNames = Array.from(new Set([...companyNames, ...companyNamedLeads]));

  if (matchedCompanyIds.length === 0 && allCompanyNames.length === 0) {
    if (options.includeTelesale) {
      leads.forEach((lead: any) => {
        lead.latestTelesale = null;
      });
    }
    return;
  }

  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { id: { in: matchedCompanyIds } },
        { companyName: { in: allCompanyNames } }
      ]
    },
    select: {
      id: true,
      companyName: true,
      province: true,
      district: true,
      ...(options.includeCustomerStatus ? { customerStatus: true } : {}),
      ...(options.includeTelesale
        ? {
            telesales: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                callOutcome: true,
                result: true,
                conversationSummary: true,
                callDate: true,
                createdAt: true,
                user: { select: { fullName: true } }
              }
            }
          }
        : {}),
    }
  });

  const companyById = new Map<string, any>();
  const companyByName = new Map<string, any>();
  for (const c of companies) {
    if (c.id) companyById.set(c.id, c);
    if (c.companyName) companyByName.set(c.companyName.toLowerCase().trim(), c);
  }

  leads.forEach((lead: any) => {
    let comp = lead.matchedCompanyId ? companyById.get(lead.matchedCompanyId) : null;
    if (!comp && lead.customerName) {
      comp = companyByName.get(lead.customerName.toLowerCase().trim());
    }
    if (!comp && lead.companyName) {
      comp = companyByName.get(lead.companyName.toLowerCase().trim());
    }

    if (!lead.province && comp?.province) {
      lead.province = comp.province;
    }
    if (!lead.district && comp?.district) {
      lead.district = comp.district;
    }
    if (!lead.companyName && comp?.companyName) {
      lead.companyName = comp.companyName;
    }

    if (options.includeTelesale) {
      const latestT = comp?.telesales?.[0] || null;
      lead.latestTelesale = latestT
        ? {
            id: latestT.id,
            callOutcome: latestT.callOutcome || latestT.result || null,
            result: latestT.result || null,
            conversationSummary: latestT.conversationSummary || null,
            callDate: latestT.callDate || null,
            createdAt: latestT.createdAt,
            salesPerson: latestT.user?.fullName || null
          }
        : null;
    }
  });
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
        },
        adCampaign: {
          select: {
            id: true,
            name: true,
            internalCode: true,
            campaignId: true,
            targetAudience: true,
            channel: {
              select: {
                id: true,
                name: true,
              }
            }
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

      await attachMatchedCompanyContextToLeads(leads, { includeTelesale: true });
    }

    return { success: true, data: leads }
  } catch (error: any) {
    console.error("Error fetching marketing leads:", error)
    return { success: false, error: error.message || 'Failed to fetch leads' }
  }
}

export async function getAssignedLeads(userId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const canViewAllLeads = canViewAllMarketingLeads(user?.role);

    const whereClause: any = canViewAllLeads
      ? {}
      : {
          OR: [
            { assignedToId: userId },
            { assignedToId: null }
          ]
        };

    const leads = await (prisma as any).marketingLead.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            fullName: true,
          }
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
          }
        },
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
        adCampaign: {
          select: {
            id: true,
            name: true,
            internalCode: true,
            campaignId: true,
            targetAudience: true,
            channel: {
              select: {
                id: true,
                name: true,
              }
            }
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

      await attachMatchedCompanyContextToLeads(leads, { includeTelesale: true });
    }

    return { success: true, data: leads, canViewAllLeads }
  } catch (error: any) {
    console.error("Error fetching assigned leads:", error)
    return { success: false, data: [], canViewAllLeads: false, error: error.message || 'Failed to fetch assigned leads' }
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
        },
        adCampaign: {
          select: {
            id: true,
            name: true,
            internalCode: true,
            campaignId: true,
            targetAudience: true,
            channel: {
              select: {
                id: true,
                name: true,
              }
            }
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
      
      let company = null;
      if (lead.matchedCompanyId) {
        company = await prisma.company.findUnique({ where: { id: lead.matchedCompanyId } });
      }
      if (!company && lead.customerName) {
        company = await prisma.company.findFirst({
          where: { companyName: lead.customerName }
        });
      }
      if (!company && lead.companyName) {
        company = await prisma.company.findFirst({
          where: { companyName: lead.companyName }
        });
      }
      if (company) {
        if (!lead.province && company.province) lead.province = company.province;
        if (!lead.district && company.district) lead.district = company.district;
        if (!lead.companyName && company.companyName) lead.companyName = company.companyName;
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
  province?: string | null
  productOfInterest?: string
  productType?: string
  occupation?: string | null
  conversationContent?: string
  assignedToId?: string | null
  leadSource?: string | null
  campaignSource?: string | null
  adCampaignId?: string | null
}) {
  try {
    const existing = await (prisma as any).marketingLead.findUnique({
      where: { id },
      select: {
        assignedToId: true,
        isForwarded: true,
        forwardedAt: true,
        customerName: true,
        province: true,
        productType: true,
        productOfInterest: true,
      },
    })

    const updatePayload: any = { ...data }
    if (data.phoneNumber !== undefined) {
      const trimmedPhone = data.phoneNumber?.trim() || null
      const normalizedPhone = normalizeLeadPhoneNumber(trimmedPhone)
      if (normalizedPhone) {
        const dupMatch = await findDuplicateLeadOrContactByPhone(normalizedPhone, {
          excludeLeadId: id,
        })
        if (dupMatch) {
          return {
            success: false,
            error: formatDuplicateLeadErrorMessage(dupMatch, trimmedPhone),
          }
        }
        updatePayload.phoneNumber = normalizedPhone
      } else {
        updatePayload.phoneNumber = trimmedPhone
      }
    }
    if (data.province !== undefined) {
      updatePayload.province = data.province?.trim() || null
    }
    if (data.occupation !== undefined) {
      updatePayload.occupation = data.occupation
      updatePayload.businessType = data.occupation
    }

    let reassignedToUserId: string | null = null
    if (data.assignedToId !== undefined) {
      const normalizedAssignedId = data.assignedToId?.trim() || null
      updatePayload.assignedToId = normalizedAssignedId
      if (normalizedAssignedId) {
        updatePayload.isForwarded = true
        updatePayload.forwardedAt = existing?.forwardedAt || new Date()
        if (normalizedAssignedId !== existing?.assignedToId) {
          reassignedToUserId = normalizedAssignedId
        }
      } else {
        updatePayload.isForwarded = false
        updatePayload.forwardedAt = null
      }
    }

    const lead = await (prisma as any).marketingLead.update({
      where: { id },
      data: updatePayload
    })

    if (reassignedToUserId) {
      await notifyUser(reassignedToUserId, {
        title: "มี Lead ใหม่จาก Marketing",
        body: `ลูกค้า ${lead.customerName}${lead.province ? ` (จ.${lead.province})` : ''} สนใจ ${lead.productType || lead.productOfInterest || 'สินค้า'}`,
        category: "MARKETING_LEAD",
        url: "/sales/leads"
      });
    }

    revalidatePath('/marketing')
    revalidatePath(`/marketing/${id}`)
    revalidatePath('/sales/leads')
    return { success: true, data: lead }
  } catch (error: any) {
    console.error("Error updating marketing lead:", error)
    return { success: false, error: error.message || 'Failed to update lead' }
  }
}

export async function deleteMarketingLead(id: string) {
  try {
    await (prisma as any).marketingLead.delete({
      where: { id }
    })
    revalidatePath('/marketing')
    revalidatePath('/sales/leads')
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting marketing lead:", error)
    return { success: false, error: error.message || 'Failed to delete lead' }
  }
}

export async function checkDuplicatePhone(phoneNumber: string, excludeLeadId?: string) {
  try {
    const match = await findDuplicateLeadOrContactByPhone(phoneNumber, { excludeLeadId })
    if (match) {
      return {
        success: true,
        isDuplicate: true,
        sourceType: match.sourceType,
        contact: {
          id: match.id,
          name: match.name,
          companyName: match.companyName || (match.sourceType === 'LEAD' ? 'Lead ในระบบ Marketing' : 'ลูกค้าเดิมในระบบ'),
          phoneNumber: match.phoneNumber,
          salesRepName: match.salesRepName,
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

      // 2. Create an In-App Notification & Push Notification
      await notifyUser(salesRepId, {
        title: "มี Lead ใหม่จาก Marketing",
        body: `ลูกค้า ${lead.customerName}${lead.province ? ` (จ.${lead.province})` : ''} สนใจ ${lead.productType || lead.productOfInterest || 'สินค้า'}`,
        category: "MARKETING_LEAD",
        url: "/sales/leads"
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
        province: true,
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
        company: { select: { companyName: true, province: true } }
      }
    });

    const results: Array<{ name: string, phone: string, type: string, province?: string | null }> = []
    
    companies.forEach(c => {
      results.push({
        name: c.companyName,
        phone: c.contacts[0]?.mobilePhone || '',
        type: 'บริษัท',
        province: c.province || null,
      })
    })

    contacts.forEach(c => {
      results.push({
        name: c.company ? `${c.company.companyName} (${c.contactName})` : c.contactName,
        phone: c.mobilePhone || '',
        type: 'ผู้ติดต่อ',
        province: c.company?.province || null,
      })
    })

    return { success: true, data: results.slice(0, 8) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function claimLead(leadId: string, userId: string) {
  try {
    const currentLead = await (prisma as any).marketingLead.findUnique({ where: { id: leadId } });
    if (currentLead?.assignedToId) {
      return { success: false, error: 'Lead นี้มีผู้รับผิดชอบแล้ว' };
    }

    const updatedLead = await (prisma as any).marketingLead.update({
      where: { id: leadId },
      data: {
        assignedToId: userId,
        isForwarded: true,
        forwardedAt: new Date(),
      }
    });
    revalidatePath('/sales/leads');
    revalidatePath('/marketing');
    return { success: true, data: updatedLead };
  } catch (error: any) {
    console.error("Error claiming lead:", error);
    return { success: false, error: error.message || 'Failed to claim lead' };
  }
}

export async function exportMarketingLeadsToExcel(leadIds?: string[]): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const whereClause: any = {}
    if (leadIds && leadIds.length > 0) {
      whereClause.id = { in: leadIds }
    }

    const leads = await (prisma as any).marketingLead.findMany({
      where: whereClause,
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
        },
        adCampaign: {
          select: {
            id: true,
            name: true,
            internalCode: true,
            channel: {
              select: {
                name: true,
              }
            }
          }
        }
      }
    })

    // Reuse shared helper for company province/district/telesales enrichment
    await attachMatchedCompanyContextToLeads(leads, {
      includeTelesale: true,
      includeCustomerStatus: true,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tera CRM';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Marketing Leads');
    sheet.columns = [
      { header: 'ลำดับ', key: 'no', width: 8 },
      { header: 'วันที่บันทึก', key: 'createdAt', width: 18 },
      { header: 'ชื่อลูกค้า / ผู้ติดต่อ', key: 'customerName', width: 28 },
      { header: 'เบอร์โทรศัพท์', key: 'phone', width: 18 },
      { header: 'ชื่อบริษัท / องค์กร', key: 'companyName', width: 30 },
      { header: 'จังหวัด', key: 'province', width: 16 },
      { header: 'อำเภอ / เขต', key: 'district', width: 16 },
      { header: 'แหล่งที่มาของ Lead', key: 'leadSource', width: 20 },
      { header: 'ช่องทางโฆษณา', key: 'channel', width: 18 },
      { header: 'แคมเปญโฆษณา', key: 'campaign', width: 25 },
      { header: 'สินค้าที่สนใจ', key: 'product', width: 26 },
      { header: 'กลุ่มสินค้า / ประเภท', key: 'productType', width: 20 },
      { header: 'อาชีพ', key: 'occupation', width: 20 },
      { header: 'รายละเอียดความต้องการ', key: 'conversation', width: 35 },
      { header: 'สถานะการส่งต่อ', key: 'forwardStatus', width: 20 },
      { header: 'วันที่ส่งต่อ', key: 'forwardedAt', width: 18 },
      { header: 'เซลส์ผู้รับผิดชอบ', key: 'assignedSales', width: 24 },
      { header: 'สถานะใบเสนอราคา', key: 'quotationStatus', width: 20 },
      { header: 'เซลส์ผู้เสนอราคา', key: 'quotationSales', width: 24 },
      { header: 'ผลการโทรล่าสุด (Telesale)', key: 'callOutcome', width: 24 },
      { header: 'สรุปการคุยกับลูกค้า', key: 'callSummary', width: 35 },
      { header: 'ผู้บันทึก Lead', key: 'createdBy', width: 22 },
    ];

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Slate-800
    };
    headerRow.height = 28;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    leads.forEach((l: any, idx: number) => {
      const latestT = l.latestTelesale || null;

      const dateStr = l.createdAt ? new Date(l.createdAt).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-';

      const forwardStr = l.isForwarded ? 'ส่งต่อฝ่ายขายแล้ว' : 'ยังไม่ส่งต่อ (New Lead)';
      const forwardDateStr = l.forwardedAt ? new Date(l.forwardedAt).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-';

      sheet.addRow({
        no: idx + 1,
        createdAt: dateStr,
        customerName: l.customerName || '-',
        phone: l.phoneNumber || '-',
        companyName: l.companyName || '-',
        province: l.province || '-',
        district: l.district || '-',
        leadSource: l.leadSource || '-',
        channel: l.adCampaign?.channel?.name || '-',
        campaign: l.adCampaign?.name || l.campaignSource || '-',
        product: l.productOfInterest || '-',
        productType: l.productType || '-',
        occupation: l.occupation || l.businessType || '-',
        conversation: l.conversationContent || '-',
        forwardStatus: forwardStr,
        forwardedAt: forwardDateStr,
        assignedSales: l.assignedTo?.fullName || '-',
        quotationStatus: l.quotation?.status || '-',
        quotationSales: l.quotation?.salesperson?.fullName || '-',
        callOutcome: latestT?.callOutcome || latestT?.result || '-',
        callSummary: latestT?.conversationSummary || '-',
        createdBy: l.createdBy?.fullName || '-',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      success: true,
      data: Buffer.from(buffer).toString('base64')
    };
  } catch (error: any) {
    console.error('Export leads error:', error);
    return { success: false, error: error.message || 'Failed to export leads' };
  }
}

