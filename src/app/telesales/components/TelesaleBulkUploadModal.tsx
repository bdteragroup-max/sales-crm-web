"use client";

import React, { useState, useMemo } from 'react';
import { X, UploadCloud, Download, AlertCircle, CheckCircle2, Search, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveBulkTelesalesData } from '@/app/actions/telesalesBulk';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TelesaleBulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState<{ successCount: number; errorCount: number; errors: string[] } | null>(null);

  const handleDownloadTemplate = () => {
    const headers = [
      "วันที่โทร", "ชื่อบริษัท/บุคคล", "ผู้ติดต่อ", "เบอร์โทร", "เนื้อหาที่พูดคุยระหว่างการพูดคุย",
      "ประเภทลูกค้า", "สถานะลูกค้า", "วัตถุประสงค์ของการเข้าพบ", "การรับสาย", "งานส่งต่อ",
      "สิ่งที่ลูกค้าต้องการ หรือปัญหาที่ลูกค้าต้องการแก้ไข", "ชื่อคู่แข่ง", "ราคาคู่แข่ง",
      "โปรโมชั่นคู่แข่ง", "วันที่เข้าพบล่าสุด", "สถานะการโทร", "ผลลัพธ์", "นัดโทรกลับวันที่",
      "เข้านำเสนอ", "เสนอราคา", "ปิดการขาย"
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, "Telesales_Template");
    XLSX.writeFile(wb, "Telesales_Bulk_Upload_Template.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setResult(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        setPreviewData(jsonData);
        setSelectedRows(new Set(jsonData.map((_, i) => i))); // Select all by default
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const filteredPreviewData = useMemo(() => {
    if (!previewData) return [];
    return previewData.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [previewData, searchTerm]);

  if (!isOpen) return null;

  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) newSelected.delete(index);
    else newSelected.add(index);
    setSelectedRows(newSelected);
  };

  const toggleAll = () => {
    if (selectedRows.size === filteredPreviewData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(previewData?.map((_, i) => i)));
    }
  };

  const handleUpload = async () => {
    if (!previewData) return;

    setIsUploading(true);
    // Sanitize data to ensure only plain objects are passed to Server Action
    const selectedData = previewData.filter((_, i) => selectedRows.has(i));
    const dataToUpload = JSON.parse(JSON.stringify(selectedData));

    if (dataToUpload.length === 0) {
      alert("กรุณาเลือกอย่างน้อย 1 รายการเพื่อนำเข้า");
      setIsUploading(false);
      return;
    }

    const response = await saveBulkTelesalesData(dataToUpload);
    
    if (response.success) {
      setResult({
        successCount: response.successCount || 0,
        errorCount: response.errorCount || 0,
        errors: response.errors || []
      });
      if (response.errorCount === 0) {
        onSuccess();
      }
    } else {
      alert(`การอัปโหลดล้มเหลว: ${response.error}`);
    }
    setIsUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">นำเข้าข้อมูลเทเลเซลล์ (Bulk Import)</h2>
            <p className="text-gray-500 text-sm mt-1">อัปโหลดไฟล์ Excel เพื่อนำเข้าข้อมูลหลายรายการพร้อมกัน</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!result ? (
            <div className="space-y-6">
              {!previewData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Step 1 */}
                  <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 flex flex-col items-center text-center">
                    <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl mb-4">
                      <Download size={32} />
                    </div>
                    <h3 className="font-bold text-blue-900 mb-2">1. ดาวน์โหลดเทมเพลต</h3>
                    <p className="text-blue-700/70 text-sm mb-6">
                      ใช้ไฟล์เทมเพลตมาตรฐานของเราเพื่อให้ระบบสามารถอ่านข้อมูลได้อย่างถูกต้อง
                    </p>
                    <button 
                      onClick={handleDownloadTemplate}
                      className="w-full font-bold bg-white border border-blue-200 text-blue-700 py-3 rounded-2xl hover:bg-blue-50 transition-all shadow-sm"
                    >
                      ดาวน์โหลดไฟล์เทมเพลต
                    </button>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-red-50/30 border border-red-100 rounded-3xl p-6 flex flex-col items-center text-center">
                    <div className="p-4 bg-red-100 text-red-600 rounded-2xl mb-4">
                      <UploadCloud size={32} />
                    </div>
                    <h3 className="font-bold text-red-900 mb-2">2. อัปโหลดไฟล์ข้อมูล</h3>
                    <p className="text-red-700/70 text-sm mb-6">
                      รองรับไฟล์ .xlsx หรือ .csv ที่คุณบันทึกจาก Google Sheets
                    </p>
                    <label className="w-full">
                      <div className="font-bold bg-red-600 text-white py-3 rounded-2xl hover:bg-red-700 transition-all shadow-md cursor-pointer">
                        เลือกไฟล์เพื่ออัปโหลด
                      </div>
                      <input type="file" className="hidden" accept=".xlsx,.csv" onChange={handleFileChange} />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Preview & Filter Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-bold text-gray-700">
                        เลือกแล้ว {selectedRows.size} จาก {previewData.length} รายการ
                      </div>
                      <button 
                        onClick={toggleAll}
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        {selectedRows.size === previewData.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                      </button>
                    </div>
                    <div className="relative flex-1 max-w-xs">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="กรองข้อมูลในตาราง..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Table Preview */}
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="w-full text-left text-xs text-gray-600 border-collapse">
                        <thead className="bg-gray-100/80 sticky top-0 z-10">
                          <tr>
                            <th className="p-3 w-10"></th>
                            <th className="p-3 font-bold border-b border-gray-200">วันที่โทร</th>
                            <th className="p-3 font-bold border-b border-gray-200">ชื่อบริษัท</th>
                            <th className="p-3 font-bold border-b border-gray-200">ผู้ติดต่อ</th>
                            <th className="p-3 font-bold border-b border-gray-200">เบอร์โทร</th>
                            <th className="p-3 font-bold border-b border-gray-200">สถานะการโทร</th>
                            <th className="p-3 font-bold border-b border-gray-200">ผลลัพธ์</th>
                            <th className="p-3 font-bold border-b border-gray-200">เนื้อหา</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredPreviewData.map((row, i) => {
                            const originalIndex = previewData.indexOf(row);
                            return (
                              <tr key={i} className={`hover:bg-gray-50 transition-colors ${selectedRows.has(originalIndex) ? 'bg-red-50/30' : ''}`}>
                                <td className="p-3 text-center">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                    checked={selectedRows.has(originalIndex)}
                                    onChange={() => toggleRow(originalIndex)}
                                  />
                                </td>
                                <td className="p-3">{row["วันที่โทร"]}</td>
                                <td className="p-3 font-bold text-gray-900">{row["ชื่อบริษัท/บุคคล"] || row["ชื่อบริษัท"]}</td>
                                <td className="p-3">{row["ผู้ติดต่อ"]}</td>
                                <td className="p-3">{row["เบอร์โทร"]}</td>
                                <td className="p-3">{row["สถานะการโทร"]}</td>
                                <td className="p-3 font-bold text-red-600">{row["ผลลัพธ์"]}</td>
                                <td className="p-3 max-w-xs truncate">{row["เนื้อหาที่พูดคุยระหว่างการพูดคุย"]}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center p-6">
                {result.errorCount === 0 ? (
                  <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
                ) : (
                  <AlertCircle size={64} className="text-yellow-500 mx-auto mb-4" />
                )}
                <h3 className="text-2xl font-bold text-gray-900">การนำเข้าเสร็จสมบูรณ์</h3>
                <p className="text-gray-500 mt-2">สรุปผลการนำเข้าข้อมูลเทเลเซลล์</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-100 rounded-3xl p-6 text-center shadow-sm shadow-green-100">
                  <div className="text-4xl font-black text-green-700">{result.successCount}</div>
                  <div className="text-sm font-bold text-green-600 mt-2 uppercase tracking-wider">นำเข้าสำเร็จ</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-3xl p-6 text-center shadow-sm shadow-red-100">
                  <div className="text-4xl font-black text-red-700">{result.errorCount}</div>
                  <div className="text-sm font-bold text-red-600 mt-2 uppercase tracking-wider">นำเข้าไม่สำเร็จ</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-2 px-1 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" />
                    รายละเอียดข้อผิดพลาด:
                  </h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 max-h-40 overflow-y-auto text-xs text-gray-600 space-y-2">
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-red-400 font-bold">•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 mt-auto">
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-2xl hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
          >
            {result ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
          </button>
          {!result && previewData && (
            <button
              onClick={handleUpload}
              disabled={selectedRows.size === 0 || isUploading}
              className="px-8 py-3 text-sm font-bold text-white bg-red-600 rounded-2xl hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-red-200"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังนำเข้า {selectedRows.size} รายการ...
                </>
              ) : (
                `นำเข้าข้อมูล (${selectedRows.size} รายการ)`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
