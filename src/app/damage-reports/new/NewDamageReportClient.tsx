"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert, ArrowLeft, Upload, Trash2, Camera, HelpCircle,
  Building2, MapPin, Calendar, User, CheckCircle2, AlertTriangle,
  FileText, Package, Clock, Loader2, Save
} from "lucide-react";
import Swal from "sweetalert2";
import { createDamageReport } from "@/app/actions/damageReports";
import { getBangkokDatetimeString } from "@/app/lib/thaiDate";

type Props = {
  currentUser: any;
};

// Helper: Resolve reporter department from user profile or employeeSale
function resolveUserDepartment(user: any): string {
  if (!user) return "";
  // 1. Department from EmployeeSale
  if (user.employeeSale?.department && typeof user.employeeSale.department === "string" && user.employeeSale.department.trim()) {
    return user.employeeSale.department.trim();
  }
  // 2. Position from EmployeeSale
  if (user.employeeSale?.position && typeof user.employeeSale.position === "string" && user.employeeSale.position.trim()) {
    return user.employeeSale.position.trim();
  }
  // 3. Position from User model
  if (user.position && typeof user.position === "string" && user.position.trim()) {
    return user.position.trim();
  }
  return "";
}

export default function NewDamageReportClient({ currentUser }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // 1. Company & Item
    company: "TG",
    otherOwner: "",
    itemType: "PRODUCT", // PRODUCT, ASSET, OTHER
    itemName: "",
    itemCode: "",
    itemModel: "",
    serialOrLot: "",
    quantity: 1,
    unit: "ชิ้น",
    estimatedCost: "",

    // 2. Place & Time
    incidentDate: getBangkokDatetimeString(),
    discoveredDate: getBangkokDatetimeString(),
    branch: currentUser?.employeeSale?.branch || "สำนักงานใหญ่",
    warehouse: "โกดัง 62",
    siteLocation: "",
    currentLocation: "โกดัง 62 (จุดกักกันสินค้าชำรุด)",

    // 3. Damage Type
    damageType: "แตก",
    damagePosition: "",
    damagedQuantity: 1,

    // 4. Persons
    reporterName: currentUser?.fullName || "",
    reporterDepartment: resolveUserDepartment(currentUser),
    operatorName: "",
    operatorType: "EMPLOYEE", // EMPLOYEE, CONTRACTOR, CUSTOMER, UNKNOWN
    contractorName: "",
    discovererName: currentUser?.fullName || "",
    witnesses: "",
    assignerName: "",
    supervisorName: currentUser?.employeeSale?.teamLeader || "",

    // 5. Initial Custody
    initialStorage: "จุดกักกันชั่วคราว",
    custodian: currentUser?.fullName || "",
    isQuarantined: true,
    reportedToSupervisorAt: getBangkokDatetimeString(),

    // 6. 3 Incident Questions
    beforeIncident: "",
    duringIncident: "",
    afterIncident: "",
    suspectedCause: "",

    // 7. Photos & Docs
    photosFull: [] as string[],
    photosDamage: [] as string[],
    photosSerial: [] as string[],
    photosScene: [] as string[],
    photosToolPackaging: [] as string[],
    attachedDocs: [] as string[],
  });

  // Upload loading flags
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const handleUploadPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    category: "photosFull" | "photosDamage" | "photosSerial" | "photosScene" | "photosToolPackaging" | "attachedDocs"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingCategory(category);
    setUploadProgress({ current: 0, total: files.length });
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        const file = files[i];
        const data = new FormData();
        data.append("file", file);
        data.append("bucket", "uploadsService");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: data,
        });
        const json = await res.json();
        if (json.success && json.url) {
          uploadedUrls.push(json.url);
        } else {
          console.warn("Upload failed for file:", file.name, json.error);
        }
      }

      if (uploadedUrls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          [category]: [...(prev[category] || []), ...uploadedUrls],
        }));
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      Swal.fire({
        icon: "error",
        title: "อัปโหลดไฟล์ล้มเหลว",
        text: err.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์",
      });
    } finally {
      setUploadingCategory(null);
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = (
    category: "photosFull" | "photosDamage" | "photosSerial" | "photosScene" | "photosToolPackaging" | "attachedDocs",
    index: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [category]: (prev[category] || []).filter((_, idx) => idx !== index),
    }));
  };

  // Helper quick buttons
  const setQuickUnknown = (field: string) => {
    setFormData((prev) => ({ ...prev, [field]: "ไม่ทราบ / รอตรวจสอบ" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.itemName.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุชื่อสินค้าหรือทรัพย์สิน",
        text: "จำเป็นต้องระบุชื่อสินค้า/ทรัพย์สินที่ชำรุดเสียหาย",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    if (!formData.damageType.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุลักษณะความเสียหาย",
        text: "โปรดเลือกลักษณะความเสียหาย เช่น แตก ร้าว บุบ เปียก",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    const totalPhotos =
      formData.photosFull.length +
      formData.photosDamage.length +
      formData.photosSerial.length +
      formData.photosScene.length +
      formData.photosToolPackaging.length;

    if (totalPhotos === 0) {
      const proceed = await Swal.fire({
        icon: "question",
        title: "ยังไม่ได้แนบรูปภาพ?",
        text: "การแนบรูปภาพจุดเสียหายหรือภาพเต็มชิ้นจะช่วยให้การตรวจสอบและอนุมัติรวดเร็วยิ่งขึ้น ยืนยันจะบันทึกโดยไม่มีรูปหรือไม่?",
        showCancelButton: true,
        confirmButtonColor: "#ff2301",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "บันทึกต่อ",
        cancelButtonText: "แนบรูปก่อน",
      });
      if (!proceed.isConfirmed) return;
    }

    setIsSubmitting(true);
    try {
      const res = await createDamageReport(formData);
      if (res.success && res.id) {
        await Swal.fire({
          icon: "success",
          title: "แจ้งความเสียหายสำเร็จ!",
          html: `
            <div class="text-sm space-y-1">
              <p>ระบบได้สร้างเลขที่เคสอัตโนมัติแล้ว</p>
              <p class="text-xl font-mono font-bold text-red-600 mt-2">${res.caseNumber}</p>
              <p class="text-gray-500 text-xs mt-2">ได้ส่งแจ้งเตือนไปยังหัวหน้างานเพื่อเข้าตรวจสอบแล้ว</p>
            </div>
          `,
          confirmButtonColor: "#ff2301",
          confirmButtonText: "ไปที่รายละเอียดเคส",
        });
        router.push(`/damage-reports/${res.id}`);
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: res.error || "ไม่สามารถบันทึกข้อมูลได้",
          confirmButtonColor: "#ff2301",
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 bg-white text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900 placeholder:text-gray-400";
  const labelClass = "block text-xs font-bold text-gray-700 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-red-500/15 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <Link
              href="/damage-reports"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-100 hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับหน้ารายการสินค้าชำรุด</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <ShieldAlert className="w-7 h-7 text-white" />
              <span>แจ้งสินค้าและทรัพย์สินชำรุดเสียหาย</span>
            </h1>
            <p className="text-red-100 text-xs sm:text-sm mt-1 max-w-xl font-light">
              บันทึกข้อมูลสินค้าที่พบความเสียหาย ถ่ายรูปแนบ และระบุเหตุการณ์ตามจริง
              (หากข้อมูลใดไม่แน่ชัด ให้เลือกตัวเลือก &quot;ไม่ทราบ / รอตรวจสอบ&quot;)
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-right shrink-0">
            <div className="text-[11px] text-red-100">ผู้แจ้งเหตุการณ์</div>
            <div className="text-sm font-bold text-white">{currentUser?.fullName || "พนักงาน"}</div>
          </div>
        </div>
      </div>

      {/* ── Section 1: บริษัทและข้อมูลสินค้า / ทรัพย์สิน ── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b pb-3">
          <div className="p-2 rounded-xl bg-red-50 text-red-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">1. ข้อมูลบริษัทและสินค้า / ทรัพย์สิน</h2>
            <p className="text-xs text-gray-400">ระบุบริษัทในเครือและรายละเอียดอุปกรณ์ที่ชำรุด</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>บริษัทผู้ถือกรรมสิทธิ์ / เจ้าของสินค้า *</label>
            <div className="grid grid-cols-3 gap-2">
              {["TG", "TE", "TP"].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, company: code }))}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    formData.company === code
                      ? "bg-red-600 text-white border-red-600 shadow-sm"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>ประเภทรายการ *</label>
            <select
              value={formData.itemType}
              onChange={(e) => setFormData((prev) => ({ ...prev, itemType: e.target.value }))}
              className={inputClass}
            >
              <option value="PRODUCT">สินค้าเพื่อขาย / สต็อก / ติดตั้ง (Product)</option>
              <option value="ASSET">ทรัพย์สิน / เครื่องมือบริษัท (Asset)</option>
              <option value="OTHER">สินค้าฝาก / ของลูกค้า / อื่นๆ</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>ชื่อสินค้า / ทรัพย์สิน *</label>
            <input
              type="text"
              required
              value={formData.itemName}
              onChange={(e) => setFormData((prev) => ({ ...prev, itemName: e.target.value }))}
              placeholder="เช่น แผงโซลาร์เซลล์ 550W, กระจกตู้, Inverter"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>รหัสสินค้า (Item Code)</label>
            <input
              type="text"
              value={formData.itemCode}
              onChange={(e) => setFormData((prev) => ({ ...prev, itemCode: e.target.value }))}
              placeholder="เช่น PV-550M"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>รุ่นสินค้า (Model)</label>
            <input
              type="text"
              value={formData.itemModel}
              onChange={(e) => setFormData((prev) => ({ ...prev, itemModel: e.target.value }))}
              placeholder="เช่น SI23-D3-2R2G-A"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Serial No. / Lot No.</label>
            <input
              type="text"
              value={formData.serialOrLot}
              onChange={(e) => setFormData((prev) => ({ ...prev, serialOrLot: e.target.value }))}
              placeholder="ระบุ S/N จากป้าย Nameplate"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>จำนวนทั้งหมด</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>หน่วย</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                placeholder="ชิ้น/แผง"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className={labelClass}>มูลค่า / ต้นทุนประเมินเบื้องต้น (บาท - ถ้าทราบ)</label>
            <input
              type="number"
              step="0.01"
              value={formData.estimatedCost}
              onChange={(e) => setFormData((prev) => ({ ...prev, estimatedCost: e.target.value }))}
              placeholder="เช่น 3500 (เว้นว่างได้ บัญชีจะตรวจสอบต้นทุนจริง)"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>เจ้าของอื่น / กรณีไม่ใช่ของ TG/TE/TP</label>
            <input
              type="text"
              value={formData.otherOwner}
              onChange={(e) => setFormData((prev) => ({ ...prev, otherOwner: e.target.value }))}
              placeholder="ระบุชื่อเจ้าของทรัพย์สินถ้ามี"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: สถานที่และเวลาที่เกิดเหตุ ── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b pb-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">2. สถานที่และเวลาที่เกิดเหตุ / ตรวจพบ</h2>
            <p className="text-xs text-gray-400">ระบุวันเวลาและสถานที่เกิดเหตุเพื่อสอบย้อนความรับผิดชอบ</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>วันที่และเวลาที่เกิดเหตุ</label>
            <input
              type="datetime-local"
              value={formData.incidentDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, incidentDate: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>วันที่และเวลาที่ตรวจพบ *</label>
            <input
              type="datetime-local"
              required
              value={formData.discoveredDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, discoveredDate: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>สาขาที่เกิดเหตุ</label>
            <input
              type="text"
              value={formData.branch}
              onChange={(e) => setFormData((prev) => ({ ...prev, branch: e.target.value }))}
              placeholder="เช่น สำนักงานใหญ่, เชียงใหม่, ขอนแก่น"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>โกดัง / คลังสินค้า</label>
            <input
              type="text"
              value={formData.warehouse}
              onChange={(e) => setFormData((prev) => ({ ...prev, warehouse: e.target.value }))}
              placeholder="เช่น โกดัง 62, สโตร์ใหญ่"
              className={inputClass}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700">หน้างาน / จุดเกิดเหตุ</label>
              <button
                type="button"
                onClick={() => setQuickUnknown("siteLocation")}
                className="text-[10px] text-blue-600 font-semibold hover:underline"
              >
                ไม่ทราบ/รอตรวจ
              </button>
            </div>
            <input
              type="text"
              value={formData.siteLocation}
              onChange={(e) => setFormData((prev) => ({ ...prev, siteLocation: e.target.value }))}
              placeholder="เช่น ไซต์งานโซลาร์ชลบุรี, ทางเดินขนย้าย"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>สถานที่เก็บสินค้าปัจจุบัน (อยู่ที่ไหน ณ ขณะนี้) *</label>
          <input
            type="text"
            required
            value={formData.currentLocation}
            onChange={(e) => setFormData((prev) => ({ ...prev, currentLocation: e.target.value }))}
            placeholder="เช่น โกดัง 62 (โซนสินค้าชำรุด), หน้างานไซต์ A"
            className={inputClass}
          />
        </div>
      </div>

      {/* ── Section 3: ลักษณะความเสียหาย ── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b pb-3">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">3. ลักษณะความเสียหายและจำนวนที่เสีย</h2>
            <p className="text-xs text-gray-400">ระบุสภาพความเสียหายที่ตรวจพบ</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {["แตก", "ร้าว", "บุบ", "เปียก/น้ำเข้า", "ไหม้/ช็อต", "ชำรุดใช้งานไม่ได้", "สูญหาย", "อื่นๆ"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, damageType: type }))}
              className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all text-center ${
                formData.damageType === type
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className={labelClass}>ตำแหน่งที่ชำรุดเสียหาย</label>
            <input
              type="text"
              value={formData.damagePosition}
              onChange={(e) => setFormData((prev) => ({ ...prev, damagePosition: e.target.value }))}
              placeholder="เช่น มุมกระจกด้านขวา, เทอร์มินอล, ฝาครอบหลัง"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>จำนวนที่เสียหายจริง (ชิ้น/ชุด)</label>
            <input
              type="number"
              min="1"
              value={formData.damagedQuantity}
              onChange={(e) => setFormData((prev) => ({ ...prev, damagedQuantity: Number(e.target.value) }))}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ── Section 4: บุคคลที่เกี่ยวข้อง ── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b pb-3">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">4. บุคคลที่เกี่ยวข้องในเหตุการณ์</h2>
            <p className="text-xs text-gray-400">ระบุผู้ปฏิบัติงาน ผู้พบเห็น และหัวหน้างาน</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>ผู้แจ้งเหตุการณ์</label>
            <input
              type="text"
              value={formData.reporterName}
              onChange={(e) => setFormData((prev) => ({ ...prev, reporterName: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>แผนก/สังกัดผู้แจ้ง</label>
            <input
              type="text"
              value={formData.reporterDepartment}
              onChange={(e) => setFormData((prev) => ({ ...prev, reporterDepartment: e.target.value }))}
              placeholder="ระบุแผนก/สังกัด"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>ผู้พบเห็นคนแรก (ผู้พบ)</label>
            <input
              type="text"
              value={formData.discovererName}
              onChange={(e) => setFormData((prev) => ({ ...prev, discovererName: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>ประเภทผู้ปฏิบัติงาน (ผู้ดำเนินการ)</label>
            <select
              value={formData.operatorType}
              onChange={(e) => setFormData((prev) => ({ ...prev, operatorType: e.target.value }))}
              className={inputClass}
            >
              <option value="EMPLOYEE">พนักงานบริษัท (Employee)</option>
              <option value="CONTRACTOR">ผู้รับเหมาภายนอก (Sub-contractor)</option>
              <option value="CUSTOMER">ลูกค้า / ขนส่งภายนอก</option>
              <option value="UNKNOWN">ไม่ทราบ / รอตรวจสอบ</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>ชื่อผู้ปฏิบัติงาน (ช่าง/คนขนย้าย)</label>
            <input
              type="text"
              value={formData.operatorName}
              onChange={(e) => setFormData((prev) => ({ ...prev, operatorName: e.target.value }))}
              placeholder="ระบุชื่อพนักงานหรือผู้ปฏิบัติงาน"
              className={inputClass}
            />
          </div>
          {formData.operatorType === "CONTRACTOR" && (
            <div>
              <label className={labelClass}>ชื่อบริษัท/ทีมผู้รับเหมา *</label>
              <input
                type="text"
                value={formData.contractorName}
                onChange={(e) => setFormData((prev) => ({ ...prev, contractorName: e.target.value }))}
                placeholder="เช่น หจก. เอสเอ็น ซับคอนแทรค"
                className={inputClass}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>ผู้สั่งงาน / ผู้มอบหมายงาน</label>
            <input
              type="text"
              value={formData.assignerName}
              onChange={(e) => setFormData((prev) => ({ ...prev, assignerName: e.target.value }))}
              placeholder="เช่น หัวหน้าทีมติดตั้ง"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>หัวหน้างานโดยตรง / ผู้ควบคุม *</label>
            <input
              type="text"
              required
              value={formData.supervisorName}
              onChange={(e) => setFormData((prev) => ({ ...prev, supervisorName: e.target.value }))}
              placeholder="ระบุชื่อหัวหน้างานที่จะเข้าสืบสวน"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>พยาน / ผู้เห็นเหตุการณ์</label>
            <input
              type="text"
              value={formData.witnesses}
              onChange={(e) => setFormData((prev) => ({ ...prev, witnesses: e.target.value }))}
              placeholder="ระบุชื่อพยาน (ถ้ามี)"
              className={inputClass}
            />
          </div>
        </div>

        {/* Initial Custody & Quarantine */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>ผู้ดูแลรักษาสินค้าปัจจุบัน</label>
            <input
              type="text"
              value={formData.custodian}
              onChange={(e) => setFormData((prev) => ({ ...prev, custodian: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>วันเวลาที่แจ้งหัวหน้างาน</label>
            <input
              type="datetime-local"
              value={formData.reportedToSupervisorAt}
              onChange={(e) => setFormData((prev) => ({ ...prev, reportedToSupervisorAt: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col justify-center">
            <label className="text-xs font-bold text-gray-700 mb-1">การแยกกักสินค้าชำรุด (Quarantine)</label>
            <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={formData.isQuarantined}
                onChange={(e) => setFormData((prev) => ({ ...prev, isQuarantined: e.target.checked }))}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
              />
              <span className="text-xs font-semibold text-gray-800">
                แยกกักสินค้าชำรุดแล้ว (ไม่ปะปนกับสินค้าปกติ)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Section 5: เล่าเหตุการณ์ 3 คำถามสำคัญ ── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b pb-3">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">5. การบอกเล่าเหตุการณ์ (แยกเป็น 3 คำถามหลัก)</h2>
            <p className="text-xs text-gray-400">แยกข้อเท็จจริงออกจากเรื่องที่ยังสงสัย เพื่อความโปร่งใสในการตรวจสอบ</p>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block font-bold text-gray-800 mb-1">
              คำถามที่ 1: ก่อนเกิดเหตุทำอะไรอยู่ และใครเป็นผู้มอบหมายงาน? *
            </label>
            <textarea
              required
              rows={2}
              value={formData.beforeIncident}
              onChange={(e) => setFormData((prev) => ({ ...prev, beforeIncident: e.target.value }))}
              placeholder="เช่น กำลังเตรียมขนย้ายแผงขึ้นรถกระบะ ได้รับมอบหมายจากคุณ... ให้ไปส่งที่ไซต์..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              คำถามที่ 2: ขณะเกิดเหตุเกิดอะไรขึ้น ใครอยู่ในเหตุการณ์บ้าง และใช้อุปกรณ์/เครื่องมืออะไร? *
            </label>
            <textarea
              required
              rows={3}
              value={formData.duringIncident}
              onChange={(e) => setFormData((prev) => ({ ...prev, duringIncident: e.target.value }))}
              placeholder="เช่น ขณะยกพาเลทลงจากท้ายรถ เชือกมัดคลายตัวทำให้กล่องแผงลื่นหลุดกระแทกพื้นขอบพาเลท มีช่าง ก. และช่าง ข. ช่วยกันจับ..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              คำถามที่ 3: หลังเกิดเหตุใครเป็นผู้พบ แจ้งใครทราบทันที และขณะนี้สินค้านำไปเก็บไว้ที่ใด? *
            </label>
            <textarea
              required
              rows={2}
              value={formData.afterIncident}
              onChange={(e) => setFormData((prev) => ({ ...prev, afterIncident: e.target.value }))}
              placeholder="เช่น หลังเกิดเหตุช่าง ก. ถ่ายรูปและโทรแจ้งหัวหน้าทันที พร้อมนำสินค้าเข้าไปกักไว้ที่โกดัง 62 โซนรอตรวจ..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block font-bold text-gray-600 mb-1">
              ข้อสังเกตเพิ่มเติม / เรื่องที่ยังสงสัย (ถ้ามี)
            </label>
            <textarea
              rows={2}
              value={formData.suspectedCause}
              onChange={(e) => setFormData((prev) => ({ ...prev, suspectedCause: e.target.value }))}
              placeholder="เช่น สงสัยว่าตัวพาเลทอาจมีความชื้นหรือกล่องเปียกน้ำมาก่อนหน้า..."
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ── Section 6: เอกสารและรูปถ่าย 5 หมวด ── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <span>6. แนบรูปถ่ายหลักฐานและเอกสาร (5 หมวด)</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ใส่กี่รูปก็ได้ ไม่จำกัด
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                เลือกแนบรูปภาพได้หลายรูปพร้อมกันในทุกหมวด เพื่อใช้เป็นหลักฐานร่วมของคลัง บัญชี และ HR
              </p>
            </div>
          </div>
          <span className="text-[11px] font-medium text-gray-400 self-start sm:self-auto bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
            รองรับ JPG, PNG, WEBP และเอกสาร PDF
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. ภาพเต็มชิ้น */}
          <PhotoUploadSlot
            title="1. ภาพเต็มชิ้นสินค้า / ทรัพย์สิน (Full View)"
            category="photosFull"
            photos={formData.photosFull}
            isUploading={uploadingCategory === "photosFull"}
            uploadProgress={uploadingCategory === "photosFull" ? uploadProgress : null}
            onUpload={(e) => handleUploadPhoto(e, "photosFull")}
            onRemove={(idx) => handleRemovePhoto("photosFull", idx)}
          />

          {/* 2. ภาพจุดชำรุดเสียหาย */}
          <PhotoUploadSlot
            title="2. ภาพจุดที่ชำรุดเสียหายชัดเจน (Defect Close-up)"
            category="photosDamage"
            photos={formData.photosDamage}
            isUploading={uploadingCategory === "photosDamage"}
            uploadProgress={uploadingCategory === "photosDamage" ? uploadProgress : null}
            onUpload={(e) => handleUploadPhoto(e, "photosDamage")}
            onRemove={(idx) => handleRemovePhoto("photosDamage", idx)}
          />

          {/* 3. ภาพ Serial No. / Nameplate */}
          <PhotoUploadSlot
            title="3. ภาพป้าย Serial No. / Nameplate / Lot"
            category="photosSerial"
            photos={formData.photosSerial}
            isUploading={uploadingCategory === "photosSerial"}
            uploadProgress={uploadingCategory === "photosSerial" ? uploadProgress : null}
            onUpload={(e) => handleUploadPhoto(e, "photosSerial")}
            onRemove={(idx) => handleRemovePhoto("photosSerial", idx)}
          />

          {/* 4. ภาพสถานที่และจุดเกิดเหตุ */}
          <PhotoUploadSlot
            title="4. ภาพสถานที่ / จุดเกิดเหตุ (Scene View)"
            category="photosScene"
            photos={formData.photosScene}
            isUploading={uploadingCategory === "photosScene"}
            uploadProgress={uploadingCategory === "photosScene" ? uploadProgress : null}
            onUpload={(e) => handleUploadPhoto(e, "photosScene")}
            onRemove={(idx) => handleRemovePhoto("photosScene", idx)}
          />

          {/* 5. เครื่องมือ / บรรจุภัณฑ์ */}
          <PhotoUploadSlot
            title="5. ภาพเครื่องมือที่ใช้ / กล่อง / บรรจุภัณฑ์"
            category="photosToolPackaging"
            photos={formData.photosToolPackaging}
            isUploading={uploadingCategory === "photosToolPackaging"}
            uploadProgress={uploadingCategory === "photosToolPackaging" ? uploadProgress : null}
            onUpload={(e) => handleUploadPhoto(e, "photosToolPackaging")}
            onRemove={(idx) => handleRemovePhoto("photosToolPackaging", idx)}
          />

          {/* 6. เอกสารที่เกี่ยวข้อง */}
          <PhotoUploadSlot
            title="6. เอกสารที่เกี่ยวข้อง (ใบส่งของ / PO / บิล)"
            category="attachedDocs"
            photos={formData.attachedDocs}
            isUploading={uploadingCategory === "attachedDocs"}
            uploadProgress={uploadingCategory === "attachedDocs" ? uploadProgress : null}
            onUpload={(e) => handleUploadPhoto(e, "attachedDocs")}
            onRemove={(idx) => handleRemovePhoto("attachedDocs", idx)}
          />
        </div>
      </div>

      {/* Bottom Sticky Action Buttons */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-xl flex items-center justify-between gap-4">
        <Link
          href="/damage-reports"
          className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all"
        >
          ยกเลิก
        </Link>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[#ff2301] hover:bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>กำลังบันทึกและสร้างเลขเคส...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>บันทึกและแจ้งสินค้าชำรุด</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// Subcomponent for photo upload slots
function PhotoUploadSlot({
  title,
  category,
  photos,
  isUploading,
  uploadProgress,
  onUpload,
  onRemove,
}: {
  title: string;
  category: string;
  photos: string[];
  isUploading: boolean;
  uploadProgress: { current: number; total: number } | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (idx: number) => void;
}) {
  const isPdf = (url: string) => url.toLowerCase().endsWith(".pdf") || url.includes(".pdf?");

  return (
    <div className="p-3.5 rounded-2xl border border-gray-200/90 bg-gray-50/60 space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <span>{title}</span>
        </label>
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
            photos.length > 0
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-white text-gray-500 border-gray-200"
          }`}
        >
          {photos.length} รูป (ไม่จำกัด)
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((url, idx) => {
          const pdf = isPdf(url);
          return (
            <div
              key={`${category}-${idx}`}
              className="relative aspect-square rounded-xl border border-gray-300 bg-white overflow-hidden group shadow-xs"
            >
              {pdf ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-full flex flex-col items-center justify-center p-2 text-center hover:bg-red-50/50 transition-colors"
                  title="คลิกเพื่อเปิดดูเอกสาร PDF"
                >
                  <FileText className="w-8 h-8 text-red-600 mb-1" />
                  <span className="text-[10px] font-bold text-gray-700 leading-tight">เอกสาร #{idx + 1}</span>
                  <span className="text-[9px] text-gray-400">PDF</span>
                </a>
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full relative"
                  title="คลิกเพื่อดูรูปภาพขนาดเต็ม"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`รูปภาพ #${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                    ดูภาพใหญ่
                  </div>
                </a>
              )}
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute top-1 right-1 p-1 rounded-md bg-red-600/90 text-white hover:bg-red-700 transition-all opacity-80 group-hover:opacity-100 shadow-sm"
                title="ลบรูปนี้"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-red-500 hover:bg-red-50/20 bg-white flex flex-col items-center justify-center cursor-pointer transition-colors p-2 text-center">
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 text-red-500 animate-spin mb-1" />
              <span className="text-[10px] font-bold text-red-600 leading-tight">
                {uploadProgress
                  ? `${uploadProgress.current}/${uploadProgress.total}`
                  : "กำลังอัปโหลด..."}
              </span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-gray-400 mb-1 group-hover:text-red-500" />
              <span className="text-[10px] font-bold text-gray-700 leading-tight">+ เพิ่มรูป</span>
              <span className="text-[9px] text-gray-400 mt-0.5">เลือกได้หลายรูป</span>
            </>
          )}
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            disabled={isUploading}
            onChange={onUpload}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}

