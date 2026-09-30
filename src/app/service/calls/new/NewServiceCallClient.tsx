"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  Building2,
  User,
  Phone,
  Cpu,
  AlertCircle,
  RotateCcw,
  UserCheck,
  ChevronRight,
  Plus,
  PhoneCall,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Swal from "sweetalert2";
import { createServiceCallLog } from "@/app/actions/service-calls";

interface UserOption {
  id: string;
  fullName: string;
  role: string;
}

interface NewServiceCallClientProps {
  users?: UserOption[];
  currentUser?: any;
}

const COMMON_INVERTER_MODELS = [
  "VT-100",
  "VT-200",
  "VT-300",
  "VT-400",
  "VT-500",
  "VT-750",
  "VT-1000",
  "VT-1500",
];

const COMMON_ISSUES = [
  "มอเตอร์ไม่หมุน",
  "ไฟเตือน Overload (OL)",
  "หน้าจอดับ / เปิดไม่ติด",
  "น้ำในบ่อน้อย / ปั๊มตัดการทำงาน",
  "แรงดันน้ำไม่สม่ำเสมอ",
  "มีเสียงผิดปกติขณะทำงาน",
  "ไฟเตือน Under Voltage",
];

export default function NewServiceCallClient({
  users = [],
  currentUser,
}: NewServiceCallClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const initialFormState = {
    receivedDate: new Date().toISOString().split("T")[0],
    companyName: "",
    contactName: "",
    contactPhone: "",
    inverterModel: "",
    reportedIssue: "",
    responsibleId: "",
    notes: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  // Field progress counter
  const requiredFields = [
    Boolean(formData.companyName.trim()),
    Boolean(formData.contactName.trim()),
    Boolean(formData.inverterModel.trim()),
    Boolean(formData.reportedIssue.trim()),
    Boolean(formData.receivedDate),
  ];
  const completedCount = requiredFields.filter(Boolean).length;
  const totalRequired = requiredFields.length;
  const isFormValid = completedCount === totalRequired;

  // Handle Input Changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Quick preset select for Inverter model
  const handleModelSelect = (model: string) => {
    setFormData((prev) => ({ ...prev, inverterModel: model }));
  };

  // Quick append for issue
  const handleIssueSelect = (issue: string) => {
    setFormData((prev) => {
      const current = prev.reportedIssue.trim();
      const newIssue = current ? `${current}, ${issue}` : issue;
      return { ...prev, reportedIssue: newIssue };
    });
  };

  // Reset form
  const handleReset = () => {
    setFormData(initialFormState);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบถ้วน",
        text: "กรุณากรอกข้อมูลในช่องที่มีเครื่องหมายดอกจัน (*) ให้ครบทุกช่อง",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        receivedDate: formData.receivedDate,
        companyName: formData.companyName.trim(),
        contactName: formData.contactName.trim(),
        contactPhone: formData.contactPhone.trim() || null,
        inverterModel: formData.inverterModel.trim(),
        reportedIssue: formData.reportedIssue.trim(),
        responsibleId: formData.responsibleId || null,
        notes: formData.notes.trim() || null,
      };

      await createServiceCallLog(payload);

      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        text: "เปิดเคสบันทึกแจ้งปัญหาลูกค้าเรียบร้อยแล้ว",
        timer: 1600,
        showConfirmButton: false,
      });

      router.push("/service/calls");
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.message || "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* ── Top Header Card (Matching User Reference Image) ── */}
        <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-7 shadow-sm transition-all relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Red Squircle Badge + Title + Subtitle */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] flex items-center justify-center text-white shadow-lg shadow-red-500/25 shrink-0">
                <PhoneCall className="w-7 h-7" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff2301]" />
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    บันทึกแจ้งปัญหาลูกค้า
                  </h1>
                  <span className="px-3 py-0.5 bg-red-50 text-[#ff2301] border border-red-200/80 rounded-full text-xs font-bold tracking-wide">
                    เปิดเคสใหม่
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 mt-1">
                  <span className="font-bold uppercase tracking-wider text-gray-500">
                    SERVICE CALL LOG & TROUBLESHOOTING
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-500">
                    ระบบบันทึกและติดตามการแก้ปัญหา INVERTER
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions (Back, Reset, and Primary CTA) */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/service/calls"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 text-gray-500" />
                <span>กลับหน้ารายการ</span>
              </Link>

              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors shadow-sm disabled:opacity-40"
                title="ล้างข้อมูลฟอร์ม"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !isFormValid}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>เปิดเคสใหม่</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Symmetrical Mini Progress Strip */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-[#ff2301]" />
              <span>เลขเคสจะถูกสร้างอัตโนมัติในรูปแบบ <strong className="font-mono text-gray-800">SV-YYYYMMDD-NNN</strong> เมื่อบันทึกสำเร็จ</span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-medium text-gray-500">ความสมบูรณ์ของข้อมูล:</span>
              <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                <div
                  className="h-full bg-gradient-to-r from-[#ff2301] to-red-500 transition-all duration-300"
                  style={{ width: `${(completedCount / totalRequired) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold font-mono text-gray-800">
                {completedCount}/{totalRequired}
              </span>
            </div>
          </div>
        </div>

        {/* ── Form Section / Symmetrical 2-Column Balance ── */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* ════════════════════════════════════════════════
                COLUMN 1 (LEFT): ข้อมูลลูกค้า และ อุปกรณ์
                ════════════════════════════════════════════════ */}
            <div className="space-y-8">
              {/* Card 1: ข้อมูลลูกค้าและสถานที่ติดต่อ */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        ข้อมูลลูกค้าและผู้ติดต่อ
                      </h2>
                      <p className="text-xs text-gray-400">CUSTOMER & CONTACT DETAILS</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200">
                    จำเป็น *
                  </span>
                </div>

                <div className="space-y-4">
                  {/* วันที่รับแจ้ง */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      วันที่รับแจ้ง <span className="text-[#ff2301]">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        name="receivedDate"
                        required
                        value={formData.receivedDate}
                        onChange={handleChange}
                        className="w-full text-sm border border-gray-300 rounded-xl p-3 pl-10 bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                      />
                    </div>
                  </div>

                  {/* ชื่อบริษัท / ลูกค้า */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      ชื่อบริษัท / ลูกค้า <span className="text-[#ff2301]">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="companyName"
                        required
                        placeholder="เช่น บจก. เกษตรก้าวหน้า หรือ คุณสมศักดิ์"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full text-sm border border-gray-300 rounded-xl p-3 pl-10 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                      />
                    </div>
                  </div>

                  {/* ชื่อผู้ติดต่อ & เบอร์โทร */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                        ชื่อผู้ติดต่อ <span className="text-[#ff2301]">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          name="contactName"
                          required
                          placeholder="ชื่อ-นามสกุล ผู้แจ้ง"
                          value={formData.contactName}
                          onChange={handleChange}
                          className="w-full text-sm border border-gray-300 rounded-xl p-3 pl-10 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                        เบอร์โทรศัพท์ / LINE ID
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          name="contactPhone"
                          placeholder="เช่น 081-234-5678"
                          value={formData.contactPhone}
                          onChange={handleChange}
                          className="w-full text-sm border border-gray-300 rounded-xl p-3 pl-10 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: ข้อมูลรุ่นอุปกรณ์ Inverter */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        ข้อมูลอุปกรณ์และโมเดล
                      </h2>
                      <p className="text-xs text-gray-400">INVERTER HARDWARE & MODEL</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200">
                    จำเป็น *
                  </span>
                </div>

                <div className="space-y-4">
                  {/* โมเดล Inverter */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      โมเดล / รุ่น Inverter <span className="text-[#ff2301]">*</span>
                    </label>
                    <div className="relative">
                      <Cpu className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="inverterModel"
                        required
                        placeholder="เช่น VT-400 หรือเลือกรุ่นด้านล่าง"
                        value={formData.inverterModel}
                        onChange={handleChange}
                        className="w-full text-sm font-mono border border-gray-300 rounded-xl p-3 pl-10 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                      />
                    </div>
                  </div>

                  {/* Quick Select Preset Chips */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-2">
                      เลือกรุ่นยอดนิยมด่วน:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_INVERTER_MODELS.map((model) => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => handleModelSelect(model)}
                          className={`text-xs font-mono font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
                            formData.inverterModel === model
                              ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-[#ff2301]"
                          }`}
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════
                COLUMN 2 (RIGHT): รายละเอียดปัญหา และ บุคลากร
                ════════════════════════════════════════════════ */}
            <div className="space-y-8">
              {/* Card 3: รายละเอียดอาการที่พบ */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        อาการและปัญหาที่พบ
                      </h2>
                      <p className="text-xs text-gray-400">REPORTED SYMPTOMS & DIAGNOSIS</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200">
                    จำเป็น *
                  </span>
                </div>

                <div className="space-y-4">
                  {/* ปัญหาที่พบ (อาการ) */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      ปัญหาที่พบ (อาการที่ลูกค้าแจ้ง) <span className="text-[#ff2301]">*</span>
                    </label>
                    <textarea
                      name="reportedIssue"
                      required
                      rows={4}
                      placeholder="อธิบายอาการอย่างละเอียด เช่น หน้าจอดับ ไฟสถานะไม่ขึ้น มีเสียงเตือน หรือมอเตอร์ไม่หมุน..."
                      value={formData.reportedIssue}
                      onChange={handleChange}
                      className="w-full text-sm border border-gray-300 rounded-xl p-3 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all resize-y"
                    />
                  </div>

                  {/* Common Issue Shortcuts */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-2">
                      กดเพื่อเพิ่มข้อความอาการทั่วไป:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_ISSUES.map((issue) => (
                        <button
                          key={issue}
                          type="button"
                          onClick={() => handleIssueSelect(issue)}
                          className="text-xs font-medium px-2.5 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-[#ff2301] transition-all flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-[#ff2301]" />
                          <span>{issue}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: การมอบหมายงานและหมายเหตุ */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        การมอบหมายงานและหมายเหตุ
                      </h2>
                      <p className="text-xs text-gray-400">TECHNICIAN ASSIGNMENT & NOTES</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg border border-gray-200">
                    ข้อมูลเพิ่มเติม
                  </span>
                </div>

                <div className="space-y-4">
                  {/* ช่างผู้รับผิดชอบ */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      ช่างผู้รับผิดชอบงานตรวจเช็ค (สามารถระบุภายหลังได้)
                    </label>
                    <select
                      name="responsibleId"
                      value={formData.responsibleId}
                      onChange={handleChange}
                      className="w-full text-sm font-medium border border-gray-300 rounded-xl p-3 bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                    >
                      <option value="">-- ยังไม่ระบุช่างผู้รับผิดชอบ --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* หมายเหตุเพิ่มเติม */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      หมายเหตุเพิ่มเติม (สำหรับสื่อสารภายในทีมบริการ)
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="ระบุเงื่อนไขพิเศษ เช่น นัดเข้าตรวจช่วงบ่าย, เตรียมอะไหล่รุ่นพิเศษ..."
                      value={formData.notes}
                      onChange={handleChange}
                      className="w-full text-sm border border-gray-300 rounded-xl p-3 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all resize-y"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Fixed Symmetrical Bottom Action Bar ── */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Left Side: Back / Cancel + Validation Indicator */}
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <Link
                    href="/service/calls"
                    className="inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-[#ff2301] transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>ยกเลิกและกลับหน้ารายการ</span>
                  </Link>

                  <span className="text-gray-300">|</span>

                  {isFormValid ? (
                    <span className="inline-flex items-center gap-1.5 text-gray-900 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-[#ff2301]" />
                      ข้อมูลจำเป็นครบถ้วน พร้อมบันทึก
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-gray-500 font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#ff2301]" />
                      กรอกข้อมูลจำเป็นแล้ว {completedCount}/{totalRequired} ช่อง
                    </span>
                  )}
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-xl transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    ล้างฟอร์ม
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !isFormValid}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-red-500/25 transition-all transform active:scale-95"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังบันทึกข้อมูล...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>เปิดเคสใหม่</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
