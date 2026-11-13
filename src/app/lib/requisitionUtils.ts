/**
 * Shared pure helpers for material requisition returnability rules and labels.
 *
 * Business rules:
 * - CLAIM (เบิกเคลม) and PROJECT (เบิกของงานโครงการ) do not return items to the store.
 * - BORROW_EQUIPMENT (เบิกยืมสโตร์) requires store return tracking.
 */

export function isNonReturnableRequisitionType(
  requisitionType?: string | null
): boolean {
  return requisitionType === 'CLAIM' || requisitionType === 'PROJECT';
}

export function getCompletedStatusLabel(
  requisitionType?: string | null,
  variant: 'STORE' | 'SUMMARY' = 'STORE'
): string {
  if (requisitionType === 'CLAIM') {
    return variant === 'SUMMARY'
      ? 'ส่งมอบเคลมแล้ว (ไม่ต้องคืน)'
      : 'ส่งมอบเคลมแล้ว (ไม่คืนของ)';
  }
  if (requisitionType === 'PROJECT') {
    return variant === 'SUMMARY'
      ? 'ส่งมอบโครงการแล้ว (ไม่ต้องคืน)'
      : 'ส่งมอบโครงการแล้ว (ไม่คืนของ)';
  }
  return variant === 'SUMMARY'
    ? 'ส่งมอบแล้ว / รอคืน'
    : 'ส่งมอบแล้ว (รอคืน/ใช้งาน)';
}

export function getNonReturnableLabel(
  requisitionType?: string | null,
  compact = false
): string {
  if (requisitionType === 'CLAIM') {
    return compact ? 'ไม่ต้องคืน (เคลม)' : 'ไม่ต้องคืน (เบิกเคลม)';
  }
  if (requisitionType === 'PROJECT') {
    return compact ? 'ไม่ต้องคืน (โครงการ)' : 'ไม่ต้องคืน (เบิกโครงการ)';
  }
  return 'ไม่ต้องคืน';
}

export function getNonReturnableErrorMessage(
  requisitionType?: string | null
): string {
  if (requisitionType === 'PROJECT') {
    return 'รายการเบิกโครงการไม่มีการคืนสินค้าเข้าคลัง';
  }
  return 'รายการเบิกเคลมไม่มีการคืนสินค้าเข้าคลัง';
}

export function getNonReturnableBadgeClass(
  requisitionType?: string | null
): string {
  if (requisitionType === 'CLAIM') {
    return 'bg-violet-50 text-violet-700 border-violet-200';
  }
  return 'bg-blue-50 text-blue-700 border-blue-200';
}
