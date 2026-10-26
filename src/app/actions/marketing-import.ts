'use server'

import prisma from '@/app/lib/db'
import { cookies } from 'next/headers'
import { decrypt } from '@/app/lib/session'
import ExcelJS from 'exceljs'
import { revalidatePath } from 'next/cache'
import { notifyUser } from '@/app/lib/pushNotification'
import {
  PRODUCT_GROUPS,
  PRODUCT_OCCUPATIONS,
  normalizeProductGroup,
  getOccupationsForProductGroup,
} from '@/app/marketing/constants/productOccupations'

// ==========================================
// Types & Interfaces
// ==========================================
export type LeadValidationStatus = 'NEW' | 'DUPLICATE' | 'REVIEW_REQUIRED' | 'INVALID'

export interface ValidatedLeadRow {
  index: number
  // Uploaded Fields
  customerName: string
  phoneNumber: string
  companyName: string
  province: string
  district: string
  subDistrict: string
  address: string
  postalCode: string
  customerType: string
  taxId: string
  email: string
  campaignSource: string
  leadSource: string
  productOfInterest: string
  productType: string
  productGroup: string
  occupation: string
  note: string

  // Normalization
  normalizedPhone: string | null
  normalizedName: string
  normalizedCompany?: string

  // Validation & Duplicate Assessment
  status: LeadValidationStatus
  reason: string
  errorReason?: string

  // Match Information in CRM
  matchedType?: 'CUSTOMER' | 'LEAD' | 'IN_FILE' | null
  matchedId?: string | null
  matchedName?: string | null
  matchedPhone?: string | null
  matchedSalesRep?: string | null
  matchedSalesRepId?: string | null
  matchedCustomerStatus?: string | null
  matchedCompanyName?: string | null

  // User Choice
  action: 'CREATE' | 'SKIP' | 'UPDATE_INTEREST'
}

export interface ImportSummaryStats {
  total: number
  newLeads: number
  duplicates: number
  reviewRequired: number
  invalid: number
}

export interface ActiveSalesRep {
  id: string
  fullName: string
  employeeId?: string | null
  role: string
  nickname?: string | null
}

export interface ImportHistoryItem {
  id: string
  fileName: string
  totalRecords: number
  newLeadsCount: number
  duplicateCount: number
  reviewCount: number
  errorCount: number
  importedCount: number
  assignedUserId?: string | null
  assignedUserName?: string | null
  routingType: string
  createdByUserId: string
  createdByUserName: string
  createdAt: string
  summaryData?: any
}

// ==========================================
// Phone & Text Normalization Utilities
// ==========================================
function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  // Strip all non-digit characters
  let digits = String(phone).replace(/\D/g, '')
  if (!digits) return null

  // Case 1: Starts with '066' and length >= 12 (e.g. 066863318674 -> 0863318674)
  if (digits.startsWith('066') && digits.length >= 12) {
    digits = '0' + digits.substring(3)
  }
  // Case 2: Starts with '66' and length === 11 (e.g. 66812345678 -> 0812345678)
  else if (digits.startsWith('66') && digits.length === 11) {
    digits = '0' + digits.substring(2)
  }
  // Case 3: Accidental double prefix '06' + 9-digit mobile (11 digits starting with 068 or 069, e.g. 06948263919 -> 0948263919)
  else if (digits.length === 11 && (digits.startsWith('068') || digits.startsWith('069'))) {
    digits = '0' + digits.substring(2)
  }

  // Valid Thai phone numbers are 9 digits (landline: 02, 03, etc.) or 10 digits (mobile: 06, 08, 09)
  if (digits.length >= 9 && digits.length <= 15) {
    return digits
  }

  // If outside bounds but has digits, return cleaned
  return digits.length >= 7 ? digits : null
}

