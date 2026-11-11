"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import {
  FileSignature,
  X,
  RotateCcw,
  Check,
  Upload,
  Printer,
  Save,
  Loader2,
  UserCheck,
  Wrench,
  PenTool,
} from "lucide-react";
import { updateRepairDelivery } from "@/app/actions/repairDeliveries";
import { getServiceUsers } from "@/app/actions/service-calls";
import {
  SearchableSalesSelect,
  type SalesUserOption,
} from "@/app/service/calls/ServiceCallSignatureModal";

export interface SignaturePadBoxProps {
  title: string;
  subtitle: string;
  signerNameLabel: string;
  signerNamePlaceholder: string;
  signerName: string;
  onSignerNameChange: (val: string) => void;
  signatureUrl: string | null;
  onSignatureChange: (dataUrl: string | null) => void;
  accentColor?: "red" | "emerald";
  extraField?: React.ReactNode;
}

export function SignaturePadBox({
  title,
  subtitle,
  signerNameLabel,
  signerNamePlaceholder,
  signerName,
  onSignerNameChange,
  signatureUrl,
  onSignatureChange,
  accentColor = "red",
  extraField,
}: SignaturePadBoxProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditingCanvas, setIsEditingCanvas] = useState(!signatureUrl);
  const [hasDrawnStroke, setHasDrawnStroke] = useState(false);

  useEffect(() => {
    setIsEditingCanvas(!signatureUrl);
    setHasDrawnStroke(false);
  }, [signatureUrl]);

  const initCanvas = useCallback((preserveExisting = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    let snapshotUrl: string | null = null;
    if (preserveExisting && canvas.width > 0 && canvas.height > 0) {
      try {
        snapshotUrl = canvas.toDataURL("image/png");
      } catch {
        snapshotUrl = null;
      }
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = "#111827";

      if (snapshotUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = snapshotUrl;
      }
    }
  }, []);

  useEffect(() => {
    if (!isEditingCanvas) return;
    const timer = setTimeout(() => initCanvas(false), 40);

    const handleResize = () => {
      initCanvas(hasDrawnStroke);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [isEditingCanvas, initCanvas, hasDrawnStroke]);

  const getCoordinates = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawnStroke(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const dataUrl = canvas.toDataURL("image/png");
    onSignatureChange(dataUrl);
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawnStroke(false);
    onSignatureChange(null);
    setIsEditingCanvas(true);
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onSignatureChange(reader.result);
        setIsEditingCanvas(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const isEmerald = accentColor === "emerald";

  return (
    <div
      className={`p-3.5 sm:p-5 rounded-2xl border space-y-3.5 sm:space-y-4 ${
        isEmerald
          ? "border-emerald-200/90 bg-emerald-50/20"
          : "border-red-200/90 bg-red-50/20"
      }`}
    >
      {/* Box Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isEmerald
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-[#ff2301]"
            }`}
          >
            {isEmerald ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <Wrench className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-gray-900 leading-snug">{title}</h3>
            <p className="text-[11px] text-gray-500 font-medium">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <label
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-lg bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 text-xs sm:text-[11px] font-bold text-gray-700 cursor-pointer transition-all shadow-2xs"
            title="อัปโหลดรูปลายเซ็น"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>อัปโหลดรูป</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleClearCanvas}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-lg bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-95 text-xs sm:text-[11px] font-bold text-gray-700 transition-all shadow-2xs"
            title="ล้างลายเซ็น"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ล้างลายเซ็น</span>
          </button>
        </div>
      </div>

      {/* Canvas or Existing Signature Preview */}
      {!isEditingCanvas && signatureUrl ? (
        <div className="relative h-44 sm:h-40 w-full rounded-xl border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center p-3 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signatureUrl}
            alt={title}
            className="max-h-28 max-w-full object-contain"
          />
          <div className="mt-2.5 flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-xs sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Check className="w-3.5 h-3.5" /> มีลายเซ็นแล้ว
            </span>
            <button
              type="button"
              onClick={() => {
                onSignatureChange(null);
                setIsEditingCanvas(true);
              }}
              className="text-xs sm:text-[11px] font-bold text-[#ff2301] hover:underline flex items-center gap-1 py-1 px-2 rounded-lg active:bg-red-50"
            >
              <PenTool className="w-3.5 h-3.5" /> เซ็นใหม่
            </button>
          </div>
        </div>
      ) : (
        <div className="relative h-48 sm:h-40 w-full rounded-xl border-2 border-dashed border-gray-300 bg-white overflow-hidden shadow-inner select-none">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
            style={{ touchAction: "none" }}
            className="w-full h-full cursor-crosshair touch-none select-none block"
          />
          {!hasDrawnStroke && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-gray-400 select-none px-4 text-center">
              <FileSignature className="w-6 h-6 mb-1.5 opacity-50" />
              <span className="text-xs font-semibold">
                ใช้นิ้ววาดลายเซ็นในกรอบนี้ได้เลย
              </span>
            </div>
          )}
        </div>
      )}

      {/* Printed Name Input */}
      <div className="space-y-3 pt-1">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {signerNameLabel}
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => onSignerNameChange(e.target.value)}
            placeholder={signerNamePlaceholder}
            className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] font-medium text-gray-900"
          />
        </div>
        {extraField}
      </div>
    </div>
  );
}

