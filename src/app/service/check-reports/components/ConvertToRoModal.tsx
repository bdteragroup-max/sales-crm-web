"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Wrench, ArrowRight, UserCheck, CheckCircle2, Loader2, Sparkles, Building2 } from "lucide-react";
import Swal from "sweetalert2";
import { convertCheckReportToRepairOrder } from "@/app/actions/inverterCheckReports";

interface ConvertToRoModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: any;
  users: any[];
  onConverted?: (res: any) => void;
}

export default function ConvertToRoModal({
  isOpen,
  onClose,
  report,
  users = [],
  onConverted,
}: ConvertToRoModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [technicianName, setTechnicianName] = useState(report?.inspectorName || "");
  const [workType, setWorkType] = useState("ซ่อม");
  const [deliveryMethod, setDeliveryMethod] = useState("ช่างนำเข้า");

  if (!isOpen || !report) return null;

  const handleConvert = async () => {
    setIsSubmitting(true);
    try {
      const res = await convertCheckReportToRepairOrder(report.id, {
        technicianName,
        workType,
        deliveryMethod,
      });

      if (!res.success) {
        Swal.fire({
          icon: "error",
          title: "ไม่สามารถแปลงเป็นใบรับซ่อมได้",
          text: res.error || "เกิดข้อผิดพลาดในการประมวลผล",
          confirmButtonColor: "#ff2301",
        });
        setIsSubmitting(false);
        return;
      }

      onClose();
      if (onConverted) onConverted(res);

      Swal.fire({
        icon: "success",
        title: "เปิดใบรับซ่อมเรียบร้อยแล้ว!",
        html: `
          <div style="font-size: 14px; color: #475569; text-align: left; background: #f8fafc; padding: 12px; border-radius: 8px; margin-top: 8px;">
            <p><strong>เลขที่ใบรับซ่อม:</strong> <span style="color: #ff2301; font-weight: bold;">${res.jobNumber}</span></p>
            <p><strong>อ้างอิงใบตรวจเช็ค CR:</strong> ${report.crNumber}</p>
            <p><strong>ลูกค้า:</strong> ${report.customerCompany || report.customerName || "-"}</p>
            <p><strong>รุ่น/เครื่อง:</strong> ${report.inverterBrand || ""} ${report.inverterModel || ""} (S/N: ${report.serialNumber || "-"})</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "ไปยังหน้าใบรับซ่อมทันที",
        cancelButtonText: "ปิดหน้าต่าง",
        confirmButtonColor: "#ff2301",
      }).then((result) => {
        if (result.isConfirmed) {
          router.push(`/repair-orders/${res.jobId}/edit`);
        }
      });
    } catch (err: any) {
      console.error("Convert error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถแปลงเป็นใบรับซ่อมได้",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#ff2301] to-[#c71a00] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                แปลงเป็นใบรับซ่อม (Convert to RO)
                <Sparkles className="w-4 h-4 text-amber-300" />
              </h3>
              <p className="text-xs text-white/80">
                นำข้อมูลตรวจเช็ค CR เปิดใบรับซ่อมทันทีโดยไม่ต้องพิมพ์ซ้ำ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Summary Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="font-semibold text-slate-500">เลขที่เอกสาร CR:</span>
              <span className="font-bold text-slate-900 font-mono text-sm bg-white px-2 py-0.5 rounded border border-slate-200">
                {report.crNumber}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">ลูกค้า / บริษัท:</span>
              <span className="font-bold text-slate-800">
                {report.customerCompany || report.customerName || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Inverter:</span>
              <span className="font-semibold text-slate-700">
                {report.inverterBrand || "-"} {report.inverterModel || ""} (S/N: {report.serialNumber || "-"})
              </span>
            </div>
            {report.motorKw && (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">ขนาดมอเตอร์:</span>
                <span className="font-medium text-slate-700">{report.motorKw} kW</span>
              </div>
            )}
            <div className="border-t border-slate-200/80 pt-2">
              <span className="font-semibold text-slate-500 block mb-1">อาการเสียที่ระบุ:</span>
              <p className="text-slate-700 bg-white p-2 rounded border border-slate-200 line-clamp-2">
                {report.symptoms || "ไม่ได้ระบุอาการเสีย"}
              </p>
            </div>
          </div>

          {/* Form Options */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                ประเภทงาน (Work Type):
              </label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option value="ซ่อม">ซ่อม (ปกติ)</option>
                <option value="ซ่อมด่วน">ซ่อมด่วน (Urgent)</option>
                <option value="เคลมสินค้า">เคลมสินค้า (Claim Warranty)</option>
                <option value="ตรวจเช็ค/ประกอบ">ตรวจเช็ค / ประกอบตู้</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                มอบหมายช่างผู้รับผิดชอบงานซ่อม:
              </label>
              <select
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option value="">-- ยังไม่ระบุช่าง --</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.fullName}>
                    {u.fullName} {u.position ? `(${u.position})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                วิธีการรับสินค้าเข้า:
              </label>
              <input
                type="text"
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
                placeholder="เช่น ช่างนำเข้า, ลูกค้าส่งมา, ขนส่งเอกชน"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConvert}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#bf1a01] text-white font-bold text-xs shadow-md shadow-red-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังเปิดใบรับซ่อม...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                ยืนยันเปิดใบรับซ่อม
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
