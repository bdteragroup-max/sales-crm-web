"use client";

import React, { useState, useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  X,
  Printer,
  Download,
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
} from "lucide-react";
import Swal from "sweetalert2";
import { InverterQcData, saveInverterQc } from "@/app/actions/repairOrders";

interface InverterQcModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any; // RepairOrder record
  onSaved?: (updatedOrder: any) => void;
  currentUserName?: string;
  users?: any[];
}

const parseOrderItems = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const buildFormData = (order: any, fallbackInspectorName?: string): InverterQcData => {
  const initialData: InverterQcData = order?.inverterQc || {};
  const items = parseOrderItems(order?.items);
  const firstItem = items[0] || {};

  return {
    receiveDate:
      initialData.receiveDate ||
      (order?.receivedDate
        ? new Date(order.receivedDate).toISOString().split("T")[0]
        : order?.createdAt
        ? new Date(order.createdAt).toISOString().split("T")[0]
        : ""),
    inverterBrand: initialData.inverterBrand || firstItem.brand || "",
    inverterModel: initialData.inverterModel || firstItem.model || "",
    serialNumber: initialData.serialNumber || firstItem.serial || "",
    workType: initialData.workType || order?.workType || order?.job?.jobType || "งานซ่อม INVERTER",
    customerName: initialData.customerName || order?.customerCompany || order?.job?.customerName || "",

    // 1. Input Voltage
    inputVoltage: {
      dcSinglePhase: {
        checked: initialData.inputVoltage?.dcSinglePhase?.checked ?? false,
        value: initialData.inputVoltage?.dcSinglePhase?.value || "",
      },
      acSinglePhase: {
        checked: initialData.inputVoltage?.acSinglePhase?.checked ?? false,
        value: initialData.inputVoltage?.acSinglePhase?.value || "",
      },
      acThreePhase: {
        checked: initialData.inputVoltage?.acThreePhase?.checked ?? false,
        rs: initialData.inputVoltage?.acThreePhase?.rs || "",
        rt: initialData.inputVoltage?.acThreePhase?.rt || "",
        st: initialData.inputVoltage?.acThreePhase?.st || "",
      },
    },

    // 2. Output Voltage
    outputVoltage: {
      singlePhaseLN: {
        checked: initialData.outputVoltage?.singlePhaseLN?.checked ?? false,
        value: initialData.outputVoltage?.singlePhaseLN?.value || "",
      },
      threePhase220: {
        checked: initialData.outputVoltage?.threePhase220?.checked ?? false,
        uv: initialData.outputVoltage?.threePhase220?.uv || "",
        uw: initialData.outputVoltage?.threePhase220?.uw || "",
        vw: initialData.outputVoltage?.threePhase220?.vw || "",
      },
      threePhase380: {
        checked: initialData.outputVoltage?.threePhase380?.checked ?? false,
        uv: initialData.outputVoltage?.threePhase380?.uv || "",
        uw: initialData.outputVoltage?.threePhase380?.uw || "",
        vw: initialData.outputVoltage?.threePhase380?.vw || "",
      },
    },

    // 3. Control Circuit & Timing
    controlCircuit: {
      control24Vdc: {
        checked: initialData.controlCircuit?.control24Vdc?.checked ?? false,
        x1: initialData.controlCircuit?.control24Vdc?.x1 || "",
        x2: initialData.controlCircuit?.control24Vdc?.x2 || "",
        x3: initialData.controlCircuit?.control24Vdc?.x3 || "",
        x4: initialData.controlCircuit?.control24Vdc?.x4 || "",
        x5: initialData.controlCircuit?.control24Vdc?.x5 || "",
      },
      testAcDuration: {
        checked: initialData.controlCircuit?.testAcDuration?.checked ?? false,
        minutes: initialData.controlCircuit?.testAcDuration?.minutes || "",
      },
      testDcDuration: {
        checked: initialData.controlCircuit?.testDcDuration?.checked ?? false,
        minutes: initialData.controlCircuit?.testDcDuration?.minutes || "",
      },
      testAcDcDuration: {
        checked: initialData.controlCircuit?.testAcDcDuration?.checked ?? false,
        minutes: initialData.controlCircuit?.testAcDcDuration?.minutes || "",
      },
    },

    // 4. Parameter Setting
    parameterSetting: {
      keepCustomerOriginal: initialData.parameterSetting?.keepCustomerOriginal ?? false,
      setNewForCustomer: initialData.parameterSetting?.setNewForCustomer ?? false,
    },

    // 5. Visual & Safety Checks
    visualChecks: {
      screwsAndPartsComplete: initialData.visualChecks?.screwsAndPartsComplete ?? false,
      fanExhaustDirectionCorrect: initialData.visualChecks?.fanExhaustDirectionCorrect ?? false,
      controlWiringNormal: initialData.visualChecks?.controlWiringNormal ?? false,
      diodeConversionCorrect: initialData.visualChecks?.diodeConversionCorrect ?? false,
    },

    // 6. Parameter Rows
    parameterRows:
      initialData.parameterRows && initialData.parameterRows.length >= 6
        ? initialData.parameterRows
        : [
            initialData.parameterRows?.[0] || "",
            initialData.parameterRows?.[1] || "",
            initialData.parameterRows?.[2] || "",
            initialData.parameterRows?.[3] || "",
            initialData.parameterRows?.[4] || "",
            initialData.parameterRows?.[5] || "",
          ],

    // 7. Notes
    notes: initialData.notes || "",

    // 8. Signatures
    inspectorName:
      initialData.inspectorName ||
      fallbackInspectorName ||
      order?.technicianName ||
      order?.job?.assignedToName ||
      "",
    inspectorSignatureUrl: initialData.inspectorSignatureUrl || undefined,
    inspectorDate: initialData.inspectorDate || new Date().toISOString().split("T")[0],
    reviewerName: initialData.reviewerName || "",
    reviewerSignatureUrl: initialData.reviewerSignatureUrl || undefined,
    reviewerDate: initialData.reviewerDate || new Date().toISOString().split("T")[0],
    formRev: "QC-EN-01/Rev.00",
  };
};

