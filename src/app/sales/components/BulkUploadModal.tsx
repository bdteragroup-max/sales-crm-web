"use client";

import React, { useState } from 'react';
import { X, UploadCloud, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveBulkSalesData } from '@/app/actions/salesBulk';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ successCount: number; errorCount: number; errors: string[] } | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [processedRows, setProcessedRows] = useState(0);

  if (!isOpen) return null;

  const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
    // Exact column headers matching `saveBulkSalesData`
    const headers = [
      "ชื่อบริษัท", "เลขที่ Requirement", "วันที่ Requirement", "เลขที่ใบเสนอราคา", "วันที่ใบเสนอราคา", 
      "สถานะ", "เหตุผลที่ปฏิเสธ", "ยอดขายก่อน VAT", "ค่าขนส่ง", "ค่าติดตั้ง",
      "ยอดปิดการขายจริง", "วันที่ PO", "วันที่วางบิล", "เลขที่ใบแจ้งหนี้", "เหตุผลที่ชนะ/แพ้",
      "เลขประจำตัวผู้เสียภาษี", "สาขา/สำนักงานใหญ่", "รหัสไปรษณีย์", "จังหวัด", "อำเภอ/เขต", "ตำบล/แขวง", "ที่อยู่",
      "ชื่อผู้ติดต่อ", "ตำแหน่ง", "เบอร์โทรศัพท์มือถือ", "ประเภทธุรกิจ", "ช่องทางการเข้าถึงลูกค้า",
      "ประเภทลูกค้า", "สถานะลูกค้า", "สินค้าที่สนใจ", "ประเภทสินค้า",
      "ติดตามครั้งที่ 1", "ติดตามครั้งที่ 2", "ติดตามครั้งที่ 3", "ติดตามครั้งที่ 4", "หมายเหตุ",
      "สาขาการขาย", "หัวหน้าทีมขาย", "วันที่สร้าง"
    ];

    const exampleRow = [
      "บริษัท ตัวอย่าง จำกัด", "REQ-690515-ABC", "2026-05-15", "QUO-2026-001", "2026-05-16",
      "เสนอราคา", "", "15000", "500", "0",
      "", "", "", "", "",
      "0105512345678", "สำนักงานใหญ่", "10110", "กรุงเทพมหานคร", "เขตคลองเตย", "คลองเตย", "123 ถ.สุขุมวิท",
      "คุณสมชาย", "ผู้จัดการจัดซื้อ", "0812345678", "โรงงานอุตสาหกรรม", "Website",
      "USER", "ลูกค้าใหม่", "Inverter Veichi", "Inverter Other",
      "2026-05-20", "", "", "", "ต้องการของด่วน",
      "สาขากรุงเทพ", "คุณหัวหน้าทีม", "2026-05-15"
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    
    // Auto-adjust column width for better readability
    const wscols = headers.map(h => ({ wch: Math.max(h.length, 15) }));
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Template");
    if (format === 'csv') {
      XLSX.writeFile(wb, "Quotation_Bulk_Upload_Template.csv", { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, "Quotation_Bulk_Upload_Template.xlsx");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setResult(null);
      setProcessedRows(0);
      setParsedData([]);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          setParsedData(jsonData);
        } catch (err) {
          console.error("Error parsing file preview:", err);
        }
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      alert("ไฟล์ที่อัปโหลดไม่มีข้อมูล (The uploaded file is empty)");
      return;
    }

    setIsUploading(true);
    setResult(null);
    setProcessedRows(0);

    let successCount = 0;
    let errorCount = 0;
    let errors: string[] = [];

    try {
      const chunkSize = 20; // Process in chunks to show progress
      for (let i = 0; i < parsedData.length; i += chunkSize) {
        const chunk = parsedData.slice(i, i + chunkSize);
        // Clean chunk for server action
        const cleanChunk = JSON.parse(JSON.stringify(chunk));
        
        const response = await saveBulkSalesData(cleanChunk);
        
        if (response.success) {
          successCount += response.successCount || 0;
          errorCount += response.errorCount || 0;
          if (response.errors) {
            errors = [...errors, ...response.errors];
          }
        } else {
          errors.push(`เกิดข้อผิดพลาดในชุดข้อมูลที่ ${Math.floor(i/chunkSize) + 1}: ${response.error}`);
          errorCount += chunk.length;
        }

        setProcessedRows(Math.min(i + chunkSize, parsedData.length));
      }

      setResult({
        successCount,
        errorCount,
        errors
      });

      if (errorCount === 0) {
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      alert(`เกิดข้อผิดพลาดในการอัปโหลด: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">นำเข้าข้อมูลใบเสนอราคา (Bulk Import)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!result ? (
            <div className="space-y-6">
              {/* Template Download Section */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                  <Download size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 text-sm">ขั้นตอนที่ 1: ดาวน์โหลดเทมเพลต</h3>
                  <div className="text-blue-700 text-xs mt-1 mb-3 space-y-1.5">
                    <p>เพื่อให้นำเข้าข้อมูลได้สำเร็จ กรุณาใช้ไฟล์เทมเพลตมาตรฐานของเรา</p>
                    <p className="font-bold text-red-600">• รูปแบบวันที่ต้องเป็น ปี(ค.ศ.)-เดือน-วัน เช่น 2026-05-15</p>
                    <p className="text-emerald-700 font-bold">• คอลัมน์ "สาขาการขาย" และ "หัวหน้าทีมขาย" ไม่จำเป็นต้องกรอก (ระบบจะดึงข้อมูลประวัติของคุณโดยอัตโนมัติ)</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleDownloadTemplate('xlsx')}
                      className="text-xs font-bold bg-white border border-blue-200 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                    >
                      ดาวน์โหลด Excel (.xlsx)
                    </button>
                    <button 
                      onClick={() => handleDownloadTemplate('csv')}
                      className="text-xs font-bold bg-white border border-blue-200 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                    >
                      ดาวน์โหลด CSV (.csv)
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Section */}
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-3">ขั้นตอนที่ 2: อัปโหลดไฟล์ข้อมูล</h3>
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file && !isUploading ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'} ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className={`w-8 h-8 mb-2 ${file ? 'text-green-500' : 'text-gray-400'}`} />
                    <p className="mb-1 text-sm text-gray-600 font-medium">
                      {file ? file.name : "คลิกเพื่ออัปโหลด หรือลากไฟล์มาวางที่นี่"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : "รองรับไฟล์ XLSX หรือ CSV (สูงสุด 10MB)"}
                    </p>
                  </div>
                  <input type="file" className="hidden" accept=".xlsx,.csv" onChange={handleFileChange} disabled={isUploading} />
                </label>
                
                {parsedData.length > 0 && !isUploading && !result && (
                  <div className="mt-4 flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-indigo-900">ไฟล์พร้อมนำเข้า</p>
                        <p className="text-xs font-medium text-indigo-700 mt-0.5">พบข้อมูลทั้งหมด <span className="font-black text-indigo-900 text-sm">{parsedData.length}</span> รายการ</p>
                      </div>
                    </div>
                  </div>
                )}

                {isUploading && (
                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-5 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <span className="text-sm font-bold text-gray-900">กำลังนำเข้าข้อมูล...</span>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">กรุณารอสักครู่ ห้ามปิดหน้าต่างนี้</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-brand-red">{processedRows}</span>
                        <span className="text-xs font-bold text-gray-400 ml-1">/ {parsedData.length}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-brand-red h-full rounded-full transition-all duration-300 ease-out" 
                        style={{ width: `${Math.max(2, Math.round((processedRows / parsedData.length) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center p-6 pb-2">
                {result.errorCount === 0 ? (
                  <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                ) : (
                  <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4" />
                )}
                <h3 className="text-xl font-bold text-gray-900">การนำเข้าเสร็จสมบูรณ์</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{result.successCount}</div>
                  <div className="text-xs font-medium text-green-600 mt-1">นำเข้าสำเร็จ</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{result.errorCount}</div>
                  <div className="text-xs font-medium text-red-600 mt-1">นำเข้าไม่สำเร็จ</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">รายละเอียดข้อผิดพลาด:</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto text-xs text-gray-600 space-y-1">
                    {result.errors.map((err, i) => (
                      <div key={i}>{err}</div>
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
            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {result ? 'ปิด (Close)' : 'ยกเลิก (Cancel)'}
          </button>
          {!result && (
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังนำเข้า...
                </>
              ) : (
                'นำเข้าข้อมูล'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
