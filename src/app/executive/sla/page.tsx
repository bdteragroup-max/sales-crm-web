import React from "react";
import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import SLAClientDashboard, {
  BreachedOrder,
  BreachedJob,
  DepartmentStat,
} from "./SLAClientDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SLA & Bottleneck Monitor - TERA Executive",
  description: "Executive SLA tracking and operational bottleneck monitor in Red, White, and Gray",
};

const ORDER_SLA_THRESHOLDS: Record<string, number> = {
  "รอยืนยัน": 2,          // Sales confirmation SLA: 2 days
  "กำลังผลิต": 7,         // Production SLA: 7 days
  "ตรวจสอบคุณภาพ": 2,     // QC SLA: 2 days
  "รอส่งมอบ": 3,          // Warehouse / Logistics SLA: 3 days
};

const getOrderDepartment = (status: string) => {
  if (status === "กำลังผลิต") return "ฝ่ายผลิต";
  if (status === "ตรวจสอบคุณภาพ") return "ฝ่ายตรวจสอบคุณภาพ (QC)";
  if (status === "รอส่งมอบ") return "ฝ่ายคลังสินค้าและจัดส่ง";
  return "ฝ่ายขาย";
};

const JOB_STEP_LABELS: Record<string, string> = {
  sales: "ฝ่ายขายประสานงาน",
  sales_quote: "รอจัดทำใบเสนอราคา",
  sales_pr: "ขออนุมัติ PR จัดซื้อ",
  store: "รอเบิกอะไหล่ / จัดเตรียมชิ้นส่วน",
  store_receive: "รับสินค้าเข้าคลัง",
  service_receive: "รับเครื่อง / ตรวจเช็คเบื้องต้น",
  service_repair: "กำลังดำเนินการซ่อมแซม",
  service_outsource: "ส่งซ่อมภายนอก (Outsource)",
  customer_approval: "รอประเมินราคา / รออนุมัติ",
  production: "ฝ่ายผลิตดำเนินการ",
  project: "ฝ่ายโปรเจกต์ดำเนินงาน",
  service: "ฝ่ายบริการดูแล",
  awaiting_return: "ซ่อมเสร็จ / รอนัดส่งคืน",
  delivery: "จัดส่งสินค้าเรียบร้อย",
  service_return: "ส่งคืนสินค้าเรียบร้อย",
  closed: "ปิดงานเรียบร้อย",
};

const JOB_SLA_THRESHOLDS: Record<string, number> = {
  sales: 3,
  sales_quote: 2,
  sales_pr: 3,
  store: 2,
  store_receive: 2,
  service_receive: 2,
  service_repair: 5,
  service_outsource: 14,
  customer_approval: 3,
  production: 7,
  project: 7,
  service: 5,
};

const getJobDepartment = (step: string, lastLogDept?: string | null) => {
  if (lastLogDept && lastLogDept !== "Unknown") {
    if (lastLogDept.includes("Sales") || lastLogDept.includes("ขาย")) return "ฝ่ายขาย";
    if (lastLogDept.includes("Production") || lastLogDept.includes("ผลิต")) return "ฝ่ายผลิต";
    if (lastLogDept.includes("Store") || lastLogDept.includes("คลัง")) return "ฝ่ายคลังสินค้าและจัดส่ง";
    if (lastLogDept.includes("QC") || lastLogDept.includes("ตรวจสอบ")) return "ฝ่ายตรวจสอบคุณภาพ (QC)";
    if (lastLogDept.includes("Service") || lastLogDept.includes("บริการ")) return "ฝ่ายบริการ";
  }
  if (["sales", "sales_quote", "sales_pr"].includes(step)) return "ฝ่ายขาย";
  if (["store", "store_receive"].includes(step)) return "ฝ่ายคลังสินค้าและจัดส่ง";
  if (["production"].includes(step)) return "ฝ่ายผลิต";
  if (["project"].includes(step)) return "ฝ่ายโปรเจกต์";
  if (["customer_approval"].includes(step)) return "รอลูกค้าอนุมัติ";
  return "ฝ่ายบริการ";
};

const COMPLETED_JOB_STEPS = ["closed", "service_return", "accounting", "delivery"];