function normalizeTextForSearch(text: string | null | undefined): string {
  if (!text) return ''
  return String(text)
    .toLowerCase()
    .replace(/[,\.\-\_\(\)\[\]\{\}\/\\\|\+\*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripCommonThaiPrefixes(name: string): string {
  const norm = normalizeTextForSearch(name)
  // Remove company prefixes
  const companyPrefixes = [
    'บริษัทจำกัด',
    'บริษัท จำกัด',
    'บริษัท',
    'บจก.',
    'บจก',
    'ห้างหุ้นส่วนจำกัด',
    'หจก.',
    'หจก',
    'บมจ.',
    'บมจ',
    'co., ltd.',
    'co.,ltd',
    'ltd.',
    'company limited',
    'จำกัด (มหาชน)',
    'จำกัด'
  ]
  let result = norm
  for (const p of companyPrefixes) {
    if (result.startsWith(p)) {
      result = result.substring(p.length).trim()
    }
    if (result.endsWith(p)) {
      result = result.substring(0, result.length - p.length).trim()
    }
  }

  // Remove person prefixes
  const personPrefixes = ['นาย', 'นางสาว', 'นาง', 'น.ส.', 'คุณ', 'mr.', 'mrs.', 'ms.']
  for (const p of personPrefixes) {
    if (result.startsWith(p)) {
      result = result.substring(p.length).trim()
    }
  }

  return result.replace(/\s+/g, '')
}

// ==========================================
// 1. Template Generation (.xlsx & .csv)
// ==========================================
export async function generateExcelTemplate(): Promise<string> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Lead Import Template')

  worksheet.columns = [
    { header: 'ชื่อลูกค้า / ผู้ติดต่อ *', key: 'customerName', width: 28 },
    { header: 'เบอร์โทรศัพท์ *', key: 'phoneNumber', width: 20 },
    { header: 'ชื่อบริษัท / องค์กร', key: 'companyName', width: 30 },
    { header: 'จังหวัด', key: 'province', width: 18 },
    { header: 'อำเภอ / เขต', key: 'district', width: 18 },
    { header: 'ตำบล / แขวง', key: 'subDistrict', width: 18 },
    { header: 'ที่อยู่', key: 'address', width: 35 },
    { header: 'รหัสไปรษณีย์', key: 'postalCode', width: 15 },
    { header: 'กลุ่มสินค้า (Product Group) *', key: 'productGroup', width: 26 },
    { header: 'อาชีพ (Occupation) *', key: 'occupation', width: 24 },
    { header: 'สินค้าที่สนใจ', key: 'productOfInterest', width: 26 },
    { header: 'ประเภทสินค้า', key: 'productType', width: 20 },
    { header: 'แหล่งที่มาของ Lead', key: 'leadSource', width: 22 },
    { header: 'แคมเปญโฆษณา', key: 'campaignSource', width: 22 },
    { header: 'ประเภทลูกค้า', key: 'customerType', width: 20 },
    { header: 'เลขประจำตัวผู้เสียภาษี', key: 'taxId', width: 22 },
    { header: 'อีเมล', key: 'email', width: 25 },
    { header: 'หมายเหตุเพิ่มเติม', key: 'note', width: 30 },
  ]

  // Add 3 sample rows showcasing the 3 core product groups
  worksheet.addRow({
    customerName: 'สมชาย ใจดี',
    phoneNumber: '0812345678',
    companyName: 'บริษัท ทีโอที เทรดดิ้ง จำกัด',
    province: 'กรุงเทพมหานคร',
    district: 'พญาไท',
    subDistrict: 'สามเสนใน',
    address: '123 ถนนพหลโยธิน',
    postalCode: '10400',
    productGroup: 'Solar Rooftop',
    occupation: 'เจ้าของกิจการ',
    productOfInterest: 'ระบบโซลาร์เซลล์ On-Grid 5kW',
    productType: 'Solar Rooftop',
    leadSource: 'Facebook Ads',
    campaignSource: 'Solar Q3 Campaign',
    customerType: 'นิติบุคคล',
    taxId: '0105551234567',
    email: 'somchai@tot-trading.com',
    note: 'สนใจติดตั้งโรงงาน ต้องการนัดสำรวจหน้างาน'
  })

  worksheet.addRow({
    customerName: 'วิชัย เกษตรก้าวหน้า',
    phoneNumber: '0891234567',
    companyName: '',
    province: 'สุพรรณบุรี',
    district: 'อู่ทอง',
    subDistrict: 'ดอนคา',
    address: '88 หมู่ 3',
    postalCode: '72160',
    productGroup: 'Pump',
    occupation: 'เกษตรกร',
    productOfInterest: 'ปั๊มน้ำบาดาลโซล่าเซลล์ 3HP',
    productType: 'Pump',
    leadSource: 'TikTok Ads',
    campaignSource: 'Solar Pump Farmer',
    customerType: 'บุคคลธรรมดา',
    taxId: '',
    email: 'wichai@gmail.com',
    note: 'สูบน้ำเข้านา 20 ไร่ ต้องการพร้อมแผง'
  })

  worksheet.addRow({
    customerName: 'ธนากร วิศวอุตสาหกรรม',
    phoneNumber: '0929988776',
    companyName: 'บจก. สยามอินดัสทรี 2024',
    province: 'สมุทรปราการ',
    district: 'บางพลี',
    subDistrict: 'บางปลา',
    address: '45/8 นิคมอุตสาหกรรม',
    postalCode: '10540',
    productGroup: 'AC Drive',
    occupation: 'วิศวกร',
    productOfInterest: 'อินเวอร์เตอร์ควบคุมมอเตอร์ AC Drive 15kW',
    productType: 'AC Drive',
    leadSource: 'Google Ads',
    campaignSource: 'Search AC Drive',
    customerType: 'นิติบุคคล',
    taxId: '0105566001122',
    email: 'thanakorn@siamindustry.co.th',
    note: 'ปรับความเร็วมอเตอร์สายพานลำเลียงในโรงงาน'
  })

  // Header styling: Elegant dark navy/red accent
  const headerRow = worksheet.getRow(1)
  headerRow.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate-800
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 28

  // Sample row font
  worksheet.getRow(2).font = { name: 'Sarabun', size: 10 }
  worksheet.getRow(3).font = { name: 'Sarabun', size: 10 }
  worksheet.getRow(4).font = { name: 'Sarabun', size: 10 }

  // Sheet 2: Reference Guide for Product Groups & Occupations
  const refSheet = workbook.addWorksheet('คู่มือกลุ่มสินค้าและอาชีพ (Ref)')
  refSheet.columns = [
    { header: 'กลุ่มสินค้า (Product Group)', key: 'group', width: 28 },
    { header: 'อาชีพที่แนะนำ (Recommended Occupations)', key: 'occupations', width: 75 },
    { header: 'หมายเหตุ', key: 'note', width: 35 },
  ]

  refSheet.addRow({
    group: 'Pump',
    occupations: 'เกษตรกร, ช่างไฟฟ้า, ร้านค้าทั่วไป, ตัวแทนจำหน่าย, ผู้รับเจาะน้ำบาดาล, อื่นๆ',
    note: 'กลุ่มปั๊มน้ำ ปั๊มบาดาล ปั๊มโซล่าเซลล์'
  })
  refSheet.addRow({
    group: 'Solar Rooftop',
    occupations: 'ผู้ใช้งาน(บ้าน), ผู้ใช้งาน (อุตสาหกรรม), วิศวกร, ช่างไฟฟ้า, ผู้รับเหมา, เจ้าของกิจการ, ตัวแทนเจ้าของกิจการ, อื่นๆ',
    note: 'กลุ่มติดตั้งโซล่าเซลล์บ้าน อาคาร โรงงาน'
  })
  refSheet.addRow({
    group: 'AC Drive',
    occupations: 'จป., วิศวกร, ช่างประจำโรงงาน, ช่างไฟฟ้า, ผู้รับเหมา, เจ้าของกิจการ, ตัวแทนเจ้าของกิจการ, อื่นๆ',
    note: 'กลุ่มอินเวอร์เตอร์ VFD ควบคุมมอเตอร์'
  })

  const refHeader = refSheet.getRow(1)
  refHeader.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
  refHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }
  }
  refHeader.alignment = { vertical: 'middle', horizontal: 'center' }
  refHeader.height = 28

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer).toString('base64')
}

