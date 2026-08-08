"use client";

import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Camera, Check } from 'lucide-react';
import { submitQCReview } from '@/app/actions/qc';

export default function QcReviewModal({ job, currentUser, onClose }: { job: any, currentUser: any, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [qcNotes, setQcNotes] = useState(job.qcReport?.qcNotes || '');
  const [qcCorrections, setQcCorrections] = useState(job.qcReport?.qcCorrections || '');
  const [confirmAction, setConfirmAction] = useState<'Passed' | 'Needs Correction' | null>(null);

  const initiateReview = (status: 'Passed' | 'Needs Correction') => {
    if (status === 'Needs Correction' && !qcCorrections.trim()) {
      alert('กรุณาระบุสิ่งที่ต้องแก้ไข (Corrections) ก่อนส่งกลับให้ช่าง');
      return;
    }
    setConfirmAction(status);
  };

  const executeReview = async () => {
    if (!confirmAction) return;
    setLoading(true);
    try {
      const res = await submitQCReview(
        job.id,
        confirmAction,
        qcNotes,
        qcCorrections,
        currentUser.fullName
      );
      if (res.success) {
        onClose();
      } else {
        alert(res.error || 'Failed to submit review');
      }
    } catch (err) {
      console.error(err);
      alert('Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const checklistItems = [
    { name: 'magicMarks', label: 'มีรอยเมจิก (Magic marks present)' },
    { name: 'cabinetBody', label: 'ตัวตู้: ถูกต้องตามแบบ (Cabinet: Correct to drawing)' },
    { name: 'inverterCorrect', label: 'อินเวอร์เตอร์: ถูกต้อง (Inverter: Correct)' },
    { name: 'frontPanelEquipment', label: 'อุปกรณ์หน้าตู้: ฟิวส์, ไฟโชว์ (Fuses, Lights)' },
    { name: 'wireDucting', label: 'รางสายไฟ (Wire Ducting)' },
    { name: 'terminals', label: 'เทอร์มินอล (Terminals)' },
    { name: 'cabinetKey', label: 'กุญแจตู้ (Cabinet Key)' },
    { name: 'internalWiring', label: 'การจัดระเบียบสายไฟในตู้ (Internal Wiring)' },
    { name: 'screwsTightened', label: 'ขันสกรูแน่นทั้งหมด (Tighten all screws)' },
    { name: 'groundingSystem', label: 'สายดิน (Ground Wire)' },
    { name: 'noMarks', label: 'ไม่มีรอยขีดข่วนทั้งใน/นอก (No marks)' },
    { name: 'overallEquipmentCheck', label: 'ตรวจสอบอุปกรณ์ภาพรวม (Overall Check)' },
    { name: 'electricalSystem', label: 'ระบบไฟฟ้า (Electrical System)' },
    { name: 'wiringConnections', label: 'การเชื่อมต่อสายไฟ (Wiring Connections)' },
    { name: 'warningLabels', label: 'ป้ายเตือน/คู่มือ (Warning Labels/Manual)' },
  ];

  const qc = job.qcReport || {};

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-in fade-in backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-gray-900 to-gray-800 flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-black text-white text-lg tracking-wide">ตรวจสอบคุณภาพ (QC Review)</h2>
            <p className="text-gray-300 text-xs font-medium">หมายเลขตู้: <strong className="text-white">{job.jobNumber}</strong></p>
          </div>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row bg-gray-50/50">
          
          {/* Left Column: Technician's Submission */}
          <div className="w-full md:w-1/2 p-6 border-r border-gray-200">
            <div className="mb-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle className="text-red-500" size={16} /> ข้อมูลจากช่างประกอบ
              </h3>
              
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500 font-medium">ช่างประกอบ:</span>
                  <strong className="text-gray-900">{job.technician?.fullName}</strong>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500 font-medium">โครงการ:</span>
                  <strong className="text-gray-900">{job.order?.company?.companyName || '-'}</strong>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500 font-medium">ประเภทตู้:</span>
                  <strong className="text-gray-900">{qc.cabinetType}</strong>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500 font-medium">พัดลม:</span>
                  <strong className="text-gray-900">{qc.fanStatus || '-'}</strong>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500 font-medium">S/N:</span>
                  <strong className="text-gray-900">{qc.serialNumber || '-'}</strong>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2 flex-col gap-1">
                  <span className="text-gray-500 font-medium">Nameplate:</span>
                  <strong className="text-gray-900 text-xs text-right">{qc.nameplate || '-'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">เวลาประกอบ:</span>
                  <strong className="text-red-600">{job.normalTimeMinutes || 0} นาที (OT: {job.overtimeMinutes || 0})</strong>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xs font-black text-gray-500 uppercase mb-3">รายการตรวจสอบ (Checklist)</h4>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                {checklistItems.map(item => (
                  <div key={item.name} className="flex items-center gap-3 p-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${qc[item.name] ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {qc[item.name] ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                    </div>
                    <span className={`text-xs font-medium ${qc[item.name] ? 'text-gray-900' : 'text-red-500 line-through'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {qc.confirmationPhotos && qc.confirmationPhotos.length > 0 && (
              <div>
                <h4 className="text-xs font-black text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <Camera size={14} /> รูปภาพยืนยัน
                </h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {qc.confirmationPhotos.map((src: string, i: number) => (
                    <img 
                      key={i} 
                      src={src} 
                      alt="QC Photo" 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://placehold.co/100x100/f3f4f6/9ca3af?text=No+Image";
                      }}
                      className="w-24 h-24 object-cover bg-gray-100 rounded-lg border border-gray-200 shadow-sm shrink-0 text-transparent" 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Inspector's Form */}
          <div className="w-full md:w-1/2 p-6 flex flex-col">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertCircle className="text-red-500" size={16} /> บันทึกการตรวจสอบ (QC Admin)
            </h3>
            
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col space-y-5">
              
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">ชื่อผู้ตรวจสอบ (Inspector Name)</label>
                <input 
                  type="text" 
                  readOnly 
                  value={currentUser.fullName} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">บันทึกเพิ่มเติม (Notes)</label>
                <textarea 
                  rows={3}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  readOnly={qc.qcStatus === 'Passed'}
                  placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all resize-none font-medium disabled:bg-gray-50 disabled:text-gray-500"
                  disabled={qc.qcStatus === 'Passed'}
                />
              </div>

              <div className="space-y-2 flex-1">
                <label className="block text-xs font-bold text-red-600">สิ่งที่ต้องแก้ไข (Corrections - กรณีไม่ผ่าน)</label>
                <textarea 
                  rows={4}
                  value={qcCorrections}
                  onChange={(e) => setQcCorrections(e.target.value)}
                  readOnly={qc.qcStatus === 'Passed'}
                  placeholder="ระบุจุดที่ช่างต้องนำไปแก้ไข (ถ้ามี)..."
                  className="w-full border border-red-200 bg-red-50/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all resize-none font-medium text-red-900 placeholder:text-red-300 disabled:opacity-70"
                  disabled={qc.qcStatus === 'Passed'}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
          {qc.qcStatus !== 'Passed' ? (
            <>
              <button 
                onClick={() => initiateReview('Needs Correction')}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-2"
              >
                <XCircle size={18} /> ไม่ผ่าน QC (ส่งกลับแก้ไข)
              </button>
              <button 
                onClick={() => initiateReview('Passed')}
                disabled={loading}
                className="px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                <CheckCircle size={18} /> ผ่าน QC (จบงานตู้)
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-emerald-700 font-bold px-6 py-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
              <CheckCircle size={18} /> การตรวจสอบเสร็จสมบูรณ์ (ผ่าน QC)
            </div>
          )}
        </div>

      </div>

      {/* Custom Confirmation Popup */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden text-center p-6 border border-gray-100">
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${confirmAction === 'Passed' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {confirmAction === 'Passed' ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">ยืนยันการบันทึกผล</h3>
            <p className="text-gray-500 text-sm font-medium mb-8">
              คุณต้องการบันทึกผลตู้เบอร์ <strong className="text-gray-900">{job.jobNumber}</strong> เป็น <strong className={confirmAction === 'Passed' ? 'text-emerald-600' : 'text-red-600'}>{confirmAction === 'Passed' ? 'ผ่าน QC' : 'ไม่ผ่าน QC (แก้ไข)'}</strong> ใช่หรือไม่?
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setConfirmAction(null)}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex-1"
              >
                ยกเลิก
              </button>
              <button 
                onClick={executeReview}
                disabled={loading}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors flex-1 flex items-center justify-center gap-2 ${confirmAction === 'Passed' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {loading ? 'กำลังบันทึก...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
