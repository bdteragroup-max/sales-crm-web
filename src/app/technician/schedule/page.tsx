import React from 'react';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import ScheduleClientPage from './ScheduleClientPage';

export const dynamic = 'force-dynamic';

export default async function TechnicianSchedulePage() {
  const currentUser = await getUser();
  
  if (!currentUser) {
    redirect('/');
  }

  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, role: true }
  });

  const jobs = await prisma.job.findMany({
    select: { id: true, jobNumber: true, customerName: true }
  });

  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
    where: { status: { not: 'COMPLETED' } }
  });

  const validRoles = ['technician', 'ช่าง', 'ช่างประกอบ', 'ช่างตู้', 'ซ่อม'];
  const technicians = users.filter(u => validRoles.some(role => (u.role || '').toLowerCase().includes(role)));

  return (
    <div className="p-4 sm:p-8 w-full max-w-7xl mx-auto">
      <ScheduleClientPage 
        currentUser={currentUser}
        technicians={technicians}
        jobs={jobs}
        projects={projects}
      />
    </div>
  );
}
