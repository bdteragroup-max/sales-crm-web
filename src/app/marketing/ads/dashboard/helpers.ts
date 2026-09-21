// Standardized branch keywords map for matching campaign names
export const BRANCH_KEYWORDS: Record<string, string[]> = {
  'KK01': ['KHONKAEN', 'KHON KAEN', 'ขอนแก่น', 'KK01'],
  'PSNL01': ['PITSANULOK', 'PHITSANULOK', 'พิษณุโลก', 'PSNL01'],
  'CMI01': ['CHIANGMAI', 'CHIANG MAI', 'เชียงใหม่', 'CMI01'],
  'UDN01': ['UDON', 'อุดรธานี', 'UDN01'],
  'SRN01': ['SURIN', 'สุรินทร์', 'SRN01'],
  'BKK-WH': ['WAREHOUSE', 'BKK-WH', 'WH62'],
  'SMK': ['SAMUTSAKHON', 'สมุทรสาคร', 'SMK'],
  'ROI01': ['ROIET', 'ROI-ET', 'ร้อยเอ็ด', 'ROI01'],
  'KRI01': ['KANCHANABURI', 'กาญจนบุรี', 'KRI01'],
  'SN01': ['SAKON', 'SAKONNAKHON', 'สกลนคร', 'SN01'],
  'SRT01': ['SURATTHANI', 'SURAT THANI', 'สุราษฎร์ธานี', 'SRT01'],
  'NRT': ['NAKHONSI', 'นครศรีธรรมราช', 'NRT'],
  'UB01': ['UBON', 'UBONRATCHATHANI', 'อุบลราชธานี', 'UB01'],
  'BKK-HQ': ['สำนักงานใหญ่', 'BANGKOK', 'HQ', 'BKK-HQ', 'OFFICE']
}

export function campaignMatchesBranch(
  campaign: { branchId?: string | null; branchName?: string | null; name?: string },
  selectedBranchIdOrName?: string,
  branchesList?: Array<{ id: string; name: string }>
): boolean {
  if (!selectedBranchIdOrName || selectedBranchIdOrName === 'All') return true

  // 1. Direct ID match
  if (campaign.branchId && campaign.branchId === selectedBranchIdOrName) return true

  // 2. Direct Name match
  const selectedBranch = branchesList?.find(b => b.id === selectedBranchIdOrName || b.name === selectedBranchIdOrName)
  const targetName = selectedBranch ? selectedBranch.name : selectedBranchIdOrName
  const targetId = selectedBranch ? selectedBranch.id : selectedBranchIdOrName

  if (campaign.branchName && (campaign.branchName === targetName || campaign.branchName === targetId)) return true

  // 3. Keyword matching in campaign name
  const cName = (campaign.name || '').toUpperCase()
  const keywords = BRANCH_KEYWORDS[targetId] || [targetName.toUpperCase(), targetId.toUpperCase()]
  return keywords.some(kw => cName.includes(kw.toUpperCase()))
}

export function campaignMatchesProductCategory(
  campaign: { productCategory?: string | null; name?: string },
  selectedCategory?: string
): boolean {
  if (!selectedCategory || selectedCategory === 'All') return true
  const pCat = (campaign.productCategory || '').trim()
  if (pCat && pCat === selectedCategory) return true

  const normSelected = selectedCategory.toLowerCase().replace(/\s+/g, '')
  const normPCat = pCat.toLowerCase().replace(/\s+/g, '')
  if (normPCat && (normPCat.includes(normSelected) || normSelected.includes(normPCat))) return true

  const cName = (campaign.name || '').toUpperCase()
  if (selectedCategory === 'Solar Roof' || selectedCategory === 'Solar Rooftop') {
    return cName.includes('SOLARROOF') || cName.includes('SOLAR_ROOF') || cName.includes('SOLAR ROOF')
  }
  if (selectedCategory === 'Solar Pump') {
    return cName.includes('PUMP') || cName.includes('BLDC')
  }
  if (selectedCategory === 'Inverter Veichi') {
    return cName.includes('INV') || cName.includes('VEICHI') || cName.includes('ACDRIVE') || cName.includes('VFD')
  }
  if (selectedCategory === 'Other') {
    return pCat === 'Other' || pCat === '-' || pCat === ''
  }
  return false
}

export function detectBranchForCampaign(
  campaign: { branchId?: string | null; branchName?: string | null; name?: string },
  branchesList?: Array<{ id: string; name: string }>
): { branchId: string; branchName: string } {
  if (campaign.branchId && campaign.branchId !== 'unassigned' && campaign.branchName && campaign.branchName !== 'ไม่ได้ระบุสาขา') {
    return { branchId: campaign.branchId, branchName: campaign.branchName }
  }

  const cName = (campaign.name || '').toUpperCase()
  for (const [bId, keywords] of Object.entries(BRANCH_KEYWORDS)) {
    if (keywords.some(kw => cName.includes(kw.toUpperCase()))) {
      const bObj = branchesList?.find(b => b.id === bId)
      return {
        branchId: bId,
        branchName: bObj ? bObj.name : (BRANCH_KEYWORDS[bId][2] || bId)
      }
    }
  }

  return {
    branchId: campaign.branchId || 'unassigned',
    branchName: campaign.branchName || 'ไม่ได้ระบุสาขา'
  }
}

export function detectProductCategory(
  campaign: { productCategory?: string | null; name?: string }
): string {
  const pCat = (campaign.productCategory || '').trim()
  if (pCat && pCat !== '-' && pCat !== 'None') return pCat

  const cName = (campaign.name || '').toUpperCase()
  if (cName.includes('SOLARROOF') || cName.includes('SOLAR_ROOF') || cName.includes('SOLAR ROOF')) {
    return 'Solar Roof'
  }
  if (cName.includes('PUMP') || cName.includes('BLDC')) {
    return 'Solar Pump'
  }
  if (cName.includes('INV') || cName.includes('VEICHI') || cName.includes('ACDRIVE') || cName.includes('VFD')) {
    return 'Inverter Veichi'
  }
  return 'Other'
}
