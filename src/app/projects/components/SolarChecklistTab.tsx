"use client";

import React, { useState } from 'react';
import SolarChecklist from './SolarChecklist';
import SolarChecklistDisplay from './SolarChecklistDisplay';
import { updateProject } from '@/app/actions/projects';
import { Loader2, Save, Edit, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SolarChecklistTab({ project }: { project: any }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const teamMembersList = project.members
    ?.map((m: any) => `${m.user.fullName} (${m.role === 'admin' ? 'Project Admin' : 'Engineer'})`)
    .join(', ');
  const allMembers = [
    teamMembersList, 
    project.externalTechnicians ? `${project.externalTechnicians} (ช่างภายนอก)` : ''
  ].filter(Boolean).join(', ');

  const [formData, setFormData] = useState({
    projectCategory: project.projectCategory,
    siteCheckInTime: project.siteCheckInTime ? new Date(project.siteCheckInTime).toISOString().split('T')[0] + 'T' + new Date(project.siteCheckInTime).toISOString().split('T')[1].slice(0, 5) : '',
    siteTeamMembers: project.siteTeamMembers || allMembers || '',
    siteSupervisor: project.siteSupervisor || project.manager?.fullName || '',
    preChecklist: typeof project.preChecklist === 'string' ? JSON.parse(project.preChecklist) : (project.preChecklist || {}),
    photoChecklist: typeof project.photoChecklist === 'string' ? JSON.parse(project.photoChecklist) : (project.photoChecklist || {}),
    checklistImages: typeof project.checklistImages === 'string' ? JSON.parse(project.checklistImages) : (project.checklistImages || {}),
    isHighVoltage: project.isHighVoltage || false,
    hvChecklist: typeof project.hvChecklist === 'string' ? JSON.parse(project.hvChecklist) : (project.hvChecklist || {}),
    siteCheckOutTime: project.siteCheckOutTime ? new Date(project.siteCheckOutTime).toISOString().split('T')[0] + 'T' + new Date(project.siteCheckOutTime).toISOString().split('T')[1].slice(0, 5) : '',
    workSummary: Array.isArray(project.workSummary) ? project.workSummary : (typeof project.workSummary === 'string' ? JSON.parse(project.workSummary) : []),
    siteProblems: Array.isArray(project.siteProblems) ? project.siteProblems : (typeof project.siteProblems === 'string' ? JSON.parse(project.siteProblems) : []),
    remainingWork: project.remainingWork || '',
    supervisorSignUrl: project.supervisorSignUrl || null,
    customerSignUrl: project.customerSignUrl || null,
  });

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const projectData = {
        siteCheckInTime: formData.siteCheckInTime ? new Date(formData.siteCheckInTime) : undefined,
        siteTeamMembers: formData.siteTeamMembers || undefined,
        siteSupervisor: formData.siteSupervisor || undefined,
        preChecklist: formData.preChecklist || undefined,
        photoChecklist: formData.photoChecklist || undefined,
        checklistImages: formData.checklistImages || undefined,
        isHighVoltage: formData.isHighVoltage || false,
        hvChecklist: formData.hvChecklist || undefined,
        siteCheckOutTime: formData.siteCheckOutTime ? new Date(formData.siteCheckOutTime) : undefined,
        workSummary: formData.workSummary || undefined,
        siteProblems: formData.siteProblems || undefined,
        remainingWork: formData.remainingWork || undefined,
        supervisorSignUrl: formData.supervisorSignUrl || undefined,
        customerSignUrl: formData.customerSignUrl || undefined,
      };

      await updateProject(project.id, projectData);
      
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to save checklist');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="font-bold text-gray-900">แก้ไขฟอร์ม (Edit Checklist)</h2>
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              ยกเลิก
            </button>
            <button onClick={handleSave} disabled={isSubmitting} className="px-4 py-2 bg-brand-red text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              บันทึก (Save)
            </button>
          </div>
        </div>
        <SolarChecklist formData={formData} setFormData={setFormData} />
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <SolarChecklistDisplay project={project} onEdit={() => setIsEditing(true)} />
    </div>
  );
}
