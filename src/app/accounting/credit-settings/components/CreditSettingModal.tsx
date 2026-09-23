"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Banknote,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Ban,
  AlertCircle
} from "lucide-react";
import {
  CustomerCreditSettingDTO,
  saveCustomerCreditSetting,
  searchCustomerAutocomplete
} from "@/app/actions/accountingCredit";
import Swal from "sweetalert2";

interface CreditSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: CustomerCreditSettingDTO | null;
  onSuccess: () => void;
}

export default function CreditSettingModal({
  isOpen,
  onClose,
  initialData,
  onSuccess
}: CreditSettingModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [creditLimit, setCreditLimit] = useState<number>(1000000);
  const [creditTermsDays, setCreditTermsDays] = useState<number>(30);
  const [creditStatus, setCreditStatus] = useState<string>("ACTIVE");
  const [billingCycleRule, setBillingCycleRule] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<Array<{ name: string; taxId: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialData) {
      setCustomerName(initialData.customerName || "");
      setTaxId(initialData.taxId || "");
      setCreditLimit(
        initialData.creditLimit ||
          (initialData.totalExposure ? Math.max(initialData.totalExposure, 1000000) : 1000000)
      );
      setCreditTermsDays(initialData.creditTermsDays || 30);
      setCreditStatus(
        initialData.creditStatus && initialData.creditStatus !== "PENDING_SETUP"
          ? initialData.creditStatus
          : "ACTIVE"
      );
      setBillingCycleRule(initialData.billingCycleRule || "");
      setNotes(initialData.notes || "");
    } else {
      setCustomerName("");
      setTaxId("");
      setCreditLimit(1000000);
      setCreditTermsDays(30);
      setCreditStatus("ACTIVE");
      setBillingCycleRule("");
      setNotes("");
    }
  }, [initialData, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerName(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.trim().length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await searchCustomerAutocomplete(val);
          setSuggestions(res);
          setShowSuggestions(true);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (s: { name: string; taxId: string }) => {
    setCustomerName(s.name);
    if (s.taxId) setTaxId(s.taxId);
    setShowSuggestions(false);
  };

  const handleQuickAddLimit = (addAmount: number) => {
    setCreditLimit((prev) => Math.max(0, (Number(prev) || 0) + addAmount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุชื่อลูกค้า",
        text: "ชื่อลูกค้าเป็นข้อมูลจำเป็นสำหรับการตั้งค่าวงเงินเครดิต",
        confirmButtonColor: "#2563eb"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveCustomerCreditSetting({
        id: initialData?.isConfigured ? initialData.id : undefined,
        customerName: customerName.trim(),
        taxId: taxId.trim() || undefined,
        creditLimit: Number(creditLimit) || 0,
        creditTermsDays: Number(creditTermsDays) || 30,
        creditStatus,
        billingCycleRule: billingCycleRule.trim() || undefined,
        notes: notes.trim() || undefined
      });

      if (res.success) {
        Swal.fire({
          icon: "success",
          title: "บันทึกการตั้งค่าวงเงินสำเร็จ",
          text: `กำหนดวงเงินให้ "${customerName.trim()}" เรียบร้อยแล้ว`,
          timer: 1800,
          showConfirmButton: false
        });
        onSuccess();
        onClose();
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: res.error || "ไม่สามารถบันทึกข้อมูลได้",
          confirmButtonColor: "#2563eb"
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
        text: err.message,
        confirmButtonColor: "#2563eb"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live debt metrics from initialData if available
  const hasLiveDebt = initialData && initialData.totalExposure > 0;
  const currentTotalDebt = initialData?.totalExposure || 0;
  const remainingProjected = (Number(creditLimit) || 0) - currentTotalDebt;
  const isExceeded = remainingProjected < 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Soft Backdrop: Still lets user see background data while working */}
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1.5px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Inspector Drawer at the Right */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-250">
          {/* 1. FIXED HEADER */}
          <div className="shrink-0 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight">
                    {initialData?.isConfigured ? "แก้ไขการตั้งค่าวงเงินเครดิต" : "กำหนดวงเงินเครดิตลูกค้าใหม่"}
                  </h2>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.2 rounded-full font-semibold">
                    {initialData?.isConfigured ? "ตั้งค่าแล้ว" : "ใหม่"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ฝ่ายบัญชีและการเงิน • ควบคุมวงเงินสินเชื่อกลุ่ม TG, TE, TP
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
              title="ปิดแผงตั้งค่า (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2. SCROLLABLE BODY */}
          <form
            id="credit-setting-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-800"
          >
            {/* Live Exposure Snapshot Card */}
            {hasLiveDebt && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-slate-50 border border-blue-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    ภาระหนี้คงค้างจริงในระบบขณะนี้
                  </span>
                  <span className="text-[10px] font-bold text-blue-800 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                    {initialData?.jobCount || 0} งานค้างชำระ
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="bg-white/90 p-2 rounded-xl border border-blue-100/80 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-medium">หนี้ TG</span>
                    <span className="font-bold text-slate-900 text-xs">
                      ฿{(initialData.tgExposure || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white/90 p-2 rounded-xl border border-blue-100/80 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-medium">หนี้ TE</span>
                    <span className="font-bold text-slate-900 text-xs">
                      ฿{(initialData.teExposure || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white/90 p-2 rounded-xl border border-blue-100/80 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-medium">หนี้ TP</span>
                    <span className="font-bold text-slate-900 text-xs">
                      ฿{(initialData.tpExposure || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-blue-600/10 p-2 rounded-xl border border-blue-300/80 shadow-2xs">
                    <span className="text-[10px] text-blue-800 block font-bold">หนี้รวมกลุ่ม</span>
                    <span className="font-black text-blue-950 text-xs">
                      ฿{currentTotalDebt.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Name & Tax ID */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>ชื่อลูกค้า / นิติบุคคล <span className="text-rose-500">*</span></span>
                  {initialData?.isConfigured && (
                    <span className="text-[10px] font-normal text-slate-400">แก้ไขได้ตามต้องการ</span>
                  )}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="ค้นหาหรือพิมพ์ชื่อลูกค้า..."
                    value={customerName}
                    onChange={handleNameChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    className="w-full text-xs font-semibold pl-9 pr-4 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-44 overflow-y-auto divide-y divide-slate-100">
                    {suggestions.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectSuggestion(s)}
                        className="p-2.5 hover:bg-blue-50 cursor-pointer text-xs flex justify-between items-center transition-colors"
                      >
                        <span className="font-bold text-slate-800">{s.name}</span>
                        {s.taxId && (
                          <span className="text-[10px] font-mono text-slate-500">Tax ID: {s.taxId}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลขประจำตัวผู้เสียภาษี (Tax ID)
                </label>
                <input
                  type="text"
                  placeholder="เช่น 0105555001234 (13 หลัก)"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  maxLength={20}
                  className="w-full text-xs font-mono pl-3 pr-4 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Approved Limit & Terms */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              {/* Approved Credit Limit */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    วงเงินเครดิตที่อนุมัติ (บาท) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs font-black text-emerald-700">
                    ฿{Number(creditLimit || 0).toLocaleString("th-TH")}
                  </span>
                </div>

                <input
                  type="number"
                  min="0"
                  step="10000"
                  required
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(Number(e.target.value) || 0)}
                  className="w-full text-sm font-black text-slate-900 pl-3.5 pr-4 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Preset Chips */}
                <div className="flex gap-1 flex-wrap pt-0.5">
                  {[500000, 1000000, 2000000, 3000000, 5000000, 10000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCreditLimit(val)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                        creditLimit === val
                          ? "bg-emerald-600 text-white"
                          : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleQuickAddLimit(500000)}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                  >
                    +500k
                  </button>
                </div>
              </div>

              {/* Credit Terms Days */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    เครดิตเทอม (วัน) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {creditTermsDays} วัน
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-1">
                  {[15, 30, 45, 60, 90, 120].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCreditTermsDays(d)}
                      className={`py-1.5 text-xs font-bold rounded-xl border text-center transition-all ${
                        creditTermsDays === d
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {d} วัน
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Status & Billing Cycle Rule */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  สถานะวงเงิน (Credit Status)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreditStatus("ACTIVE")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2.5 transition-all ${
                      creditStatus === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-950 border-emerald-300 ring-1 ring-emerald-400 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">ใช้งานปกติ (Active)</div>
                      <div className="text-[10px] text-slate-500 font-normal">เปิดเครดิตส่งของได้</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreditStatus("WATCHLIST")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2.5 transition-all ${
                      creditStatus === "WATCHLIST"
                        ? "bg-amber-50 text-amber-950 border-amber-300 ring-1 ring-amber-400 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">เฝ้าระวัง (Watchlist)</div>
                      <div className="text-[10px] text-slate-500 font-normal">ติดตามการชำระใกล้ชิด</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreditStatus("SUSPENDED")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2.5 transition-all ${
                      creditStatus === "SUSPENDED"
                        ? "bg-orange-50 text-orange-950 border-orange-300 ring-1 ring-orange-400 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">ระงับชั่วคราว (Suspended)</div>
                      <div className="text-[10px] text-slate-500 font-normal">ชะลอการส่งมอบสินค้า</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreditStatus("BLOCKED")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2.5 transition-all ${
                      creditStatus === "BLOCKED"
                        ? "bg-rose-50 text-rose-950 border-rose-300 ring-1 ring-rose-400 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">บล็อกเครดิต (Blocked)</div>
                      <div className="text-[10px] text-slate-500 font-normal">งดปล่อยเครดิต/ดำเนินคดี</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เงื่อนไขรอบวางบิล / จ่ายเงิน
                </label>
                <input
                  type="text"
                  placeholder="เช่น ตัดรอบทุกวันที่ 25 วางบิลทุกวันศุกร์"
                  value={billingCycleRule}
                  onChange={(e) => setBillingCycleRule(e.target.value)}
                  className="w-full text-xs pl-3 pr-4 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  บันทึกข้อตกลงพิเศษจากฝ่ายบัญชี (Internal Notes)
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น มีหนังสือค้ำประกัน หรือต้องได้รับอนุมัติจาก ผจก. บัญชีก่อนส่งของ"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Projected Remaining Limit Pill */}
            {hasLiveDebt && (
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                  isExceeded
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                }`}
              >
                <div className="space-y-0.5">
                  <span className="block text-[11px] font-medium opacity-80">
                    คาดการณ์วงเงินคงเหลือ:
                  </span>
                  <span className="text-xs">
                    (วงเงิน ฿{Number(creditLimit).toLocaleString()} - หนี้จริง ฿{currentTotalDebt.toLocaleString()})
                  </span>
                </div>
                <span className="text-sm font-black tracking-tight">
                  {isExceeded
                    ? `เกินวงเงิน ฿${Math.abs(remainingProjected).toLocaleString()}`
                    : `เหลือ ฿${remainingProjected.toLocaleString()}`}
                </span>
              </div>
            )}
          </form>

          {/* 3. STICKY / FIXED BOTTOM ACTION BAR - ALWAYS 100% VISIBLE */}
          <div className="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shadow-lg">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              form="credit-setting-form"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  บันทึกการตั้งค่าวงเงิน
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
