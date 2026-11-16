'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
  CheckCircle2,
  Eraser,
  PenTool,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { formatThaiDate } from '@/app/lib/surveyMetadata';

type SurveySignatureBoxProps = {
  title: string;
  subtitle?: string;
  signerName?: string | null;
  signedAt?: string | null;
  value?: string | null;
  onChange: (nextUrl: string | null, nextSignedAt: string | null) => void;
  readOnly?: boolean;
  savedKeyName?: string | null;
  accentColor?: 'red' | 'slate';
};

async function compressSignatureImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
      img.onload = () => {
        const maxW = 600;
        const maxH = 240;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.max(Math.round(img.width * scale), 1);
        const h = Math.max(Math.round(img.height * scale), 1);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

function getSavedSignatureFromStorage(userName?: string | null): string | null {
  if (typeof window === 'undefined') return null;
  try {
    if (userName) {
      const byName = localStorage.getItem(`crm_saved_signature_${userName}`);
      if (byName) return byName;
    }
    return localStorage.getItem('crm_user_signature');
  } catch {
    return null;
  }
}

export function rememberSignatureInStorage(userName?: string | null, sigUrl?: string | null) {
  if (typeof window === 'undefined' || !sigUrl) return;
  try {
    if (userName) {
      localStorage.setItem(`crm_saved_signature_${userName}`, sigUrl);
    }
    localStorage.setItem('crm_user_signature', sigUrl);
  } catch {
    // ignore storage quota errors
  }
}

export default function SurveySignatureBox({
  title,
  subtitle,
  signerName,
  signedAt,
  value,
  onChange,
  readOnly = false,
  savedKeyName,
  accentColor = 'red',
}: SurveySignatureBoxProps) {
  const sigPadRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // When a signature already exists, start in preview mode; if empty, open draw pad immediately.
  const [drawMode, setDrawMode] = useState<boolean>(() => !value);
  const [previousValueBeforeRedraw, setPreviousValueBeforeRedraw] = useState<string | null>(null);
  const [previousSignedAtBeforeRedraw, setPreviousSignedAtBeforeRedraw] = useState<string | null>(null);
  const [hasPadInk, setHasPadInk] = useState<boolean>(false);
  const [savedSig, setSavedSig] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setSavedSig(getSavedSignatureFromStorage(savedKeyName));
    });
    return () => cancelAnimationFrame(raf);
  }, [savedKeyName]);

  const calibrateCanvas = useCallback(() => {
    const pad = sigPadRef.current;
    if (!pad) return;
    const canvas: HTMLCanvasElement | null = pad.getCanvas?.();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      const wasEmpty = pad.isEmpty();
      const strokeData = !wasEmpty ? pad.toData() : null;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      pad.clear();
      if (strokeData && strokeData.length > 0) {
        try {
          pad.fromData(strokeData);
        } catch {
          // ignore restore edge case
        }
      }
    }
  }, []);

  useEffect(() => {
    if (readOnly || !drawMode) return;
    const t1 = setTimeout(calibrateCanvas, 50);
    const t2 = setTimeout(calibrateCanvas, 200);
    const node = containerRef.current;
    const ro = typeof ResizeObserver !== 'undefined' && node ? new ResizeObserver(calibrateCanvas) : null;
    if (ro && node) ro.observe(node);
    window.addEventListener('resize', calibrateCanvas);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro?.disconnect();
      window.removeEventListener('resize', calibrateCanvas);
    };
  }, [readOnly, drawMode, calibrateCanvas]);

  const handleStrokeEnd = () => {
    const pad = sigPadRef.current;
    if (!pad || pad.isEmpty()) return;
    setHasPadInk(true);
    setUploadErr(null);
    const dataUrl = pad.getTrimmedCanvas().toDataURL('image/png');
    onChange(dataUrl, new Date().toISOString());
  };

  const handleClearPad = () => {
    sigPadRef.current?.clear();
    setHasPadInk(false);
    setUploadErr(null);
    onChange(null, null);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadErr('กรุณาเลือกไฟล์รูปภาพลายเซ็น (PNG / JPG)');
      return;
    }
    try {
      setUploadErr(null);
      const dataUrl = await compressSignatureImage(file);
      setDrawMode(false);
      setHasPadInk(false);
      setPreviousValueBeforeRedraw(null);
      onChange(dataUrl, new Date().toISOString());
    } catch (err: any) {
      setUploadErr(err?.message || 'อัปโหลดรูปลายเซ็นไม่สำเร็จ');
    }
  };

  const handleApplySaved = () => {
    const sig = savedSig || getSavedSignatureFromStorage(savedKeyName);
    if (!sig) return;
    setUploadErr(null);
    setDrawMode(false);
    setHasPadInk(false);
    setPreviousValueBeforeRedraw(null);
    onChange(sig, new Date().toISOString());
  };

  const handleEnterRedraw = () => {
    setPreviousValueBeforeRedraw(value || null);
    setPreviousSignedAtBeforeRedraw(signedAt || null);
    setHasPadInk(false);
    setDrawMode(true);
  };

  const handleCancelRedraw = () => {
    if (previousValueBeforeRedraw) {
      onChange(previousValueBeforeRedraw, previousSignedAtBeforeRedraw);
      setPreviousValueBeforeRedraw(null);
      setDrawMode(false);
      setHasPadInk(false);
    }
  };

  const handleRemoveSignature = () => {
    sigPadRef.current?.clear();
    setHasPadInk(false);
    setPreviousValueBeforeRedraw(null);
    setDrawMode(true);
    onChange(null, null);
  };

  const borderAccent =
    accentColor === 'red' ? 'focus-within:border-[#ff2301]' : 'focus-within:border-gray-900';

  if (readOnly) {
    return (
      <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 h-full">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-gray-800">{title}</div>
          {value ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> ลงนามแล้ว
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 shrink-0">
              ยังไม่ลงนาม
            </span>
          )}
        </div>
        <div className="flex-1 min-h-[112px] bg-white border border-gray-200 rounded-xl flex items-center justify-center px-3 py-2">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={title} className="max-h-24 max-w-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">ยังไม่มีลายเซ็นในระบบ</span>
          )}
        </div>
        <div className="text-[11px] text-gray-600 flex items-center justify-between gap-2 pt-1 border-t border-gray-200/70">
          <span className="truncate font-medium">ผู้ลงนาม: {signerName || '-'}</span>
          {signedAt && <span className="text-gray-400 shrink-0">{formatThaiDate(signedAt, true)}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-2.5 h-full flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5 text-[#ff2301] shrink-0" />
            <span>{title}</span>
          </div>
          {subtitle && <div className="text-[11px] text-gray-500 mt-0.5">{subtitle}</div>}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {savedSig && (drawMode || !value) && (
            <button
              type="button"
              onClick={handleApplySaved}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs sm:text-[11px] font-bold transition cursor-pointer min-h-[34px]"
              title="ดึงลายเซ็นที่เคยบันทึกไว้มาใช้ทันที"
            >
              <Sparkles className="w-3.5 h-3.5" />
              ใช้ลายเซ็นเดิม
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs sm:text-[11px] font-semibold transition cursor-pointer min-h-[34px]"
          >
            <Upload className="w-3.5 h-3.5 text-[#ff2301]" />
            อัปโหลดรูป
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadFile}
            className="hidden"
          />
        </div>
      </div>

      {uploadErr && (
        <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
          {uploadErr}
        </div>
      )}

      {!drawMode && value ? (
        <div className="space-y-2">
          <div className="h-28 bg-white border border-emerald-200 rounded-xl flex flex-col items-center justify-center p-2 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={title} className="max-h-20 max-w-full object-contain" />
            <div className="w-2/3 border-b border-dotted border-gray-400 mt-1" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>แนบลายเซ็นแล้ว (แสดงใน PDF อัตโนมัติ)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleEnterRedraw}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-semibold cursor-pointer"
              >
                <PenTool className="w-3 h-3" /> เซ็นใหม่
              </button>
              <button
                type="button"
                onClick={handleRemoveSignature}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-red-50 border border-red-200 text-red-600 font-semibold cursor-pointer"
                title="ลบลายเซ็น"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div
            ref={containerRef}
            className={`relative border-2 border-dashed border-gray-300 bg-white rounded-xl overflow-hidden ${borderAccent}`}
          >
            <SignatureCanvas
              ref={sigPadRef}
              penColor="#111827"
              onEnd={handleStrokeEnd}
              canvasProps={{
                className: 'w-full h-36 sm:h-28 bg-white cursor-crosshair touch-none block',
              }}
            />
            {!hasPadInk && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-400 select-none">
                วาดลายเซ็นลงในกรอบนี้ หรือกด &ldquo;อัปโหลดรูป&rdquo;
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className={hasPadInk ? 'text-emerald-700 font-semibold inline-flex items-center gap-1' : 'text-gray-500'}>
              {hasPadInk ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> วาดลายเซ็นแล้ว (จะแนบลง PDF เมื่อบันทึก)
                </>
              ) : (
                signerName ? `ผู้ลงนาม: ${signerName}` : 'รองรับเมาส์และหน้าจอสัมผัส'
              )}
            </span>
            <div className="flex items-center gap-1.5">
              {previousValueBeforeRedraw && (
                <button
                  type="button"
                  onClick={handleCancelRedraw}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> ใช้ลายเซ็นเดิมก่อนแก้
                </button>
              )}
              <button
                type="button"
                onClick={handleClearPad}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 border border-gray-200 text-gray-600 hover:text-red-600 font-semibold cursor-pointer"
              >
                <Eraser className="w-3 h-3" /> ล้าง
              </button>
            </div>
          </div>
        </div>
      )}

      {(signerName || signedAt) && (
        <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1 border-t border-gray-200/70">
          <span className="truncate">ชื่อบน PDF: {signerName || '-'}</span>
          {signedAt && <span className="shrink-0">วันที่เซ็น: {formatThaiDate(signedAt, true)}</span>}
        </div>
      )}
    </div>
  );
}

