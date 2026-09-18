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

      // Extract dynamic installments and deposit
      let depositItem: { amount: number; dueDate?: Date | null; title?: string } | null = null;
      let installmentList: any[] = [];

      if (projectDataRaw.installmentsData && typeof projectDataRaw.installmentsData === 'object' && !Array.isArray(projectDataRaw.installmentsData)) {
        const instData = projectDataRaw.installmentsData as any;
        if (instData.hasDeposit && instData.deposit && Number(instData.deposit.amount) > 0) {
          depositItem = {
            amount: parseFloat(instData.deposit.amount),
            dueDate: instData.deposit.dueDate ? new Date(instData.deposit.dueDate) : null,
            title: instData.deposit.title || 'เงินมัดจำเมื่อเซ็นสัญญา',
          };
        }
        if (Array.isArray(instData.installments)) {
          installmentList = instData.installments;
        }
      } else if (Array.isArray(projectDataRaw.installmentsData)) {
        installmentList = projectDataRaw.installmentsData;
      }

      if (!depositItem && projectDataRaw.firstPayment) {
        const fp = parseFloat(projectDataRaw.firstPayment);
        if (!isNaN(fp) && fp > 0) {
          depositItem = {
            amount: fp,
            dueDate: projectDataRaw.paymentDate ? new Date(projectDataRaw.paymentDate) : null,
            title: 'เงินมัดจำเมื่อเซ็นสัญญา',
          };
        }
      }

      const rawInstallments: Array<{ amount: number; dueDate?: Date | null; title?: string }> = [];
      if (installmentList.length > 0) {
        installmentList.forEach((inst: any) => {
          if (inst && inst.amount !== undefined && inst.amount !== null && String(inst.amount).trim() !== '') {
            const num = parseFloat(inst.amount);
            if (!isNaN(num) && num > 0) {
              rawInstallments.push({
                amount: num,
                dueDate: inst.dueDate ? new Date(inst.dueDate) : null,
                title: inst.title || undefined,
              });
            }
          }
        });
      } else {
        for (let i = 1; i <= 12; i++) {
          const val = projectDataRaw[`installment${i}`];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            const num = parseFloat(val);
            if (!isNaN(num) && num > 0) {
              rawInstallments.push({ amount: num });
            }
          }
        }
      }

      // Populate installment1..12 and firstPayment on projectDataRaw for quick SQL queries and backward compatibility
      for (let i = 1; i <= 12; i++) {
        projectDataRaw[`installment${i}`] = rawInstallments[i - 1] ? rawInstallments[i - 1].amount : null;
      }
      if (depositItem) {
        projectDataRaw.firstPayment = depositItem.amount;
      }

      const hasPaymentPlan = depositItem !== null || rawInstallments.length > 0;

      const job = await prisma.job.create({
        data: {
          jobNumber: jobNum,
          companyCode: companyCode,
          jobType: "งานโปรเจค",
          paymentMethod: hasPaymentPlan ? "แบ่งชำระ" : undefined,
          month,
          yearBe,
          dateClosed: closedDate,
          customerName: projectDataRaw.clientName || projectDataRaw.name,
          sellerName: managerName || undefined,
          paymentDate: depositItem?.dueDate || (projectDataRaw.contractSigningDate ? new Date(projectDataRaw.contractSigningDate) : (projectDataRaw.paymentDate ? new Date(projectDataRaw.paymentDate) : undefined)),
          deliveryDate: projectDataRaw.endDate ? new Date(projectDataRaw.endDate) : (projectDataRaw.deliveryDate ? new Date(projectDataRaw.deliveryDate) : undefined),
        }
      });
      finalJobId = job.id;

      // Create PaymentTasks for the new Job so it appears in Accounting
      const paymentTasksData: any[] = [];
      const startDate = projectDataRaw.startDate ? new Date(projectDataRaw.startDate) : closedDate;
      const endDate = projectDataRaw.endDate ? new Date(projectDataRaw.endDate) : (projectDataRaw.deliveryDate ? new Date(projectDataRaw.deliveryDate) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000));
      const totalDurationMs = endDate.getTime() - startDate.getTime();

      // 1. Deposit Task (if configured)
      if (depositItem) {
        paymentTasksData.push({
          jobId: finalJobId,
          status: 'รอดำเนินการ',
          dueDate: depositItem.dueDate || (projectDataRaw.contractSigningDate ? new Date(projectDataRaw.contractSigningDate) : closedDate),
          installmentNo: 0,
          installmentTotal: rawInstallments.length,
          installmentAmount: depositItem.amount,
          creditType: 'DEPOSIT',
          note: depositItem.title || 'เงินมัดจำเมื่อเซ็นสัญญา',
        });
      }

      // 2. Progress Installments Tasks
      if (rawInstallments.length > 0) {
        rawInstallments.forEach((inst, idx) => {
          let newDate = inst.dueDate || endDate;
          if (!inst.dueDate && rawInstallments.length > 1) {
            const fraction = idx / (rawInstallments.length - 1);
            newDate = new Date(startDate.getTime() + (totalDurationMs * fraction));
          }
          paymentTasksData.push({
            jobId: finalJobId,
            status: 'รอดำเนินการ',
            dueDate: newDate,
            installmentNo: idx + 1,
            installmentTotal: rawInstallments.length,
            installmentAmount: inst.amount,
            creditType: 'PROGRESS',
            note: inst.title ? `งวดที่ ${idx + 1}: ${inst.title}` : undefined,
          });
        });
      }

      if (paymentTasksData.length > 0) {
        await prisma.paymentTask.createMany({
          data: paymentTasksData,
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
      await syncProjectInstallmentsToPaymentTasks(project.id);
      revalidatePath("/jobs");
      revalidatePath("/accounting");
      revalidatePath("/accounting/dashboard");
    }
    return JSON.parse(JSON.stringify(project));
  } catch (error) {
    console.error("Error creating project:", error);
    throw new Error("Failed to create project");
  }
}

