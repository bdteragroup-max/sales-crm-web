import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { teraDb } from '@/app/lib/teraDb'
import { redirect } from "next/navigation";
import Sidebar from '@/app/components/Sidebar';
import JobsClientPage from "./JobsClientPage";

export const dynamic = 'force-dynamic';

export default async function JobsPage(props: { searchParams?: Promise<any> | any }) { 
  const searchParams = props.searchParams ? await props.searchParams : {};
  const actionParam = searchParams.action;
  const targetJobId = searchParams.jobId;
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

  const roleStr = (user.role || '').toLowerCase();
  const isSalesManager = user.role === 'ผู้จัดการ' || roleStr.includes('sales manager') || roleStr.includes('marketing manager') || roleStr.includes('ผู้จัดการฝ่ายการตลาด') || roleStr.includes('ผู้จัดการการตลาด');
  const isServiceManager = roleStr.includes('service engineer mgr');
  const isManager = isSalesManager || isServiceManager; 
  
  const teraEmployee = await teraDb.employees.findUnique({
    where: { emp_id: user.employeeId },
    include: { departments: true }
  });
  
  const resolvedDept = user.employeeSale?.department || teraEmployee?.departments?.name || "sales";
  const isSalesDept = resolvedDept.toLowerCase().includes('sale') || resolvedDept.toLowerCase().includes('ขาย') || resolvedDept.includes('เซลส์') || resolvedDept.includes('เซลล์');
  const isSalesRole = roleStr.includes('sale') || roleStr.includes('ขาย') || roleStr.includes('เซลส์') || roleStr.includes('เซลล์');
  const isSales = isSalesDept || isSalesRole;

  let whereClause: any = {}; // Default to all jobs for non-sales (like Store, Accounting)
  
  if (isSalesManager) {
    const subordinates = await teraDb.employees.findMany({
      where: { supervisor_id: user.employeeId, is_active: true },
      select: { emp_id: true }
    });
    const subEmpIds = subordinates.map(s => s.emp_id);
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
  } else if (isSales && !isServiceManager) {
    whereClause = { OR: [{ sellerName: user.fullName ?? "" }, { sellerName: null }, { sellerName: "" }] };
  }

  const jobs = await prisma.job.findMany({ 
    where: whereClause, 
    include: {
      quotation: true,
      stepLogs: { orderBy: { completedAt: "asc" } },
      paymentTasks: true,
      installationOrders: { orderBy: { createdAt: "desc" } },
      repairOrder: true,
      project: true,
      repairDeliveries: { orderBy: { createdAt: "desc" } },
    }, 
    orderBy: { dateClosed: "desc" }, 
  }); 

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        activeRoute="/jobs" 
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
          actionParam={actionParam}
          targetJobId={targetJobId}
          initialSearch={searchParams.search}
        />
      </main>
    </div>
  );
}