export default function InverterQcModal({
  isOpen,
  onClose,
  order,
  onSaved,
  currentUserName,
  users = [],
}: InverterQcModalProps) {
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [isSaving, setIsSaving] = useState(false);
  const [advanceStep, setAdvanceStep] = useState(true);

  // Signatures
  const sigPadInspector = useRef<SignatureCanvas | null>(null);
  const sigPadReviewer = useRef<SignatureCanvas | null>(null);
  const fileInputInspectorRef = useRef<HTMLInputElement | null>(null);
  const fileInputReviewerRef = useRef<HTMLInputElement | null>(null);

  const [hasSavedSig, setHasSavedSig] = useState(false);

  // Determine current user / technician name
  const resolvedCurrentUserName =
    currentUserName ||
    (typeof window !== "undefined"
      ? localStorage.getItem("crm_user_inspector_name") || localStorage.getItem("crm_user_name")
      : "") ||
    order?.technicianName ||
    order?.job?.assignedToName ||
    "";

  const [formData, setFormData] = useState<InverterQcData>(() =>
    buildFormData(order, resolvedCurrentUserName)
  );

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

      const data = buildFormData(order, resolvedName);
      if (typeof window !== "undefined") {
        const savedUserSig = localStorage.getItem("crm_user_signature");
        setHasSavedSig(!!savedUserSig);
        if (savedUserSig && !data.inspectorSignatureUrl) {
          data.inspectorSignatureUrl = savedUserSig;
        }

        // If inspector name is empty, auto-populate with resolvedName
        if (!data.inspectorName && resolvedName) {
          data.inspectorName = resolvedName;
        }
      }
      setFormData(data);
    }
  }, [isOpen, order, currentUserName]);

  if (!isOpen || !order) return null;

  // Format Thai Date
  const formatThaiDate = (dateStr?: string) => {
    if (!dateStr) return "....................";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Quick check all visual items
  const handleCheckAllVisual = () => {
    setFormData((prev) => ({
      ...prev,
      visualChecks: {
        screwsAndPartsComplete: true,
        fanExhaustDirectionCorrect: true,
        controlWiringNormal: true,
        diodeConversionCorrect: true,
      },
    }));
  };

  // Handle signature file attachment (PNG, JPG, etc.)
  const handleSignatureFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "inspector" | "reviewer"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: "ประเภทไฟล์ไม่ถูกต้อง",
        text: "กรุณาแนบไฟล์รูปภาพ เช่น PNG, JPG, JPEG",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "ไฟล์มีขนาดใหญ่เกินไป",
        text: "กรุณาแนบไฟล์รูปภาพขนาดไม่เกิน 5 MB",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        if (target === "inspector") {
          setFormData((prev) => ({ ...prev, inspectorSignatureUrl: dataUrl }));
        } else {
          setFormData((prev) => ({ ...prev, reviewerSignatureUrl: dataUrl }));
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Use saved signature from localStorage
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
      setFormData((prev) => ({ ...prev, inspectorSignatureUrl: saved }));
    } else {
      setFormData((prev) => ({ ...prev, reviewerSignatureUrl: saved }));
    }
  };

  // Save changes
  const handleSave = async (silent = false) => {
    setIsSaving(true);
    try {
      const dataToSave: InverterQcData = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      // Extract signatures from pads if active and not already set
      if (!dataToSave.inspectorSignatureUrl && sigPadInspector.current && !sigPadInspector.current.isEmpty()) {
        dataToSave.inspectorSignatureUrl = sigPadInspector.current
          .getTrimmedCanvas()
          .toDataURL("image/png");
      }
      if (!dataToSave.reviewerSignatureUrl && sigPadReviewer.current && !sigPadReviewer.current.isEmpty()) {
        dataToSave.reviewerSignatureUrl = sigPadReviewer.current
          .getTrimmedCanvas()
          .toDataURL("image/png");
      }

      // Remember signature & inspector name in localStorage
      if (typeof window !== "undefined") {
        try {
          if (dataToSave.inspectorSignatureUrl) {
            localStorage.setItem("crm_user_signature", dataToSave.inspectorSignatureUrl);
            setHasSavedSig(true);
          }
          if (dataToSave.inspectorName) {
            localStorage.setItem("crm_user_inspector_name", dataToSave.inspectorName);
          }
        } catch {}
      }

      const res = await saveInverterQc(order.id, dataToSave, advanceStep);
      if (!res.success) throw new Error(res.error);

      setFormData(dataToSave);
      if (onSaved) {
        onSaved(res.data);
      }

      if (!silent) {
        await Swal.fire({
          title: "บันทึกผลการตรวจ QC สำเร็จ",
          text: `บันทึกข้อมูลแบบฟอร์ม QC-EN-01/Rev.00 เรียบร้อย${
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
  const handlePrint = async () => {
    const saved = await handleSave(true);
    if (!saved) return;

    // Use browser print targeting the exact print stylesheet
    const printContent = document.getElementById("inverter-qc-printable-area");
    if (!printContent) {
      window.print();
      return;
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
                width: 210mm !important;
                height: 297mm !important;
                max-height: 297mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
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
            .qc-print-wrapper {
              width: 210mm;
              height: 297mm;
              max-height: 297mm;
              padding: 7mm 9mm;
              margin: 0 auto;
              box-sizing: border-box;
              overflow: hidden;
              page-break-after: avoid !important;
              break-after: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            #inverter-qc-printable-area {
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
          <div class="qc-print-wrapper">
            ${printContent.outerHTML}
          </div>
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
    // Fallback if onload doesn't fire
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
                <span>ตัวอย่างเอกสาร A4</span>
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
          <div className={activeTab === "form" ? "block" : "hidden"}>
            {/* ── TAB 1: FORM INPUTS ── */}
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Header Equipment Details Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#ff2301]" />
                    ข้อมูลอุปกรณ์และลูกค้า
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-500">วันที่รับซ่อม:</span>
                    <input
                      type="date"
                      value={formData.receiveDate || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, receiveDate: e.target.value }))
                      }
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
                      value={formData.inverterBrand || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, inverterBrand: e.target.value }))
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
                      value={formData.inverterModel || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, inverterModel: e.target.value }))
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
                      value={formData.serialNumber || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))
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
                      value={formData.workType || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, workType: e.target.value }))
                      }
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
                      value={formData.customerName || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, customerName: e.target.value }))
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
                        checked={formData.inputVoltage?.dcSinglePhase?.checked ?? false}
                        onChange={(e) =>
                          setFormData((prev) => ({
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
                        value={formData.inputVoltage?.dcSinglePhase?.value || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
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
                        checked={formData.inputVoltage?.acSinglePhase?.checked ?? false}
                        onChange={(e) =>
                          setFormData((prev) => ({
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
                        value={formData.inputVoltage?.acSinglePhase?.value || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
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
                        checked={formData.inputVoltage?.acThreePhase?.checked ?? false}
                        onChange={(e) =>
                          setFormData((prev) => ({
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
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-[11px]">R-S:</span>
                        <input
                          type="text"
                          value={formData.inputVoltage?.acThreePhase?.rs || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                          className="w-18 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                        />
                        <span className="text-gray-500 text-[11px]">Vac</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-[11px]">R-T:</span>
                        <input
                          type="text"
                          value={formData.inputVoltage?.acThreePhase?.rt || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                          className="w-18 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                        />
                        <span className="text-gray-500 text-[11px]">Vac</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-[11px]">S-T:</span>
                        <input
                          type="text"
                          value={formData.inputVoltage?.acThreePhase?.st || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                          className="w-18 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                        />
                        <span className="text-gray-500 text-[11px]">Vac</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. POWER OUTPUT VOLTAGE หลังซ่อมเสร็จ */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold text-red-700 tracking-wide uppercase">
                    2. POWER OUTPUT VOLTAGE หลังซ่อมเสร็จ
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Row 1: 1-Phase L-N */}
                  <div className="flex flex-wrap items-center gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                    <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer min-w-[200px]">
                      <input
                        type="checkbox"
                        checked={formData.outputVoltage?.singlePhaseLN?.checked ?? false}
                        onChange={(e) =>
                          setFormData((prev) => ({
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
                        value={formData.outputVoltage?.singlePhaseLN?.value || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
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

                  {/* Row 2: 3-Phase 220-230Vac */}
                  <div className="flex flex-wrap items-center gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                    <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer min-w-[200px]">
                      <input
                        type="checkbox"
                        checked={formData.outputVoltage?.threePhase220?.checked ?? false}
                        onChange={(e) =>
                          setFormData((prev) => ({
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
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-[11px]">U-V:</span>
                        <input
                          type="text"
                          value={formData.outputVoltage?.threePhase220?.uv || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                          className="w-18 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                        />
                        <span className="text-gray-500 text-[11px]">Vac</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-[11px]">U-W:</span>
                        <input
                          type="text"
                          value={formData.outputVoltage?.threePhase220?.uw || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                          className="w-18 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                        />
                        <span className="text-gray-500 text-[11px]">Vac</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-[11px]">V-W:</span>
                        <input
                          type="text"
                          value={formData.outputVoltage?.threePhase220?.vw || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                          className="w-18 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                        />
                        <span className="text-gray-500 text-[11px]">Vac</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: 3-Phase 380-400Vac */}
                  <div className="flex flex-wrap items-center gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                    <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer min-w-[200px]">
                      <input
                        type="checkbox"
                        checked={formData.outputVoltage?.threePhase380?.checked ?? false}
                        onChange={(e) =>
                          setFormData((prev) => ({
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
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-[11px]">U-V:</span>
                        <input
                          type="text"
                          value={formData.outputVoltage?.threePhase380?.uv || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                          className="w-18 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                        />
                        <span className="text-gray-500 text-[11px]">Vac</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-[11px]">U-W:</span>
                        <input
                          type="text"
                          value={formData.outputVoltage?.threePhase380?.uw || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                          className="w-18 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                        />
                        <span className="text-gray-500 text-[11px]">Vac</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-[11px]">V-W:</span>
                        <input
                          type="text"
                          value={formData.outputVoltage?.threePhase380?.vw || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                          className="w-18 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                        />
                        <span className="text-gray-500 text-[11px]">Vac</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. CONTROL CIRCUIT และเทสระยะเวลาในการจ่ายไฟ */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold text-red-700 tracking-wide uppercase">
                    3. CONTROL CIRCUIT และเทสระยะเวลาในการจ่ายไฟ
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Row 1: 24 Vdc (X1-X5) */}
                  <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100 space-y-2">
                    <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.controlCircuit?.control24Vdc?.checked ?? false}
                        onChange={(e) =>
                          setFormData((prev) => ({
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
                      <span>24 Vdc (วัดแรงดัน Control Circuit ขั้ว X1 - X5)</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2.5 pl-6">
                      {(["x1", "x2", "x3", "x4", "x5"] as const).map((key, i) => (
                        <div key={key} className="flex items-center gap-1">
                          <span className="text-gray-600 font-semibold text-[11px] uppercase">
                            X{i + 1}:
                          </span>
                          <input
                            type="text"
                            value={formData.controlCircuit?.control24Vdc?.[key] || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                controlCircuit: {
                                  ...prev.controlCircuit!,
                                  control24Vdc: {
                                    ...prev.controlCircuit!.control24Vdc!,
                                    checked: true,
                                    [key]: e.target.value,
                                  },
                                },
                              }))
                            }
                            className="w-16 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                          />
                          <span className="text-gray-500 text-[10px]">Vdc</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timing Rows: AC, DC, AC+DC */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* AC */}
                    <div className="flex items-center justify-between gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                      <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.controlCircuit?.testAcDuration?.checked ?? false}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                        <span>เทสจ่ายไฟ AC</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={formData.controlCircuit?.testAcDuration?.minutes || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                          placeholder="เวลา"
                          className="w-16 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                        />
                        <span className="text-gray-500 text-[11px]">นาที</span>
                      </div>
                    </div>

                    {/* DC */}
                    <div className="flex items-center justify-between gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                      <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.controlCircuit?.testDcDuration?.checked ?? false}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                        <span>เทสจ่ายไฟ DC</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={formData.controlCircuit?.testDcDuration?.minutes || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                          placeholder="เวลา"
                          className="w-16 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                        />
                        <span className="text-gray-500 text-[11px]">นาที</span>
                      </div>
                    </div>

                    {/* AC + DC */}
                    <div className="flex items-center justify-between gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                      <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.controlCircuit?.testAcDcDuration?.checked ?? false}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                        <span>เทส AC+DC พร้อมกัน</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={formData.controlCircuit?.testAcDcDuration?.minutes || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
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
                          placeholder="เวลา"
                          className="w-16 text-center font-mono font-bold text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                        />
                        <span className="text-gray-500 text-[11px]">นาที</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. การ Set ค่า Parameter */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold text-red-700 tracking-wide uppercase">
                    4. การ Set ค่า Parameter
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.parameterSetting?.keepCustomerOriginal ?? false}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          parameterSetting: {
                            ...prev.parameterSetting!,
                            keepCustomerOriginal: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="font-medium text-gray-800">
                      Set ค่า Parameter เดิมให้ลูกค้า (โปรดบันทึกค่าลงในตารางด้านล่าง)
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.parameterSetting?.setNewForCustomer ?? false}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          parameterSetting: {
                            ...prev.parameterSetting!,
                            setNewForCustomer: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="font-medium text-gray-800">
                      Set ค่า Parameter ใหม่ให้ลูกค้า (โปรดบันทึกค่าลงในตารางด้านล่าง)
                    </span>
                  </label>
                </div>
              </div>

              {/* 5. ตรวจเชคอะไหล่และความเรียบร้อยภายในก่อนส่งคืนลูกค้า */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700 tracking-wide uppercase">
                    5. ตรวจเชคอะไหล่และความเรียบร้อยภายในก่อนส่งคืนลูกค้า
                  </span>
                  <button
                    type="button"
                    onClick={handleCheckAllVisual}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" /> ติ๊กผ่านทั้งหมด
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.visualChecks?.screwsAndPartsComplete ?? false}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          visualChecks: {
                            ...prev.visualChecks!,
                            screwsAndPartsComplete: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="font-medium text-gray-800">
                      น็อตและอะไหล่ภายใน INVERTER ติดตั้งครบถ้วน
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.visualChecks?.fanExhaustDirectionCorrect ?? false}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          visualChecks: {
                            ...prev.visualChecks!,
                            fanExhaustDirectionCorrect: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="font-medium text-gray-800">
                      ตรวจเช็คพัดลมต้องดูดลมออก (ไม่ติดตั้งสลับทาง)
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.visualChecks?.controlWiringNormal ?? false}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          visualChecks: {
                            ...prev.visualChecks!,
                            controlWiringNormal: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="font-medium text-gray-800">
                      สายไฟ Control ภายใน Board Electronics อยู่ในตำแหน่งที่ถูกต้องและมีสภาพปกติ
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.visualChecks?.diodeConversionCorrect ?? false}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          visualChecks: {
                            ...prev.visualChecks!,
                            diodeConversionCorrect: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="font-medium text-gray-800">
                      ตรวจสอบการแปลงไดโอดของ INVERTER อยู่ในสภาพที่ถูกต้อง (หากมีการแปลง) * โปรดดูคู่มือการแปลงก่อนทุกครั้ง
                    </span>
                  </label>
                </div>
              </div>

              {/* 6. บันทึกค่า Parameter ที่ตั้งไว้ / รายละเอียดเพิ่มเติมหรือปัญหาที่พบ */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700 tracking-wide uppercase">
                    6. บันทึกค่า Parameter ที่ตั้งไว้ / รายละเอียดเพิ่มเติมหรือปัญหาที่พบ
                  </span>
                  <span className="text-[11px] text-gray-400">กรอกรายการพารามิเตอร์หรือข้อสังเกต</span>
                </div>

                <div className="space-y-1.5">
                  {(formData.parameterRows || []).map((rowVal, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-400 w-6 text-right">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={rowVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev) => {
                            const rows = [...(prev.parameterRows || [])];
                            rows[idx] = val;
                            return { ...prev, parameterRows: rows };
                          });
                        }}
                        placeholder={`ระบุพารามิเตอร์ / ผลการทดสอบแถวที่ ${idx + 1}...`}
                        className="flex-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. หมายเหตุ */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
                <span className="text-xs font-bold text-gray-700">หมายเหตุ:</span>
                <textarea
                  rows={2}
                  value={formData.notes || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)..."
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* 8. Signatures & Status Transition */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4">
                <div className="border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold text-gray-900">
                    ผู้ตรวจเช็ค และ ผู้ตรวจสอบ (ลายมือชื่อ)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ผู้ตรวจเช็ค (Technician) */}
                  <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">
                        ผู้ตรวจเช็ค (Technician)
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">ช่างผู้ตรวจ</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-gray-600">
                          ลงชื่อตัวบรรจง:
                        </label>
                        {resolvedCurrentUserName && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                inspectorName: resolvedCurrentUserName,
                              }))
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff2301] hover:text-[#d91d00] hover:underline cursor-pointer bg-red-50/70 hover:bg-red-100/70 px-2 py-0.5 rounded-md border border-red-200 transition"
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
                          value={formData.inspectorName || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, inspectorName: e.target.value }))
                          }
                          placeholder="ชื่อ-นามสกุลช่างผู้ตรวจเช็ค"
                          className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-medium focus:ring-1 focus:ring-red-500"
                        />
                        <datalist id="inspector-users-list">
                          {resolvedCurrentUserName && (
                            <option value={resolvedCurrentUserName}>
                              {resolvedCurrentUserName} (ผู้กรอก)
                            </option>
                          )}
                          {order?.technicianName && order.technicianName !== resolvedCurrentUserName && (
                            <option value={order.technicianName}>
                              {order.technicianName} (ช่างประจำใบรับซ่อม)
                            </option>
                          )}
                          {order?.job?.assignedToName &&
                            order.job.assignedToName !== resolvedCurrentUserName &&
                            order.job.assignedToName !== order.technicianName && (
                              <option value={order.job.assignedToName}>
                                {order.job.assignedToName} (ผู้รับผิดชอบ Job)
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
                    {formData.inspectorSignatureUrl ? (
                      <div className="border border-emerald-300 bg-emerald-50/30 rounded-xl p-2.5 flex flex-col items-center gap-2">
                        <div className="bg-white p-1 rounded-lg border border-emerald-100 shadow-sm w-full flex items-center justify-center min-h-[60px]">
                          <img
                            src={formData.inspectorSignatureUrl}
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
                              setFormData((prev) => ({ ...prev, inspectorSignatureUrl: undefined }))
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

                  {/* ผู้ตรวจสอบ (Reviewer / Supervisor) */}
                  <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">
                        ผู้ตรวจสอบ (Reviewer / Supervisor)
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">หัวหน้างาน</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-gray-600">
                          ลงชื่อตัวบรรจง:
                        </label>
                        {resolvedCurrentUserName && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
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
                          value={formData.reviewerName || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, reviewerName: e.target.value }))
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
                    {formData.reviewerSignatureUrl ? (
                      <div className="border border-emerald-300 bg-emerald-50/30 rounded-xl p-2.5 flex flex-col items-center gap-2">
                        <div className="bg-white p-1 rounded-lg border border-emerald-100 shadow-sm w-full flex items-center justify-center min-h-[60px]">
                          <img
                            src={formData.reviewerSignatureUrl}
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
                              setFormData((prev) => ({ ...prev, reviewerSignatureUrl: undefined }))
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

          {/* ── TAB 2: LIVE A4 OFFICIAL PRINT PREVIEW ── */}
          <div className={activeTab === "preview" ? "flex flex-col items-center" : "hidden"}>
            <div className="text-center mb-3">
              <span className="text-xs text-gray-500">
                📄 แสดงตัวอย่างแบบฟอร์มขนาด A4 ตรงตามเอกสารทางการ (QC-EN-01/Rev.00)
              </span>
            </div>

            {/* The Actual Official Printable Area */}
            <div
              id="inverter-qc-printable-area"
              className="bg-white border-2 border-black w-full max-w-[794px] p-4 sm:p-5 text-black shadow-lg text-[11.5px] leading-snug font-['Sarabun',sans-serif] flex flex-col justify-between"
              style={{ boxSizing: "border-box" }}
            >
              {/* Header Row: Logos (4, 6, 7) + Address on Left, Date Box on Right */}
              <div className="flex items-center justify-between gap-3 pb-1.5 border-b-2 border-black">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 shrink-0">
                    <img src="/4.png" alt="Tera Group" className="h-8 object-contain" />
                    <img src="/6.png" alt="Tera Electric" className="h-8 object-contain" />
                    <img src="/7.png" alt="Tera Power" className="h-8 object-contain" />
                  </div>
                  <div className="text-[11px] leading-tight text-gray-800">
                    39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250
                  </div>
                </div>

                {/* Top Right: วันที่รับซ่อม Box */}
                <div className="border border-black rounded-xl px-3 py-1 text-center min-w-[170px] bg-white shrink-0">
                  <span className="text-[11px] font-bold mr-2">วันที่รับซ่อม</span>
                  <span className="font-bold border-b border-black inline-block min-w-[80px] text-center text-xs">
                    {formatThaiDate(formData.receiveDate)}
                  </span>
                </div>
              </div>

              {/* Form Title in Framed Box */}
              <div className="my-1.5 border-2 border-black py-1 px-3 text-center bg-gray-50/50">
                <h1 className="text-xs sm:text-[13px] font-bold text-red-700 tracking-wide">
                  ใบตรวจสอบค่าต่างๆและบันทึกค่าพารามิเตอร์ของ INVERTER หลัง ทำการซ่อมเสร็จ
                </h1>
              </div>

              {/* Equipment & Customer Meta Row */}
              <div className="border border-black p-2 space-y-1 text-[11.5px] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold">INVERTER ยี่ห้อ : </span>
                    <span className="font-bold">{formData.inverterBrand || "...................."}</span>
                  </div>
                  <div>
                    <span className="font-bold">INVERTER รุ่น : </span>
                    <span className="font-bold">{formData.inverterModel || "...................."}</span>
                  </div>
                  <div>
                    <span className="font-bold">SERIAL NUMBER : </span>
                    <span className="font-mono font-bold">{formData.serialNumber || "...................."}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 border-t border-dotted border-gray-300">
                  <div>
                    <span className="font-bold">ใช้กับงานประเภท : </span>
                    <span>{formData.workType || "...................."}</span>
                  </div>
                  <div>
                    <span className="font-bold">ลูกค้า : </span>
                    <span className="font-bold">{formData.customerName || "...................."}</span>
                  </div>
                </div>
              </div>

              {/* Section 1: POWER INPUT VOLTAGE */}
              <div className="mt-1.5">
                <div className="text-[11.5px] font-bold text-red-700 pb-0.5">
                  POWER INPUT VOLTAGE หลังซ่อมเสร็จ
                </div>
                <div className="space-y-0.5 text-[11px] pl-1">
                  {/* DC */}
                  <div className="flex items-center">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.inputVoltage?.dcSinglePhase?.checked ? "☑" : "☐"}
                    </span>
                    <span>1 เฟส DC (+) , (-) .</span>
                    <span className="border-b border-dotted border-black px-2 min-w-[65px] text-center font-bold inline-block mx-1">
                      {formData.inputVoltage?.dcSinglePhase?.value || "......."}
                    </span>
                    <span>Vdc</span>
                  </div>
                  {/* AC 1-Phase */}
                  <div className="flex items-center">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.inputVoltage?.acSinglePhase?.checked ? "☑" : "☐"}
                    </span>
                    <span>1 เฟส (220-230Vac) L-N .</span>
                    <span className="border-b border-dotted border-black px-2 min-w-[65px] text-center font-bold inline-block mx-1">
                      {formData.inputVoltage?.acSinglePhase?.value || "......."}
                    </span>
                    <span>Vac</span>
                  </div>
                  {/* AC 3-Phase */}
                  <div className="flex items-center flex-wrap">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.inputVoltage?.acThreePhase?.checked ? "☑" : "☐"}
                    </span>
                    <span>3 เฟส (380-400Vac) R-S</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                      {formData.inputVoltage?.acThreePhase?.rs || "......."}
                    </span>
                    <span>Vac , R-T</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                      {formData.inputVoltage?.acThreePhase?.rt || "......."}
                    </span>
                    <span>Vac , S-T</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                      {formData.inputVoltage?.acThreePhase?.st || "......."}
                    </span>
                    <span>Vac</span>
                  </div>
                </div>
              </div>

              {/* Section 2: POWER OUTPUT VOLTAGE */}
              <div className="mt-1.5">
                <div className="text-[11.5px] font-bold text-red-700 pb-0.5">
                  POWER OUTPUT VOLTAGE หลังซ่อมเสร็จ
                </div>
                <div className="space-y-0.5 text-[11px] pl-1">
                  {/* 1-Phase */}
                  <div className="flex items-center">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.outputVoltage?.singlePhaseLN?.checked ? "☑" : "☐"}
                    </span>
                    <span>1 เฟส L-N (220-230Vac)</span>
                    <span className="border-b border-dotted border-black px-2 min-w-[65px] text-center font-bold inline-block mx-1">
                      {formData.outputVoltage?.singlePhaseLN?.value || "......."}
                    </span>
                    <span>Vac</span>
                  </div>
                  {/* 3-Phase 220 */}
                  <div className="flex items-center flex-wrap">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.outputVoltage?.threePhase220?.checked ? "☑" : "☐"}
                    </span>
                    <span>3 เฟส (220-230Vac) U-V .</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                      {formData.outputVoltage?.threePhase220?.uv || "......."}
                    </span>
                    <span>Vac , U-W .</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                      {formData.outputVoltage?.threePhase220?.uw || "......."}
                    </span>
                    <span>Vac , V-W .</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                      {formData.outputVoltage?.threePhase220?.vw || "......."}
                    </span>
                    <span>Vac</span>
                  </div>
                  {/* 3-Phase 380 */}
                  <div className="flex items-center flex-wrap">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.outputVoltage?.threePhase380?.checked ? "☑" : "☐"}
                    </span>
                    <span>3 เฟส (380-400Vac) U-V</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                      {formData.outputVoltage?.threePhase380?.uv || "......."}
                    </span>
                    <span>Vac , U-W</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                      {formData.outputVoltage?.threePhase380?.uw || "......."}
                    </span>
                    <span>Vac , V-W</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                      {formData.outputVoltage?.threePhase380?.vw || "......."}
                    </span>
                    <span>Vac</span>
                  </div>
                </div>
              </div>

              {/* Section 3: CONTROL CIRCUIT และเทสระยะเวลาในการจ่ายไฟ */}
              <div className="mt-1.5">
                <div className="text-[11.5px] font-bold text-red-700 pb-0.5">
                  CONTROL CIRCUIT และเทสระยะเวลาในการจ่ายไฟ
                </div>
                <div className="space-y-0.5 text-[11px] pl-1">
                  {/* 24Vdc */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1">
                      {formData.controlCircuit?.control24Vdc?.checked ? "☑" : "☐"}
                    </span>
                    <span>24 Vdc , X1 .</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[28px] text-center font-bold inline-block mx-0.5">
                      {formData.controlCircuit?.control24Vdc?.x1 || "..."}
                    </span>
                    <span>Vdc , X2 .</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[28px] text-center font-bold inline-block mx-0.5">
                      {formData.controlCircuit?.control24Vdc?.x2 || "..."}
                    </span>
                    <span>Vdc , X3 .</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[28px] text-center font-bold inline-block mx-0.5">
                      {formData.controlCircuit?.control24Vdc?.x3 || "..."}
                    </span>
                    <span>Vdc , X4 .</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[28px] text-center font-bold inline-block mx-0.5">
                      {formData.controlCircuit?.control24Vdc?.x4 || "..."}
                    </span>
                    <span>Vdc , X5 .</span>
                    <span className="border-b border-dotted border-black px-1 min-w-[28px] text-center font-bold inline-block mx-0.5">
                      {formData.controlCircuit?.control24Vdc?.x5 || "..."}
                    </span>
                    <span>Vdc</span>
                  </div>

                  {/* AC Timing */}
                  <div className="flex items-center">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.controlCircuit?.testAcDuration?.checked ? "☑" : "☐"}
                    </span>
                    <span>เทสเฉพาะการจ่ายไฟ AC ระยะเวลา .</span>
                    <span className="border-b border-dotted border-black px-1.5 min-w-[45px] text-center font-bold inline-block mx-1">
                      {formData.controlCircuit?.testAcDuration?.minutes || "......."}
                    </span>
                    <span>นาที</span>
                  </div>

                  {/* DC Timing */}
                  <div className="flex items-center">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.controlCircuit?.testDcDuration?.checked ? "☑" : "☐"}
                    </span>
                    <span>เทสเฉพาะการจ่ายไฟ DC ระยะเวลา .</span>
                    <span className="border-b border-dotted border-black px-1.5 min-w-[45px] text-center font-bold inline-block mx-1">
                      {formData.controlCircuit?.testDcDuration?.minutes || "......."}
                    </span>
                    <span>นาที</span>
                  </div>

                  {/* AC + DC Timing */}
                  <div className="flex items-center">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.controlCircuit?.testAcDcDuration?.checked ? "☑" : "☐"}
                    </span>
                    <span>เทสการจ่ายไฟ AC และ DC พร้อมกัน ระยะเวลา .</span>
                    <span className="border-b border-dotted border-black px-1.5 min-w-[45px] text-center font-bold inline-block mx-1">
                      {formData.controlCircuit?.testAcDcDuration?.minutes || "......."}
                    </span>
                    <span>นาที</span>
                  </div>
                </div>
              </div>

              {/* Section 4: การ Set ค่า Parameter */}
              <div className="mt-1.5">
                <div className="text-[11.5px] font-bold text-red-700 pb-0.5">
                  การ Set ค่า Parameter
                </div>
                <div className="space-y-0.5 text-[11px] pl-1">
                  <div className="flex items-center">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.parameterSetting?.keepCustomerOriginal ? "☑" : "☐"}
                    </span>
                    <span>Set ค่า Parameter เดิมให้ลูกค้า (โปรดบันทึกค่าลงในตารางด้านล่าง)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.parameterSetting?.setNewForCustomer ? "☑" : "☐"}
                    </span>
                    <span>Set ค่า Parameter ใหม่ให้ลูกค้า (โปรดบันทึกค่าลงในตารางด้านล่าง)</span>
                  </div>
                </div>
              </div>

              {/* Section 5: ตรวจเชคอะไหล่และความเรียบร้อยภายในก่อนส่งคืนลูกค้า */}
              <div className="mt-1.5">
                <div className="text-[11.5px] font-bold text-red-700 pb-0.5">
                  ตรวจเชคอะไหล่และความเรียบร้อยภายในก่อนส่งคืนลูกค้า
                </div>
                <div className="space-y-0.5 text-[11px] pl-1">
                  <div className="flex items-center">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.visualChecks?.screwsAndPartsComplete ? "☑" : "☐"}
                    </span>
                    <span>น็อตและอะไหล่ภายใน INVERTER ติดตั้งครบถ้วน</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.visualChecks?.fanExhaustDirectionCorrect ? "☑" : "☐"}
                    </span>
                    <span>ตรวจเช็คพัดลมต้องดูดลมออก (ไม่ติดตั้งสลับทาง)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.visualChecks?.controlWiringNormal ? "☑" : "☐"}
                    </span>
                    <span>สายไฟ Control ภายใน Board Electronics อยู่ในตำแหน่งที่ถูกต้องและมีสภาพปกติ</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                    <span className="font-mono text-sm mr-1.5">
                      {formData.visualChecks?.diodeConversionCorrect ? "☑" : "☐"}
                    </span>
                    <span>
                      ตรวจสอบการแปลงไดโอดของ INVERTER อยู่ในสภาพที่ถูกต้อง (หากมีการแปลง) * โปรดดูคู่มือการแปลงก่อนทุกครั้ง
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 6: บันทึกค่า Parameter ที่ตั้งไว้ / รายละเอียดเพิ่มเติมหรือปัญหาที่พบ */}
              <div className="mt-1.5">
                <table className="w-full border-collapse border border-black text-[11px]">
                  <thead>
                    <tr className="border-b border-black bg-gray-50/30">
                      <th className="py-0.5 px-2 text-center text-red-700 font-bold">
                        บันทึกค่า Parameter ที่ตั้งไว้ / รายละเอียดเพิ่มเติมหรือปัญหาที่พบ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.parameterRows || []).slice(0, 6).map((r, i) => (
                      <tr key={i} className="border-b border-black h-5">
                        <td className="px-2 py-0.5 align-middle text-black">
                          {r || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section 7: หมายเหตุ */}
              <div className="mt-1.5 text-[11px]">
                <div className="font-bold mb-0.5">หมายเหตุ:</div>
                <div className="border-b border-dotted border-black min-h-[18px] px-1 font-medium">
                  {formData.notes || ""}
                </div>
                <div className="border-b border-dotted border-black min-h-[18px] mt-0.5"></div>
              </div>

              {/* Section 8: Signatures & Form Code */}
              <div className="mt-2.5 pt-1">
                <div className="grid grid-cols-2 gap-8 text-center text-[11px]">
                  {/* ผู้ตรวจเช็ค */}
                  <div className="flex flex-col items-center justify-end min-h-[65px]">
                    {formData.inspectorSignatureUrl ? (
                      <img
                        src={formData.inspectorSignatureUrl}
                        alt="Inspector Signature"
                        className="h-8 object-contain mb-0.5"
                      />
                    ) : (
                      <div className="h-8"></div>
                    )}
                    <div className="border-t border-black w-44 mx-auto pt-0.5 font-bold">
                      ( {formData.inspectorName || "......................................."} )
                    </div>
                    <div className="text-[10px] text-gray-700 mt-0.5">ผู้ตรวจเช็ค</div>
                  </div>

                  {/* ผู้ตรวจสอบ */}
                  <div className="flex flex-col items-center justify-end min-h-[65px]">
                    {formData.reviewerSignatureUrl ? (
                      <img
                        src={formData.reviewerSignatureUrl}
                        alt="Reviewer Signature"
                        className="h-8 object-contain mb-0.5"
                      />
                    ) : (
                      <div className="h-8"></div>
                    )}
                    <div className="border-t border-black w-44 mx-auto pt-0.5 font-bold">
                      ( {formData.reviewerName || "......................................."} )
                    </div>
                    <div className="text-[10px] text-gray-700 mt-0.5">ผู้ตรวจสอบ</div>
                  </div>
                </div>

                {/* Form Footer Revision Code */}
                <div className="text-right text-[9.5px] font-bold text-gray-800 mt-1">
                  QC-EN-01/Rev.00
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500">
            <span>
              สถานะเอกสาร:{" "}
              {order?.inverterQc ? (
                <b className="text-emerald-600">บันทึก QC แล้ว</b>
              ) : (
                <b className="text-amber-600">ยังไม่บันทึก QC</b>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#ff2301] shrink-0" />
              <span className="text-gray-800 font-bold">พิมพ์ / บันทึก PDF (A4)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#ff2301] hover:bg-[#d91d00] text-white font-bold text-xs transition shadow-md shadow-red-500/25 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-white shrink-0" />
              <span className="text-white font-bold">{isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล QC"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
