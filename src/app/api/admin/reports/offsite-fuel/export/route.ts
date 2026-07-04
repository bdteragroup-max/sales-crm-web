import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/app/lib/db';
import { decrypt } from '@/app/lib/session';
import { generateFuelExcelBuffer } from '@/app/services/excelExportService';
import JSZip from 'jszip';

// Duplicate Haversine just for internal calculations if needed, though we use precalculated ones mostly
function deg2rad(deg: number) { return deg * (Math.PI/180); }
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; const dLat = deg2rad(lat2 - lat1); const dLon = deg2rad(lon2 - lon1); 
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c;
  return d * 1.35; // Apply circuity factor to estimate driving distance
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // e.g., '2026-07'
    const employeeId = searchParams.get('employeeId');
    const departmentId = searchParams.get('departmentId');
    const managerExport = searchParams.get('managerId'); // Optional, if manager is exporting their team
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!month && !(startDate && endDate)) return NextResponse.json({ error: 'Month or Date range parameter is required' }, { status: 400 });

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await decrypt(sessionCookie.value);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { employeeId: true, role: true }
    });
    if (!user || !user.employeeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let startOfMonth: Date;
    let endOfMonth: Date;
    const periodLabel = (startDate && endDate) ? `${startDate}_to_${endDate}` : month!;

    if (startDate && endDate) {
      const [y1, m1, d1] = startDate.split('-');
      startOfMonth = new Date(parseInt(y1), parseInt(m1) - 1, parseInt(d1), 0, 0, 0, 0);
      const [y2, m2, d2] = endDate.split('-');
      endOfMonth = new Date(parseInt(y2), parseInt(m2) - 1, parseInt(d2), 23, 59, 59, 999);
    } else {
      const [yearStr, monthStr] = month!.split('-');
      startOfMonth = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
      endOfMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0, 23, 59, 59, 999);
    }

    // 1. Determine which employees to fetch
    let employees: any[] = [];
    if (employeeId) {
      employees = await prisma.employees.findMany({
        where: { emp_id: employeeId },
        include: { branches: { select: { name: true, center_lat: true, center_lon: true } } }
      });
    } else if (departmentId) {
      employees = await prisma.employees.findMany({
        where: { department_id: parseInt(departmentId) },
        include: { branches: { select: { name: true, center_lat: true, center_lon: true } } }
      });
    } else if (managerExport || user.role === 'ผู้จัดการ' || user.role === 'manager') {
      const mgr = await prisma.employees.findUnique({ where: { emp_id: user.employeeId } });
      if (mgr) {
         employees = await prisma.employees.findMany({
            where: { department_id: mgr.department_id },
            include: { branches: { select: { name: true, center_lat: true, center_lon: true } } }
         });
      }
    } else {
      // Admin exporting everything if neither provided (fallback)
      employees = await prisma.employees.findMany({
        include: { branches: { select: { name: true, center_lat: true, center_lon: true } } }
      });
    }

    if (employees.length === 0) {
      return NextResponse.json({ error: 'No employees found' }, { status: 404 });
    }

    const employeeIds = employees.map(e => e.emp_id);

    // 2. Fetch Data (Checkins, Fleetcard, Flags, Manual Expenses)
    const checkins = await prisma.checkins.findMany({
      where: { emp_id: { in: employeeIds }, date_key: { gte: startOfMonth, lte: endOfMonth } },
      select: { emp_id: true, timestamp: true, date_key: true, distance: true, branch_name: true, type: true, customer_id: true, project_name: true, is_trip: true, lat: true, lon: true },
      orderBy: { timestamp: 'asc' }
    });

    const cards = await prisma.fleetcards.findMany({ where: { emp_id: { in: employeeIds } } });
    const cardMap = new Map(cards.map(c => [c.card_no, c.emp_id]));
    const cardNos = cards.map(c => c.card_no);
    const fuelTx = await prisma.fleetcard_transactions.findMany({
      where: { card_no: { in: cardNos }, date: { gte: startOfMonth, lte: endOfMonth }, status: "Successful" }
    });

    const flags = await prisma.fuelFlagReview.findMany({
      where: { employeeId: { in: employeeIds }, flagDate: { gte: startOfMonth, lte: endOfMonth } }
    });

    const usersForExpenses = await prisma.user.findMany({
      where: { employeeId: { in: employeeIds } },
      select: { id: true, employeeId: true, fullName: true }
    });
    
    const userIdToEmpIdMap = new Map(usersForExpenses.map(u => [u.id, u.employeeId]));
    const userIdsForExpenses = usersForExpenses.map(u => u.id);
    const manualExpenses = await prisma.branchExpense.findMany({
      where: { salespersonId: { in: userIdsForExpenses }, date: { gte: startOfMonth, lte: endOfMonth }, expenseType: { contains: 'Travel' } }
    });

    // 3. Process Data
    const reportData: Record<string, any> = {};
    employees.forEach(emp => {
      // Find full name from users if available, otherwise fallback to employees.name
      const userRec = usersForExpenses.find(u => u.employeeId === emp.emp_id);
      reportData[emp.emp_id] = {
        emp_id: emp.emp_id,
        name: userRec ? userRec.fullName : emp.name,
        branch_name: emp.branches?.name || null,
        branch_lat: emp.branches?.center_lat ? Number(emp.branches.center_lat) : null,
        branch_lon: emp.branches?.center_lon ? Number(emp.branches.center_lon) : null,
        dailyStats: {}
      };
    });

    checkins.forEach(c => {
      const typeLower = c.type?.toLowerCase() || '';
      if (typeLower.includes('out') || typeLower.includes('ออก')) return;
      const isOffsite = typeLower === 'นอกสถานที่' || typeLower.includes('offsite') || typeLower.includes('off_site') || c.customer_id != null || c.branch_name?.includes('นอกสถานที่');
      const isProject = c.project_name != null && c.project_name.trim() !== '';
      const isTrip = c.is_trip === true;
      if (!isOffsite && !isProject && !isTrip) return;

      const dateStr = c.date_key.toISOString().split('T')[0];
      const empData = reportData[c.emp_id].dailyStats;
      if (!empData[dateStr]) empData[dateStr] = { distance: 0, fuelAmount: 0, fuelLiters: 0, flags: [], manualExpenseAmount: 0, checkinsList: [] };

      empData[dateStr].checkinsList.push({
        time: c.timestamp.toISOString(),
        lat: c.lat ? Number(c.lat) : null,
        lon: c.lon ? Number(c.lon) : null,
        type: c.type,
        branch_name: c.branch_name,
        project_name: c.project_name,
        isOffsite, isProject, isTrip,
        distance: c.distance || 0
      });
      if (c.branch_name && !reportData[c.emp_id].branch_name) {
        reportData[c.emp_id].branch_name = c.branch_name;
      }
    });

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

    manualExpenses.forEach((exp: any) => {
      const emp_id = userIdToEmpIdMap.get(exp.salespersonId);
      if (emp_id && reportData[emp_id]) {
        const dateStr = exp.date.toISOString().split('T')[0];
        const empData = reportData[emp_id].dailyStats;
        if (!empData[dateStr]) empData[dateStr] = { distance: 0, fuelAmount: 0, fuelLiters: 0, flags: [], manualExpenseAmount: 0, checkinsList: [] };
        empData[dateStr].manualExpenseAmount += Number(exp.amount);
      }
    });

    Object.values(reportData).forEach((emp: any) => {
      Object.keys(emp.dailyStats).forEach(dateStr => {
        const stat = emp.dailyStats[dateStr];
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
        stat.distance = parseFloat(calculatedDistance.toFixed(2));
        stat.depreciation = stat.distance * 3;

        // Flags
        const existingFlags = flags.filter(f => f.employeeId === emp.emp_id && f.flagDate.toISOString().split('T')[0] === dateStr);
        if (existingFlags.length > 0) {
          stat.flags = existingFlags;
        } else {
          if (stat.fuelAmount > 0 && stat.distance === 0 && stat.checkinsList.length === 0) {
            stat.flags.push({ type: 'NO_GPS', description: 'เติมน้ำมันแต่วันนั้นไม่มี Check-in' });
          } else if (stat.fuelAmount === 0 && stat.distance > 0) {
            stat.flags.push({ type: 'NO_FUEL', description: 'มี Check-in แต่วันนั้นไม่ได้เติมน้ำมัน' });
          } else if (stat.fuelAmount > 0 && stat.distance > 0) {
            const thbPerKm = stat.fuelAmount / stat.distance;
            if (thbPerKm > 4.5 || thbPerKm < 1.5) {
               stat.flags.push({ type: 'SUSPICIOUS_FUEL', description: 'อัตราสิ้นเปลืองผิดปกติ' });
            }
          }
        }
      });
      
      emp.dailyList = Object.keys(emp.dailyStats).sort().map(k => ({
        date: k,
        ...emp.dailyStats[k]
      }));
    });

    // 4. Generate Export
    if (employeeId) {
       // Individual Export -> XLSX
       const empData = reportData[employeeId];
       if (!empData) return NextResponse.json({ error: 'No data for employee' }, { status: 404 });
       
       const buffer = await generateFuelExcelBuffer(empData, periodLabel);
       
       return new NextResponse(buffer as any, {
         status: 200,
         headers: {
           'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
           'Content-Disposition': `attachment; filename="Travel_Expense_${empData.name}_${periodLabel}.xlsx"`,
         }
       });
    } else {
       // Department Export -> ZIP
       const zip = new JSZip();
       
       // Process sequentially to save memory as requested
       const empValues = Object.values(reportData);
       for (const emp of empValues) {
          const buffer = await generateFuelExcelBuffer(emp, periodLabel);
          zip.file(`Travel_Expense_${emp.name}_${periodLabel}.xlsx`, buffer);
       }
       
       const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
       
       return new NextResponse(zipBuffer as any, {
         status: 200,
         headers: {
           'Content-Type': 'application/zip',
           'Content-Disposition': `attachment; filename="Travel_Expenses_Department_${periodLabel}.zip"`,
         }
       });
    }

  } catch (err: any) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
