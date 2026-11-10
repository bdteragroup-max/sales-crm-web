"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  FileSignature,
  Save,
  Printer,
  Loader2,
  CheckCircle2,
  Search,
  ChevronDown,
  Check,
  UserCheck,
} from "lucide-react";
import Swal from "sweetalert2";
import { SignaturePadBox } from "@/app/repair-deliveries/SignaturePadModal";
import { updateServiceCallLog } from "@/app/actions/service-calls";

export interface SalesUserOption {
  id: string;
  fullName: string;
  role?: string;
  nickname?: string | null;
}

interface SearchableSalesSelectProps {
  users: SalesUserOption[];
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SearchableSalesSelect({
  users,
  value,
  onChange,
  disabled = false,
  placeholder = "พิมพ์ค้นหาชื่อ-นามสกุล, (ชื่อเล่น) หรือตำแหน่งเซลล์...",
}: SearchableSalesSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === value) || null,
    [users, value]
  );

  const groupedFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
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

    const matchUser = (u: SalesUserOption) => {
      if (!q) return true;
      const full = (u.fullName || "").toLowerCase();
      const nick = (u.nickname || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      return full.includes(q) || nick.includes(q) || role.includes(q);
    };

    const filtered = users.filter(matchUser);
    return {
      sales: filtered.filter((u) => isSalesRole(u.role)),
      others: filtered.filter((u) => !isSalesRole(u.role)),
      total: filtered.length,
    };
  }, [users, searchQuery]);

  const formatUserLabel = (u: SalesUserOption) => {
    return `${u.fullName}${u.nickname ? ` (${u.nickname})` : ""}${
      u.role ? ` — ${u.role}` : ""
    }`;
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`relative flex items-center w-full rounded-xl border transition-all ${
          disabled
            ? "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"
            : isOpen
            ? "bg-white border-[#ff2301] ring-4 ring-red-500/10"
            : "bg-white border-gray-300 hover:border-gray-400"
        }`}
      >
        <div className="pl-3.5 pr-2 text-gray-400 flex items-center pointer-events-none">
          {selectedUser && !isOpen ? (
            <UserCheck className="w-4 h-4 text-[#ff2301]" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={
            isOpen
              ? searchQuery
              : selectedUser
              ? formatUserLabel(selectedUser)
              : ""
          }
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setSearchQuery("");
            }
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={
            selectedUser ? formatUserLabel(selectedUser) : placeholder
          }
          className={`w-full py-2.5 pr-16 text-sm bg-transparent focus:outline-none ${
            selectedUser && !isOpen
              ? "font-bold text-gray-900"
              : "font-medium text-gray-900 placeholder:text-gray-400"
          }`}
        />

        <div className="absolute right-2 flex items-center gap-1">
          {(value || searchQuery) && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearchQuery("");
                inputRef.current?.focus();
              }}
              title="ล้างค่าที่เลือก"
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setIsOpen((prev) => {
                const next = !prev;
                if (next) {
                  setTimeout(() => inputRef.current?.focus(), 0);
                } else {
                  setSearchQuery("");
                }
                return next;
              });
            }}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                isOpen ? "rotate-180 text-[#ff2301]" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-100">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
              setSearchQuery("");
            }}
            className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between transition-colors ${
              !value
                ? "bg-red-50/70 text-[#ff2301]"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <span>-- ยังไม่ระบุเซลล์ / ไม่ต้องเปิดใบเสนอราคา --</span>
            {!value && <Check className="w-4 h-4 text-[#ff2301]" />}
          </button>

          {groupedFiltered.total === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400">
              ไม่พบรายชื่อที่ค้นหา &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <>
              {groupedFiltered.sales.length > 0 && (
                <div className="py-1">
                  <div className="px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#ff2301] bg-red-50/50">
                    ฝ่ายขาย / ผู้จัดการ (Sales &amp; Managers) ({groupedFiltered.sales.length})
                  </div>
                  {groupedFiltered.sales.map((u) => {
                    const isSelected = u.id === value;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          onChange(u.id);
                          setIsOpen(false);
                          setSearchQuery("");
                        }}
                        className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? "bg-red-50 text-[#ff2301] font-bold"
                            : "text-gray-800 hover:bg-gray-50 font-medium"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="truncate">{u.fullName}</span>
                          {u.nickname && (
                            <span className="text-[#ff2301] font-bold">
                              ({u.nickname})
                            </span>
                          )}
                          {u.role && (
                            <span className="text-[11px] text-gray-400 font-normal">
                              — {u.role}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#ff2301] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {groupedFiltered.others.length > 0 && (
                <div className="py-1">
                  <div className="px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-gray-500 bg-gray-50">
                    พนักงานแผนกอื่นๆ ({groupedFiltered.others.length})
                  </div>
                  {groupedFiltered.others.map((u) => {
                    const isSelected = u.id === value;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          onChange(u.id);
                          setIsOpen(false);
                          setSearchQuery("");
                        }}
                        className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? "bg-red-50 text-[#ff2301] font-bold"
                            : "text-gray-700 hover:bg-gray-50 font-medium"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="truncate">{u.fullName}</span>
                          {u.nickname && (
                            <span className="text-gray-900 font-bold">
                              ({u.nickname})
                            </span>
                          )}
                          {u.role && (
                            <span className="text-[11px] text-gray-400 font-normal">
                              — {u.role}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#ff2301] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export const ONSITE_RESULT_OPTIONS = [
  {
    value: "RESOLVED_ONSITE",
    label: "แก้ไขสำเร็จหน้างาน ระบบทำงานปกติ",
  },
  {
    value: "BRING_BACK_REPAIR",
    label: "ต้องนำเครื่องกลับเข้าศูนย์บริการเพื่อซ่อม",
  },
  {
    value: "WAITING_PARTS_QUOTE",
    label: "รอเสนอราคาอะไหล่ / รออะไหล่เข้าเปลี่ยน",
  },
  {
    value: "FOLLOW_UP_NEEDED",
    label: "รอติดตามอาการ / ลูกค้าปรับปรุงระบบหน้างาน",
  },
];

interface ServiceCallSignatureModalProps {
  callLog: any;
  users?: Array<{ id: string; fullName: string; role?: string; nickname?: string | null }>;
  onClose: () => void;
  onSaved: (updatedFields: any) => void;
}

export default function ServiceCallSignatureModal({
  callLog,
  users = [],
  onClose,
  onSaved,
}: ServiceCallSignatureModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const [nameTechnician, setNameTechnician] = useState(
    callLog.nameTechnician ||
      callLog.responsible?.fullName ||
      callLog.responsibleName ||
      ""
  );
  const [sigTechnicianUrl, setSigTechnicianUrl] = useState<string | null>(
    callLog.sigTechnicianUrl || null
  );
  const [technicianPhone, setTechnicianPhone] = useState(
    callLog.technicianPhone || ""
  );

  const [nameCustomer, setNameCustomer] = useState(
    callLog.nameCustomer || callLog.contactName || ""
  );
  const [customerPosition, setCustomerPosition] = useState(
    callLog.customerPosition || ""
  );
  const [sigCustomerUrl, setSigCustomerUrl] = useState<string | null>(
    callLog.sigCustomerUrl || null
  );

  const [onsiteResult, setOnsiteResult] = useState<string>(
    callLog.onsiteResult || "RESOLVED_ONSITE"
  );
  const [markClosed, setMarkClosed] = useState<boolean>(
    callLog.status === "System running smoothly" || true
  );
  const [assignedSalesId, setAssignedSalesId] = useState<string>(
    callLog.assignedSalesId || ""
  );

  const salesAndAllUsers = React.useMemo(() => {
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

  const handleSave = async (openPdfAfter = false) => {
    setIsSaving(true);
    try {
      const nextStatus = markClosed
        ? "System running smoothly"
        : callLog.status || "Received notification";

      const selectedSalesUser = users.find((u) => u.id === assignedSalesId);

      const payload = {
        status: nextStatus,
        onsiteDate: callLog.onsiteDate
          ? new Date(callLog.onsiteDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        onsiteResult,
        nameTechnician: nameTechnician.trim() || null,
        technicianPhone: technicianPhone.trim() || null,
        sigTechnicianUrl,
        nameCustomer: nameCustomer.trim() || null,
        customerPosition: customerPosition.trim() || null,
        sigCustomerUrl,
        assignedSalesId: assignedSalesId || null,
        assignedSalesName: selectedSalesUser?.fullName || null,
      };

      await updateServiceCallLog(callLog.id, payload);

      onSaved(payload);

      await Swal.fire({
        icon: "success",
        title: "บันทึกลายเซ็นเรียบร้อย",
        text: "บันทึกข้อมูลลายเซ็นและสรุปผลหน้างานสำเร็จแล้ว",
        timer: 1300,
        showConfirmButton: false,
      });

      if (openPdfAfter) {
        window.open(`/service/calls/${callLog.id}/pdf`, "_blank");
      }
      onClose();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถบันทึกลายเซ็นได้",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => !isSaving && onClose()}
      />

      <div className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] text-white flex items-center justify-center shadow-md shadow-red-500/20">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900">
                  เซ็นรับรองการเข้าตรวจสอบและบริการหน้างาน
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-50 text-[#ff2301] border border-red-200">
                  {callLog.caseNumber}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                ลูกค้า: <strong className="text-gray-800">{callLog.companyName}</strong> ({callLog.contactName}) • รุ่น {callLog.inverterModel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-gray-50/50">
          {/* Quick On-site Result Selector */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <label className="block text-xs font-bold text-gray-700 mb-2">
              สรุปผลการเข้าตรวจสอบหน้างาน (On-Site Resolution)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ONSITE_RESULT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOnsiteResult(opt.value)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                    onsiteResult === opt.value
                      ? "bg-red-50 border-[#ff2301] text-gray-900 ring-2 ring-red-500/15"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-white"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      onsiteResult === opt.value
                        ? "border-[#ff2301] bg-[#ff2301] text-white"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {onsiteResult === opt.value && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2 Signature Pads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <SignaturePadBox
                title="1. ลายเซ็นช่าง/วิศวกรผู้ให้บริการ"
                subtitle="สำหรับเจ้าหน้าที่เซอร์วิสหรือช่างผู้เข้าหน้างาน"
                signerNameLabel="ลงชื่อตัวบรรจง (ช่างผู้ให้บริการ)"
                signerNamePlaceholder="ระบุชื่อ-นามสกุล ช่างผู้ให้บริการ..."
                signerName={nameTechnician}
                onSignerNameChange={setNameTechnician}
                signatureUrl={sigTechnicianUrl}
                onSignatureChange={setSigTechnicianUrl}
                accentColor="red"
              />
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  เบอร์โทรศัพท์ช่างผู้ให้บริการ
                </label>
                <input
                  type="text"
                  value={technicianPhone}
                  onChange={(e) => setTechnicianPhone(e.target.value)}
                  placeholder="ระบุเบอร์โทรช่าง..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 focus:bg-white text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900"
                />
              </div>
            </div>

            <div className="space-y-3">
              <SignaturePadBox
                title="2. ลายเซ็นลูกค้า / ผู้รับบริการ"
                subtitle="สำหรับลูกค้าหรือตัวแทนผู้รับบริการหน้างาน"
                signerNameLabel="ลงชื่อตัวบรรจง (ลูกค้าผู้รับบริการ)"
                signerNamePlaceholder="ระบุชื่อ-นามสกุล ลูกค้าผู้รับบริการ..."
                signerName={nameCustomer}
                onSignerNameChange={setNameCustomer}
                signatureUrl={sigCustomerUrl}
                onSignatureChange={setSigCustomerUrl}
                accentColor="emerald"
              />
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  ตำแหน่งผู้รับบริการ (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={customerPosition}
                  onChange={(e) => setCustomerPosition(e.target.value)}
                  placeholder="เช่น วิศวกรประจำโรงงาน, ผู้ดูแลระบบ, เจ้าของกิจการ..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 focus:bg-white text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Auto-close checkbox & Assign Salesperson for Quotation */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={markClosed}
                onChange={(e) => setMarkClosed(e.target.checked)}
                className="w-4 h-4 accent-[#ff2301] rounded"
              />
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  เปลี่ยนสถานะเคสเป็น &ldquo;ปิดเคสแล้ว (ระบบทำงานปกติ)&rdquo; พร้อมบันทึกวันที่เข้าบริการวันนี้
                </span>
              </div>
            </label>

            {users.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  เลือกเซลล์สำหรับรับเรื่องไปเปิดใบเสนอราคาต่อ (สามารถพิมพ์ชื่อค้นหาได้)
                </label>
                <SearchableSalesSelect
                  users={users}
                  value={assignedSalesId}
                  onChange={setAssignedSalesId}
                  disabled={isSaving}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  เมื่อเซลล์เปิดใบเสนอราคาเสร็จสิ้น ข้อมูลเคสนี้พร้อมรูปถ่ายหน้างานและลายเซ็นจะถูกส่งไปสร้าง <b>ใบส่งมอบงาน (Repair Delivery)</b> โดยอัตโนมัติ
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-gray-400">
            ลายเซ็นและสรุปผลจะถูกแสดงในใบรายงานการตรวจสอบและบริการหน้างาน (PDF A4) ทันที
          </span>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>บันทึกลายเซ็น</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-bold shadow-md shadow-red-500/25 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>บันทึก &amp; เปิดใบรายงาน PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

