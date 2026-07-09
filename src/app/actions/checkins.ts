"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";

export async function getManagerCheckins(dateStart?: Date, dateEnd?: Date, filterEmpId?: string) {
  const user = await getUser();
  if (!user || !user.employeeId) {
    throw new Error("Unauthorized");
  }

  // Find the current user's employee record to get department_id
  const currentEmp = await prisma.employees.findUnique({
    where: { emp_id: user.employeeId },
    select: { department_id: true, emp_id: true, branch_id: true }
  });

  if (!currentEmp) {
    throw new Error("Employee record not found");
  }

  const roleLower = (user.role || '').toLowerCase();
  const employeeSale = (user as any).employeeSale;
  const positionLower = (employeeSale?.position || '').toLowerCase();
  const isBranchManager = roleLower === 'ผู้จัดการ' || roleLower === 'manager' ||
                          roleLower.includes('branch') || roleLower.includes('สาขา') || 
                          positionLower.includes('branch') || positionLower.includes('สาขา') ||
                          positionLower === 'ผู้จัดการ' || positionLower === 'manager';

  const isExpenseAdmin = ['accounting', 'บัญชี', 'admin', 'finance', 'การเงิน'].some(r => roleLower.includes(r));

  let employeeWhereClause: any = {
    is_active: true,
    OR: [
      { department_id: currentEmp.department_id },
      { supervisor_id: currentEmp.emp_id }
    ]
  };

  if (isExpenseAdmin) {
    employeeWhereClause = { is_active: true }; // Admin/Accounting sees everyone
  } else if (isBranchManager && currentEmp.branch_id) {
    employeeWhereClause.branch_id = currentEmp.branch_id;
  }

  // Get all employees in the same department or directly supervised by this manager
  const supervisedEmployees = await prisma.employees.findMany({
    where: employeeWhereClause,
    select: {
      emp_id: true,
      name: true,
      nickname: true,
      branches: {
        select: {
          name: true,
          center_lat: true,
          center_lon: true
        }
      }
    }
  });

  const supervisedEmpIds = supervisedEmployees.map(e => e.emp_id);
  
  if (supervisedEmpIds.length === 0) {
    return { checkins: [], employees: [] };
  }

  // Query checkins based on supervised employees
  const whereClause: any = {
    emp_id: { in: supervisedEmpIds }
  };

  if (filterEmpId) {
    if (!supervisedEmpIds.includes(filterEmpId)) {
      throw new Error("Unauthorized access to this employee's check-ins");
    }
    whereClause.emp_id = filterEmpId;
  }

  if (dateStart && dateEnd) {
    whereClause.date_key = {
      gte: dateStart,
      lte: dateEnd
    };
  }

  // Convert BigInt id to string for client component serialization
  const rawCheckins = await prisma.checkins.findMany({
    where: whereClause,
    orderBy: { timestamp: 'desc' },
    take: 10000, // Increased limit to prevent dropping check-ins
  });

  const checkins = rawCheckins
    .filter(c => {
      const typeLower = c.type?.toLowerCase() || '';
      // Exclude check-outs
      if (typeLower.includes('out') || typeLower.includes('ออก')) return false;

      // Only include offsite, project, and trip
      const isOffsite = typeLower === 'นอกสถานที่' || typeLower.includes('offsite') || typeLower.includes('off_site') || c.customer_id != null || c.branch_name?.includes('นอกสถานที่');
      const isProject = c.project_name != null && c.project_name.trim() !== '';
      const isTrip = c.is_trip === true;

      return isOffsite || isProject || isTrip;
    })
    .map(c => ({
      ...c,
      id: c.id.toString(), // Convert BigInt to string
      lat: c.lat ? Number(c.lat) : null,
      lon: c.lon ? Number(c.lon) : null,
      timestamp: c.timestamp.toISOString(),
      date_key: c.date_key.toISOString(),
      time_key: c.time_key.toISOString(),
      employeeName: (() => {
        const emp = supervisedEmployees.find(e => e.emp_id === c.emp_id);
        if (emp) return `${emp.name}${emp.nickname ? ` (${emp.nickname})` : ''}`;
        return c.name;
      })(),
      branchLat: supervisedEmployees.find(e => e.emp_id === c.emp_id)?.branches?.center_lat ? Number(supervisedEmployees.find(e => e.emp_id === c.emp_id)?.branches?.center_lat) : null,
      branchLon: supervisedEmployees.find(e => e.emp_id === c.emp_id)?.branches?.center_lon ? Number(supervisedEmployees.find(e => e.emp_id === c.emp_id)?.branches?.center_lon) : null
    }));

  const serializedEmployees = supervisedEmployees.map(e => ({
    ...e,
    branches: e.branches ? {
      ...e.branches,
      center_lat: e.branches.center_lat ? Number(e.branches.center_lat) : null,
      center_lon: e.branches.center_lon ? Number(e.branches.center_lon) : null
    } : null
  }));

  return { checkins, employees: serializedEmployees };
}