export async function updateProject(id: string, data: any) {
  try {
    const { companyCode, engineers, admins, tasks, ...projectDataRaw } = data;

    // Process dynamic installments if present in update data
    if (projectDataRaw.installmentsData !== undefined) {
      let instList: any[] = [];
      if (projectDataRaw.installmentsData && typeof projectDataRaw.installmentsData === 'object' && !Array.isArray(projectDataRaw.installmentsData)) {
        const instData = projectDataRaw.installmentsData as any;
        if (instData.hasDeposit && instData.deposit && Number(instData.deposit.amount) > 0) {
          projectDataRaw.firstPayment = parseFloat(instData.deposit.amount);
        } else if (instData.hasDeposit === false) {
          projectDataRaw.firstPayment = null;
        }
        if (Array.isArray(instData.installments)) {
          instList = instData.installments;
        }
      } else if (Array.isArray(projectDataRaw.installmentsData)) {
        instList = projectDataRaw.installmentsData;
      }

      for (let i = 1; i <= 12; i++) {
        const item = instList[i - 1];
        if (item && item.amount !== undefined && item.amount !== null && String(item.amount).trim() !== '') {
          const num = parseFloat(item.amount);
          projectDataRaw[`installment${i}`] = !isNaN(num) ? num : null;
        } else {
          projectDataRaw[`installment${i}`] = null;
        }
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: projectDataRaw,
    });

    // Synchronize team members if provided
    if (engineers !== undefined || admins !== undefined) {
      const currentMembers = await prisma.projectMember.findMany({
        where: { projectId: id },
      });

      const managerMember = currentMembers.find(m => m.role === 'manager');
      const managerUserId = projectDataRaw.managerId || managerMember?.userId || project.managerId;

      const desiredMembers = new Map<string, string>();
      if (managerUserId) {
        desiredMembers.set(managerUserId, 'manager');
      }
      if (Array.isArray(engineers)) {
        engineers.forEach((uid: string) => {
          if (uid && uid !== managerUserId) desiredMembers.set(uid, 'engineer');
        });
      }
      if (Array.isArray(admins)) {
        admins.forEach((uid: string) => {
          if (uid && uid !== managerUserId) desiredMembers.set(uid, 'admin');
        });
      }

      // Delete members who are no longer selected
      const toDelete = currentMembers.filter(m => !desiredMembers.has(m.userId));
      if (toDelete.length > 0) {
        await prisma.projectMember.deleteMany({
          where: { id: { in: toDelete.map(m => m.id) } },
        });
      }

      // Add or update members
      for (const [userId, role] of desiredMembers.entries()) {
        const existing = currentMembers.find(m => m.userId === userId);
        if (!existing) {
          await prisma.projectMember.create({
            data: { projectId: id, userId, role },
          });
        } else if (existing.role !== role) {
          await prisma.projectMember.update({
            where: { id: existing.id },
            data: { role },
          });
        }
      }
    }

    // Synchronize tasks if provided
    if (Array.isArray(tasks)) {
      for (const t of tasks) {
        if (t.id && !t.id.startsWith('temp-')) {
          await prisma.projectTask.update({
            where: { id: t.id },
            data: {
              title: t.title,
              category: t.category || null,
              assigneeId: t.assigneeId || null,
              planStart: t.planStart ? new Date(t.planStart) : null,
              planEnd: t.planEnd ? new Date(t.planEnd) : null,
              weight: t.weight ? parseFloat(t.weight) : 1,
            },
          });
        } else if (t.title) {
          await prisma.projectTask.create({
            data: {
              projectId: id,
              title: t.title,
              category: t.category || null,
              assigneeId: t.assigneeId || null,
              planStart: t.planStart ? new Date(t.planStart) : null,
              planEnd: t.planEnd ? new Date(t.planEnd) : null,
              weight: t.weight ? parseFloat(t.weight) : 1,
            },
          });
        }
      }
    }

    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    revalidatePath(`/projects/${id}/edit`);
    revalidatePath("/projects/dashboard");
    if (project.jobId) {
      await syncProjectInstallmentsToPaymentTasks(id);
      revalidatePath("/jobs");
      revalidatePath("/accounting");
      revalidatePath("/accounting/dashboard");
    }
    return JSON.parse(JSON.stringify(project));
  } catch (error) {
    console.error("Error updating project:", error);
    throw new Error("Failed to update project");
  }
}

