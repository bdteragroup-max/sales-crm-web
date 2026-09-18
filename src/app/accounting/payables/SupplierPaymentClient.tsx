"use client";

import React, { useState, useTransition, useMemo } from "react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import {
  markSupplierPaymentPaid,
  updateSupplierPaymentSchedule,
  backfillSupplierPayments,
  splitSupplierPaymentTask,
  mergeSupplierPaymentTasks,
} from "@/app/actions/supplierPayment";
import {
  SupplierPaymentTask,
  ConsolidatedPO,
  DashboardSummary,
  StatusTabType,
  CompanyFilterType,
  PaymentTypeFilter,
  GoodsReceivedFilter,
  DateFieldType,
  ViewModeType,
  isValidDate,
  formatDate,
  extractCompany,
  matchDateFilters,
  getGoodsReceiptInfo,
} from "./components/payablesTypes";
import PayablesHeader from "./components/PayablesHeader";
import PayablesKpiCards from "./components/PayablesKpiCards";
import PayablesFilterBar from "./components/PayablesFilterBar";
import ConsolidatedPoTable from "./components/ConsolidatedPoTable";
import TasksTable from "./components/TasksTable";
import PoDetailModal from "./components/PoDetailModal";
import PaymentRecordModal from "./components/PaymentRecordModal";
import ScheduleEditModal from "./components/ScheduleEditModal";
import SplitInstallmentModal from "./components/SplitInstallmentModal";

interface SupplierPaymentClientProps {
  initialTasks: SupplierPaymentTask[];
  initialSummary: DashboardSummary;
  currentUser?: { id: string; fullName: string; role: string };
}

