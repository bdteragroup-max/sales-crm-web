// ==========================================
// Product Groups & Associated Occupations Configuration
// ==========================================

export const PRODUCT_GROUPS = [
  'Pump',
  'Solar Rooftop',
  'AC Drive',
] as const

export type ProductGroupType = typeof PRODUCT_GROUPS[number]

export const PRODUCT_GROUP_LABELS: Record<string, string> = {
  'Pump': 'Pump (ปั๊มน้ำ / ปั๊มน้ำโซล่า)',
  'Solar Rooftop': 'Solar Rooftop (โซล่ารูฟท็อป)',
  'AC Drive': 'AC Drive (อินเวอร์เตอร์ / VFD)',
}

export const PRODUCT_OCCUPATIONS: Record<string, string[]> = {
  'Pump': [
    'เกษตรกร',
    'ช่างไฟฟ้า',
    'ร้านค้าทั่วไป',
    'ตัวแทนจำหน่าย',
    'ผู้รับเจาะน้ำบาดาล',
    'อื่นๆ',
  ],
  'Solar Rooftop': [
    'ผู้ใช้งาน(บ้าน)',
    'ผู้ใช้งาน (อุตสาหกรรม)',
    'วิศวกร',
    'ช่างไฟฟ้า',
    'ผู้รับเหมา',
    'เจ้าของกิจการ',
    'ตัวแทนเจ้าของกิจการ',
    'อื่นๆ',
  ],
  'AC Drive': [
    'จป.',
    'วิศวกร',
    'ช่างประจำโรงงาน',
    'ช่างไฟฟ้า',
    'ผู้รับเหมา',
    'เจ้าของกิจการ',
    'ตัวแทนเจ้าของกิจการ',
    'อื่นๆ',
  ],
}

/**
 * Normalizes user input or imported Excel text to standard Product Group name.
 */
export function normalizeProductGroup(raw: string | null | undefined): string {
  if (!raw) return ''
  const s = String(raw).trim().toLowerCase()

  // Pump matches
  if (
    s.includes('pump') ||
    s.includes('ปั๊ม') ||
    s.includes('บาดาล') ||
    s === 'solar pump' ||
    s === 'submersible'
  ) {
    return 'Pump'
  }

  // Solar Rooftop matches (including user typo "rooft0p")
  if (
    s.includes('rooftop') ||
    s.includes('rooft0p') ||
    s.includes('solar roof') ||
    s.includes('รูฟท็อป') ||
    s.includes('โซล่ารูฟ') ||
    s.includes('โซลาร์รูฟ') ||
    s.includes('on-grid') ||
    s.includes('ongrid') ||
    s === 'solar' ||
    s === 'โซล่าเซลล์' ||
    s === 'โซลาร์เซลล์'
  ) {
    return 'Solar Rooftop'
  }

  // AC Drive matches
  if (
    s.includes('ac drive') ||
    s.includes('acdrive') ||
    s.includes('drive') ||
    s.includes('vfd') ||
    s.includes('inverter') ||
    s.includes('อินเวอร์เตอร์') ||
    s.includes('veichi')
  ) {
    return 'AC Drive'
  }

  return raw.trim()
}

/**
 * Returns available occupation list for a given product group.
 */
export function getOccupationsForProductGroup(productGroup: string | null | undefined): string[] {
  const norm = normalizeProductGroup(productGroup)
  if (norm && PRODUCT_OCCUPATIONS[norm]) {
    return PRODUCT_OCCUPATIONS[norm]
  }

  // If unknown or empty, return union of all unique occupations
  const allSet = new Set<string>()
  Object.values(PRODUCT_OCCUPATIONS).forEach((list) => {
    list.forEach((item) => allSet.add(item))
  })
  return Array.from(allSet)
}

/**
 * Returns all unique occupations across all product groups.
 */
export function getAllOccupations(): string[] {
  const allSet = new Set<string>()
  Object.values(PRODUCT_OCCUPATIONS).forEach((list) => {
    list.forEach((item) => allSet.add(item))
  })
  return Array.from(allSet)
}
