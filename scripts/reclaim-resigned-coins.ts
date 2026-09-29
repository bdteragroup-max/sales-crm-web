import prisma from '../src/app/lib/db';
import { teraDb } from '../src/app/lib/teraDb';
import { reclaimCoinsOnInactive } from '../src/lib/coinReclaim';

async function main() {
  console.log('===========================================================');
  console.log('     RECLAIM COINS FOR RESIGNED / INACTIVE EMPLOYEES       ');
  console.log('===========================================================\n');

  // 1. Fetch resigned / inactive in HR db
  const hrResigned = await teraDb.employees.findMany({
    where: {
      OR: [
        { is_active: false },
        { resignation_date: { not: null } }
      ]
    },
    select: {
      emp_id: true,
      name: true,
      nickname: true,
      is_active: true,
      resignation_date: true
    }
  });
  const hrMap = new Map(hrResigned.map(e => [e.emp_id, e]));

  // 2. Fetch inactive in CRM db
  const crmInactive = await prisma.user.findMany({
    where: { isActive: false },
    select: { employeeId: true, fullName: true, role: true }
  });
  const crmMap = new Map(crmInactive.map(u => [u.employeeId, u]));

  const allEmpIds = Array.from(new Set([...hrMap.keys(), ...crmMap.keys()]));

  // 3. Find employees with positive coin balances
  const coins = await prisma.employee_coins.findMany({
    where: {
      emp_id: { in: allEmpIds },
      balance: { gt: 0 }
    },
    include: { coin_types: true }
  });

  const empCoinMap = new Map<string, Array<{ type: string; balance: number }>>();
  for (const c of coins) {
    if (!empCoinMap.has(c.emp_id)) empCoinMap.set(c.emp_id, []);
    empCoinMap.get(c.emp_id)!.push({ type: c.coin_type_id, balance: c.balance });
  }

  const targetEmpIds = Array.from(empCoinMap.keys());
  console.log(`Found ${targetEmpIds.length} resigned/inactive employees with positive coin balances.\n`);

  if (targetEmpIds.length === 0) {
    console.log('No coins to reclaim. All inactive employees already have 0 balance.');
    return;
  }

  const reclaimedTotals: Record<string, number> = {};
  const reportRows: Array<{
    empId: string;
    name: string;
    role: string;
    resDate: string;
    reclaimedSummary: string;
  }> = [];

  for (const empId of targetEmpIds) {
    const hr = hrMap.get(empId);
    const crm = crmMap.get(empId);
    const name = crm?.fullName || hr?.name || '(Unknown)';
    const role = crm?.role || '(No CRM User)';
    const resDate = hr?.resignation_date ? hr.resignation_date.toISOString().slice(0, 10) : '-';

    const coinsBefore = empCoinMap.get(empId) || [];
    const coinsStr = coinsBefore.map(c => `${c.type}: ${c.balance}`).join(', ');

    // Execute reclaim
    const res = await reclaimCoinsOnInactive(empId);

    for (const c of coinsBefore) {
      reclaimedTotals[c.type] = (reclaimedTotals[c.type] || 0) + c.balance;
    }

    reportRows.push({
      empId,
      name,
      role,
      resDate,
      reclaimedSummary: coinsStr
    });
  }

  console.log('| Emp ID | ชื่อ-นามสกุล | ตำแหน่ง | วันที่ลาออก | เหรียญที่ดึงคืน (Reclaimed) |');
  console.log('|---|---|---|---|---|');
  for (const row of reportRows) {
    console.log(`| ${row.empId} | ${row.name} | ${row.role} | ${row.resDate} | ${row.reclaimedSummary} |`);
  }

  console.log('\n=== TOTAL COINS RECLAIMED ===');
  console.log(reclaimedTotals);

  // Verification: ensure no positive balance left for these employees
  const remaining = await prisma.employee_coins.findMany({
    where: {
      emp_id: { in: targetEmpIds },
      balance: { gt: 0 }
    }
  });

  console.log(`\nVerification: Remaining positive balances among these employees = ${remaining.length}`);
  if (remaining.length === 0) {
    console.log('SUCCESS: All resigned employees have 0 coin balance!');
  } else {
    console.warn('WARNING: Some employees still have balance:', remaining);
  }
}

main().catch(console.error).finally(() => process.exit(0));
