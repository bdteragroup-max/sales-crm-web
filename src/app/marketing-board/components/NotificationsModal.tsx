'use client';

import React from 'react';
import { X, Bell, AlertTriangle, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { AnnouncementItem } from './AnnouncementCard';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  unacknowledgedItems: AnnouncementItem[];
  onOpenDetail: (item: AnnouncementItem) => void;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  unacknowledgedItems,
  onOpenDetail
}: NotificationsModalProps) {
  if (!isOpen) return null;

  const getProductGroupLabel = (pg: string) => {
    switch (pg) {
      case 'Marketing Headquarters': return 'การตลาดส่วนกลาง';
      case 'Inverter': return 'อินเวอร์เตอร์';
      case 'BLDC / Solar Pump': return 'ปั๊มน้ำโซล่าเซลล์';
      case 'Solar Roof': return 'โซลาร์รูฟ';
      default: return pg;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">การแจ้งเตือนและการรับทราบ</h3>
              <p className="text-xs text-slate-500">
                คุณมี <span className="font-bold text-red-600">{unacknowledgedItems.length}</span> ประกาศที่ยังไม่ได้รับทราบ
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content List */}
        <div className="p-5 max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
          {unacknowledgedItems.length > 0 ? (
            unacknowledgedItems.map(item => (
              <div 
                key={item.id}
                onClick={() => {
                  onOpenDetail(item);
                  onClose();
                }}
                className="py-3 px-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 group"
              >
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                  item.priority === 'Urgent' ? 'bg-red-600 ring-4 ring-red-100' : 'bg-amber-500'
                }`} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {getProductGroupLabel(item.productGroup)}
                    </span>
                    {item.priority === 'Urgent' && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                        ด่วนมาก
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-slate-800 group-hover:text-red-600 transition-colors line-clamp-1">
                    {item.campaignName}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {item.shortDescription}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700">คุณรับทราบประกาศครบทั้งหมดแล้ว</p>
              <p className="text-xs text-slate-400 mt-1">เมื่อมีโปรโมชั่นหรือแคมเปญใหม่ จะแจ้งเตือนที่นี่ทันที</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            ระบบจะแจ้งเตือนอัตโนมัติเมื่อมีอัปเดตสำคัญ
          </span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
}
