"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";
import { generateJobNumber } from "@/app/lib/job-utils";

export async function createProject(data: any) {
  try {
    let projectNumber = data.projectNumber;

    if (!projectNumber) {
      const yearPrefix = `PJ${new Date().getFullYear().toString().slice(-2)}-`;

      // Find the latest project starting with this year's prefix
      const latestProject = await prisma.project.findFirst({
        where: {
          projectNumber: {
            startsWith: yearPrefix,
          },
        },
        orderBy: {
          projectNumber: 'desc',
        },
      });

      if (latestProject && latestProject.projectNumber) {
        const lastSequence = parseInt(latestProject.projectNumber.replace(yearPrefix, ''), 10);
        if (!isNaN(lastSequence)) {
          const nextSequence = lastSequence + 1;
          projectNumber = `${yearPrefix}${nextSequence.toString().padStart(4, '0')}`;
        } else {
          projectNumber = `${yearPrefix}0001`;
        }
      } else {
        projectNumber = `${yearPrefix}0001`;
      }
    }

    const { companyCode, ...projectDataRaw } = data;
    let finalJobId = projectDataRaw.jobId;

    if (!finalJobId && companyCode) {
      const closedDate = new Date();
      const jobNum = await generateJobNumber(closedDate);
      const yearBe = (closedDate.getFullYear() + 543) % 100;
      const month = closedDate.getMonth() + 1;

      let managerName = projectDataRaw.contractSignatory;
      if (!managerName && projectDataRaw.managerId) {
        const m = await prisma.user.findUnique({ where: { id: projectDataRaw.managerId } });
        if (m) managerName = m.fullName;
      }

      const hasInstallments = projectDataRaw.installment1 || projectDataRaw.installment2 || projectDataRaw.installment3 || projectDataRaw.installment4;

      const job = await prisma.job.create({
        data: {
          jobNumber: jobNum,
          companyCode: companyCode,
          jobType: "งานโปรเจค",
          paymentMethod: hasInstallments ? "แบ่งชำระ" : undefined,
          month,
          yearBe,
          dateClosed: closedDate,
          customerName: projectDataRaw.clientName || projectDataRaw.name,
          sellerName: managerName || undefined,
          paymentDate: projectDataRaw.contractSigningDate ? new Date(projectDataRaw.contractSigningDate) : (projectDataRaw.paymentDate ? new Date(projectDataRaw.paymentDate) : undefined),
          deliveryDate: projectDataRaw.endDate ? new Date(projectDataRaw.endDate) : (projectDataRaw.deliveryDate ? new Date(projectDataRaw.deliveryDate) : undefined),
        }
      });
      finalJobId = job.id;
    }

    const project = await prisma.project.create({
      data: {
        ...projectDataRaw,
        jobId: finalJobId,
        projectNumber,
      },
    });

    // Automatically add the manager as a member if provided
    if (data.managerId) {
      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: data.managerId,
          role: "manager"
        }
      });
    }

    revalidatePath("/projects");
    return JSON.parse(JSON.stringify(project));
  } catch (error) {
    console.error("Error creating project:", error);
    throw new Error("Failed to create project");
  }
}

export async function updateProject(id: string, data: any) {
  try {
    const project = await prisma.project.update({
      where: { id },
      data,
    });
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return JSON.parse(JSON.stringify(project));
  } catch (error) {
    console.error("Error updating project:", error);
    throw new Error("Failed to update project");
  }
}

export async function deleteProject(id: string) {
  try {
    await prisma.project.delete({
      where: { id },
    });
    revalidatePath("/projects");
  } catch (error) {
    console.error("Error deleting project:", error);
    throw new Error("Failed to delete project");
  }
}

export async function addProjectMember(projectId: string, userId: string, role: string) {
  try {
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role,
      },
    });
    revalidatePath(`/projects/${projectId}`);
    return member;
  } catch (error) {
    console.error("Error adding project member:", error);
    throw new Error("Failed to add project member");
  }
}