interface SignaturePadModalProps {
  isOpen: boolean;
  item: any | null;
  onClose: () => void;
  onSaved: (updatedFields: {
    id: string;
    sigSenderUrl: string | null;
    nameSender: string;
    sigReceiverUrl: string | null;
    nameReceiver: string;
    customerPosition: string;
    status: string;
  }) => void;
}

export default function SignaturePadModal({
  isOpen,
  item,
  onClose,
  onSaved,
}: SignaturePadModalProps) {
  const [sigSenderUrl, setSigSenderUrl] = useState<string | null>(null);
  const [nameSender, setNameSender] = useState("");
  const [sigReceiverUrl, setSigReceiverUrl] = useState<string | null>(null);
  const [nameReceiver, setNameReceiver] = useState("");
  const [customerPosition, setCustomerPosition] = useState("");
  const [markCompleted, setMarkCompleted] = useState(true);
  const [salesUsers, setSalesUsers] = useState<SalesUserOption[]>([]);
  const [selectedSalesId, setSelectedSalesId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getServiceUsers()
      .then((list) => {
        setSalesUsers(list || []);
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !item) return;
    setSigSenderUrl(item.sigSenderUrl || null);
    setNameSender(
      item.nameSender || item.technician || item.sender || ""
    );
    setSigReceiverUrl(item.sigReceiverUrl || null);
    setNameReceiver(item.nameReceiver || item.customer || "");
    setCustomerPosition(item.customerPosition || "");
    setMarkCompleted(true);
    if (item.salespersonId) {
      setSelectedSalesId(item.salespersonId);
    } else if (item.sender && salesUsers.length > 0) {
      const matched = salesUsers.find(
        (u) => u.fullName.trim().toLowerCase() === String(item.sender).trim().toLowerCase()
      );
      setSelectedSalesId(matched?.id || "");
    } else {
      setSelectedSalesId("");
    }
  }, [isOpen, item, salesUsers]);

  if (!isOpen || !item) return null;

  const handleSaveSignatures = async (openPdfAfter = false) => {
    if (!sigSenderUrl && !sigReceiverUrl) {
      Swal.fire({
        icon: "warning",
        title: "ยังไม่มีลายเซ็น",
        text: "กรุณาเซ็นลายเซ็นผู้ส่งมอบงาน หรือ ผู้รับมอบงาน อย่างน้อย 1 ช่องก่อนบันทึก",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setIsSaving(true);
    try {
      const nextStatus = markCompleted ? "Completed" : item.status || "Draft";
      const chosenSales = salesUsers.find((u) => u.id === selectedSalesId);
      const payload: any = {
        sigSenderUrl,
        nameSender: nameSender.trim(),
        sigReceiverUrl,
        nameReceiver: nameReceiver.trim(),
        customerPosition: customerPosition.trim(),
        status: nextStatus,
        salespersonId: selectedSalesId || item.salespersonId || null,
        ...(chosenSales ? { sender: chosenSales.fullName } : {}),
      };

      const res = await updateRepairDelivery(item.id, payload);
      if (res.success) {
        onSaved({
          id: item.id,
          ...payload,
        });

        await Swal.fire({
          icon: "success",
          title: "บันทึกลายเซ็นเรียบร้อย",
          text: `ใบส่งมอบงานเลขที่ ${item.deliveryNumber} บันทึกลายเซ็นสำเร็จแล้ว`,
          timer: 1400,
          showConfirmButton: false,
        });

        if (openPdfAfter) {
          window.open(`/repair-deliveries/${item.id}/pdf`, "_blank");
        }
        onClose();
      } else {
        Swal.fire({
          icon: "error",
          title: "บันทึกไม่สำเร็จ",
          text: res.error || "ไม่สามารถบันทึกลายเซ็นได้",
          confirmButtonColor: "#ff2301",
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "ไม่สามารถบันทึกลายเซ็นได้",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-4xl w-full h-[96dvh] sm:h-auto sm:max-h-[92vh] flex flex-col border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-[#ff2301] to-[#d91d00] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <FileSignature className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-extrabold tracking-tight truncate">
                ลงลายมือชื่อ ({item.deliveryNumber})
              </h2>
              <p className="text-[11px] sm:text-xs text-red-100 truncate">
                ลูกค้า: {item.customer || item.company || "-"} • งาน:{" "}
                {item.jobName || "-"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* 1. Sender Signature */}
            <SignaturePadBox
              title="1. ลายเซ็นผู้ส่งมอบงาน (เจ้าหน้าที่ / ช่าง)"
              subtitle="สำหรับช่างผู้ปฏิบัติงานหรือตัวแทนบริษัท"
              signerNameLabel="ลงชื่อตัวบรรจง (ผู้ส่งมอบงาน)"
              signerNamePlaceholder="ระบุชื่อ-นามสกุล ผู้ส่งมอบงาน..."
              signerName={nameSender}
              onSignerNameChange={setNameSender}
              signatureUrl={sigSenderUrl}
              onSignatureChange={setSigSenderUrl}
              accentColor="red"
            />

            {/* 2. Receiver Signature */}
            <SignaturePadBox
              title="2. ลายเซ็นผู้รับมอบงาน (ลูกค้า)"
              subtitle="สำหรับลูกค้าหรือผู้ตรวจรับมอบงาน"
              signerNameLabel="ลงชื่อตัวบรรจง (ผู้รับมอบงาน)"
              signerNamePlaceholder="ระบุชื่อ-นามสกุล ลูกค้าผู้รับมอบงาน..."
              signerName={nameReceiver}
              onSignerNameChange={setNameReceiver}
              signatureUrl={sigReceiverUrl}
              onSignatureChange={setSigReceiverUrl}
              accentColor="emerald"
              extraField={
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ตำแหน่งผู้รับมอบ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={customerPosition}
                    onChange={(e) => setCustomerPosition(e.target.value)}
                    placeholder="เช่น ผู้จัดการฝ่ายวิศวกรรม / เจ้าของกิจการ..."
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium text-gray-900"
                  />
                </div>
              }
            />
          </div>

          {/* Status Auto-Complete Option & Salesperson Notification */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3.5 sm:space-y-4">
            <label className="flex items-start sm:items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={markCompleted}
                onChange={(e) => setMarkCompleted(e.target.checked)}
                className="w-5 h-5 sm:w-4 sm:h-4 mt-0.5 sm:mt-0 text-[#ff2301] rounded border-gray-300 focus:ring-red-500 shrink-0"
              />
              <div className="text-xs leading-relaxed">
                <span className="font-bold text-gray-900">
                  เปลี่ยนสถานะเอกสารเป็น &ldquo;ส่งมอบแล้ว (Completed)&rdquo; และส่งข้อมูลแจ้งให้เซลล์รับรู้ทันที
                </span>
                <span className="text-gray-500 block mt-0.5">
                  เมื่อเซอร์วิสและลูกค้าเซ็นเสร็จ ข้อมูลจะถูกส่งไปยังหน้า &ldquo;ใบส่งมอบงานที่เซ็นแล้ว (เซลล์รับทราบ)&rdquo; โดยอัตโนมัติ
                </span>
              </div>
            </label>

            {salesUsers.length > 0 && (
              <div className="pt-3 border-t border-gray-200/80">
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  เลือกเซลล์ผู้รับผิดชอบเพื่อส่งข้อมูลให้รับทราบ (พิมพ์ชื่อค้นหาได้)
                </label>
                <SearchableSalesSelect
                  users={salesUsers}
                  value={selectedSalesId}
                  onChange={setSelectedSalesId}
                  disabled={isSaving}
                  placeholder="พิมพ์ค้นหาชื่อเซลล์ หรือ (ชื่อเล่น)..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto min-h-[42px] px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 transition-colors"
          >
            ยกเลิก
          </button>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSaveSignatures(false)}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] px-3 sm:px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Save className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">บันทึกลายเซ็น</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveSignatures(true)}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] px-3 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Printer className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">บันทึก + PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

