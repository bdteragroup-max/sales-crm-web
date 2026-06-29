"use client";

import React, { useState, useEffect, useTransition } from "react";
import { X, Search, GitMerge, AlertTriangle, CheckCircle2 } from "lucide-react";
import { mergeCompanies, searchCompaniesForMerge } from "@/app/actions/mergeCompanies";
import { useRouter } from "next/navigation";

interface MinimalCompany {
  id: string;
  companyName: string;
}

interface MergeCompanyModalProps {
  onClose: () => void;
  allCompanies: MinimalCompany[];
}

export default function MergeCompanyModal({ onClose, allCompanies }: MergeCompanyModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sourceSearch, setSourceSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [isTargetOpen, setIsTargetOpen] = useState(false);

  const [sourceOptions, setSourceOptions] = useState<MinimalCompany[]>([]);
  const [targetOptions, setTargetOptions] = useState<MinimalCompany[]>([]);
  const [sourceCompany, setSourceCompany] = useState<MinimalCompany | null>(null);
  const [targetCompany, setTargetCompany] = useState<MinimalCompany | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Debounced search for Source
  useEffect(() => {
    if (!sourceSearch.trim()) {
      setSourceOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchCompaniesForMerge(sourceSearch, targetId);
      setSourceOptions(results as MinimalCompany[]);
    }, 300);
    return () => clearTimeout(timer);
  }, [sourceSearch, targetId]);

  // Debounced search for Target
  useEffect(() => {
    if (!targetSearch.trim()) {
      setTargetOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchCompaniesForMerge(targetSearch, sourceId);
      setTargetOptions(results as MinimalCompany[]);
    }, 300);
    return () => clearTimeout(timer);
  }, [targetSearch, sourceId]);

  async function handleMergeRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceId || !targetId) {
      setAlertInfo({ type: 'error', message: "กรุณาเลือกบริษัทให้ครบถ้วน" });
      return;
    }
    setShowConfirm(true);
  }

  async function executeMerge() {
    startTransition(async () => {
      const res = await mergeCompanies(sourceId!, targetId!);
      if (res.success) {
        setAlertInfo({ type: 'success', message: res.message });
        router.refresh();
      } else {
        setAlertInfo({ type: 'error', message: res.message || "เกิดข้อผิดพลาด" });
        setShowConfirm(false);
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red">
              <GitMerge size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">ผสานบริษัท (Merge Companies)</h2>
              <p className="text-xs font-bold text-gray-400 mt-0.5">รวมข้อมูลจาก 2 บริษัทเข้าด้วยกัน</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8">

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800">
            <AlertTriangle className="shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="font-bold mb-1">คำเตือนสำคัญ</p>
              <p>การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลทั้งหมด (ใบเสนอราคา, การติดต่อ, ออเดอร์) ของ <strong>"บริษัทต้นทางที่จะถูกลบ"</strong> จะถูกย้ายไปรวมกับ <strong>"บริษัทเป้าหมายที่จะเก็บไว้"</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">

            {/* Merge Icon Arrow for Desktop */}
            <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center z-10 shadow-sm text-gray-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </div>

            {/* Source Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-red-600 uppercase tracking-wide">
                บริษัทต้นทาง <span className="font-normal text-red-500 lowercase">(ที่จะถูกลบ)</span>
              </label>

              <div className="relative">
                <div className="relative flex items-center bg-white border border-red-200 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10 rounded-xl overflow-hidden transition-all shadow-sm">
                  <Search size={16} className="absolute left-3 text-red-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาบริษัทต้นทาง..."
                    className="w-full pl-10 pr-4 py-3 text-sm focus:outline-none placeholder-red-300"
                    value={sourceId ? sourceCompany?.companyName : sourceSearch}
                    onChange={(e) => {
                      setSourceSearch(e.target.value);
                      setSourceId(null);
                      setIsSourceOpen(true);
                    }}
                    onFocus={() => setIsSourceOpen(true)}
                  />
                  {sourceId && (
                    <button type="button" onClick={() => setSourceId(null)} className="absolute right-3 text-gray-400 hover:text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>

                {isSourceOpen && !sourceId && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto">
                    {sourceOptions.length > 0 ? (
                      sourceOptions.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 hover:text-red-700 transition-colors border-b border-gray-50 last:border-0 truncate"
                          onClick={() => {
                            setSourceId(c.id);
                            setSourceCompany(c);
                            setSourceSearch("");
                            setIsSourceOpen(false);
                          }}
                        >
                          {c.companyName}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">ไม่พบข้อมูล</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Target Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-emerald-600 uppercase tracking-wide">
                บริษัทเป้าหมาย <span className="font-normal text-emerald-500 lowercase">(ที่จะเก็บไว้)</span>
              </label>

              <div className="relative">
                <div className="relative flex items-center bg-white border border-emerald-200 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 rounded-xl overflow-hidden transition-all shadow-sm">
                  <Search size={16} className="absolute left-3 text-emerald-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาบริษัทเป้าหมาย..."
                    className="w-full pl-10 pr-4 py-3 text-sm focus:outline-none placeholder-emerald-300"
                    value={targetId ? targetCompany?.companyName : targetSearch}
                    onChange={(e) => {
                      setTargetSearch(e.target.value);
                      setTargetId(null);
                      setIsTargetOpen(true);
                    }}
                    onFocus={() => setIsTargetOpen(true)}
                  />
                  {targetId && (
                    <button type="button" onClick={() => setTargetId(null)} className="absolute right-3 text-gray-400 hover:text-emerald-500">
                      <X size={16} />
                    </button>
                  )}
                </div>

                {isTargetOpen && !targetId && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto">
                    {targetOptions.length > 0 ? (
                      targetOptions.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-4 py-3 text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-b border-gray-50 last:border-0 truncate"
                          onClick={() => {
                            setTargetId(c.id);
                            setTargetCompany(c);
                            setTargetSearch("");
                            setIsTargetOpen(false);
                          }}
                        >
                          {c.companyName}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">ไม่พบข้อมูล</div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Preview State */}
          {sourceCompany && targetCompany && (
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-4">
              <div className="flex-1">
                <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase mb-2">ลบถาวร</span>
                <p className="text-sm font-bold text-gray-800 truncate" title={sourceCompany.companyName}>{sourceCompany.companyName}</p>
              </div>
              <GitMerge size={24} className="text-gray-300 shrink-0" />
              <div className="flex-1 md:text-right">
                <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase mb-2">เก็บข้อมูลไว้</span>
                <p className="text-sm font-bold text-gray-800 truncate" title={targetCompany.companyName}>{targetCompany.companyName}</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            ยกเลิก
          </button>
          <button 
            type="button"
            onClick={handleMergeRequest}
            disabled={!sourceId || !targetId || isPending}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-red hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-200 flex items-center gap-2"
          >
            {isPending ? "กำลังผสานข้อมูล..." : "ยืนยันการผสานบริษัท"}
          </button>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">ยืนยันการผสานบริษัท?</h3>
              <div className="text-sm text-gray-600 space-y-4">
                <p>
                  ข้อมูลของ: <br />
                  <strong className="text-red-600">{sourceCompany?.companyName}</strong>
                </p>
                <div className="flex justify-center text-gray-300">
                  <GitMerge size={20} className="rotate-90" />
                </div>
                <p>
                  จะถูกย้ายไปยัง: <br />
                  <strong className="text-emerald-600">{targetCompany?.companyName}</strong>
                </p>
                <p className="font-bold text-red-600 bg-red-50 p-2 rounded-lg text-xs mt-2">
                  คำเตือน: บริษัทต้นทางจะถูกลบอย่างถาวร!
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeMerge}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังดำเนินการ...
                  </span>
                ) : (
                  "ยืนยัน"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert / Result Modal */}
      {alertInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-6 text-center">
            {alertInfo.type === 'success' ? (
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 mb-4">
                <CheckCircle2 size={32} />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-500 mb-4">
                <AlertTriangle size={32} />
              </div>
            )}
            
            <h3 className="text-xl font-black text-gray-900 mb-2">
              {alertInfo.type === 'success' ? 'สำเร็จ' : 'แจ้งเตือน'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {alertInfo.message}
            </p>
            
            <button
              type="button"
              onClick={() => {
                const wasSuccess = alertInfo.type === 'success';
                setAlertInfo(null);
                if (wasSuccess) {
                  onClose();
                }
              }}
              className={`w-full py-2.5 rounded-xl text-sm font-bold text-white transition-colors shadow-sm ${
                alertInfo.type === 'success' 
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' 
                  : 'bg-red-500 hover:bg-red-600 shadow-red-200'
              }`}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
