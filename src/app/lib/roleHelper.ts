export function isSuperUser(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return (
    r === "super_admin" ||
    r === "super admin" ||
    r === "superadmin" ||
    r === "super-admin" ||
    r === "ซุปเปอร์แอดมิน" ||
    r === "ผู้ดูแลระบบ" ||
    r === "ผู้ดูแลระบบสูงสุด" ||
    ["super_admin", "super admin", "superadmin", "super-admin", "ซุปเปอร์แอดมิน", "ผู้ดูแลระบบ"].some(kw => r.includes(kw))
  );
}

export function isReadOnlyExecutive(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return ["executive", "ผู้บริหาร"].includes(r);
}

export function isHeadOfSalesAndMarketing(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return (
    r === 'หัวหน้าฝ่ายขายและการตลาด' ||
    r === 'ผู้จัดการฝ่ายขายและการตลาด' ||
    r === 'ผู้อำนวยการฝ่ายขายและการตลาด' ||
    r === 'head of sales and marketing' ||
    r === 'head of sales & marketing' ||
    r === 'sales and marketing manager' ||
    r === 'sales & marketing manager' ||
    r === 'sales and marketing director' ||
    r.includes('หัวหน้าฝ่ายขายและการตลาด') ||
    r.includes('ผู้จัดการฝ่ายขายและการตลาด') ||
    ((r.includes('หัวหน้า') || r.includes('ผู้จัดการ') || r.includes('head') || r.includes('director')) &&
      (r.includes('ขาย') || r.includes('sale')) &&
      (r.includes('การตลาด') || r.includes('marketing')))
  );
}

export function isMarketingManager(role: string | null | undefined): boolean {
  if (!role) return false;
  if (isHeadOfSalesAndMarketing(role)) return true;
  const r = role.toLowerCase().trim();
  return (
    r === 'marketing manager' ||
    r === 'ผู้จัดการฝ่ายการตลาด' ||
    r === 'ผู้จัดการการตลาด' ||
    r === 'ผู้การจัดการตลาด' ||
    r.includes('marketing manager') ||
    r.includes('ผู้จัดการฝ่ายการตลาด') ||
    r.includes('ผู้จัดการการตลาด') ||
    r.includes('ผู้การจัดการตลาด') ||
    isSuperUser(role)
  );
}

export function isSalesOrMarketingManager(role: string | null | undefined): boolean {
  if (!role) return false;
  if (isSuperUser(role) || isMarketingManager(role) || isHeadOfSalesAndMarketing(role)) return true;
  const r = role.toLowerCase().trim();
  return (
    r === 'ผู้จัดการ' ||
    r === 'manager' ||
    r === 'sales manager' ||
    r === 'ผู้จัดการฝ่ายขาย' ||
    r === 'หัวหน้าฝ่ายขาย' ||
    r.includes('sales manager') ||
    r.includes('ผู้จัดการฝ่ายขาย') ||
    r.includes('หัวหน้าฝ่ายขาย')
  );
}

/**
 * Checks whether a user role is strictly a Sales Representative (ฝ่ายขาย) or Sales/Branch Manager (ผู้จัดการ).
 * Excludes Super Admin, Executive, Head of Sales & Marketing, Marketing, BD, Service, Technician,
 * Project, Engineering, Production, Purchasing, Warehouse/Store, Shipping, Accounting, HR, and Other.
 */
export function isSalesRepOrSalesManagerRole(role: string | null | undefined): boolean {
  if (!role) return false;
  if (isSuperUser(role) || isReadOnlyExecutive(role) || isHeadOfSalesAndMarketing(role)) {
    return false;
  }

  const r = role.toLowerCase().trim();
  if (!r || r === 'อื่นๆ') return false;

  const nonSalesKeywords = [
    'marketing',
    'การตลาด',
    'accounting',
    'accountant',
    'บัญชี',
    'finance',
    'การเงิน',
    'purchasing',
    'purchase',
    'จัดซื้อ',
    'warehouse',
    'คลังสินค้า',
    'คลัง',
    'store',
    'สโตร์',
    'ขนส่ง',
    'จัดส่ง',
    'shipping',
    'logistics',
    'โลจิสติกส์',
    'service',
    'บริการ',
    'เซอร์วิส',
    'ซ่อม',
    'technician',
    'ช่าง',
    'engineering',
    'วิศวกรรม',
    'project',
    'โครงการ',
    'โปรเจค',
    'โปรเจกต์',
    'production',
    'ผลิต',
    'business development',
    'พัฒนาธุรกิจ',
    'hr',
    'บุคคล',
    'admin',
    'แอดมิน',
  ];

  if (
    nonSalesKeywords.some((kw) => r.includes(kw)) ||
    r === 'bd' ||
    r.startsWith('bd ') ||
    r.endsWith(' bd') ||
    r.includes(' bd ')
  ) {
    return false;
  }

  return (
    r === 'ผู้จัดการ' ||
    r === 'manager' ||
    r === 'sales manager' ||
    r === 'ผู้จัดการฝ่ายขาย' ||
    r === 'หัวหน้าฝ่ายขาย' ||
    r === 'ผู้จัดการสาขา' ||
    ['sale', 'ขาย', 'เซลล์', 'เซลส์', 'telesale', 'เทเลเซล'].some((kw) => r.includes(kw))
  );
}

