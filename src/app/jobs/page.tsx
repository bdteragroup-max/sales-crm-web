import { getUser } from '@/app/lib/dal'
import prisma from '@/app/lib/db'
import { teraDb } from '@/app/lib/teraDb'
import { redirect } from "next/navigation";
import Sidebar from '@/app/components/Sidebar';
import JobsClientPage from "./JobsClientPage";
import { buildThaiPersonNameVariants } from "@/app/lib/personName";
import { isMarketingManager as checkMarketingManager, isSalesOrMarketingManager } from "@/app/lib/roleHelper";
import { getRecursiveSubordinateEmpIds } from "@/app/lib/subordinates";
import { pickPrimaryJobLogisticsLinks } from "@/app/lib/logisticsTypes";

export const dynamic = 'force-dynamic';

export default async function JobsPage(props: { searchParams?: Promise<any> | any }) { 
  const [searchParams, user] = await Promise.all([
    props.searchParams ? props.searchParams : Promise.resolve({}),
    getUser(),
  ]);
  const actionParam = searchParams.action;
  const targetJobId = searchParams.jobId;

  if (!user || !user.isActive) {
    redirect('/')
  }

  const roleStr = (user.role || '').toLowerCase();
  const isSuperAdmin = 
    user.role === 'SUPER_ADMIN' || 
    roleStr === 'super_admin' || 
    roleStr === 'super admin' || 
    roleStr.includes('super_admin') || 
    roleStr.includes('superadmin') ||
    roleStr.includes('super admin') ||
    roleStr.includes('admin') ||
    roleStr.includes('administrator') ||
    roleStr.includes('ผู้ดูแลระบบ');
  const isExecutive = roleStr === 'ผู้บริหาร' || roleStr === 'executive';
  const isMarketingManager = checkMarketingManager(user.role);
  const isSalesManager = isSalesOrMarketingManager(user.role);
  const isServiceManager = roleStr.includes('service engineer mgr');
  const isOpsManager = roleStr.includes('warehouse, transport & purchasing manager') || roleStr.includes('ผู้จัดการฝ่ายคลังสินค้า') || roleStr.includes('คลังสินค้า') || roleStr.includes('จัดส่ง') || roleStr.includes('จัดซื้อ') || roleStr.includes('warehouse') || roleStr.includes('transport') || roleStr.includes('purchasing');
  const isManager = isSuperAdmin || isExecutive || isSalesManager || isServiceManager || isMarketingManager || isOpsManager; 
  
  const needsTeraDept = !user.employeeSale?.department;
  const [teraEmployee, subEmpIds] = await Promise.all([
    needsTeraDept || (!isSuperAdmin && !isExecutive && !isMarketingManager)
      ? teraDb.employees
          .findUnique({
            where: { emp_id: user.employeeId },
            include: { departments: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
    isSalesManager && !isSuperAdmin && !isExecutive && !isMarketingManager
      ? getRecursiveSubordinateEmpIds(user.employeeId)
      : Promise.resolve<string[]>([]),
  ]);
  
  const resolvedDept = user.employeeSale?.department || teraEmployee?.departments?.name || "sales";
  const isSalesDept = resolvedDept.toLowerCase().includes('sale') || resolvedDept.toLowerCase().includes('ขาย') || resolvedDept.includes('เซลส์') || resolvedDept.includes('เซลล์');
  const isSalesRole = roleStr.includes('sale') || roleStr.includes('ขาย') || roleStr.includes('เซลส์') || roleStr.includes('เซลล์');
  const isSales = !isSuperAdmin && !isExecutive && (isSalesDept || isSalesRole);

  let whereClause: any = {}; // Default to all jobs for non-sales (like Store, Accounting)
  
  if (isSuperAdmin || isExecutive) {
    whereClause = {}; // Super Admin & Executive see ALL jobs
  } else if (isMarketingManager) {
    whereClause = {}; // Marketing Manager sees all jobs
  } else if (isSalesManager) {
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
        { sellerName: "" },
      ],
    };
  } else if (isSales && !isServiceManager) {
    const userNames = buildThaiPersonNameVariants(
      user.fullName,
      user.employeeSale?.fullName,
      teraEmployee?.name
    );

    whereClause = {
      OR: [
        ...(userNames.length > 0 ? [{ sellerName: { in: userNames } }] : []),
        { quotation: { salespersonId: user.id } },
        { sellerName: null },
        { sellerName: "" },
      ],
    };
  }

  const jobs = await prisma.job.findMany({ 
    where: whereClause, 
    include: {
      quotation: { include: { orders: true } },
      stepLogs: { orderBy: { completedAt: "asc" } },
      paymentTasks: true,
      installationOrders: { orderBy: { createdAt: "desc" } },
      repairOrder: true,
      project: true,
      repairDeliveries: { orderBy: { createdAt: "desc" } },
    }, 
    orderBy: { dateClosed: "desc" }, 
  }); 

  const jobIds = jobs.map((j) => j.id);
  const rdToJobMap = new Map<string, string>();
  for (const j of jobs) {
    for (const rd of j.repairDeliveries || []) {
      rdToJobMap.set(rd.id, j.id);
    }
  }
  const rdIds = Array.from(rdToJobMap.keys());

  const rawLogisticsStops =
    jobIds.length > 0
      ? await prisma.logisticsTripStop
          .findMany({
            where: {
              trip: { status: { not: "CANCELLED" } },
              OR: [
                { jobId: { in: jobIds } },
                ...(rdIds.length > 0 ? [{ repairDeliveryId: { in: rdIds } }] : []),
              ],
            },
            select: {
              id: true,
              stopOrder: true,
              sourceType: true,
              jobId: true,
              repairDeliveryId: true,
              status: true,
              checkedInAt: true,
              deliveredAt: true,
              receiverName: true,
              failReason: true,
              trackingNumber: true,
              createdAt: true,
              updatedAt: true,
              trip: {
                select: {
                  id: true,
                  tripNumber: true,
                  status: true,
                  tripDate: true,
                  departureTime: true,
                  transportType: true,
                  vehiclePlate: true,
                  courierName: true,
                  driverName: true,
                },
              },
            },
          })
          .catch(() => [])
      : [];

  const jobLogisticsMap = pickPrimaryJobLogisticsLinks(rawLogisticsStops, rdToJobMap);
  const enrichedJobs = jobs.map((j) => ({
    ...j,
    logisticsLink: jobLogisticsMap.get(j.id) ?? null,
  }));

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-ibm-thai overflow-hidden">
      <Sidebar 
        activeRoute="/jobs" 
        userFullName={user.fullName} 
        userId={user.id} 
        userRole={user.role} 
      />
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc]">
        <JobsClientPage 
          jobs={JSON.parse(JSON.stringify(enrichedJobs))} 
          isManager={isManager} 
          isExecutive={isExecutive || isSuperAdmin}
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
