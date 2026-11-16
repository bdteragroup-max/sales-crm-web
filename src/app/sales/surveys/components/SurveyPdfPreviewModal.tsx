'use client';

import React, { useState } from 'react';
import { Download, ExternalLink, FileText, Loader2, X } from 'lucide-react';

type Props = {
  surveyId: string;
  surveyNumber?: string;
  customerName?: string | null;
  cacheKey?: number | string;
  onClose: () => void;
};

export default function SurveyPdfPreviewModal({
  surveyId,
  surveyNumber,
  customerName,
  cacheKey,
  onClose,
}: Props) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [fallbackCache] = useState(() => Date.now());
  const effectiveKey = cacheKey || fallbackCache;
  const qs = `&v=${encodeURIComponent(String(effectiveKey))}`;
  const inlineUrl = `/api/surveys/${surveyId}/pdf?mode=inline${qs}`;
  const downloadUrl = `/api/surveys/${surveyId}/pdf?v=${encodeURIComponent(String(effectiveKey))}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-gray-200 w-full max-w-5xl h-[100dvh] sm:h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-3.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#ff2301] shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  รายงานสำรวจไซต์งาน (PDF)
                </h3>
                {surveyNumber && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-mono font-bold bg-red-50 text-[#ff2301] border border-red-200">
                    {surveyNumber}
                  </span>
                )}
              </div>
              {customerName && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{customerName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <a
              href={downloadUrl}
              download={`Survey_${surveyNumber || surveyId}.pdf`}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-[#ff2301] hover:bg-red-700 text-white text-xs font-bold shadow-xs transition min-h-[38px]"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">ดาวน์โหลด</span>
              <span className="xs:hidden sm:hidden">โหลด</span>
            </a>
            <a
              href={inlineUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-semibold transition min-h-[38px]"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">เปิดแท็บใหม่</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/70 transition cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile PDF viewer helper banner (mobile browsers often scroll only page 1 inside iframes) */}
        <div className="sm:hidden bg-amber-50 border-b border-amber-200 px-3.5 py-2 flex items-center justify-between gap-2 text-xs text-amber-900">
          <span className="truncate">หากดูบนมือถือไม่ครบทุกหน้า กดเปิดดูเต็มจอได้:</span>
          <a
            href={inlineUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 font-bold text-[#ff2301] underline inline-flex items-center gap-1"
          >
            เปิดเต็มจอ <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* PDF Iframe Body */}
        <div className="relative flex-1 bg-gray-100 overflow-hidden">
          {iframeLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 z-10">
              <Loader2 className="w-9 h-9 text-[#ff2301] animate-spin mb-3" />
              <p className="text-sm font-semibold text-gray-700">กำลังสร้างเอกสาร PDF จากข้อมูลล่าสุด...</p>
              <p className="text-xs text-gray-400 mt-1">อาจใช้เวลาสักครู่หากมีรูปถ่ายหน้างานจำนวนมาก</p>
            </div>
          )}
          <iframe
            src={inlineUrl}
            title={`Survey PDF ${surveyNumber || surveyId}`}
            onLoad={() => setIframeLoading(false)}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
