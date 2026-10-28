/* eslint-disable @typescript-eslint/no-explicit-any */
import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { teraDb } from '@/app/lib/teraDb'
import { redirect } from 'next/navigation'
import ScheduleClientPage from './ScheduleClientPage'
import { getStaffSchedules } from '@/app/actions/schedule'
import { isSuperUser, isMarketingManager } from '@/app/lib/roleHelper'

const BRANCH_MAP: Record<string, string> = {
  'BKK-HQ': 'สำนักงานใหญ่',
  'KK01': 'สาขาขอนแก่น',
  'CMI01': 'สาขาเชียงใหม่',
  'PSNL01': 'สาขาพิษณุโลก',
  'UB01': 'สาขาอุบลราชธานี',
  'UDN01': 'สาขาอุดรธานี',
  'SRT01': 'สาขาสุราษฎร์ธานี',
  'KRI01': 'สาขากาญจนบุรี',
  'SN01': 'สาขาสกลนคร',
  'SNO1': 'สาขาสกลนคร',
  'SRN01': 'สาขาสุรินทร์',
  'ROI01': 'สาขาร้อยเอ็ด',
  'SMK': 'สาขาสมุทรสาคร',
  'NRT': 'สาขานครศรีธรรมราช',
  'BKK-WH': 'คลังสินค้า 62 (BKK-WH)'
};

export default async function SchedulePage() {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    redirect('/')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId }
  })

  if (!user || !user.isActive) {
    redirect('/')
  }

  let staffPromise: any;
  const roleLower = (user.role || '').toLowerCase();
  const isSuperAdmin = isSuperUser(user.role);
  const isMarketingMgr = isMarketingManager(user.role);

  const staffSelectFields = {
    id: true,
    fullName: true,
    employeeId: true,
    role: true,
    employeeSale: {
      select: {
        branch: true,
        department: true
      }
    }
  };

  if (isSuperAdmin) {
    staffPromise = prisma.user.findMany({
      where: { isActive: true },
      select: staffSelectFields,
      orderBy: { fullName: 'asc' }
    });
  } else if (isMarketingMgr) {
    // ผู้จัดการการตลาด: เห็นของเซลล์ทุกคนในบริษัท และของตนเอง
    staffPromise = prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { employeeSale: { isNot: null } },
          { role: { in: ['Sales Representative', 'Sales Manager', 'Business Development', 'BD Intern', 'ตัวแทนฝ่ายขาย', 'ผู้จัดการ', 'Marketing Manager'] } },
          { role: { contains: 'sale', mode: 'insensitive' } },
          { role: { contains: 'ขาย', mode: 'insensitive' } },
          { role: { contains: 'เซลส์', mode: 'insensitive' } },
          { role: { contains: 'เซลล์', mode: 'insensitive' } },
          { schedules: { some: {} } },
          { id: user.id },
        ],
        NOT: {
          OR: [
            { role: 'อื่นๆ' },
            { role: { contains: 'accounting', mode: 'insensitive' } },
            { role: { contains: 'บัญชี', mode: 'insensitive' } },
            { role: { contains: 'purchasing', mode: 'insensitive' } },
            { role: { contains: 'จัดซื้อ', mode: 'insensitive' } },
            { role: { contains: 'warehouse', mode: 'insensitive' } },
            { role: { contains: 'คลังสินค้า', mode: 'insensitive' } },
            { role: { contains: 'service', mode: 'insensitive' } },
            { role: { contains: 'บริการ', mode: 'insensitive' } },
          ]
        }
      },
      select: staffSelectFields,
      orderBy: { fullName: 'asc' }
    });
  } else if (['ผู้จัดการ', 'manager', 'sales manager'].includes(roleLower) || roleLower.includes('manager')) {
    staffPromise = async () => {
      const subordinates = await teraDb.employees.findMany({
        where: { supervisor_id: user.employeeId, is_active: true },
        select: { emp_id: true }
      });
      const subEmpIds = subordinates.map((s: any) => s.emp_id);

      return prisma.user.findMany({
        where: { 
          isActive: true,
          OR: [
            { employeeId: { in: subEmpIds } },
            { id: user.id }
          ]
        },
        select: staffSelectFields,
        orderBy: { fullName: 'asc' }
      });
    };
    staffPromise = staffPromise();
  } else {
    staffPromise = Promise.resolve([
      {
        id: user.id,
        fullName: user.fullName,
        employeeId: user.employeeId,
        role: user.role,
        employeeSale: { branch: (user as any).employeeSale?.branch || null }
      }
    ]);
  }

  // Parallel fetch staff list, schedules, and teraDb branches
  const [schedulesResponse, rawStaff, businessTypesData, teraEmployees] = await Promise.all([
    getStaffSchedules(user),
    staffPromise,
    prisma.businessType.findMany({ orderBy: { name: 'asc' } }),
    teraDb.employees.findMany({
      where: { is_active: true },
      select: { emp_id: true, branch_id: true }
    }).catch(() => [])
  ]);

  const teraBranchMap = new Map((teraEmployees || []).map((e: any) => [e.emp_id, e.branch_id]));

  const staff = (rawStaff || []).map((s: any) => {
    const rawBranch = s.employeeSale?.branch || teraBranchMap.get(s.employeeId) || 'BKK-HQ';
    const branchName = BRANCH_MAP[rawBranch] || rawBranch;
    return {
      id: s.id,
      fullName: s.fullName,
      employeeId: s.employeeId,
      role: s.role,
      branchCode: rawBranch,
      branchName: branchName
    };
  });

  const initialSchedules: any[] = schedulesResponse?.success && Array.isArray(schedulesResponse?.data) ? schedulesResponse.data : []
  const businessTypes = businessTypesData.map((bt: any) => bt.name);

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8 pb-24">
      <ScheduleClientPage
        initialSchedules={initialSchedules}
        staffList={staff}
        businessTypes={businessTypes}
        userRole={user.role}
        currentUserId={user.id}
      />
    </main>
  );
}
