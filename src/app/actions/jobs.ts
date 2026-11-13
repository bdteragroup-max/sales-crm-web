"use server";

import prisma from "@/app/lib/db";
import {
  generateJobNumber,
  mapProductTypeToJobType,
} from "@/app/lib/job-utils";
import { extractCompanyCode } from "@/utils/company-utils";
import { revalidatePath } from "next/cache";
import {
  getLineUserIdByCrmUserId,
  getLineUserIdByEmpId,
  jobStepMessage,
  pushLineMessage,
} from "@/app/lib/lineNotify";
import { isCompleted } from "@/app/lib/job-workflow";
import { getUser } from "@/app/lib/dal";

export type CreateJobInput = {
  quotationId: string;
  jobType?: string; // If not submitted → use default from QT
  poNumber?: string;
  closedDate?: Date; // If not submitted → use now()
  paymentMethod?: string; // e.g. "จ่ายแล้ว", "เครดิต", "ผ่อน", "เก็บเงินหน้างาน"
  installments?: {
    installmentNo: number;
    amount: number;
    dueDate: Date;
  }[];
  salesOrderDate?: Date;
  creditTerms?: string;
  creditDocsUrl?: string;
  billingRegulations?: string;
  billingDocsUrl?: string;
  percentageTerms?: string;
  deliveryDate?: Date;
  paymentDate?: Date;
  workName?: string;
  companyCode?: string; // TP, TG, or TE
  additionalInformation?: string;
  jobDocuments?: {
    type: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
  }[];
};

// ================================================
// createJobFromQuotation
// Called when QT is moved to "Invoice Opened" or "PO"
// ================================================
export async function createJobFromQuotation(input: CreateJobInput) {
  const { quotationId, jobType, poNumber, companyCode: inputCompanyCode } = input;
  const closedDate = input.closedDate ?? new Date();

  // 1. Retrieve Quotation data along with customer and creator
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      company: true, // customer
      salesperson: true, // seller
    },
  });

  if (!quotation) throw new Error(`Quotation ${quotationId} not found`);

  // Verify if a job already exists. If so, update it to keep data in sync with Quotation.
  const existingJob = await prisma.job.findFirst({
    where: { quotationId: quotation.id }
  });
  if (existingJob) {
    const updatedJob = await prisma.job.update({
      where: { id: existingJob.id },
      data: {
        customerName: quotation.company?.companyName ?? existingJob.customerName,
        item: input.workName || quotation.subject || quotation.productType || existingJob.item,
        quotationNumber: quotation.quotationNumber ?? existingJob.quotationNumber,
        poNumber: poNumber ?? existingJob.poNumber,
        sellerName: quotation.salesperson?.fullName ?? existingJob.sellerName,
        companyCode: inputCompanyCode ?? existingJob.companyCode,
        jobType: jobType ?? existingJob.jobType,
        paymentMethod: input.paymentMethod ?? existingJob.paymentMethod,
        salesOrderDate: input.salesOrderDate ?? existingJob.salesOrderDate,
        creditTerms: input.creditTerms ?? existingJob.creditTerms,
        creditDocsUrl: input.creditDocsUrl ?? existingJob.creditDocsUrl,
        billingRegulations: input.billingRegulations ?? existingJob.billingRegulations,
        billingDocsUrl: input.billingDocsUrl ?? existingJob.billingDocsUrl,
        percentageTerms: input.percentageTerms ?? existingJob.percentageTerms,
        deliveryDate: input.deliveryDate ?? existingJob.deliveryDate,
        paymentDate: input.paymentDate ?? existingJob.paymentDate,
        paymentStatus: input.paymentMethod === 'จ่ายแล้ว' ? 'paid' : existingJob.paymentStatus,
        additionalInformation: input.additionalInformation ?? existingJob.additionalInformation,
      }
    });

    if (input.jobDocuments && input.jobDocuments.length > 0) {
      const user = await import("@/app/lib/dal").then(m => m.getUser());
      await prisma.jobDocument.createMany({
        data: input.jobDocuments.map((doc) => ({
          jobId: updatedJob.id,
          type: doc.type,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          uploadedBy: user?.id || "System",
        })),
      });
    }

    revalidatePath("/jobs"); 
    return updatedJob;
  }

  // 2. Extract company code from QT number or use provided company code
  const companyCode = inputCompanyCode || extractCompanyCode(quotation.quotationNumber ?? "");

  // 3. jobType: Use the one sent or the default from productType in QT
  const resolvedJobType =
    jobType ?? mapProductTypeToJobType(quotation.productType);

  // 4. Generate atomic Job Number
  const jobNumber = await generateJobNumber(closedDate);

  // 5. Save Job 
  let job = await prisma.job.create({ 
    data: { 
      jobNumber, 
      companyCode, 
      jobType: resolvedJobType, 
      month: closedDate.getMonth() + 1, 
      yearBe: (closedDate.getFullYear() + 543) % 100, 
      dateClosed: closedDate, 
      customerName: quotation.company?.companyName ?? "", 
      item: input.workName || quotation.subject || quotation.productType || "", 
      quotationNumber: quotation.quotationNumber ?? "", 
      poNumber: poNumber ?? null, 
      sellerName: quotation.salesperson?.fullName ?? "", 
      quotationId,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === 'จ่ายแล้ว' ? 'paid' : 'pending',
      salesOrderDate: input.salesOrderDate,
      creditTerms: input.creditTerms,
      creditDocsUrl: input.creditDocsUrl,
      billingRegulations: input.billingRegulations,
      billingDocsUrl: input.billingDocsUrl,
      percentageTerms: input.percentageTerms,
      deliveryDate: input.deliveryDate,
      paymentDate: input.paymentDate,
      additionalInformation: input.additionalInformation,
    }, 
  }); 

  if (input.jobDocuments && input.jobDocuments.length > 0) {
    const user = await import("@/app/lib/dal").then(m => m.getUser());
    await prisma.jobDocument.createMany({
      data: input.jobDocuments.map((doc) => ({
        jobId: job.id,
        type: doc.type,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        uploadedBy: user?.id || "System",
      })),
    });
  }

  // Auto-approve the first step if it is a 'sales' step
  const { getSteps, getNextStep } = await import("@/app/lib/job-workflow");
  const firstStep = getSteps(resolvedJobType)[0];
  
  if (firstStep?.key === 'sales') {
    const nextStep = getNextStep(resolvedJobType, 'sales');
    if (nextStep) {
      await prisma.jobStepLog.create({
        data: {
          jobId: job.id,
          step: 'sales',
          completedBy: quotation.salesperson?.fullName ?? "System",
          department: "sales",
          note: "ดำเนินการอัตโนมัติเมื่อสร้างงาน",
        }
      });
      job = await prisma.job.update({
        where: { id: job.id },
        data: { currentStep: nextStep.key },
      });
    }
  }

  // Auto-create PaymentTasks
  if (input.paymentMethod === 'ผ่อนชำระ' && input.installments && input.installments.length > 0) {
    // Create multiple installment tasks
    await prisma.paymentTask.createMany({
      data: input.installments.map(inst => ({
        jobId: job.id,
        status: 'รอดำเนินการ',
        dueDate: inst.dueDate,
        installmentNo: inst.installmentNo,
        installmentTotal: input.installments!.length,
        installmentAmount: inst.amount,
      }))
    });
  } else {
    // Single payment task
    let dueDate = new Date(closedDate);
    if (input.paymentMethod?.includes('เครดิต 30 วัน') || input.paymentMethod === 'เครดิต') {
      dueDate.setDate(dueDate.getDate() + 30);
    } else if (input.paymentMethod?.includes('เครดิต 60 วัน')) {
      dueDate.setDate(dueDate.getDate() + 60);
    } else if (input.paymentMethod === 'เก็บเงินหน้างาน' || input.paymentMethod === 'จ่ายแล้ว') {
      dueDate.setDate(dueDate.getDate() + 7);
    }
    
    await prisma.paymentTask.create({
      data: {
        jobId: job.id,
        status: 'รอดำเนินการ',
        dueDate,
      }
    });
  }

  // Notify Service Manager if it's a Service Job or Installation Job
  const isPendingInstallation = ["ติดตั้ง", "ตรวจเช็ค"].some(t => resolvedJobType.includes(t));
  const isServiceRepair = ["ซ่อม", "เคลมประกัน", "เคลมประกัน/ซ่อมในประกัน"].some(t => resolvedJobType.includes(t));

  if (isPendingInstallation || isServiceRepair) {
    try {
      const { pushLineMessageToTeam, getServiceManagerLineIds, newServiceJobMessage, newPendingInstallationJobMessage } = await import('@/app/lib/lineNotify');
      const teamLineIds = await getServiceManagerLineIds();
      if (teamLineIds.length > 0) {
        if (isPendingInstallation) {
          // It will appear on the Installation Page as '-รอสร้างใบงาน-'
          await pushLineMessageToTeam(teamLineIds, [newPendingInstallationJobMessage(job)], 'service');
        } else {
          // Standard service job
          await pushLineMessageToTeam(teamLineIds, [newServiceJobMessage(job)], 'service');
        }
      }
    } catch (err) {
      console.error("Line notify error (Service job created):", err);
    }
  }

  revalidatePath("/jobs"); 
  revalidatePath("/accounting");
  return job;
}

