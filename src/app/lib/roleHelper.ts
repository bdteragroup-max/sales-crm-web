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

export function isAccountingStaff(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return (
    isSuperUser(role) ||
    isAccountingManager(role) ||
    ['accounting', 'บัญชี', 'finance', 'การเงิน', 'ap', 'เจ้าหนี้', 'accountant'].some((kw) => r.includes(kw))
  );
}

export function canManageAllPaymentRequests(role: string | null | undefined): boolean {
  return isAccountingStaff(role) || canViewAll(role);
}

export function isSupervisorOrManager(role: string | null | undefined, position?: string | null | undefined): boolean {
  if (!role && !position) return false;
  const r = (role || '').toLowerCase().trim();
  const p = (position || '').toLowerCase().trim();
  if (isSuperUser(role) || isReadOnlyExecutive(role) || isAccountingManager(role)) return true;
  const keywords = ['manager', 'mgr', 'ผู้จัดการ', 'หัวหน้า', 'supervisor', 'director', 'head', 'lead'];
  return keywords.some((kw) => r.includes(kw) || p.includes(kw));
}

export function matchDepartment(dept1?: string | null, dept2?: string | null): boolean {
  if (!dept1 || !dept2) return false;
  const clean1 = dept1.toLowerCase().trim().replace(/[^a-z0-9\u0E00-\u0E7F]/g, '');
  const clean2 = dept2.toLowerCase().trim().replace(/[^a-z0-9\u0E00-\u0E7F]/g, '');
  if (!clean1 || !clean2) return false;
  if (clean1 === clean2) return true;
  if (clean1.includes(clean2) || clean2.includes(clean1)) return true;

  const groups = [
    ['businessdevelopment', 'bd', 'พัฒนาธุรกิจ'],
    ['marketing', 'การตลาด'],
    ['sales', 'ขาย', 'ฝ่ายขาย', 'ตัวแทนฝ่ายขาย'],
    ['accounting', 'finance', 'การเงิน', 'บัญชี', 'accountingfinancedep'],
    ['warehouse', 'คลังสินค้า', 'ขนส่ง', 'logistics', 'คลังสินค้าและขนส่ง'],
    ['purchasing', 'จัดซื้อ'],
    ['engineering', 'วิศวกรรม', 'engineeringdep'],
    ['production', 'ผลิต', 'ฝ่ายผลิต'],
    ['service', 'บริการ', 'serviceengineer'],
    ['humanresources', 'hr', 'บุคคล', 'humanresourcesdep'],
    ['project', 'โครงการ'],
  ];

  for (const group of groups) {
    const m1 = group.some((kw) => clean1.includes(kw));
    const m2 = group.some((kw) => clean2.includes(kw));
    if (m1 && m2) return true;
  }

  return false;
}

export function matchBranch(branch1?: string | null, branch2?: string | null): boolean {
  if (!branch1 || !branch2) return false;
  const b1 = branch1.toLowerCase().trim();
  const b2 = branch2.toLowerCase().trim();
  if (b1 === b2) return true;
  if (b1 === 'all' || b2 === 'all') return true;

  const branchMap: Record<string, string[]> = {
    'bkk-hq': ['bkk-hq', 'สำนักงานใหญ่', 'hq', 'headquarter', 'headquarters'],
    'bkk-wh': ['bkk-wh', 'tera warehouse 62', 'warehouse 62', 'wh62'],
    'cmi01': ['cmi01', 'เชียงใหม่', 'chiangmai', 'chiang mai'],
    'kk01': ['kk01', 'ขอนแก่น', 'khonkaen', 'khon kaen'],
    'kri01': ['kri01', 'กาญจนบุรี', 'kanchanaburi'],
    'nrt': ['nrt', 'นครศรีธรรมราช', 'nakhonsithammarat'],
    'psnl01': ['psnl01', 'พิษณุโลก', 'phitsanulok'],
    'roi01': ['roi01', 'ร้อยเอ็ด', 'roiet'],
    'smk': ['smk', 'สมุทรสาคร', 'samutsakhon'],
    'sn01': ['sn01', 'สกลนคร', 'sakonnakhon'],
    'srn01': ['srn01', 'สุรินทร์', 'surin'],
    'srt01': ['srt01', 'สุราษฎร์ธานี', 'suratthani', 'surat thani'],
    'ub01': ['ub01', 'อุบลราชธานี', 'ubonratchathani', 'ubon'],
    'udn01': ['udn01', 'อุดรธานี', 'udonthani', 'udon'],
  };

  for (const aliases of Object.values(branchMap)) {
    const m1 = aliases.some(a => b1.includes(a) || a.includes(b1));
    const m2 = aliases.some(a => b2.includes(a) || a.includes(b2));
    if (m1 && m2) return true;
  }

  return false;
}

