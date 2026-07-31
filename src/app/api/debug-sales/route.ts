import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';

export async function GET() {
  const salesTeam = await prisma.user.findMany({
    where: {
      isActive: true,
      NOT: {
        OR: [
          { role: 'อื่นๆ' },
          { role: { contains: 'accounting' } },
          { role: { contains: 'บัญชี' } },
          { role: { contains: 'purchasing' } },
          { role: { contains: 'จัดซื้อ' } },
          { role: { contains: 'warehouse' } },
          { role: { contains: 'คลังสินค้า' } },
          { role: { contains: 'service' } },
          { role: { contains: 'บริการ' } },
          { role: { contains: 'project' } },
          { role: { contains: 'โครงการ' } },
          { role: { contains: 'admin' } },
          { role: { contains: 'ธุรการ' } },
          { role: { contains: 'executive' } },
          { role: { contains: 'ผู้บริหาร' } }
        ]
      }
    },
    select: {
      id: true,
      fullName: true,
      employeeId: true,
      employeeSale: {
        select: {
          department: true,
          branch: true,
        }
      }
    }
  });

  const empIds = salesTeam.map(r => r.employeeId).filter(Boolean);
  let hrEmployees: any[] = [];
  try {
    hrEmployees = await teraDb.employees.findMany({
      where: { emp_id: { in: empIds } },
      select: { emp_id: true, branch_id: true, department_id: true }
    });
  } catch (e) {
    console.error(e);
  }

  return NextResponse.json({ salesTeam, hrEmployees });
}