// ================================================
// updateJob — Change jobType or poNumber later
// ================================================
export async function updateJob(
  jobId: string,
  data: { jobType?: string; poNumber?: string }
) {
  const job = await prisma.job.update({
    where: { id: jobId },
    data,
  });

  if (data.jobType && ["งานโปรเจค", "งานติดตั้ง", "งานขาย + ติดตั้ง"].includes(data.jobType)) {
    const existingProject = await prisma.project.findFirst({ where: { jobId: job.id } });
    if (!existingProject) {
      try {
        const { createProject } = await import("@/app/actions/projects");
        const manager = await prisma.user.findFirst({ where: { role: { contains: 'manager', mode: 'insensitive' } } });
        await createProject({
          name: `Project: ${job.customerName || job.jobNumber}`,
          clientName: job.customerName || undefined,
          jobId: job.id,
          managerId: manager?.id,
        });
      } catch (err) {
        console.error("Failed to auto-create project", err);
      }
    }
  }

  // Sync changes to Quotation to keep Sales & Pipeline pages in sync
  if (job.quotationId) {
    const quotationUpdate: any = {};
    if (data.jobType !== undefined) quotationUpdate.productType = data.jobType;
    if (data.poNumber !== undefined) quotationUpdate.poNumber = data.poNumber;
    
    // In src/app/actions/jobs.ts, data typing might not have quotationNumber, but if passed:
    if ('quotationNumber' in data && (data as any).quotationNumber !== undefined) {
      quotationUpdate.quotationNumber = (data as any).quotationNumber;
    }
    
    if (Object.keys(quotationUpdate).length > 0) {
      await prisma.quotation.update({
        where: { id: job.quotationId },
        data: quotationUpdate
      });
      revalidatePath("/sales");
      revalidatePath("/pipeline");
    }
  }

  revalidatePath("/jobs");
  revalidatePath("/projects");
  return job;
}

// ── กด confirm step ──────────────────────────────────────────
export async function confirmJobStep(payload: {
  jobId:       string
  stepKey:     string
  completedBy: string
  department:  string
  note?:       string
  variant?:    string   // ส่งมาตอน step แรก ถ้ามี variantQuestion
  deliveryMethod?: string
  deliveryDate?: string | Date
  courierCompany?: string
  trackingNumber?: string
  trackingPhotoUrl?: string
  prItems?: any[]
  supplierName?: string
  supplierPhone?: string
  totalAmount?: number
  poNumber?: string
  expectedDate?: string | Date
}) {
  const { jobId, stepKey, completedBy, department, note, variant, deliveryMethod, deliveryDate, courierCompany, trackingNumber, trackingPhotoUrl } = payload

  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) throw new Error("Job not found")

  // บันทึก step log
  await prisma.jobStepLog.create({
    data: { jobId, step: stepKey, completedBy, department, note: note ?? null },
  })

  // อัปเดต currentStep → step ถัดไป
  const { getNextStep } = await import("@/app/lib/job-workflow")
  const resolvedVariant = variant ?? job.flowVariant ?? undefined
  const nextStep = getNextStep(job.jobType, stepKey, resolvedVariant)

  await prisma.job.update({
    where: { id: jobId },
    data: {
      currentStep: nextStep?.key ?? stepKey, // ถ้าไม่มี next = จบแล้ว
      ...(variant ? { flowVariant: variant } : {}),
      ...(deliveryMethod ? { deliveryMethod } : {}),
      ...(deliveryDate ? { deliveryDate: new Date(deliveryDate) } : {}),
      ...(courierCompany ? { courierCompany } : {}),
      ...(trackingNumber ? { trackingNumber } : {}),
      ...(trackingPhotoUrl ? { trackingPhotoUrl } : {}),
    },
  })

  // ---- Notify relevant departments of the next step ----
  if (nextStep && nextStep.department.length > 0) {
    try {
      const { sendPushToUser } = await import('@/app/lib/pushNotification');
      
      const targetRoles = nextStep.department.map(d => ({
        role: { contains: d, mode: 'insensitive' as const }
      }));
      
      const targetUsers = await prisma.user.findMany({
        where: {
          OR: targetRoles,
          isActive: true
        }
      });
      
      const salesIncluded = nextStep.department.includes('sales');
      if (salesIncluded && job.sellerName) {
         const seller = await prisma.user.findFirst({
           where: { fullName: job.sellerName, isActive: true }
         });
         if (seller && !targetUsers.find(u => u.id === seller.id)) {
           targetUsers.push(seller);
         }
      }

      await Promise.all(
        targetUsers.map(user => sendPushToUser(user.id, {
          title: "งานใหม่รอการดำเนินการ",
          body: `งาน ${job.jobNumber} เข้าสู่ขั้นตอน ${nextStep.label}`,
          url: `/jobs`,
          category: 'JOB'
        }))
      );
    } catch (e) {
      console.error("Push notify error in confirmJobStep:", e);
    }
  }

  // === AUTO-CREATE PROJECT ===
  if (stepKey === "sales" && ["งานโปรเจค", "งานติดตั้ง", "งานขาย + ติดตั้ง"].includes(job.jobType)) {
    // Check if project already exists for this job
    const existingProject = await prisma.project.findFirst({ where: { jobId: job.id } });
    if (!existingProject) {
      try {
        const { createProject } = await import("@/app/actions/projects");
        const manager = await prisma.user.findFirst({ where: { role: { contains: 'manager', mode: 'insensitive' } } });
        
        await createProject({
          name: `Project: ${job.customerName || job.jobNumber}`,
          clientName: job.customerName || undefined,
          jobId: job.id,
          managerId: manager?.id,
        });
      } catch (err) {
        console.error("Failed to auto-create project", err);
      }
    }
  }

  // === PURCHASE FLOW LOGIC ===
  if (stepKey === "sales_pr" && payload.prItems) {
    // Legacy: await prisma.purchaseOrder.create(...)
  }

  if (stepKey === "purchase_find_supplier" && payload.supplierName) {
    // Legacy: await prisma.purchaseOrder.update(...)
  }

  if (stepKey === "purchase_po" && payload.poNumber) {
    // Legacy: await prisma.purchaseOrder.update(...)
  }
  
  if (stepKey === "purchase_waiting") {
    // nothing special needed, just move step
  }

  if (stepKey === "store_receive") {
    // Legacy: await prisma.purchaseOrder.update(...)
  }

  // Trigger: Automatically create Delivery Note if the job moved to 'service_return'
  if (nextStep?.key === 'service_return') {
    const { createRepairDelivery } = await import("@/app/actions/repairDeliveries")
    await createRepairDelivery(jobId)
  }

  // Trigger: Notify Store when goods need to be received
  if (nextStep?.key === 'store_receive') {
    try {
      const { customStockArrivedMessage, getLineUserIdByEmpId, pushLineMessage } = await import('@/app/lib/lineNotify');
      const arrivedMsg = await customStockArrivedMessage(job);
      
      const storeEmployees = await prisma.employeeSale.findMany({
        where: { department: { contains: 'Store', mode: 'insensitive' } },
        select: { employeeId: true }
      });
      const storeUsers = await prisma.user.findMany({
        where: { role: { contains: 'store', mode: 'insensitive' } },
        select: { employeeId: true }
      });
      
      const empIdsToNotify = new Set<string>();
      storeEmployees.forEach(e => { if (e.employeeId) empIdsToNotify.add(e.employeeId) });
      storeUsers.forEach(u => { if (u.employeeId) empIdsToNotify.add(u.employeeId) });

      for (const empId of empIdsToNotify) {
        const lineId = await getLineUserIdByEmpId(empId);
        if (lineId) await pushLineMessage(lineId, [arrivedMsg]);
      }
    } catch (err) {
      console.error("Failed to send store notification:", err);
    }
  }

  // Trigger LINE Notification
  const stepInfo = STEP_LABELS[stepKey] || { label: stepKey, dept: department };
  await notifyJobStepUpdate(jobId, stepKey, stepInfo.label, stepInfo.dept);

  revalidatePath("/jobs")
}