export function isMarketingStaff(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return (
    r.includes('marketing') ||
    r.includes('การตลาด') ||
    isMarketingManager(role)
  );
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
    'nma01': ['nma01', 'korat01', 'นครราชสีมา', 'โคราช', 'nakhonratchasima', 'korat'],
    'nrt': ['nrt', 'nrt01', 'นครศรีธรรมราช', 'nakhonsithammarat'],
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

  // If a specific assigned supervisor is designated and current user does not match, strictly deny
  if (requestAssignedSupervisorId || requestAssignedSupervisorName) {
    return {
      canApprove: false,
      reason: `สิทธิ์นี้สงวนไว้สำหรับหัวหน้างานผู้รับผิดชอบ (${requestAssignedSupervisorName || requestAssignedSupervisorId})`,
    };
  }

  // 6. Branch AND Department match (Fallback ONLY when no specific supervisor was assigned)
  const deptMatch =
    matchDepartment(userDepartment, requestDepartment) ||
    matchDepartment(userRole, requestDepartment);

  const branchMatch =
    userBranch && requestBranch
      ? matchBranch(userBranch, requestBranch)
      : (!requestBranch || !userBranch);

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
    reason: `สิทธิ์นี้สงวนไว้เฉพาะหัวหน้างานฝ่าย ${requestDepartment || 'ที่เกี่ยวข้อง'} สาขา ${requestBranch || ''}`,
  };
}

/**
 * Checks whether a user role has full access to view and manage ALL cases in /service/calls:
 * Allowed: Sales team, Service/Technicians, Sales Managers, Service Managers, Executive, and Super Admin.
 * Other departments (Marketing, Accounting, Store/Warehouse, Purchasing, Project, Production, BD, Admin, etc.)
 * return false — they can submit new cases and view ONLY cases they submitted themselves.
 */
export function canViewAllServiceCalls(role: string | null | undefined): boolean {
  if (!role) return false;
  if (isSuperUser(role) || isReadOnlyExecutive(role) || isHeadOfSalesAndMarketing(role)) return true;

  const r = role.toLowerCase().trim();

  // Explicitly exclude other department roles (including their department managers)
  const isOtherDepartment =
    [
      'marketing',
      'การตลาด',
      'accounting',
      'accountant',
      'บัญชี',
      'finance',
      'การเงิน',
      'purchasing',
      'จัดซื้อ',
      'warehouse',
      'คลังสินค้า',
      'store',
      'สโตร์',
      'project',
      'โครงการ',
      'โปรเจค',
      'โปรเจกต์',
      'production',
      'ผลิต',
      'business development',
      'พัฒนาธุรกิจ',
      'hr',
      'บุคคล',
      'ขนส่ง',
      'shipping',
      'logistics',
      'โลจิสติกส์',
    ].some((kw) => r.includes(kw)) ||
    r === 'bd' ||
    r.startsWith('bd ') ||
    r.endsWith(' bd') ||
    r.includes(' bd ');

  if (isOtherDepartment) return false;

  // Sales & Sales Managers
  const isSalesOrSalesMgr =
    r === 'ผู้จัดการ' ||
    r === 'manager' ||
    ['sale', 'ขาย', 'เซลล์', 'เซลส์', 'telesale', 'เทเลเซล'].some((kw) => r.includes(kw));

  // Service, Technicians & Service Managers
  const isServiceOrServiceMgr = [
    'service',
    'บริการ',
    'ซ่อม',
    'เซอร์วิส',
    'technician',
    'ช่าง',
  ].some((kw) => r.includes(kw));

  return isSalesOrSalesMgr || isServiceOrServiceMgr;
}