function parseProjectInstallments(project: any) {
  let rawData = project.installmentsData;
  if (typeof rawData === "string") {
    try {
      rawData = JSON.parse(rawData);
    } catch (e) {}
  }

  let depositItem: {
    amount: number;
    percent?: number;
    dueDate?: Date | null;
    title?: string;
  } | null = null;

  let installmentList: Array<{
    no: number;
    title?: string;
    amount: number;
    percent?: number;
    dueDate?: Date | null;
  }> = [];

  if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
    if (rawData.hasDeposit && rawData.deposit && Number(rawData.deposit.amount) > 0) {
      depositItem = {
        amount: Number(rawData.deposit.amount),
        percent: rawData.deposit.percent ? Number(rawData.deposit.percent) : undefined,
        dueDate: rawData.deposit.dueDate ? new Date(rawData.deposit.dueDate) : null,
        title: rawData.deposit.title || "เงินมัดจำเมื่อเซ็นสัญญา",
      };
    }
    if (Array.isArray(rawData.installments)) {
      rawData.installments.forEach((it: any, idx: number) => {
        if (it && it.amount !== undefined && it.amount !== null && String(it.amount).trim() !== "") {
          const num = Number(it.amount);
          if (!isNaN(num) && num > 0) {
            installmentList.push({
              no: it.no || idx + 1,
              title: it.title || `งวดที่ ${idx + 1}`,
              amount: num,
              percent: it.percent ? Number(it.percent) : undefined,
              dueDate: it.dueDate ? new Date(it.dueDate) : null,
            });
          }
        }
      });
    }
  } else if (Array.isArray(rawData)) {
    rawData.forEach((it: any, idx: number) => {
      if (it && it.amount !== undefined && it.amount !== null && String(it.amount).trim() !== "") {
        const num = Number(it.amount);
        if (!isNaN(num) && num > 0) {
          installmentList.push({
            no: it.no || idx + 1,
            title: it.title || `งวดที่ ${idx + 1}`,
            amount: num,
            percent: it.percent ? Number(it.percent) : undefined,
            dueDate: it.dueDate ? new Date(it.dueDate) : null,
          });
        }
      }
    });
  }

  // Fallback to project.firstPayment if no deposit found in installmentsData
  if (!depositItem && project.firstPayment && Number(project.firstPayment) > 0) {
    depositItem = {
      amount: Number(project.firstPayment),
      dueDate: project.paymentDate ? new Date(project.paymentDate) : null,
      title: "เงินมัดจำเมื่อเซ็นสัญญา",
    };
  }

  // Fallback to project.installment1..12 columns if no installments found
  if (installmentList.length === 0) {
    for (let i = 1; i <= 12; i++) {
      const val = project[`installment${i}`];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        const num = Number(val);
        if (!isNaN(num) && num > 0) {
          installmentList.push({
            no: i,
            title: `งวดที่ ${i}`,
            amount: num,
          });
        }
      }
    }
  }

  return { depositItem, installmentList };
}

