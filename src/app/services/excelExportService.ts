import ExcelJS from 'exceljs';

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
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export async function generateFuelExcelBuffer(employee: any, month: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sales CRM';
  
  // 1. Total Month Sheet
  const totalSheet = workbook.addWorksheet('Total month');
  
  // Headers for Total Month
  totalSheet.columns = [
    { header: 'วันที่ (Date)', key: 'date', width: 12 },
    { header: 'ลำดับ (Loop)', key: 'loop', width: 8 },
    { header: 'วันที่ของเดือน (Day)', key: 'day', width: 10 },
    { header: 'เหตุผล (Reason)', key: 'reason', width: 25 },
    { header: 'ระยะทางรวม (กม.)', key: 'distance', width: 15 },
    { header: 'เรทค่าเสื่อม (บ/กม)', key: 'depreciationRate', width: 15 },
    { header: 'ยอดค่าเสื่อม (บ)', key: 'depreciationTotal', width: 15 },
    { header: 'เติมน้ำมัน (ลิตร)', key: 'fuelLiters', width: 15 },
    { header: 'ยอดเงิน Fleetcard (บ)', key: 'fuelAmount', width: 20 },
    { header: 'เบิกจ่าย Manual (บ)', key: 'manualAmount', width: 20 },
    { header: 'บาท/ลิตร', key: 'bahtPerLiter', width: 12 },
    { header: 'กม./ลิตร', key: 'kmPerLiter', width: 12 },
    { header: 'บาท/กม.', key: 'bahtPerKm', width: 12 },
    { header: 'จำนวนครั้งเติมน้ำมัน', key: 'refillCount', width: 20 },
    { header: 'Status Fleetcard', key: 'fleetStatus', width: 20 },
    { header: 'ผลการตรวจสอบ (Flag)', key: 'flags', width: 30 },
  ];

  totalSheet.getRow(1).font = { bold: true };
  totalSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  // Generate 31 days loop
  const yearStr = month.split('-')[0];
  const monthStr = month.split('-')[1];
  const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = d.toString().padStart(2, '0');
    const dateStr = `${month}-${dayStr}`;
    
    // Find if employee has data for this day
    const dayData = employee.dailyList?.find((day: any) => day.date === dateStr);
    
    const distance = dayData?.distance || 0;
    const fuelAmount = dayData?.fuelAmount || 0;
    const fuelLiters = dayData?.fuelLiters || 0;
    const manualAmount = dayData?.manualExpenseAmount || 0;
    
    const depreciationRate = 3;
    const depreciationTotal = distance * depreciationRate;
    
    const bahtPerLiter = fuelLiters > 0 ? (fuelAmount / fuelLiters).toFixed(2) : '-';
    const kmPerLiter = fuelLiters > 0 ? (distance / fuelLiters).toFixed(2) : '-';
    const bahtPerKm = distance > 0 ? (fuelAmount / distance).toFixed(2) : '-';
    
    const refillCount = fuelLiters > 0 ? 1 : 0; // Typically grouped by day, so assuming 1 if exists or could be tracked separately
    const fleetStatus = fuelAmount > 0 ? 'Included' : '-';
    const flags = dayData?.flags?.map((f: any) => f.type).join(', ') || '-';
    const reason = dayData?.checkinsList?.map((c: any) => c.type).join(', ') || '-';

    totalSheet.addRow({
      date: dateStr,
      loop: d,
      day: d,
      reason: reason,
      distance: distance.toFixed(2),
      depreciationRate: depreciationRate,
      depreciationTotal: depreciationTotal.toFixed(2),
      fuelLiters: fuelLiters.toFixed(2),
      fuelAmount: fuelAmount.toFixed(2),
      manualAmount: manualAmount.toFixed(2),
      bahtPerLiter: bahtPerLiter,
      kmPerLiter: kmPerLiter,
      bahtPerKm: bahtPerKm,
      refillCount: refillCount,
      fleetStatus: fleetStatus,
      flags: flags
    });
  }

  // 2. Travel Sheets (4 chunks: 1-7, 8-14, 15-21, 22-31)
  const tripChunks = [
    { name: 'Trips (1-7)', start: 1, end: 7 },
    { name: 'Trips (8-14)', start: 8, end: 14 },
    { name: 'Trips (15-21)', start: 15, end: 21 },
    { name: 'Trips (22-31)', start: 22, end: 31 }
  ];

  for (const chunk of tripChunks) {
    const sheet = workbook.addWorksheet(chunk.name);
    sheet.columns = [
      { header: 'วันที่ (Date)', key: 'date', width: 12 },
      { header: 'ลำดับ Check-in', key: 'order', width: 15 },
      { header: 'ประเภท/ชื่อสถานที่', key: 'locationName', width: 30 },
      { header: 'พิกัด (Lat, Lon)', key: 'coordinates', width: 25 },
      { header: 'ระยะทางแต่ละช่วง (กม.)', key: 'segmentDistance', width: 20 },
      { header: 'ปริมาณน้ำมัน (ลิตร)', key: 'liters', width: 20 }
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    for (let d = chunk.start; d <= Math.min(chunk.end, daysInMonth); d++) {
      const dayStr = d.toString().padStart(2, '0');
      const dateStr = `${month}-${dayStr}`;
      const dayData = employee.dailyList?.find((day: any) => day.date === dateStr);
      
      const checkins = dayData?.checkinsList || [];
      const fuelLiters = dayData?.fuelLiters || 0;

      if (checkins.length === 0) {
        // Show empty row for day without checkins as requested
        sheet.addRow({
          date: dateStr,
          order: '-',
          locationName: 'ไม่มีการเดินทาง (No Trips)',
          coordinates: '-',
          segmentDistance: '0.00',
          liters: fuelLiters > 0 ? fuelLiters.toFixed(2) : '-'
        });
        continue;
      }

      // Branch GPS fallback logic
      let startLat = employee.branch_lat;
      let startLon = employee.branch_lon;
      
      if (!startLat || !startLon || startLat === 0 || startLon === 0) {
         // Fallback to first checkin of the day
         if (checkins[0]?.lat && checkins[0]?.lon) {
           startLat = checkins[0].lat;
           startLon = checkins[0].lon;
         }
      }

      // 1. Add Branch/Start point
      sheet.addRow({
        date: dateStr,
        order: 'Start',
        locationName: employee.branch_name || 'จุดเริ่มต้น (สาขาหลัก)',
        coordinates: (startLat && startLon) ? `${startLat.toFixed(4)}, ${startLon.toFixed(4)}` : '-',
        segmentDistance: '-',
        liters: fuelLiters > 0 ? fuelLiters.toFixed(2) : '-' // Show liters on the start row
      });

      // 2. Add Checkins
      let prevLat = startLat;
      let prevLon = startLon;

      checkins.forEach((chk: any, idx: number) => {
        let segmentDistance = 0;
        if (prevLat && prevLon && chk.lat && chk.lon) {
           segmentDistance = getDistanceFromLatLonInKm(prevLat, prevLon, chk.lat, chk.lon);
        }

        sheet.addRow({
          date: '',
          order: `Check-in ${idx + 1}`,
          locationName: chk.project_name || chk.branch_name || chk.type,
          coordinates: (chk.lat && chk.lon) ? `${chk.lat.toFixed(4)}, ${chk.lon.toFixed(4)}` : '-',
          segmentDistance: segmentDistance.toFixed(2),
          liters: '-'
        });

        // Update prev coordinates for next segment
        if (chk.lat && chk.lon) {
           prevLat = chk.lat;
           prevLon = chk.lon;
        }
      });
      
      // Empty row for spacing
      sheet.addRow({});
    }
  }

  // Return buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