export async function generateCsvTemplate(): Promise<string> {
  const headers = [
    'ชื่อลูกค้า / ผู้ติดต่อ *',
    'เบอร์โทรศัพท์ *',
    'ชื่อบริษัท / องค์กร',
    'จังหวัด',
    'อำเภอ / เขต',
    'ตำบล / แขวง',
    'ที่อยู่',
    'รหัสไปรษณีย์',
    'กลุ่มสินค้า (Product Group)',
    'อาชีพ (Occupation)',
    'สินค้าที่สนใจ',
    'ประเภทสินค้า',
    'แหล่งที่มาของ Lead',
    'แคมเปญโฆษณา',
    'ประเภทลูกค้า',
    'เลขประจำตัวผู้เสียภาษี',
    'อีเมล',
    'หมายเหตุเพิ่มเติม'
  ]

  const sample1 = [
    'สมชาย ใจดี',
    '0812345678',
    'บริษัท ทีโอที เทรดดิ้ง จำกัด',
    'กรุงเทพมหานคร',
    'พญาไท',
    'สามเสนใน',
    '123 ถนนพหลโยธิน',
    '10400',
    'Solar Rooftop',
    'เจ้าของกิจการ',
    'ระบบโซลาร์เซลล์ On-Grid 5kW',
    'Solar Rooftop',
    'Facebook Ads',
    'Solar Q3 Campaign',
    'นิติบุคคล',
    '0105551234567',
    'somchai@tot-trading.com',
    'สนใจติดตั้งโรงงาน ต้องการนัดสำรวจหน้างาน'
  ]

  const sample2 = [
    'วิชัย เกษตรก้าวหน้า',
    '0891234567',
    '',
    'สุพรรณบุรี',
    'อู่ทอง',
    'ดอนคา',
    '88 หมู่ 3',
    '72160',
    'Pump',
    'เกษตรกร',
    'ปั๊มน้ำบาดาลโซล่าเซลล์ 3HP',
    'Pump',
    'TikTok Ads',
    'Solar Pump Farmer',
    'บุคคลธรรมดา',
    '',
    'wichai@gmail.com',
    'สูบน้ำเข้านา 20 ไร่ ต้องการพร้อมแผง'
  ]

  const sample3 = [
    'ธนากร วิศวอุตสาหกรรม',
    '0929988776',
    'บจก. สยามอินดัสทรี 2024',
    'สมุทรปราการ',
    'บางพลี',
    'บางปลา',
    '45/8 นิคมอุตสาหกรรม',
    '10540',
    'AC Drive',
    'วิศวกร',
    'อินเวอร์เตอร์ควบคุมมอเตอร์ AC Drive 15kW',
    'AC Drive',
    'Google Ads',
    'Search AC Drive',
    'นิติบุคคล',
    '0105566001122',
    'thanakorn@siamindustry.co.th',
    'ปรับความเร็วมอเตอร์สายพานลำเลียงในโรงงาน'
  ]

  const csvContent = '\uFEFF' + [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    sample1.map(v => `"${v.replace(/"/g, '""')}"`).join(','),
    sample2.map(v => `"${v.replace(/"/g, '""')}"`).join(','),
    sample3.map(v => `"${v.replace(/"/g, '""')}"`).join(',')
  ].join('\r\n')

  return Buffer.from(csvContent, 'utf-8').toString('base64')
}

// ==========================================
// 2. Active Sales Representatives
// ==========================================
export async function getActiveSalesReps(): Promise<ActiveSalesRep[]> {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        role: true,
      },
      orderBy: { fullName: 'asc' }
    })

    // Try fetching nicknames if teraDb exists
    let nicknameMap = new Map<string, string>()
    try {
      const { teraDb } = await import('@/app/lib/teraDb')
      const empIds = users.map(u => u.employeeId).filter(Boolean) as string[]
      if (empIds.length > 0) {
        const hrList = await teraDb.employees.findMany({
          where: { emp_id: { in: empIds } },
          select: { emp_id: true, nickname: true }
        })
        nicknameMap = new Map(hrList.map(h => [h.emp_id, h.nickname || '']))
      }
    } catch {
      // Ignore if teraDb is not reachable
    }

    return users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      employeeId: u.employeeId,
      role: u.role || 'Sales Representative',
      nickname: u.employeeId ? nicknameMap.get(u.employeeId) || null : null
    }))
  } catch (error) {
    console.error('Error fetching sales reps:', error)
    return []
  }
}

