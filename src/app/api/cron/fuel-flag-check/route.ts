import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { sendPushToUser } from '@/app/lib/pushNotification';

// Haversine formula for distance calculation
function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d * 1.35; // Apply circuity factor to estimate driving distance
}

export async function GET(req: Request) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret') || req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    // Analyze yesterday's data
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yStr = yesterday.toISOString().split('T')[0];
    
    // Bounds for yesterday in UTC
    const startOfDay = new Date(`${yStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${yStr}T23:59:59.999Z`);

    const employees = await prisma.employees.findMany({
      where: { is_active: true },
      select: {
        emp_id: true,
        name: true,
        supervisor_id: true,
        branches: { select: { center_lat: true, center_lon: true } }
      }
    });

    const employeeIds = employees.map(e => e.emp_id);

    const checkins = await prisma.checkins.findMany({
      where: {
        emp_id: { in: employeeIds },
        date_key: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { timestamp: 'asc' }
    });

    const cards = await prisma.fleetcards.findMany({
      where: { emp_id: { in: employeeIds } }
    });
    
    const cardMap = new Map(cards.map(c => [c.card_no, c.emp_id]));
    const cardNos = cards.map(c => c.card_no);

    const fuelTx = await prisma.fleetcard_transactions.findMany({
      where: {
        card_no: { in: cardNos },
        date: { gte: startOfDay, lte: endOfDay },
        status: "Successful"
      }
    });

    const existingFlags = await prisma.fuelFlagReview.findMany({
      where: {
        employeeId: { in: employeeIds },
        flagDate: { gte: startOfDay, lte: endOfDay }
      }
    });

    let notifiedCount = 0;

    for (const emp of employees) {
      // Find fuel transactions for this employee
      const empCards = cards.filter(c => c.emp_id === emp.emp_id).map(c => c.card_no);
      const empFuelTxs = fuelTx.filter(tx => empCards.includes(tx.card_no));
      
      let fuelAmount = 0;
      let fuelLiters = 0;
      empFuelTxs.forEach(tx => {
        fuelAmount += Number(tx.amount);
        fuelLiters += Number(tx.liters);
      });

      if (fuelAmount > 0) {
        // Calculate distance
        const empCheckins = checkins.filter(c => c.emp_id === emp.emp_id);
        const validCheckins = empCheckins.filter(c => {
          const typeLower = c.type?.toLowerCase() || '';
          if (typeLower.includes('out') || typeLower.includes('ออก')) return false;
          const isOffsite = typeLower === 'นอกสถานที่' || typeLower.includes('offsite') || typeLower.includes('off_site') || c.customer_id != null || c.branch_name?.includes('นอกสถานที่');
          const isProject = c.project_name != null && c.project_name.trim() !== '';
          const isTrip = c.is_trip === true;
          return isOffsite || isProject || isTrip;
        });

        let calculatedDistance = 0;
        const branchLat = emp.branches?.center_lat ? Number(emp.branches.center_lat) : null;
        const branchLon = emp.branches?.center_lon ? Number(emp.branches.center_lon) : null;

        validCheckins.forEach((chk, idx) => {
          if (idx === 0) {
            if (branchLat && branchLon && chk.lat && chk.lon) {
              calculatedDistance += getDistanceFromLatLonInKm(branchLat, branchLon, Number(chk.lat), Number(chk.lon));
            }
          } else {
            const prevChk = validCheckins[idx - 1];
            if (prevChk.lat && prevChk.lon && chk.lat && chk.lon) {
              calculatedDistance += getDistanceFromLatLonInKm(Number(prevChk.lat), Number(prevChk.lon), Number(chk.lat), Number(chk.lon));
            }
          }
        });

        if (validCheckins.length > 0) {
          const lastChk = validCheckins[validCheckins.length - 1];
          if (branchLat && branchLon && lastChk.lat && lastChk.lon) {
            calculatedDistance += getDistanceFromLatLonInKm(Number(lastChk.lat), Number(lastChk.lon), branchLat, branchLon);
          }
        }

        const distance = parseFloat(calculatedDistance.toFixed(2));

        let generatedFlag = null;
        if (distance === 0) {
          generatedFlag = 'NO_GPS';
        } else if (fuelLiters > (distance / 5)) {
          generatedFlag = 'SUSPICIOUS_FUEL';
        }

        if (generatedFlag) {
          const hasReview = existingFlags.some(f => f.employeeId === emp.emp_id && f.flagType === generatedFlag);
          
          if (!hasReview) {
            // Create FuelFlagReview (unreviewed)
            await prisma.fuelFlagReview.create({
              data: {
                employeeId: emp.emp_id,
                flagDate: startOfDay,
                flagType: generatedFlag,
              }
            });

            // Notify Supervisor
            if (emp.supervisor_id) {
              const supervisorUser = await prisma.user.findFirst({
                where: { employeeId: emp.supervisor_id }
              });

              if (supervisorUser) {
                const title = "ตรวจสอบการเติมน้ำมันผิดปกติ";
                const body = `พนักงาน ${emp.name} มีการเติมน้ำมันผิดปกติ (${generatedFlag === 'NO_GPS' ? 'ไม่มีพิกัด GPS' : 'จำนวนลิตรสูงกว่าระยะทาง'}) เมื่อวันที่ ${yStr}`;
                


                await sendPushToUser(supervisorUser.id, {
                  title,
                  body,
                  url: '/department/fuel-report',
                  category: 'FUEL_FLAG',
                });
                
                notifiedCount++;
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, notified: notifiedCount });
  } catch (error: any) {
    console.error('Error in fuel flag check cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
