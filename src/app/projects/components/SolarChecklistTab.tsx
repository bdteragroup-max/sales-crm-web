"use client";

import React, { useMemo, useState } from 'react';
import SolarChecklist from './SolarChecklist';
import SolarChecklistDisplay from './SolarChecklistDisplay';
import { updateProject } from '@/app/actions/projects';
import { Loader2, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  computeSolarChecklistProgress,
  parseChecklistImages,
  parseChecklistRecord,
  parseChecklistStringArray,
  toBkkDateTimeLocalValue,
  type SolarChecklistFormState,
  type SolarProjectRecord,
  type SolarUserBasic,
} from '@/app/lib/solarChecklistConfig';

async function uploadSignatureDataUrlIfNeeded(
  dataUrl: string | null | undefined,
  roleTag: string
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl || null;
  }
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], `solar-signature-${roleTag}-${Date.now()}.png`, {
    type: 'image/png',
  });
  const form = new FormData();
  form.append('file', file);
  form.append('bucket', 'uploadsService');

  const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
  const json = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || !json?.success || !json?.url) {
    return dataUrl;
  }
  return json.url;
}

function buildInitialChecklistFormData(project: SolarProjectRecord): SolarChecklistFormState {
  const teamMembersList = project.members
    ?.map(
      (m) =>
        `${m.user?.fullName || ''} (${m.role === 'admin' ? 'Project Admin' : 'Engineer'})`
    )
    .join(', ');
  const allMembers = [
    teamMembersList,
    project.externalTechnicians ? `${project.externalTechnicians} (ช่างภายนอก)` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return {
    projectCategory: project.projectCategory,
    siteCheckInTime: toBkkDateTimeLocalValue(project.siteCheckInTime),
    siteTeamMembers: project.siteTeamMembers || allMembers || '',
    siteSupervisor: project.siteSupervisor || project.manager?.fullName || '',
    preChecklist: parseChecklistRecord(project.preChecklist),
    photoChecklist: parseChecklistRecord(project.photoChecklist),
    checklistImages: parseChecklistImages(project.checklistImages),
    isHighVoltage: Boolean(project.isHighVoltage),
    hvChecklist: parseChecklistRecord(project.hvChecklist),
    siteCheckOutTime: toBkkDateTimeLocalValue(project.siteCheckOutTime),
    workSummary: parseChecklistStringArray(project.workSummary),
    siteProblems: parseChecklistStringArray(project.siteProblems),
    remainingWork: project.remainingWork || '',
    supervisorSignUrl: project.supervisorSignUrl || null,
    customerSignUrl: project.customerSignUrl || null,
  };
}

function parseBkkLocalInputToDate(val?: string | null): Date | undefined {
  const clean = (val || '').trim();
  if (!clean) return undefined;
  // Treat YYYY-MM-DDTHH:mm cleanly as Asia/Bangkok (+07:00)
  const isoStr = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clean)
    ? `${clean}:00+07:00`
    : clean;
  const parsed = new Date(isoStr);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export default function SolarChecklistTab({
  project,
  currentUser,
}: {
  project: SolarProjectRecord;
  currentUser?: SolarUserBasic | null;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(() =>
    buildInitialChecklistFormData(project)
  );

  const progress = useMemo(
    () => computeSolarChecklistProgress(formData),
    [formData]
  );

  const handleEnterEdit = () => {
    setFormData(buildInitialChecklistFormData(project));
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const [supSign, custSign] = await Promise.all([
        uploadSignatureDataUrlIfNeeded(formData.supervisorSignUrl, 'supervisor'),
        uploadSignatureDataUrlIfNeeded(formData.customerSignUrl, 'customer'),
      ]);

      const cleanedImages = parseChecklistImages(formData.checklistImages);
      const cleanedSummary = (Array.isArray(formData.workSummary)
        ? formData.workSummary
        : []
      )
        .map((s: string) => s.trim())
        .filter(Boolean);
      const cleanedProblems = (Array.isArray(formData.siteProblems)
        ? formData.siteProblems
        : []
      )
        .map((s: string) => s.trim())
        .filter(Boolean);

      const projectData = {
        siteCheckInTime: parseBkkLocalInputToDate(formData.siteCheckInTime),
        siteTeamMembers: formData.siteTeamMembers || undefined,
        siteSupervisor: formData.siteSupervisor || undefined,
        preChecklist: formData.preChecklist || {},
        photoChecklist: formData.photoChecklist || {},
        checklistImages: cleanedImages,
        isHighVoltage: Boolean(formData.isHighVoltage),
        hvChecklist: formData.hvChecklist || {},
        siteCheckOutTime: parseBkkLocalInputToDate(formData.siteCheckOutTime),
        workSummary: cleanedSummary,
        siteProblems: cleanedProblems,
        remainingWork: formData.remainingWork || '',
        supervisorSignUrl: supSign ?? null,
        customerSignUrl: custSign ?? null,
      };

      await updateProject(project.id, projectData);
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('บันทึกแบบฟอร์มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="sticky top-2 z-20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/95 backdrop-blur-xs p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-base text-gray-900">
                แก้ไขแบบฟอร์มการติดตั้งโซลาร์
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-[#ff2301] border border-red-200 font-mono">
                {progress.totalChecked}/{progress.totalItems} ({progress.percent}%)
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {project.projectNumber} • {project.name}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsEditing(false)}
              className="h-10 inline-flex items-center justify-center gap-1.5 px-4 border border-gray-300 bg-white hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition cursor-pointer"
            >
              <X size={15} />
              <span>ยกเลิก</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="h-10 inline-flex items-center justify-center gap-1.5 px-5 bg-[#ff2301] hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              <span>บันทึกข้อมูล</span>
            </button>
          </div>
        </div>

        <SolarChecklist
          formData={formData}
          setFormData={setFormData}
          currentUser={currentUser}
        />

        <div className="flex justify-end gap-2 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setIsEditing(false)}
            className="h-10 px-5 border border-gray-300 bg-white hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="h-10 px-6 bg-[#ff2301] hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            <span>บันทึกข้อมูลทั้งหมด</span>
          </button>
        </div>
      </div>
    );
  }

  return <SolarChecklistDisplay project={project} onEdit={handleEnterEdit} />;
}
