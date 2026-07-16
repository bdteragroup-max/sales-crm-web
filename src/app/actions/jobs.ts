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
      }
    });
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
    }, 
  }); 

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
  'purchase_po': { label: '🛒 จัดซื้อ - บันทึก PO', dept: 'Purchase' },
  'sales_acknowledge_po': { label: '📝 ฝ่ายขาย - รับทราบและยืนยัน PO', dept: 'Sales' },
  'purchase_waiting': { label: '⏳ จัดซื้อ - รอสินค้า', dept: 'Purchase' },
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
  if (stepKey === 'purchase_po') {
    // Transition from purchase_po -> sales_acknowledge_po (Purchasing saved PO)
    // Notify Sales + Manager to acknowledge
    const { customPurchasePOMessage } = await import('@/app/lib/lineNotify');
    const poMsg = await customPurchasePOMessage(job);
    if (salesLineId) await pushLineMessage(salesLineId, [poMsg]);
    if (supervisorLineId) await pushLineMessage(supervisorLineId, [poMsg]);
    return;
  }

  if (stepKey === 'sales_acknowledge_po') {
    // Transition from sales_acknowledge_po -> purchase_waiting
    // Notify Purchasing that Sales has acknowledged the PO
    const { customSalesAcknowledgeMessage } = await import('@/app/lib/lineNotify');
    const ackMsg = await customSalesAcknowledgeMessage(job);
    
    const purchaseEmployees = await prisma.employeeSale.findMany({
      where: { department: { contains: 'Purchase', mode: 'insensitive' } },
      select: { employeeId: true }
    });
    const purchaseUsers = await prisma.user.findMany({
      where: { role: { contains: 'purchase', mode: 'insensitive' } },
      select: { employeeId: true }
    });

    const empIdsToNotify = new Set<string>();
    purchaseEmployees.forEach(e => { if (e.employeeId) empIdsToNotify.add(e.employeeId) });
    purchaseUsers.forEach(u => { if (u.employeeId) empIdsToNotify.add(u.employeeId) });

    for (const empId of empIdsToNotify) {
      const lineId = await getLineUserIdByEmpId(empId);
      if (lineId) await pushLineMessage(lineId, [ackMsg]);
    }
    return;
  }

  if (stepKey === 'purchase_waiting') {
    // Transition from purchase_waiting -> store_receive (Stock arrived)
    // Notify Store + Sales + Manager
    const { customStockArrivedMessage } = await import('@/app/lib/lineNotify');
    const arrivedMsg = await customStockArrivedMessage(job);
    if (salesLineId) await pushLineMessage(salesLineId, [arrivedMsg]);
    if (supervisorLineId) await pushLineMessage(supervisorLineId, [arrivedMsg]);

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
    return;
  }

  if (stepKey === 'store_receive') {
    // Transition from store_receive -> next (Confirm receive)
    // Notify Sales + Manager
    const { customStoreReceivedMessage } = await import('@/app/lib/lineNotify');
    const storeReceivedMsg = await customStoreReceivedMessage(job);
    if (salesLineId) await pushLineMessage(salesLineId, [storeReceivedMsg]);
    if (supervisorLineId) await pushLineMessage(supervisorLineId, [storeReceivedMsg]);
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
// getProcurementForJob
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