export async function syncProjectInstallmentsToPaymentTasks(projectId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        job: {
          include: {
            paymentTasks: true,
          },
        },
      },
    });

    if (!project || !project.job) return;

    const { depositItem, installmentList } = parseProjectInstallments(project);
    const jobId = project.job.id;
    const existingTasks = project.job.paymentTasks || [];

    if (!depositItem && installmentList.length === 0) return;

    const startDate = project.startDate ? new Date(project.startDate) : new Date(project.job.createdAt);
    const endDate = project.endDate
      ? new Date(project.endDate)
      : (project.job.deliveryDate
        ? new Date(project.job.deliveryDate)
        : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000));
    const totalDurationMs = endDate.getTime() - startDate.getTime();

    // 1. Handle Deposit Task
    if (depositItem) {
      const existingDepositTask = existingTasks.find(
        (t) => t.installmentNo === 0 || t.creditType === "DEPOSIT" || (t.status === "ชำระมัดจำแล้ว" && t.installmentNo === null)
      );

      if (existingDepositTask) {
        await prisma.paymentTask.update({
          where: { id: existingDepositTask.id },
          data: {
            installmentNo: 0,
            installmentTotal: installmentList.length,
            installmentAmount: depositItem.amount,
            creditType: "DEPOSIT",
            dueDate: existingDepositTask.dueDate || depositItem.dueDate || (project.contractSigningDate ? new Date(project.contractSigningDate) : startDate),
            note: existingDepositTask.note || depositItem.title || "เงินมัดจำเมื่อเซ็นสัญญา",
          },
        });
      } else {
        await prisma.paymentTask.create({
          data: {
            jobId,
            status: "รอดำเนินการ",
            dueDate: depositItem.dueDate || (project.contractSigningDate ? new Date(project.contractSigningDate) : startDate),
            installmentNo: 0,
            installmentTotal: installmentList.length,
            installmentAmount: depositItem.amount,
            creditType: "DEPOSIT",
            note: depositItem.title || "เงินมัดจำเมื่อเซ็นสัญญา",
          },
        });
      }
    }

    // 2. Handle Installments 1..N
    for (const inst of installmentList) {
      const existingInstTask = existingTasks.find((t) => t.installmentNo === inst.no);

      let calculatedDueDate = inst.dueDate;
      if (!calculatedDueDate && installmentList.length > 1) {
        const fraction = (inst.no - 1) / (installmentList.length - 1);
        calculatedDueDate = new Date(startDate.getTime() + totalDurationMs * fraction);
      } else if (!calculatedDueDate) {
        calculatedDueDate = endDate;
      }

      if (existingInstTask) {
        await prisma.paymentTask.update({
          where: { id: existingInstTask.id },
          data: {
            installmentTotal: installmentList.length,
            installmentAmount: inst.amount,
            dueDate: existingInstTask.dueDate || calculatedDueDate,
            note: existingInstTask.note || (inst.title ? `งวดที่ ${inst.no}: ${inst.title}` : `งวดที่ ${inst.no}`),
          },
        });
      } else {
        await prisma.paymentTask.create({
          data: {
            jobId,
            status: "รอดำเนินการ",
            dueDate: calculatedDueDate,
            installmentNo: inst.no,
            installmentTotal: installmentList.length,
            installmentAmount: inst.amount,
            note: inst.title ? `งวดที่ ${inst.no}: ${inst.title}` : `งวดที่ ${inst.no}`,
          },
        });
      }
    }

    // 3. Remove excess progress tasks if installment count was reduced
    const excessTasks = existingTasks.filter(
      (t) => t.installmentNo !== null && t.installmentNo > installmentList.length && (!t.paidAmount || t.paidAmount === 0) && t.status !== "ตรวจสอบและบันทึกแล้ว"
    );
    if (excessTasks.length > 0) {
      await prisma.paymentTask.deleteMany({
        where: { id: { in: excessTasks.map((t) => t.id) } },
      });
    }

    // 4. If no depositItem, remove unpaid deposit task
    if (!depositItem) {
      const unpaidDeposit = existingTasks.filter(
        (t) => (t.installmentNo === 0 || t.creditType === "DEPOSIT") && (!t.paidAmount || t.paidAmount === 0) && t.status !== "ตรวจสอบและบันทึกแล้ว"
      );
      if (unpaidDeposit.length > 0) {
        await prisma.paymentTask.deleteMany({
          where: { id: { in: unpaidDeposit.map((t) => t.id) } },
        });
      }
    }

    // 5. Remove unassigned legacy single task if it wasn't used for deposit or installment and has 0 paid
    const remainingLegacy = existingTasks.filter(
      (t) => t.installmentNo === null && t.creditType !== "DEPOSIT" && (!t.paidAmount || t.paidAmount === 0) && t.status === "รอดำเนินการ"
    );
    if (remainingLegacy.length > 0) {
      await prisma.paymentTask.deleteMany({
        where: { id: { in: remainingLegacy.map((t) => t.id) } },
      });
    }

    // 6. Run unified financial adjustment synchronization
    const { syncFinancialAdjustments } = await import("@/app/actions/accounting");
    await syncFinancialAdjustments(jobId);
  } catch (err) {
    console.error("Error syncing project installments to payment tasks:", err);
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

    let depositItem: { amount: number; dueDate?: Date | null; title?: string } | null = null;
    let installmentList: any[] = [];

    const instDataRaw = project.installmentsData as any;
    if (instDataRaw && typeof instDataRaw === 'object' && !Array.isArray(instDataRaw)) {
      if (instDataRaw.hasDeposit && instDataRaw.deposit && Number(instDataRaw.deposit.amount) > 0) {
        depositItem = {
          amount: parseFloat(instDataRaw.deposit.amount),
          dueDate: instDataRaw.deposit.dueDate ? new Date(instDataRaw.deposit.dueDate) : null,
          title: instDataRaw.deposit.title || 'เงินมัดจำเมื่อเซ็นสัญญา',
        };
      }
      if (Array.isArray(instDataRaw.installments)) {
        installmentList = instDataRaw.installments;
      }
    } else if (Array.isArray(instDataRaw)) {
      installmentList = instDataRaw;
    }

    if (!depositItem && project.firstPayment) {
      const fp = Number(project.firstPayment);
      if (!isNaN(fp) && fp > 0) {
        depositItem = {
          amount: fp,
          dueDate: project.paymentDate ? new Date(project.paymentDate) : null,
          title: 'เงินมัดจำเมื่อเซ็นสัญญา',
        };
      }
    }

    const rawInstallments: Array<{ amount: number; dueDate?: Date | null; title?: string }> = [];

    if (installmentList.length > 0) {
      installmentList.forEach((inst: any) => {
        if (inst && inst.amount !== undefined && inst.amount !== null) {
          const num = parseFloat(inst.amount);
          if (!isNaN(num) && num > 0) {
            rawInstallments.push({
              amount: num,
              dueDate: inst.dueDate ? new Date(inst.dueDate) : null,
              title: inst.title || undefined,
            });
          }
        }
      });
    } else {
      for (let i = 1; i <= 12; i++) {
        const val = (project as any)[`installment${i}`];
        if (val !== undefined && val !== null) {
          const num = Number(val);
          if (!isNaN(num) && num > 0) {
            rawInstallments.push({ amount: num });
          }
        }
      }
    }

    const hasPaymentPlan = depositItem !== null || rawInstallments.length > 0;

    const job = await prisma.job.create({
      data: {
        jobNumber: jobNum,
        companyCode: companyCode,
        jobType: "งานโปรเจค",
        paymentMethod: hasPaymentPlan ? "แบ่งชำระ" : undefined,
        month,
        yearBe,
        dateClosed: closedDate,
        customerName: project.clientName || project.name,
        sellerName: project.contractSignatory || project.manager?.fullName || undefined,
        paymentDate: depositItem?.dueDate || (project.contractSigningDate || project.paymentDate || undefined),
        deliveryDate: project.endDate || project.deliveryDate || undefined,
      }
    });

    const paymentTasksData: any[] = [];
    const startDate = project.startDate ? new Date(project.startDate) : closedDate;
    const endDate = project.endDate ? new Date(project.endDate) : (project.deliveryDate ? new Date(project.deliveryDate) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000));
    const totalDurationMs = endDate.getTime() - startDate.getTime();

    // 1. Deposit Task (if present)
    if (depositItem) {
      paymentTasksData.push({
        jobId: job.id,
        status: 'รอดำเนินการ',
        dueDate: depositItem.dueDate || (project.contractSigningDate ? new Date(project.contractSigningDate) : closedDate),
        installmentNo: 0,
        installmentTotal: rawInstallments.length,
        installmentAmount: depositItem.amount,
        creditType: 'DEPOSIT',
        note: depositItem.title || 'เงินมัดจำเมื่อเซ็นสัญญา',
      });
    }

    // 2. Progress Installments Tasks
    if (rawInstallments.length > 0) {
      rawInstallments.forEach((inst, idx) => {
        let newDate = inst.dueDate || endDate;
        if (!inst.dueDate && rawInstallments.length > 1) {
          const fraction = idx / (rawInstallments.length - 1);
          newDate = new Date(startDate.getTime() + (totalDurationMs * fraction));
        }
        paymentTasksData.push({
          jobId: job.id,
          status: 'รอดำเนินการ',
          dueDate: newDate,
          installmentNo: idx + 1,
          installmentTotal: rawInstallments.length,
          installmentAmount: inst.amount,
          creditType: 'PROGRESS',
          note: inst.title ? `งวดที่ ${idx + 1}: ${inst.title}` : undefined,
        });
      });
    }

    if (paymentTasksData.length > 0) {
      await prisma.paymentTask.createMany({
        data: paymentTasksData,
      });
    } else {
      await prisma.paymentTask.create({
        data: {
          jobId: job.id,
          status: 'รอดำเนินการ',
          dueDate: project.contractSigningDate ? new Date(project.contractSigningDate) : null,
        }
      });
    }

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
