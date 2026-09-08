import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/app/lib/db'
import { redirect } from "next/navigation";
import Sidebar from '@/app/components/Sidebar';
import ProjectDetailClient from "./ProjectDetailClient";

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage(props: { params: Promise<{ id: string }> }) { 
  const params = await props.params;
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) redirect('/')

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  })

  if (!user || !user.isActive) redirect('/')

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      manager: {
        select: { id: true, fullName: true, role: true }
      },
      members: {
        include: {
          user: {
            select: { id: true, fullName: true, role: true, email: true, phoneNumber: true }
          }
        }
      },
      tasks: {
        include: {
          assignee: {
            select: { id: true, fullName: true }
          },
          subtasks: true
        },
        orderBy: [{ order: 'asc' }, { planStart: 'asc' }]
      },
      job: true,
      equipment: true
    }
  });

  if (!project) redirect('/projects')

  // Check access permission
  const roleLower = (user.role || '').toLowerCase();
  const isManager = user.role === 'ผู้จัดการ' || roleLower.includes('manager') || roleLower.includes('mgr') || user.role === 'Admin' || roleLower.includes('admin');
  const isMember = project.members.some(m => m.userId === user.id) || project.managerId === user.id;

  if (!isManager && !isMember) redirect('/projects')

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, role: true }
  });

function extractSearchKeywords(project: any): { keywords: string[]; primaryKeyword: string } {
  const terms = new Set<string>();
  let primaryKeyword = "";

  if (project.projectNumber) {
    terms.add(project.projectNumber);
    const numOnly = project.projectNumber.replace(/[-_\s]/g, "");
    if (numOnly.length >= 4) terms.add(numOnly);
  }

  if (project.job?.jobNumber) {
    terms.add(project.job.jobNumber);
    const jobNumOnly = project.job.jobNumber.replace(/[-_\s]/g, "");
    if (jobNumOnly.length >= 4) terms.add(jobNumOnly);
  }

  if (project.contractNumber && project.contractNumber.length >= 4) {
    terms.add(project.contractNumber);
  }

  if (project.name) {
    terms.add(project.name);
    // Strip common Thai & English prefixes like "โครงการ", "งาน", "Project:"
    const clean = project.name
      .replace(/^(Project|PJ|โครงการ|งานติดตั้ง|ติดตั้งระบบ|งาน|ก่อสร้าง|ระบบ)\s*[:\-\s]*/gi, "")
      .replace(/\s*(จำกัด|มหาชน|\(มหาชน\))\s*$/gi, "")
      .trim();
    if (clean.length >= 3) {
      terms.add(clean);
      primaryKeyword = clean;
    }
  }

  if (!primaryKeyword && project.name) {
    primaryKeyword = project.name;
  }

  if (project.clientName) {
    terms.add(project.clientName);
    const cleanClient = project.clientName
      .replace(/^(บริษัท|บจก\.|หจก\.|ห้างหุ้นส่วนจำกัด)\s*/gi, "")
      .replace(/\s*(จำกัด|มหาชน|\(มหาชน\))\s*$/gi, "")
      .trim();
    if (cleanClient.length >= 4) {
      terms.add(cleanClient);
    }
  }

  const list = Array.from(terms).filter((t) => t && t.length >= 3);
  return { keywords: list, primaryKeyword: primaryKeyword || project.name || "" };
}

  const { keywords: searchTerms, primaryKeyword } = extractSearchKeywords(project);

  const pos = await prisma.purchaseOrder.findMany({
    where: {
      OR: searchTerms.flatMap((term) => [
        { jobName: { contains: term, mode: "insensitive" } },
        { purchaseRequest: { projectName: { contains: term, mode: "insensitive" } } },
      ]),
    },
    orderBy: [
      { recordedAt: "desc" },
      { createdAt: "desc" },
    ],
  });

  const prs = await prisma.purchaseRequest.findMany({
    where: {
      OR: searchTerms.map((term) => ({ projectName: { contains: term, mode: "insensitive" } })),
    },
    include: {
      purchaseOrders: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedProject = JSON.parse(JSON.stringify(project));
  const serializedUser = JSON.parse(JSON.stringify(user));
  const serializedUsers = JSON.parse(JSON.stringify(users));
  const serializedPos = JSON.parse(JSON.stringify(pos));
  const serializedPrs = JSON.parse(JSON.stringify(prs));

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar activeRoute="/projects" userFullName={user.fullName} userId={user.employeeId} userRole={user.role} />
      <main className="flex-1 overflow-hidden relative flex flex-col h-full bg-gray-50/50 pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ProjectDetailClient 
            project={serializedProject} 
            currentUser={serializedUser} 
            isManager={isManager} 
            allUsers={serializedUsers} 
            pos={serializedPos}
            prs={serializedPrs}
            searchKeywords={searchTerms}
            primarySearchKeyword={primaryKeyword}
          />
        </div>
      </main>
    </div>
  )
}
