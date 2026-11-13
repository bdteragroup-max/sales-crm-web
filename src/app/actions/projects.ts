"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";
import { generateJobNumber, stringToAdvisoryLockIds } from "@/app/lib/job-utils";
import { normalizeDateToCE } from "@/utils/thai-date";

import type { Prisma } from "../../generated/client";

type InstallmentEntry = {
  amount?: string | number | null;
  dueDate?: string | Date | null;
  title?: string | null;
};

type InstallmentsDataObject = {
  hasDeposit?: boolean;
  deposit?: InstallmentEntry | null;
  installments?: InstallmentEntry[];
};

type ProjectPlanSource = {
  installmentsData?: unknown;
  firstPayment?: string | number | null;
  paymentDate?: string | Date | null;
  contractSigningDate?: string | Date | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  deliveryDate?: string | Date | null;
  [key: string]: unknown;
};

function toDateOrNull(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") return new Date(val);
  return null;
}

function buildProjectPaymentPlan(
  source: ProjectPlanSource,
  closedDate: Date,
  options?: { syncArrayFieldsTo?: Record<string, unknown> }
) {
  let depositItem: { amount: number; dueDate?: Date | null; title?: string } | null = null;
  let installmentList: InstallmentEntry[] = [];

  const instDataRaw = source.installmentsData;
  if (instDataRaw && typeof instDataRaw === "object" && !Array.isArray(instDataRaw)) {
    const obj = instDataRaw as InstallmentsDataObject;
    if (obj.hasDeposit && obj.deposit && Number(obj.deposit.amount) > 0) {
      depositItem = {
        amount: parseFloat(String(obj.deposit.amount)),
        dueDate: toDateOrNull(obj.deposit.dueDate),
        title: obj.deposit.title || "เงินมัดจำเมื่อเซ็นสัญญา",
      };
    }
    if (Array.isArray(obj.installments)) {
      installmentList = obj.installments;
    }
  } else if (Array.isArray(instDataRaw)) {
    installmentList = instDataRaw as InstallmentEntry[];
  }

  if (!depositItem && source.firstPayment) {
    const fp = Number(source.firstPayment);
    if (!isNaN(fp) && fp > 0) {
      depositItem = {
        amount: fp,
        dueDate: toDateOrNull(source.paymentDate),
        title: "เงินมัดจำเมื่อเซ็นสัญญา",
      };
    }
  }

  const rawInstallments: Array<{ amount: number; dueDate?: Date | null; title?: string }> = [];
  if (installmentList.length > 0) {
    installmentList.forEach((inst) => {
      if (inst && inst.amount !== undefined && inst.amount !== null && String(inst.amount).trim() !== "") {
        const num = parseFloat(String(inst.amount));
        if (!isNaN(num) && num > 0) {
          rawInstallments.push({
            amount: num,
            dueDate: toDateOrNull(inst.dueDate),
            title: inst.title || undefined,
          });
        }
      }
    });
  } else {
    for (let i = 1; i <= 12; i++) {
      const val = source[`installment${i}`];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        const num = Number(val);
        if (!isNaN(num) && num > 0) {
          rawInstallments.push({ amount: num });
        }
      }
    }
  }

  if (options?.syncArrayFieldsTo) {
    for (let i = 1; i <= 12; i++) {
      options.syncArrayFieldsTo[`installment${i}`] = rawInstallments[i - 1]
        ? rawInstallments[i - 1].amount
        : null;
    }
    if (depositItem) {
      options.syncArrayFieldsTo.firstPayment = depositItem.amount;
    }
  }

  const startDate = toDateOrNull(source.startDate) ?? closedDate;
  const endDate =
    toDateOrNull(source.endDate) ??
    toDateOrNull(source.deliveryDate) ??
    new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const totalDurationMs = endDate.getTime() - startDate.getTime();
  const signingDate = toDateOrNull(source.contractSigningDate);

  const buildTasks = (jobId: string): Prisma.PaymentTaskCreateManyInput[] => {
    const tasks: Prisma.PaymentTaskCreateManyInput[] = [];
    if (depositItem) {
      tasks.push({
        jobId,
        status: "รอดำเนินการ",
        dueDate: depositItem.dueDate || signingDate || closedDate,
        installmentNo: 0,
        installmentTotal: rawInstallments.length,
        installmentAmount: depositItem.amount,
        creditType: "DEPOSIT",
        note: depositItem.title || "เงินมัดจำเมื่อเซ็นสัญญา",
      });
    }
    rawInstallments.forEach((inst, idx) => {
      let newDate = inst.dueDate || endDate;
      if (!inst.dueDate && rawInstallments.length > 1) {
        const fraction = idx / (rawInstallments.length - 1);
        newDate = new Date(startDate.getTime() + totalDurationMs * fraction);
      }
      tasks.push({
        jobId,
        status: "รอดำเนินการ",
        dueDate: newDate,
        installmentNo: idx + 1,
        installmentTotal: rawInstallments.length,
        installmentAmount: inst.amount,
        creditType: "PROGRESS",
        note: inst.title ? `งวดที่ ${idx + 1}: ${inst.title}` : undefined,
      });
    });
    return tasks;
  };

  return {
    depositItem,
    hasPaymentPlan: depositItem !== null || rawInstallments.length > 0,
    buildTasks,
  };
}