export default function SupplierPaymentClient({
  initialTasks,
  initialSummary,
}: SupplierPaymentClientProps) {
  const [tasks, setTasks] = useState<SupplierPaymentTask[]>(initialTasks);
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary);
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);

  // View Mode: Consolidated by PO (Default) vs By Installment Task
  const [viewMode, setViewMode] = useState<ViewModeType>("CONSOLIDATED");

  // Filter States
  const [activeStatusTab, setActiveStatusTab] = useState<StatusTabType>("ALL");
  const [companyFilter, setCompanyFilter] = useState<CompanyFilterType>("ALL");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<PaymentTypeFilter>("ALL");
  const [goodsReceivedFilter, setGoodsReceivedFilter] = useState<GoodsReceivedFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Date, Month, Year Filter States
  const [dateFieldType, setDateFieldType] = useState<DateFieldType>("DUE_DATE");
  const [yearFilter, setYearFilter] = useState<string>("ALL");
  const [monthFilter, setMonthFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Table Expanded / Selected States
  const [expandedPoNumbers, setExpandedPoNumbers] = useState<Record<string, boolean>>({});
  const [selectedPoNumber, setSelectedPoNumber] = useState<string | null>(null);

  // Modals States
  const [selectedTaskForPayment, setSelectedTaskForPayment] =
    useState<SupplierPaymentTask | null>(null);
  const [selectedTaskForEdit, setSelectedTaskForEdit] =
    useState<SupplierPaymentTask | null>(null);
  const [splitTargetTask, setSplitTargetTask] =
    useState<SupplierPaymentTask | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Compute available years
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      const dates = [
        t.dueDate,
        t.paidDate,
        t.purchaseOrder?.recordedAt,
        t.purchaseOrder?.createdAt,
      ];
      for (const d of dates) {
        if (d && isValidDate(d)) {
          const dt = new Date(d);
          const yearBE = (dt.getFullYear() + (dt.getFullYear() < 2500 ? 543 : 0)).toString();
          set.add(yearBE);
        }
      }
    }
    const currentBE = (new Date().getFullYear() + 543).toString();
    set.add(currentBE);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [tasks]);

  // Quick Date Presets
  const applyTodayPreset = () => {
    const today = new Date();
    setDateFilter(today.toISOString().slice(0, 10));
    setYearFilter("ALL");
    setMonthFilter("ALL");
    setCurrentPage(1);
  };

  const applyThisMonthPreset = () => {
    const today = new Date();
    const yearBE = (today.getFullYear() + (today.getFullYear() < 2500 ? 543 : 0)).toString();
    const monthStr = (today.getMonth() + 1).toString();
    setYearFilter(yearBE);
    setMonthFilter(monthStr);
    setDateFilter("");
    setCurrentPage(1);
  };

  const applyNextMonthPreset = () => {
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const yearBE = (
      nextMonthDate.getFullYear() + (nextMonthDate.getFullYear() < 2500 ? 543 : 0)
    ).toString();
    const monthStr = (nextMonthDate.getMonth() + 1).toString();
    setYearFilter(yearBE);
    setMonthFilter(monthStr);
    setDateFilter("");
    setCurrentPage(1);
  };

  const clearDateFilters = () => {
    setYearFilter("ALL");
    setMonthFilter("ALL");
    setDateFilter("");
    setCurrentPage(1);
  };

  const resetAllFilters = () => {
    setActiveStatusTab("ALL");
    setCompanyFilter("ALL");
    setPaymentTypeFilter("ALL");
    setGoodsReceivedFilter("ALL");
    setSearchQuery("");
    clearDateFilters();
  };

  const toggleExpandPO = (poNumber: string) => {
    setExpandedPoNumbers((prev) => ({
      ...prev,
      [poNumber]: !prev[poNumber],
    }));
  };

  // 1. Consolidated POs Aggregation (Grouping by PO Number)
  const consolidatedPOs: ConsolidatedPO[] = useMemo(() => {
    const map = new Map<string, any>();
    const now = new Date();

    for (const t of tasks) {
      const poNum = t.poNumber || t.purchaseOrder?.poNumber || `UNKNOWN-${t.id}`;
      if (!map.has(poNum)) {
        map.set(poNum, {
          poNumber: poNum,
          prNumber: t.purchaseOrder?.prNumber || null,
          company: extractCompany(t),
          purchaseOrder: t.purchaseOrder || {},
          goodsReceipt: t.goodsReceipt || null,
          tasks: [],
        });
      }
      const group = map.get(poNum);
      group.tasks.push(t);
      if (!group.goodsReceipt && t.goodsReceipt) {
        group.goodsReceipt = t.goodsReceipt;
      }
      if (!group.purchaseOrder && t.purchaseOrder) {
        group.purchaseOrder = t.purchaseOrder;
      }
    }

    const list: ConsolidatedPO[] = [];

    for (const group of map.values()) {
      group.tasks.sort((a: any, b: any) => {
        if (a.paymentType === "DEPOSIT" && b.paymentType !== "DEPOSIT") return -1;
        if (a.paymentType !== "DEPOSIT" && b.paymentType === "DEPOSIT") return 1;
        return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
      });

      const depositTask = group.tasks.find((t: any) => t.paymentType === "DEPOSIT");
      const balanceTask = group.tasks.find((t: any) => t.paymentType === "FINAL_BALANCE");

      let totalGross = 0;
      let totalWht = 0;
      let totalNet = 0;
      let totalPaid = 0;
      let totalPendingNet = 0;
      let allPaid = group.tasks.length > 0;
      let anyPaid = false;
      let anyOverdue = false;
      let anyAwaitingGR = false;
      let earliestDueDate: string | null = null;

      for (const t of group.tasks) {
        const gross = Number(t.grossAmount) || 0;
        const wht = Number(t.whtAmount) || 0;
        const net = Number(t.netPayableAmount) || 0;
        const paid = Number(t.paidAmount) || 0;
        const isTaskPaid = t.status === "PAID_VERIFIED";

        totalGross += gross;
        totalWht += wht;
        totalNet += net;

        if (isTaskPaid) {
          totalPaid += paid || net;
          anyPaid = true;
        } else {
          totalPendingNet += net;
          allPaid = false;

          if (t.status === "AWAITING_GR") {
            anyAwaitingGR = true;
          }

          if (t.dueDate && isValidDate(t.dueDate)) {
            const d = new Date(t.dueDate);
            if (d < now && t.status !== "AWAITING_GR") {
              anyOverdue = true;
            }
            if (!earliestDueDate || d < new Date(earliestDueDate)) {
              earliestDueDate = typeof t.dueDate === "string" ? t.dueDate : t.dueDate.toISOString();
            }
          }
        }
      }

      let overallStatus: ConsolidatedPO["overallStatus"];
      if (allPaid) {
        overallStatus = "PAID_VERIFIED";
      } else if (anyOverdue) {
        overallStatus = "OVERDUE";
      } else if (anyPaid) {
        overallStatus = "PARTIALLY_PAID";
      } else if (anyAwaitingGR) {
        overallStatus = "AWAITING_GR";
      } else {
        overallStatus = "PENDING";
      }

      let earliestDaysLeft: number | null = null;
      if (earliestDueDate) {
        const diff = new Date(earliestDueDate).getTime() - now.getTime();
        earliestDaysLeft = Math.ceil(diff / (1000 * 3600 * 24));
      }

      const poObj = group.purchaseOrder;
      const grObj = group.goodsReceipt;
      const isPoReceived = poObj?.receiveStatus === "Received" || poObj?.receiveStatus === "RECEIVED";
      const hasPoReceivedAt = Boolean(poObj?.receivedAt);
      const hasGrReceivedAt = Boolean(grObj?.receivedAt);
      const isGrComplete = grObj?.isCompleteDelivery === true;
      const nonDepositTasks = group.tasks.filter((t: any) => t.paymentType !== "DEPOSIT");
      const isTasksReceived = nonDepositTasks.length > 0 && nonDepositTasks.every((t: any) => t.isGoodsReceived);

      const isAllGoodsReceived =
        isPoReceived ||
        hasPoReceivedAt ||
        hasGrReceivedAt ||
        isGrComplete ||
        isTasksReceived ||
        group.tasks.every(
          (t: any) => t.isGoodsReceived || t.paymentType === "DEPOSIT"
        );

      list.push({
        poNumber: group.poNumber,
        prNumber: group.prNumber,
        company: group.company,
        purchaseOrder: group.purchaseOrder,
        goodsReceipt: group.goodsReceipt,
        tasks: group.tasks,
        depositTask,
        balanceTask,
        totalGross: Math.round(totalGross * 100) / 100,
        totalWht: Math.round(totalWht * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalPendingNet: Math.round(totalPendingNet * 100) / 100,
        overallStatus,
        earliestDueDate,
        earliestDaysLeft,
        isAllGoodsReceived,
      });
    }

    return list;
  }, [tasks]);

  // Selected PO Master Detail for Modal
  const selectedPODetail = useMemo(() => {
    if (!selectedPoNumber) return null;
    return consolidatedPOs.find((p) => p.poNumber === selectedPoNumber) || null;
  }, [selectedPoNumber, consolidatedPOs]);

  // Consolidated POs Status Counts
  const consolidatedCounts = useMemo(() => {
    let awaitingGr = 0;
    let readyToPay = 0;
    let overdue = 0;
    let paid = 0;

    for (const po of consolidatedPOs) {
      if (po.overallStatus === "PAID_VERIFIED") paid++;
      else if (po.overallStatus === "OVERDUE") overdue++;
      else if (po.overallStatus === "AWAITING_GR") awaitingGr++;
      else readyToPay++;
    }

    return {
      total: consolidatedPOs.length,
      awaitingGr,
      readyToPay,
      overdue,
      paid,
    };
  }, [consolidatedPOs]);

  // Filter Pipeline for Consolidated POs
  const filteredConsolidatedPOs = useMemo(() => {
    return consolidatedPOs.filter((po) => {
      // 1. Status Filter
      if (activeStatusTab === "AWAITING_GR") {
        if (
          po.overallStatus !== "AWAITING_GR" &&
          !po.tasks.some((t: any) => t.status === "AWAITING_GR")
        )
          return false;
      } else if (activeStatusTab === "PENDING") {
        if (po.overallStatus !== "PENDING" && po.overallStatus !== "PARTIALLY_PAID") return false;
      } else if (activeStatusTab === "OVERDUE") {
        if (po.overallStatus !== "OVERDUE") return false;
      } else if (activeStatusTab === "PAID_VERIFIED") {
        if (po.overallStatus !== "PAID_VERIFIED") return false;
      }

      // 2. Company Filter
      if (companyFilter !== "ALL" && po.company !== companyFilter) {
        return false;
      }

      // 3. Payment Type Filter
      if (paymentTypeFilter === "DEPOSIT" && !po.depositTask) return false;
      if (paymentTypeFilter === "FINAL_BALANCE" && !po.balanceTask) return false;

      // 4. Goods Received Filter
      if (goodsReceivedFilter !== "ALL") {
        const info = getGoodsReceiptInfo(po);
        if (goodsReceivedFilter === "RECEIVED" && !info.isReceived) return false;
        if (goodsReceivedFilter === "AWAITING" && info.isReceived) return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const poNum = (po.poNumber || "").toLowerCase();
        const prNum = (po.prNumber || "").toLowerCase();
        const vendor = (po.purchaseOrder?.vendorName || "").toLowerCase();
        const job = (po.purchaseOrder?.jobName || "").toLowerCase();
        const project = (po.purchaseOrder?.purchaseRequest?.projectName || "").toLowerCase();
        const account = (po.purchaseOrder?.accountNumber || "").toLowerCase();
        const items = (po.purchaseOrder?.itemList || "").toLowerCase();
        const note = (po.purchaseOrder?.note || "").toLowerCase();

        if (
          !poNum.includes(q) &&
          !prNum.includes(q) &&
          !vendor.includes(q) &&
          !job.includes(q) &&
          !project.includes(q) &&
          !account.includes(q) &&
          !items.includes(q) &&
          !note.includes(q)
        ) {
          return false;
        }
      }

      // 5. Date, Month, Year Filter
      if (yearFilter !== "ALL" || monthFilter !== "ALL" || dateFilter) {
        if (dateFieldType === "PO_DATE") {
          const poDate = po.purchaseOrder?.recordedAt || po.purchaseOrder?.createdAt;
          if (!matchDateFilters(poDate, yearFilter, monthFilter, dateFilter)) {
            return false;
          }
        } else if (dateFieldType === "PAID_DATE") {
          const hasMatchingPaidTask = po.tasks.some(
            (t: any) =>
              t.status === "PAID_VERIFIED" &&
              matchDateFilters(t.paidDate, yearFilter, monthFilter, dateFilter)
          );
          if (!hasMatchingPaidTask) return false;
        } else {
          // DUE_DATE
          const hasMatchingDueTask = po.tasks.some((t: any) =>
            matchDateFilters(t.dueDate, yearFilter, monthFilter, dateFilter)
          );
          if (!hasMatchingDueTask) return false;
        }
      }

      return true;
    });
  }, [
    consolidatedPOs,
    activeStatusTab,
    companyFilter,
    paymentTypeFilter,
    goodsReceivedFilter,
    searchQuery,
    dateFieldType,
    yearFilter,
    monthFilter,
    dateFilter,
  ]);

  // Filter Pipeline for Individual Tasks
  const filteredTasks = useMemo(() => {
    const now = new Date();

    return tasks.filter((t) => {
      const isOverdue =
        t.status !== "PAID_VERIFIED" &&
        t.status !== "CANCELLED" &&
        t.status !== "AWAITING_GR" &&
        t.dueDate &&
        isValidDate(t.dueDate) &&
        new Date(t.dueDate) < now;

      // 1. Status Filter
      if (activeStatusTab === "AWAITING_GR" && t.status !== "AWAITING_GR") return false;
      if (
        activeStatusTab === "PENDING" &&
        t.status !== "PENDING" &&
        t.status !== "APPROVED"
      )
        return false;
      if (activeStatusTab === "OVERDUE" && !isOverdue) return false;
      if (activeStatusTab === "PAID_VERIFIED" && t.status !== "PAID_VERIFIED") return false;

      // 2. Company Filter
      if (companyFilter !== "ALL") {
        const co = extractCompany(t);
        if (co !== companyFilter) return false;
      }

      // 3. Payment Type Filter
      if (paymentTypeFilter !== "ALL" && t.paymentType !== paymentTypeFilter) return false;

      // 4. Goods Received Filter
      if (goodsReceivedFilter !== "ALL") {
        const info = getGoodsReceiptInfo(t);
        if (goodsReceivedFilter === "RECEIVED" && !info.isReceived) return false;
        if (goodsReceivedFilter === "AWAITING" && info.isReceived) return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const po = (t.poNumber || "").toLowerCase();
        const pr = (t.purchaseOrder?.prNumber || "").toLowerCase();
        const vendor = (t.purchaseOrder?.vendorName || "").toLowerCase();
        const job = (t.purchaseOrder?.jobName || "").toLowerCase();
        const project = (t.purchaseOrder?.purchaseRequest?.projectName || "").toLowerCase();
        const account = (t.purchaseOrder?.accountNumber || "").toLowerCase();
        const items = (t.purchaseOrder?.itemList || "").toLowerCase();
        const note = (t.purchaseOrder?.note || "").toLowerCase();

        if (
          !po.includes(q) &&
          !pr.includes(q) &&
          !vendor.includes(q) &&
          !job.includes(q) &&
          !project.includes(q) &&
          !account.includes(q) &&
          !items.includes(q) &&
          !note.includes(q)
        ) {
          return false;
        }
      }

      // 5. Date, Month, Year Filter
      if (yearFilter !== "ALL" || monthFilter !== "ALL" || dateFilter) {
        if (dateFieldType === "PO_DATE") {
          const poDate = t.purchaseOrder?.recordedAt || t.purchaseOrder?.createdAt;
          if (!matchDateFilters(poDate, yearFilter, monthFilter, dateFilter)) {
            return false;
          }
        } else if (dateFieldType === "PAID_DATE") {
          if (t.status !== "PAID_VERIFIED") return false;
          if (!matchDateFilters(t.paidDate, yearFilter, monthFilter, dateFilter)) {
            return false;
          }
        } else {
          // DUE_DATE
          if (!matchDateFilters(t.dueDate, yearFilter, monthFilter, dateFilter)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    tasks,
    activeStatusTab,
    companyFilter,
    paymentTypeFilter,
    goodsReceivedFilter,
    searchQuery,
    dateFieldType,
    yearFilter,
    monthFilter,
    dateFilter,
  ]);

  // Active Count & Pagination
  const currentTotalItems =
    viewMode === "CONSOLIDATED" ? filteredConsolidatedPOs.length : filteredTasks.length;
  const totalPages = Math.max(1, Math.ceil(currentTotalItems / pageSize));

  const paginatedConsolidatedPOs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredConsolidatedPOs.slice(start, start + pageSize);
  }, [filteredConsolidatedPOs, currentPage]);

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage]);

  // Export to Excel
  const exportToExcel = () => {
    if (viewMode === "CONSOLIDATED") {
      const data = filteredConsolidatedPOs.map((po) => ({
        "เลขที่ PO": po.poNumber,
        "เลขที่ PR": po.prNumber || "-",
        "บริษัท": po.company,
        "ชื่อผู้ขาย / คู่ค้า": po.purchaseOrder?.vendorName || "-",
        "เลขที่บัญชีธนาคาร": po.purchaseOrder?.accountNumber || "-",
        "ชื่องาน / โครงการ":
          po.purchaseOrder?.jobName ||
          po.purchaseOrder?.purchaseRequest?.projectName ||
          "-",
        "ยอดรวม PO (Gross)": po.totalGross,
        "หัก ณ ที่จ่ายรวม (WHT)": po.totalWht,
        "ยอดจ่ายสุทธิรวม (Net)": po.totalNet,
        "จ่ายแล้วจริง": po.totalPaid,
        "ยอดคงเหลือรอจ่าย": po.totalPendingNet,
        "สถานะมัดจำ (งวด 1)": po.depositTask
          ? po.depositTask.status === "PAID_VERIFIED"
            ? "จ่ายแล้ว"
            : "รอจ่าย"
          : "ไม่มีมัดจำ",
        "สถานะยอดคงเหลือ (งวด 2)": po.balanceTask
          ? po.balanceTask.status === "PAID_VERIFIED"
            ? "จ่ายแล้ว"
            : po.balanceTask.status === "AWAITING_GR"
            ? "รอตรวจรับของ"
            : "รอจ่าย"
          : "-",
        "สถานะตรวจรับสินค้า (GR)": getGoodsReceiptInfo(po).label,
        "รายละเอียดการตรวจรับ": getGoodsReceiptInfo(po).subLabel || "-",
        "ผู้ตรวจรับสินค้า": getGoodsReceiptInfo(po).receivedBy || "-",
        "วันที่ตรวจรับ": getGoodsReceiptInfo(po).receivedAt || "-",
        "วันครบกำหนดใกล้สุด": po.earliestDueDate ? formatDate(po.earliestDueDate) : "-",
        "สถานะภาพรวม":
          po.overallStatus === "PAID_VERIFIED"
            ? "จ่ายครบแล้ว"
            : po.overallStatus === "PARTIALLY_PAID"
            ? "จ่ายแล้วบางส่วน"
            : po.overallStatus === "OVERDUE"
            ? "เกินกำหนด"
            : po.overallStatus === "AWAITING_GR"
            ? "รอตรวจรับของ"
            : "รอจ่าย",
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "PO Consolidated Payables");
      XLSX.writeFile(
        workbook,
        `PO_Payables_Consolidated_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      return;
    }

    const data = filteredTasks.map((t) => {
      const isPaid = t.status === "PAID_VERIFIED";
      let creditDaysLeft = "-";
      if (!isPaid && t.dueDate && isValidDate(t.dueDate)) {
        const diff = new Date(t.dueDate).getTime() - new Date().getTime();
        creditDaysLeft = Math.ceil(diff / (1000 * 3600 * 24)).toString();
      }

      return {
        "เลขที่ PO": t.poNumber,
        "เลขที่ PR": t.purchaseOrder?.prNumber || "-",
        "บริษัท": extractCompany(t),
        "ชื่อผู้ขาย / คู่ค้า": t.purchaseOrder?.vendorName || "-",
        "เลขที่บัญชีธนาคาร": t.purchaseOrder?.accountNumber || "-",
        "ชื่องาน / โครงการ":
          t.purchaseOrder?.jobName ||
          t.purchaseOrder?.purchaseRequest?.projectName ||
          "-",
        "งวดการชำระ": t.paymentType === "DEPOSIT" ? "เงินมัดจำล่วงหน้า" : "ยอดจ่ายคงเหลือ",
        "ยอดก่อนหักภาษี (Gross)": Number(t.grossAmount) || 0,
        "อัตราหัก ณ ที่จ่าย (%)": `${Number(t.whtPercent) || 0}%`,
        "ยอดภาษีหัก ณ ที่จ่าย (WHT)": Number(t.whtAmount) || 0,
        "ยอดจ่ายสุทธิ (Net Payable)": Number(t.netPayableAmount) || 0,
        "สถานะตรวจรับสินค้า (GR)": getGoodsReceiptInfo(t).label,
        "รายละเอียดการตรวจรับ": getGoodsReceiptInfo(t).subLabel || "-",
        "ผู้ตรวจรับสินค้า": getGoodsReceiptInfo(t).receivedBy || "-",
        "วันที่ตรวจรับ": getGoodsReceiptInfo(t).receivedAt || "-",
        "วันครบกำหนด": t.dueDate ? formatDate(t.dueDate) : "-",
        "วันเครดิตคงเหลือ (วัน)": creditDaysLeft,
        "สถานะการจ่าย":
          t.status === "PAID_VERIFIED"
            ? "จ่ายแล้ว"
            : t.status === "AWAITING_GR"
            ? "รอตรวจรับของ"
            : "รอจ่าย",
        "ธนาคารที่จ่าย": t.paidFromBankCode || "-",
        "เลขที่ 50 ทวิ": t.whtCertNumber || "-",
        "วันที่จ่ายจริง": t.paidDate ? formatDate(t.paidDate) : "-",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Supplier Payables");
    XLSX.writeFile(workbook, `Supplier_Payables_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Submit Payment Action
  const handleConfirmPayment = (details: {
    paidAmount: number;
    paidDate: string;
    paidFromBankCode: string;
    bankRefNumber: string;
    whtCertNumber: string;
    paymentNote: string;
    allowBypassGR: boolean;
  }) => {
    if (!selectedTaskForPayment) return;

    startTransition(async () => {
      const res = await markSupplierPaymentPaid(selectedTaskForPayment.id, {
        paidAmount: details.paidAmount,
        paidDate: details.paidDate,
        paidFromBankCode: details.paidFromBankCode,
        bankReferenceNumber: details.bankRefNumber,
        whtCertNumber: details.whtCertNumber,
        note: details.paymentNote,
        allowBypassGR: details.allowBypassGR,
      });

      if (!res.success) {
        Swal.fire({
          icon: "warning",
          title: "ไม่สามารถบันทึกจ่ายเงินได้",
          text: res.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
        });
        return;
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTaskForPayment.id
            ? {
                ...t,
                status: "PAID_VERIFIED",
                paidAmount: details.paidAmount,
                paidDate: new Date(details.paidDate).toISOString(),
                paidFromBankCode: details.paidFromBankCode,
                bankReferenceNumber: details.bankRefNumber,
                whtCertNumber: details.whtCertNumber,
              }
            : t
        )
      );

      // Update summary
      setSummary((prev) => ({
        ...prev,
        pendingCount: Math.max(0, prev.pendingCount - 1),
        paidCount: prev.paidCount + 1,
        paidAmount: prev.paidAmount + details.paidAmount,
        totalPendingNet: Math.max(
          0,
          prev.totalPendingNet - (Number(selectedTaskForPayment.netPayableAmount) || 0)
        ),
      }));

      setSelectedTaskForPayment(null);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "บันทึกจ่ายเงินเจ้าหนี้สำเร็จ",
        showConfirmButton: false,
        timer: 1500,
      });
    });
  };

  // Save Schedule Edit & Deferral / Accounting Modifications
  const handleSaveScheduleEdit = (details: {
    dueDate: string;
    deferralReason: string;
    paidDate?: string;
    paymentMethod: string;
    chequeDueDate?: string;
    chequeNumber?: string;
    note: string;
    whtPercent?: number;
    grossAmount?: number;
    vendorName?: string;
    accountNumber?: string;
    creditTerm?: string;
    jobName?: string;
    editorReason?: string;
  }) => {
    if (!selectedTaskForEdit) return;

    startTransition(async () => {
      const res = await updateSupplierPaymentSchedule(selectedTaskForEdit.id, {
        dueDate: details.dueDate,
        deferralReason: details.deferralReason,
        paidDate: details.paidDate || undefined,
        paymentMethod: details.paymentMethod,
        chequeDueDate: details.chequeDueDate || undefined,
        chequeNumber: details.chequeNumber || undefined,
        note: details.note,
        whtPercent: details.whtPercent,
        grossAmount: details.grossAmount,
        vendorName: details.vendorName,
        accountNumber: details.accountNumber,
        creditTerm: details.creditTerm,
        jobName: details.jobName,
        editorReason: details.editorReason,
      });

      if (!res.success) {
        Swal.fire({
          icon: "error",
          title: "ไม่สามารถบันทึกได้",
          text: res.error || "เกิดข้อผิดพลาดในการบันทึก",
        });
        return;
      }

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === selectedTaskForEdit.id) {
            return { ...t, ...res.task };
          }
          // If vendor, account, or PO note changed, sync to other tasks of the same PO
          if (t.poNumber === selectedTaskForEdit.poNumber && res.task?.purchaseOrder) {
            return {
              ...t,
              purchaseOrder: {
                ...t.purchaseOrder,
                ...res.task.purchaseOrder,
              },
            };
          }
          return t;
        })
      );

      setSelectedTaskForEdit(null);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "บันทึกการปรับปรุงข้อมูลและภาษีหัก ณ ที่จ่ายสำเร็จ",
        showConfirmButton: false,
        timer: 2000,
      });
    });
  };

  // Confirm Split Installments
  const handleConfirmSplit = (
    installments: Array<{
      grossAmount: number;
      dueDate: string;
      note: string;
      whtPercent: number;
    }>
  ) => {
    if (!splitTargetTask || installments.length < 2) return;

    startTransition(async () => {
      const res = await splitSupplierPaymentTask(splitTargetTask.id, installments);
      if (res.success && res.tasks) {
        setTasks((prev) => {
          const filtered = prev.filter((t) => t.id !== splitTargetTask.id);
          return [...filtered, ...res.tasks];
        });
        setSplitTargetTask(null);
        Swal.fire({
          icon: "success",
          title: "แบ่งงวดชำระสำเร็จ",
          text: `แบ่งยอดคงเหลือเป็น ${installments.length} งวดเรียบร้อยแล้ว`,
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: res.error || "ไม่สามารถแบ่งงวดได้",
        });
      }
    });
  };

  // Merge Installments Back to One
  const handleMergeTasks = (poNumber: string) => {
    Swal.fire({
      title: "รวมงวดชำระกลับเป็นงวดเดียว?",
      text: "ต้องการยุบรวมงวดแบ่งชำระทั้งหมดกลับมาเป็นยอดจ่ายคงเหลืองวดเดียวใช่หรือไม่?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ยืนยันรวมงวด",
      cancelButtonText: "ยกเลิก",
    }).then(async (result) => {
      if (result.isConfirmed) {
        startTransition(async () => {
          const res = await mergeSupplierPaymentTasks(poNumber);
          if (res.success) {
            window.location.reload();
          } else {
            Swal.fire({
              icon: "error",
              title: "ไม่สามารถรวมงวดได้",
              text: res.error || "เกิดข้อผิดพลาด",
            });
          }
        });
      }
    });
  };

  // Sync POs Backfill Trigger
  const handleSyncPOs = async () => {
    const confirm = await Swal.fire({
      title: "ซิงค์ยอดจัดซื้อทั้งหมด?",
      text: "ระบบจะตรวจสอบใบสั่งซื้อ (PO) ที่ยังไม่เคยสร้างรายการจ่ายเงิน และสร้างตารางชำระ 2 งวด (มัดจำ + จ่ายคงเหลือ) พร้อมคำนวณหัก ณ ที่จ่ายให้อัตโนมัติ",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "เริ่มซิงค์ข้อมูล",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#059669",
    });

    if (!confirm.isConfirmed) return;

    setIsSyncing(true);
    try {
      const res = await backfillSupplierPayments(2000);
      if (res.success) {
        Swal.fire({
          icon: "success",
          title: "ซิงค์ข้อมูลสำเร็จ",
          text: `ประมวลผล PO ทั้งหมด ${res.totalTargeted} รายการ, สำเร็จ ${res.totalSynced} รายการ`,
        }).then(() => {
          window.location.reload();
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "ไม่สามารถซิงค์ได้",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-[1920px] mx-auto space-y-6">
      {/* 1. Header & Quick Links */}
      <PayablesHeader
        isSyncing={isSyncing}
        onSyncPOs={handleSyncPOs}
        onExportExcel={exportToExcel}
      />

      {/* 2. Top 5 Key Financial Metric KPI Cards */}
      <PayablesKpiCards
        summary={summary}
        activeStatusTab={activeStatusTab}
        onSelectStatusTab={(status) => {
          setActiveStatusTab(status);
          setCurrentPage(1);
        }}
      />

      {/* 3. Search & Filtering Control Hub */}
      <PayablesFilterBar
        viewMode={viewMode}
        onChangeViewMode={(mode) => {
          setViewMode(mode);
          setCurrentPage(1);
        }}
        consolidatedTotalCount={consolidatedCounts.total}
        tasksTotalCount={tasks.length}
        activeStatusTab={activeStatusTab}
        onChangeStatusTab={(status) => {
          setActiveStatusTab(status);
          setCurrentPage(1);
        }}
        statusCounts={
          viewMode === "CONSOLIDATED"
            ? consolidatedCounts
            : {
                total: tasks.length,
                awaitingGr: summary.awaitingGrCount,
                readyToPay: summary.readyToPayCount,
                overdue: summary.overdueCount,
                paid: summary.paidCount,
              }
        }
        companyFilter={companyFilter}
        onChangeCompanyFilter={(co) => {
          setCompanyFilter(co);
          setCurrentPage(1);
        }}
        searchQuery={searchQuery}
        onChangeSearchQuery={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        paymentTypeFilter={paymentTypeFilter}
        onChangePaymentTypeFilter={(pt) => {
          setPaymentTypeFilter(pt);
          setCurrentPage(1);
        }}
        goodsReceivedFilter={goodsReceivedFilter}
        onChangeGoodsReceivedFilter={(gr) => {
          setGoodsReceivedFilter(gr);
          setCurrentPage(1);
        }}
        dateFieldType={dateFieldType}
        onChangeDateFieldType={(dft) => {
          setDateFieldType(dft);
          setCurrentPage(1);
        }}
        yearFilter={yearFilter}
        onChangeYearFilter={(year) => {
          setYearFilter(year);
          setCurrentPage(1);
        }}
        monthFilter={monthFilter}
        onChangeMonthFilter={(month) => {
          setMonthFilter(month);
          setCurrentPage(1);
        }}
        dateFilter={dateFilter}
        onChangeDateFilter={(date) => {
          setDateFilter(date);
          setCurrentPage(1);
        }}
        availableYears={availableYears}
        onApplyToday={applyTodayPreset}
        onApplyThisMonth={applyThisMonthPreset}
        onApplyNextMonth={applyNextMonthPreset}
        onClearDateFilters={clearDateFilters}
        onResetAllFilters={resetAllFilters}
        filteredCount={currentTotalItems}
      />

      {/* 4. Table Section (Consolidated vs Tasks) */}
      {viewMode === "CONSOLIDATED" ? (
        <ConsolidatedPoTable
          data={paginatedConsolidatedPOs}
          expandedPoNumbers={expandedPoNumbers}
          onToggleExpandPO={toggleExpandPO}
          onOpenPoDetail={(poNum) => setSelectedPoNumber(poNum)}
          onOpenPaymentModal={(task) => setSelectedTaskForPayment(task)}
          onOpenEditModal={(task) => setSelectedTaskForEdit(task)}
          onOpenSplitModal={(task) => setSplitTargetTask(task)}
          onMergeTasks={handleMergeTasks}
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={currentTotalItems}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
          goodsReceivedFilter={goodsReceivedFilter}
          onChangeGoodsReceivedFilter={(gr) => {
            setGoodsReceivedFilter(gr);
            setCurrentPage(1);
          }}
          paymentTypeFilter={paymentTypeFilter}
          onChangePaymentTypeFilter={(pt) => {
            setPaymentTypeFilter(pt);
            setCurrentPage(1);
          }}
          companyFilter={companyFilter}
          onChangeCompanyFilter={(co) => {
            setCompanyFilter(co);
            setCurrentPage(1);
          }}
          activeStatusTab={activeStatusTab}
          onChangeStatusTab={(st) => {
            setActiveStatusTab(st);
            setCurrentPage(1);
          }}
        />
      ) : (
        <TasksTable
          tasks={paginatedTasks}
          allTasks={tasks}
          onOpenPoDetail={(poNum) => setSelectedPoNumber(poNum)}
          onOpenPaymentModal={(task) => setSelectedTaskForPayment(task)}
          onOpenEditModal={(task) => setSelectedTaskForEdit(task)}
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={currentTotalItems}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
          goodsReceivedFilter={goodsReceivedFilter}
          onChangeGoodsReceivedFilter={(gr) => {
            setGoodsReceivedFilter(gr);
            setCurrentPage(1);
          }}
          paymentTypeFilter={paymentTypeFilter}
          onChangePaymentTypeFilter={(pt) => {
            setPaymentTypeFilter(pt);
            setCurrentPage(1);
          }}
          companyFilter={companyFilter}
          onChangeCompanyFilter={(co) => {
            setCompanyFilter(co);
            setCurrentPage(1);
          }}
          activeStatusTab={activeStatusTab}
          onChangeStatusTab={(st) => {
            setActiveStatusTab(st);
            setCurrentPage(1);
          }}
        />
      )}

      {/* 5. PO Master Detail Modal */}
      <PoDetailModal
        po={selectedPODetail}
        onClose={() => setSelectedPoNumber(null)}
        onOpenPaymentModal={(task) => setSelectedTaskForPayment(task)}
        onOpenEditModal={(task) => setSelectedTaskForEdit(task)}
        onOpenSplitModal={(task) => setSplitTargetTask(task)}
        onMergeTasks={handleMergeTasks}
      />

      {/* 6. Payment Recording Modal */}
      <PaymentRecordModal
        task={selectedTaskForPayment}
        onClose={() => setSelectedTaskForPayment(null)}
        onConfirmPayment={handleConfirmPayment}
        isPending={isPending}
      />

      {/* 7. Schedule Edit & Deferral Modal */}
      <ScheduleEditModal
        task={selectedTaskForEdit}
        onClose={() => setSelectedTaskForEdit(null)}
        onSaveScheduleEdit={handleSaveScheduleEdit}
        onOpenSplitModal={(task) => setSplitTargetTask(task)}
        allTasks={tasks}
        isPending={isPending}
      />

      {/* 8. Split Installments Modal */}
      <SplitInstallmentModal
        task={splitTargetTask}
        onClose={() => setSplitTargetTask(null)}
        onConfirmSplit={handleConfirmSplit}
        isPending={isPending}
      />
    </div>
  );
}
