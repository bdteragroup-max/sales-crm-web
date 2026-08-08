"use client";

import React, { useState } from 'react';
import { X, ClipboardCheck, Camera, Check } from 'lucide-react';

export default function CabinetQCModal({
  jobId,
  jobNumber,
  projectName,
  technicianName,
  onClose,
  onSubmit
}: {
  jobId: string,
  jobNumber: string,
  projectName: string,
  technicianName: string,
  onClose: () => void,
  onSubmit: (qcData: any) => void
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    serialNumber: '',
    nameplate: 'Solar Pump 2.2kW 220V Normal (No front panel Volt/Amp)',
    cabinetType: 'Double-layer with glass',
    fanStatus: 'Fan',
    
    magicMarks: false,
    cabinetBody: false,
    inverterCorrect: false,
    frontPanelEquipment: false,
    wireDucting: false,
    terminals: false,
    cabinetKey: false,
    internalWiring: false,
    screwsTightened: false,
    groundingSystem: false,
    noMarks: false,
    overallEquipmentCheck: false,
    electricalSystem: false,
    wiringConnections: false,
    warningLabels: false,
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...newFiles]);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of photos) {
        // Convert to base64 for testing purposes so they actually render in QC Review
        const reader = new FileReader();
        const base64Url = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        uploadedUrls.push(base64Url);
      }

      onSubmit({
        ...formData,
        confirmationPhotos: uploadedUrls
      });
    } catch (err) {
      console.error(err);
      alert('Failed to submit QC report');
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center shrink-0">
          <h2 className="font-bold text-blue-800 flex items-center gap-2 text-sm">
            <ClipboardCheck size={18} className="text-blue-500" />
            รายงานประกอบตู้ / ตรวจสอบ (QC Report)
          </h2>
          <button onClick={onClose} type="button" className="text-blue-400 hover:text-blue-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-8">

          {/* Section 1 */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 border-b pb-2">1. ข้อมูลทั่วไป (General Information)</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">ชื่อโครงการ:</span> <strong className="text-gray-900">{projectName || '-'}</strong></div>
              <div><span className="text-gray-500">หมายเลขตู้:</span> <strong className="text-gray-900">{jobNumber}</strong></div>
              <div><span className="text-gray-500">ชื่อช่างประกอบ:</span> <strong className="text-gray-900">{technicianName}</strong></div>
              <div>
                <span className="text-gray-500 block mb-1">ประเภทตู้:</span>
                <select
                  value={formData.cabinetType}
                  onChange={e => setFormData({ ...formData, cabinetType: e.target.value })}
                  className="w-full border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="Double-layer with glass">ตู้ 2 ชั้นมีกระจก (Double-layer with glass)</option>
                  <option value="Single-layer without glass">ตู้ชั้นเดียวไม่มีกระจก (Single-layer without glass)</option>
                </select>
              </div>
              
              <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-3 mt-1">
                <div>
                  <span className="text-gray-500 block mb-1">Serial Number (S/N):</span>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="Enter S/N"
                    className="w-full border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">พัดลมระบายอากาศ:</span>
                  <select
                    value={formData.fanStatus}
                    onChange={e => setFormData({ ...formData, fanStatus: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="Fan">มีพัดลม (Fan)</option>
                    <option value="No Fan">ไม่มีพัดลม (No Fan)</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <span className="text-gray-500 block mb-1">Nameplate:</span>
                  <select
                    value={formData.nameplate}
                    onChange={e => setFormData({ ...formData, nameplate: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="Solar Pump 2.2kW 220V Normal (No front panel Volt/Amp)">Solar Pump 2.2kW 220V Normal (No front panel Volt/Amp)</option>
                    <option value="Solar Pump 2.2kW 220V V&A">Solar Pump 2.2kW 220V V&A</option>
                    <option value="Solar Pump 2.2kW 380V">Solar Pump 2.2kW 380V</option>
                    <option value="Others (Printable)">อื่นๆ (Others, printable)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 border-b pb-2">2. รายการตรวจสอบ (Inspection Items)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {checklistItems.map(item => (
                <label key={item.name} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${(formData as any)[item.name] ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${(formData as any)[item.name] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'}`}>
                    {(formData as any)[item.name] && <Check size={14} strokeWidth={3} />}
                  </div>
                  <input type="checkbox" name={item.name} checked={(formData as any)[item.name]} onChange={handleCheckboxChange} className="sr-only" />
                  <span className={`text-xs font-semibold leading-tight ${(formData as any)[item.name] ? 'text-emerald-800' : 'text-gray-600'}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 border-b pb-2">3. การยืนยันและเวลา (Verification & Time Tracking)</h3>
            <p className="text-xs text-gray-500">* เวลาประกอบปกติและโอทีจะถูกคำนวณอัตโนมัติเมื่อกดส่งรายงาน</p>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">รูปภาพยืนยันการตรวจสอบ (Proof Photo with Assigned Task)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
                <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                    <Camera size={20} />
                  </div>
                  <span className="text-xs font-bold">คลิกเพื่ออัปโหลดรูปภาพ</span>
                </label>
              </div>
              {photoPreviews.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-3">
                  {photoPreviews.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                      <img src={src} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
              {loading ? 'กำลังบันทึก...' : 'บันทึกรายงานและจบงาน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
