import React, { useState } from 'react';
import { X, CheckCircle2, XCircle } from 'lucide-react';

export default function ProductionQCModal({
  job,
  productionOrder,
  onClose,
  onSubmit,
}: {
  job: any;
  productionOrder: any;
  onClose: () => void;
  onSubmit: (data: { status: 'PASS' | 'FAIL'; note?: string }) => void;
}) {
  const [status, setStatus] = useState<'PASS' | 'FAIL' | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) return;
    
    setIsSubmitting(true);
    await onSubmit({ status, note });
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="font-bold text-gray-900">ตรวจสอบคุณภาพ (QC)</h3>
            <p className="text-xs text-gray-500 mt-0.5">งาน: {job.jobNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                ผลการตรวจสอบ <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('PASS')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    status === 'PASS' 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : 'border-gray-100 bg-white hover:border-green-200 text-gray-500 hover:bg-green-50/50'
                  }`}
                >
                  <CheckCircle2 size={32} className={`mb-2 ${status === 'PASS' ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="font-bold text-sm">ผ่าน (PASS)</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setStatus('FAIL')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    status === 'FAIL' 
                      ? 'border-red-500 bg-red-50 text-red-700' 
                      : 'border-gray-100 bg-white hover:border-red-200 text-gray-500 hover:bg-red-50/50'
                  }`}
                >
                  <XCircle size={32} className={`mb-2 ${status === 'FAIL' ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className="font-bold text-sm">ไม่ผ่าน (FAIL)</span>
                </button>
              </div>
            </div>

            {status === 'FAIL' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  หมายเหตุ / สาเหตุที่ไม่ผ่าน <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red text-sm min-h-[100px]"
                  placeholder="ระบุรายละเอียด..."
                />
              </div>
            )}
            
            {status === 'PASS' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  หมายเหตุ (เพิ่มเติม)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm min-h-[80px]"
                  placeholder="ระบุรายละเอียด (ถ้ามี)..."
                />
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!status || isSubmitting}
              className="px-6 py-2 text-sm font-bold text-white bg-brand-red hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึกผล QC'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