// ── บัญชีตีกลับ (Reject Step) ──────────────────────────────────────────
export async function rejectJobStep(jobId: string, targetStep: string, note: string, rejectedBy: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) throw new Error("Job not found")

  // Delete logs that happened after or at the target step
  // Wait, we don't have a strict linear ordering in stepLogs if we just use string.
  // Easiest way: just update the job's currentStep, and log a note.
  await prisma.jobStepLog.create({
    data: {
      jobId,
      step: job.currentStep,
      completedBy: rejectedBy,
      department: "accounting",
      note: `ตีกลับไปที่ ${targetStep}: ${note}`,
    }
  })

  await prisma.job.update({
    where: { id: jobId },
    data: { currentStep: targetStep }
  })

  // Trigger LINE Notification for rejection
  const stepInfo = STEP_LABELS[targetStep] || { label: targetStep, dept: "Accounting" };
  await notifyJobStepUpdate(jobId, targetStep, `ตีกลับไปที่ ${stepInfo.label}`, stepInfo.dept);

  revalidatePath("/jobs")
}

// ── ดึง step logs ของ job ──────────────────────────────────────
export async function getJobStepLogs(jobId: string) {
  return prisma.jobStepLog.findMany({
    where:   { jobId },
    orderBy: { completedAt: "asc" },
  })
}

// ================================================
// getJobs — list with filter
// ================================================
export async function getJobs(filters?: { 
  companyCode?: string; 
  month?: number; 
  yearBe?: number; 
  jobType?: string;
}) { 
  return prisma.job.findMany({ 
    where: { 
      ...(filters?.companyCode && { companyCode: filters.companyCode }), 
      ...(filters?.month && { month: filters.month }), 
      ...(filters?.yearBe && { yearBe: filters.yearBe }),
      ...(filters?.jobType && { jobType: filters.jobType }),
    },
    include: { 
      quotation: true,
      project: { include: { manager: true } }
    },
    orderBy: { dateClosed: "desc" },
  });
}

const STEP_LABELS: Record<string, { label: string; dept: string }> = { 
  'sales': { label: '📝 ฝ่ายขาย - สร้างงาน', dept: 'Sales' },
  'store_check': { label: '🏭 สโตร์ - ตรวจสอบสินค้า', dept: 'Store' },
  'store_confirm': { label: '✅ สโตร์ - ยืนยันสินค้า', dept: 'Store' },
  'purchase': { label: '🛒 จัดซื้อ - สั่งซื้อสินค้า', dept: 'Purchase' },
  'manufacturing': { label: '⚙️ ฝ่ายผลิต - ดำเนินการผลิต', dept: 'Manufacturing' },
  'store_send': { label: '📦 สโตร์ - จัดส่งสินค้า', dept: 'Store' },
  'accounting': { label: '💰 บัญชี - ออกบิล', dept: 'Accounting' },
  'complete': { label: '🎉 งานเสร็จสิ้น', dept: 'System' },
  'service_receive': { label: '🔧 ฝ่ายบริการ - รับเรื่อง', dept: 'Service' },
  'service_repair': { label: '🔨 ฝ่ายบริการ - ดำเนินการซ่อม', dept: 'Service' },
  'service_return': { label: '📬 ฝ่ายบริการ - ส่งคืนสินค้า', dept: 'Service' },
  'sales_pr': { label: '📝 ฝ่ายขาย - เปิด PR เพื่อสั่งซื้อ', dept: 'Sales' },
  'purchase_find_supplier': { label: '🛒 จัดซื้อ - หาร้านและขอราคา', dept: 'Purchase' },
  'store_receive': { label: '📦 Store - รับและตรวจสอบสินค้า', dept: 'Store' },
};

export async function notifyJobStepUpdate(jobId: string, stepKey: string, stepLabel: string, dept: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      quotation: { include: { salesperson: true } }
    }
  });
  if (!job) return;

  const salespersonId = job.quotation?.salespersonId;
  let salesLineId: string | null | undefined = null;
  let supervisorLineId: string | null | undefined = null;

  if (salespersonId) {
    salesLineId = await getLineUserIdByCrmUserId(salespersonId);
    const user = await prisma.user.findUnique({
      where: { id: salespersonId },
      select: { employeeId: true }
    });
    if (user?.employeeId) {
      const employee = await prisma.employees.findUnique({
        where: { emp_id: user.employeeId },
        select: { supervisor_id: true }
      });
      if (employee?.supervisor_id) {
        supervisorLineId = await getLineUserIdByEmpId(employee.supervisor_id);
      }
    }
  }

  // Handle special notification for sales_pr (Store out of stock)
  if (stepKey === 'sales_pr') {
    const { customSalesPRMessage } = await import('@/app/lib/lineNotify');
    
    // Notify Salesperson
    if (salesLineId) {
      const salesMessage = customSalesPRMessage(job, 'sales');
      await pushLineMessage(salesLineId, [salesMessage]);
    }
    
    // Notify Supervisor/Manager
    if (supervisorLineId) {
      const mgrMessage = customSalesPRMessage(job, 'manager');
      await pushLineMessage(supervisorLineId, [mgrMessage]);
    }

    // Notify Purchasing Department
    const purchaseEmployees = await prisma.employeeSale.findMany({
      where: { department: { contains: 'Purchase', mode: 'insensitive' } },
      select: { employeeId: true }
    });
    
    // Or check users with role/department relating to Purchase
    const purchaseUsers = await prisma.user.findMany({
      where: { role: { contains: 'purchase', mode: 'insensitive' } },
      select: { employeeId: true }
    });

    const empIdsToNotify = new Set<string>();
    purchaseEmployees.forEach(e => { if (e.employeeId) empIdsToNotify.add(e.employeeId) });
    purchaseUsers.forEach(u => { if (u.employeeId) empIdsToNotify.add(u.employeeId) });

    const purchaseMsg = customSalesPRMessage(job, 'purchase');
    for (const empId of empIdsToNotify) {
      const lineId = await getLineUserIdByEmpId(empId);
      if (lineId) {
        await pushLineMessage(lineId, [purchaseMsg]);
      }
    }

    return; // Stop here, custom notification sent.
  }

  // Handle special notifications for Purchase Flow

  if (stepKey === 'store_receive') {
    // Transition from store_receive -> next (Confirm receive)
    // Notify Sales + Manager
    const { customStoreReceivedMessage } = await import('@/app/lib/lineNotify');
    const storeReceivedMsg = await customStoreReceivedMessage(job);
    if (salesLineId) await pushLineMessage(salesLineId, [storeReceivedMsg]);
    if (supervisorLineId) await pushLineMessage(supervisorLineId, [storeReceivedMsg]);
    return;
  }

  if (stepKey === 'accounting') {
    const { customAccountingMessage } = await import('@/app/lib/lineNotify');
    const { sendPushToUser } = await import('@/app/lib/pushNotification');
    
    const accountingMsg = await customAccountingMessage(job);
    const pushPayload = {
      title: 'งานรอตรวจสอบบัญชี',
      body: `งาน ${job.jobNumber} ของลูกค้า ${job.customerName} รอการตรวจสอบบัญชี`,
      url: `/jobs?jobId=${job.id}`,
      category: 'accounting_job'
    };
    
    if (salesLineId) await pushLineMessage(salesLineId, [accountingMsg]);
    if (supervisorLineId) await pushLineMessage(supervisorLineId, [accountingMsg]);

    if (salespersonId) {
      await sendPushToUser(salespersonId, pushPayload).catch(console.error);
    }

    const accountingEmployees = await prisma.employeeSale.findMany({
      where: { department: { contains: 'Account', mode: 'insensitive' } },
      select: { employeeId: true, userId: true }
    });

    for (const emp of accountingEmployees) {
      if (emp.userId) {
        await sendPushToUser(emp.userId, pushPayload).catch(console.error);
      }
      if (!emp.employeeId) continue;
      const lineId = await getLineUserIdByEmpId(emp.employeeId);
      if (lineId) await pushLineMessage(lineId, [accountingMsg]);
    }
    return;
  }

  // Default notification
  const lineIdsToNotify = new Set<string>();
  if (salesLineId) lineIdsToNotify.add(salesLineId);
  if (supervisorLineId) lineIdsToNotify.add(supervisorLineId);

  if (lineIdsToNotify.size === 0) return;

  const message = jobStepMessage(job, stepLabel, dept);

  for (const lineUserId of lineIdsToNotify) {
    await pushLineMessage(lineUserId, [message]);
  }
}

