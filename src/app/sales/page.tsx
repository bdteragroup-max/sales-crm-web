import React from 'react';
import SalesClientPage from './SalesClientPage';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { teraDb } from '@/app/lib/teraDb';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    prefill?: string;
    companyId?: string;
    contactId?: string;
    editId?: string;
    reqId?: string;
  }>;
}

export default async function SalesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getUser();
  if (!user) redirect('/login');

  const roleStr = (user.role || '').toLowerCase();
  const isMarketingManager = roleStr.includes('marketing manager') || roleStr.includes('ผู้จัดการฝ่ายการตลาด') || roleStr.includes('ผู้จัดการการตลาด') || roleStr.includes('ผู้การจัดการตลาด');
  const isSalesManager = user.role === 'ผู้จัดการ' || roleStr.includes('sales manager') || isMarketingManager;
  const isServiceManager = roleStr.includes('service engineer mgr');
  const isManager = isSalesManager || isServiceManager;

  const deptTeraEmployee = await teraDb.employees.findUnique({
    where: { emp_id: user.employeeId },
    include: { departments: true }
  });
  
  const resolvedDept = user.employeeSale?.department || deptTeraEmployee?.departments?.name || "sales";
  const isSalesDept = resolvedDept.toLowerCase().includes('sale') || resolvedDept.toLowerCase().includes('ขาย') || resolvedDept.includes('เซลส์') || resolvedDept.includes('เซลล์');
  const isSalesRole = roleStr.includes('sale') || roleStr.includes('ขาย') || roleStr.includes('เซลส์') || roleStr.includes('เซลล์');
  const isSales = isSalesDept || isSalesRole;

  let teamMembers: { id: string; fullName: string }[] = [];
  if (isSalesManager) {
    const subordinates = await teraDb.employees.findMany({
      where: { supervisor_id: user.employeeId, is_active: true },
      select: { emp_id: true }
    });
    const subEmpIds = subordinates.map(s => s.emp_id);

    teamMembers = await prisma.user.findMany({
      where: isMarketingManager ? {
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
            { role: { contains: 'บริการ' } }
          ]
        }
      } : {
        OR: [
          { employeeId: { in: subEmpIds } },
          { employeeSale: { teamLeader: user.fullName } },
          { id: user.id }
        ]
      },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' }
    });
  } else {
    teamMembers = [{ id: user.id, fullName: user.fullName }];
  }

  // Managers see their team's records + unassigned; Reps see their own + any unassigned; Non-sales see everything
  let whereClause: any = {};
  if (isSalesManager) {
    whereClause = { OR: [{ salespersonId: { in: teamMembers.map(t => t.id) } }, { salespersonId: null }] };
  } else if (isSales && !isServiceManager) {
    whereClause = { OR: [{ salespersonId: user.id }, { salespersonId: null }] };
  }

  // ── Handle editId: load a specific quotation for editing (from pipeline click) ──
  let editingData: any = null;
  if (params.editId) {
    const quotationToEdit = await prisma.quotation.findUnique({
      where: { id: params.editId },
      include: {
        company: true,
        contact: true,
        salesperson: { include: { employeeSale: true } },
      },
    });
    // Only allow edit if the user owns it or is a manager
    if (
      quotationToEdit &&
      (isManager || quotationToEdit.salespersonId === user.id || quotationToEdit.salespersonId === null)
    ) {
      editingData = JSON.parse(JSON.stringify(quotationToEdit));
    }
  }

  // ── Handle prefill: load company/contact for a fresh new quotation ──
  let prefillData: any = null;
  if (!editingData && params.prefill === 'true' && params.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: params.companyId },
      include: {
        contacts: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (company) {
      let contact = null;
      if (params.contactId) {
        contact = company.contacts.find(c => c.id === params.contactId) || null;
      }
      if (!contact && company.contacts.length > 0) {
        contact = company.contacts[0];
      }
      prefillData = {
        company: JSON.parse(JSON.stringify(company)),
        contact: contact ? JSON.parse(JSON.stringify(contact)) : null
      };
    }
  }


  // ── Handle reqId: load requirement for a fresh new quotation ──
  if (!editingData && params.reqId) {
    const requirement = await prisma.customerRequirement.findUnique({
      where: { id: params.reqId }
    });
    
    if (requirement) {
      const company = await prisma.company.findFirst({
        where: { companyName: requirement.companyName },
        include: {
          contacts: {
            where: { contactName: requirement.contactName }
          }
        }
      });
      
      let inferredProductType = 'อื่นๆ';
      let inferredProductInterest = '';

      if (requirement.formData) {
        const fd = requirement.formData as any;
        let brand = '';
        let kw = '';
        let hp = '';
        let inputs: string[] = [];

        if (fd["สินค้า_INVERTER"]) {
          inferredProductType = 'Inverter Veichi';
          brand = fd["INVERTER_ยี่ห้อ"] || '';
          kw = fd["INVERTER_ขนาดเครื่อง_kW"] || '';
          hp = fd["INVERTER_ขนาดเครื่อง_HP"] || '';
          if (fd["INVERTER_Input_220V_1P"]) inputs.push('220V 1 Phase');
          if (fd["INVERTER_Input_220V_3P"]) inputs.push('220V 3 Phase');
          if (fd["INVERTER_Input_380V_3P"]) inputs.push('380V 3 Phase');
          if (fd["INVERTER_Input_อื่นๆ"]) inputs.push(fd["INVERTER_Input_อื่นๆ_ระบุ"] || 'อื่นๆ');
        } else if (fd["สินค้า_MOTOR"]) {
          inferredProductType = 'Motor';
          brand = fd["MOTOR_ยี่ห้อ"] || '';
          kw = fd["MOTOR_ขนาด_kW"] || '';
          hp = fd["MOTOR_ขนาด_HP"] || '';
        } else if (fd["สินค้า_PUMP"]) {
          inferredProductType = 'Pump';
          brand = fd["PUMP_ยี่ห้อ"] || '';
        } else if (fd["สินค้า_SOLAR_ROOF"]) {
          inferredProductType = 'Solar Roof';
        }

        const details = [];
        if (brand) details.push(`Brand: ${brand}`);
        if (kw || hp) details.push(`Size: ${kw ? kw + ' kW' : ''}${kw && hp ? ' / ' : ''}${hp ? hp + ' HP' : ''}`);
        if (inputs.length > 0) details.push(`Input: ${inputs.join(', ')}`);

        inferredProductInterest = details.join('\n');
      }

      prefillData = {
        requirementNumber: requirement.requirementNumber,
        requirementDate: requirement.date,
        productType: inferredProductType,
        productInterest: inferredProductInterest,
        company: company ? JSON.parse(JSON.stringify(company)) : { companyName: requirement.companyName },
        contact: (company && company.contacts.length > 0) ? JSON.parse(JSON.stringify(company.contacts[0])) : { contactName: requirement.contactName },
      };
    }
  }

  const [quotations, currentUserWithSale, businessTypesData, teraEmployee] = await Promise.all([
    prisma.quotation.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        company: true,
        contact: true,
        salesperson: { include: { employeeSale: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      include: { employeeSale: true },
    }),
    prisma.businessType.findMany({ orderBy: { name: 'asc' } }),
    user.employeeId ? teraDb.employees.findUnique({
      where: { emp_id: user.employeeId },
      include: { supervisor: true },
    }) : Promise.resolve(null),
  ]);

  const businessTypes = businessTypesData.map(bt => bt.name);

  return (
    <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:p-6 bg-white pb-24 md:pb-6">
      <SalesClientPage
        initialQuotations={JSON.parse(JSON.stringify(quotations))}
        businessTypes={businessTypes}
        currentUserSale={{
          branch: teraEmployee?.branch_id || currentUserWithSale?.employeeSale?.branch || '',
          teamLeader: teraEmployee?.supervisor?.name || currentUserWithSale?.employeeSale?.teamLeader || '',
        }}
        prefillData={prefillData}
        editingQuotation={editingData}
      />
    </main>
  );
}