// ==========================================
// 3. Duplicate Detection & Validation
// ==========================================
export async function validateImportLeads(rawRows: any[]): Promise<{
  success: boolean
  data?: ValidatedLeadRow[]
  stats?: ImportSummaryStats
  error?: string
}> {
  try {
    const session = (await cookies()).get('session')?.value
    const payload = await decrypt(session)
    if (!payload?.userId) return { success: false, error: 'Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ' }

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return { success: false, error: 'ไม่พบข้อมูลในไฟล์ที่อัปโหลด' }
    }

    // Step A: Robust Header Normalization & Row Extraction
    const cleanVal = (val: string | null | undefined): string => {
      if (!val) return ''
      const v = String(val).trim()
      if (v === '-' || v === '--' || v.toLowerCase() === 'n/a' || v.toLowerCase() === 'null' || v.toLowerCase() === 'none') {
        return ''
      }
      return v
    }

    const extractedRows = rawRows.map((row, idx) => {
      // 1. Build a map of cleaned keys (stripped of *, /, -, _, spaces, BOM, etc.)
      const cleanMap = new Map<string, string>()
      for (const [rawKey, rawVal] of Object.entries(row)) {
        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
          const normKey = String(rawKey)
            .toLowerCase()
            .replace(/[\*\s\/\-\_\.\:\(\)\[\]\{\}\\\#\u00A0\u200B\uFEFF]/g, '')
            .trim()
          cleanMap.set(normKey, String(rawVal).trim())
        }
      }

      // 2. Helper to find value by predicate
      const findVal = (predicate: (cleanKey: string) => boolean): string => {
        for (const [cleanKey, val] of cleanMap.entries()) {
          if (predicate(cleanKey)) return val
        }
        return ''
      }

      // Identify company key first to prevent collision with "name" / "ชื่อ"
      const isCompanyKey = (k: string) =>
        k.includes('บริษัท') || k.includes('องค์กร') || k.includes('company') || k.includes('organization') || k.includes('corp')

      const companyName = cleanVal(findVal(isCompanyKey))

      // Customer / Contact Name (MUST NOT be company key)
      let customerName = cleanVal(
        findVal(k => {
          if (isCompanyKey(k)) return false
          return (
            k.includes('ชื่อลูกค้า') ||
            k.includes('ผู้ติดต่อ') ||
            k.includes('ชื่อจริง') ||
            k.includes('ชื่อนามสกุล') ||
            k.includes('ลูกค้า') ||
            k.includes('customer') ||
            k.includes('contact') ||
            k.includes('client') ||
            k.includes('fullname') ||
            k.includes('leadname') ||
            k === 'ชื่อ' ||
            k === 'name' ||
            k.startsWith('ชื่อ')
          )
        })
      )

      // Fallback: If customerName is missing but companyName exists (e.g. corporate B2B lead), use companyName
      if (!customerName && companyName) {
        customerName = companyName
      }

      // Phone Number (exclude fax)
      const rawPhoneNumber = cleanVal(
        findVal(k => {
          if (k.includes('fax') || k.includes('แฟกซ์')) return false
          return (
            k.includes('เบอร์') ||
            k.includes('โทร') ||
            k.includes('มือถือ') ||
            k.includes('phone') ||
            k.includes('mobile') ||
            k.includes('tel') ||
            k.includes('contactnumber')
          )
        })
      )

      // Province
      const province = cleanVal(findVal(k => k.includes('จังหวัด') || k.includes('province') || k.includes('prov')))

      // District (Amphoe / Khet - exclude Tambon / Subdistrict)
      const district = cleanVal(
        findVal(
          k =>
            (k.includes('อำเภอ') || k.includes('เขต') || k.includes('district') || k.includes('amphoe') || k.includes('amphur')) &&
            !k.includes('ตำบล') &&
            !k.includes('แขวง') &&
            !k.includes('subdistrict')
        )
      )

      // Subdistrict (Tambon / Khwaeng)
      const subDistrict = cleanVal(
        findVal(
          k =>
            k.includes('ตำบล') ||
            k.includes('แขวง') ||
            k.includes('subdistrict') ||
            k.includes('tambon') ||
            k.includes('tambol')
        )
      )

      // Address (exclude email)
      const address = cleanVal(
        findVal(
          k =>
            (k.includes('ที่อยู่') || k.includes('address') || k.includes('addr')) &&
            !k.includes('เมล') &&
            !k.includes('mail') &&
            !k.includes('email')
        )
      )

      // Postal Code
      const postalCode = cleanVal(findVal(k => k.includes('ไปรษณีย์') || k.includes('postal') || k.includes('zip')))

      // Lead Source
      const leadSource = cleanVal(
        findVal(
          k =>
            (k.includes('แหล่งที่มา') || k.includes('ช่องทาง') || k.includes('leadsource') || k === 'source') &&
            !k.includes('แคมเปญ') &&
            !k.includes('campaign')
        )
      )

      // Campaign
      const campaignSource = cleanVal(findVal(k => k.includes('แคมเปญ') || k.includes('campaign') || k.includes('adcampaign')))

      // Product of Interest
      const productOfInterest = cleanVal(
        findVal(
          k =>
            (k.includes('สินค้าที่สนใจ') || k.includes('สินค้า') || k.includes('product') || k.includes('item') || k.includes('interest')) &&
            !k.includes('ประเภท') &&
            !k.includes('กลุ่ม') &&
            !k.includes('type')
        )
      )

      // Product Group (กลุ่มสินค้า)
      const rawProductGroup = cleanVal(
        findVal(
          k =>
            k.includes('กลุ่มสินค้า') ||
            k.includes('productgroup') ||
            k.includes('หมวดสินค้า') ||
            k.includes('กลุ่มผลิตภัณฑ์')
        )
      )

      // Product Type (ประเภทสินค้า)
      const rawProductType = cleanVal(findVal(k => k.includes('ประเภทสินค้า') || k.includes('producttype')))

      // Determine final productGroup and productType
      const resolvedProductGroup = normalizeProductGroup(rawProductGroup || rawProductType)
      const resolvedProductType = rawProductType || resolvedProductGroup

      // Occupation (อาชีพ)
      const occupation = cleanVal(
        findVal(
          k =>
            k.includes('อาชีพ') ||
            k.includes('occupation') ||
            k.includes('สายอาชีพ') ||
            k.includes('กลุ่มอาชีพ') ||
            k.includes('profession') ||
            k.includes('career') ||
            k.includes('job')
        )
      )

      // Customer Type
      const customerType = cleanVal(findVal(k => k.includes('ประเภทลูกค้า') || k.includes('customertype')))

      // Tax ID
      const taxId = cleanVal(findVal(k => k.includes('ภาษี') || k.includes('tax')))

      // Email
      const email = cleanVal(findVal(k => k.includes('เมล') || k.includes('email') || k.includes('mail')))

      // Notes / Remarks
      const note = cleanVal(
        findVal(
          k =>
            k.includes('หมายเหตุ') ||
            k.includes('note') ||
            k.includes('remark') ||
            k.includes('รายละเอียด') ||
            k.includes('detail') ||
            k.includes('comment')
        )
      )

      const normPhone = normalizePhoneNumber(rawPhoneNumber)
      const displayPhone = normPhone || rawPhoneNumber
      const normName = stripCommonThaiPrefixes(customerName)
      const normCompany = stripCommonThaiPrefixes(companyName)

      return {
        index: idx + 1,
        customerName,
        phoneNumber: displayPhone,
        companyName,
        province,
        district,
        subDistrict,
        address,
        postalCode,
        customerType,
        taxId,
        email,
        campaignSource,
        leadSource,
        productOfInterest,
        productType: resolvedProductType,
        productGroup: resolvedProductGroup,
        occupation,
        note,
        normalizedPhone: normPhone,
        normalizedName: normName,
        normalizedCompany: normCompany,
      }
    })

    // Step B: Collect unique phones & search keys for bulk query
    const validPhones: string[] = []
    const phoneSuffixes: string[] = []
    for (const r of extractedRows) {
      if (r.normalizedPhone) {
        validPhones.push(r.normalizedPhone)
        if (r.normalizedPhone.length >= 9) {
          phoneSuffixes.push(r.normalizedPhone.slice(-9))
        }
      }
    }

    const uniquePhones = Array.from(new Set(validPhones))
    const uniqueSuffixes = Array.from(new Set(phoneSuffixes))

    // Step C: Bulk Database Queries (blazing fast, non-blocking)
    type ContactMatch = {
      id: string
      contactName: string
      mobilePhone: string | null
      companyId: string | null
      companyName: string | null
      customerStatus: string | null
      salesRepName: string | null
      salesRepId: string | null
    }

    type LeadMatch = {
      id: string
      customerName: string
      companyName: string | null
      phoneNumber: string | null
      isForwarded: boolean
      isContacted: boolean
      salesRepName: string | null
      salesRepId: string | null
      createdAt: Date
    }

    let contactMatches: ContactMatch[] = []
    let leadMatches: LeadMatch[] = []

    if (uniquePhones.length > 0) {
      // 1. Check Contact table
      contactMatches = await prisma.$queryRawUnsafe<ContactMatch[]>(`
        SELECT 
          c.id, 
          c."contactName", 
          c."mobilePhone", 
          c."companyId",
          comp."companyName", 
          comp."customerStatus", 
          u."fullName" as "salesRepName",
          u.id as "salesRepId"
        FROM "Contact" c
        LEFT JOIN "Company" comp ON c."companyId" = comp.id
        LEFT JOIN "User" u ON comp."assignedUserId" = u.id
        WHERE regexp_replace(c."mobilePhone", '[^0-9]', '', 'g') = ANY($1::text[])
           OR right(regexp_replace(c."mobilePhone", '[^0-9]', '', 'g'), 9) = ANY($2::text[])
      `, uniquePhones, uniqueSuffixes)

      // 2. Check MarketingLead table
      leadMatches = await prisma.$queryRawUnsafe<LeadMatch[]>(`
        SELECT 
          ml.id, 
          ml."customerName", 
          ml."companyName", 
          ml."phoneNumber", 
          ml."isForwarded",
          ml."isContacted",
          ml."createdAt",
          u."fullName" as "salesRepName",
          u.id as "salesRepId"
        FROM "MarketingLead" ml
        LEFT JOIN "User" u ON ml."assignedToId" = u.id
        WHERE regexp_replace(ml."phoneNumber", '[^0-9]', '', 'g') = ANY($1::text[])
           OR right(regexp_replace(ml."phoneNumber", '[^0-9]', '', 'g'), 9) = ANY($2::text[])
      `, uniquePhones, uniqueSuffixes)
    }

    // Index contacts and leads by phone (full normalized and last 9 digits)
    const contactByPhone = new Map<string, ContactMatch>()
    const contactBySuffix = new Map<string, ContactMatch>()
    for (const c of contactMatches) {
      const clean = normalizePhoneNumber(c.mobilePhone)
      if (clean) {
        contactByPhone.set(clean, c)
        if (clean.length >= 9) {
          contactBySuffix.set(clean.slice(-9), c)
        }
      }
    }

    const leadByPhone = new Map<string, LeadMatch>()
    const leadBySuffix = new Map<string, LeadMatch>()
    for (const l of leadMatches) {
      const clean = normalizePhoneNumber(l.phoneNumber)
      if (clean) {
        leadByPhone.set(clean, l)
        if (clean.length >= 9) {
          leadBySuffix.set(clean.slice(-9), l)
        }
      }
    }

    // Step D: Name queries for potential duplicates (Review Required)
    // Find all companies or contacts whose names overlap with non-empty extracted names
    const namesToQuery = Array.from(
      new Set(
        extractedRows
          .map(r => r.customerName.trim())
          .filter(n => n.length >= 3)
      )
    ).slice(0, 500)

    const companyNamesToQuery = Array.from(
      new Set(
        extractedRows
          .map(r => r.companyName.trim())
          .filter(n => n.length >= 3)
      )
    ).slice(0, 500)

    type CompanyNameMatch = {
      id: string
      companyName: string
      customerStatus: string | null
      salesRepName: string | null
      contactPhone: string | null
    }

    let companyNameMatches: CompanyNameMatch[] = []
    const combinedNames = Array.from(new Set([...namesToQuery, ...companyNamesToQuery]))

    if (combinedNames.length > 0) {
      companyNameMatches = await prisma.$queryRawUnsafe<CompanyNameMatch[]>(`
        SELECT 
          comp.id, 
          comp."companyName", 
          comp."customerStatus", 
          u."fullName" as "salesRepName",
          (
            SELECT c."mobilePhone" FROM "Contact" c 
            WHERE c."companyId" = comp.id 
            AND c."mobilePhone" IS NOT NULL 
            LIMIT 1
          ) as "contactPhone"
        FROM "Company" comp
        LEFT JOIN "User" u ON comp."assignedUserId" = u.id
        WHERE comp."companyName" = ANY($1::text[])
           OR comp."companyName" ILIKE ANY($2::text[])
        LIMIT 300
      `, combinedNames, combinedNames.map(n => `%${n}%`))
    }

    const companyByName = new Map<string, CompanyNameMatch>()
    for (const c of companyNameMatches) {
      companyByName.set(stripCommonThaiPrefixes(c.companyName), c)
    }

    // Step E: Intra-file duplicate tracking
    const seenPhonesInFile = new Map<string, number>() // phone -> row index
    const seenNamesInFile = new Map<string, number>() // name -> row index

    // Step F: Classify Each Row
    const classifiedRows: ValidatedLeadRow[] = []

    for (const row of extractedRows) {
      let status: LeadValidationStatus = 'NEW'
      let reason = 'ข้อมูลใหม่ ไม่พบประวัติซ้ำในระบบ สามารถนำเข้าเป็น Lead ใหม่ได้'
      let errorReason: string | undefined = undefined
      let action: 'CREATE' | 'SKIP' | 'UPDATE_INTEREST' = 'CREATE'

      let matchedType: 'CUSTOMER' | 'LEAD' | 'IN_FILE' | null = null
      let matchedId: string | null = null
      let matchedName: string | null = null
      let matchedPhone: string | null = null
      let matchedSalesRep: string | null = null
      let matchedSalesRepId: string | null = null
      let matchedCustomerStatus: string | null = null
      let matchedCompanyName: string | null = null

      // Check 1: Mandatory validation
      if (!row.customerName) {
        status = 'INVALID'
        errorReason = 'กรุณาระบุชื่อลูกค้าหรือผู้ติดต่อ (Customer Name)'
        reason = 'ข้อมูลไม่ครบถ้วน: ขาดชื่อลูกค้า'
        action = 'SKIP'
      } else if (!row.phoneNumber || !row.normalizedPhone) {
        status = 'INVALID'
        errorReason = 'กรุณาระบุเบอร์โทรศัพท์ที่ถูกต้อง (อย่างน้อย 9-10 หลัก)'
        reason = 'ข้อมูลไม่ครบถ้วน: เบอร์โทรศัพท์ไม่ถูกต้องหรือไม่ระบุ'
        action = 'SKIP'
      }

      // If valid phone & name, check duplicates
      if (status !== 'INVALID' && row.normalizedPhone) {
        const phone = row.normalizedPhone
        const suffix = phone.length >= 9 ? phone.slice(-9) : phone

        // Check 2: Existing Customer in Contact table (Duplicate)
        const matchedContact = contactByPhone.get(phone) || contactBySuffix.get(suffix)
        if (matchedContact) {
          status = 'DUPLICATE'
          matchedType = 'CUSTOMER'
          matchedId = matchedContact.id
          matchedName = matchedContact.contactName || matchedContact.companyName || 'ลูกค้าเดิมในระบบ'
          matchedCompanyName = matchedContact.companyName || null
          matchedPhone = matchedContact.mobilePhone
          matchedSalesRep = matchedContact.salesRepName || 'ยังไม่มีผู้ดูแล'
          matchedSalesRepId = matchedContact.salesRepId || null
          matchedCustomerStatus = matchedContact.customerStatus || 'ลูกค้าในระบบ'
          reason = `เบอร์โทรตรงกับลูกค้าเดิมในระบบ: "${matchedName}" (เซลส์ผู้ดูแล: ${matchedSalesRep}, สถานะ: ${matchedCustomerStatus})`
          action = 'SKIP'
        }

        // Check 3: Existing Lead in MarketingLead table (Duplicate)
        if (status !== 'DUPLICATE') {
          const matchedLead = leadByPhone.get(phone) || leadBySuffix.get(suffix)
          if (matchedLead) {
            status = 'DUPLICATE'
            matchedType = 'LEAD'
            matchedId = matchedLead.id
            matchedName = matchedLead.customerName
            matchedCompanyName = matchedLead.companyName || null
            matchedPhone = matchedLead.phoneNumber
            matchedSalesRep = matchedLead.salesRepName || 'ยังไม่มีผู้ดูแล'
            matchedSalesRepId = matchedLead.salesRepId || null
            matchedCustomerStatus = matchedLead.isForwarded ? 'ส่งต่อให้ฝ่ายขายแล้ว' : 'Lead ในระบบ (รอส่งต่อ)'
            reason = `เบอร์โทรตรงกับ Lead เดิมในระบบ: "${matchedName}" (ผู้ดูแล: ${matchedSalesRep}, สถานะ: ${matchedCustomerStatus})`
            action = 'SKIP'
          }
        }

        // Check 4: Potential duplicate by Name (Review Required)
        // If phone was NOT found, but company or contact name matches an existing entity
        if (status === 'NEW') {
          const targetName = row.normalizedCompany || row.normalizedName
          const matchedCompByName = companyByName.get(targetName)
          if (matchedCompByName && targetName.length >= 3) {
            status = 'REVIEW_REQUIRED'
            matchedType = 'CUSTOMER'
            matchedId = matchedCompByName.id
            matchedName = matchedCompByName.companyName
            matchedCompanyName = matchedCompByName.companyName
            matchedPhone = matchedCompByName.contactPhone || 'ไม่ระบุ'
            matchedSalesRep = matchedCompByName.salesRepName || 'ยังไม่มีผู้ดูแล'
            matchedCustomerStatus = matchedCompByName.customerStatus || 'ลูกค้าในระบบ'
            reason = `พบชื่อใกล้เคียงกับ "${matchedName}" ในระบบ แต่เบอร์โทรศัพท์ต่างกัน (${row.phoneNumber} vs ${matchedPhone})`
            action = 'CREATE' // User can review & confirm
          }
        }

        // Check 5: Intra-file duplicate (Phone or Name repeated within uploaded file)
        if (seenPhonesInFile.has(phone)) {
          const prevRow = seenPhonesInFile.get(phone)!
          status = 'REVIEW_REQUIRED'
          matchedType = 'IN_FILE'
          reason = `เบอร์โทรศัพท์ซ้ำกับแถวที่ ${prevRow} ภายในไฟล์เดียวกัน (${row.phoneNumber})`
          action = 'SKIP'
        } else {
          seenPhonesInFile.set(phone, row.index)
        }

        if (row.normalizedName && row.normalizedName.length >= 4) {
          if (seenNamesInFile.has(row.normalizedName) && status === 'NEW') {
            const prevRow = seenNamesInFile.get(row.normalizedName)!
            status = 'REVIEW_REQUIRED'
            matchedType = 'IN_FILE'
            reason = `ชื่อลูกค้าตรงกับแถวที่ ${prevRow} ภายในไฟล์เดียวกัน แต่เบอร์โทรศัพท์อาจต่างกัน`
            action = 'CREATE'
          } else {
            seenNamesInFile.set(row.normalizedName, row.index)
          }
        }
      }

      classifiedRows.push({
        ...row,
        status,
        reason,
        errorReason,
        matchedType,
        matchedId,
        matchedName,
        matchedPhone,
        matchedSalesRep,
        matchedSalesRepId,
        matchedCustomerStatus,
        matchedCompanyName,
        action,
      })
    }

    // Step G: Calculate Summary Statistics
    const stats: ImportSummaryStats = {
      total: classifiedRows.length,
      newLeads: classifiedRows.filter(r => r.status === 'NEW').length,
      duplicates: classifiedRows.filter(r => r.status === 'DUPLICATE').length,
      reviewRequired: classifiedRows.filter(r => r.status === 'REVIEW_REQUIRED').length,
      invalid: classifiedRows.filter(r => r.status === 'INVALID').length,
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(classifiedRows)),
      stats: JSON.parse(JSON.stringify(stats)),
    }
  } catch (error: any) {
    console.error('Validation error in validateImportLeads:', error)
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลลูกค้า',
    }
  }
}

