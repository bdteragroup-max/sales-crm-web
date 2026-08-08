"use client";

import React, { useState } from 'react';
import { X, PauseCircle } from 'lucide-react';

const PAUSE_REASONS = [
  "ทำโอที / หลัง 18:00 น. (Overtime)",
  "รอวัตถุดิบ (Waiting for parts)",
  "พักเที่ยง / พักเบรค (Lunch / Break)",
  "สลับไปทำงานอื่นชั่วคราว (Switching tasks)",
  "อื่นๆ (Other)"
];

export default function PauseJobModal({
  jobId,
  jobNumber,
  onClose,
  onSubmit
}: {
  jobId: string,
  jobNumber: string,
  onClose: () => void,
  onSubmit: (reason: string) => void
}) {
  const [selectedReason, setSelectedReason] = useState(PAUSE_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reason = selectedReason === "อื่นๆ (Other)" ? customReason : selectedReason;
    onSubmit(reason);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
          <h2 className="font-bold text-amber-800 flex items-center gap-2 text-sm">
            <PauseCircle size={18} className="text-amber-500" />
            พักงานประกอบชั่วคราว (Pause Job: {jobNumber})
          </h2>
          <button onClick={onClose} type="button" className="text-amber-400 hover:text-amber-600">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-700">เหตุผลที่พักงาน (Reason for Pause)</label>
            <div className="flex flex-col gap-2">
              {PAUSE_REASONS.map(reason => (
                <label key={reason} className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${selectedReason === reason ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <input type="radio" checked={selectedReason === reason} onChange={() => setSelectedReason(reason)} className="accent-amber-600 w-4 h-4" />
                  <span className="text-sm font-semibold">{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedReason === "อื่นๆ (Other)" && (
            <div className="space-y-1 animate-in slide-in-from-top-2">
              <label className="block text-xs font-bold text-gray-700">ระบุเหตุผล (Please specify)</label>
              <textarea
                required
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[80px]"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
            >
              ยืนยันการพักงาน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
