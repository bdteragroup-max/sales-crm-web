"use client";

import React, { useState } from 'react';
import { X, Upload, CheckCircle2, Trash2, Camera } from 'lucide-react';
import { uploadPhotos } from '@/app/actions/technicianTask';

interface CompleteTaskModalProps {
  task: any;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (taskId: string, data: any) => Promise<void>;
}

export default function CompleteTaskModal({ task, isOpen, onClose, onComplete }: CompleteTaskModalProps) {
  const [completedNote, setCompletedNote] = useState('');
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const [afterFiles, setAfterFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !task) return null;

  const requiresPhotos = task.taskType !== 'SERVICE'; // SERVICE is closed via other process typically, but we support photos anyway

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (type === 'before') setBeforeFiles(prev => [...prev, ...filesArray]);
      else setAfterFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number, type: 'before' | 'after') => {
    if (type === 'before') setBeforeFiles(prev => prev.filter((_, i) => i !== index));
    else setAfterFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let photosBefore: string[] = [];
      let photosAfter: string[] = [];

      if (beforeFiles.length > 0) {
        const formData = new FormData();
        formData.append("taskId", task.id);
        formData.append("type", "before");
        beforeFiles.forEach(f => formData.append("file", f));
        photosBefore = await uploadPhotos(formData);
      }

      if (afterFiles.length > 0) {
        const formData = new FormData();
        formData.append("taskId", task.id);
        formData.append("type", "after");
        afterFiles.forEach(f => formData.append("file", f));
        photosAfter = await uploadPhotos(formData);
      }

      await onComplete(task.id, {
        completedNote,
        photosBefore,
        photosAfter
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error completing task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <CheckCircle2 className="text-green-500" />
            ปิดงาน (Complete Task)
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form id="completeTaskForm" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="p-4 bg-blue-50 text-blue-800 rounded-xl font-bold border border-blue-100">
              {task.title}
            </div>

            {requiresPhotos && (
              <div className="space-y-6 border-b border-gray-100 pb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">รูปถ่ายก่อนเริ่มงาน (Before)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {beforeFiles.map((f, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs overflow-hidden group">
                        <span className="truncate w-full px-2">{f.name}</span>
                        <button type="button" onClick={() => removeFile(idx, 'before')} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-colors bg-gray-50">
                      <Camera size={20} className="mb-1" />
                      <span className="text-[10px] font-bold">เพิ่มรูป</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'before')} />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">รูปถ่ายหลังเสร็จงาน (After)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {afterFiles.map((f, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs overflow-hidden group">
                        <span className="truncate w-full px-2">{f.name}</span>
                        <button type="button" onClick={() => removeFile(idx, 'after')} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-colors bg-gray-50">
                      <Camera size={20} className="mb-1" />
                      <span className="text-[10px] font-bold">เพิ่มรูป</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'after')} />
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">บันทึกเพิ่มเติม (Notes)</label>
              <textarea 
                rows={3} value={completedNote} onChange={e => setCompletedNote(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                placeholder="ระบุรายละเอียดผลการดำเนินงาน..."
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 mt-auto">
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">
            ยกเลิก
          </button>
          <button 
            type="submit" form="completeTaskForm" disabled={isSubmitting || (requiresPhotos && afterFiles.length === 0)}
            className="px-6 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? 'กำลังบันทึก...' : <><CheckCircle2 size={18} /> ยืนยันปิดงาน</>}
          </button>
        </div>
      </div>
    </div>
  );
}
