'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, ExternalLink, Loader2, Trash2 } from 'lucide-react';

interface CleaningPhotoUploaderProps {
  photos: string[];
  photoNotes?: string[];
  onChange: (nextPhotos: string[], nextPhotoNotes: string[]) => void;
  readOnly?: boolean;
  label?: string;
  sectionIdPrefix?: string;
  highlightMissingNotes?: boolean;
  notePlaceholder?: string;
}

async function uploadCleaningPhotoFile(file: File): Promise<string> {
  let publicUrl = '';
  try {
    const supabase = (await import('@supabase/supabase-js')).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filename = `solar-cleaning-${uniqueSuffix}-${safeName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploadsService')
      .upload(filename, file, { contentType: file.type, upsert: false });

    if (!uploadError && uploadData?.path) {
      const { data: urlData } = supabase.storage
        .from('uploadsService')
        .getPublicUrl(uploadData.path);
      publicUrl = urlData.publicUrl;
    }
  } catch {
    // Fallback to API upload
  }

  if (!publicUrl) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bucket', 'uploadsService');

    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success || !json?.url) {
      throw new Error(json?.error || 'อัปโหลดรูปภาพไม่สำเร็จ');
    }
    publicUrl = json.url;
  }

  return publicUrl;
}

export default function CleaningPhotoUploader({
  photos,
  photoNotes = [],
  onChange,
  readOnly = false,
  label = 'อัปโหลดรูปถ่าย (เลือกได้หลายรูป)',
  sectionIdPrefix = 'section',
  highlightMissingNotes = false,
  notePlaceholder = 'อธิบายรายละเอียดรูปนี้ให้ลูกค้าเข้าใจ...',
}: CleaningPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const normalizedNotes = photos.map((_, idx) => photoNotes[idx] ?? '');
  const explainedCount = normalizedNotes.filter((n) => n.trim().length > 0).length;
  const allExplained = photos.length > 0 && explainedCount === photos.length;

  const handleSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const oversized = files.find((f) => f.size > 50 * 1024 * 1024);
    if (oversized) {
      alert(`ไฟล์ "${oversized.name}" ขนาดเกิน 50MB`);
      return;
    }

    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const url = await uploadCleaningPhotoFile(file);
        if (url) uploaded.push(url);
      }
      if (uploaded.length > 0) {
        onChange(
          [...photos, ...uploaded],
          [...normalizedNotes, ...uploaded.map(() => '')]
        );
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (idx: number) => {
    onChange(
      photos.filter((_, i) => i !== idx),
      normalizedNotes.filter((_, i) => i !== idx)
    );
  };

  const handleNoteChange = (idx: number, nextNote: string) => {
    const nextNotes = [...normalizedNotes];
    nextNotes[idx] = nextNote;
    onChange(photos, nextNotes);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleSelectFiles}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {!readOnly ? (
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50 min-h-[38px]"
          >
            {isUploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>กำลังอัปโหลดรูป...</span>
              </>
            ) : (
              <>
                <Camera size={14} />
                <span>{label}</span>
              </>
            )}
          </button>
        ) : (
          <span className="text-xs font-bold text-gray-500">รูปถ่ายประกอบ</span>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-gray-500">
            แนบแล้ว {photos.length} รูป
          </span>
          {photos.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                allExplained
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : highlightMissingNotes
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              อธิบายแล้ว {explainedCount}/{photos.length} รูป
            </span>
          )}
        </div>
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {photos.map((url, idx) => {
            const noteVal = normalizedNotes[idx] || '';
            const isMissing = !noteVal.trim();
            const showErr = highlightMissingNotes && isMissing;
            return (
              <div
                key={`${idx}-${url.slice(-16)}`}
                id={`photo-note-${sectionIdPrefix}-${idx}`}
                className={`rounded-xl border bg-white overflow-hidden flex flex-col transition ${
                  showErr
                    ? 'border-red-400 ring-2 ring-red-500/15'
                    : 'border-gray-200'
                }`}
              >
                <div className="relative group bg-gray-50 aspect-[4/3] border-b border-gray-200">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full relative"
                  >
                    <Image
                      src={url}
                      alt={`photo-${idx + 1}`}
                      fill
                      unoptimized
                      className="object-contain p-1"
                    />
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/70 text-white text-[11px] font-mono font-bold flex items-center gap-1">
                      รูปที่ #{idx + 1} <ExternalLink size={9} />
                    </span>
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center shadow-xs cursor-pointer"
                      title={`ลบรูปที่ #${idx + 1}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div className="p-2.5 space-y-1 bg-white flex-1 flex flex-col">
                  <label className="block text-[11px] font-bold text-gray-700">
                    คำอธิบายรูปที่ #{idx + 1} <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    disabled={readOnly}
                    value={noteVal}
                    onChange={(e) => handleNoteChange(idx, e.target.value)}
                    placeholder={`รูปที่ #${idx + 1}: ${notePlaceholder}`}
                    className={`w-full px-2.5 py-1.5 border rounded-lg text-base sm:text-xs outline-none transition flex-1 resize-y ${
                      showErr
                        ? 'border-red-400 bg-red-50/40 focus:border-red-600'
                        : 'border-gray-300 bg-gray-50/50 focus:bg-white focus:border-[#ff2301]'
                    } disabled:bg-gray-100 disabled:text-gray-600`}
                  />
                  {showErr && (
                    <p className="text-[10px] font-bold text-red-600">
                      * กรุณาอธิบายรูปที่ #{idx + 1}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-center text-xs text-gray-400">
          ยังไม่มีรูปถ่ายแนบในหัวข้อนี้
        </div>
      )}
    </div>
  );
}
