"use client";

import React, { useState } from 'react';
import { X, Activity, CheckCircle, XCircle } from 'lucide-react';
import { submitFATReview } from '@/app/actions/fat';

export default function FatTestModal({ job, currentUser, onClose }: { job: any, currentUser: any, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const fat = job.fatReport || {};

  const [formData, setFormData] = useState({
    panelFunctionalTest: fat.panelFunctionalTest || false,
    acInputVoltage: fat.acInputVoltage || '',
    dcInputVoltage: fat.dcInputVoltage || '',
    outputVoltage: fat.outputVoltage || '',
    protectionSystemTest: fat.protectionSystemTest || false,
    testDetails: fat.testDetails || '',
    displaySystemCheck: fat.displaySystemCheck || false,
    remarks: fat.remarks || '',
  });

  const isReadOnly = fat.fatStatus === 'Passed';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const executeSubmit = async (status: 'Passed' | 'Failed') => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        acInputVoltage: formData.acInputVoltage ? parseFloat(formData.acInputVoltage.toString()) : null,
        dcInputVoltage: formData.dcInputVoltage ? parseFloat(formData.dcInputVoltage.toString()) : null,
        outputVoltage: formData.outputVoltage ? parseFloat(formData.outputVoltage.toString()) : null,
        fatStatus: status
      };

      const res = await submitFATReview(job.id, currentUser.fullName, payload);
      if (res.success) {
        onClose();
      } else {
        alert(res.error || 'Failed to submit FAT');
      }
    } catch (err) {
      console.error(err);
      alert('Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-in fade-in backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden border border-gray-100">
        
        <div className="p-5 bg-gradient-to-r from-red-900 to-red-800 flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-black text-white text-lg tracking-wide flex items-center gap-2">
              <Activity size={20} />
              การทดสอบการทำงาน (Factory Acceptance Test)
            </h2>
            <p className="text-red-200 text-xs font-medium">หมายเลขตู้: <strong className="text-white">{job.jobNumber}</strong></p>
          </div>
          <button onClick={onClose} disabled={loading} className="text-red-200 hover:text-white transition-colors bg-red-800 hover:bg-red-700 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase border-b pb-2">ผลการทดสอบ (Test Results)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" name="panelFunctionalTest" checked={formData.panelFunctionalTest} onChange={handleChange} disabled={isReadOnly} className="w-5 h-5 text-red-600 rounded focus:ring-red-500 disabled:opacity-50" />
                <span className="text-sm font-medium text-gray-700">การทดสอบการทำงานของแผง (Panel functional testing)</span>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" name="protectionSystemTest" checked={formData.protectionSystemTest} onChange={handleChange} disabled={isReadOnly} className="w-5 h-5 text-red-600 rounded focus:ring-red-500 disabled:opacity-50" />
                <span className="text-sm font-medium text-gray-700">ระบบป้องกัน (Protection system functional test)</span>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" name="displaySystemCheck" checked={formData.displaySystemCheck} onChange={handleChange} disabled={isReadOnly} className="w-5 h-5 text-red-600 rounded focus:ring-red-500 disabled:opacity-50" />
                <span className="text-sm font-medium text-gray-700">ตรวจสอบระบบแสดงผล (Display system check)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">AC input voltage (V)</label>
                <input type="number" name="acInputVoltage" value={formData.acInputVoltage} onChange={handleChange} readOnly={isReadOnly} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="0.0" step="0.1" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">DC input voltage (V)</label>
                <input type="number" name="dcInputVoltage" value={formData.dcInputVoltage} onChange={handleChange} readOnly={isReadOnly} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="0.0" step="0.1" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Output voltage (V)</label>
                <input type="number" name="outputVoltage" value={formData.outputVoltage} onChange={handleChange} readOnly={isReadOnly} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="0.0" step="0.1" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase border-b pb-2">รายละเอียดเพิ่มเติม</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">รายละเอียดการทดสอบ (Test details)</label>
                <textarea rows={3} name="testDetails" value={formData.testDetails} onChange={handleChange} readOnly={isReadOnly} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="อธิบายรายละเอียดการทดสอบ..." />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ข้อสังเกต/ข้อเสนอแนะ (Remarks and suggestions)</label>
                <textarea rows={3} name="remarks" value={formData.remarks} onChange={handleChange} readOnly={isReadOnly} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="ระบุเหตุผลหากพบความผิดปกติ..." />
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
          {!isReadOnly ? (
            <>
              <button 
                onClick={() => executeSubmit('Failed')}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-2"
              >
                <XCircle size={18} /> ไม่ผ่าน FAT (Failed)
              </button>
              <button 
                onClick={() => executeSubmit('Passed')}
                disabled={loading}
                className="px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                <CheckCircle size={18} /> ผ่าน FAT (Passed)
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-emerald-700 font-bold px-6 py-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
              <CheckCircle size={18} /> บันทึก FAT เสร็จสมบูรณ์ (Passed)
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
