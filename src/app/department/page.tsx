import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { teraDb } from '@/app/lib/teraDb'
import { redirect } from "next/navigation";
import Sidebar from '@/app/components/Sidebar';
import JobsClientPage from "@/app/jobs/JobsClientPage";

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

  const isManager = user.role === 'ผู้จัดการ'; 
  
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
  const isSales = isSalesDept || isSalesRole;

  let whereClause: any = {}; // Default to all jobs for non-sales (like Store, Accounting)
  
  if (isManager) {
    let subEmpIds: string[] = [];
    try {
      const subordinates = await teraDb.employees.findMany({
        where: { supervisor_id: user.employeeId, is_active: true },
        select: { emp_id: true }
      });
      subEmpIds = subordinates.map(s => s.emp_id);
    } catch (err) {
      console.warn("Failed to fetch subordinates from HR database:", err);
    }
    
    const teamUsers = await prisma.user.findMany({
      where: { employeeId: { in: subEmpIds }, isActive: true },
      select: { fullName: true }
    });
    const teamFullNames = teamUsers.map(u => u.fullName);

    whereClause = {
      OR: [
        { sellerName: { in: teamFullNames } },
        { sellerName: user.fullName ?? "" },
        { sellerName: null },
        { sellerName: "" }
      ]
    };
  } else if (isSales) {
    whereClause = { OR: [{ sellerName: user.fullName ?? "" }, { sellerName: null }, { sellerName: "" }] };
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
