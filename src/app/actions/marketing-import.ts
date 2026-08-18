'use server'

import prisma from '@/app/lib/db'
import { cookies } from 'next/headers'
import { decrypt } from '@/app/lib/session'
import ExcelJS from 'exceljs'

// Normalization utilities
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 0) return null
  // Thai numbers: if it starts with 66, replace 66 with 0
  if (cleaned.startsWith('66') && cleaned.length >= 11) {
    return '0' + cleaned.substring(2)
  }
  return cleaned
}

function normalizeTaxId(taxId: string | null | undefined): string | null {
  if (!taxId) return null
  const cleaned = taxId.replace(/\D/g, '')
  if (cleaned.length !== 13) return null // Thai Tax ID must be 13 digits
  return cleaned
}

export async function generateExcelTemplate() {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Marketing Leads')

  worksheet.columns = [
    { header: 'Name - Surname', key: 'name', width: 30 },
    { header: 'Phone Number', key: 'phone', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Company Name', key: 'company', width: 30 },
    { header: 'Tax ID', key: 'taxId', width: 20 },
    { header: 'Campaign', key: 'campaign', width: 30 },
    { header: 'Lead Source', key: 'source', width: 20 },
  ]

  // Add a sample row (optional, can just leave headers)
  worksheet.addRow({
    name: 'สมชาย ใจดี',
    phone: '0812345678',
    email: 'somchai@example.com',
    company: 'บริษัท ตัวอย่าง จำกัด',
    taxId: '1234567890123',
    campaign: 'Seminar Q3',
    source: 'Facebook Ads'
  })

  // Style headers
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer).toString('base64')
}

export async function validateImportLeads(rows: any[]) {
  try {
    const session = (await cookies()).get('session')?.value
    const payload = await decrypt(session)
    if (!payload?.userId) return { success: false, error: 'Unauthorized' }

    const processedRows = await Promise.all(
      rows.map(async (row) => {
        const rawPhone = row['Phone Number'] || row['Phone'] || row['เบอร์โทรศัพท์'] || ''
        const rawTaxId = row['Tax ID'] || row['เลขประจำตัวผู้เสียภาษี'] || ''
        const rawEmail = row['Email'] || row['อีเมล'] || ''
        const rawCustomerName = row['Name - Surname'] || row['Name'] || row['ชื่อ - นามสกุล'] || ''
        const rawCompanyName = row['Company Name'] || row['ชื่อบริษัท'] || ''
        const rawCampaign = row['Campaign'] || row['แคมเปญ'] || ''
        const rawLeadSource = row['Lead Source'] || row['แหล่งที่มา'] || ''

        const normPhone = normalizePhone(rawPhone)
        const normTaxId = normalizeTaxId(rawTaxId)

        let status = 'New'
        let matchedContactId: string | null = null
        let matchedCompanyId: string | null = null
        let matchedName = ''

        // 1. Check Tax ID (Company)
        if (normTaxId) {
          // Look in Company
          const company = await prisma.company.findFirst({
            where: {
              taxId: {
                contains: normTaxId
              }
            }
          })
          if (company) {
            status = 'Duplicate - Update Interest'
            matchedCompanyId = company.id
            matchedName = company.companyName
          } else {
            // Also check MarketingLead for previous leads with same Tax ID
            const existingLead = await prisma.marketingLead.findFirst({
              where: {
                taxId: {
                  contains: normTaxId
                }
              }
            })
            if (existingLead) {
              status = 'Duplicate - Update Interest'
              matchedCompanyId = existingLead.matchedCompanyId || null
              matchedName = existingLead.customerName
            }
          }
        }

        // 2. Check Phone (Contact/MarketingLead) if not already matched
        if (status === 'New' && normPhone) {
          // Look in Contact
          const contact = await prisma.contact.findFirst({
            where: {
              mobilePhone: {
                contains: normPhone
              }
            }
          })
          if (contact) {
            status = 'Duplicate - Update Interest'
            matchedContactId = contact.id
            matchedName = contact.contactName
          } else {
            // Also check MarketingLead
            const existingLead = await prisma.marketingLead.findFirst({
              where: {
                phoneNumber: {
                  contains: normPhone
                }
              }
            })
            if (existingLead) {
              status = 'Duplicate - Update Interest'
              matchedContactId = existingLead.matchedContactId || null
              matchedName = existingLead.customerName
            }
          }
        }

        return {
          customerName: rawCustomerName,
          phoneNumber: rawPhone,
          email: rawEmail,
          companyName: rawCompanyName,
          taxId: rawTaxId,
          campaignSource: rawCampaign,
          leadSource: rawLeadSource,
          status,
          action: status === 'New' ? 'Create' : 'Update Interest', // Default actions
          matchedContactId,
          matchedCompanyId,
          matchedName,
        }
      })
    )

    return { success: true, data: processedRows }
  } catch (error) {
    console.error('Validation error:', error)
    return { success: false, error: 'Validation failed' }
  }
}

// In-memory set to prevent double submission
const submissionSet = new Set<string>()

export async function importMarketingLeads(data: any[], idempotencyKey: string) {
  try {
    const session = (await cookies()).get('session')?.value
    const payload = await decrypt(session)
    if (!payload?.userId) return { success: false, error: 'Unauthorized' }

    if (submissionSet.has(idempotencyKey)) {
      return { success: false, error: 'Duplicate request detected' }
    }
    submissionSet.add(idempotencyKey)

    // Filter rows
    const rowsToImport = data.filter((row: any) => row.action !== 'Skip')

    let importedCount = 0

    // Import one by one to ensure relationships are correct
    for (const row of rowsToImport) {
      await prisma.marketingLead.create({
        data: {
          customerName: row.customerName || 'Unknown',
          phoneNumber: row.phoneNumber,
          email: row.email,
          companyName: row.companyName,
          taxId: row.taxId,
          campaignSource: row.campaignSource,
          leadSource: row.leadSource,
          createdByUserId: payload.userId as string,
          matchedContactId: row.matchedContactId || undefined,
          matchedCompanyId: row.matchedCompanyId || undefined,
        }
      })
      importedCount++
    }

    // Clean up idempotency key after 10 seconds
    setTimeout(() => {
      submissionSet.delete(idempotencyKey)
    }, 10000)

    return { success: true, importedCount }
  } catch (error) {
    console.error('Import error:', error)
    submissionSet.delete(idempotencyKey) // allow retry on error
    return { success: false, error: 'Failed to import leads' }
  }
}
