"use client";

import React, { useState } from 'react';
import { Package, Clock, CheckCircle2, AlertTriangle, ChevronRight, ClipboardList } from 'lucide-react';
import QcReviewModal from './QcReviewModal';

export default function QcClientPage({ jobs, currentUser }: { jobs: any[], currentUser: any }) {
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'passed'>('pending');

  const pendingJobs = jobs.filter(job => job.qcReport?.qcStatus === 'Pending Inspection' || job.qcReport?.qcStatus === 'Needs Correction');
  const passedJobs = jobs.filter(job => job.qcReport?.qcStatus === 'Passed');
  const displayedJobs = activeTab === 'pending' ? pendingJobs : passedJobs;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-6">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 border border-red-100 shrink-0">
          <ClipboardList size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">ตรวจสอบคุณภาพ (QC Inspection)</h1>
          <p className="text-gray-500 font-medium">รายการตู้คอนโทรลที่รอตรวจสอบและลงผล QC</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'pending' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          รอตรวจสอบ ({pendingJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('passed')}
          className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'passed' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          ประวัติการตรวจสอบ ({passedJobs.length})
        </button>
      </div>

      {displayedJobs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-1">
            {activeTab === 'pending' ? 'ไม่มีงานรอตรวจสอบ' : 'ไม่มีประวัติการตรวจสอบ'}
          </h3>
          <p className="text-gray-500 font-medium text-sm">
            {activeTab === 'pending' ? 'ตู้ที่ประกอบเสร็จทั้งหมดผ่านการ QC เรียบร้อยแล้ว' : 'ยังไม่มีตู้ที่ผ่าน QC'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedJobs.map((job) => (
            <div 
              key={job.id} 
              onClick={() => setSelectedJob(job)}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-red-300 transition-all cursor-pointer overflow-hidden flex flex-col group"
            >
              <div className="p-5 border-b border-gray-50 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-black text-gray-900 text-lg group-hover:text-red-600 transition-colors">{job.jobNumber}</h3>
                    <p className="text-xs font-bold text-gray-500 truncate">{job.order?.company?.companyName || 'ไม่ระบุโครงการ'}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                    job.qcReport?.qcStatus === 'Needs Correction' ? 'bg-red-100 text-red-700' : 
                    job.qcReport?.qcStatus === 'Passed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {job.qcReport?.qcStatus === 'Needs Correction' ? 'ต้องแก้ไขซ้ำ' : 
                     job.qcReport?.qcStatus === 'Passed' ? 'ผ่าน QC' : 'รอตรวจสอบ'}
                  </span>
                </div>
                
                <div className="space-y-2 mt-4 text-xs font-medium text-gray-600">
                  <div className="flex justify-between">
                    <span>ช่างประกอบ:</span>
                    <strong className="text-gray-900">{job.technician?.fullName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>ประเภทตู้:</span>
                    <strong className="text-gray-900 truncate max-w-[150px]">{job.qcReport?.cabinetType}</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-700 font-bold bg-gray-100 px-2 py-1 rounded-md mt-2">
                    <span>เวลาประกอบรวม:</span>
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {job.normalTimeMinutes || 0} นาที (OT: {job.overtimeMinutes || 0} นาที)
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-3 flex justify-between items-center text-sm font-bold text-gray-600 group-hover:text-red-600 group-hover:bg-red-50 transition-colors">
                <span>เปิดดูรายละเอียด QC</span>
                <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedJob && (
        <QcReviewModal
          job={selectedJob}
          currentUser={currentUser}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}
