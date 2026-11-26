import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import type { Prisma } from '@/generated/client'
import { teraDb } from '@/app/lib/teraDb'
import { redirect } from "next/navigation";
import Sidebar from '@/app/components/Sidebar';
import JobsClientPage from "@/app/jobs/JobsClientPage";
import { buildThaiPersonNameVariants } from "@/app/lib/personName";
import { isMarketingManager as checkMarketingManager, isSalesOrMarketingManager } from "@/app/lib/roleHelper";
import { getRecursiveSubordinateEmpIds } from "@/app/lib/subordinates";

export const dynamic = 'force-dynamic';

export default async function DepartmentPage() { 
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    redirect('/')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { employeeSale: true }
  })

  if (!user || !user.isActive) {
    redirect('/')
  }

  const roleLower = (user.role || '').toLowerCase();
  const isSuperAdmin = 
    user.role === 'SUPER_ADMIN' || 
    roleLower.includes('super_admin') || 
    roleLower.includes('superadmin') || 
    roleLower.includes('super admin') || 
    roleLower.includes('admin') || 
    roleLower.includes('ผู้ดูแลระบบ');
  const isExecutive = user.role === 'ผู้บริหาร' || roleLower === 'executive';
  const isMarketingManager = checkMarketingManager(user.role);
  const isManager = isSuperAdmin || isExecutive || isSalesOrMarketingManager(user.role) || roleLower.includes('manager') || roleLower.includes('หัวหน้า'); 
  
  let teraEmployee = null;
  try {
    teraEmployee = await teraDb.employees.findUnique({
      where: { emp_id: user.employeeId },
      include: { departments: true }
    });
  } catch (err) {
    console.warn("Failed to fetch employee from HR database:", err);
  }
  
  const resolvedDept = user.employeeSale?.department || teraEmployee?.departments?.name || "sales";
  const isSalesDept = resolvedDept.toLowerCase().includes('sale') || resolvedDept.toLowerCase().includes('ขาย');
  const isSalesRole = user.role.toLowerCase().includes('sale') || user.role.toLowerCase().includes('ขาย');
  const isSales = !isSuperAdmin && !isExecutive && (isSalesDept || isSalesRole);

  let whereClause: Prisma.JobWhereInput = {}; // Default to all jobs for non-sales (Store, Purchasing, Logistics, Accounting)
  
  if (isSuperAdmin || isExecutive || isMarketingManager || (!isSales && !isSalesOrMarketingManager(user.role))) {
    whereClause = {};
  } else if (isManager) {
    const subEmpIds = await getRecursiveSubordinateEmpIds(user.employeeId);
    
    const teamUsers = await prisma.user.findMany({
      where: { employeeId: { in: subEmpIds }, isActive: true },
      select: {
        id: true,
        fullName: true,
        employeeSale: { select: { fullName: true } },
      }
    });
    const teamUserIds = Array.from(new Set([user.id, ...teamUsers.map((u) => u.id)]));
    const teamFullNames = buildThaiPersonNameVariants(
      user.fullName,
      user.employeeSale?.fullName,
      teraEmployee?.name,
      ...teamUsers.flatMap((u) => [u.fullName, u.employeeSale?.fullName])
    );

    whereClause = {
      OR: [
        ...(teamFullNames.length > 0 ? [{ sellerName: { in: teamFullNames } }] : []),
        { quotation: { salespersonId: { in: teamUserIds } } },
        { sellerName: null },
        { sellerName: "" }
      ]
    };
  } else if (isSales) {
    const myNames = buildThaiPersonNameVariants(
      user.fullName,
      user.employeeSale?.fullName,
      teraEmployee?.name
    );
    whereClause = {
      OR: [
        ...(myNames.length > 0 ? [{ sellerName: { in: myNames } }] : []),
        { quotation: { salespersonId: user.id } },
        { sellerName: null },
        { sellerName: "" }
      ]
    };
  }

  const jobs = await prisma.job.findMany({ 
    where: whereClause, 
    include: { 
      quotation: true,
      stepLogs: { orderBy: { completedAt: "asc" } }
    }, 
    orderBy: { dateClosed: "desc" }, 
  }); 

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        activeRoute="/department" 
        userFullName={user.fullName} 
        userId={user.id} 
        userRole={user.role} 
      />
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc]">
        <JobsClientPage 
          jobs={JSON.parse(JSON.stringify(jobs))} 
          isManager={isManager} 
          currentUser={user.fullName ?? ""}
          userDept={`${resolvedDept} ${user.role}`} 
          userRole={user.role}
        />
      </main>
    </div>
  );
}
