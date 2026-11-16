/**
 * Pure ownership helpers for Service -> Sales Handover visibility and claiming.
 * Ensures each forwarded service job is visible to and claimable only by its
 * designated salesperson (`assignedSalesId`).
 */
export function isServiceHandoverAssignedToUser(
  assignedSalesId?: string | null,
  currentUserId?: string | null
): boolean {
  const cleanAssigned = (assignedSalesId || '').trim();
  const cleanUser = (currentUserId || '').trim();
  if (!cleanAssigned || !cleanUser) return false;
  return cleanAssigned === cleanUser;
}

export function canClaimServiceHandoverForQuotation(
  assignedSalesId?: string | null,
  currentUserId?: string | null
): boolean {
  const cleanUser = (currentUserId || '').trim();
  if (!cleanUser) return false;
  const cleanAssigned = (assignedSalesId || '').trim();
  if (!cleanAssigned) return true;
  return cleanAssigned === cleanUser;
}

