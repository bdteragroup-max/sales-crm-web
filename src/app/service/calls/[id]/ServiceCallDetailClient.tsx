"use client";

import React, { useState, useMemo } from "react";
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
  Clock,
  CheckCircle2,
  Wrench,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Printer,
  ShieldCheck,
  UserCheck,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock,
  Plus,
  Trash2,
  Upload,
  Camera,
  FileSignature,
  MapPin,
  Package,
  Hash,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  updateServiceCallLog,
  syncRepairDeliveryFromServiceCall,
  deleteServiceCallLog,
} from "@/app/actions/service-calls";
import { SignaturePadBox } from "@/app/repair-deliveries/SignaturePadModal";
import {
  ONSITE_RESULT_OPTIONS,
  SearchableSalesSelect,
} from "../ServiceCallSignatureModal";
import MobileSafeSelect from "@/app/components/MobileSafeSelect";

interface UserOption {
  id: string;
  fullName: string;
  role: string;
  nickname?: string | null;
}

interface ServiceCallDetailClientProps {
  initialData: any;
  currentUser: any;
  users?: UserOption[];
}

// ── Status Configuration ──
export const CALL_STATUS_OPTIONS = [
  {
    value: "Received notification",
    label: "เปิดเคส (รับแจ้งแล้ว)",
    step: 1,
    desc: "รับเรื่องเข้าระบบ รอจัดสรรช่างหรือนัดหมาย",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-[#ff2301]",
  },
  {
    value: "Waiting for on-site inspection",
    label: "รอนัดหมายเข้าตรวจ",
    step: 2,
    desc: "รอนัดหมายวันเข้าตรวจสอบหน้างาน",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-[#ff2301]",
  },
  {
    value: "System still has issues",
    label: "กำลังดำเนินการ (ระบบยังมีปัญหา)",
    step: 3,
    desc: "อยู่ระหว่างตรวจเช็คหรือแก้ไข แต่ยังไม่สมบูรณ์",
    badge: "bg-gray-100 text-gray-800 border-gray-300",
    dot: "bg-gray-600",
  },
  {
    value: "Machine broken",
    label: "ส่งซ่อม/เปลี่ยน (เครื่องเสีย)",
    step: 3,
    desc: "เครื่องมีปัญหา ส่งศูนย์บริการหรือเปลี่ยนอะไหล่",
    badge: "bg-gray-100 text-gray-800 border-gray-300",
    dot: "bg-gray-700",
  },
  {
    value: "Motor problem",
    label: "ปัญหามอเตอร์",
    step: 3,
    desc: "ตรวจพบว่าปัญหาเกิดจากมอเตอร์ภายนอก",
    badge: "bg-gray-100 text-gray-800 border-gray-300",
    dot: "bg-gray-600",
  },
  {
    value: "Low water level in the well",
    label: "ปัญหาสภาพแวดล้อม (น้ำในบ่อน้อย)",
    step: 3,
    desc: "ระดับน้ำไม่เพียงพอ ไม่ใช่ปัญหาจากตัวเครื่อง",
    badge: "bg-gray-100 text-gray-800 border-gray-300",
    dot: "bg-gray-500",
  },
  {
    value: "Customer has not yet made changes",
    label: "รอติดตาม (ลูกค้ายังไม่แก้ไข)",
    step: 3,
    desc: "แจ้งแนวทางแล้ว รอให้ลูกค้าปรับปรุงแก้ไข",
    badge: "bg-gray-100 text-gray-700 border-gray-300",
    dot: "bg-gray-500",
  },
  {
    value: "System running smoothly",
    label: "ปิดเคสแล้ว (ระบบทำงานปกติ)",
    step: 4,
    desc: "แก้ไขเรียบร้อย ระบบทำงานได้ตามปกติ",
    badge: "bg-gray-900 text-white border-gray-800",
    dot: "bg-white",
  },
];

export default function ServiceCallDetailClient({
  initialData,
  currentUser,
  users = [],
}: ServiceCallDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const initialFollowUp = initialData.followUpDate
    ? new Date(initialData.followUpDate).toISOString().split("T")[0]
    : "";

  const initialOnsiteDate = initialData.onsiteDate
    ? new Date(initialData.onsiteDate).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const normalizePhotos = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val))
      return val
        .map((v: any) => (typeof v === "string" ? v : v?.url || ""))
        .filter(Boolean);
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed))
          return parsed
            .map((v: any) => (typeof v === "string" ? v : v?.url || ""))
            .filter(Boolean);
      } catch {
        return [val];
      }
    }
    return [];
  };

  const normalizeParts = (
    val: any
  ): Array<{ name: string; qty: string; unit: string; note: string }> => {
    if (!val) return [];
    let arr: any[] = [];
    if (Array.isArray(val)) arr = val;
    else if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) arr = parsed;
      } catch {
        arr = [];
      }
    }
    return arr.map((p) => ({
      name: String(p?.name || ""),
      qty: String(p?.qty ?? "1"),
      unit: String(p?.unit || "ชิ้น"),
      note: String(p?.note || ""),
    }));
  };

  const [formData, setFormData] = useState({
    status: initialData.status || "Received notification",
    analyzedCause: initialData.analyzedCause || "",
    recommendedSolution: initialData.recommendedSolution || "",
    followUpDate: initialFollowUp,
    responsibleId: initialData.responsibleId || "",
    notes: initialData.notes || "",
    internalCompany: initialData.internalCompany || "TG",
    siteAddress: initialData.siteAddress || "",
    serialNumber: initialData.serialNumber || "",
    onsiteDate: initialOnsiteDate,
    onsiteResult: initialData.onsiteResult || "",
    onsiteResultNote: initialData.onsiteResultNote || "",
    partsUsed: normalizeParts(initialData.partsUsed),
    photosBefore: normalizePhotos(initialData.photosBefore),
    photosAfter: normalizePhotos(initialData.photosAfter),
    sigTechnicianUrl: initialData.sigTechnicianUrl || (null as string | null),
    nameTechnician:
      initialData.nameTechnician ||
      initialData.responsible?.fullName ||
      initialData.responsibleName ||
      "",
    technicianPhone:
      initialData.technicianPhone ||
      initialData.responsible?.phoneNumber ||
      "",
    sigCustomerUrl: initialData.sigCustomerUrl || (null as string | null),
    nameCustomer: initialData.nameCustomer || initialData.contactName || "",
    customerPosition: initialData.customerPosition || "",
    assignedSalesId: initialData.assignedSalesId || "",
  });

  const salesAndAllUsers = useMemo(() => {
    const isSalesRole = (r?: string) => {
      const rl = (r || "").toLowerCase();
      return (
        rl.includes("sale") ||
        rl.includes("ขาย") ||
        rl.includes("เซล") ||
        rl.includes("ผู้จัดการ") ||
        rl.includes("manager")
      );
    };
    const sales = users.filter((u) => isSalesRole(u.role));
    const others = users.filter((u) => !isSalesRole(u.role));
    return { sales, others };
  }, [users]);

  const [isUploadingBefore, setIsUploadingBefore] = useState(false);
  const [isUploadingAfter, setIsUploadingAfter] = useState(false);

  const handleUploadPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "before" | "after"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentList =
      type === "before" ? formData.photosBefore : formData.photosAfter;
    if (currentList.length >= 2) {
      Swal.fire({
        icon: "warning",
        title: "ครบจำนวนแล้ว",
        text: `สามารถแนบรูปภาพ${
          type === "before" ? "ก่อนแก้ไข" : "หลังแก้ไข"
        }ได้สูงสุด 2 รูป`,
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    if (type === "before") setIsUploadingBefore(true);
    else setIsUploadingAfter(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("bucket", "uploadsService");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });
        const json = await res.json();
        if (json.url) {
          if (type === "before") {
            setFormData((prev) => ({
              ...prev,
              photosBefore: [...prev.photosBefore, json.url].slice(0, 2),
            }));
          } else {
            setFormData((prev) => ({
              ...prev,
              photosAfter: [...prev.photosAfter, json.url].slice(0, 2),
            }));
          }
        } else {
          throw new Error(json.error || "ไม่สามารถอัปโหลดไฟล์ได้");
        }
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "อัปโหลดรูปภาพล้มเหลว",
        text: err.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      if (type === "before") setIsUploadingBefore(false);
      else setIsUploadingAfter(false);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = (index: number, type: "before" | "after") => {
    if (type === "before") {
      setFormData((prev) => ({
        ...prev,
        photosBefore: prev.photosBefore.filter((_, i) => i !== index),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        photosAfter: prev.photosAfter.filter((_, i) => i !== index),
      }));
    }
  };

  const handleAddPart = () => {
    setFormData((prev) => ({
      ...prev,
      partsUsed: [
        ...prev.partsUsed,
        { name: "", qty: "1", unit: "ชิ้น", note: "" },
      ],
    }));
  };

  const handleUpdatePart = (
    idx: number,
    field: "name" | "qty" | "unit" | "note",
    val: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      partsUsed: prev.partsUsed.map((item, i) =>
        i === idx ? { ...item, [field]: val } : item
      ),
    }));
  };

  const handleRemovePart = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      partsUsed: prev.partsUsed.filter((_, i) => i !== idx),
    }));
  };

  // Check if current user has edit permission (Service, Sales, Managers, Technicians, Admins)
  const roleLower = (currentUser?.role || "").toLowerCase();
  const isManagerOrAdmin =
    currentUser?.role === "Service Engineer MGR" ||
    currentUser?.role === "Service Engineer MGR." ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "Admin" ||
    currentUser?.role === "Executive" ||
    roleLower.includes("manager") ||
    roleLower.includes("ผู้จัดการ") ||
    roleLower.includes("service") ||
    roleLower.includes("บริการ") ||
    roleLower.includes("ซ่อม") ||
    roleLower.includes("ช่าง");

  const isResponsible = initialData.responsibleId === currentUser?.id;
  const isCreator = initialData.createdBy === currentUser?.id;
  const canEdit = Boolean(currentUser);
  const canReassign = isManagerOrAdmin || isCreator || Boolean(currentUser);

  // Track if changes have been made
  const isDirty = true;

  // Current status metadata
  const currentStatusMeta = useMemo(() => {
    const found = CALL_STATUS_OPTIONS.find((s) => s.value === formData.status);
    if (found) return found;
    return {
      value: formData.status,
      label: formData.status || "เปิดเคส",
      step: 1,
      desc: "สถานะเดิมจากระบบ",
      badge: "bg-gray-100 text-gray-800 border-gray-300",
      dot: "bg-gray-500",
    };
  }, [formData.status]);

  // Lifecycle stage mapping (1 to 4)
  const currentLifecycleStep = useMemo(() => {
    const status = formData.status;
    if (!status || status === "Received notification" || status.includes("เปิดเคส")) return 1;
    if (status === "Waiting for on-site inspection" || status.includes("รอนัดหมาย")) return 2;
    if (status === "System running smoothly" || status.includes("ปิดเคส") || status.includes("ปกติ")) return 4;
    return 3;
  }, [formData.status]);

  // Follow-up date calculations
  const followUpMeta = useMemo(() => {
    if (!formData.followUpDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(formData.followUpDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `เกินกำหนดติดตาม ${Math.abs(diffDays)} วันแล้ว`,
        badge: "bg-red-50 text-red-700 border-red-200 font-medium",
        isPast: true,
      };
    } else if (diffDays === 0) {
      return {
        text: "ถึงกำหนดติดตามผลวันนี้",
        badge: "bg-red-600 text-white border-red-600 font-semibold",
        isToday: true,
      };
    } else if (diffDays === 1) {
      return {
        text: "ถึงกำหนดติดตามวันพรุ่งนี้",
        badge: "bg-gray-100 text-gray-800 border-gray-300 font-medium",
        isUpcoming: true,
      };
    } else {
      return {
        text: `อีก ${diffDays} วัน (${new Date(formData.followUpDate).toLocaleDateString("th-TH")})`,
        badge: "bg-gray-50 text-gray-700 border-gray-200",
        isUpcoming: true,
      };
    }
  }, [formData.followUpDate]);

  // Copy to clipboard helper
  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Reset changes
  const handleReset = () => {
    setFormData({
      status: initialData.status || "Received notification",
      analyzedCause: initialData.analyzedCause || "",
      recommendedSolution: initialData.recommendedSolution || "",
      followUpDate: initialFollowUp,
      responsibleId: initialData.responsibleId || "",
      notes: initialData.notes || "",
      internalCompany: initialData.internalCompany || "TG",
      siteAddress: initialData.siteAddress || "",
      serialNumber: initialData.serialNumber || "",
      onsiteDate: initialOnsiteDate,
      onsiteResult: initialData.onsiteResult || "",
      onsiteResultNote: initialData.onsiteResultNote || "",
      partsUsed: normalizeParts(initialData.partsUsed),
      photosBefore: normalizePhotos(initialData.photosBefore),
      photosAfter: normalizePhotos(initialData.photosAfter),
      sigTechnicianUrl: initialData.sigTechnicianUrl || null,
      nameTechnician:
        initialData.nameTechnician ||
        initialData.responsible?.fullName ||
        initialData.responsibleName ||
        "",
      technicianPhone:
        initialData.technicianPhone ||
        initialData.responsible?.phoneNumber ||
        "",
      sigCustomerUrl: initialData.sigCustomerUrl || null,
      nameCustomer: initialData.nameCustomer || initialData.contactName || "",
      customerPosition: initialData.customerPosition || "",
      assignedSalesId: initialData.assignedSalesId || "",
    });
  };

  // Submit form
  const handleSaveData = async (openPdfAfter = false, overrideStatus?: string) => {
    if (!canEdit) {
      Swal.fire({
        icon: "error",
        title: "ไม่มีสิทธิ์ดำเนินการ",
        text: "กรุณาเข้าสู่ระบบก่อนดำเนินการ",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setLoading(true);
    try {
      const selectedSalesUser = users.find(
        (u) => u.id === formData.assignedSalesId
      );

      const payload: any = {
        status: overrideStatus || formData.status,
        analyzedCause: formData.analyzedCause || null,
        recommendedSolution: formData.recommendedSolution || null,
        followUpDate: formData.followUpDate || null,
        notes: formData.notes || null,
        internalCompany: formData.internalCompany || "TG",
        siteAddress: formData.siteAddress || null,
        serialNumber: formData.serialNumber || null,
        onsiteDate: formData.onsiteDate || null,
        onsiteResult: formData.onsiteResult || null,
        onsiteResultNote: formData.onsiteResultNote || null,
        partsUsed: formData.partsUsed.filter((p) => p.name.trim() !== ""),
        photosBefore: formData.photosBefore,
        photosAfter: formData.photosAfter,
        sigTechnicianUrl: formData.sigTechnicianUrl,
        nameTechnician: formData.nameTechnician || null,
        technicianPhone: formData.technicianPhone || null,
        sigCustomerUrl: formData.sigCustomerUrl,
        nameCustomer: formData.nameCustomer || null,
        customerPosition: formData.customerPosition || null,
        assignedSalesId: formData.assignedSalesId || null,
        assignedSalesName: selectedSalesUser?.fullName || null,
      };

      if (canReassign) {
        payload.responsibleId = formData.responsibleId || null;
      }

      if (overrideStatus) {
        setFormData((prev) => ({ ...prev, status: overrideStatus }));
      }

      await updateServiceCallLog(initialData.id, payload);

      await Swal.fire({
        icon: "success",
        title: overrideStatus
          ? "ปิดงานและส่งต่อเซลล์เรียบร้อย"
          : "บันทึกข้อมูลเรียบร้อย",
        text:
          overrideStatus && selectedSalesUser
            ? `ปิดเคสและส่งแจ้งเตือนให้ ${selectedSalesUser.fullName} เพื่อเปิดใบเสนอราคาแล้ว`
            : "อัปเดตข้อมูลเคสและรายงานการเข้าหน้างานสำเร็จ",
        timer: 1600,
        showConfirmButton: false,
      });

      if (openPdfAfter) {
        window.open(`/service/calls/${initialData.id}/pdf`, "_blank");
      }
      router.refresh();
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

  const handleCloseAndSendToSales = async () => {
    if (!formData.assignedSalesId) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกเซลล์ผู้รับเรื่อง",
        text: "กรุณาเลือกชื่อเซลล์ที่ต้องการให้รับเรื่องไปเปิดใบเสนอราคาก่อนกดปุ่มนี้",
        confirmButtonColor: "#ff2301",
      });
      return;
    }
    await handleSaveData(false, "System running smoothly");
  };

  const handleManualSyncDelivery = async () => {
    setLoading(true);
    try {
      await handleSaveData(false);
      const res = await syncRepairDeliveryFromServiceCall(initialData.id);
      if (res.success && res.repairDeliveryId) {
        await Swal.fire({
          icon: "success",
          title: "ส่งข้อมูลไปใบส่งมอบงานสำเร็จ",
          text: `สร้าง/อัปเดตใบส่งมอบงานเลขที่ ${res.deliveryNumber || ""} พร้อมรูปถ่ายและลายเซ็นเรียบร้อยแล้ว`,
          confirmButtonColor: "#ff2301",
        });
        router.refresh();
      } else {
        throw new Error(res.error || "ไม่สามารถสร้างใบส่งมอบงานได้");
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถซิงค์ใบส่งมอบงานได้",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveData(false);
  };

  // Print Handler -> Open dedicated A4 Service Call Report PDF
  const handlePrint = () => {
    window.open(`/service/calls/${initialData.id}/pdf`, "_blank");
  };

  // Delete Case Handler
  const handleDeleteCase = async () => {
    if (loading) return;

    const linkedInfo: string[] = [];
    if (initialData.linkedQuotationNo)
      linkedInfo.push(`ใบเสนอราคา ${initialData.linkedQuotationNo}`);
    if (initialData.linkedDeliveryNo)
      linkedInfo.push(`ใบส่งมอบ ${initialData.linkedDeliveryNo}`);

    const confirm = await Swal.fire({
      title: "ยืนยันการลบเคสแจ้งปัญหา?",
      html: `<div style="font-size:14px;color:#374151;line-height:1.6">ต้องการลบเคสเลขที่ <b style="color:#ff2301">${
        initialData.caseNumber || "-"
      }</b><br/>ลูกค้า: <b>${initialData.companyName || "-"}</b> ใช่หรือไม่?${
        linkedInfo.length > 0
          ? `<br/><span style="font-size:12px;color:#6b7280">(หมายเหตุ: เอกสารที่สร้างไปแล้ว ได้แก่ ${linkedInfo.join(
              ", "
            )} จะยังคงอยู่ในระบบ)</span>`
          : ""
      }<br/><span style="font-size:12px;color:#dc2626">การลบนี้ไม่สามารถย้อนกลับได้</span></div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบข้อมูล",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      const res = await deleteServiceCallLog(initialData.id);
      if (res?.success) {
        await Swal.fire({
          icon: "success",
          title: "ลบข้อมูลสำเร็จ",
          text: `ลบเคส ${initialData.caseNumber || ""} เรียบร้อยแล้ว`,
          timer: 1400,
          showConfirmButton: false,
        });
        router.push("/service/calls");
        router.refresh();
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "ไม่สามารถลบข้อมูลได้",
        text: err?.message || "เกิดข้อผิดพลาดในการลบเคส กรุณาลองใหม่อีกครั้ง",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setLoading(false);
    }
  };

  // Formatted Dates
  const receivedDateFormatted = useMemo(() => {
    if (!initialData.receivedDate) return "-";
    return new Date(initialData.receivedDate).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [initialData.receivedDate]);

  const createdAtFormatted = useMemo(() => {
    if (!initialData.createdAt) return "-";
    return new Date(initialData.createdAt).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [initialData.createdAt]);

  const updatedAtFormatted = useMemo(() => {
    if (!initialData.updatedAt) return "-";
    return new Date(initialData.updatedAt).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [initialData.updatedAt]);

  return (
    <div className="min-h-screen bg-gray-50/60 pb-28 sm:pb-16 print:bg-white print:pb-0">
      {/* ── Top Navigation & Breadcrumb Bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 print:static print:border-b-2">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="min-h-14 sm:h-16 py-2 sm:py-0 flex items-center justify-between gap-2 sm:gap-4">
            {/* Left: Back Link & Breadcrumb */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                href="/service/calls"
                className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-[#ff2301] transition-colors px-2.5 py-2 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>กลับ<span className="hidden sm:inline">หน้ารายการ</span></span>
              </Link>
              <div className="hidden md:flex items-center text-xs text-gray-400 gap-1.5 font-medium">
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-gray-500">งานบริการ</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-gray-500">บันทึกแจ้งปัญหา</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-gray-900 font-semibold">{initialData.caseNumber}</span>
              </div>
            </div>

            {/* Right: Quick Case Badge & Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => handleCopy(initialData.caseNumber, "caseNumber")}
                className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-mono font-semibold transition-colors border border-gray-200"
                title="คลิกเพื่อคัดลอกเลขเคส"
              >
                <span>{initialData.caseNumber}</span>
                {copiedField === "caseNumber" ? (
                  <Check className="w-3.5 h-3.5 text-[#ff2301]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold border shadow-sm max-w-[145px] sm:max-w-none ${currentStatusMeta.badge}`}
              >
                <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${currentStatusMeta.dot}`} />
                <span className="truncate">{currentStatusMeta.label}</span>
              </span>

              <Link
                href={`/service/calls/${initialData.id}/pdf`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-[#ff2301] bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors print:hidden shadow-sm shrink-0"
              >
                <Printer className="w-3.5 h-3.5 text-[#ff2301]" />
                <span className="sm:hidden">PDF</span>
                <span className="hidden sm:inline">ออกใบรายงานบริการ (PDF)</span>
              </Link>

              {canEdit && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleDeleteCase}
                  title="ลบข้อมูลเคสนี้"
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors print:hidden shadow-sm shrink-0 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ลบเคส</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8">
        {/* ── Main Hero Card (Symmetrical Header) ── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-8 shadow-sm mb-5 sm:mb-8 relative overflow-hidden">
          {/* Subtle Top Red Accent Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff2301] via-red-500 to-gray-800" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
            {/* Left Header Info */}
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0 shadow-inner">
                <Wrench className="w-5 h-5 sm:w-7 sm:h-7 text-[#ff2301]" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-gray-900 text-white">
                    {initialData.caseNumber}
                  </span>
                  {initialData.legacyNo && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-gray-100 text-gray-600 border border-gray-200">
                      Legacy #{initialData.legacyNo}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    รับแจ้ง: {receivedDateFormatted}
                  </span>
                </div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight leading-snug">
                  {initialData.companyName}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>ผู้ติดต่อ: {initialData.contactName}</span>
                  <span className="text-gray-300">|</span>
                  <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 text-xs">
                    {initialData.inverterModel}
                  </span>
                </p>
              </div>
            </div>

            {/* Right Meta Info & Mode Chips */}
            <div className="flex flex-wrap sm:flex-row lg:flex-col items-start lg:items-end gap-2 sm:gap-2.5 border-t lg:border-t-0 pt-3.5 lg:pt-0 border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                {canEdit ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-[#ff2301] text-xs font-medium rounded-full border border-red-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    โหมดแก้ไขข้อมูล
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
                    <Lock className="w-3.5 h-3.5" />
                    มุมมองอ่านอย่างเดียว
                  </span>
                )}
                {isManagerOrAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-900 text-white text-xs font-medium rounded-full">
                    ผู้จัดการ / Admin
                  </span>
                )}
              </div>

              {followUpMeta && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs border ${followUpMeta.badge}`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{followUpMeta.text}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Lifecycle Milestone Stepper (2x2 on Mobile, 4 Columns on Desktop) ── */}
          <div className="mt-5 pt-5 sm:mt-8 sm:pt-8 border-t border-gray-100">
            <div className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 sm:mb-4">
              ขั้นตอนการดำเนินงาน (Case Lifecycle Progression)
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {/* Step 1 */}
              <div
                className={`relative rounded-xl p-3 sm:p-4 border transition-all ${
                  currentLifecycleStep >= 1
                    ? "bg-white border-red-200 shadow-sm"
                    : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      currentLifecycleStep > 1
                        ? "bg-gray-900 text-white"
                        : currentLifecycleStep === 1
                        ? "bg-[#ff2301] text-white shadow-md shadow-red-500/20"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentLifecycleStep > 1 ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : "1"}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono font-medium text-gray-400 uppercase">
                    Stage 01
                  </span>
                </div>
                <div className="font-bold text-gray-900 text-xs sm:text-sm">รับแจ้งเปิดเคส</div>
                <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5 line-clamp-1">บันทึกอาการที่พบ</div>
                {currentLifecycleStep === 1 && (
                  <div className="mt-2 sm:mt-3 flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-[#ff2301]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff2301] animate-pulse" />
                    สถานะปัจจุบัน
                  </div>
                )}
              </div>

              {/* Step 2 */}
              <div
                className={`relative rounded-xl p-3 sm:p-4 border transition-all ${
                  currentLifecycleStep >= 2
                    ? "bg-white border-red-200 shadow-sm"
                    : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      currentLifecycleStep > 2
                        ? "bg-gray-900 text-white"
                        : currentLifecycleStep === 2
                        ? "bg-[#ff2301] text-white shadow-md shadow-red-500/20"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentLifecycleStep > 2 ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : "2"}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono font-medium text-gray-400 uppercase">
                    Stage 02
                  </span>
                </div>
                <div className="font-bold text-gray-900 text-xs sm:text-sm">นัดหมายเข้าตรวจ</div>
                <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5 line-clamp-1">กำหนดเข้าหน้างาน</div>
                {currentLifecycleStep === 2 && (
                  <div className="mt-2 sm:mt-3 flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-[#ff2301]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff2301] animate-pulse" />
                    สถานะปัจจุบัน
                  </div>
                )}
              </div>

              {/* Step 3 */}
              <div
                className={`relative rounded-xl p-3 sm:p-4 border transition-all ${
                  currentLifecycleStep >= 3
                    ? "bg-white border-red-200 shadow-sm"
                    : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      currentLifecycleStep > 3
                        ? "bg-gray-900 text-white"
                        : currentLifecycleStep === 3
                        ? "bg-[#ff2301] text-white shadow-md shadow-red-500/20"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentLifecycleStep > 3 ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : "3"}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono font-medium text-gray-400 uppercase">
                    Stage 03
                  </span>
                </div>
                <div className="font-bold text-gray-900 text-xs sm:text-sm">วิเคราะห์ & แก้ไข</div>
                <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5 line-clamp-1">ส่งซ่อม/เปลี่ยน/รอติดตาม</div>
                {currentLifecycleStep === 3 && (
                  <div className="mt-2 sm:mt-3 flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-[#ff2301]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff2301] animate-pulse" />
                    สถานะปัจจุบัน
                  </div>
                )}
              </div>

              {/* Step 4 */}
              <div
                className={`relative rounded-xl p-3 sm:p-4 border transition-all ${
                  currentLifecycleStep === 4
                    ? "bg-white border-gray-900 shadow-sm"
                    : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      currentLifecycleStep === 4
                        ? "bg-gray-900 text-white shadow-md shadow-gray-900/20"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono font-medium text-gray-400 uppercase">
                    Stage 04
                  </span>
                </div>
                <div className="font-bold text-gray-900 text-xs sm:text-sm">ปิดเคสสมบูรณ์</div>
                <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5 line-clamp-1">ระบบทำงานได้ตามปกติ</div>
                {currentLifecycleStep === 4 && (
                  <div className="mt-2 sm:mt-3 flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-gray-900">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                    ปิดงานเรียบร้อย
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content Form / True 3x2 Symmetrical Grid ── */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-7 items-stretch">
            {/* ════════════════════════════════════════════════
                ROW 1 - LEFT (Mobile #1, Desktop #1): ข้อมูลลูกค้าและผู้ติดต่อ
                ════════════════════════════════════════════════ */}
            <div className="order-1 lg:order-1 h-full flex flex-col bg-white border border-gray-200 rounded-2xl p-4 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between pb-3.5 sm:pb-4 mb-4 sm:mb-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301] shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">
                      ข้อมูลลูกค้าและผู้ติดต่อ
                    </h2>
                    <p className="text-[11px] sm:text-xs text-gray-500">
                      Customer & Contact Information
                    </p>
                  </div>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg border border-gray-200 shrink-0">
                  ข้อมูลต้นเรื่อง
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-between gap-4">
                {/* บริษัท / ลูกค้า */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                    ชื่อบริษัท / ลูกค้า
                  </label>
                  <div className="h-12 px-3.5 flex items-center justify-between bg-gray-50 rounded-xl border border-gray-200">
                    <span className="font-semibold text-gray-900 text-sm truncate pr-2">
                      {initialData.companyName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(initialData.companyName, "companyName")}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded shrink-0"
                      title="คัดลอกชื่อบริษัท"
                    >
                      {copiedField === "companyName" ? (
                        <Check className="w-4 h-4 text-[#ff2301]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ชื่อผู้ติดต่อ & เบอร์โทร */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                      ชื่อผู้ติดต่อ
                    </label>
                    <div className="h-12 px-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 min-w-0">
                      <User className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {initialData.contactName}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                      เบอร์โทรศัพท์ / LINE
                    </label>
                    <div className="h-12 px-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-4 h-4 text-[#ff2301] shrink-0" />
                        {initialData.contactPhone ? (
                          <a
                            href={`tel:${initialData.contactPhone}`}
                            className="text-sm font-semibold text-gray-900 hover:text-[#ff2301] hover:underline truncate"
                          >
                            {initialData.contactPhone}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">ไม่ได้ระบุเบอร์โทร</span>
                        )}
                      </div>
                      {initialData.contactPhone && (
                        <button
                          type="button"
                          onClick={() => handleCopy(initialData.contactPhone, "phone")}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded shrink-0"
                          title="คัดลอกเบอร์โทร"
                        >
                          {copiedField === "phone" ? (
                            <Check className="w-4 h-4 text-[#ff2301]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* วันที่รับแจ้ง & บริษัทในเครือ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                      วันที่และเวลาที่รับแจ้ง
                    </label>
                    <div className="h-12 px-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 text-sm text-gray-700 min-w-0">
                      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{receivedDateFormatted}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                      บริษัทในเครือ (หัวกระดาษ)
                    </label>
                    <div className="h-12 px-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 text-sm text-gray-800 min-w-0">
                      <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-[#ff2301] border border-red-200 text-[11px] font-black shrink-0">
                        {formData.internalCompany || "TG"}
                      </span>
                      <span className="font-medium truncate">
                        {formData.internalCompany === "TE"
                          ? "บจก. เทอรา อิเล็คทริค"
                          : formData.internalCompany === "TP"
                          ? "บจก. เทอรา พาวเวอร์"
                          : "บจก. เทอรา กรุ้ป"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* สถานที่หน้างาน / ที่อยู่ลูกค้า */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                    สถานที่ตั้งเครื่อง / ที่อยู่หน้างาน
                  </label>
                  <div className="min-h-[48px] px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <span
                      className={
                        formData.siteAddress || initialData.siteAddress
                          ? "text-gray-800 font-medium break-words"
                          : "text-xs text-gray-400"
                      }
                    >
                      {formData.siteAddress ||
                        initialData.siteAddress ||
                        "ยังไม่ได้ระบุสถานที่หน้างาน (สามารถระบุในส่วนสรุปหน้างานด้านล่าง)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════
                ROW 1 - RIGHT (Mobile #4, Desktop #2): สถานะงานและกำหนดการติดตาม
                ════════════════════════════════════════════════ */}
            <div className="order-4 lg:order-2 h-full flex flex-col bg-white border border-gray-200 rounded-2xl p-4 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between pb-3.5 sm:pb-4 mb-4 sm:mb-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301] shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">
                      สถานะงานและกำหนดการติดตาม
                    </h2>
                    <p className="text-[11px] sm:text-xs text-gray-500">
                      Workflow Status & Follow-up Schedule
                    </p>
                  </div>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200 shrink-0">
                  ส่วนการอัปเดต
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-between gap-4">
                {/* สถานะเคสปัจจุบัน */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    สถานะเคสปัจจุบัน <span className="text-[#ff2301]">*</span>
                  </label>
                  <MobileSafeSelect
                    value={formData.status}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, status: val }))
                    }
                    disabled={!canEdit || loading}
                    options={[
                      ...CALL_STATUS_OPTIONS.map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                        subLabel: opt.desc,
                        dotClass: opt.dot === "bg-white" ? "bg-gray-900" : opt.dot,
                      })),
                      ...(!CALL_STATUS_OPTIONS.some(
                        (o) => o.value === formData.status
                      )
                        ? [
                            {
                              value: formData.status,
                              label: `${formData.status} (ข้อมูลเดิมจากระบบ)`,
                              dotClass: "bg-gray-500",
                            },
                          ]
                        : []),
                    ]}
                  />

                  {/* Status Description pill */}
                  <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex items-start gap-2">
                    <span
                      className={`w-2 h-2 rounded-full mt-1 shrink-0 ${currentStatusMeta.dot}`}
                    />
                    <span>{currentStatusMeta.desc}</span>
                  </div>
                </div>

                {/* วันที่ต้องการติดตามผล (Follow-up Date) */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      วันที่ต้องการติดตามผล (Follow-up Date)
                    </label>
                    {followUpMeta && (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${followUpMeta.badge}`}
                      >
                        {followUpMeta.text}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      name="followUpDate"
                      value={formData.followUpDate}
                      onChange={handleChange}
                      disabled={!canEdit || loading}
                      className="w-full h-12 text-base sm:text-sm border border-gray-300 rounded-xl px-3.5 pl-10 bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                </div>

                {/* ส่งต่อเซลล์เพื่อเปิดใบเสนอราคา & เชื่อมโยงใบส่งมอบงาน */}
                <div className="pt-3.5 border-t border-gray-100 space-y-3">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                      <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#ff2301] shrink-0" />
                        <span>เลือกเซลล์สำหรับรับเรื่องไปเปิดใบเสนอราคา (เมื่อปิดงาน)</span>
                      </label>
                      {initialData.assignedSalesName && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ส่งต่อแล้ว: {initialData.assignedSalesName}
                        </span>
                      )}
                    </div>

                    <SearchableSalesSelect
                      users={users}
                      value={formData.assignedSalesId}
                      onChange={(selectedId) =>
                        setFormData((prev) => ({
                          ...prev,
                          assignedSalesId: selectedId,
                        }))
                      }
                      disabled={!canEdit || loading}
                    />
                  </div>

                  {/* Quick Action Buttons: Symmetrical 2-Column Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={loading || !canEdit}
                      onClick={handleCloseAndSendToSales}
                      className="h-10 px-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">ปิดงาน + ส่งต่อเซลล์</span>
                    </button>

                    <Link
                      href={`/sales?serviceCallId=${initialData.id}`}
                      className="h-10 px-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {initialData.linkedQuotationNo
                          ? `ใบเสนอราคา (${initialData.linkedQuotationNo})`
                          : "เปิดใบเสนอราคาทันที"}
                      </span>
                    </Link>
                  </div>

                  {/* Linked Quotation & Linked Repair Delivery Status Box */}
                  {(initialData.linkedQuotationNo || initialData.linkedDeliveryId) && (
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                      <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>เอกสารที่เชื่อมโยงจากเคสเซอร์วิสนี้</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {initialData.linkedQuotationNo && (
                          <Link
                            href={
                              initialData.linkedQuotationId
                                ? `/sales?editId=${initialData.linkedQuotationId}`
                                : `/sales`
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>ใบเสนอราคา: {initialData.linkedQuotationNo}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}

                        {initialData.linkedDeliveryId && (
                          <>
                            <Link
                              href={`/repair-deliveries/${initialData.linkedDeliveryId}/pdf`}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>
                                พิมพ์ใบส่งมอบงาน ({initialData.linkedDeliveryNo || "DN"})
                              </span>
                            </Link>
                            <Link
                              href={`/repair-deliveries/${initialData.linkedDeliveryId}/edit`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-all"
                            >
                              <span>แก้ไขใบส่งมอบงาน</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════
                ROW 2 - LEFT (Mobile #2, Desktop #3): ข้อมูลอุปกรณ์และอาการที่พบ
                ════════════════════════════════════════════════ */}
            <div className="order-2 lg:order-3 h-full flex flex-col bg-white border border-gray-200 rounded-2xl p-4 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between pb-3.5 sm:pb-4 mb-4 sm:mb-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301] shrink-0">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">
                      ข้อมูลอุปกรณ์และอาการที่พบ
                    </h2>
                    <p className="text-[11px] sm:text-xs text-gray-500">
                      Hardware & Reported Problem
                    </p>
                  </div>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg border border-gray-200 shrink-0">
                  ข้อมูลปัญหา
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                {/* รุ่นอินเวอร์เตอร์ & S/N */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                      โมเดล / รุ่น Inverter
                    </label>
                    <div className="h-12 px-3.5 bg-red-50/50 rounded-xl border border-red-200/80 flex items-center gap-2 min-w-0">
                      <Cpu className="w-4 h-4 text-[#ff2301] shrink-0" />
                      <span className="font-mono font-bold text-gray-900 text-sm truncate">
                        {initialData.inverterModel}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                      Serial Number (S/N)
                    </label>
                    <div className="h-12 px-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 min-w-0">
                      <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                      <span
                        className={`font-mono text-sm truncate ${
                          formData.serialNumber || initialData.serialNumber
                            ? "font-semibold text-gray-900"
                            : "text-xs font-sans text-gray-400"
                        }`}
                      >
                        {formData.serialNumber ||
                          initialData.serialNumber ||
                          "ไม่ได้ระบุ S/N"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* อาการที่พบ (ลูกค้าแจ้ง) — ยืดเต็มพื้นที่เพื่อสมมาตรกับ Card ขวา */}
                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                    อาการที่พบ (ข้อมูลจากลูกค้าแจ้ง)
                  </label>
                  <div className="flex-1 min-h-[140px] p-4 bg-gray-50 rounded-xl border border-gray-200 relative">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-[#ff2301] mt-0.5 shrink-0" />
                      <div className="text-sm text-gray-800 font-medium whitespace-pre-wrap leading-relaxed">
                        {initialData.reportedIssue}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════
                ROW 2 - RIGHT (Mobile #5, Desktop #4): ผลการตรวจสอบและวิธีแก้ไข
                ════════════════════════════════════════════════ */}
            <div className="order-5 lg:order-4 h-full flex flex-col bg-white border border-gray-200 rounded-2xl p-4 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between pb-3.5 sm:pb-4 mb-4 sm:mb-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301] shrink-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">
                      ผลการตรวจสอบและวิธีแก้ไข
                    </h2>
                    <p className="text-[11px] sm:text-xs text-gray-500">
                      Technical Analysis & Solution
                    </p>
                  </div>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200 shrink-0">
                  ฝ่ายช่าง
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                {/* สาเหตุที่วิเคราะห์พบ */}
                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    สาเหตุที่วิเคราะห์พบ (Analyzed Cause)
                  </label>
                  <textarea
                    name="analyzedCause"
                    rows={3}
                    value={formData.analyzedCause}
                    onChange={handleChange}
                    disabled={!canEdit || loading}
                    placeholder="ระบุสาเหตุของปัญหาจากการตรวจเช็คหรือวิเคราะห์ทางเทคนิค..."
                    className="w-full flex-1 min-h-[96px] text-base sm:text-sm border border-gray-300 rounded-xl p-3 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all disabled:bg-gray-100 disabled:text-gray-500 resize-y"
                  />
                </div>

                {/* วิธีแก้ไข / ข้อเสนอแนะให้ลูกค้า */}
                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    วิธีแก้ไข / คำแนะนำให้ลูกค้า (Recommended Solution)
                  </label>
                  <textarea
                    name="recommendedSolution"
                    rows={3}
                    value={formData.recommendedSolution}
                    onChange={handleChange}
                    disabled={!canEdit || loading}
                    placeholder="ระบุแนวทางการแก้ไขที่ได้ทำ หรือสิ่งที่แนะนำให้ลูกค้าดำเนินการ..."
                    className="w-full flex-1 min-h-[96px] text-base sm:text-sm border border-gray-300 rounded-xl p-3 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all disabled:bg-gray-100 disabled:text-gray-500 resize-y"
                  />
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════
                ROW 3 - LEFT (Mobile #3, Desktop #5): เจ้าหน้าที่ผู้รับเรื่องและผู้รับผิดชอบ
                ════════════════════════════════════════════════ */}
            <div className="order-3 lg:order-5 h-full flex flex-col bg-white border border-gray-200 rounded-2xl p-4 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between pb-3.5 sm:pb-4 mb-4 sm:mb-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301] shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">
                      เจ้าหน้าที่ผู้รับเรื่องและผู้รับผิดชอบ
                    </h2>
                    <p className="text-[11px] sm:text-xs text-gray-500">
                      Staff Assignment & Responsibility
                    </p>
                  </div>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg border border-gray-200 shrink-0">
                  บุคลากร
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-between gap-4">
                {/* ผู้รับเรื่อง / เปิดเคส */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                    ผู้รับเรื่อง (สร้างเอกสารเปิดเคส)
                  </label>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 shrink-0">
                        {initialData.creator?.fullName?.charAt(0) || "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {initialData.creator?.fullName || "ไม่ทราบผู้สร้าง"}
                        </div>
                        <div className="text-[11px] text-gray-400">เจ้าหน้าที่รับแจ้งเรื่อง</div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-500 px-2.5 py-1 bg-white rounded-md border border-gray-200 shrink-0">
                      ผู้เปิดเคส
                    </span>
                  </div>
                </div>

                {/* ช่างผู้รับผิดชอบงานซ่อม/ตรวจเช็ค */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      ช่างผู้รับผิดชอบงานซ่อม / ตรวจเช็ค
                    </label>
                    {canReassign && (
                      <span className="text-[11px] font-semibold text-[#ff2301]">
                        สามารถเปลี่ยนผู้รับผิดชอบได้
                      </span>
                    )}
                  </div>

                  {canReassign && users.length > 0 ? (
                    <MobileSafeSelect
                      value={formData.responsibleId}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, responsibleId: val }))
                      }
                      disabled={loading}
                      searchable={users.length > 5}
                      searchPlaceholder="พิมพ์ค้นหาชื่อช่าง / ตำแหน่ง..."
                      placeholder="-- ยังไม่ระบุผู้รับผิดชอบ --"
                      options={[
                        { value: "", label: "-- ยังไม่ระบุผู้รับผิดชอบ --" },
                        ...users.map((u) => ({
                          value: u.id,
                          label: u.fullName,
                          subLabel: u.role,
                        })),
                      ]}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-xs font-bold text-[#ff2301] shrink-0">
                          {initialData.responsible?.fullName?.charAt(0) || "S"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#ff2301] truncate">
                            {initialData.responsible?.fullName ||
                              initialData.responsibleName ||
                              "ยังไม่ได้ระบุช่างผู้รับผิดชอบ"}
                          </div>
                          <div className="text-[11px] text-gray-400">ช่างเทคนิคประจำเคส</div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-red-700 px-2.5 py-1 bg-red-50 rounded-md border border-red-200 shrink-0">
                        ผู้รับผิดชอบ
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════
                ROW 3 - RIGHT (Mobile #6, Desktop #6): หมายเหตุภายในและข้อมูลระบบ
                ════════════════════════════════════════════════ */}
            <div className="order-6 lg:order-6 h-full flex flex-col bg-white border border-gray-200 rounded-2xl p-4 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between pb-3.5 sm:pb-4 mb-4 sm:mb-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301] shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">
                      หมายเหตุภายในและข้อมูลระบบ
                    </h2>
                    <p className="text-[11px] sm:text-xs text-gray-500">
                      Internal Notes & System History
                    </p>
                  </div>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg border border-gray-200 shrink-0">
                  ประวัติ
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-between gap-4">
                {/* หมายเหตุภายใน */}
                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    หมายเหตุภายใน (Internal Notes)
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    value={formData.notes}
                    onChange={handleChange}
                    disabled={!canEdit || loading}
                    placeholder="บันทึกข้อความภายใน เช่น เบอร์ติดต่อสำรอง, นัดหมายพิเศษ..."
                    className="w-full flex-1 min-h-[76px] text-base sm:text-sm border border-gray-300 rounded-xl p-3 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all disabled:bg-gray-100 disabled:text-gray-500 resize-y"
                  />
                </div>

                {/* System Audit Timestamps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-[11px] font-semibold text-gray-400">สร้างเอกสารเมื่อ</div>
                    <div className="text-xs font-semibold text-gray-800 mt-0.5">
                      {createdAtFormatted}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-[11px] font-semibold text-gray-400">อัปเดตล่าสุดเมื่อ</div>
                    <div className="text-xs font-semibold text-gray-800 mt-0.5">
                      {updatedAtFormatted}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              FULL-WIDTH ON-SITE REPORT SECTIONS (Parts, Photos, Signatures)
              ════════════════════════════════════════════════════════════════════ */}
          <div className="mt-5 sm:mt-8 space-y-5 sm:space-y-8">
            {/* Card 7: สรุปผลการเข้าหน้างาน & รายการอะไหล่ที่ใช้ (On-Site Resolution & Parts Used) */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301] shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-lg font-bold text-gray-900">
                      สรุปผลการเข้าหน้างานและรายการอะไหล่ที่ใช้ (On-Site Inspection Report)
                    </h2>
                    <p className="text-[11px] sm:text-xs text-gray-500">
                      ข้อมูลส่วนนี้จะถูกนำไปออกเอกสาร &ldquo;ใบรายงานการตรวจสอบและบริการหน้างาน (PDF A4)&rdquo;
                    </p>
                  </div>
                </div>

                {/* Internal Company Switcher for PDF Header */}
                <div className="grid grid-cols-3 sm:flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
                  {[
                    { code: "TG", short: "TG", label: "TG (Tera Group)" },
                    { code: "TE", short: "TE", label: "TE (Tera Electric)" },
                    { code: "TP", short: "TP", label: "TP (Tera Power)" },
                  ].map((comp) => (
                    <button
                      key={comp.code}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          internalCompany: comp.code,
                        }))
                      }
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                        formData.internalCompany === comp.code
                          ? "bg-[#ff2301] text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <span className="sm:hidden">{comp.short}</span>
                      <span className="hidden sm:inline">{comp.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 1: Onsite Date, Serial Number, Site Address */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    วันที่เข้าตรวจสอบ/บริการหน้างาน
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      name="onsiteDate"
                      value={formData.onsiteDate}
                      onChange={handleChange}
                      className="w-full h-12 text-base sm:text-sm border border-gray-300 rounded-xl px-3.5 pl-10 bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    หมายเลขเครื่อง (Serial No. / S/N)
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      name="serialNumber"
                      value={formData.serialNumber}
                      onChange={handleChange}
                      placeholder="ระบุ Serial No. ของเครื่อง (ถ้ามี)..."
                      className="w-full h-12 text-base sm:text-sm font-mono border border-gray-300 rounded-xl px-3.5 pl-10 bg-white text-gray-900 placeholder:font-sans placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    สถานที่หน้างาน / ที่อยู่ลูกค้า
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      name="siteAddress"
                      value={formData.siteAddress}
                      onChange={handleChange}
                      placeholder="ระบุสถานที่ติดตั้งหรือที่อยู่หน้างาน..."
                      className="w-full h-12 text-base sm:text-sm border border-gray-300 rounded-xl px-3.5 pl-10 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301]"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: On-site Resolution Summary */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-700 block">
                  สรุปผลการเข้าตรวจสอบหน้างาน (On-Site Resolution Summary)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  {ONSITE_RESULT_OPTIONS.map((opt) => {
                    const active = formData.onsiteResult === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            onsiteResult: opt.value,
                            status:
                              opt.value === "RESOLVED_ONSITE"
                                ? "System running smoothly"
                                : prev.status,
                          }))
                        }
                        className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                          active
                            ? "bg-red-50/80 border-[#ff2301] text-gray-900 ring-2 ring-red-500/15"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-white"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            active
                              ? "border-[#ff2301] bg-[#ff2301] text-white"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <span className="text-xs font-bold leading-snug">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <input
                    type="text"
                    name="onsiteResultNote"
                    value={formData.onsiteResultNote}
                    onChange={handleChange}
                    placeholder="รายละเอียดสรุปผลเพิ่มเติม (เช่น เลขใบรับซ่อมกรณีนำเครื่องกลับ, กำหนดวันเข้าเปลี่ยนอะไหล่ ฯลฯ)..."
                    className="w-full text-base sm:text-sm border border-gray-300 rounded-xl p-2.5 bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301]"
                  />
                </div>
              </div>

              {/* Row 3: Parts Used Table */}
              <div className="pt-2 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      รายการอะไหล่ / อุปกรณ์ที่เปลี่ยนหรือใช้แก้ไขหน้างาน (Parts &amp; Materials Used)
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      เพิ่มรายการอะไหล่ที่ใช้ในการซ่อมหรือตรวจเช็คหน้างานเพื่อแสดงในใบรายงาน PDF
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPart}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-red-50 text-[#ff2301] hover:bg-red-100 border border-red-200 text-xs font-bold transition-colors self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มรายการอะไหล่</span>
                  </button>
                </div>

                {formData.partsUsed.length > 0 ? (
                  <div className="space-y-2.5">
                    {formData.partsUsed.map((part, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 sm:gap-2.5 items-center bg-gray-50 p-3 rounded-xl border border-gray-200"
                      >
                        <div className="col-span-12 sm:col-span-5">
                          <input
                            type="text"
                            value={part.name}
                            onChange={(e) =>
                              handleUpdatePart(idx, "name", e.target.value)
                            }
                            placeholder="ชื่ออะไหล่ / รหัสอุปกรณ์..."
                            className="w-full text-base sm:text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-[#ff2301]"
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={part.qty}
                            onChange={(e) =>
                              handleUpdatePart(idx, "qty", e.target.value)
                            }
                            placeholder="จำนวน"
                            className="w-full text-base sm:text-sm border border-gray-300 rounded-lg px-2 sm:px-3 py-2 bg-white text-gray-900 text-center focus:outline-none focus:border-[#ff2301]"
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <input
                            type="text"
                            value={part.unit}
                            onChange={(e) =>
                              handleUpdatePart(idx, "unit", e.target.value)
                            }
                            placeholder="หน่วย"
                            className="w-full text-base sm:text-sm border border-gray-300 rounded-lg px-2 sm:px-3 py-2 bg-white text-gray-900 text-center focus:outline-none focus:border-[#ff2301]"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <input
                            type="text"
                            value={part.note}
                            onChange={(e) =>
                              handleUpdatePart(idx, "note", e.target.value)
                            }
                            placeholder="หมายเหตุ"
                            className="w-full text-base sm:text-sm border border-gray-300 rounded-lg px-2.5 sm:px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-[#ff2301]"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemovePart(idx)}
                            className="p-2.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 text-center text-xs text-gray-400">
                    ยังไม่มีรายการอะไหล่ที่เปลี่ยน (กด &ldquo;+ เพิ่มรายการอะไหล่&rdquo; หากมีการเปลี่ยนอะไหล่หน้างาน)
                  </div>
                )}
              </div>
            </div>

            {/* Card 8: รูปถ่ายหน้างาน ก่อนแก้ไข & หลังแก้ไข (Before & After Photos) */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301] shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-bold text-gray-900">
                    รูปถ่ายหน้างาน ก่อนแก้ไข &amp; หลังแก้ไข (Before / After Photos)
                  </h2>
                  <p className="text-[11px] sm:text-xs text-gray-500">
                    แนบรูปถ่ายหน้างานฝั่งละไม่เกิน 2 รูป เพื่อแสดงในใบรายงานการตรวจสอบและบริการหน้างาน (PDF)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Before Photos */}
                <div className="p-3.5 sm:p-4 rounded-2xl border border-red-100 bg-red-50/20 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff2301] shrink-0" />
                      <span>รูปถ่ายก่อนแก้ไข / จุดที่พบปัญหา</span>
                    </label>
                    <span className="text-[11px] font-semibold text-[#ff2301] bg-red-50 px-2 py-0.5 rounded-full shrink-0">
                      {formData.photosBefore.length} / 2 รูป
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {[0, 1].map((idx) => {
                      const photoUrl = formData.photosBefore[idx];
                      return (
                        <div
                          key={`before-slot-${idx}`}
                          className="relative aspect-[4/3] min-h-[125px] sm:min-h-[140px] rounded-xl border border-dashed border-gray-300 bg-white flex flex-col items-center justify-center overflow-hidden group hover:border-[#ff2301] transition-all shadow-sm"
                        >
                          {photoUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photoUrl}
                                alt={`ก่อนแก้ไข #${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx, "before")}
                                className="absolute top-1.5 right-1.5 p-2 sm:p-1.5 rounded-lg bg-red-600/90 text-white hover:bg-red-700 transition-all shadow-md"
                                title="ลบรูปนี้"
                              >
                                <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                              </button>
                            </>
                          ) : (
                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-2 hover:bg-red-50/40 transition-colors">
                              <Upload className="w-5 h-5 text-gray-400 mb-1 group-hover:text-[#ff2301] transition-colors" />
                              <span className="text-[11px] sm:text-[10px] font-bold text-gray-500 group-hover:text-[#ff2301] text-center">
                                {isUploadingBefore
                                  ? "กำลังอัปโหลด..."
                                  : `+ รูปก่อนแก้ไข #${idx + 1}`}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isUploadingBefore}
                                onChange={(e) => handleUploadPhoto(e, "before")}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* After Photos */}
                <div className="p-3.5 sm:p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>รูปถ่ายหลังแก้ไข / ทดสอบการทำงาน</span>
                    </label>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                      {formData.photosAfter.length} / 2 รูป
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {[0, 1].map((idx) => {
                      const photoUrl = formData.photosAfter[idx];
                      return (
                        <div
                          key={`after-slot-${idx}`}
                          className="relative aspect-[4/3] min-h-[125px] sm:min-h-[140px] rounded-xl border border-dashed border-gray-300 bg-white flex flex-col items-center justify-center overflow-hidden group hover:border-emerald-500 transition-all shadow-sm"
                        >
                          {photoUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photoUrl}
                                alt={`หลังแก้ไข #${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx, "after")}
                                className="absolute top-1.5 right-1.5 p-2 sm:p-1.5 rounded-lg bg-red-600/90 text-white hover:bg-red-700 transition-all shadow-md"
                                title="ลบรูปนี้"
                              >
                                <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                              </button>
                            </>
                          ) : (
                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-2 hover:bg-emerald-50/40 transition-colors">
                              <Upload className="w-5 h-5 text-gray-400 mb-1 group-hover:text-emerald-600 transition-colors" />
                              <span className="text-[11px] sm:text-[10px] font-bold text-gray-500 group-hover:text-emerald-700 text-center">
                                {isUploadingAfter
                                  ? "กำลังอัปโหลด..."
                                  : `+ รูปหลังแก้ไข #${idx + 1}`}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isUploadingAfter}
                                onChange={(e) => handleUploadPhoto(e, "after")}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 9: ลงลายมือชื่อช่างผู้ให้บริการและลูกค้าผู้รับบริการ (Digital Signatures) */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301] shrink-0">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-bold text-gray-900">
                    ลงลายมือชื่อผู้ให้บริการและลูกค้าผู้รับบริการ (Digital Signatures)
                  </h2>
                  <p className="text-[11px] sm:text-xs text-gray-500">
                    ใช้นิ้ว ปากกาสไตลัส หรือเมาส์เซ็นชื่อในกรอบด้านล่าง หรืออัปโหลดรูปลายเซ็นเพื่อแสดงบนใบรายงาน PDF
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                <div className="space-y-3">
                  <SignaturePadBox
                    title="1. ลายเซ็นช่าง/วิศวกรผู้ให้บริการ"
                    subtitle="สำหรับเจ้าหน้าที่เซอร์วิสหรือช่างผู้เข้าหน้างาน"
                    signerNameLabel="ลงชื่อตัวบรรจง (ช่างผู้ให้บริการ)"
                    signerNamePlaceholder="ระบุชื่อ-นามสกุล ช่างผู้ให้บริการ..."
                    signerName={formData.nameTechnician}
                    onSignerNameChange={(val) =>
                      setFormData((prev) => ({ ...prev, nameTechnician: val }))
                    }
                    signatureUrl={formData.sigTechnicianUrl}
                    onSignatureChange={(dataUrl) =>
                      setFormData((prev) => ({
                        ...prev,
                        sigTechnicianUrl: dataUrl,
                      }))
                    }
                    accentColor="red"
                  />
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 sm:p-4">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      เบอร์โทรศัพท์ช่างผู้ให้บริการ
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      name="technicianPhone"
                      value={formData.technicianPhone}
                      onChange={handleChange}
                      placeholder="ระบุเบอร์โทรช่างผู้ให้บริการ..."
                      className="w-full px-3.5 py-2.5 bg-white text-base sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff2301] text-gray-900"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <SignaturePadBox
                    title="2. ลายเซ็นลูกค้า / ผู้รับบริการ"
                    subtitle="สำหรับลูกค้าหรือตัวแทนผู้ตรวจรับบริการหน้างาน"
                    signerNameLabel="ลงชื่อตัวบรรจง (ลูกค้าผู้รับบริการ)"
                    signerNamePlaceholder="ระบุชื่อ-นามสกุล ลูกค้าผู้รับบริการ..."
                    signerName={formData.nameCustomer}
                    onSignerNameChange={(val) =>
                      setFormData((prev) => ({ ...prev, nameCustomer: val }))
                    }
                    signatureUrl={formData.sigCustomerUrl}
                    onSignatureChange={(dataUrl) =>
                      setFormData((prev) => ({
                        ...prev,
                        sigCustomerUrl: dataUrl,
                      }))
                    }
                    accentColor="emerald"
                  />
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 sm:p-4">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      ตำแหน่งผู้รับบริการ (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      name="customerPosition"
                      value={formData.customerPosition}
                      onChange={handleChange}
                      placeholder="เช่น วิศวกรประจำโรงงาน, หัวหน้าช่าง, เจ้าของกิจการ..."
                      className="w-full px-3.5 py-2.5 bg-white text-base sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-600 text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sticky Symmetrical Bottom Action Bar (Non-colliding with Mobile Menu Button & Desktop Sidebar) ── */}
          <div className="fixed bottom-0 left-0 right-0 z-30 md:sticky md:bottom-4 md:mt-8 bg-white/95 backdrop-blur-md border-t md:border border-gray-200/90 md:rounded-2xl shadow-2xl min-h-[84px] md:min-h-0 flex items-center pl-[80px] pr-4 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:py-3.5 print:hidden">
            <div className="w-full flex items-center justify-between gap-2 md:gap-4">
              {/* Left Side: Status / Dirty status (Desktop) */}
              <div className="hidden lg:flex items-center gap-3 text-xs text-gray-600">
                <Link
                  href="/service/calls"
                  className="inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-[#ff2301] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>กลับหน้ารายการเคส</span>
                </Link>

                <span className="text-gray-300">|</span>

                {isDirty ? (
                  <span className="inline-flex items-center gap-1.5 text-amber-600 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    มีการแก้ไขข้อมูลที่ยังไม่ได้บันทึก
                  </span>
                ) : (
                  <span className="text-gray-400">ข้อมูลเป็นปัจจุบันแล้ว</span>
                )}
              </div>

              {/* Right Side: Action Buttons */}
              <div className="flex items-center gap-2 md:gap-3 w-full lg:w-auto justify-end">
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={!isDirty || loading}
                    title="คืนค่าเดิม"
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 md:px-4 h-11 md:h-10 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 rounded-xl transition-all shrink-0"
                  >
                    <RotateCcw className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    <span className="hidden sm:inline">คืนค่าเดิม</span>
                  </button>
                )}

                {canEdit ? (
                  <>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 h-11 md:h-10 text-xs sm:text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 rounded-xl shadow-sm transition-all"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 shrink-0" />
                      )}
                      <span>บันทึก<span className="hidden sm:inline">ข้อมูล</span></span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSaveData(true)}
                      className="flex-[1.3] sm:flex-none inline-flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 h-11 md:h-10 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] disabled:opacity-50 rounded-xl shadow-md shadow-red-500/20 transition-all"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4 shrink-0" />
                      )}
                      <span className="sm:hidden">บันทึก + PDF</span>
                      <span className="hidden sm:inline">บันทึก + ออกใบรายงาน PDF</span>
                    </button>
                  </>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 sm:px-4 h-11 md:h-10 text-xs font-medium text-gray-500 bg-gray-100 rounded-xl border border-gray-200">
                    <Lock className="w-3.5 h-3.5 text-gray-400" />
                    <span>โหมดอ่านอย่างเดียว</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