export default async function SLADashboard() {
  const session = await getUser();
  if (!session) {
    redirect("/");
  }

  const roleStr = (session.role || "").toLowerCase();
  const isExecutive =
    roleStr === "ผู้บริหาร" || roleStr === "executive" || roleStr === "super_admin";
  if (!isExecutive) {
    redirect("/dashboard");
  }

  const now = new Date();

  // 1. Fetch Orders in active stages
  const activeOrders = await prisma.order.findMany({
    where: {
      status: { in: Object.keys(ORDER_SLA_THRESHOLDS) },
    },
    include: {
      company: { select: { id: true, companyName: true } },
      salesperson: { select: { id: true, fullName: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  // 2. Fetch Recently Completed Orders (for On-Time Delivery rate calculation)
  const completedOrders = await prisma.order.findMany({
    where: { status: "เสร็จสิ้น" },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      targetDeliveryDate: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  // 3. Fetch Active Unclosed Jobs (Fixes bug where dateClosed > 2099 returned 0 rows)
  const activeJobs = await prisma.job.findMany({
    where: {
      currentStep: { notIn: COMPLETED_JOB_STEPS },
    },
    include: {
      repairOrder: { select: { id: true, technicianName: true } },
      installationOrders: { select: { id: true, technician: true } },
      stepLogs: {
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "asc" },
  });

  // 4. Fetch Recently Completed Jobs
  const completedJobs = await prisma.job.findMany({
    where: {
      currentStep: { in: COMPLETED_JOB_STEPS },
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      dateClosed: true,
      requiredDeliveryDate: true,
      deliveryDate: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  // 5. Compute Breached Orders
  const breachedOrders: BreachedOrder[] = activeOrders
    .map((order) => {
      const daysInStatus = Math.max(
        0,
        Math.floor((now.getTime() - order.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
      );
      const threshold = ORDER_SLA_THRESHOLDS[order.status] || 2;
      const delayDays = Math.max(0, daysInStatus - threshold);
      const isBreached = daysInStatus > threshold;

      let severity: "critical" | "high" | "warning" = "warning";
      if (delayDays >= 7 || daysInStatus >= threshold * 3) {
        severity = "critical";
      } else if (delayDays >= 3) {
        severity = "high";
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        companyName: order.company?.companyName || "ไม่ระบุชื่อบริษัท",
        status: order.status,
        department: getOrderDepartment(order.status),
        value: order.value || 0,
        daysInStatus,
        threshold,
        delayDays,
        severity,
        salespersonName: order.salesperson?.fullName || "ไม่ระบุพนักงาน",
        updatedAt: order.updatedAt.toISOString(),
        createdAt: order.createdAt.toISOString(),
        targetDeliveryDate: order.targetDeliveryDate?.toISOString() || null,
        isBreached,
      };
    })
    .filter((o) => o.isBreached)
    .sort((a, b) => b.delayDays - a.delayDays);

  // 6. Compute Breached Jobs
  const breachedJobs: BreachedJob[] = activeJobs
    .map((job) => {
      const daysInStatus = Math.max(
        0,
        Math.floor((now.getTime() - job.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
      );
      const threshold = JOB_SLA_THRESHOLDS[job.currentStep] || 5;
      const delayDays = Math.max(0, daysInStatus - threshold);
      const isBreached = daysInStatus > threshold;

      let severity: "critical" | "high" | "warning" = "warning";
      if (delayDays >= 7 || daysInStatus >= threshold * 2) {
        severity = "critical";
      } else if (delayDays >= 3) {
        severity = "high";
      }

      let techName = job.repairOrder?.technicianName || "";
      if (
        !techName &&
        job.installationOrders &&
        job.installationOrders.length > 0 &&
        job.installationOrders[0].technician
      ) {
        techName = job.installationOrders[0].technician;
      }
      if (!techName && job.sellerName) {
        techName = job.sellerName;
      }

      return {
        id: job.id,
        jobNumber: job.jobNumber,
        customerName: job.customerName || "ไม่ระบุชื่อลูกค้า",
        jobType: job.jobType || "บริการ",
        currentStep: job.currentStep,
        stepLabel: JOB_STEP_LABELS[job.currentStep] || job.currentStep,
        department: getJobDepartment(job.currentStep, job.stepLogs[0]?.department),
        daysInStatus,
        threshold,
        delayDays,
        severity,
        technicianName: techName || "ไม่ระบุผู้รับผิดชอบ",
        updatedAt: job.updatedAt.toISOString(),
        createdAt: job.createdAt.toISOString(),
        isBreached,
      };
    })
    .filter((j) => j.isBreached)
    .sort((a, b) => b.delayDays - a.delayDays);

  // 7. Calculate On-Time Delivery Rate
  let totalAssessed = 0;
  let onTimeCount = 0;

  completedOrders.forEach((o) => {
    totalAssessed++;
    if (o.targetDeliveryDate) {
      if (o.updatedAt <= o.targetDeliveryDate) onTimeCount++;
    } else {
      const durationDays =
        (o.updatedAt.getTime() - o.createdAt.getTime()) / (1000 * 3600 * 24);
      if (durationDays <= 14) onTimeCount++;
    }
  });

  completedJobs.forEach((j) => {
    totalAssessed++;
    const closeDate = j.deliveryDate || j.dateClosed || j.updatedAt;
    if (j.requiredDeliveryDate) {
      if (closeDate <= j.requiredDeliveryDate) onTimeCount++;
    } else {
      const durationDays =
        (closeDate.getTime() - j.createdAt.getTime()) / (1000 * 3600 * 24);
      if (durationDays <= 10) onTimeCount++;
    }
  });

  const onTimeDeliveryRate =
    totalAssessed > 0 ? (onTimeCount / totalAssessed) * 100 : 88.5;

  // 8. Aggregate Department Bottleneck Matrix
  const deptStatsMap: Record<
    string,
    {
      department: string;
      orderCount: number;
      jobCount: number;
      totalCount: number;
      criticalCount: number;
      totalDelayDays: number;
      maxDelayDays: number;
    }
  > = {};

  const ensureDept = (name: string) => {
    if (!deptStatsMap[name]) {
      deptStatsMap[name] = {
        department: name,
        orderCount: 0,
        jobCount: 0,
        totalCount: 0,
        criticalCount: 0,
        totalDelayDays: 0,
        maxDelayDays: 0,
      };
    }
    return deptStatsMap[name];
  };

  breachedOrders.forEach((o) => {
    const stat = ensureDept(o.department);
    stat.orderCount++;
    stat.totalCount++;
    stat.totalDelayDays += o.delayDays;
    if (o.severity === "critical") stat.criticalCount++;
    if (o.delayDays > stat.maxDelayDays) stat.maxDelayDays = o.delayDays;
  });

  breachedJobs.forEach((j) => {
    const stat = ensureDept(j.department);
    stat.jobCount++;
    stat.totalCount++;
    stat.totalDelayDays += j.delayDays;
    if (j.severity === "critical") stat.criticalCount++;
    if (j.delayDays > stat.maxDelayDays) stat.maxDelayDays = j.delayDays;
  });

  const departmentStats: DepartmentStat[] = Object.values(deptStatsMap)
    .map((d) => ({
      department: d.department,
      orderCount: d.orderCount,
      jobCount: d.jobCount,
      totalCount: d.totalCount,
      criticalCount: d.criticalCount,
      avgDelayDays: d.totalCount > 0 ? Math.round(d.totalDelayDays / d.totalCount) : 0,
      maxDelayDays: d.maxDelayDays,
    }))
    .sort((a, b) => b.totalCount - a.totalCount);

  const totalBreachedValue = breachedOrders.reduce(
    (sum, o) => sum + (o.value || 0),
    0
  );

  const lastUpdatedTime =
    new Date().toLocaleTimeString("th-TH", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
    }) + " น.";

  return (
    <SLAClientDashboard
      breachedOrders={breachedOrders}
      breachedJobs={breachedJobs}
      totalActiveOrders={activeOrders.length}
      totalActiveJobs={activeJobs.length}
      onTimeDeliveryRate={onTimeDeliveryRate}
      departmentStats={departmentStats}
      totalBreachedValue={totalBreachedValue}
      lastUpdatedTime={lastUpdatedTime}
    />
  );
}
