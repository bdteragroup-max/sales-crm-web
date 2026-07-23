import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, ImageIcon, Loader2, UploadCloud, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function ProductionQCModal({
  job,
  productionOrder,
  onClose,
  onSubmit,
}: {
  job: any;
  productionOrder: any;
  onClose: () => void;
  onSubmit: (data: { status: 'PASS' | 'FAIL'; note?: string; qcImages?: string[] }) => void;
}) {
  const [status, setStatus] = useState<'PASS' | 'FAIL' | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qcImages, setQcImages] = useState<{ url: string; name: string }[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (qcImages.length + files.length > 10) {
      alert('สามารถแนบรูปภาพได้สูงสุด 10 รูป (Maximum 10 images)');
      return;
    }

    setIsUploadingImage(true);
    const supabase = createClient();
    try {
      const uploadedDocs: { url: string; name: string }[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `qc-images/${productionOrder.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('uploadsService')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('uploadsService')
          .getPublicUrl(filePath);

        uploadedDocs.push({ url: publicUrl, name: file.name });
      }

      setQcImages(prev => [...prev, ...uploadedDocs]);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ (Failed to upload image)');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = (urlToRemove: string) => {
    setQcImages(prev => prev.filter(img => img.url !== urlToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) return;
    
    setIsSubmitting(true);
    await onSubmit({ status, note, qcImages: qcImages.map(img => img.url) });
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
            
            {/* Image Upload Section */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700">
                  รูปภาพประกอบ QC (สูงสุด 10 รูป)
                </label>
                <span className="text-xs text-gray-500 font-medium">
                  {qcImages.length}/10
                </span>
              </div>
              
              <div className="grid grid-cols-5 gap-2 mb-3">
                {qcImages.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.url)}
                      className="absolute top-1 right-1 bg-white/80 hover:bg-red-50 text-gray-600 hover:text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm shadow-sm"
                      title="ลบรูปภาพ"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                
                {qcImages.length < 10 && (
                  <label className={`relative aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-gray-50 ${isUploadingImage ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'}`}>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                    />
                    {isUploadingImage ? (
                      <Loader2 size={20} className="text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <UploadCloud size={20} className="text-gray-400 mb-1" />
                        <span className="text-[10px] font-medium text-gray-500">เพิ่มรูป</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>
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
