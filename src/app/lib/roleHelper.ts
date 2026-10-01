export function isSuperUser(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return ["super_admin", "super admin"].includes(r);
}

export function isReadOnlyExecutive(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return ["executive", "ผู้บริหาร"].includes(r);
}

export function canViewAll(role: string | null | undefined): boolean {
  return isSuperUser(role) || isReadOnlyExecutive(role);
}

export function isAccountingManager(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return (
    r === 'ผู้จัดการฝ่ายบัญชี' ||
    r === 'accounting manager' ||
    r === 'accounting mgr.' ||
    r === 'accounting_manager' ||
    r.includes('ผู้จัดการฝ่ายบัญชี') ||
    isSuperUser(role)
  );
}
