import { redirect } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import { isSuperUser } from '@/app/lib/roleHelper';
import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';
import { getMarketingRequests } from '@/app/actions/marketingRequests';
import MarketingRequestFormClient from './MarketingRequestFormClient';

export const dynamic = 'force-dynamic';

export default async function NewMarketingRequestPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const initialTab = (resolvedParams.tab === 'status' || resolvedParams.tab === 'my-requests') ? 'status' : 'form';

  const roleStr = (user.role || '').toLowerCase();
  const isMarketingOrAdmin = isSuperUser(user.role) || [
    'marketing',
    'การตลาด',
    'ผู้จัดการฝ่ายการตลาด',
    'ผู้จัดการการตลาด'
  ].some(r => roleStr.includes(r));

  // 1. Fetch branches from Master Data & user's submitted requests
  const [requestsRes, rawBranches] = await Promise.all([
    getMarketingRequests({ tab: 'my' }),
    prisma.branches.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true }
    })
  ]);

  let branches: { id: string; name: string }[] = rawBranches.map(b => ({ id: b.id, name: b.name }));

  // Fallback branches if empty
  if (branches.length === 0) {
    branches = [
      { id: 'BKK-HQ', name: 'สำนักงานใหญ่' },
      { id: 'CMI01', name: 'สาขาเชียงใหม่' },
      { id: 'KK01', name: 'สาขาขอนแก่น' },
      { id: 'PSNL01', name: 'สาขาพิษณุโลก' },
      { id: 'UB01', name: 'สาขาอุบลราชธานี' },
      { id: 'SRT01', name: 'สาขาสุราษฎร์ธานี' }
    ];
  }

  // 2. Fetch employee details from TERA_db for auto-filling
  let employeeDept = '';
  let employeePhone = '';
  let employeeBranch = '';

  try {
    if (user.employeeId) {
      const emp = await teraDb.employees.findUnique({
        where: { emp_id: user.employeeId },
        include: { departments: true }
      });
      if (emp) {
        if (emp.departments?.name) employeeDept = emp.departments.name;
        if (emp.phone_number) employeePhone = emp.phone_number;
        if (emp.branch_id) employeeBranch = emp.branch_id;
      }
    }
  } catch (err) {
    console.warn('Failed to query TERA_db employee:', err);
  }

  // Fallback department
  if (!employeeDept) {
    const roleStr = (user.role || '').toLowerCase();
    if (roleStr.includes('marketing') || roleStr.includes('การตลาด')) employeeDept = 'ฝ่ายการตลาด';
    else if (roleStr.includes('service') || roleStr.includes('บริการ') || roleStr.includes('ช่าง')) employeeDept = 'ฝ่ายบริการ';
    else if (roleStr.includes('project') || roleStr.includes('โครงการ')) employeeDept = 'ฝ่ายโครงการ';
    else if (roleStr.includes('bd') || roleStr.includes('พัฒนาธุรกิจ')) employeeDept = 'Business Development';
    else employeeDept = 'ฝ่ายขาย';
  }

  // Map employee branch to branch name if matching ID
  let defaultBranchName = '';
  if (employeeBranch) {
    const match = branches.find(b => b.id === employeeBranch || b.name.includes(employeeBranch));
    if (match) defaultBranchName = match.name;
  }
  if (!defaultBranchName && branches.length > 0) {
    defaultBranchName = branches[0].name;
  }

  // 3. Departments list
  let departmentsList: string[] = [
    'ฝ่ายขาย',
    'ฝ่ายการตลาด',
    'ฝ่ายบริการ',
    'ฝ่ายโครงการ',
    'ฝ่ายผลิต',
    'ฝ่ายจัดซื้อ',
    'คลังสินค้าและขนส่ง',
    'Accounting & Finance',
    'Human Resources',
    'Business Development',
    'Automation',
    'Solar pump',
    'Solar roof',
    'บริหาร'
  ];

  try {
    const depts = await teraDb.departments.findMany({
      orderBy: { name: 'asc' },
      select: { name: true }
    });
    if (depts && depts.length > 0) {
      const names = depts.map(d => d.name.trim()).filter(Boolean);
      departmentsList = Array.from(new Set([...departmentsList, ...names]));
    }
  } catch (err) {
    // Keep fallback
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <MarketingRequestFormClient
        currentUser={{
          id: user.id,
          fullName: user.fullName,
          phoneNumber: employeePhone,
          department: employeeDept,
          branch: defaultBranchName,
          role: user.role
        }}
        branches={branches}
        departments={departmentsList}
        initialRequests={requestsRes.data || []}
        initialCounts={requestsRes.counts || {}}
        initialTab={initialTab}
        isMarketingOrAdmin={isMarketingOrAdmin}
      />
    </div>
  );
}
