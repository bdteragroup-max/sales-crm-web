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

      // Create PaymentTasks for the new Job so it appears in Accounting
      const installments = [];
      if (projectDataRaw.installment1) installments.push({ amount: projectDataRaw.installment1 });
      if (projectDataRaw.installment2) installments.push({ amount: projectDataRaw.installment2 });
      if (projectDataRaw.installment3) installments.push({ amount: projectDataRaw.installment3 });
      if (projectDataRaw.installment4) installments.push({ amount: projectDataRaw.installment4 });

      if (installments.length > 0) {
        const startDate = projectDataRaw.startDate ? new Date(projectDataRaw.startDate) : closedDate;
        const endDate = projectDataRaw.endDate ? new Date(projectDataRaw.endDate) : (projectDataRaw.deliveryDate ? new Date(projectDataRaw.deliveryDate) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000));
        const totalDurationMs = endDate.getTime() - startDate.getTime();

        await prisma.paymentTask.createMany({
          data: installments.map((inst, idx) => {
            let newDate = endDate;
            if (installments.length > 1) {
              const fraction = idx / (installments.length - 1);
              newDate = new Date(startDate.getTime() + (totalDurationMs * fraction));
            }
            return {
              jobId: finalJobId,
              status: 'รอดำเนินการ',
              dueDate: newDate,
              installmentNo: idx + 1,
              installmentTotal: installments.length,
              installmentAmount: parseFloat(inst.amount),
            };
          })
        });
      } else {
        await prisma.paymentTask.create({
          data: {
            jobId: finalJobId,
            status: 'รอดำเนินการ',
            dueDate: projectDataRaw.contractSigningDate ? new Date(projectDataRaw.contractSigningDate) : null,
          }
        });
      }
      
      // Push Notification to Accounting
      try {
        const { sendPushToRole } = await import('@/app/lib/webpush');
        await sendPushToRole('บัญชี', 'มีรายการเบิกจ่ายใหม่ (โครงการ)', `โครงการใหม่ถูกสร้างและมีรายการรอตรวจสอบแล้ว`, '/accounting');
      } catch (err) {
        console.error("Web push error (Accounting for projects):", err);
      }
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
    revalidatePath("/projects/dashboard");
    if (finalJobId) {
      revalidatePath("/jobs");
    }
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
    revalidatePath("/projects/dashboard");
    if (project.jobId) {
      revalidatePath("/jobs");
    }
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
    revalidatePath("/projects/dashboard");
    revalidatePath("/jobs");
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
    revalidatePath("/projects");
    revalidatePath("/projects/dashboard");
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
    revalidatePath("/projects");
    revalidatePath("/projects/dashboard");
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
    revalidatePath("/projects");
    revalidatePath("/projects/dashboard");
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
    revalidatePath("/projects");
    revalidatePath("/projects/dashboard");
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
    revalidatePath("/projects");
    revalidatePath("/projects/dashboard");
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
    revalidatePath("/projects");
    revalidatePath("/projects/dashboard");
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
    revalidatePath("/projects");
    revalidatePath("/projects/dashboard");
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
    revalidatePath("/projects");
    revalidatePath("/projects/dashboard");
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
    revalidatePath("/projects");
    revalidatePath("/projects/dashboard");
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
    revalidatePath("/projects");
    revalidatePath("/projects/dashboard");
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
    revalidatePath("/projects/dashboard");
    revalidatePath("/jobs");
    return JSON.parse(JSON.stringify(job));
  } catch (error) {
    console.error("Error generating job for project:", error);
    throw new Error("Failed to generate job");
  }
}