// ==========================================
// 4. Generate Summary Report Excel (.xlsx)
// ==========================================
export async function generateSummaryReportExcel(rows: ValidatedLeadRow[], stats: ImportSummaryStats): Promise<string> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Tera CRM Marketing System'
  workbook.created = new Date()

  // Sheet 1: Summary Dashboard
  const summarySheet = workbook.addWorksheet('สรุปผลการนำเข้า (Summary)')
  summarySheet.columns = [
    { header: 'หัวข้อการวิเคราะห์', key: 'metric', width: 35 },
    { header: 'จำนวน (รายการ)', key: 'count', width: 20 },
    { header: 'สัดส่วน (%)', key: 'percent', width: 18 },
  ]

  summarySheet.addRow({
    metric: 'จำนวนข้อมูลทั้งหมดที่อัปโหลด (Total Uploaded)',
    count: stats.total,
    percent: '100%',
  })
  summarySheet.addRow({
    metric: '1. ลูกค้าใหม่ (New Leads)',
    count: stats.newLeads,
    percent: stats.total > 0 ? `${((stats.newLeads / stats.total) * 100).toFixed(1)}%` : '0%',
  })
  summarySheet.addRow({
    metric: '2. ข้อมูลซ้ำในระบบ (Duplicates in CRM)',
    count: stats.duplicates,
    percent: stats.total > 0 ? `${((stats.duplicates / stats.total) * 100).toFixed(1)}%` : '0%',
  })
  summarySheet.addRow({
    metric: '3. ต้องตรวจสอบเพิ่มเติม (Review Required)',
    count: stats.reviewRequired,
    percent: stats.total > 0 ? `${((stats.reviewRequired / stats.total) * 100).toFixed(1)}%` : '0%',
  })
  summarySheet.addRow({
    metric: '4. ข้อมูลไม่ถูกต้อง/ไม่ครบถ้วน (Invalid)',
    count: stats.invalid,
    percent: stats.total > 0 ? `${((stats.invalid / stats.total) * 100).toFixed(1)}%` : '0%',
  })

  // Style Summary Sheet
  const sumHeader = summarySheet.getRow(1)
  sumHeader.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
  sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
  sumHeader.height = 26

  // Sheet 2: Detailed Breakdown
  const detailSheet = workbook.addWorksheet('รายละเอียดข้อมูล (Detailed Report)')
  detailSheet.columns = [
    { header: 'ลำดับ', key: 'index', width: 8 },
    { header: 'สถานะการตรวจสอบ', key: 'statusText', width: 22 },
    { header: 'เหตุผลการตรวจสอบ / ข้อมูลที่พบ', key: 'reason', width: 45 },
    { header: 'ชื่อลูกค้า / ผู้ติดต่อ', key: 'customerName', width: 25 },
    { header: 'เบอร์โทรศัพท์', key: 'phoneNumber', width: 18 },
    { header: 'บริษัท / องค์กร', key: 'companyName', width: 25 },
    { header: 'จังหวัด', key: 'province', width: 16 },
    { header: 'กลุ่มสินค้า', key: 'productGroup', width: 20 },
    { header: 'อาชีพ', key: 'occupation', width: 20 },
    { header: 'แหล่งที่มา', key: 'leadSource', width: 18 },
    { header: 'สินค้าที่สนใจ', key: 'productOfInterest', width: 25 },
    { header: 'ประเภทข้อมูลที่ซ้ำ', key: 'matchedType', width: 18 },
    { header: 'ชื่อข้อมูลที่ตรงใน CRM', key: 'matchedName', width: 25 },
    { header: 'เบอร์ใน CRM', key: 'matchedPhone', width: 18 },
    { header: 'เซลส์ผู้ดูแลใน CRM', key: 'matchedSalesRep', width: 22 },
    { header: 'สถานะใน CRM', key: 'matchedStatus', width: 20 },
    { header: 'การดำเนินการนำเข้า', key: 'actionText', width: 18 },
  ]

  const detHeader = detailSheet.getRow(1)
  detHeader.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
  detHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
  detHeader.height = 26

  rows.forEach((r) => {
    let statusText = 'New Lead (ลูกค้าใหม่)'
    if (r.status === 'DUPLICATE') statusText = 'Duplicate (ข้อมูลซ้ำ)'
    else if (r.status === 'REVIEW_REQUIRED') statusText = 'Review Required (ต้องตรวจสอบ)'
    else if (r.status === 'INVALID') statusText = 'Invalid (ข้อมูลไม่สมบูรณ์)'

    const row = detailSheet.addRow({
      index: r.index,
      statusText,
      reason: r.reason,
      customerName: r.customerName || '-',
      phoneNumber: r.phoneNumber || '-',
      companyName: r.companyName || '-',
      province: r.province || '-',
      productGroup: r.productGroup || r.productType || '-',
      occupation: r.occupation || '-',
      leadSource: r.leadSource || '-',
      productOfInterest: r.productOfInterest || '-',
      matchedType: r.matchedType === 'CUSTOMER' ? 'ลูกค้าเดิม' : r.matchedType === 'LEAD' ? 'Lead ในระบบ' : r.matchedType === 'IN_FILE' ? 'ซ้ำในไฟล์' : '-',
      matchedName: r.matchedName || '-',
      matchedPhone: r.matchedPhone || '-',
      matchedSalesRep: r.matchedSalesRep || '-',
      matchedStatus: r.matchedCustomerStatus || '-',
      actionText: r.action === 'CREATE' ? 'นำเข้าเป็น Lead ใหม่' : r.action === 'SKIP' ? 'ข้าม (ไม่นำเข้า)' : 'บันทึกความสนใจ',
    })

    // Highlight row by status
    if (r.status === 'NEW') {
      row.getCell('statusText').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } } // Green
    } else if (r.status === 'DUPLICATE') {
      row.getCell('statusText').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } } // Amber
    } else if (r.status === 'REVIEW_REQUIRED') {
      row.getCell('statusText').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } } // Indigo
    } else {
      row.getCell('statusText').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } } // Red
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer).toString('base64')
}