export function canSupervisorApproveRequest({
  userRole,
  userDepartment,
  userBranch,
  userId,
  userFullName,
  userEmployeeId,
  requestRequesterId,
  requestRequesterName,
  requestDepartment,
  requestBranch,
  requestAssignedSupervisorId,
  requestAssignedSupervisorName,
  isDirectSupervisor,
}: {
  userRole?: string | null;
  userDepartment?: string | null;
  userBranch?: string | null;
  userId?: string | null;
  userFullName?: string | null;
  userEmployeeId?: string | null;
  requestRequesterId?: string | null;
  requestRequesterName?: string | null;
  requestDepartment?: string | null;
  requestBranch?: string | null;
  requestAssignedSupervisorId?: string | null;
  requestAssignedSupervisorName?: string | null;
  isDirectSupervisor?: boolean;
}): { canApprove: boolean; reason?: string } {
  // 1. Must have supervisor / manager / admin role
  if (!isSupervisorOrManager(userRole)) {
    return { canApprove: false, reason: 'ไม่ใช่ระดับหัวหน้างานหรือผู้จัดการฝ่าย' };
  }

  // 2. Prevent self-approval (Supervisors cannot approve their own requests)
  const isOwner =
    (userId && requestRequesterId && userId === requestRequesterId) ||
    (userFullName && requestRequesterName && userFullName.trim().toLowerCase() === requestRequesterName.trim().toLowerCase());
  if (isOwner) {
    return {
      canApprove: false,
      reason: 'ไม่สามารถอนุมัติรายการของตนเองได้',
    };
  }

  // 3. Super Admin, Executive, and Accounting Manager have company-wide authority
  if (isSuperUser(userRole) || isReadOnlyExecutive(userRole) || isAccountingManager(userRole)) {
    return { canApprove: true };
  }

  // 4. Exact Assigned Supervisor match (Direct line manager assigned)
  if (
    userEmployeeId &&
    requestAssignedSupervisorId &&
    userEmployeeId.trim().toUpperCase() === requestAssignedSupervisorId.trim().toUpperCase()
  ) {
    return { canApprove: true };
  }

  if (
    userFullName &&
    requestAssignedSupervisorName &&
    userFullName.trim().toLowerCase() === requestAssignedSupervisorName.trim().toLowerCase()
  ) {
    return { canApprove: true };
  }

  // 5. Direct subordinate line check in HR database
  if (isDirectSupervisor) {
    return { canApprove: true };
  }

  // 6. Branch AND Department match
  const deptMatch =
    matchDepartment(userDepartment, requestDepartment) ||
    matchDepartment(userRole, requestDepartment);

  const branchMatch =
    !requestBranch ||
    !userBranch ||
    matchBranch(userBranch, requestBranch);

  if (deptMatch && branchMatch) {
    return { canApprove: true };
  }

  if (deptMatch && !branchMatch) {
    return {
      canApprove: false,
      reason: `สิทธิ์นี้สงวนไว้เฉพาะหัวหน้างานฝ่าย ${requestDepartment || ''} สาขา ${requestBranch || ''} (คุณสังกัดสาขา ${userBranch || '-'})`,
    };
  }

  return {
    canApprove: false,
    reason: requestAssignedSupervisorName
      ? `สิทธิ์นี้สงวนไว้สำหรับหัวหน้างานผู้รับผิดชอบ (${requestAssignedSupervisorName})`
      : `สิทธิ์นี้สงวนไว้เฉพาะหัวหน้างานฝ่าย ${requestDepartment || 'ที่เกี่ยวข้อง'} สาขา ${requestBranch || ''}`,
  };
}