// ================================================
// Procurement Smart Matching & Manual Linking for /jobs
// ================================================

export type ProcurementMatchType = "MANUAL" | "ORDER" | "CODE" | "PROJECT" | "NAME";

export type JobMatchedPO = {
  id: number;
  poNumber: string;
  prNumber: string | null;
  vendorName: string | null;
  jobName: string | null;
  itemList: string | null;
  note: string | null;
  totalAmount: number | null;
  depositAmount: number | null;
  remainingAmount: number | null;
  receiveStatus: string | null;
  deliveryDate: string | null;
  recordedAt: string | null;
  createdAt: string;
  matchType: ProcurementMatchType;
  matchLabel: string;
  isManual: boolean;
};

export type JobMatchedPR = {
  id: number;
  prNumber: string;
  projectName: string | null;
  itemList: string | null;
  requestedBy: string | null;
  note: string | null;
  orderId: string | null;
  recordedAt: string | null;
  createdAt: string;
  matchType: ProcurementMatchType;
  matchLabel: string;
  isManual: boolean;
  purchaseOrders: JobMatchedPO[];
};

export type JobProcurementResult = {
  prs: JobMatchedPR[];
  standalonePos: JobMatchedPO[];
  summary: {
    prCount: number;
    poCount: number;
    receivedPoCount: number;
    pendingPoCount: number;
    totalPoAmount: number;
    hiddenCount: number;
  };
  matchedHints: string[];
};