// ==========================================
// 5. Bulk Lead Import Execution
// ==========================================
const importSubmissionSet = new Set<string>()

export async function importMarketingLeads(options: {
  leads: ValidatedLeadRow[]
  routingType: 'specific_sales' | 'round_robin' | 'unassigned'
  assignedToId?: string | null
  salesRepIds?: string[]
  fileName?: string
  idempotencyKey?: string
}): Promise<{
  success: boolean
  importedCount?: number
  skippedCount?: number
  importLogId?: string
  error?: string
}> {
  const { leads, routingType, assignedToId, salesRepIds = [], fileName = 'lead_import.xlsx' } = options
  const key = options.idempotencyKey || `import-${Date.now()}`

  try {
    const session = (await cookies()).get('session')?.value
    const payload = await decrypt(session)
    if (!payload?.userId) return { success: false, error: 'Unauthorized: กรุณาเข้าสู่ระบบ' }

    if (importSubmissionSet.has(key)) {
      return { success: false, error: 'กำลังดำเนินการนำเข้าข้อมูลอยู่ กรุณารอสักครู่' }
    }
    importSubmissionSet.add(key)

    // Filter leads to only those selected for creation
    const rowsToImport = leads.filter(r => r.action === 'CREATE')
    const skippedCount = leads.length - rowsToImport.length

    if (rowsToImport.length === 0) {
      importSubmissionSet.delete(key)
      return { success: false, error: 'ไม่มีรายการที่เลือกนำเข้า (ทุกรายการถูกข้าม)' }
    }

    let importedCount = 0
    const salesRepRotation = salesRepIds.length > 0 ? salesRepIds : (assignedToId ? [assignedToId] : [])
    let roundRobinIndex = 0

    const createdLeadIds: string[] = []
    const notifiedUserIds = new Set<string>()

    for (const row of rowsToImport) {
      let targetUserId: string | null = null
      let isForwarded = false

      if (routingType === 'specific_sales' && assignedToId) {
        targetUserId = assignedToId
        isForwarded = true
      } else if (routingType === 'round_robin' && salesRepRotation.length > 0) {
        targetUserId = salesRepRotation[roundRobinIndex % salesRepRotation.length]
        roundRobinIndex++
        isForwarded = true
      } else if (routingType === 'unassigned') {
        targetUserId = null
        isForwarded = false
      }

      const createdLead = await prisma.marketingLead.create({
        data: {
          customerName: row.customerName || 'ลูกค้าไม่ระบุชื่อ',
          phoneNumber: row.phoneNumber || null,
          companyName: row.companyName || null,
          province: row.province || null,
          district: row.district || null,
          subDistrict: row.subDistrict || null,
          address: row.address || null,
          postalCode: row.postalCode || null,
          customerType: row.customerType || null,
          occupation: row.occupation || null,
          businessType: row.occupation || null,
          taxId: row.taxId || null,
          email: row.email || null,
          campaignSource: row.campaignSource || null,
          leadSource: row.leadSource || null,
          productOfInterest: row.productOfInterest || null,
          productType: row.productGroup || row.productType || null,
          conversationContent: row.note ? `[ข้อมูลนำเข้าจากไฟล์]: ${row.note}` : null,
          createdByUserId: payload.userId as string,
          assignedToId: targetUserId,
          isForwarded: isForwarded,
          forwardedAt: isForwarded ? new Date() : null,
          matchedContactId: row.matchedType === 'CUSTOMER' && row.matchedId ? row.matchedId : null,
        }
      })

      createdLeadIds.push(createdLead.id)
      importedCount++

      if (targetUserId) {
        notifiedUserIds.add(targetUserId)
      }
    }

    // Send push notification to assigned sales reps
    for (const repId of notifiedUserIds) {
      try {
        await notifyUser(repId, {
          title: 'มี Lead ใหม่จากการนำเข้าไฟล์การตลาด',
          body: `ฝ่ายการตลาดได้ส่งต่อ Lead ใหม่ให้คุณติดตามงาน`,
          category: 'MARKETING_LEAD',
          url: '/sales/leads'
        })
      } catch (err) {
        console.warn('Notification to sales rep skipped or failed:', err)
      }
    }

    // Maintain Import History Log in marketing_lead_import_logs table
    let importLogId = `imp_${Date.now()}`
    try {
      const stats = {
        total: leads.length,
        newLeads: leads.filter(r => r.status === 'NEW').length,
        duplicates: leads.filter(r => r.status === 'DUPLICATE').length,
        reviewRequired: leads.filter(r => r.status === 'REVIEW_REQUIRED').length,
        invalid: leads.filter(r => r.status === 'INVALID').length,
      }

      const sampleSummary = leads.slice(0, 100).map(r => ({
        name: r.customerName,
        phone: r.phoneNumber,
        status: r.status,
        action: r.action,
        reason: r.reason
      }))

      const res = await prisma.$queryRawUnsafe<any[]>(`
        INSERT INTO marketing_lead_import_logs (
          file_name,
          total_records,
          new_leads_count,
          duplicate_count,
          review_count,
          error_count,
          imported_count,
          assigned_user_id,
          routing_type,
          created_by_user_id,
          summary_data
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb
        )
        RETURNING id
      `,
        fileName,
        leads.length,
        stats.newLeads,
        stats.duplicates,
        stats.reviewRequired,
        stats.invalid,
        importedCount,
        assignedToId || null,
        routingType,
        payload.userId as string,
        JSON.stringify(sampleSummary)
      )

      if (res && res[0]?.id) {
        importLogId = res[0].id
      }
    } catch (logErr) {
      console.warn('Failed to insert import history log:', logErr)
    }

    // Clean up idempotency key
    setTimeout(() => {
      importSubmissionSet.delete(key)
    }, 10000)

    revalidatePath('/marketing')
    revalidatePath('/marketing/import')
    revalidatePath('/sales/leads')

    return {
      success: true,
      importedCount,
      skippedCount,
      importLogId,
    }
  } catch (error: any) {
    console.error('Import error in importMarketingLeads:', error)
    importSubmissionSet.delete(key)
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลเข้าสู่ระบบ',
    }
  }
}