function sanitizeProjectDateFields(data: any) {
  if (!data || typeof data !== "object") return data;
  const cleaned = { ...data };
  const dateFields = [
    "startDate",
    "endDate",
    "deliveryDate",
    "contractSigningDate",
    "depositCollectionSchedule",
    "paymentDate",
    "warrantyStartDate",
    "warrantyEndDate",
    "siteCheckInTime",
    "siteCheckOutTime",
  ];

  for (const field of dateFields) {
    if (cleaned[field] !== undefined) {
      cleaned[field] = cleaned[field] ? normalizeDateToCE(cleaned[field]) : null;
    }
  }

  if (cleaned.installmentsData && typeof cleaned.installmentsData === "object" && !Array.isArray(cleaned.installmentsData)) {
    const instData = { ...cleaned.installmentsData };
    if (instData.deposit && instData.deposit.dueDate) {
      const d = normalizeDateToCE(instData.deposit.dueDate);
      instData.deposit = {
        ...instData.deposit,
        dueDate: d ? d.toISOString() : null,
      };
    }
    if (Array.isArray(instData.installments)) {
      instData.installments = instData.installments.map((inst: any) => {
        if (!inst || !inst.dueDate) return inst;
        const d = normalizeDateToCE(inst.dueDate);
        return {
          ...inst,
          dueDate: d ? d.toISOString() : null,
        };
      });
    }
    cleaned.installmentsData = instData;
  }

  return cleaned;
}

