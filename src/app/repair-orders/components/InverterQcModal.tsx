"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import SignatureCanvas from "react-signature-canvas";
import {
  X,
  Printer,
  Save,
  Check,
  CheckCircle2,
  Trash2,
  Upload,
  Copy,
  FileText,
  ShieldCheck,
  Edit3,
  Eye,
  CheckSquare,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  UserCheck,
  Layers,
  ChevronDown,
  Wrench,
} from "lucide-react";
import Swal from "sweetalert2";
import { InverterQcData, InverterQcItemData, saveInverterQc } from "@/app/actions/repairOrders";
import {
  NormalizedRepairItem,
  CommonQcData,
  buildMultiItemQcData,
  createDefaultItemQc,
} from "../lib/qcHelpers";
import OfficialQcPaper from "./OfficialQcPaper";

interface InverterQcModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any; // RepairOrder record
  onSaved?: (updatedOrder: any) => void;
  currentUserName?: string;
  users?: any[];
}

export default function InverterQcModal({
  isOpen,
  onClose,
  order,
  onSaved,
  currentUserName,
  users = [],
}: InverterQcModalProps) {
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [advanceStep, setAdvanceStep] = useState(true);

  // Signatures
  const sigPadInspector = useRef<SignatureCanvas | null>(null);
  const sigPadReviewer = useRef<SignatureCanvas | null>(null);
  const fileInputInspectorRef = useRef<HTMLInputElement | null>(null);
  const fileInputReviewerRef = useRef<HTMLInputElement | null>(null);

  const [hasSavedSig, setHasSavedSig] = useState(false);

  // Multi-item QC State
  const [targetItems, setTargetItems] = useState<NormalizedRepairItem[]>([]);
  const [common, setCommon] = useState<CommonQcData>({
    receiveDate: "",
    workType: "งานซ่อม INVERTER",
    customerName: "",
    inspectorName: "",
    inspectorSignatureUrl: undefined,
    inspectorDate: new Date().toISOString().split("T")[0],
    reviewerName: "",
    reviewerSignatureUrl: undefined,
    reviewerDate: new Date().toISOString().split("T")[0],
    formRev: "QC-EN-01/Rev.00",
  });
  const [itemsQc, setItemsQc] = useState<InverterQcItemData[]>([]);

  // Resolve current logged in user name
  const resolvedCurrentUserName =
    currentUserName ||
    (typeof window !== "undefined"
      ? localStorage.getItem("crm_user_inspector_name") || localStorage.getItem("crm_user_name")
      : "") ||
    order?.technicianName ||
    order?.job?.assignedToName ||
    "";

  // Sync state whenever modal is opened or order changes
  useEffect(() => {
    if (isOpen && order) {
      let resolvedName =
        currentUserName ||
        order?.technicianName ||
        order?.job?.assignedToName ||
        "";
      if (typeof window !== "undefined" && !resolvedName) {
        resolvedName =
          localStorage.getItem("crm_user_inspector_name") ||
          localStorage.getItem("crm_user_name") ||
          "";
      }

      const multiData = buildMultiItemQcData(order, resolvedName);
      setTargetItems(multiData.targetItems);
      setActiveItemIndex(0);

      const commonData = { ...multiData.common };
      if (typeof window !== "undefined") {
        const savedUserSig = localStorage.getItem("crm_user_signature");
        setHasSavedSig(!!savedUserSig);
        if (savedUserSig && !commonData.inspectorSignatureUrl) {
          commonData.inspectorSignatureUrl = savedUserSig;
        }
        if (!commonData.inspectorName && resolvedName) {
          commonData.inspectorName = resolvedName;
        }
      }

      setCommon(commonData);
      setItemsQc(multiData.itemsQc);
    }
  }, [isOpen, order, currentUserName]);

  if (!isOpen || !order) return null;

  const currentItemTarget = targetItems[activeItemIndex] || targetItems[0];
  const currentItemQc =
    itemsQc[activeItemIndex] ||
    (currentItemTarget ? createDefaultItemQc(currentItemTarget) : createDefaultItemQc({} as any));

  // Helper to update active item QC
  const updateActiveItem = (updater: (prev: InverterQcItemData) => InverterQcItemData) => {
    setItemsQc((prev) => {
      const next = [...prev];
      const existing = next[activeItemIndex] || createDefaultItemQc(targetItems[activeItemIndex]);
      next[activeItemIndex] = updater(existing);
      return next;
    });
  };

  // Helper to update common data
  const updateCommon = (updater: (prev: CommonQcData) => CommonQcData) => {
    setCommon(updater);
  };

  // Copy current item's QC values to all other items
  const handleCopyCurrentItemToAll = () => {
    if (targetItems.length <= 1) return;

    Swal.fire({
      title: "คัดลอกค่าผลเทสไปยังทุกรายการ?",
      html: `ต้องการคัดลอกค่าแรงดัน, เวลาเทส, พารามิเตอร์ และผลตรวจเช็คจาก <b>ตัวที่ ${activeItemIndex + 1}</b> ไปยังอีก <b>${
        targetItems.length - 1
      } รายการ</b> หรือไม่?<br/><span class="text-xs text-gray-500">(ยี่ห้อ รุ่น และ Serial Number ของแต่ละรายการจะไม่ถูกเขียนทับ)</span>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ใช่, คัดลอกไปทุกรายการ",
      cancelButtonText: "ยกเลิก",
    }).then((result) => {
      if (result.isConfirmed) {
        const source = currentItemQc;
        setItemsQc((prev) =>
          prev.map((item, idx) => {
            if (idx === activeItemIndex) return item;
            return {
              ...item,
              inputVoltage: JSON.parse(JSON.stringify(source.inputVoltage || {})),
              outputVoltage: JSON.parse(JSON.stringify(source.outputVoltage || {})),
              controlCircuit: JSON.parse(JSON.stringify(source.controlCircuit || {})),
              parameterSetting: JSON.parse(JSON.stringify(source.parameterSetting || {})),
              visualChecks: JSON.parse(JSON.stringify(source.visualChecks || {})),
              parameterRows: JSON.parse(JSON.stringify(source.parameterRows || [])),
              notes: source.notes || "",
            };
          })
        );

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: `คัดลอกผลเทสไปยังทั้ง ${targetItems.length} รายการแล้ว`,
          showConfirmButton: false,
          timer: 2000,
        });
      }
    });
  };

  // File upload for signature
  const handleSignatureFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "inspector" | "reviewer"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: "ไฟล์ไม่ถูกต้อง",
        text: "กรุณาเลือกไฟล์รูปภาพเท่านั้น (PNG, JPG, JPEG)",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (target === "inspector") {
        updateCommon((prev) => ({ ...prev, inspectorSignatureUrl: dataUrl }));
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("crm_user_signature", dataUrl);
            setHasSavedSig(true);
          } catch {}
        }
      } else {
        updateCommon((prev) => ({ ...prev, reviewerSignatureUrl: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Use saved signature
  const handleUseSavedSignature = (target: "inspector" | "reviewer") => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("crm_user_signature");
    if (!saved) {
      Swal.fire({
        icon: "info",
        title: "ไม่พบลายเซ็นที่เคยบันทึก",
        text: "เมื่อมีการบันทึกผล QC ระบบจะบันทึกลายเซ็นไว้อัตโนมัติ",
      });
      return;
    }
    if (target === "inspector") {
      updateCommon((prev) => ({ ...prev, inspectorSignatureUrl: saved }));
    } else {
      updateCommon((prev) => ({ ...prev, reviewerSignatureUrl: saved }));
    }
  };

  // Save changes
  const handleSave = async (silent = false): Promise<InverterQcData | null> => {
    setIsSaving(true);
    try {
      const updatedCommon = { ...common };

      // Extract signatures from pads if active and not already set
      if (
        !updatedCommon.inspectorSignatureUrl &&
        sigPadInspector.current &&
        !sigPadInspector.current.isEmpty()
      ) {
        updatedCommon.inspectorSignatureUrl = sigPadInspector.current
          .getTrimmedCanvas()
          .toDataURL("image/png");
      }
      if (
        !updatedCommon.reviewerSignatureUrl &&
        sigPadReviewer.current &&
        !sigPadReviewer.current.isEmpty()
      ) {
        updatedCommon.reviewerSignatureUrl = sigPadReviewer.current
          .getTrimmedCanvas()
          .toDataURL("image/png");
      }

      // Remember signature & inspector name in localStorage
      if (typeof window !== "undefined") {
        try {
          if (updatedCommon.inspectorSignatureUrl) {
            localStorage.setItem("crm_user_signature", updatedCommon.inspectorSignatureUrl);
            setHasSavedSig(true);
          }
          if (updatedCommon.inspectorName) {
            localStorage.setItem("crm_user_inspector_name", updatedCommon.inspectorName);
          }
        } catch {}
      }

      setCommon(updatedCommon);

      const dataToSave: InverterQcData = {
        ...updatedCommon,
        // Root fields for item 0 backwards compatibility
        ...(itemsQc[0] || {}),
        itemsQc: itemsQc,
        updatedAt: new Date().toISOString(),
      };

      const res = await saveInverterQc(order.id, dataToSave, advanceStep);
      if (!res.success) throw new Error(res.error);

      if (onSaved) {
        onSaved(res.data);
      }

      if (!silent) {
        await Swal.fire({
          title: "บันทึกผลการตรวจ QC สำเร็จ",
          text: `บันทึกข้อมูลแบบฟอร์ม QC-EN-01/Rev.00 (${targetItems.length} รายการ) เรียบร้อย${
            advanceStep ? ' และปรับสถานะเป็น "ตรวจสอบ QC หลังซ่อม"' : ""
          }`,
          icon: "success",
          confirmButtonColor: "#ff2301",
        });
      }
      return dataToSave;
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถบันทึกข้อมูล QC ได้",
        icon: "error",
        confirmButtonColor: "#ff2301",
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Direct print via invisible iframe
  const handlePrint = async (targetIdx?: number) => {
    const saved = await handleSave(true);
    if (!saved) return;

    const printableRoot = document.getElementById("inverter-qc-printable-area");
    if (!printableRoot) {
      window.print();
      return;
    }

    let printHtml = "";
    if (targetIdx !== undefined && targetIdx >= 0) {
      const child = printableRoot.children[targetIdx];
      if (child) {
        printHtml = child.outerHTML;
      } else {
        printHtml = printableRoot.innerHTML;
      }
    } else {
      printHtml = printableRoot.innerHTML;
    }

    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title></title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Sarabun', sans-serif;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .qc-screen-only {
              display: none !important;
            }
            .qc-page-sheet {
              width: 210mm;
              height: 297mm;
              max-height: 297mm;
              padding: 7mm 9mm;
              margin: 0 auto;
              box-sizing: border-box;
              overflow: hidden;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
            }
            .qc-page-sheet:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            .official-qc-paper {
              width: 100% !important;
              max-width: 100% !important;
              height: 100% !important;
              max-height: 100% !important;
              box-shadow: none !important;
              border: 2px solid black !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              box-sizing: border-box !important;
              padding: 4.5mm 5.5mm !important;
            }
          </style>
        </head>
        <body class="p-0 m-0">
          ${printHtml}
        </body>
      </html>
    `);
    doc.close();

    const triggerPrint = () => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch {
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 5000);
      }
    };

    printFrame.onload = () => {
      setTimeout(triggerPrint, 500);
    };
    setTimeout(triggerPrint, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-red-50 via-white to-orange-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#ff2301] bg-gradient-to-br from-[#ff2301] to-[#c71a00] text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-gray-900">
                  แบบฟอร์มตรวจสอบ QC ของ INVERTER หลังซ่อมเสร็จ
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-[#ff2301] px-2 py-0.5 rounded-full border border-red-200">
                  QC-EN-01/Rev.00
                </span>
                {targetItems.length > 1 && (
                  <span className="text-[10px] font-bold bg-gray-900 text-white px-2 py-0.5 rounded-full shadow-2xs">
                    {targetItems.length} รายการ
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                <span>
                  เลขที่ใบรับซ่อม: <b>{order?.job?.jobNumber || "-"}</b>
                </span>
                <span>•</span>
                <span>
                  ลูกค้า: <b>{order?.customerCompany || order?.job?.customerName || "-"}</b>
                </span>
              </p>
            </div>
          </div>

          {/* Action Tabs & Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "form"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>กรอกข้อมูล QC</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "preview"
                    ? "bg-white text-[#ff2301] shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>
                  ตัวอย่างเอกสาร A4 {targetItems.length > 1 ? `(${targetItems.length} หน้า)` : ""}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 custom-scrollbar">
          {/* ── TAB 1: FORM INPUTS ── */}
          <div className={activeTab === "form" ? "block" : "hidden"}>
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Multi-Item Selector Banner (When order has multiple items) */}
              {targetItems.length > 1 && (
                <div className="bg-white rounded-2xl border border-red-200/80 p-3.5 shadow-sm space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-red-100 text-[#ff2301] flex items-center justify-center">
                        <Layers size={14} />
                      </span>
                      <span className="text-xs font-bold text-gray-800">
                        รายการซ่อมในใบนี้ ({targetItems.length} รายการ):
                      </span>
                      <span className="text-[11px] text-gray-500">
                        (คลิกเลือกรายการเพื่อกรอกผล QC ของแต่ละตัว)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyCurrentItemToAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100/80 text-[#ff2301] border border-red-200 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                      title="คัดลอกค่าแรงดันและพารามิเตอร์ของรายการนี้ ไปยังทุกรายการ"
                    >
                      <Copy size={13} />
                      <span>คัดลอกค่าผลเทสไปทุกตัว ({targetItems.length} ตัว)</span>
                    </button>
                  </div>

                  {/* Item Pills */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {targetItems.map((target, idx) => {
                      const isSelected = activeItemIndex === idx;
                      const hasSerial = !!(itemsQc[idx]?.serialNumber || target.serial);

                      return (
                        <button
                          key={target.id || idx}
                          type="button"
                          onClick={() => setActiveItemIndex(idx)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-[#ff2301] text-white border-[#ff2301] shadow-sm shadow-red-500/20 scale-[1.02]"
                              : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                              isSelected ? "bg-white text-[#ff2301]" : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span>
                            {target.brand || "INVERTER"}{" "}
                            {target.model ? `(${target.model})` : ""}
                          </span>
                          {hasSerial && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                isSelected ? "bg-red-900/30 text-white" : "bg-gray-200/80 text-gray-600"
                              }`}
                            >
                              {itemsQc[idx]?.serialNumber || target.serial}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Header Equipment Details Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#ff2301]" />
                      ข้อมูลอุปกรณ์และลูกค้า
                    </span>
                    {targetItems.length > 1 && (
                      <span className="text-[11px] font-bold text-[#ff2301] bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                        กำลังกรอก: รายการที่ {activeItemIndex + 1} / {targetItems.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-500">วันที่รับซ่อม:</span>
                    <input
                      type="date"
                      value={common.receiveDate || ""}
                      onChange={(e) => updateCommon((prev) => ({ ...prev, receiveDate: e.target.value }))}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1 font-medium bg-gray-50 focus:bg-white focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      INVERTER ยี่ห้อ:
                    </label>
                    <input
                      type="text"
                      value={currentItemQc.inverterBrand || ""}
                      onChange={(e) =>
                        updateActiveItem((prev) => ({ ...prev, inverterBrand: e.target.value }))
                      }
                      placeholder="เช่น INVT, YASKAWA, MITSUBISHI"
                      className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      INVERTER รุ่น:
                    </label>
                    <input
                      type="text"
                      value={currentItemQc.inverterModel || ""}
                      onChange={(e) =>
                        updateActiveItem((prev) => ({ ...prev, inverterModel: e.target.value }))
                      }
                      placeholder="เช่น GD20-0R7G-4-EU"
                      className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-red-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      SERIAL NUMBER:
                    </label>
                    <input
                      type="text"
                      value={currentItemQc.serialNumber || ""}
                      onChange={(e) =>
                        updateActiveItem((prev) => ({ ...prev, serialNumber: e.target.value }))
                      }
                      placeholder="เช่น SN-2409001"
                      className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-red-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      ใช้กับงานประเภท:
                    </label>
                    <input
                      type="text"
                      value={common.workType || ""}
                      onChange={(e) => updateCommon((prev) => ({ ...prev, workType: e.target.value }))}
                      placeholder="เช่น ปั๊มน้ำ, สายพานลำเลียง, พัดลม"
                      className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      ลูกค้า:
                    </label>
                    <input
                      type="text"
                      value={common.customerName || ""}
                      onChange={(e) =>
                        updateCommon((prev) => ({ ...prev, customerName: e.target.value }))
                      }
                      placeholder="ชื่อบริษัทหรือบุคคลลูกค้า"
                      className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-red-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 1. POWER INPUT VOLTAGE หลังซ่อมเสร็จ */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700 tracking-wide uppercase">
                    1. POWER INPUT VOLTAGE หลังซ่อมเสร็จ
                  </span>
                  <span className="text-[10px] text-gray-400">ติ๊กถูกพร้อมกรอกค่าที่วัดได้</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Row 1: DC */}
                  <div className="flex flex-wrap items-center gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                    <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer min-w-[190px]">
                      <input
                        type="checkbox"
                        checked={currentItemQc.inputVoltage?.dcSinglePhase?.checked ?? false}
                        onChange={(e) =>
                          updateActiveItem((prev) => ({
                            ...prev,
                            inputVoltage: {
                              ...prev.inputVoltage!,
                              dcSinglePhase: {
                                ...prev.inputVoltage!.dcSinglePhase!,
                                checked: e.target.checked,
                              },
                            },
                          }))
                        }
                        className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                      />
                      <span>1 เฟส DC (+) , (-)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={currentItemQc.inputVoltage?.dcSinglePhase?.value || ""}
                        onChange={(e) =>
                          updateActiveItem((prev) => ({
                            ...prev,
                            inputVoltage: {
                              ...prev.inputVoltage!,
                              dcSinglePhase: {
                                checked: true,
                                value: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="ระบุค่า"
                        className="w-24 text-center font-mono font-bold text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-red-500"
                      />
                      <span className="font-semibold text-gray-600">Vdc</span>
                    </div>
                  </div>

                  {/* Row 2: AC 1-Phase */}
                  <div className="flex flex-wrap items-center gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                    <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer min-w-[190px]">
                      <input
                        type="checkbox"
                        checked={currentItemQc.inputVoltage?.acSinglePhase?.checked ?? false}
                        onChange={(e) =>
                          updateActiveItem((prev) => ({
                            ...prev,
                            inputVoltage: {
                              ...prev.inputVoltage!,
                              acSinglePhase: {
                                ...prev.inputVoltage!.acSinglePhase!,
                                checked: e.target.checked,
                              },
                            },
                          }))
                        }
                        className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                      />
                      <span>1 เฟส (220-230Vac) L-N</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={currentItemQc.inputVoltage?.acSinglePhase?.value || ""}
                        onChange={(e) =>
                          updateActiveItem((prev) => ({
                            ...prev,
                            inputVoltage: {
                              ...prev.inputVoltage!,
                              acSinglePhase: {
                                checked: true,
                                value: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="ระบุค่า"
                        className="w-24 text-center font-mono font-bold text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-red-500"
                      />
                      <span className="font-semibold text-gray-600">Vac</span>
                    </div>
                  </div>

                  {/* Row 3: AC 3-Phase */}
                  <div className="flex flex-wrap items-center gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                    <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer min-w-[190px]">
                      <input
                        type="checkbox"
                        checked={currentItemQc.inputVoltage?.acThreePhase?.checked ?? false}
                        onChange={(e) =>
                          updateActiveItem((prev) => ({
                            ...prev,
                            inputVoltage: {
                              ...prev.inputVoltage!,
                              acThreePhase: {
                                ...prev.inputVoltage!.acThreePhase!,
                                checked: e.target.checked,
                              },
                            },
                          }))
                        }
                        className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                      />
                      <span>3 เฟส (380-400Vac)</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-500 font-bold">R-S:</span>
                        <input
                          type="text"
                          value={currentItemQc.inputVoltage?.acThreePhase?.rs || ""}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              inputVoltage: {
                                ...prev.inputVoltage!,
                                acThreePhase: {
                                  ...prev.inputVoltage!.acThreePhase!,
                                  checked: true,
                                  rs: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-16 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1 py-1 bg-white focus:ring-1 focus:ring-red-500"
                        />
                        <span className="text-[10px] text-gray-500">Vac</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-500 font-bold">R-T:</span>
                        <input
                          type="text"
                          value={currentItemQc.inputVoltage?.acThreePhase?.rt || ""}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              inputVoltage: {
                                ...prev.inputVoltage!,
                                acThreePhase: {
                                  ...prev.inputVoltage!.acThreePhase!,
                                  checked: true,
                                  rt: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-16 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1 py-1 bg-white focus:ring-1 focus:ring-red-500"
                        />
                        <span className="text-[10px] text-gray-500">Vac</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-500 font-bold">S-T:</span>
                        <input
                          type="text"
                          value={currentItemQc.inputVoltage?.acThreePhase?.st || ""}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              inputVoltage: {
                                ...prev.inputVoltage!,
                                acThreePhase: {
                                  ...prev.inputVoltage!.acThreePhase!,
                                  checked: true,
                                  st: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-16 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1 py-1 bg-white focus:ring-1 focus:ring-red-500"
                        />
                        <span className="text-[10px] text-gray-500">Vac</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. POWER OUTPUT VOLTAGE หลังซ่อมเสร็จ */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700 tracking-wide uppercase">
                    2. POWER OUTPUT VOLTAGE หลังซ่อมเสร็จ
                  </span>
                  <span className="text-[10px] text-gray-400">ติ๊กถูกพร้อมกรอกค่าที่วัดได้</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Row 1: 1-Phase LN */}
                  <div className="flex flex-wrap items-center gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                    <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer min-w-[210px]">
                      <input
                        type="checkbox"
                        checked={currentItemQc.outputVoltage?.singlePhaseLN?.checked ?? false}
                        onChange={(e) =>
                          updateActiveItem((prev) => ({
                            ...prev,
                            outputVoltage: {
                              ...prev.outputVoltage!,
                              singlePhaseLN: {
                                ...prev.outputVoltage!.singlePhaseLN!,
                                checked: e.target.checked,
                              },
                            },
                          }))
                        }
                        className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                      />
                      <span>1 เฟส L-N (220-230Vac)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={currentItemQc.outputVoltage?.singlePhaseLN?.value || ""}
                        onChange={(e) =>
                          updateActiveItem((prev) => ({
                            ...prev,
                            outputVoltage: {
                              ...prev.outputVoltage!,
                              singlePhaseLN: {
                                checked: true,
                                value: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="ระบุค่า"
                        className="w-24 text-center font-mono font-bold text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-red-500"
                      />
                      <span className="font-semibold text-gray-600">Vac</span>
                    </div>
                  </div>

                  {/* Row 2: 3-Phase 220 */}
                  <div className="flex flex-wrap items-center gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                    <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer min-w-[210px]">
                      <input
                        type="checkbox"
                        checked={currentItemQc.outputVoltage?.threePhase220?.checked ?? false}
                        onChange={(e) =>
                          updateActiveItem((prev) => ({
                            ...prev,
                            outputVoltage: {
                              ...prev.outputVoltage!,
                              threePhase220: {
                                ...prev.outputVoltage!.threePhase220!,
                                checked: e.target.checked,
                              },
                            },
                          }))
                        }
                        className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                      />
                      <span>3 เฟส (220-230Vac)</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-500 font-bold">U-V:</span>
                        <input
                          type="text"
                          value={currentItemQc.outputVoltage?.threePhase220?.uv || ""}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              outputVoltage: {
                                ...prev.outputVoltage!,
                                threePhase220: {
                                  ...prev.outputVoltage!.threePhase220!,
                                  checked: true,
                                  uv: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-16 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1 py-1 bg-white focus:ring-1 focus:ring-red-500"
                        />
                        <span className="text-[10px] text-gray-500">Vac</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-500 font-bold">U-W:</span>
                        <input
                          type="text"
                          value={currentItemQc.outputVoltage?.threePhase220?.uw || ""}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              outputVoltage: {
                                ...prev.outputVoltage!,
                                threePhase220: {
                                  ...prev.outputVoltage!.threePhase220!,
                                  checked: true,
                                  uw: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-16 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1 py-1 bg-white focus:ring-1 focus:ring-red-500"
                        />
                        <span className="text-[10px] text-gray-500">Vac</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-500 font-bold">V-W:</span>
                        <input
                          type="text"
                          value={currentItemQc.outputVoltage?.threePhase220?.vw || ""}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              outputVoltage: {
                                ...prev.outputVoltage!,
                                threePhase220: {
                                  ...prev.outputVoltage!.threePhase220!,
                                  checked: true,
                                  vw: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-16 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1 py-1 bg-white focus:ring-1 focus:ring-red-500"
                        />
                        <span className="text-[10px] text-gray-500">Vac</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: 3-Phase 380 */}
                  <div className="flex flex-wrap items-center gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                    <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer min-w-[210px]">
                      <input
                        type="checkbox"
                        checked={currentItemQc.outputVoltage?.threePhase380?.checked ?? false}
                        onChange={(e) =>
                          updateActiveItem((prev) => ({
                            ...prev,
                            outputVoltage: {
                              ...prev.outputVoltage!,
                              threePhase380: {
                                ...prev.outputVoltage!.threePhase380!,
                                checked: e.target.checked,
                              },
                            },
                          }))
                        }
                        className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                      />
                      <span>3 เฟส (380-400Vac)</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-500 font-bold">U-V:</span>
                        <input
                          type="text"
                          value={currentItemQc.outputVoltage?.threePhase380?.uv || ""}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              outputVoltage: {
                                ...prev.outputVoltage!,
                                threePhase380: {
                                  ...prev.outputVoltage!.threePhase380!,
                                  checked: true,
                                  uv: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-16 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1 py-1 bg-white focus:ring-1 focus:ring-red-500"
                        />
                        <span className="text-[10px] text-gray-500">Vac</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-500 font-bold">U-W:</span>
                        <input
                          type="text"
                          value={currentItemQc.outputVoltage?.threePhase380?.uw || ""}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              outputVoltage: {
                                ...prev.outputVoltage!,
                                threePhase380: {
                                  ...prev.outputVoltage!.threePhase380!,
                                  checked: true,
                                  uw: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-16 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1 py-1 bg-white focus:ring-1 focus:ring-red-500"
                        />
                        <span className="text-[10px] text-gray-500">Vac</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-500 font-bold">V-W:</span>
                        <input
                          type="text"
                          value={currentItemQc.outputVoltage?.threePhase380?.vw || ""}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              outputVoltage: {
                                ...prev.outputVoltage!,
                                threePhase380: {
                                  ...prev.outputVoltage!.threePhase380!,
                                  checked: true,
                                  vw: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-16 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1 py-1 bg-white focus:ring-1 focus:ring-red-500"
                        />
                        <span className="text-[10px] text-gray-500">Vac</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. CONTROL CIRCUIT และเทสระยะเวลาในการจ่ายไฟ */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700 tracking-wide uppercase">
                    3. CONTROL CIRCUIT และเทสระยะเวลาในการจ่ายไฟ
                  </span>
                  <span className="text-[10px] text-gray-400">ทดสอบสัญญาณและเวลาเบิร์นอิน</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Control 24Vdc */}
                  <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100 space-y-2">
                    <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentItemQc.controlCircuit?.control24Vdc?.checked ?? false}
                        onChange={(e) =>
                          updateActiveItem((prev) => ({
                            ...prev,
                            controlCircuit: {
                              ...prev.controlCircuit!,
                              control24Vdc: {
                                ...prev.controlCircuit!.control24Vdc!,
                                checked: e.target.checked,
                              },
                            },
                          }))
                        }
                        className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                      />
                      <span>24 Vdc (แรงดันตามแต่ละช่องสัญญาณ X1 - X5)</span>
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pl-6">
                      {(["x1", "x2", "x3", "x4", "x5"] as const).map((ch, idx) => (
                        <div key={ch} className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-gray-500 uppercase">
                            {ch}:
                          </span>
                          <input
                            type="text"
                            value={currentItemQc.controlCircuit?.control24Vdc?.[ch] || ""}
                            onChange={(e) =>
                              updateActiveItem((prev) => ({
                                ...prev,
                                controlCircuit: {
                                  ...prev.controlCircuit!,
                                  control24Vdc: {
                                    ...prev.controlCircuit!.control24Vdc!,
                                    checked: true,
                                    [ch]: e.target.value,
                                  },
                                },
                              }))
                            }
                            placeholder="Vdc"
                            className="w-full text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white focus:ring-1 focus:ring-red-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timing tests */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* AC */}
                    <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100 flex flex-col justify-between gap-1.5">
                      <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentItemQc.controlCircuit?.testAcDuration?.checked ?? false}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              controlCircuit: {
                                ...prev.controlCircuit!,
                                testAcDuration: {
                                  ...prev.controlCircuit!.testAcDuration!,
                                  checked: e.target.checked,
                                },
                              },
                            }))
                          }
                          className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                        />
                        <span>เทสการจ่ายไฟ AC</span>
                      </label>
                      <div className="flex items-center gap-1.5 pl-6">
                        <input
                          type="text"
                          value={currentItemQc.controlCircuit?.testAcDuration?.minutes || ""}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              controlCircuit: {
                                ...prev.controlCircuit!,
                                testAcDuration: {
                                  checked: true,
                                  minutes: e.target.value,
                                },
                              },
                            }))
                          }
                          placeholder="ระยะเวลา"
                          className="w-20 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white focus:ring-1 focus:ring-red-500"
                        />
                        <span className="text-gray-600">นาที</span>
                      </div>
                    </div>

                    {/* DC */}
                    <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100 flex flex-col justify-between gap-1.5">
                      <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentItemQc.controlCircuit?.testDcDuration?.checked ?? false}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              controlCircuit: {
                                ...prev.controlCircuit!,
                                testDcDuration: {
                                  ...prev.controlCircuit!.testDcDuration!,
                                  checked: e.target.checked,
                                },
                              },
                            }))
                          }
                          className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                        />
                        <span>เทสการจ่ายไฟ DC</span>
                      </label>
                      <div className="flex items-center gap-1.5 pl-6">
                        <input
                          type="text"
                          value={currentItemQc.controlCircuit?.testDcDuration?.minutes || ""}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              controlCircuit: {
                                ...prev.controlCircuit!,
                                testDcDuration: {
                                  checked: true,
                                  minutes: e.target.value,
                                },
                              },
                            }))
                          }
                          placeholder="ระยะเวลา"
                          className="w-20 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white focus:ring-1 focus:ring-red-500"
                        />
                        <span className="text-gray-600">นาที</span>
                      </div>
                    </div>

                    {/* AC + DC */}
                    <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100 flex flex-col justify-between gap-1.5">
                      <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentItemQc.controlCircuit?.testAcDcDuration?.checked ?? false}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              controlCircuit: {
                                ...prev.controlCircuit!,
                                testAcDcDuration: {
                                  ...prev.controlCircuit!.testAcDcDuration!,
                                  checked: e.target.checked,
                                },
                              },
                            }))
                          }
                          className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                        />
                        <span>เทส AC และ DC พร้อมกัน</span>
                      </label>
                      <div className="flex items-center gap-1.5 pl-6">
                        <input
                          type="text"
                          value={currentItemQc.controlCircuit?.testAcDcDuration?.minutes || ""}
                          onChange={(e) =>
                            updateActiveItem((prev) => ({
                              ...prev,
                              controlCircuit: {
                                ...prev.controlCircuit!,
                                testAcDcDuration: {
                                  checked: true,
                                  minutes: e.target.value,
                                },
                              },
                            }))
                          }
                          placeholder="ระยะเวลา"
                          className="w-20 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white focus:ring-1 focus:ring-red-500"
                        />
                        <span className="text-gray-600">นาที</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. การ Set ค่า Parameter */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700 tracking-wide uppercase">
                    4. การ Set ค่า Parameter
                  </span>
                  <span className="text-[10px] text-gray-400">เลือกรูปแบบที่ตั้งค่า</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={currentItemQc.parameterSetting?.keepCustomerOriginal ?? false}
                      onChange={(e) =>
                        updateActiveItem((prev) => ({
                          ...prev,
                          parameterSetting: {
                            ...prev.parameterSetting!,
                            keepCustomerOriginal: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-gray-800">Set ค่า Parameter เดิมให้ลูกค้า</span>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        คงค่าพารามิเตอร์เดิมตามที่ลูกค้าเคยตั้งไว้ใช้งาน
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={currentItemQc.parameterSetting?.setNewForCustomer ?? false}
                      onChange={(e) =>
                        updateActiveItem((prev) => ({
                          ...prev,
                          parameterSetting: {
                            ...prev.parameterSetting!,
                            setNewForCustomer: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-gray-800">Set ค่า Parameter ใหม่ให้ลูกค้า</span>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        ตั้งค่าพารามิเตอร์ใหม่ให้เหมาะสมตามสเปกและงานของลูกค้า
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 5. ตรวจเชคอะไหล่และความเรียบร้อยภายในก่อนส่งคืนลูกค้า */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700 tracking-wide uppercase">
                    5. ตรวจเชคอะไหล่และความเรียบร้อยภายในก่อนส่งคืนลูกค้า
                  </span>
                  <span className="text-[10px] text-gray-400">ตรวจสอบความปลอดภัยทางกายภาพ</span>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentItemQc.visualChecks?.screwsAndPartsComplete ?? false}
                      onChange={(e) =>
                        updateActiveItem((prev) => ({
                          ...prev,
                          visualChecks: {
                            ...prev.visualChecks!,
                            screwsAndPartsComplete: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="text-gray-800 font-medium">
                      น็อตและอะไหล่ภายใน INVERTER ติดตั้งครบถ้วน
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentItemQc.visualChecks?.fanExhaustDirectionCorrect ?? false}
                      onChange={(e) =>
                        updateActiveItem((prev) => ({
                          ...prev,
                          visualChecks: {
                            ...prev.visualChecks!,
                            fanExhaustDirectionCorrect: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="text-gray-800 font-medium">
                      ตรวจเช็คพัดลมต้องดูดลมออก (ไม่ติดตั้งสลับทาง)
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentItemQc.visualChecks?.controlWiringNormal ?? false}
                      onChange={(e) =>
                        updateActiveItem((prev) => ({
                          ...prev,
                          visualChecks: {
                            ...prev.visualChecks!,
                            controlWiringNormal: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="text-gray-800 font-medium">
                      สายไฟ Control ภายใน Board Electronics อยู่ในตำแหน่งที่ถูกต้องและมีสภาพปกติ
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentItemQc.visualChecks?.diodeConversionCorrect ?? false}
                      onChange={(e) =>
                        updateActiveItem((prev) => ({
                          ...prev,
                          visualChecks: {
                            ...prev.visualChecks!,
                            diodeConversionCorrect: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 mt-0.5"
                    />
                    <span className="text-gray-800 font-medium">
                      ตรวจสอบการแปลงไดโอดของ INVERTER อยู่ในสภาพที่ถูกต้อง (หากมีการแปลง) *
                      โปรดดูคู่มือการแปลงก่อนทุกครั้ง
                    </span>
                  </label>
                </div>
              </div>

              {/* 6. บันทึกค่า Parameter ที่ตั้งไว้ */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700 tracking-wide uppercase">
                    6. บันทึกค่า Parameter ที่ตั้งไว้ / รายละเอียดเพิ่มเติมหรือปัญหาที่พบ
                  </span>
                  <span className="text-[10px] text-gray-400">บรรทัดที่ 1 - 6 (พิมพ์ลงตาราง A4)</span>
                </div>

                <div className="space-y-2 text-xs">
                  {(currentItemQc.parameterRows || ["", "", "", "", "", ""]).map(
                    (rowVal: string, rIdx: number) => (
                      <div key={rIdx} className="flex items-center gap-2">
                        <span className="w-6 text-center font-bold text-gray-400 text-xs shrink-0">
                          {rIdx + 1}.
                        </span>
                        <input
                          type="text"
                          value={rowVal || ""}
                          onChange={(e) => {
                            const newRows = [
                              ...(currentItemQc.parameterRows || ["", "", "", "", "", ""]),
                            ];
                            newRows[rIdx] = e.target.value;
                            updateActiveItem((prev) => ({ ...prev, parameterRows: newRows }));
                          }}
                          placeholder={`บันทึกค่าพารามิเตอร์หรือรายละเอียดบรรทัดที่ ${rIdx + 1}...`}
                          className="flex-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-mono focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* 7. หมายเหตุ */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
                <label className="block text-xs font-bold text-red-700 tracking-wide uppercase">
                  7. หมายเหตุ:
                </label>
                <textarea
                  rows={2}
                  value={currentItemQc.notes || ""}
                  onChange={(e) => updateActiveItem((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="หมายเหตุเพิ่มเติมสำหรับการตรวจสอบ QC รายการนี้..."
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* 8. Signatures: ผู้ตรวจเช็ค & ผู้ตรวจสอบ (Common across document) */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4">
                <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700 tracking-wide uppercase">
                    8. ลายเซ็นผู้ตรวจเช็ค และ ผู้ตรวจสอบ
                  </span>
                  <span className="text-[10px] text-gray-400">ใช้ร่วมกันในใบตรวจ QC ชุดนี้</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* ผู้ตรวจเช็ค (Inspector) */}
                  <div className="border border-gray-200 rounded-xl p-3.5 space-y-3 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-[#ff2301]" />
                        ผู้ตรวจเช็ค (Technician / Inspector)
                      </span>
                      <input
                        type="date"
                        value={common.inspectorDate || ""}
                        onChange={(e) =>
                          updateCommon((prev) => ({ ...prev, inspectorDate: e.target.value }))
                        }
                        className="text-xs border border-gray-300 rounded-lg px-2 py-0.5 bg-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-gray-600">
                          ชื่อผู้ตรวจเช็ค:
                        </label>
                        {resolvedCurrentUserName && (
                          <button
                            type="button"
                            onClick={() =>
                              updateCommon((prev) => ({
                                ...prev,
                                inspectorName: resolvedCurrentUserName,
                              }))
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff2301] hover:underline cursor-pointer bg-red-50 hover:bg-red-100/70 px-2 py-0.5 rounded-md border border-red-200 transition"
                            title="ดึงชื่อผู้ใช้งานที่กำลังกรอกข้อมูล"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>ดึงชื่อฉัน ({resolvedCurrentUserName})</span>
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          list="inspector-users-list"
                          value={common.inspectorName || ""}
                          onChange={(e) =>
                            updateCommon((prev) => ({ ...prev, inspectorName: e.target.value }))
                          }
                          placeholder="ชื่อ-นามสกุลผู้ตรวจเช็ค"
                          className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-medium focus:ring-1 focus:ring-red-500"
                        />
                        <datalist id="inspector-users-list">
                          {resolvedCurrentUserName && (
                            <option value={resolvedCurrentUserName}>
                              {resolvedCurrentUserName} (ผู้กรอก)
                            </option>
                          )}
                          {(users || []).map((u: any) => {
                            const name = u.fullName || u.name;
                            return name ? <option key={u.id || name} value={name} /> : null;
                          })}
                        </datalist>
                      </div>
                    </div>

                    {/* Hidden File Input for inspector */}
                    <input
                      type="file"
                      ref={fileInputInspectorRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleSignatureFileUpload(e, "inspector")}
                    />

                    {/* Signature Preview or Drawing Canvas */}
                    {common.inspectorSignatureUrl ? (
                      <div className="border border-emerald-300 bg-emerald-50/30 rounded-xl p-2.5 flex flex-col items-center gap-2">
                        <div className="bg-white p-1 rounded-lg border border-emerald-100 shadow-sm w-full flex items-center justify-center min-h-[60px]">
                          <img
                            src={common.inspectorSignatureUrl}
                            alt="Inspector Sig"
                            className="h-12 max-w-[200px] object-contain"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputInspectorRef.current?.click()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition shadow-sm cursor-pointer"
                          >
                            <Upload className="w-3 h-3 text-[#ff2301]" />
                            <span>แนบรูปใหม่</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateCommon((prev) => ({
                                ...prev,
                                inspectorSignatureUrl: undefined,
                              }))
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>ลบเพื่อวาดใหม่</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => fileInputInspectorRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-[#ff2301] bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition shadow-sm cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>แนบไฟล์รูปลายเซ็น (รูปภาพ)</span>
                          </button>

                          {hasSavedSig && (
                            <button
                              type="button"
                              onClick={() => handleUseSavedSignature("inspector")}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition cursor-pointer"
                              title="ใช้ลายเซ็นที่เคยบันทึกไว้ในเบราว์เซอร์นี้"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>ใช้ลายเซ็นเดิม</span>
                            </button>
                          )}
                        </div>

                        <div className="border border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
                          <SignatureCanvas
                            ref={sigPadInspector}
                            canvasProps={{
                              className: "w-full h-[65px] cursor-crosshair bg-white",
                            }}
                          />
                          <div className="p-1 bg-gray-50 border-t border-gray-200 flex justify-between text-[10px] text-gray-500">
                            <span>หรือวาดลายเซ็นลงบนกรอบนี้</span>
                            <button
                              type="button"
                              onClick={() => sigPadInspector.current?.clear()}
                              className="text-red-500 hover:underline cursor-pointer"
                            >
                              ล้างลายเซ็น
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ผู้ตรวจสอบ (Reviewer) */}
                  <div className="border border-gray-200 rounded-xl p-3.5 space-y-3 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ผู้ตรวจสอบ (Reviewer / Approver)
                      </span>
                      <input
                        type="date"
                        value={common.reviewerDate || ""}
                        onChange={(e) =>
                          updateCommon((prev) => ({ ...prev, reviewerDate: e.target.value }))
                        }
                        className="text-xs border border-gray-300 rounded-lg px-2 py-0.5 bg-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-gray-600">
                          ชื่อผู้ตรวจสอบ:
                        </label>
                        {resolvedCurrentUserName && (
                          <button
                            type="button"
                            onClick={() =>
                              updateCommon((prev) => ({
                                ...prev,
                                reviewerName: resolvedCurrentUserName,
                              }))
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-gray-900 hover:underline cursor-pointer bg-gray-100 hover:bg-gray-200/60 px-2 py-0.5 rounded-md border border-gray-200 transition"
                            title="ดึงชื่อผู้ใช้งานที่กำลังกรอกข้อมูล"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>ดึงชื่อฉัน ({resolvedCurrentUserName})</span>
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          list="reviewer-users-list"
                          value={common.reviewerName || ""}
                          onChange={(e) =>
                            updateCommon((prev) => ({ ...prev, reviewerName: e.target.value }))
                          }
                          placeholder="ชื่อ-นามสกุลผู้ตรวจสอบ"
                          className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-medium focus:ring-1 focus:ring-red-500"
                        />
                        <datalist id="reviewer-users-list">
                          {resolvedCurrentUserName && (
                            <option value={resolvedCurrentUserName}>
                              {resolvedCurrentUserName} (ผู้กรอก)
                            </option>
                          )}
                          {(users || []).map((u: any) => {
                            const name = u.fullName || u.name;
                            return name ? <option key={u.id || name} value={name} /> : null;
                          })}
                        </datalist>
                      </div>
                    </div>

                    {/* Hidden File Input for reviewer */}
                    <input
                      type="file"
                      ref={fileInputReviewerRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleSignatureFileUpload(e, "reviewer")}
                    />

                    {/* Signature Preview or Drawing Canvas */}
                    {common.reviewerSignatureUrl ? (
                      <div className="border border-emerald-300 bg-emerald-50/30 rounded-xl p-2.5 flex flex-col items-center gap-2">
                        <div className="bg-white p-1 rounded-lg border border-emerald-100 shadow-sm w-full flex items-center justify-center min-h-[60px]">
                          <img
                            src={common.reviewerSignatureUrl}
                            alt="Reviewer Sig"
                            className="h-12 max-w-[200px] object-contain"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputReviewerRef.current?.click()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition shadow-sm cursor-pointer"
                          >
                            <Upload className="w-3 h-3 text-[#ff2301]" />
                            <span>แนบรูปใหม่</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateCommon((prev) => ({
                                ...prev,
                                reviewerSignatureUrl: undefined,
                              }))
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>ลบเพื่อวาดใหม่</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => fileInputReviewerRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-[#ff2301] bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition shadow-sm cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>แนบไฟล์รูปลายเซ็น (รูปภาพ)</span>
                          </button>

                          {hasSavedSig && (
                            <button
                              type="button"
                              onClick={() => handleUseSavedSignature("reviewer")}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition cursor-pointer"
                              title="ใช้ลายเซ็นที่เคยบันทึกไว้ในเบราว์เซอร์นี้"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>ใช้ลายเซ็นเดิม</span>
                            </button>
                          )}
                        </div>

                        <div className="border border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
                          <SignatureCanvas
                            ref={sigPadReviewer}
                            canvasProps={{
                              className: "w-full h-[65px] cursor-crosshair bg-white",
                            }}
                          />
                          <div className="p-1 bg-gray-50 border-t border-gray-200 flex justify-between text-[10px] text-gray-500">
                            <span>หรือวาดลายเซ็นลงบนกรอบนี้</span>
                            <button
                              type="button"
                              onClick={() => sigPadReviewer.current?.clear()}
                              className="text-red-500 hover:underline cursor-pointer"
                            >
                              ล้างลายเซ็น
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status transition auto-advance checkbox */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                  <label className="flex items-center gap-2.5 text-xs text-amber-950 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={advanceStep}
                      onChange={(e) => setAdvanceStep(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                    />
                    <span>
                      อัปเดตสถานะงานซ่อมเป็น &quot;ตรวจสอบ QC หลังซ่อม (service_qc)&quot; อัตโนมัติเมื่อกดบันทึก
                    </span>
                  </label>
                  <span className="text-[10px] text-amber-800 bg-amber-200/80 font-bold px-2 py-0.5 rounded-full">
                    แนะนำ
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── TAB 2: LIVE A4 OFFICIAL PRINT PREVIEW & PRINTABLE DOM ── */}
          <div className={activeTab === "preview" ? "flex flex-col items-center gap-6" : "hidden"}>
            <div className="w-full max-w-[794px] flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                📄 แสดงตัวอย่างแบบฟอร์มขนาด A4 ตรงตามเอกสารทางการ (QC-EN-01/Rev.00)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3 py-1 rounded-xl shadow-2xs">
                  เอกสารทั้งหมด: <b>{targetItems.length} รายการ</b> ({targetItems.length} หน้า A4)
                </span>
                <Link
                  href={`/repair-orders/${order.jobId || order.id}/inverter-qc/print`}
                  target="_blank"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
                  title="เปิดหน้าพิมพ์เอกสารในแท็บใหม่"
                >
                  <ExternalLink size={12} />
                  <span>เปิดแท็บพิมพ์แยก</span>
                </Link>
              </div>
            </div>

            {/* Container for Printable Sheets */}
            <div id="inverter-qc-printable-area" className="w-full flex flex-col items-center gap-8">
              {targetItems.map((target, idx) => (
                <div key={target.id || idx} className="qc-page-sheet w-full flex flex-col items-center">
                  {/* Onscreen Page Header Indicator */}
                  <div className="qc-screen-only w-full max-w-[794px] mb-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-xs flex items-center justify-between text-xs font-bold text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#ff2301] text-white flex items-center justify-center text-[10px] font-black">
                        {idx + 1}
                      </span>
                      <span>
                        หน้า {idx + 1} / {targetItems.length}: {target.displayTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 font-mono text-[11px]">
                        S/N: {itemsQc[idx]?.serialNumber || target.serial || "—"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePrint(idx)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff2301] hover:underline cursor-pointer"
                        title="พิมพ์เฉพาะหน้านี้"
                      >
                        <Printer size={12} />
                        <span>พิมพ์เฉพาะหน้านี้</span>
                      </button>
                    </div>
                  </div>

                  {/* The Official A4 Document Paper */}
                  <OfficialQcPaper
                    id={`official-qc-paper-modal-${idx}`}
                    item={target}
                    qcItem={itemsQc[idx] || createDefaultItemQc(target)}
                    common={common}
                    pageIndex={idx}
                    totalPages={targetItems.length}
                    className="shadow-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>
              สถานะเอกสาร:{" "}
              {order?.inverterQc ? (
                <b className="text-emerald-600">บันทึก QC แล้ว</b>
              ) : (
                <b className="text-amber-600">ยังไม่บันทึก QC</b>
              )}
            </span>
            {targetItems.length > 1 && (
              <span className="text-gray-400">• รายการซ่อม: <b>{targetItems.length} ตัว</b></span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {targetItems.length > 1 && (
              <button
                type="button"
                onClick={() => handlePrint(activeItemIndex)}
                disabled={isSaving}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs transition shadow-2xs cursor-pointer"
                title={`พิมพ์เฉพาะรายการตัวที่ ${activeItemIndex + 1}`}
              >
                <Printer className="w-3.5 h-3.5 text-gray-500" />
                <span>พิมพ์เฉพาะตัวที่ {activeItemIndex + 1}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handlePrint()}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#ff2301] shrink-0" />
              <span className="text-gray-800 font-bold">
                พิมพ์ / บันทึก PDF (A4){" "}
                {targetItems.length > 1 ? `(ทั้งหมด ${targetItems.length} หน้า)` : ""}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#ff2301] hover:bg-[#d91d00] text-white font-bold text-xs transition shadow-md shadow-red-500/25 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-white shrink-0" />
              <span className="text-white font-bold">
                {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล QC"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