// ==========================================
// 6. Import History Retrieval
// ==========================================
export async function getImportHistoryLogs(): Promise<ImportHistoryItem[]> {
  try {
    const logs = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        l.id,
        l.file_name as "fileName",
        l.total_records as "totalRecords",
        l.new_leads_count as "newLeadsCount",
        l.duplicate_count as "duplicateCount",
        l.review_count as "reviewCount",
        l.error_count as "errorCount",
        l.imported_count as "importedCount",
        l.assigned_user_id as "assignedUserId",
        l.routing_type as "routingType",
        l.created_by_user_id as "createdByUserId",
        l.created_at as "createdAt",
        l.summary_data as "summaryData",
        creator."fullName" as "createdByUserName",
        assignee."fullName" as "assignedUserName"
      FROM marketing_lead_import_logs l
      LEFT JOIN "User" creator ON l.created_by_user_id = creator.id
      LEFT JOIN "User" assignee ON l.assigned_user_id = assignee.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `)

    return logs.map(row => ({
      id: row.id,
      fileName: row.fileName || 'lead_import.xlsx',
      totalRecords: Number(row.totalRecords || 0),
      newLeadsCount: Number(row.newLeadsCount || 0),
      duplicateCount: Number(row.duplicateCount || 0),
      reviewCount: Number(row.reviewCount || 0),
      errorCount: Number(row.errorCount || 0),
      importedCount: Number(row.importedCount || 0),
      assignedUserId: row.assignedUserId || null,
      assignedUserName: row.assignedUserName || null,
      routingType: row.routingType || 'unassigned',
      createdByUserId: row.createdByUserId,
      createdByUserName: row.createdByUserName || 'ผู้ใช้งานระบบ',
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      summaryData: row.summaryData || null
    }))
  } catch (error) {
    console.error('Error fetching import history:', error)
    return []
  }
}
