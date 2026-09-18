import React from 'react';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import Sidebar from '@/app/components/Sidebar';
import { redirect } from 'next/navigation';
import ProjectDashboardClient from './ProjectDashboardClient';
import { isSuperUser, isReadOnlyExecutive } from '@/app/lib/roleHelper';

export const dynamic = 'force-dynamic';

export default async function ProjectDashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const roleLower = (user.role || '').toLowerCase();
  const isExecutive = isReadOnlyExecutive(user.role);
  const isManager = isExecutive ||
                    isSuperUser(user.role) ||
                    roleLower === 'ผู้จัดการ' || 
                    roleLower === 'sales manager' || 
                    roleLower.includes('admin project') || 
                    roleLower.includes('project admin') || 
                    roleLower.includes('admin') ||
                    user.role === 'Admin';

  if (!isManager) {
    redirect('/dashboard');
  }

  // Fetch all projects for the dashboard metrics
  const projects = await prisma.project.findMany({
    include: {
      tasks: true,
      equipment: true,
      job: {
        select: {
          id: true,
          jobNumber: true,
          companyCode: true,
          jobType: true,
        }
      },
      manager: {
        select: {
          id: true,
          fullName: true
        }
      },
      dailyLogs: {
        orderBy: { date: 'desc' },
        take: 10,
        include: {
          reporter: { select: { fullName: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const serializedProjects = JSON.parse(JSON.stringify(projects));

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/projects/dashboard" userFullName={user.fullName} userId={user.id} userRole={user.role} />
      
      <ProjectDashboardClient
        projects={serializedProjects}
        isExecutive={isExecutive}
        userRole={user.role}
      />
    </div>
  );
}