export async function createProject(data: any) {
  try {
    const sanitizedData = sanitizeProjectDateFields(data);
    const { companyCode, ...projectDataRaw } = sanitizedData;

    const txResult = await prisma.$transaction(async (tx) => {
      const lockKeys = [
        "project_seq",
        ...(projectDataRaw.jobId ? [`project_job:${projectDataRaw.jobId}`] : []),
      ].sort();
      for (const key of lockKeys) {
        const [k1, k2] = stringToAdvisoryLockIds(key);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${k1}::int, ${k2}::int)`;
      }

      // If caller passed a jobId that already has a linked Project, return the existing Project idempotently
      if (projectDataRaw.jobId) {
        const existingForJob = await tx.project.findUnique({
          where: { jobId: projectDataRaw.jobId },
        });
        if (existingForJob) {
          return {
            project: existingForJob,
            finalJobId: existingForJob.jobId,
            createdNewJob: false as const,
            reusedExisting: true as const,
          };
        }
      }

      let projectNumber = data.projectNumber;
      if (!projectNumber) {
        const yearPrefix = `PJ${new Date().getFullYear().toString().slice(-2)}-`;
        const latestProject = await tx.project.findFirst({
          where: {
            projectNumber: {
              startsWith: yearPrefix,
            },
          },
          orderBy: {
            projectNumber: "desc",
          },
        });

        let nextSequence = 1;
        if (latestProject && latestProject.projectNumber) {
          const lastSequence = parseInt(
            latestProject.projectNumber.replace(yearPrefix, ""),
            10
          );
          if (!isNaN(lastSequence)) {
            nextSequence = lastSequence + 1;
          }
        }
        projectNumber = `${yearPrefix}${nextSequence.toString().padStart(4, "0")}`;
        while (
          await tx.project.findFirst({
            where: { projectNumber },
            select: { id: true },
          })
        ) {
          nextSequence += 1;
          projectNumber = `${yearPrefix}${nextSequence.toString().padStart(4, "0")}`;
        }
      }

      let finalJobId = projectDataRaw.jobId;
      let createdNewJob = false;

      if (!finalJobId && companyCode) {
        const closedDate = new Date();
        const jobNum = await generateJobNumber(closedDate, tx);
        const yearBe = (closedDate.getFullYear() + 543) % 100;
        const month = closedDate.getMonth() + 1;

        let managerName = projectDataRaw.contractSignatory;
        if (!managerName && projectDataRaw.managerId) {
          const m = await tx.user.findUnique({ where: { id: projectDataRaw.managerId } });
          if (m) managerName = m.fullName;
        }

        const plan = buildProjectPaymentPlan(projectDataRaw, closedDate, {
          syncArrayFieldsTo: projectDataRaw,
        });

        const job = await tx.job.create({
          data: {
            jobNumber: jobNum,
            companyCode,
            jobType: "งานโปรเจค",
            paymentMethod: plan.hasPaymentPlan ? "แบ่งชำระ" : undefined,
            month,
            yearBe,
            dateClosed: closedDate,
            customerName: projectDataRaw.clientName || projectDataRaw.name,
            item: projectDataRaw.name ? `Project: ${projectDataRaw.name}` : undefined,
            sellerName: managerName || undefined,
            paymentDate:
              plan.depositItem?.dueDate ||
              (projectDataRaw.contractSigningDate
                ? new Date(projectDataRaw.contractSigningDate)
                : projectDataRaw.paymentDate
                ? new Date(projectDataRaw.paymentDate)
                : undefined),
            deliveryDate: projectDataRaw.endDate
              ? new Date(projectDataRaw.endDate)
              : projectDataRaw.deliveryDate
              ? new Date(projectDataRaw.deliveryDate)
              : undefined,
          },
        });
        finalJobId = job.id;
        createdNewJob = true;

        const paymentTasksData = plan.buildTasks(finalJobId);
        if (paymentTasksData.length > 0) {
          await tx.paymentTask.createMany({
            data: paymentTasksData,
          });
        } else {
          await tx.paymentTask.create({
            data: {
              jobId: finalJobId,
              status: "รอดำเนินการ",
              dueDate: projectDataRaw.contractSigningDate
                ? new Date(projectDataRaw.contractSigningDate)
                : null,
            },
          });
        }
      }

      const project = await tx.project.create({
        data: {
          ...projectDataRaw,
          jobId: finalJobId,
          projectNumber,
        },
      });

      if (data.managerId) {
        await tx.projectMember.create({
          data: {
            projectId: project.id,
            userId: data.managerId,
            role: "manager",
          },
        });
      }

      return {
        project,
        finalJobId,
        createdNewJob,
        reusedExisting: false as const,
      };
    });

    if (txResult.createdNewJob) {
      try {
        const { sendPushToRole } = await import("@/app/lib/webpush");
        await sendPushToRole(
          "บัญชี",
          "มีรายการเบิกจ่ายใหม่ (โครงการ)",
          "โครงการใหม่ถูกสร้างและมีรายการรอตรวจสอบแล้ว",
          "/accounting"
        );
      } catch (err) {
        console.error("Web push error (Accounting for projects):", err);
      }
    }

    if (!txResult.reusedExisting) {
      revalidatePath("/projects");
      revalidatePath("/projects/dashboard");
      if (txResult.finalJobId) {
        await syncProjectInstallmentsToPaymentTasks(txResult.project.id);
        revalidatePath("/jobs");
        revalidatePath("/accounting");
        revalidatePath("/accounting/dashboard");
      }
    }
    return JSON.parse(JSON.stringify(txResult.project));
  } catch (error) {
    console.error("Error creating project:", error);
    throw new Error("Failed to create project");
  }
}

async function syncCustomerCreditSettingName(oldCustomerName: string, newCustomerName: string) {
  const oldTrimmed = oldCustomerName.trim();
  const newTrimmed = newCustomerName.trim();
  if (!oldTrimmed || !newTrimmed || oldTrimmed.toLowerCase() === newTrimmed.toLowerCase()) return;

  try {
    const remainingWithOldName = await prisma.job.count({
      where: { customerName: { equals: oldTrimmed, mode: "insensitive" } },
    });
    if (remainingWithOldName > 0) return;

    const existingNew = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM customer_credit_settings WHERE LOWER(TRIM(customer_name)) = LOWER($1) LIMIT 1`,
      newTrimmed
    );
    if (existingNew && existingNew.length > 0) return;

    await prisma.$executeRawUnsafe(
      `UPDATE customer_credit_settings SET customer_name = $1, updated_at = NOW() WHERE LOWER(TRIM(customer_name)) = LOWER($2)`,
      newTrimmed,
      oldTrimmed
    );
  } catch (err) {
    console.error("Failed to sync customer_credit_settings customer_name:", err);
  }
}

export async function updateProject(id: string, data: any) {
  try {
    const sanitizedData = sanitizeProjectDateFields(data);
    const { companyCode, engineers, admins, tasks, ...projectDataRaw } = sanitizedData;

    // Process dynamic installments if present in update data
    if (projectDataRaw.installmentsData !== undefined) {
      let instList: any[] = [];
      let hasDepositAmount = false;
      if (projectDataRaw.installmentsData && typeof projectDataRaw.installmentsData === 'object' && !Array.isArray(projectDataRaw.installmentsData)) {
        const instData = projectDataRaw.installmentsData as any;
        if (instData.hasDeposit && instData.deposit && Number(instData.deposit.amount) > 0) {
          hasDepositAmount = true;
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

      const positiveInstCount = instList.filter((it) => it && Number(it.amount) > 0).length;

      // Guard: if the Project edit form submits blank installments, do NOT wipe Accounting's existing schedule
      if (!hasDepositAmount && positiveInstCount === 0) {
        const currentProj = await prisma.project.findUnique({
          where: { id },
          select: {
            jobId: true,
            job: {
              select: {
                paymentTasks: {
                  select: {
                    installmentNo: true,
                    installmentAmount: true,
                    paidAmount: true,
                    status: true,
                    creditType: true,
                    invoiceNumber: true,
                  },
                },
              },
            },
          },
        });
        const accountingHasSchedule = (currentProj?.job?.paymentTasks || []).some(
          (t) =>
            (t.installmentAmount !== null && Number(t.installmentAmount) > 0) ||
            (t.paidAmount !== null && Number(t.paidAmount) > 0) ||
            t.status === 'ตรวจสอบและบันทึกแล้ว' ||
            t.status === 'ชำระมัดจำแล้ว' ||
            t.creditType === 'DELIVERY' ||
            t.creditType === 'DEPOSIT' ||
            Boolean(t.invoiceNumber)
        );
        if (accountingHasSchedule) {
          delete projectDataRaw.installmentsData;
          delete projectDataRaw.firstPayment;
          for (let i = 1; i <= 12; i++) {
            delete projectDataRaw[`installment${i}`];
          }
        } else {
          for (let i = 1; i <= 12; i++) {
            projectDataRaw[`installment${i}`] = null;
          }
        }
      } else {
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
              planStart: t.planStart ? normalizeDateToCE(t.planStart) : null,
              planEnd: t.planEnd ? normalizeDateToCE(t.planEnd) : null,
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
              planStart: t.planStart ? normalizeDateToCE(t.planStart) : null,
              planEnd: t.planEnd ? normalizeDateToCE(t.planEnd) : null,
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
      const targetCustomerName = (project.clientName || project.name || "").trim();
      if (targetCustomerName) {
        const currentJob = await prisma.job.findUnique({
          where: { id: project.jobId },
          select: { id: true, customerName: true, item: true },
        });
        if (currentJob && (currentJob.customerName !== targetCustomerName || (!currentJob.item && project.name))) {
          const oldCustomerName = (currentJob.customerName || "").trim();
          await prisma.job.update({
            where: { id: currentJob.id },
            data: {
              customerName: targetCustomerName,
              ...(!currentJob.item && project.name ? { item: `Project: ${project.name}` } : {}),
            },
          });
          if (oldCustomerName && oldCustomerName !== targetCustomerName) {
            await syncCustomerCreditSettingName(oldCustomerName, targetCustomerName);
          }
        }
      }
      await syncProjectInstallmentsToPaymentTasks(id);
      revalidatePath("/jobs");
      revalidatePath("/accounting");
      revalidatePath("/accounting/dashboard");
      revalidatePath("/accounting/credit-settings");
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
    } catch (e) { }
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
        dueDate: rawData.deposit.dueDate ? normalizeDateToCE(rawData.deposit.dueDate) : null,
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
              dueDate: it.dueDate ? normalizeDateToCE(it.dueDate) : null,
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
            dueDate: it.dueDate ? normalizeDateToCE(it.dueDate) : null,
          });
        }
      }
    });
  }

  // Fallback to project.firstPayment if no deposit found in installmentsData
  if (!depositItem && project.firstPayment && Number(project.firstPayment) > 0) {
    depositItem = {
      amount: Number(project.firstPayment),
      dueDate: project.paymentDate ? normalizeDateToCE(project.paymentDate) : null,
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

    const targetCustomerName = (project.clientName || project.name || "").trim();
    if (targetCustomerName && (project.job.customerName !== targetCustomerName || (!project.job.item && project.name))) {
      const oldCustomerName = (project.job.customerName || "").trim();
      await prisma.job.update({
        where: { id: project.job.id },
        data: {
          customerName: targetCustomerName,
          ...(!project.job.item && project.name ? { item: `Project: ${project.name}` } : {}),
        },
      });
      if (oldCustomerName && oldCustomerName !== targetCustomerName) {
        await syncCustomerCreditSettingName(oldCustomerName, targetCustomerName);
      }
    }

    const { depositItem, installmentList } = parseProjectInstallments(project);
    const jobId = project.job.id;
    const existingTasks = project.job.paymentTasks || [];

    if (!depositItem && installmentList.length === 0) return;

    // Preserve Accounting's custom delivery-lot schedule if Accounting manages this job by delivery rounds
    const hasAccountingDeliveryLots = existingTasks.some((t) => t.creditType === "DELIVERY");
    if (hasAccountingDeliveryLots) return;

    const startDate = project.startDate ? (normalizeDateToCE(project.startDate) || new Date(project.startDate)) : new Date(project.job.createdAt);
    const endDate = project.endDate
      ? (normalizeDateToCE(project.endDate) || new Date(project.endDate))
      : (project.job.deliveryDate
        ? (normalizeDateToCE(project.job.deliveryDate) || new Date(project.job.deliveryDate))
        : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000));
    const totalDurationMs = endDate.getTime() - startDate.getTime();

    // 1. Handle Deposit Task
    if (depositItem) {
      const existingDepositTask = existingTasks.find(
        (t) => t.installmentNo === 0 || t.creditType === "DEPOSIT" || (t.status === "ชำระมัดจำแล้ว" && t.installmentNo === null)
      );

      if (existingDepositTask) {
        const isDepositLocked =
          existingDepositTask.status === "ตรวจสอบและบันทึกแล้ว" ||
          existingDepositTask.status === "ชำระมัดจำแล้ว" ||
          Boolean(existingDepositTask.paidAmount && existingDepositTask.paidAmount > 0) ||
          Boolean(existingDepositTask.invoiceNumber);

        await prisma.paymentTask.update({
          where: { id: existingDepositTask.id },
          data: {
            installmentNo: 0,
            installmentTotal: installmentList.length,
            installmentAmount: isDepositLocked && existingDepositTask.installmentAmount
              ? existingDepositTask.installmentAmount
              : depositItem.amount,
            creditType: existingDepositTask.creditType || "DEPOSIT",
            dueDate: existingDepositTask.dueDate || depositItem.dueDate || (project.contractSigningDate ? normalizeDateToCE(project.contractSigningDate) : startDate),
            note: existingDepositTask.note || depositItem.title || "เงินมัดจำเมื่อเซ็นสัญญา",
          },
        });
      } else {
        await prisma.paymentTask.create({
          data: {
            jobId,
            status: "รอดำเนินการ",
            dueDate: depositItem.dueDate || (project.contractSigningDate ? normalizeDateToCE(project.contractSigningDate) : startDate),
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
        const isInstLocked =
          existingInstTask.status === "ตรวจสอบและบันทึกแล้ว" ||
          existingInstTask.status === "ชำระมัดจำแล้ว" ||
          Boolean(existingInstTask.paidAmount && existingInstTask.paidAmount > 0) ||
          Boolean(existingInstTask.invoiceNumber);

        await prisma.paymentTask.update({
          where: { id: existingInstTask.id },
          data: {
            installmentTotal: installmentList.length,
            installmentAmount: isInstLocked && existingInstTask.installmentAmount
              ? existingInstTask.installmentAmount
              : inst.amount,
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

    // 3. Remove excess progress tasks ONLY if installmentList is non-empty and task has no payment/invoice/delivery history
    if (installmentList.length > 0) {
      const excessTasks = existingTasks.filter(
        (t) =>
          t.installmentNo !== null &&
          t.installmentNo > installmentList.length &&
          (!t.paidAmount || t.paidAmount === 0) &&
          t.status !== "ตรวจสอบและบันทึกแล้ว" &&
          t.status !== "ชำระมัดจำแล้ว" &&
          t.creditType !== "DELIVERY" &&
          !t.invoiceNumber
      );
      if (excessTasks.length > 0) {
        await prisma.paymentTask.deleteMany({
          where: { id: { in: excessTasks.map((t) => t.id) } },
        });
      }
    }

    // 4. If no depositItem, remove unpaid deposit task ONLY when it has no payment or invoice recorded
    if (!depositItem) {
      const unpaidDeposit = existingTasks.filter(
        (t) =>
          (t.installmentNo === 0 || t.creditType === "DEPOSIT") &&
          (!t.paidAmount || t.paidAmount === 0) &&
          t.status !== "ตรวจสอบและบันทึกแล้ว" &&
          t.status !== "ชำระมัดจำแล้ว" &&
          !t.invoiceNumber
      );
      if (unpaidDeposit.length > 0) {
        await prisma.paymentTask.deleteMany({
          where: { id: { in: unpaidDeposit.map((t) => t.id) } },
        });
      }
    }

    // 5. Remove unassigned legacy single task if it wasn't used for deposit or installment and has 0 paid
    const remainingLegacy = existingTasks.filter(
      (t) =>
        t.installmentNo === null &&
        t.creditType !== "DEPOSIT" &&
        t.creditType !== "DELIVERY" &&
        (!t.paidAmount || t.paidAmount === 0) &&
        t.status === "รอดำเนินการ" &&
        !t.invoiceNumber
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
    const taskData = { ...data };
    if (taskData.planStart !== undefined) taskData.planStart = taskData.planStart ? normalizeDateToCE(taskData.planStart) : null;
    if (taskData.planEnd !== undefined) taskData.planEnd = taskData.planEnd ? normalizeDateToCE(taskData.planEnd) : null;
    if (taskData.actualStart !== undefined) taskData.actualStart = taskData.actualStart ? normalizeDateToCE(taskData.actualStart) : null;
    if (taskData.actualEnd !== undefined) taskData.actualEnd = taskData.actualEnd ? normalizeDateToCE(taskData.actualEnd) : null;

    const task = await prisma.projectTask.create({
      data: {
        ...taskData,
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
    const taskData = { ...data };
    if (taskData.planStart !== undefined) taskData.planStart = taskData.planStart ? normalizeDateToCE(taskData.planStart) : null;
    if (taskData.planEnd !== undefined) taskData.planEnd = taskData.planEnd ? normalizeDateToCE(taskData.planEnd) : null;
    if (taskData.actualStart !== undefined) taskData.actualStart = taskData.actualStart ? normalizeDateToCE(taskData.actualStart) : null;
    if (taskData.actualEnd !== undefined) taskData.actualEnd = taskData.actualEnd ? normalizeDateToCE(taskData.actualEnd) : null;

    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data: taskData,
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
    const job = await prisma.$transaction(async (tx) => {
      const [k1, k2] = stringToAdvisoryLockIds(`project_genjob:${projectId}`);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${k1}::int, ${k2}::int)`;

      const project = await tx.project.findUnique({
        where: { id: projectId },
        include: { manager: true },
      });
      if (!project) throw new Error("Project not found");
      if (project.jobId) throw new Error("Project already has a Job");

      const closedDate = new Date();
      const jobNum = await generateJobNumber(closedDate, tx);
      const yearBe = (closedDate.getFullYear() + 543) % 100;
      const month = closedDate.getMonth() + 1;

      const plan = buildProjectPaymentPlan(project as ProjectPlanSource, closedDate);

      const createdJob = await tx.job.create({
        data: {
          jobNumber: jobNum,
          companyCode,
          jobType: "งานโปรเจค",
          paymentMethod: plan.hasPaymentPlan ? "แบ่งชำระ" : undefined,
          month,
          yearBe,
          dateClosed: closedDate,
          customerName: project.clientName || project.name,
          item: project.name ? `Project: ${project.name}` : undefined,
          sellerName: project.contractSignatory || project.manager?.fullName || undefined,
          paymentDate:
            plan.depositItem?.dueDate ||
            (project.contractSigningDate || project.paymentDate || undefined),
          deliveryDate: project.endDate || project.deliveryDate || undefined,
        },
      });

      const paymentTasksData = plan.buildTasks(createdJob.id);
      if (paymentTasksData.length > 0) {
        await tx.paymentTask.createMany({
          data: paymentTasksData,
        });
      } else {
        await tx.paymentTask.create({
          data: {
            jobId: createdJob.id,
            status: "รอดำเนินการ",
            dueDate: project.contractSigningDate ? new Date(project.contractSigningDate) : null,
          },
        });
      }

      await tx.project.update({
        where: { id: projectId },
        data: { jobId: createdJob.id },
      });

      return createdJob;
    });

    revalidatePath("/projects");
    revalidatePath("/projects/dashboard");
    revalidatePath("/jobs");
    revalidatePath("/accounting");
    revalidatePath("/accounting/dashboard");
    return JSON.parse(JSON.stringify(job));
  } catch (error) {
    console.error("Error generating job for project:", error);
    throw new Error("Failed to generate job");
  }
}
