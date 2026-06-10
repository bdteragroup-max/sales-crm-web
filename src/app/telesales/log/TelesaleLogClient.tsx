"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Phone, ArrowLeft, Building2, User, Clock, FileText, 
  CheckCircle2, AlertTriangle, HelpCircle, Save, X, PhoneCall,
  PhoneOff, PhoneMissed, Mail 
} from "lucide-react";
import { checkDuplicatePhoneNumber, saveTelesaleLog } from "@/app/actions/telesalesLog";

interface TelesaleLogClientProps {
  contactId: string;
  companyId: string;
  telesaleId?: string;
  returnTo: string;
  initialContext: {
    contact: any;
    history: any[];
    latestQuotation: any | null;
    activeReps: any[];
  };
}

export default function TelesaleLogClient({
  contactId,
  companyId,
  telesaleId,
  returnTo,
  initialContext,
}: TelesaleLogClientProps) {
  const router = useRouter();
  const { contact, history, latestQuotation, activeReps } = initialContext;

  // Form State
  const [callStatus, setCallStatus] = useState<string>("รับสาย"); // Default is Answered
  const [callOutcome, setCallOutcome] = useState<string>("สนใจ");
  const [conversationSummary, setConversationSummary] = useState<string>("");
  const [callbackAt, setCallbackAt] = useState<string>("");
  const [forwardTo, setForwardTo] = useState<string>("");
  const [contactName, setContactName] = useState<string>(contact.contactName || "");
  const [mobilePhone, setMobilePhone] = useState<string>(contact.mobilePhone || "");

  // Validation / Warning States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showQuotationShortcut, setShowQuotationShortcut] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    matchedName: string;
    matchedCompany: string;
  } | null>(null);

  // Stamped Date Display (Bangkok Time Zone)
  const [stampTime, setStampTime] = useState<string>("");
  useEffect(() => {
    const formatted = new Date().toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      dateStyle: "medium",
      timeStyle: "short",
    });
    setStampTime(formatted);
  }, []);

  // Custom 24-hour Date/Time state management
  const cbDate = callbackAt ? callbackAt.split('T')[0] : '';
  const cbTime = callbackAt && callbackAt.includes('T') ? callbackAt.split('T')[1] : '';
  const cbHour = cbTime ? cbTime.split(':')[0] : '09';
  const cbMin = cbTime ? cbTime.split(':')[1] : '00';

  const handleCallbackDateChange = (dateVal: string) => {
    if (!dateVal) {
      setCallbackAt('');
      return;
    }
    setCallbackAt(`${dateVal}T${cbHour}:${cbMin}`);
  };

  const handleCallbackHourChange = (hourVal: string) => {
    if (!cbDate) return;
    setCallbackAt(`${cbDate}T${hourVal}:${cbMin}`);
  };

  const handleCallbackMinChange = (minVal: string) => {
    if (!cbDate) return;
    setCallbackAt(`${cbDate}T${cbHour}:${minVal}`);
  };

  // Handle phone input blur to check for duplicate numbers
  const handlePhoneBlur = async () => {
    const trimmedPhone = mobilePhone.trim();
    if (!trimmedPhone) return;

    try {
      const res = await checkDuplicatePhoneNumber(trimmedPhone, contactId);
      if (res.duplicate && res.contactName && res.companyName) {
        setDuplicateWarning({
          matchedName: res.contactName,
          matchedCompany: res.companyName,
        });
      } else {
        setDuplicateWarning(null);
      }
    } catch (e) {
      console.error("Duplicate check error:", e);
    }
  };

  const useMatchedName = () => {
    if (duplicateWarning) {
      setContactName(duplicateWarning.matchedName);
      setDuplicateWarning(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) {
      setNotification({ type: "error", message: "กรุณากรอกชื่อผู้ติดต่อ" });
      return;
    }
    if (!mobilePhone.trim()) {
      setNotification({ type: "error", message: "กรุณากรอกเบอร์โทรศัพท์" });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      const res = await saveTelesaleLog({
        contactId,
        companyId,
        telesaleId,
        callStatus,
        callOutcome,
        conversationSummary,
        callbackAt: (callStatus !== "รับสาย" || (callStatus === "รับสาย" && (callOutcome === "สนใจ" || callOutcome === "นัดหมายสำเร็จ"))) && callbackAt ? callbackAt : undefined,
        forwardTo: callStatus === "รับสาย" ? forwardTo : undefined,
        contactName,
        mobilePhone,
      });

      if (res.success) {
        setNotification({ type: "success", message: "บันทึกประวัติการโทรเรียบร้อยแล้ว!" });
        if (callStatus === "รับสาย" && (callOutcome === "สนใจ" || callOutcome === "นัดหมายสำเร็จ")) {
          setIsSubmitting(false); // Enable shortcut buttons
          setShowQuotationShortcut(true);
        } else {
          setTimeout(() => {
            router.push(returnTo);
          }, 1200);
        }
      } else {
        setNotification({ type: "error", message: res.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "เกิดข้อผิดพลาดทางเทคนิค" });
      setIsSubmitting(false);
    }
  };

  // Compile full company address block
  const fullAddress = [
    contact.company?.address,
    contact.company?.subDistrict && `ต.${contact.company.subDistrict}`,
    contact.company?.district && `อ.${contact.company.district}`,
    contact.company?.province && `จ.${contact.company.province}`,
    contact.company?.postalCode,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(returnTo)}
            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              Telesales Dials Logger
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              บันทึกผลการสนทนาสายโทรศัพท์
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
          <Clock size={14} className="text-slate-400 shrink-0" />
          <span>เวลาโทรล่าสุด (บช.): {stampTime || "กำลังดึงเวลา..."}</span>
        </div>
      </div>

      {/* Main Grid: 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Context Details & History Timeline (Lg: 5 columns) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Company Profile Info Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-50 pb-3">
              <Building2 size={16} className="text-slate-400" /> ข้อมูลบริษัทผู้รับสาย
            </h3>
            
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ชื่อบริษัท / องค์กร</span>
                <p className="text-sm font-black text-slate-900 mt-0.5">
                  {contact.company?.companyName || "ไม่พบชื่อบริษัท"}
                </p>
              </div>
              
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ที่อยู่อย่างเป็นทางการ</span>
                <p className="text-xs font-medium text-slate-600 leading-relaxed mt-0.5">
                  {fullAddress || "ไม่ได้ระบุที่อยู่ของบริษัทในระบบ"}
                </p>
              </div>
            </div>
          </div>

          {/* Latest Quotation Brief Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-50 pb-3">
              <FileText size={16} className="text-slate-400" /> ข้อมูลใบเสนอราคาล่าสุด
            </h3>

            {latestQuotation ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">เลขที่ใบเสนอราคา</span>
                  <p className="text-xs font-black text-slate-900 mt-0.5">
                    {latestQuotation.quotationNumber || "ไม่ระบุ"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ยอดเงิน (ก่อน VAT)</span>
                  <p className="text-xs font-black text-emerald-600 mt-0.5">
                    ฿{(latestQuotation.salesBeforeVat || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">สถานะปัจจุบัน</span>
                  <p className="mt-0.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      latestQuotation.status === "Won" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : latestQuotation.status === "Lost"
                        ? "bg-rose-50 text-rose-700 border border-rose-100"
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}>
                      {latestQuotation.status || "รอดำเนินการ"}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">วันที่สร้างใบงาน</span>
                  <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                    {new Date(latestQuotation.createdAt).toLocaleDateString("th-TH", {
                      day: "numeric", month: "short", year: "2-digit"
                    })}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 text-center py-4">
                ไม่พบข้อมูลการออกใบเสนอราคาสำหรับบริษัทนี้
              </p>
            )}
          </div>

          {/* Previous Interaction History Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex-1 flex flex-col gap-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-50 pb-3">
              <PhoneCall size={16} className="text-slate-400" /> ประวัติการพูดคุยย้อนหลัง (History)
            </h3>

            <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 flex flex-col gap-4 custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-center text-xs font-bold text-slate-400 py-8 flex flex-col items-center gap-2">
                  <Clock size={24} className="text-slate-200" />
                  <span>ยังไม่มีประวัติการโทรสำหรับผู้ติดต่อคนนี้</span>
                </div>
              ) : (
                <div className="relative border-l border-slate-100 pl-4 ml-2 flex flex-col gap-6">
                  {history.map((record) => (
                    <div key={record.id} className="relative flex flex-col gap-1">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        record.callStatus === "รับสาย" ? "bg-emerald-500" : "bg-rose-400"
                      }`} />
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400">
                          {new Date(record.createdAt).toLocaleDateString("th-TH", {
                            day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit"
                          })} น.
                        </span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                          record.callStatus === "รับสาย"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}>
                          {record.callStatus}
                        </span>
                      </div>

                      {record.callOutcome && (
                        <p className="text-[10px] font-bold text-amber-600">
                          ผลลัพธ์: {record.callOutcome}
                        </p>
                      )}

                      <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-100 mt-1">
                        {record.conversationSummary || "-"}
                      </p>

                      <span className="text-[9px] font-bold text-slate-400 self-end mt-0.5">
                        โดย: {record.user?.fullName || "ไม่ระบุพนักงาน"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Log Forms (Lg: 7 columns) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSave} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col gap-6">
            
            {/* Call Status Switcher Segment */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะการรับสาย (Call Status)</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { key: "รับสาย", label: "รับสาย", icon: <Phone size={14} className="shrink-0" />, color: "border-emerald-200 active:bg-emerald-50 text-emerald-600 bg-emerald-50/20" },
                  { key: "ไม่รับสาย", label: "ไม่รับสาย", icon: <PhoneOff size={14} className="shrink-0" />, color: "border-rose-200 active:bg-rose-50 text-rose-600 bg-rose-50/20" },
                  { key: "สายไม่ว่าง", label: "สายไม่ว่าง", icon: <PhoneMissed size={14} className="shrink-0" />, color: "border-amber-200 active:bg-amber-50 text-amber-600 bg-amber-50/20" },
                  { key: "ฝากข้อความ", label: "ฝากข้อความ", icon: <Mail size={14} className="shrink-0" />, color: "border-blue-200 active:bg-blue-50 text-blue-600 bg-blue-50/20" },
                ].map((status) => {
                  const active = callStatus === status.key;
                  return (
                    <button
                      key={status.key}
                      type="button"
                      onClick={() => setCallStatus(status.key)}
                      className={`py-3 px-2 text-xs font-black rounded-2xl border flex items-center justify-center gap-1.5 transition-all ${
                        active 
                          ? `${status.color} shadow-sm border-slate-900 scale-[1.02] ring-2 ring-black/5`
                          : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-200"
                      }`}
                    >
                      {status.icon}
                      <span>{status.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editable Contact Profile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <User size={12} /> ชื่อผู้ติดต่อ
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-white text-sm font-semibold text-slate-800 border border-slate-200 rounded-2xl py-2.5 px-4 focus:outline-none focus:border-slate-800 transition-colors"
                  placeholder="กรอกชื่อผู้ติดต่อ..."
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Phone size={12} /> เบอร์โทรศัพท์ติดต่อ
                </label>
                <input
                  type="tel"
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                  onBlur={handlePhoneBlur}
                  className="w-full bg-white text-sm font-semibold text-slate-800 border border-slate-200 rounded-2xl py-2.5 px-4 focus:outline-none focus:border-slate-800 transition-colors"
                  placeholder="กรอกเบอร์โทรศัพท์..."
                  required
                />
              </div>
            </div>

            {/* Real-time Duplicate Number Alert Popup */}
            {duplicateWarning && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-5 flex flex-col md:flex-row items-start gap-4 shadow-sm animate-pulse-subtle">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  <div>
                    <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">ตรวจพบคู่สายซ้ำซ้อนในฐานข้อมูล</h4>
                    <p className="text-xs font-semibold text-amber-700 leading-relaxed mt-1">
                      เบอร์โทรศัพท์นี้ถูกบันทึกไว้สำหรับลูกค้าคุณ <strong className="text-amber-900">"{duplicateWarning.matchedName}"</strong> ในบริษัท <strong className="text-amber-900">"{duplicateWarning.matchedCompany}"</strong> แล้ว
                    </p>
                  </div>
                  <div className="flex gap-2 self-start md:self-end">
                    <button
                      type="button"
                      onClick={useMatchedName}
                      className="text-[10px] font-black bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-xl shadow-sm transition-colors"
                    >
                      ใช่, ใช้ชื่อนี้แทน
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateWarning(null)}
                      className="text-[10px] font-black bg-white hover:bg-amber-100 text-amber-700 border border-amber-200 px-3.5 py-1.5 rounded-xl transition-colors"
                    >
                      ไม่ใช่, ใช้ชื่อปัจจุบัน
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Conditional Sub-panels */}
            {callStatus === "รับสาย" ? (
              // ANSWERED FORM LAYOUT
              <div className="flex flex-col gap-5 border-t border-slate-100 pt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Call Outcome Select Box */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      ผลลัพธ์การพูดคุย (Outcome)
                    </label>
                    <select
                      value={callOutcome}
                      onChange={(e) => setCallOutcome(e.target.value)}
                      className="w-full bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 rounded-2xl py-2.5 px-4 focus:outline-none focus:border-slate-800 transition-colors"
                    >
                      <option value="สนใจ">สนใจ (Interested)</option>
                      <option value="นัดหมายสำเร็จ">นัดหมายสำเร็จ (Appointment)</option>
                      <option value="ไม่สนใจ">ไม่สนใจ (Not Interested)</option>
                      <option value="ข้อมูลไม่ถูกต้อง">ข้อมูลไม่ถูกต้อง (Invalid Details)</option>
                    </select>
                  </div>

                  {/* Task Assignment Forward dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      ส่งมอบพนักงานขาย (Forward Task)
                    </label>
                    <select
                      value={forwardTo}
                      onChange={(e) => setForwardTo(e.target.value)}
                      className="w-full bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 rounded-2xl py-2.5 px-4 focus:outline-none focus:border-slate-800 transition-colors"
                    >
                      <option value="">-- ไม่ส่งต่อ / เก็บไว้ดำเนินงานเอง --</option>
                      {activeReps.map((rep) => (
                        <option key={rep.id} value={rep.fullName}>
                          {rep.fullName} ({rep.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conversation Summary Textarea */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    รายละเอียดบทสนทนา (Conversation Summary)
                  </label>
                  <textarea
                    rows={4}
                    value={conversationSummary}
                    onChange={(e) => setConversationSummary(e.target.value)}
                    className="w-full bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 rounded-2xl py-3 px-4 focus:outline-none focus:border-slate-800 transition-colors"
                    placeholder="กรอกสรุปความสนใจ ปัญหาที่พบ หรือรายละเอียดสำคัญ..."
                    required={callStatus === "รับสาย"}
                  />
                </div>


                {/* Callback Appointment if Interested or Appointment Scheduled */}
                {(callOutcome === "สนใจ" || callOutcome === "นัดหมายสำเร็จ") && (
                  <div className="flex flex-col gap-1.5 bg-rose-50/20 border border-rose-100 p-5 rounded-3xl">
                    <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={12} /> วันและเวลานัดโทรกลับ (Callback Appointment)
                    </label>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="date"
                        value={cbDate}
                        onChange={(e) => handleCallbackDateChange(e.target.value)}
                        className="flex-1 bg-white text-xs font-bold text-slate-700 border border-slate-200 rounded-2xl py-2.5 px-4 focus:outline-none focus:border-slate-800"
                      />
                      <select
                        value={cbHour}
                        onChange={(e) => handleCallbackHourChange(e.target.value)}
                        className="bg-white text-xs font-bold text-slate-700 border border-slate-200 rounded-2xl py-2.5 px-4 focus:outline-none focus:border-slate-800 appearance-none text-center"
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i.toString().padStart(2, '0')}>
                            {i.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <span className="flex items-center text-slate-400 font-bold">:</span>
                      <select
                        value={cbMin}
                        onChange={(e) => handleCallbackMinChange(e.target.value)}
                        className="bg-white text-xs font-bold text-slate-700 border border-slate-200 rounded-2xl py-2.5 px-4 focus:outline-none focus:border-slate-800 appearance-none text-center"
                      >
                        {Array.from({ length: 60 }).map((_, i) => (
                          <option key={i} value={i.toString().padStart(2, '0')}>
                            {i.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[10px] font-bold text-rose-400 mt-1 italic">
                      *กรุณาระบุวันและเวลานัดหมายให้ชัดเจนเพื่อให้พนักงานโทรซ้ำตามรอบ (หากต้องการนัดโทรกลับ)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // UNANSWERED / CALLBACK FORM LAYOUT
              <div className="flex flex-col gap-4 border-t border-slate-100 pt-5">
                <div className="flex flex-col gap-1.5 bg-rose-50/20 border border-rose-100 p-5 rounded-3xl">
                  <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={12} /> วันและเวลานัดโทรกลับ (Callback Appointment)
                  </label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="date"
                      value={cbDate}
                      onChange={(e) => handleCallbackDateChange(e.target.value)}
                      className="flex-1 bg-white text-xs font-bold text-slate-700 border border-slate-200 rounded-2xl py-2.5 px-4 focus:outline-none focus:border-slate-800"
                      required={callStatus !== "รับสาย"}
                    />
                    <select
                      value={cbHour}
                      onChange={(e) => handleCallbackHourChange(e.target.value)}
                      className="bg-white text-xs font-bold text-slate-700 border border-slate-200 rounded-2xl py-2.5 px-4 focus:outline-none focus:border-slate-800 appearance-none text-center"
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={i} value={i.toString().padStart(2, '0')}>
                          {i.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <span className="flex items-center text-slate-400 font-bold">:</span>
                    <select
                      value={cbMin}
                      onChange={(e) => handleCallbackMinChange(e.target.value)}
                      className="bg-white text-xs font-bold text-slate-700 border border-slate-200 rounded-2xl py-2.5 px-4 focus:outline-none focus:border-slate-800 appearance-none text-center"
                    >
                      {Array.from({ length: 60 }).map((_, i) => (
                        <option key={i} value={i.toString().padStart(2, '0')}>
                          {i.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] font-bold text-rose-400 mt-1 italic">
                    *กรุณาระบุวันและเวลานัดหมายให้ชัดเจนเพื่อให้พนักงานโทรซ้ำตามรอบ
                  </p>
                </div>
              </div>
            )}

            {/* Dynamic Status Notifications */}
            {notification && (
              <div className={`p-4 rounded-2xl text-xs font-bold border ${
                notification.type === "success" 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                  : "bg-rose-50 text-rose-700 border-rose-100"
              }`}>
                {notification.message}
              </div>
            )}

            {/* Action Triggers */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-50 pt-5 mt-2">
              <button
                type="button"
                onClick={() => router.push(returnTo)}
                className="px-6 py-3 border border-slate-200 text-xs font-black text-slate-500 rounded-2xl hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                disabled={isSubmitting}
              >
                <X size={14} /> ยกเลิก
              </button>
              
              <button
                type="submit"
                className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>กำลังบันทึกข้อมูล...</>
                ) : (
                  <>
                    <Save size={14} /> บันทึกประวัติการโทร
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Smart Call-to-Quotation Transition Modal */}
      {showQuotationShortcut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-md w-full p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 self-center shadow-sm">
              <FileText size={32} className="text-amber-500" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                บันทึกประวัติสายสนทนาสำเร็จ!
              </h3>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                เนื่องจากลูกค้ามีความสนใจในสินค้าหรือตกลงนัดหมายสำเร็จ คุณต้องการออกใบเสนอราคา (Quotation) ต่อโดยใช้ข้อมูลบริษัทและผู้ติดต่อคนนี้เพื่อดำเนินการปิดดีลทันทีหรือไม่?
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  router.push(`/sales?prefill=true&companyId=${companyId}&contactId=${contactId}`);
                }}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <FileText size={16} /> ออกใบเสนอราคาทันที
              </button>
              
              <button
                type="button"
                onClick={() => {
                  router.push(returnTo);
                }}
                className="w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-black rounded-2xl transition-all text-center"
              >
                กลับไปยังหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
