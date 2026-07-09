import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/app/lib/db';
import { decrypt } from '@/app/lib/session';

// Haversine formula for distance calculation
function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c;
  return d * 1.35; // Apply circuity factor to estimate driving distance
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // e.g., '2026-07'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const session = (await cookies()).get('session')?.value;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await decrypt(session);
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { 
        employeeId: true,
        role: true,
        employeeSale: { select: { position: true } }
      }
    });

    if (!user?.employeeId) {
      return NextResponse.json({ error: 'User is not linked to an employee' }, { status: 400 });
    }

    const currentEmp = await prisma.employees.findUnique({
      where: { emp_id: user.employeeId },
      select: { department_id: true, emp_id: true, branch_id: true }
    });

    if (!currentEmp) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 400 });
    }

    const roleLower = (user.role || '').toLowerCase();
    const positionLower = (user.employeeSale?.position || '').toLowerCase();
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

    // Get employees in manager's department or directly supervised
    const employees = await prisma.employees.findMany({
      where: employeeWhereClause,
      select: { emp_id: true, name: true, branches: { select: { name: true, center_lat: true, center_lon: true } } }
    });

    const employeeIds = employees.map(e => e.emp_id);
    
    if (employeeIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    let startOfMonth: Date;
    let endOfMonth: Date;

    if (startDate && endDate) {
      const [y1, m1, d1] = startDate.split('-');
      startOfMonth = new Date(Date.UTC(parseInt(y1), parseInt(m1) - 1, parseInt(d1), 0, 0, 0, 0));
      const [y2, m2, d2] = endDate.split('-');
      endOfMonth = new Date(Date.UTC(parseInt(y2), parseInt(m2) - 1, parseInt(d2), 23, 59, 59, 999));
    } else if (month) {
      const [y, m] = month.split('-');
      const year = parseInt(y);
      const monthIdx = parseInt(m) - 1;
      startOfMonth = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0, 0));
      endOfMonth = new Date(Date.UTC(year, monthIdx + 1, 0, 23, 59, 59, 999));
    } else {
      const now = new Date();
      startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
      endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    }

    // 1. Fetch GPS Check-ins
    const checkins = await prisma.checkins.findMany({
      where: {
        emp_id: { in: employeeIds },
        date_key: { gte: startOfMonth, lte: endOfMonth }
      },
      select: { 
        emp_id: true, 
        timestamp: true, 
        date_key: true, 
        distance: true, 
        branch_name: true,
        type: true,
        customer_id: true,
        project_name: true,
        is_trip: true,
        lat: true,
        lon: true
      },
      orderBy: { timestamp: 'asc' }
    });

    // 2. Fetch Fleetcard transactions
    const cards = await prisma.fleetcards.findMany({
      where: { emp_id: { in: employeeIds } }
    });
    
    const cardMap = new Map(cards.map(c => [c.card_no, c.emp_id]));
    const cardNos = cards.map(c => c.card_no);

    const fuelTx = await prisma.fleetcard_transactions.findMany({
      where: {
        card_no: { in: cardNos },
        date: { gte: startOfMonth, lte: endOfMonth },
        status: "Successful"
      }
    });

    // 3. Fetch existing Flags/Reviews
    const flags = await prisma.fuelFlagReview.findMany({
      where: {
        employeeId: { in: employeeIds },
        flagDate: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    // 4. Fetch Manual Expenses (Travel)
    const usersForExpenses = await prisma.user.findMany({
      where: { employeeId: { in: employeeIds } },
      select: { id: true, employeeId: true }
    });
    
    const userIdToEmpIdMap = new Map(usersForExpenses.map(u => [u.id, u.employeeId]));
    const userIdsForExpenses = usersForExpenses.map(u => u.id);

    const manualExpenses = await prisma.branchExpense.findMany({
      where: {
        salespersonId: { in: userIdsForExpenses },
        date: { gte: startOfMonth, lte: endOfMonth },
        expenseType: { contains: 'Travel' }
      }
    });

    // Process data grouped by employee and date
    // Format: { [emp_id]: { [dateStr]: { checkins: [], fuelTxs: [], ... } } }
    const reportData: Record<string, any> = {};

    employees.forEach(emp => {
      reportData[emp.emp_id] = {
        emp_id: emp.emp_id,
        name: emp.name,
        branch_name: emp.branches?.name || null,
        branch_lat: emp.branches?.center_lat ? Number(emp.branches.center_lat) : null,
        branch_lon: emp.branches?.center_lon ? Number(emp.branches.center_lon) : null,
        dailyStats: {}
      };
    });

    // Group Checkins
    checkins.forEach(c => {
      const typeLower = c.type?.toLowerCase() || '';
      
      // Exclude check-outs
      if (typeLower.includes('out') || typeLower.includes('ออก')) return;

      const isOffsite = typeLower === 'นอกสถานที่' || typeLower.includes('offsite') || typeLower.includes('off_site') || c.customer_id != null || c.branch_name?.includes('นอกสถานที่');
      const isProject = c.project_name != null && c.project_name.trim() !== '';
      const isTrip = c.is_trip === true;

      // Only include offsite, project, and trip check-ins
      if (!isOffsite && !isProject && !isTrip) return;

      const dateStr = c.date_key.toISOString().split('T')[0];
      const empData = reportData[c.emp_id].dailyStats;
      if (!empData[dateStr]) empData[dateStr] = { distance: 0, fuelAmount: 0, fuelLiters: 0, flags: [], manualExpenseAmount: 0, checkinsList: [] };

      // Add to list for coordinates and details
      empData[dateStr].checkinsList.push({
        time: c.timestamp.toISOString(),
        lat: c.lat ? Number(c.lat) : null,
        lon: c.lon ? Number(c.lon) : null,
        type: c.type,
        branch_name: c.branch_name,
        project_name: c.project_name,
        isOffsite,
        isProject,
        isTrip,
        distance: c.distance || 0
      });

      // Fallback branch_name to the check-in's branch_name if missing
      if (c.branch_name && !reportData[c.emp_id].branch_name) {
        reportData[c.emp_id].branch_name = c.branch_name;
      }
    });

    // Group Fuel Txs
    fuelTx.forEach(tx => {
      const emp_id = cardMap.get(tx.card_no);
      if (emp_id && reportData[emp_id]) {
        const dateStr = tx.date.toISOString().split('T')[0];
        const empData = reportData[emp_id].dailyStats;
        if (!empData[dateStr]) empData[dateStr] = { distance: 0, fuelAmount: 0, fuelLiters: 0, flags: [], manualExpenseAmount: 0, checkinsList: [] };
        
        empData[dateStr].fuelAmount += Number(tx.amount);
        empData[dateStr].fuelLiters += Number(tx.liters);
      }
    });

    // Group Manual Expenses
    manualExpenses.forEach((exp: any) => {
      const emp_id = userIdToEmpIdMap.get(exp.salespersonId);
      if (emp_id && reportData[emp_id]) {
        const dateStr = exp.date.toISOString().split('T')[0];
        const empData = reportData[emp_id].dailyStats;
        if (!empData[dateStr]) empData[dateStr] = { distance: 0, fuelAmount: 0, fuelLiters: 0, flags: [], manualExpenseAmount: 0, checkinsList: [] };
        
        empData[dateStr].manualExpenseAmount += Number(exp.amount);
      }
    });

    // Apply Server-side Flag Logic and Attach Existing Reviews
    Object.values(reportData).forEach((emp: any) => {
      Object.keys(emp.dailyStats).forEach(dateStr => {
        const stat = emp.dailyStats[dateStr];
        
        // Calculate exact distance based on coordinates
        let calculatedDistance = 0;
        stat.checkinsList.forEach((chk: any, idx: number) => {
           if (idx === 0) {
              if (emp.branch_lat && emp.branch_lon && chk.lat && chk.lon) {
                 calculatedDistance += getDistanceFromLatLonInKm(emp.branch_lat, emp.branch_lon, chk.lat, chk.lon);
              }
           } else {
              const prevChk = stat.checkinsList[idx - 1];
              if (prevChk.lat && prevChk.lon && chk.lat && chk.lon) {
                 calculatedDistance += getDistanceFromLatLonInKm(prevChk.lat, prevChk.lon, chk.lat, chk.lon);
              }
           }
        });
        
        // Use calculated distance, round to 2 decimals for display/calc
        stat.distance = parseFloat(calculatedDistance.toFixed(2));
        stat.depreciation = stat.distance * 3; // 3 THB / km
        
        // Logic:
        // NO_GPS: Fuel transaction exists, but no GPS distance
        // SUSPICIOUS_FUEL: Fuel transaction exists, and liters > distance / 5 (example logic: 5km per liter minimum expected, if they fueled 50L and drove 10km, highly suspicious)
        
        let generatedFlag = null;
        if (stat.fuelAmount > 0) {
          if (stat.distance === 0) {
            generatedFlag = 'NO_GPS';
          } else if (stat.fuelLiters > (stat.distance / 5)) {
            generatedFlag = 'SUSPICIOUS_FUEL';
          }
        }

        // Check if there's a review for this
        const existingReview = flags.find(f => 
          f.employeeId === emp.emp_id && 
          f.flagDate.toISOString().split('T')[0] === dateStr
        );

        if (generatedFlag) {
           stat.flags.push({
             type: generatedFlag,
             review: existingReview || null
           });
        }
      });
    });

    // Flatten to an array for easier rendering
    const results = Object.values(reportData).map((emp: any) => {
      const dailyList = Object.keys(emp.dailyStats).map(dateStr => ({
        date: dateStr,
        ...emp.dailyStats[dateStr]
      })).sort((a, b) => a.date.localeCompare(b.date));

      return {
        ...emp,
        dailyList
      };
    });

    return NextResponse.json({ data: results });

  } catch (error: any) {
    console.error("Error generating fuel report:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
