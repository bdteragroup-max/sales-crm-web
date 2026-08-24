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
    { header: 'Customer Type', key: 'customerType', width: 25 },
    { header: 'Company Name', key: 'company', width: 30 },
    { header: 'Tax ID', key: 'taxId', width: 20 },
    { header: 'Business Type', key: 'businessType', width: 20 },
    { header: 'Province', key: 'province', width: 20 },
    { header: 'District/Amphoe', key: 'district', width: 20 },
    { header: 'Subdistrict/Tambon', key: 'subdistrict', width: 20 },
    { header: 'Registered Address', key: 'address', width: 40 },
    { header: 'Postal Code', key: 'postalCode', width: 15 },
    { header: 'Primary Contact Name', key: 'name', width: 30 },
    { header: 'Phone Number', key: 'phone', width: 20 },
    { header: 'Contact Email', key: 'email', width: 30 },
    { header: 'Campaign', key: 'campaign', width: 30 },
    { header: 'Lead Source', key: 'source', width: 20 },
  ]

  worksheet.addRow({
    customerType: 'Juristic Person',
    company: 'บริษัท ตัวอย่าง จำกัด',
    taxId: '1234567890123',
    businessType: 'Retail',
    province: 'Bangkok',
    district: 'Phaya Thai',
    subdistrict: 'Samsen Nai',
    address: '123 Test St.',
    postalCode: '10400',
    name: 'สมชาย ใจดี',
    phone: '0812345678',
    email: 'somchai@example.com',
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
        const rawCustomerType = row['Customer Type'] || row['ประเภทลูกค้า'] || ''
        const rawCompanyName = row['Company Name'] || row['ชื่อบริษัท'] || ''
        const rawTaxId = row['Tax ID'] || row['เลขประจำตัวผู้เสียภาษี'] || ''
        const rawBusinessType = row['Business Type'] || row['ประเภทธุรกิจ'] || ''
        const rawProvince = row['Province'] || row['จังหวัด'] || ''
        const rawDistrict = row['District/Amphoe'] || row['เขต/อำเภอ'] || row['District'] || ''
        const rawSubDistrict = row['Subdistrict/Tambon'] || row['แขวง/ตำบล'] || row['Subdistrict'] || ''
        const rawAddress = row['Registered Address'] || row['ที่อยู่จดทะเบียน'] || row['Address'] || ''
        const rawPostalCode = row['Postal Code'] || row['รหัสไปรษณีย์'] || ''
        const rawCustomerName = row['Primary Contact Name'] || row['Name - Surname'] || row['Name'] || row['ชื่อผู้ติดต่อ'] || ''
        const rawPhone = row['Phone Number'] || row['Phone'] || row['เบอร์โทรศัพท์'] || ''
        const rawEmail = row['Contact Email'] || row['Email'] || row['อีเมล'] || ''
        const rawCampaign = row['Campaign'] || row['แคมเปญ'] || ''
        const rawLeadSource = row['Lead Source'] || row['แหล่งที่มา'] || ''

        const normPhone = normalizePhone(rawPhone)
        const normTaxId = normalizeTaxId(rawTaxId)

        let status = 'New'
        let errorReason = ''
        let matchedContactId: string | null = null
        let matchedCompanyId: string | null = null
        let matchedName = ''

        const isJuristic = rawCustomerType.toLowerCase().includes('juristic') || rawCustomerType.includes('นิติบุคคล')

        if (isJuristic) {
          if (!rawCompanyName || !rawTaxId || !rawCustomerType) {
            status = 'Error'
            errorReason = 'Missing required Juristic fields (Company Name, Tax ID, or Customer Type)'
          }
        }

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
          customerType: rawCustomerType,
          companyName: rawCompanyName,
          taxId: rawTaxId,
          businessType: rawBusinessType,
          province: rawProvince,
          district: rawDistrict,
          subDistrict: rawSubDistrict,
          address: rawAddress,
          postalCode: rawPostalCode,
          customerName: rawCustomerName,
          phoneNumber: rawPhone,
          email: rawEmail,
          campaignSource: rawCampaign,
          leadSource: rawLeadSource,
          status,
          errorReason,
          action: status === 'Error' ? 'Skip' : (status === 'New' ? 'Create' : 'Update Interest'),
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
          customerType: row.customerType,
          companyName: row.companyName,
          taxId: row.taxId,
          businessType: row.businessType,
          province: row.province,
          district: row.district,
          subDistrict: row.subDistrict,
          address: row.address,
          postalCode: row.postalCode,
          customerName: row.customerName || 'Unknown',
          phoneNumber: row.phoneNumber,
          email: row.email,
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