const PROCUREMENT_DOC_TYPES = {
  PR_LINK: "PROCUREMENT_PR_LINK",
  PO_LINK: "PROCUREMENT_PO_LINK",
  PR_HIDE: "PROCUREMENT_PR_HIDE",
  PO_HIDE: "PROCUREMENT_PO_HIDE",
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

const GENERIC_CODE_STOPWORDS = new Set([
  "-",
  "--",
  "n/a",
  "na",
  "none",
  "null",
  "ไม่มี",
  "ไม่ระบุ",
  "รอ po",
  "รอpo",
  "ตามหลัง",
  "เงินสด",
  "เครดิต",
  "ใบเสนอราคา",
]);

const GENERIC_NAME_STOPWORDS = new Set([
  "บริษัท",
  "จำกัด",
  "มหาชน",
  "หจก",
  "บจก",
  "ร้าน",
  "ลูกค้า",
  "ลูกค้าทั่วไป",
  "เงินสด",
  "ทั่วไป",
  "ไม่ระบุ",
  "งานซ่อม",
  "งานเคลม",
  "งานขาย",
  "งานติดตั้ง",
  "งานตู้",
  "งานโปรเจค",
  "ค่าบริการ",
  "งานตรวจเช็ค",
  "ตรวจเช็ค",
  "สินค้าฝากขาย",
  "อินเวอร์เตอร์",
  "inverter",
  "motor",
  "pump",
  "ปั๊มน้ำ",
  "ปั้มน้ำ",
  "มอเตอร์",
  "ตู้คอนโทรล",
  "คอนโทรล",
  "อะไหล่",
  "ซ่อมเครื่อง",
  "บริการ",
  "โครงการ",
  "สำนักงานใหญ่",
  "เทร่า",
  "เทร่า กรุ๊ป",
  "tera",
  "teragroup",
  "ไทย",
  "สยาม",
  "เอเชีย",
  "กรุ๊ป",
  "เอ็นจิเนียริ่ง",
  "เทรดดิ้ง",
  "อินดัสตรี้",
  "ซัพพลาย",
  "เซอร์วิส",
]);

function normalizeSpaces(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

function isValidCodeToken(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = normalizeSpaces(raw);
  if (clean.length < 4) return null;
  if (GENERIC_CODE_STOPWORDS.has(clean.toLowerCase())) return null;
  const digitCount = (clean.match(/[0-9]/g) || []).length;
  if (digitCount < 2) return null;
  // Pure numeric strings must be long enough to avoid matching random quantities/years
  if (/^[0-9\-\/.\s]+$/.test(clean) && clean.replace(/\D/g, "").length < 7) {
    return null;
  }
  return clean;
}

function containsCodeToken(haystackRaw: string, codeToken: string): boolean {
  if (!haystackRaw || !codeToken) return false;
  const hay = haystackRaw.toLowerCase();
  const needle = codeToken.toLowerCase();

  let startIdx = 0;
  while (startIdx <= hay.length - needle.length) {
    const idx = hay.indexOf(needle, startIdx);
    if (idx === -1) break;

    const prevChar = idx > 0 ? hay[idx - 1] : "";
    const nextChar = idx + needle.length < hay.length ? hay[idx + needle.length] : "";

    const firstIsAsciiAlnum = /^[a-z0-9]/.test(needle);
    const lastIsDigit = /[0-9]$/.test(needle);
    const lastIsAsciiAlpha = /[a-z]$/.test(needle);

    const prevBlocked = firstIsAsciiAlnum && /[a-z0-9]/.test(prevChar);
    const nextBlocked =
      (lastIsDigit && /[0-9]/.test(nextChar)) ||
      (lastIsAsciiAlpha && /[a-z0-9]/.test(nextChar));

    if (!prevBlocked && !nextBlocked) {
      return true;
    }
    startIdx = idx + 1;
  }
  return false;
}

function extractCleanCompanyTokens(raw?: string | null): string[] {
  if (!raw) return [];
  const results = new Set<string>();
  const trimmed = normalizeSpaces(raw);
  if (!trimmed) return [];

  const lowerFull = trimmed.toLowerCase();
  if (!GENERIC_NAME_STOPWORDS.has(lowerFull) && trimmed.length >= 4) {
    results.add(trimmed);
  }

  let cleaned = trimmed
    .replace(/\(\s*สำนักงานใหญ่\s*\)/gi, " ")
    .replace(/สำนักงานใหญ่/gi, " ")
    .replace(/\(\s*มหาชน\s*\)/gi, " ")
    .replace(/จำกัด\s*\(\s*มหาชน\s*\)/gi, " ")
    .replace(/^(บริษัท|บจก\.?|ห้างหุ้นส่วนจำกัด|ห้างหุ้นส่วนสามัญนิติบุคคล|หจก\.?|ร้าน|คุณ|นาย|นางสาว|นาง|น\.ส\.)\s*/gi, "")
    .replace(/\s*(จำกัด|มหาชน|co\.?\s*,?\s*ltd\.?|company\s+limited|ltd\.?|inc\.?)\s*$/gi, "")
    .replace(/\s+สาขา[^\s)]+$/gi, "");

  cleaned = normalizeSpaces(cleaned);
  if (
    cleaned.length >= 4 &&
    !GENERIC_NAME_STOPWORDS.has(cleaned.toLowerCase()) &&
    !/^[0-9\-\/.\s]+$/.test(cleaned)
  ) {
    results.add(cleaned);
  }

  return Array.from(results);
}

function extractCleanProjectTokens(raw?: string | null): string[] {
  if (!raw) return [];
  const results = new Set<string>();
  const trimmed = normalizeSpaces(raw);
  if (!trimmed) return [];

  if (trimmed.length >= 4 && !GENERIC_NAME_STOPWORDS.has(trimmed.toLowerCase())) {
    results.add(trimmed);
  }

  const cleaned = normalizeSpaces(
    trimmed
      .replace(/^(โครงการ|project|งานติดตั้งระบบ|งานติดตั้ง|ติดตั้งระบบ|งานก่อสร้าง|ก่อสร้าง|งานโปรเจค)\s*[:\-\s]*/gi, "")
      .replace(/\s*(จำกัด|\(มหาชน\)|มหาชน)\s*$/gi, "")
  );

  if (
    cleaned.length >= 4 &&
    !GENERIC_NAME_STOPWORDS.has(cleaned.toLowerCase()) &&
    !/^[0-9\-\/.\s]+$/.test(cleaned)
  ) {
    results.add(cleaned);
  }

  return Array.from(results);
}

function extractDistinctiveWorkTokens(raw?: string | null): string[] {
  if (!raw) return [];
  const trimmed = normalizeSpaces(raw);
  if (!trimmed || trimmed.length < 6) return [];

  const cleaned = normalizeSpaces(
    trimmed
      .replace(/^(งานซ่อม|งานเคลม|งานติดตั้ง|งานขาย|งานตู้|ซ่อม|เคลม|จัดซื้อ|สั่งซื้อ)\s*[:\-\s]*/gi, "")
  );

  if (
    cleaned.length >= 6 &&
    !GENERIC_NAME_STOPWORDS.has(cleaned.toLowerCase()) &&
    !/^(inverter|motor|pump|ปั๊มน้ำ|มอเตอร์|อินเวอร์เตอร์|ตู้คอนโทรล)\b/i.test(cleaned) &&
    !/^[0-9\-\/.\s]+$/.test(cleaned)
  ) {
    return [cleaned];
  }

  return [];
}

function toNumberOrNull(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function serializePO(
  po: any,
  matchType: ProcurementMatchType,
  matchLabel: string,
  isManual: boolean
): JobMatchedPO {
  return {
    id: po.id,
    poNumber: po.poNumber,
    prNumber: po.prNumber ?? null,
    vendorName: po.vendorName ?? null,
    jobName: po.jobName ?? null,
    itemList: po.itemList ?? null,
    note: po.note ?? null,
    totalAmount: toNumberOrNull(po.totalAmount),
    depositAmount: toNumberOrNull(po.depositAmount),
    remainingAmount: toNumberOrNull(po.remainingAmount),
    receiveStatus: po.receiveStatus ?? null,
    deliveryDate: po.deliveryDate ? new Date(po.deliveryDate).toISOString() : null,
    recordedAt: po.recordedAt ? new Date(po.recordedAt).toISOString() : null,
    createdAt: new Date(po.createdAt).toISOString(),
    matchType,
    matchLabel,
    isManual,
  };
}

export async function getJobProcurementDetails(jobId: string): Promise<JobProcurementResult> {
  const emptyResult: JobProcurementResult = {
    prs: [],
    standalonePos: [],
    summary: {
      prCount: 0,
      poCount: 0,
      receivedPoCount: 0,
      pendingPoCount: 0,
      totalPoAmount: 0,
      hiddenCount: 0,
    },
    matchedHints: [],
  };

  if (!jobId) return emptyResult;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      project: true,
      repairOrder: true,
      installationOrders: {
        select: { installationNo: true },
      },
      outsourceRepairs: {
        select: { outsourceNumber: true },
      },
      stepLogs: {
        select: { step: true, completedAt: true },
      },
      documents: {
        where: {
          type: { startsWith: "PROCUREMENT_" },
        },
      },
      quotation: {
        select: {
          subject: true,
          quotationNumber: true,
          company: {
            select: { companyName: true },
          },
          orders: {
            select: { id: true, orderNumber: true },
          },
        },
      },
    },
  });

  if (!job) return emptyResult;

  // 1. Parse manual links & hidden exclusions from JobDocument
  const manualPrSet = new Set<string>();
  const manualPoSet = new Set<string>();
  const hiddenPrSet = new Set<string>();
  const hiddenPoSet = new Set<string>();

  for (const doc of job.documents || []) {
    const num = normalizeSpaces(doc.fileName || "");
    if (!num) continue;
    if (doc.type === PROCUREMENT_DOC_TYPES.PR_LINK) manualPrSet.add(num.toUpperCase());
    if (doc.type === PROCUREMENT_DOC_TYPES.PO_LINK) manualPoSet.add(num.toUpperCase());
    if (doc.type === PROCUREMENT_DOC_TYPES.PR_HIDE) hiddenPrSet.add(num.toUpperCase());
    if (doc.type === PROCUREMENT_DOC_TYPES.PO_HIDE) hiddenPoSet.add(num.toUpperCase());
  }

  // Manual links always override hides
  for (const k of manualPrSet) hiddenPrSet.delete(k);
  for (const k of manualPoSet) hiddenPoSet.delete(k);

  const hiddenCount = hiddenPrSet.size + hiddenPoSet.size;

  // 2. Build Tier 1 (Exact Code & Relational) tokens
  const orderIds = (job.quotation?.orders || []).map((o) => o.id).filter(Boolean);
  const codeTokensSet = new Set<string>();

  const candidateCodes = [
    job.jobNumber,
    job.quotationNumber,
    job.quotation?.quotationNumber,
    job.poNumber,
    job.project?.projectNumber,
    job.project?.jbNumber,
    job.project?.contractNumber,
    job.project?.documentNumber,
    job.repairOrder?.handoverRef,
    job.repairOrder?.invoiceNo,
    ...(job.quotation?.orders || []).map((o) => o.orderNumber),
    ...(job.installationOrders || []).map((io) => io.installationNo),
    ...(job.outsourceRepairs || []).map((os) => os.outsourceNumber),
  ];

  for (const rawCode of candidateCodes) {
    const valid = isValidCodeToken(rawCode);
    if (valid) codeTokensSet.add(valid);
  }

  // If job.poNumber itself looks like an internal PR/PO number, include direct number lookup too
  const directPoNumbers = new Set<string>(Array.from(manualPoSet));
  const directPrNumbers = new Set<string>(Array.from(manualPrSet));
  if (job.poNumber) {
    const cleanJobPo = normalizeSpaces(job.poNumber);
    if (/^PO\d{2}/i.test(cleanJobPo)) directPoNumbers.add(cleanJobPo.toUpperCase());
    if (/^PR\d{2}/i.test(cleanJobPo)) directPrNumbers.add(cleanJobPo.toUpperCase());
  }

  const codeTokens = Array.from(codeTokensSet);

  // 3. Build Tier 2 (Project & Customer/Work Name) tokens + Date Proximity Windows
  const projectTokensSet = new Set<string>();
  if (job.project?.name) {
    for (const t of extractCleanProjectTokens(job.project.name)) {
      projectTokensSet.add(t);
    }
  }
  const projectTokens = Array.from(projectTokensSet);

  const nameTokensSet = new Set<string>();
  for (const src of [
    job.customerName,
    job.repairOrder?.customerCompany,
    job.project?.clientName,
    job.quotation?.company?.companyName,
  ]) {
    for (const t of extractCleanCompanyTokens(src)) {
      nameTokensSet.add(t);
    }
  }
  for (const workSrc of [job.item, job.quotation?.subject]) {
    for (const t of extractDistinctiveWorkTokens(workSrc)) {
      nameTokensSet.add(t);
    }
  }
  // Remove any token already covered by codeTokens or projectTokens
  for (const ct of codeTokens) nameTokensSet.delete(ct);
  for (const pt of projectTokens) nameTokensSet.delete(pt);
  const nameTokens = Array.from(nameTokensSet);

  // Compute Job Date Window for Name Matching
  const candidateStartDates = [
    job.dateClosed,
    job.createdAt,
    job.salesOrderDate,
    job.repairOrder?.receivedDate,
  ]
    .filter(Boolean)
    .map((d) => new Date(d as Date).getTime())
    .filter((t) => Number.isFinite(t));

  const earliestJobMs =
    candidateStartDates.length > 0 ? Math.min(...candidateStartDates) : Date.now();

  const stepDatesMs = (job.stepLogs || [])
    .map((l) => new Date(l.completedAt).getTime())
    .filter((t) => Number.isFinite(t));

  const candidateEndDates = [
    job.dateClosed,
    job.createdAt,
    job.deliveryDate,
    job.repairOrder?.sentDate,
    ...stepDatesMs,
  ]
    .filter(Boolean)
    .map((d) => new Date(d as Date | number).getTime())
    .filter((t) => Number.isFinite(t));

  const latestJobMs =
    candidateEndDates.length > 0 ? Math.max(...candidateEndDates) : earliestJobMs;

  const jobDone = isCompleted(
    job.jobType,
    job.currentStep,
    job.flowVariant,
    job.stepLogs || []
  );

  const nameWindowStartMs = earliestJobMs - 35 * DAY_MS;
  const nameWindowEndMs = jobDone
    ? latestJobMs + 45 * DAY_MS
    : Math.max(Date.now() + 7 * DAY_MS, latestJobMs + 120 * DAY_MS);

  const projStartMs = job.project?.startDate
    ? Math.min(earliestJobMs, new Date(job.project.startDate).getTime()) - 90 * DAY_MS
    : earliestJobMs - 90 * DAY_MS;
  const projEndMs = job.project?.endDate
    ? Math.max(latestJobMs, new Date(job.project.endDate).getTime()) + 180 * DAY_MS
    : Math.max(Date.now() + 30 * DAY_MS, latestJobMs + 365 * DAY_MS);

  const allTextSearchTokens = Array.from(
    new Set([...codeTokens, ...projectTokens, ...nameTokens])
  );

  // 4. Query candidate PurchaseRequests & PurchaseOrders in parallel
  const prOrConditions: any[] = [];
  if (directPrNumbers.size > 0) {
    for (const prNum of directPrNumbers) {
      prOrConditions.push({ prNumber: { equals: prNum, mode: "insensitive" } });
    }
  }
  if (orderIds.length > 0) {
    prOrConditions.push({ orderId: { in: orderIds } });
  }
  for (const tok of allTextSearchTokens) {
    prOrConditions.push({ projectName: { contains: tok, mode: "insensitive" } });
    prOrConditions.push({ note: { contains: tok, mode: "insensitive" } });
  }
  for (const codeTok of codeTokens) {
    prOrConditions.push({ prNumber: { contains: codeTok, mode: "insensitive" } });
  }

  const poOrConditions: any[] = [];
  if (directPoNumbers.size > 0) {
    for (const poNum of directPoNumbers) {
      poOrConditions.push({ poNumber: { equals: poNum, mode: "insensitive" } });
    }
  }
  if (directPrNumbers.size > 0) {
    for (const prNum of directPrNumbers) {
      poOrConditions.push({ prNumber: { equals: prNum, mode: "insensitive" } });
    }
  }
  for (const tok of allTextSearchTokens) {
    poOrConditions.push({ jobName: { contains: tok, mode: "insensitive" } });
    poOrConditions.push({ note: { contains: tok, mode: "insensitive" } });
  }
  for (const codeTok of codeTokens) {
    poOrConditions.push({ poNumber: { contains: codeTok, mode: "insensitive" } });
    poOrConditions.push({ prNumber: { contains: codeTok, mode: "insensitive" } });
  }

  const [candidatePrs, candidatePos] = await Promise.all([
    prOrConditions.length > 0
      ? prisma.purchaseRequest.findMany({
          where: { OR: prOrConditions },
          include: {
            purchaseOrders: {
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 150,
        })
      : Promise.resolve([]),
    poOrConditions.length > 0
      ? prisma.purchaseOrder.findMany({
          where: { OR: poOrConditions },
          include: {
            purchaseRequest: true,
          },
          orderBy: { createdAt: "desc" },
          take: 150,
        })
      : Promise.resolve([]),
  ]);

  // Helper to classify a text + date against Tiers 1 & 2
  function evaluateMatch(params: {
    docNumberUpper: string;
    manualSet: Set<string>;
    directCodeSet: Set<string>;
    orderId?: string | null;
    texts: (string | null | undefined)[];
    docDateMs: number;
  }): { matchType: ProcurementMatchType; matchLabel: string; isManual: boolean } | null {
    const { docNumberUpper, manualSet, directCodeSet, orderId, texts, docDateMs } = params;

    if (manualSet.has(docNumberUpper)) {
      return { matchType: "MANUAL", matchLabel: "ผูกกับงานเอง", isManual: true };
    }

    if (directCodeSet.has(docNumberUpper)) {
      return { matchType: "CODE", matchLabel: `ตรงเลขที่เอกสาร`, isManual: false };
    }

    if (orderId && orderIds.includes(orderId)) {
      return { matchType: "ORDER", matchLabel: "เชื่อมจากใบสั่งผลิต", isManual: false };
    }

    const combinedText = texts.filter(Boolean).join(" | ");

    // Tier 1: Exact document code match (no date window limit)
    for (const ct of codeTokens) {
      if (containsCodeToken(combinedText, ct)) {
        return { matchType: "CODE", matchLabel: `ตรงรหัส ${ct}`, isManual: false };
      }
    }

    // Tier 2A: Project name match (within project window)
    if (docDateMs >= projStartMs && docDateMs <= projEndMs) {
      const lowerText = combinedText.toLowerCase();
      for (const pt of projectTokens) {
        if (lowerText.includes(pt.toLowerCase())) {
          return { matchType: "PROJECT", matchLabel: "ตรงชื่อโครงการ", isManual: false };
        }
      }
    }

    // Tier 2B: Customer / distinctive work name match (strictly within job date proximity window)
    if (docDateMs >= nameWindowStartMs && docDateMs <= nameWindowEndMs) {
      const lowerText = combinedText.toLowerCase();
      for (const nt of nameTokens) {
        // Short tokens (< 6 chars) require tighter proximity [-20d, +30d] to avoid ambiguity
        if (nt.length < 6) {
          const tightStart = earliestJobMs - 20 * DAY_MS;
          const tightEnd = jobDone ? latestJobMs + 30 * DAY_MS : nameWindowEndMs;
          if (docDateMs < tightStart || docDateMs > tightEnd) continue;
        }
        if (lowerText.includes(nt.toLowerCase())) {
          return { matchType: "NAME", matchLabel: `ตรงชื่อ "${nt}"`, isManual: false };
        }
      }
    }

    return null;
  }

  // 5. Filter & assemble matched PRs and POs
  const prMap = new Map<string, JobMatchedPR>();
  const matchedPoIdsInPr = new Set<number>();

  for (const pr of candidatePrs) {
    const prKey = pr.prNumber.trim().toUpperCase();
    if (hiddenPrSet.has(prKey)) continue;

    const docDateMs = new Date(pr.recordedAt || pr.createdAt).getTime();
    const verdict = evaluateMatch({
      docNumberUpper: prKey,
      manualSet: manualPrSet,
      directCodeSet: directPrNumbers,
      orderId: pr.orderId,
      texts: [pr.prNumber, pr.projectName, pr.note],
      docDateMs,
    });

    if (!verdict) continue;

    const childPos: JobMatchedPO[] = [];
    for (const po of pr.purchaseOrders || []) {
      const poKey = po.poNumber.trim().toUpperCase();
      if (hiddenPoSet.has(poKey)) continue;
      const isPoManual = manualPoSet.has(poKey);
      childPos.push(
        serializePO(
          po,
          isPoManual ? "MANUAL" : verdict.matchType,
          isPoManual ? "ผูกกับงานเอง" : verdict.matchLabel,
          isPoManual
        )
      );
      matchedPoIdsInPr.add(po.id);
    }

    prMap.set(prKey, {
      id: pr.id,
      prNumber: pr.prNumber,
      projectName: pr.projectName ?? null,
      itemList: pr.itemList ?? null,
      requestedBy: pr.requestedBy ?? null,
      note: pr.note ?? null,
      orderId: pr.orderId ?? null,
      recordedAt: pr.recordedAt ? new Date(pr.recordedAt).toISOString() : null,
      createdAt: new Date(pr.createdAt).toISOString(),
      matchType: verdict.matchType,
      matchLabel: verdict.matchLabel,
      isManual: verdict.isManual,
      purchaseOrders: childPos,
    });
  }

  // Process directly matched POs (including standalone POs or POs whose parent PR didn't match by name)
  const standalonePos: JobMatchedPO[] = [];
  const seenStandalonePoKeys = new Set<string>();

  for (const po of candidatePos) {
    const poKey = po.poNumber.trim().toUpperCase();
    if (hiddenPoSet.has(poKey)) continue;
    if (matchedPoIdsInPr.has(po.id)) continue;

    const docDateMs = new Date(po.recordedAt || po.createdAt).getTime();
    const verdict = evaluateMatch({
      docNumberUpper: poKey,
      manualSet: manualPoSet,
      directCodeSet: directPoNumbers,
      texts: [po.poNumber, po.prNumber, po.jobName, po.note],
      docDateMs,
    });

    if (!verdict) continue;

    const parentPrKey = po.prNumber ? po.prNumber.trim().toUpperCase() : null;

    // If parent PR is already in prMap, append PO if missing
    if (parentPrKey && prMap.has(parentPrKey)) {
      const existingPr = prMap.get(parentPrKey)!;
      if (!existingPr.purchaseOrders.some((p) => p.poNumber.toUpperCase() === poKey)) {
        existingPr.purchaseOrders.push(
          serializePO(po, verdict.matchType, verdict.matchLabel, verdict.isManual)
        );
      }
      matchedPoIdsInPr.add(po.id);
      continue;
    }

    // If PO has a parent PR record in DB and that PR is NOT hidden, group under that PR (with only matched POs)
    if (parentPrKey && po.purchaseRequest && !hiddenPrSet.has(parentPrKey)) {
      const pr = po.purchaseRequest;
      const serializedPo = serializePO(
        po,
        verdict.matchType,
        verdict.matchLabel,
        verdict.isManual
      );
      prMap.set(parentPrKey, {
        id: pr.id,
        prNumber: pr.prNumber,
        projectName: pr.projectName ?? po.jobName ?? null,
        itemList: pr.itemList ?? po.itemList ?? null,
        requestedBy: pr.requestedBy ?? null,
        note: pr.note ?? null,
        orderId: pr.orderId ?? null,
        recordedAt: pr.recordedAt ? new Date(pr.recordedAt).toISOString() : null,
        createdAt: new Date(pr.createdAt).toISOString(),
        matchType: verdict.matchType,
        matchLabel: verdict.matchLabel,
        isManual: verdict.isManual,
        purchaseOrders: [serializedPo],
      });
      matchedPoIdsInPr.add(po.id);
      continue;
    }

    // Otherwise, keep as a standalone PO
    if (!seenStandalonePoKeys.has(poKey)) {
      seenStandalonePoKeys.add(poKey);
      standalonePos.push(
        serializePO(po, verdict.matchType, verdict.matchLabel, verdict.isManual)
      );
    }
  }

  // Sort PRs & standalone POs: MANUAL -> ORDER -> CODE -> PROJECT -> NAME, then newest first
  const priorityRank: Record<ProcurementMatchType, number> = {
    MANUAL: 1,
    ORDER: 2,
    CODE: 3,
    PROJECT: 4,
    NAME: 5,
  };

  const prs = Array.from(prMap.values()).sort((a, b) => {
    const rDiff = priorityRank[a.matchType] - priorityRank[b.matchType];
    if (rDiff !== 0) return rDiff;
    const tA = new Date(a.recordedAt || a.createdAt).getTime();
    const tB = new Date(b.recordedAt || b.createdAt).getTime();
    return tB - tA;
  });

  standalonePos.sort((a, b) => {
    const rDiff = priorityRank[a.matchType] - priorityRank[b.matchType];
    if (rDiff !== 0) return rDiff;
    const tA = new Date(a.recordedAt || a.createdAt).getTime();
    const tB = new Date(b.recordedAt || b.createdAt).getTime();
    return tB - tA;
  });

  // 6. Compute summary totals (excluding Cancelled POs from amount sum)
  const allPos: JobMatchedPO[] = [
    ...prs.flatMap((pr) => pr.purchaseOrders),
    ...standalonePos,
  ];
  const activePos = allPos.filter(
    (po) => String(po.receiveStatus || "").toLowerCase() !== "cancelled"
  );
  const receivedPoCount = activePos.filter(
    (po) => String(po.receiveStatus || "").toLowerCase() === "received"
  ).length;
  const pendingPoCount = Math.max(0, activePos.length - receivedPoCount);
  const totalPoAmount = activePos.reduce(
    (sum, po) => sum + (po.totalAmount ?? 0),
    0
  );

  const matchedHints = [
    ...codeTokens.slice(0, 3),
    ...projectTokens.slice(0, 1),
    ...nameTokens.slice(0, 2),
  ];

  return {
    prs,
    standalonePos,
    summary: {
      prCount: prs.length,
      poCount: allPos.length,
      receivedPoCount,
      pendingPoCount,
      totalPoAmount,
      hiddenCount,
    },
    matchedHints,
  };
}

export type ProcurementSearchItem = {
  docType: "PR" | "PO";
  docNumber: string;
  prNumber: string | null;
  title: string | null;
  subtitle: string | null;
  amount: number | null;
  receiveStatus: string | null;
  date: string | null;
};

export async function searchProcurementDocsForJob(
  query: string
): Promise<ProcurementSearchItem[]> {
  const q = normalizeSpaces(query || "");

  const [prs, pos] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where: q
        ? {
            OR: [
              { prNumber: { contains: q, mode: "insensitive" } },
              { projectName: { contains: q, mode: "insensitive" } },
              { itemList: { contains: q, mode: "insensitive" } },
              { requestedBy: { contains: q, mode: "insensitive" } },
              { note: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        purchaseOrders: {
          select: { poNumber: true, receiveStatus: true },
        },
      },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      take: q ? 12 : 6,
    }),
    prisma.purchaseOrder.findMany({
      where: q
        ? {
            OR: [
              { poNumber: { contains: q, mode: "insensitive" } },
              { prNumber: { contains: q, mode: "insensitive" } },
              { jobName: { contains: q, mode: "insensitive" } },
              { vendorName: { contains: q, mode: "insensitive" } },
              { itemList: { contains: q, mode: "insensitive" } },
              { note: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      take: q ? 12 : 6,
    }),
  ]);

  const results: ProcurementSearchItem[] = [];

  for (const pr of prs) {
    const poListText =
      pr.purchaseOrders?.length > 0
        ? `PO: ${pr.purchaseOrders.map((p) => p.poNumber).join(", ")}`
        : "ยังไม่มี PO";
    results.push({
      docType: "PR",
      docNumber: pr.prNumber,
      prNumber: pr.prNumber,
      title: pr.projectName || pr.itemList || "ไม่ระบุชื่องาน/โครงการ",
      subtitle: [pr.requestedBy ? `ผู้ขอ: ${pr.requestedBy}` : null, poListText, pr.itemList]
        .filter(Boolean)
        .join(" • "),
      amount: null,
      receiveStatus: null,
      date: (pr.recordedAt || pr.createdAt)?.toISOString() ?? null,
    });
  }

  for (const po of pos) {
    results.push({
      docType: "PO",
      docNumber: po.poNumber,
      prNumber: po.prNumber ?? null,
      title: po.jobName || po.vendorName || po.itemList || "ไม่ระบุชื่องาน",
      subtitle: [
        po.vendorName ? `ร้านค้า: ${po.vendorName}` : null,
        po.prNumber ? `อ้างอิง ${po.prNumber}` : null,
        po.itemList,
      ]
        .filter(Boolean)
        .join(" • "),
      amount: toNumberOrNull(po.totalAmount),
      receiveStatus: po.receiveStatus ?? null,
      date: (po.recordedAt || po.createdAt)?.toISOString() ?? null,
    });
  }

  return results;
}

async function resolveCurrentUserId(): Promise<string> {
  const user = await getUser();
  if (user?.id) return user.id;
  const fallback = await prisma.user.findFirst({ select: { id: true } });
  if (!fallback) throw new Error("ไม่พบข้อมูลผู้ใช้งานในระบบ");
  return fallback.id;
}

export async function linkProcurementToJob(
  jobId: string,
  docType: "PR" | "PO",
  docNumber: string
) {
  const cleanNum = normalizeSpaces(docNumber || "");
  if (!jobId || !cleanNum) {
    throw new Error("ข้อมูลไม่ครบถ้วน");
  }

  const userId = await resolveCurrentUserId();
  const linkType =
    docType === "PR" ? PROCUREMENT_DOC_TYPES.PR_LINK : PROCUREMENT_DOC_TYPES.PO_LINK;
  const hideType =
    docType === "PR" ? PROCUREMENT_DOC_TYPES.PR_HIDE : PROCUREMENT_DOC_TYPES.PO_HIDE;

  // Remove any hide record and any duplicate link record for this docNumber
  await prisma.jobDocument.deleteMany({
    where: {
      jobId,
      type: { in: [linkType, hideType] },
      fileName: { equals: cleanNum, mode: "insensitive" },
    },
  });

  const targetUrl =
    docType === "PR"
      ? `/admin/procurement/pr?search=${encodeURIComponent(cleanNum)}`
      : `/admin/procurement/po?search=${encodeURIComponent(cleanNum)}`;

  await prisma.jobDocument.create({
    data: {
      jobId,
      type: linkType,
      fileName: cleanNum,
      fileUrl: targetUrl,
      fileSize: 0,
      uploadedBy: userId,
    },
  });

  return { success: true };
}

export async function unlinkProcurementFromJob(
  jobId: string,
  docType: "PR" | "PO",
  docNumber: string,
  childPoNumbers?: string[]
) {
  const cleanNum = normalizeSpaces(docNumber || "");
  if (!jobId || !cleanNum) {
    throw new Error("ข้อมูลไม่ครบถ้วน");
  }

  const userId = await resolveCurrentUserId();
  const linkType =
    docType === "PR" ? PROCUREMENT_DOC_TYPES.PR_LINK : PROCUREMENT_DOC_TYPES.PO_LINK;
  const hideType =
    docType === "PR" ? PROCUREMENT_DOC_TYPES.PR_HIDE : PROCUREMENT_DOC_TYPES.PO_HIDE;

  // Remove any manual link and existing hide record before inserting hide record
  await prisma.jobDocument.deleteMany({
    where: {
      jobId,
      type: { in: [linkType, hideType] },
      fileName: { equals: cleanNum, mode: "insensitive" },
    },
  });

  await prisma.jobDocument.create({
    data: {
      jobId,
      type: hideType,
      fileName: cleanNum,
      fileUrl: "",
      fileSize: 0,
      uploadedBy: userId,
    },
  });

  // When hiding a PR card, also hide its currently displayed POs so they don't reappear as standalone POs
  if (docType === "PR" && childPoNumbers && childPoNumbers.length > 0) {
    const cleanChildPos = Array.from(
      new Set(childPoNumbers.map((p) => normalizeSpaces(p)).filter(Boolean))
    );
    if (cleanChildPos.length > 0) {
      await prisma.jobDocument.deleteMany({
        where: {
          jobId,
          type: { in: [PROCUREMENT_DOC_TYPES.PO_LINK, PROCUREMENT_DOC_TYPES.PO_HIDE] },
          OR: cleanChildPos.map((p) => ({
            fileName: { equals: p, mode: "insensitive" as const },
          })),
        },
      });
      await prisma.jobDocument.createMany({
        data: cleanChildPos.map((p) => ({
          jobId,
          type: PROCUREMENT_DOC_TYPES.PO_HIDE,
          fileName: p,
          fileUrl: "",
          fileSize: 0,
          uploadedBy: userId,
        })),
      });
    }
  }

  return { success: true };
}

export async function restoreHiddenProcurementForJob(jobId: string) {
  if (!jobId) return { success: false };
  await prisma.jobDocument.deleteMany({
    where: {
      jobId,
      type: {
        in: [PROCUREMENT_DOC_TYPES.PR_HIDE, PROCUREMENT_DOC_TYPES.PO_HIDE],
      },
    },
  });
  return { success: true };
}

// ================================================
// getProcurementForJob (Legacy compatibility)
// Fetches PR and PO data for a given job based on text match
// ================================================
export async function getProcurementForJob(customerName: string, projectName?: string) {
  if (!customerName) return [];
  
  const searchTerms = [
    { projectName: { contains: customerName, mode: 'insensitive' as const } }
  ];
  
  if (projectName) {
    searchTerms.push({ projectName: { contains: projectName, mode: 'insensitive' as const } });
  }

  const prs = await prisma.purchaseRequest.findMany({
    where: {
      OR: searchTerms
    },
    include: {
      purchaseOrders: {
        select: { id: true, poNumber: true, receiveStatus: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return prs;
}

// ================================================
// getPOsByJobName — Fetches POs related to a job name
// ================================================
export async function getPOsByJobName(jobName: string) {
  if (!jobName) return [];
  const pos = await prisma.purchaseOrder.findMany({
    where: {
      OR: [
        { jobName: { contains: jobName, mode: "insensitive" } },
        { purchaseRequest: { projectName: { contains: jobName, mode: "insensitive" } } }
      ]
    },
    include: {
      purchaseRequest: {
        select: { projectName: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  
  return pos.map(po => ({
    poNumber: po.poNumber,
    vendorName: po.vendorName,
    jobName: po.jobName,
    projectName: po.purchaseRequest?.projectName,
    itemList: po.itemList,
    deliveryDate: po.deliveryDate,
  }));
}

