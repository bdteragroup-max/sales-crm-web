"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Camera,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Warehouse,
  ShieldCheck,
  Zap,
  Play,
  Trash2,
  Loader2,
  Info,
  Layers,
  Cog,
  Droplets,
  Flame,
  Clock,
  Plus,
  User,
  Phone,
  ExternalLink,
} from "lucide-react";
import { createServiceClaim, updateServiceClaim, CreateClaimInput } from "@/app/actions/serviceClaims";
import Swal from "sweetalert2";

interface ClaimFormProps {
  initialData?: any;
  isEdit?: boolean;
  currentUser?: any;
}

export default function ClaimForm({
  initialData,
  isEdit = false,
  currentUser,
}: ClaimFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [department, setDepartment] = useState<"WAREHOUSE" | "QC" | "STORE" | "PRODUCTION" | "OTHER">(
    initialData?.department || "WAREHOUSE"
  );
  const [reporterName, setReporterName] = useState(
    initialData?.reporterName || currentUser?.fullName || ""
  );
  const [reporterPhone, setReporterPhone] = useState(
    initialData?.reporterPhone || currentUser?.phoneNumber || ""
  );

  useEffect(() => {
    if (!initialData && currentUser) {
      if (currentUser.fullName && !reporterName) {
        setReporterName(currentUser.fullName);
      }
      if (currentUser.phoneNumber && !reporterPhone) {
        setReporterPhone(currentUser.phoneNumber);
      }
    }
  }, [currentUser, initialData]);
  const [equipmentType, setEquipmentType] = useState<"INVERTER" | "CONTROL_CABINET" | "MOTOR" | "PUMP" | "OTHER">(
    initialData?.equipmentType || "INVERTER"
  );
  const [brand, setBrand] = useState(initialData?.brand || "INVT");
  const [model, setModel] = useState(initialData?.model || "");
  const [serialNumber, setSerialNumber] = useState(initialData?.serialNumber || "");
  const [urgency, setUrgency] = useState<"NORMAL" | "URGENT" | "CRITICAL">(
    initialData?.urgency || "NORMAL"
  );
  const [symptoms, setSymptoms] = useState(initialData?.symptoms || "");

  // Media state
  const [nameplatePhotoUrl, setNameplatePhotoUrl] = useState(initialData?.nameplatePhotoUrl || "");
  const [defectPhotos, setDefectPhotos] = useState<string[]>(
    Array.isArray(initialData?.defectPhotos) ? initialData.defectPhotos : []
  );
  const [defectVideoUrl, setDefectVideoUrl] = useState(initialData?.defectVideoUrl || "");

  // Uploading state
  const [uploadingNameplate, setUploadingNameplate] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState<string>("");

  const nameplateInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Upload helper using /api/upload
  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "uploadsService");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Upload failed");
      }
      return json.url;
    } catch (err: any) {
      console.error("Upload error:", err);
      Swal.fire({
        icon: "error",
        title: "อัปโหลดไม่สำเร็จ",
        text: err.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์",
      });
      return null;
    }
  };

  // 1. Nameplate Photo Upload
  const handleNameplateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingNameplate(true);
    const url = await uploadFile(file);
    if (url) {
      setNameplatePhotoUrl(url);
    }
    setUploadingNameplate(false);
    if (nameplateInputRef.current) nameplateInputRef.current.value = "";
  };

  // 2. Defect Photos Upload (Multiple)
  const handleDefectPhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const url = await uploadFile(files[i]);
      if (url) newUrls.push(url);
    }

    setDefectPhotos((prev) => [...prev, ...newUrls]);
    setUploadingPhotos(false);
    if (photosInputRef.current) photosInputRef.current.value = "";
  };

  const removeDefectPhoto = (index: number) => {
    setDefectPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // 3. Defect Video Upload
  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "ขนาดไฟล์ใหญ่เกินไป",
        text: "ไฟล์วีดีโอต้องมีขนาดไม่เกิน 50MB กรุณาอัดคลิปสั้น 15-60 วินาที",
      });
      return;
    }

    setUploadingVideo(true);
    setVideoUploadProgress("กำลังอัปโหลดไฟล์วีดีโอ...");
    const url = await uploadFile(file);
    if (url) {
      setDefectVideoUrl(url);
    }
    setUploadingVideo(false);
    setVideoUploadProgress("");
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameplatePhotoUrl) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาแนบรูปเนมเพลทข้างตัวเครื่อง",
        text: "จำเป็นต้องมีรูปถ่ายเนมเพลทข้างตัวเครื่องเพื่อตรวจสอบ S/N และสเปกสินค้าให้ถูกต้อง",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    if (!model.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณากรอก Model (รุ่นสินค้า)",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    if (!symptoms.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุอาการเสีย",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateClaimInput = {
        department,
        reporterName,
        reporterPhone,
        brand,
        model: model.trim(),
        serialNumber: serialNumber.trim(),
        nameplatePhotoUrl,
        symptoms: symptoms.trim(),
        defectPhotos,
        defectVideoUrl,
        equipmentType,
        urgency,
        companyCode: "TG",
      };

      if (isEdit && initialData?.id) {
        const res = await updateServiceClaim(initialData.id, payload);
        if (!res.success) throw new Error(res.error);
        await Swal.fire({
          icon: "success",
          title: "บันทึกการแก้ไขเรียบร้อย",
          timer: 1500,
          showConfirmButton: false,
        });
        router.push(`/service/claims/${initialData.id}`);
      } else {
        const res = await createServiceClaim(payload);
        if (!res.success) throw new Error(res.error);
        await Swal.fire({
          icon: "success",
          title: "ส่งแจ้งเคลมสำเร็จ!",
          text: `ฝ่ายเซอร์วิสได้รับเรื่องแล้ว เลขที่แจ้งเคลม: ${res.data?.claimNumber}`,
          confirmButtonColor: "#059669",
        });
        router.push("/service/claims");
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถส่งข้อมูลแจ้งเคลมได้",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/service/claims"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {isEdit ? "แก้ไขข้อมูลแจ้งเคลม" : "แจ้งเคลมสินค้าใหม่ (New Claim)"}
              </span>
              <span className="text-xs text-slate-400">
                สำหรับคลังสินค้า & QC ส่งเรื่องให้ฝ่ายเซอร์วิส
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              แบบฟอร์มแจ้งเคลมสินค้า / สินค้ามีปัญหา (Service Claim Intake)
            </h1>
          </div>
        </div>

        <Link
          href="/service/claims"
          className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ย้อนกลับ</span>
        </Link>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Department, Specs, S/N & Nameplate (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: แผนกผู้แจ้งเรื่อง */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-3">
              <Warehouse className="w-4 h-4 text-red-600" />
              <span>1. ข้อมูลแผนกผู้แจ้งเรื่อง (Reporter Department)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Warehouse Option */}
              <button
                type="button"
                onClick={() => setDepartment("WAREHOUSE")}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                  department === "WAREHOUSE"
                    ? "bg-red-50/70 border-red-500 ring-2 ring-red-500/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                    department === "WAREHOUSE"
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>คลังสินค้า / สโตร์ (Warehouse)</span>
                    {department === "WAREHOUSE" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    พบสินค้าระหว่างเก็บสต็อก ชำรุด เสียหาย หรือลูกค้านำมาคืนที่คลัง
                  </p>
                </div>
              </button>

              {/* QC Option */}
              <button
                type="button"
                onClick={() => setDepartment("QC")}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                  department === "QC"
                    ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                    department === "QC"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>ตรวจสอบคุณภาพ (QC / Quality Control)</span>
                    {department === "QC" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    ตรวจพบความผิดปกติระหว่างการตรวจรับเข้า ตรวจประกอบ หรือทดสอบ FAT
                  </p>
                </div>
              </button>
            </div>

            {/* Reporter Name & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>ชื่อผู้แจ้งเคลม</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี (คลังสินค้า)"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>เบอร์โทรศัพท์ / ช่องทางติดต่อผู้แจ้ง</span>
                </label>
                <input
                  type="text"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="เช่น 081-xxx-xxxx, เบอร์ต่อภายใน 102"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Card 2: ข้อมูลสินค้า Model & S/N และรูปเนมเพลทข้างตัวเครื่อง */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Zap className="w-4 h-4 text-red-600" />
                <span>2. ข้อมูลสินค้าและเนมเพลท (Product Model & Serial No.)</span>
              </div>
              <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                เน้นถ่ายรูปเนมเพลท
              </span>
            </div>

            {/* Equipment Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                ประเภทอุปกรณ์ (Equipment Type)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { value: "INVERTER", label: "อินเวอร์เตอร์", sub: "Inverter / Drive", icon: Zap },
                  { value: "CONTROL_CABINET", label: "ตู้คอนโทรล", sub: "Control Cabinet", icon: Layers },
                  { value: "MOTOR", label: "มอเตอร์ไฟฟ้า", sub: "Electric Motor", icon: Cog },
                  { value: "PUMP", label: "ปั๊มน้ำ", sub: "Water Pump", icon: Droplets },
                  { value: "OTHER", label: "อื่นๆ", sub: "Other Equipment", icon: FileText },
                ].map((item) => {
                  const IconComp = item.icon;
                  const isSelected = equipmentType === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setEquipmentType(item.value as any)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-red-50/80 border-red-500 text-red-700 ring-2 ring-red-500/20 shadow-2xs"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isSelected ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-[11px] font-bold leading-tight">{item.label}</div>
                      <div className="text-[9.5px] text-slate-400 leading-tight">{item.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand, Model, S/N Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ยี่ห้อ (Brand)
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="เช่น INVT, TERA GROUP, ABB"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Model (รุ่นสินค้า) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="เช่น GD20-011G-4"
                  className="w-full text-xs font-bold text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-neutral-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  S/N (Serial Number ตัวเครื่อง)
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="กรอก S/N หรืออ่านจากเนมเพลท"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>

            {/* KEY REQUIREMENT: S/N แนบเป็นรูปเนมเพลทข้างตัวเครื่อง */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-dashed border-red-300 bg-red-50/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                  <Camera className="w-4 h-4 text-red-600" />
                  <span>รูปถ่ายเนมเพลทข้างตัวเครื่อง (S/N Nameplate Photo)</span>
                  <span className="text-red-600 font-extrabold">*จำเป็น*</span>
                </div>
                <span className="text-[10.5px] text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  ถ่ายให้เห็นชัดทั้งรุ่นและบาร์โค้ด S/N
                </span>
              </div>

              <p className="text-[11.5px] text-slate-600 leading-relaxed">
                กรุณาถ่ายภาพป้ายเนมเพลทข้างตัวเครื่องให้ชัดเจน เพื่อให้ฝ่ายเซอร์วิสตรวจสอบ Serial Number, วันที่ผลิต และรุ่นสเปกสินค้าได้อย่างแม่นยำ
              </p>

              {nameplatePhotoUrl ? (
                <div className="relative inline-block border-2 border-black rounded-xl overflow-hidden bg-white shadow-xs">
                  <img
                    src={nameplatePhotoUrl}
                    alt="Nameplate"
                    className="max-h-64 max-w-full object-contain mx-auto"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => nameplateInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-bold bg-black/80 hover:bg-black text-white rounded-lg backdrop-blur-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      ถ่ายใหม่
                    </button>
                    <button
                      type="button"
                      onClick={() => setNameplatePhotoUrl("")}
                      className="p-1 text-white bg-red-600 hover:bg-red-700 rounded-lg shadow cursor-pointer"
                      title="ลบรูป"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => nameplateInputRef.current?.click()}
                  className="border-2 border-dashed border-red-300 hover:border-red-500 rounded-xl p-6 text-center bg-white cursor-pointer transition hover:bg-red-50/20 flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {uploadingNameplate ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      คลิกเพื่อถ่ายภาพ หรือ อัปโหลดรูปเนมเพลทข้างเครื่อง
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      รองรับไฟล์ภาพ JPG, PNG, WEBP (ไม่เกิน 50MB)
                    </div>
                  </div>
                </div>
              )}

              <input
                ref={nameplateInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleNameplateChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Card 3: อาการเสีย */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>3. รายละเอียดอาการเสีย / ปัญหาที่พบ (Symptom & Defect Description)</span>
                <span className="text-red-500 font-bold">*</span>
              </div>
            </div>

            <textarea
              required
              rows={4}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="อธิบายอาการเสียที่พบอย่างละเอียด เช่น เปิดเครื่องไม่ติด ไฟสถานะไม่ขึ้น, พัดลมไม่หมุน, มีเสียงดังผิดปกติ, เกิดประกายไฟ/กลิ่นไหม้, หน้าจอแสดง Error OC หรือ SC, ตัวถังบุบแตกระหว่างการขนส่ง ฯลฯ"
              className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 leading-relaxed font-medium bg-neutral-50/30"
            />
          </div>
        </div>

        {/* Right Column: Media (Video & Additional Photos) & Urgency */}
        <div className="space-y-6">
          {/* Card 4: ระดับความเร่งด่วน */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              ระดับความเร่งด่วน (Urgency Level)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setUrgency("NORMAL")}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition border cursor-pointer flex items-center justify-center gap-1.5 ${
                  urgency === "NORMAL"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${urgency === "NORMAL" ? "text-slate-300" : "text-slate-400"}`} />
                <span>ปกติ</span>
              </button>
              <button
                type="button"
                onClick={() => setUrgency("URGENT")}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition border cursor-pointer flex items-center justify-center gap-1.5 ${
                  urgency === "URGENT"
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${urgency === "URGENT" ? "text-amber-200" : "text-amber-500"}`} />
                <span>ด่วน</span>
              </button>
              <button
                type="button"
                onClick={() => setUrgency("CRITICAL")}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition border cursor-pointer flex items-center justify-center gap-1.5 ${
                  urgency === "CRITICAL"
                    ? "bg-red-600 text-white border-red-600 shadow-xs"
                    : "bg-white text-red-600 border-red-200 hover:bg-red-50"
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${urgency === "CRITICAL" ? "text-amber-200" : "text-red-500"}`} />
                <span>ด่วนมาก</span>
              </button>
            </div>
          </div>

          {/* Card 5: วีดีโออาการเสีย */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Video className="w-4 h-4 text-purple-600" />
                <span>วีดีโออาการเสีย (Defect Video)</span>
              </div>
              <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 font-semibold">
                MP4 / MOV / WebM
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              แนบคลิปสั้นแสดงอาการผิดปกติ เช่น เสียงผิดปกติ, ไฟกระพริบ, หรือ Error บนจอ
            </p>

            {defectVideoUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-300">
                  <video
                    src={defectVideoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full max-h-56 object-contain"
                  >
                    <source src={defectVideoUrl} type="video/mp4" />
                    <source src={defectVideoUrl} type="video/webm" />
                    <source src={defectVideoUrl} type="video/quicktime" />
                  </video>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> อัปโหลดวีดีโอแล้ว
                  </span>
                  <div className="flex items-center gap-2.5">
                    <a
                      href={defectVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      เปิดดูในแท็บใหม่
                    </a>
                    <button
                      type="button"
                      onClick={() => setDefectVideoUrl("")}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      ลบวีดีโอ
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => videoInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-purple-50/20 cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {uploadingVideo ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Video className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {uploadingVideo ? videoUploadProgress : "คลิกเพื่ออัปโหลดคลิปวีดีโอ"}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    ขนาดไม่เกิน 50MB (คลิปสั้น 15-60 วินาที)
                  </div>
                </div>
              </div>
            )}

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="hidden"
            />
          </div>

          {/* Card 6: รูปภาพจุดชำรุดเพิ่มเติม */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>รูปภาพความเสียหายเพิ่มเติม (Photos)</span>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                {defectPhotos.length} รูป
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              ภาพถ่ายภายนอก, รอยไหม้, บอร์ดแตกหัก, สภาพกล่อง หรือจุดชำรุดอื่นๆ
            </p>

            {/* Photos Grid */}
            {defectPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {defectPhotos.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square border border-slate-200 rounded-lg overflow-hidden group bg-white"
                  >
                    <img
                      src={url}
                      alt={`Defect ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeDefectPhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-80 hover:opacity-100 transition cursor-pointer"
                      title="ลบรูปภาพ"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            <button
              type="button"
              disabled={uploadingPhotos}
              onClick={() => photosInputRef.current?.click()}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 text-slate-700 hover:text-emerald-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {uploadingPhotos ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>กำลังอัปโหลด...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>เพิ่มรูปภาพความเสียหาย</span>
                </>
              )}
            </button>

            <input
              ref={photosInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleDefectPhotosChange}
              className="hidden"
            />
          </div>

          {/* Quick Notice Info */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 text-[11px] text-blue-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-800">
              <Info className="w-4 h-4 shrink-0 text-blue-600" />
              <span>ขั้นตอนหลังจากส่งแจ้งเคลม:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>ฝ่ายบริการ (Service) จะได้รับแจ้งเตือนในระบบทันที</li>
              <li>ช่างบริการจะตรวจสอบรูปเนมเพลท, S/N และคลิปวีดีโอ</li>
              <li>สามารถกดเปิดเป็นใบตรวจเช็ค CR หรือใบรับซ่อม RO ได้โดยตรง</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Footer */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-20">
        <Link
          href="/service/claims"
          className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ยกเลิกและย้อนกลับ</span>
        </Link>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-xl shadow-md shadow-red-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isEdit ? "บันทึกการแก้ไขข้อมูล" : "ส่งแจ้งเคลมให้ฝ่ายเซอร์วิส"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
