"use client";

import React from 'react';
import { CheckCircle2, XCircle, Clock, Users, User as UserIcon, Camera, AlertTriangle, FileSignature, Edit, FileText } from 'lucide-react';
import Image from 'next/image';

interface Props {
  project: any;
  onEdit?: () => void;
}

export default function SolarChecklistDisplay({ project, onEdit }: Props) {
  if (project.projectCategory !== 'Solar Roof' && project.projectCategory !== 'Solar Pump') {
    return null;
  }

  const preChecklist = typeof project.preChecklist === 'string' ? JSON.parse(project.preChecklist) : (project.preChecklist || {});
  const photoChecklist = typeof project.photoChecklist === 'string' ? JSON.parse(project.photoChecklist) : (project.photoChecklist || {});
  const checklistImages = typeof project.checklistImages === 'string' ? JSON.parse(project.checklistImages) : (project.checklistImages || {});
  const hvChecklist = typeof project.hvChecklist === 'string' ? JSON.parse(project.hvChecklist) : (project.hvChecklist || {});
  const workSummary = Array.isArray(project.workSummary) ? project.workSummary : (typeof project.workSummary === 'string' ? JSON.parse(project.workSummary) : []);
  const siteProblems = Array.isArray(project.siteProblems) ? project.siteProblems : (typeof project.siteProblems === 'string' ? JSON.parse(project.siteProblems) : []);

  const preChecklistItems = [
    { id: 'verify_site', label: '1. ตรวจสอบพื้นที่ทำงานตรงตามแบบติดตั้ง' },
    { id: 'photos_before', label: '2. ถ่ายรูปสถานที่ก่อนทำการติดตั้ง' },
    { id: 'ppe_check', label: '3. ตรวจสอบชุดทำงาน PPE ครบถ้วน' },
    { id: 'toolbox_talk', label: '4. ประชุม Toolbox Talk ก่อนเริ่มงาน' },
    { id: 'tools_crane', label: '5. ตรวจสอบเครื่องมือ / รถเครน / นั่งร้าน' },
  ];

  const photoChecklistItems = [
    { id: 'install_site', label: '1. รูปสถานที่ติดตั้ง' },
    { id: 'pv_panel', label: '2. แผง PV (Nameplate + มุมกว้าง)' },
    { id: 'inverter', label: '3. อินเวอร์เตอร์ (Nameplate + จุดติดตั้ง)' },
    { id: 'ac_cabinet', label: '4. ตู้ AC (เบรกเกอร์, SPD)' },
    { id: 'connection_points', label: '5. จุดเชื่อมต่อ (เบรกเกอร์, CT)' },
    { id: 'zero_export', label: '6. อุปกรณ์กันย้อน (Zero Export)' },
    { id: 'protection_devices', label: '7. อุปกรณ์กันไฟรั่ว (RCCB, RCBO, CB)' },
    { id: 'overall', label: '8. รูปภาพรวมจุดติดตั้ง (มุมกว้าง)' },
  ];

  const hvItems = [
    { id: 'main_bus_bar', label: '1. จุดต่อเข้า Main Bus Bar / MDB' },
    { id: 'zero_export_hv', label: '2. กันย้อน High Voltage' },
    { id: 'transformer', label: '3. หม้อแปลง (Nameplate + kVA)' },
    { id: 'relay_breaker', label: '4. Relay + Circuit Breaker + CT/PT/UPS' },
  ];

  const renderBoolean = (val: boolean) => {
    return val ? <CheckCircle2 className="text-emerald-500" size={18} /> : <XCircle className="text-gray-300" size={18} />;
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('th-TH');
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-brand-red" size={20} />
          <h3 className="font-bold text-lg text-gray-900">เอกสารการติดตั้งโซลาร์ (Solar Installation Checklist)</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.open(`/api/projects/${project.id}/solar-checklist-pdf`, '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors"
          >
            <FileText size={14} />
            Export PDF
          </button>
          {onEdit && (
            <button 
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-red/10 hover:bg-brand-red/20 text-brand-red text-xs font-bold rounded-lg transition-colors"
            >
              <Edit size={14} />
              กรอกแบบฟอร์ม (Fill / Edit)
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Check-in / Check-out Info */}
        <div className="space-y-4">
          <h4 className="font-bold text-gray-700 border-b pb-2">ข้อมูลการเข้างาน (Check-in / Check-out)</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium flex items-center gap-1"><Clock size={14}/> เวลาเข้างาน:</dt>
              <dd className="font-bold text-gray-900">{formatTime(project.siteCheckInTime)}</dd>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium flex items-center gap-1"><UserIcon size={14}/> หัวหน้าทีม:</dt>
              <dd className="font-bold text-gray-900">{project.siteSupervisor || project.manager?.fullName || '-'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium flex items-center gap-1"><Users size={14}/> ลูกทีม (Team Members):</dt>
              <dd className="font-bold text-gray-900 bg-gray-50 p-2 rounded-lg">
                {project.siteTeamMembers || [
                  ...(project.members?.map((m: any) => `${m.user.fullName} (${m.role === 'admin' ? 'Project Admin' : 'Engineer'})`) || []),
                  project.externalTechnicians ? `${project.externalTechnicians} (ช่างภายนอก)` : ''
                ].filter(Boolean).join(', ') || '-'}
              </dd>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <dt className="text-gray-500 font-medium flex items-center gap-1"><Clock size={14}/> เวลาออกงาน:</dt>
              <dd className="font-bold text-gray-900">{formatTime(project.siteCheckOutTime)}</dd>
            </div>
          </dl>
        </div>

        {/* Work Summary & Remaining Work */}
        <div className="space-y-4">
          <h4 className="font-bold text-gray-700 border-b pb-2">สรุปงานประจำวัน (Work Summary)</h4>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-gray-500 font-medium mb-1">งานที่ทำสำเร็จ:</p>
              {workSummary.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1 font-bold text-gray-900">
                  {workSummary.map((item: string, i: number) => <li key={i}>{item}</li>)}
                </ul>
              ) : <p className="text-gray-400">-</p>}
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">ปัญหาที่พบ (ถ้ามี):</p>
              {siteProblems.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1 font-bold text-red-600">
                  {siteProblems.map((item: string, i: number) => <li key={i}>{item}</li>)}
                </ul>
              ) : <p className="text-gray-400">-</p>}
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">งานค้าง/สิ่งที่ต้องทำต่อ:</p>
              <p className="font-bold text-gray-900 bg-gray-50 p-2 rounded-lg">{project.remainingWork || '-'}</p>
            </div>
          </div>
        </div>

        {/* Pre-checklist Photos */}
        <div className="space-y-4 lg:col-span-2">
          <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-1">
            <Camera size={16}/> 1. เตรียมความพร้อม (Pre-work Checklist)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {preChecklistItems.map(item => (
              <div key={item.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-2 flex flex-col">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-700 font-bold leading-tight">{item.label}</span>
                  {renderBoolean(preChecklist[item.id])}
                </div>
                <div className="flex-1 mt-2">
                  {checklistImages[item.id] && checklistImages[item.id].length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                      {checklistImages[item.id].map((imgUrl: string, idx: number) => (
                        <a key={idx} href={imgUrl} target="_blank" rel="noopener noreferrer" className="block relative min-w-[120px] w-full h-32 rounded-lg overflow-hidden border border-gray-200 group flex-shrink-0">
                          <Image src={imgUrl} alt={item.label} fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-bold">ดูรูปเต็ม</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                      <Camera size={24} className="mb-1 opacity-50"/>
                      <span className="text-xs">ไม่มีรูปภาพ</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* High Voltage */}
        {project.isHighVoltage && (
          <div className="space-y-4">
            <h4 className="font-bold text-orange-600 border-b pb-2 flex items-center gap-1">
              <AlertTriangle size={16}/> งานไฟฟ้าแรงสูง (High Voltage)
            </h4>
            <ul className="space-y-2 text-sm">
              {hvItems.map(item => (
                <li key={item.id} className="flex justify-between items-center bg-orange-50 p-2 rounded-lg border border-orange-100">
                  <span className="text-orange-800 font-medium">{item.label}</span>
                  {renderBoolean(hvChecklist[item.id])}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Photos */}
        <div className="space-y-4 lg:col-span-2">
          <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-1">
            <Camera size={16}/> 2. รูปถ่ายหลังติดตั้ง (Post-install Photos)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {photoChecklistItems.map(item => (
              <div key={item.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-2 flex flex-col">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-700 font-bold leading-tight">{item.label}</span>
                  {renderBoolean(photoChecklist[item.id])}
                </div>
                <div className="flex-1 mt-2">
                  {checklistImages[item.id] && checklistImages[item.id].length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                      {checklistImages[item.id].map((imgUrl: string, idx: number) => (
                        <a key={idx} href={imgUrl} target="_blank" rel="noopener noreferrer" className="block relative min-w-[120px] w-full h-32 rounded-lg overflow-hidden border border-gray-200 group flex-shrink-0">
                          <Image src={imgUrl} alt={item.label} fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-bold">ดูรูปเต็ม</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                      <Camera size={24} className="mb-1 opacity-50"/>
                      <span className="text-xs">ไม่มีรูปภาพ</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* High Voltage Photos */}
            {project.isHighVoltage && hvItems.map(item => (
              <div key={item.id} className="bg-orange-50 p-3 rounded-xl border border-orange-100 space-y-2 flex flex-col">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-orange-800 font-bold leading-tight">{item.label}</span>
                  {renderBoolean(hvChecklist[item.id])}
                </div>
                <div className="flex-1 mt-2">
                  {checklistImages[item.id] && checklistImages[item.id].length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                      {checklistImages[item.id].map((imgUrl: string, idx: number) => (
                        <a key={idx} href={imgUrl} target="_blank" rel="noopener noreferrer" className="block relative min-w-[120px] w-full h-32 rounded-lg overflow-hidden border border-orange-200 group flex-shrink-0">
                          <Image src={imgUrl} alt={item.label} fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-bold">ดูรูปเต็ม</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-orange-100/50 rounded-lg border-2 border-dashed border-orange-200 flex flex-col items-center justify-center text-orange-400">
                      <Camera size={24} className="mb-1 opacity-50"/>
                      <span className="text-xs">ไม่มีรูปภาพ</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>



      </div>
    </div>
  );
}