export async function removeProjectMember(projectId: string, userId: string) {
  try {
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
    revalidatePath(`/projects/${projectId}`);
  } catch (error) {
    console.error("Error removing project member:", error);
    throw new Error("Failed to remove project member");
  }
}

export async function createTask(projectId: string, data: any) {
  try {
    const task = await prisma.projectTask.create({
      data: {
        ...data,
        projectId,
      },
    });
    revalidatePath(`/projects/${projectId}`);
    return task;
  } catch (error) {
    console.error("Error creating task:", error);
    throw new Error("Failed to create task");
  }
}

export async function updateTask(taskId: string, data: any) {
  try {
    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data,
    });
    revalidatePath(`/projects/${task.projectId}`);
    return task;
  } catch (error) {
    console.error("Error updating task:", error);
    throw new Error("Failed to update task");
  }
}

export async function deleteTask(taskId: string) {
  try {
    const task = await prisma.projectTask.delete({
      where: { id: taskId },
    });
    revalidatePath(`/projects/${task.projectId}`);
    return task;
  } catch (error) {
    console.error("Error deleting task:", error);
    throw new Error("Failed to delete task");
  }
}

export async function updateTaskStatus(taskId: string, status: string) {
  try {
    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data: { status },
    });
    revalidatePath(`/projects/${task.projectId}`);
    return task;
  } catch (error) {
    console.error("Error updating task status:", error);
    throw new Error("Failed to update task status");
  }
}

export async function updateTaskProgress(taskId: string, actualPct: number) {
  try {
    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data: { actualPct },
    });
    revalidatePath(`/projects/${task.projectId}`);
    return task;
  } catch (error) {
    console.error("Error updating task progress:", error);
    throw new Error("Failed to update task progress");
  }
}

export async function createProjectEquipment(projectId: string, data: any) {
  try {
    const equipment = await prisma.projectEquipment.create({
      data: {
        ...data,
        projectId,
      },
    });
    revalidatePath(`/projects/${projectId}`);
    return equipment;
  } catch (error) {
    console.error("Error creating equipment:", error);
    throw new Error("Failed to create equipment");
  }
}

export async function updateProjectEquipment(id: string, data: any) {
  try {
    const equipment = await prisma.projectEquipment.update({
      where: { id },
      data,
    });
    revalidatePath(`/projects/${equipment.projectId}`);
    return equipment;
  } catch (error) {
    console.error("Error updating equipment:", error);
    throw new Error("Failed to update equipment");
  }
}

export async function deleteProjectEquipment(id: string) {
  try {
    const equipment = await prisma.projectEquipment.delete({
      where: { id },
    });
    revalidatePath(`/projects/${equipment.projectId}`);
    return equipment;
  } catch (error) {
    console.error("Error deleting equipment:", error);
    throw new Error("Failed to delete equipment");
  }
}

export async function generateJobForProject(projectId: string, companyCode: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { manager: true }
    });
    if (!project) throw new Error("Project not found");
    if (project.jobId) throw new Error("Project already has a Job");

    const closedDate = new Date();
    const jobNum = await generateJobNumber(closedDate);
    const yearBe = (closedDate.getFullYear() + 543) % 100;
    const month = closedDate.getMonth() + 1;

    const hasInstallments = project.installment1 || project.installment2 || project.installment3 || project.installment4;

    const job = await prisma.job.create({
      data: {
        jobNumber: jobNum,
        companyCode: companyCode,
        jobType: "งานโปรเจค",
        paymentMethod: hasInstallments ? "แบ่งชำระ" : undefined,
        month,
        yearBe,
        dateClosed: closedDate,
        customerName: project.clientName || project.name,
        sellerName: project.contractSignatory || project.manager?.fullName || undefined,
        paymentDate: project.contractSigningDate || project.paymentDate || undefined,
        deliveryDate: project.endDate || project.deliveryDate || undefined,
      }
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { jobId: job.id }
    });

    revalidatePath("/projects");
    return JSON.parse(JSON.stringify(job));
  } catch (error) {
    console.error("Error generating job for project:", error);
    throw new Error("Failed to generate job");
  }
}
