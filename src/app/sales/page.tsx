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
  }>;
}

export default async function SalesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getUser();
  if (!user) redirect('/login');

  const isManager = user.role === 'ผู้จัดการ';

  let teamMembers: { id: string; fullName: string }[] = [];
  if (isManager) {
    const subordinates = await teraDb.employees.findMany({
      where: { supervisor_id: user.employeeId, is_active: true },
      select: { emp_id: true }
    });
    const subEmpIds = subordinates.map(s => s.emp_id);

    teamMembers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { employeeId: { in: subEmpIds } },
          { id: user.id }
        ]
      },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' }
    });
  } else {
    teamMembers = [{ id: user.id, fullName: user.fullName }];
  }

  // Managers see their team's records + unassigned; Reps see their own + any unassigned
  const whereClause = isManager
    ? { OR: [{ salespersonId: { in: teamMembers.map(t => t.id) } }, { salespersonId: null }] }
    : { OR: [{ salespersonId: user.id }, { salespersonId: null }] };

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
