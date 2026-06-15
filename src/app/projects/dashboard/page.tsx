import React from 'react';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import Sidebar from '@/app/components/Sidebar';
import { redirect } from 'next/navigation';
import ProjectDashboardClient from './ProjectDashboardClient';

export const dynamic = 'force-dynamic';

export default async function ProjectDashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const roleLower = (user.role || '').toLowerCase();
  const isManager = roleLower === 'ผู้จัดการ' || 
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

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/projects/dashboard" userFullName={user.fullName} userId={user.id} userRole={user.role} />
      
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50 p-4 md:p-10 pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto w-full">
          <ProjectDashboardClient projects={projects} />
        </div>
      </main>
    </div>
  );
}
