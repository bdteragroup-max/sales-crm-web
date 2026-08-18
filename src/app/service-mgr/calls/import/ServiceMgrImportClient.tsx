"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { ArrowLeft, Upload, Check, AlertTriangle, Loader2 } from "lucide-react";
import { importServiceCallsPreview, importServiceCallsCommit } from "@/app/actions/service-calls";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

export default function ServiceMgrImportClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    setFile(uploaded);
    setLoading(true);

    try {
      const data = await uploaded.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet);

      // Map excel columns to our data structure
      // Expected: "ลำดับที่", "วันที่รับแจ้ง", "ชื่อบริษัท", "ชื่อผู้ติดต่อ", "เบอร์โทร", "รุ่นเครื่อง", "อาการเสีย", "สาเหตุที่วิเคราะห์", "วิธีแก้ไข/คำแนะนำ", "สถานะ", "ผู้รับผิดชอบ"
      const mapped = json.map((row: any) => ({
        legacyNo: row["ลำดับที่"] || row["ลำดับ"] || row["No."] || null,
        receivedDate: parseExcelDate(row["วันที่รับแจ้ง"]),
        companyName: row["ชื่อบริษัท"] || row["ลูกค้า"] || row["Company"] || "",
        contactName: row["ชื่อผู้ติดต่อ"] || row["ผู้ติดต่อ"] || "",
        contactPhone: row["เบอร์โทร/Line"] || row["เบอร์โทร"] || row["Line"] || "",
        inverterModel: row["รุ่นของอินเวอร์เตอร์"] || row["รุ่นเครื่อง"] || row["โมเดล"] || row["Model"] || "",
        reportedIssue: row["ปัญหาที่รับแจ้ง/สอบถามการใช้"] || row["อาการเสีย"] || row["อาการที่พบ"] || row["Issue"] || "",
        analyzedCause: row["สาเหตุที่วิเคราะห์ได้"] || row["สาเหตุที่วิเคราะห์"] || row["สาเหตุ"] || "",
        recommendedSolution: row["แนะนำแนวทางแก้ไข"] || row["วิธีแก้ไข/คำแนะนำ"] || row["วิธีแก้ไข"] || "",
        status: row["สถานะ"] || row["Status"] || "",
        responsibleName: row["ผู้รับผิดชอบ"] || row["ช่างรับผิดชอบ"] || "",
        notes: row["หมายเหตุ"] || ""
      })).filter(r => r.legacyNo && r.companyName); // basic validation

      if (mapped.length === 0) {
        throw new Error("ไม่พบข้อมูล หรือรูปแบบคอลัมน์ไม่ถูกต้อง (ต้องมี ลำดับที่ และ ชื่อบริษัท)");
      }

      const previewResults = await importServiceCallsPreview(mapped);
      setPreviewData(previewResults);

    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'การอ่านไฟล์ล้มเหลว', text: error.message });
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const parseExcelDate = (excelDate: any) => {
    if (!excelDate) return null;
    if (typeof excelDate === 'number') {
      // Excel serial date to JS date
      const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
      return date.toISOString();
    }
    return new Date(excelDate).toISOString();
  };

  const handleCommit = async () => {
    setImporting(true);
    try {
      const res = await importServiceCallsCommit(previewData);
      Swal.fire({
        icon: 'success',
        title: 'นำเข้าข้อมูลสำเร็จ',
        text: `บันทึกข้อมูลเรียบร้อยแล้ว (${res.count} รายการ)`,
      });
      router.push("/service-mgr/calls");
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการนำเข้า', text: error.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm md:overflow-hidden overflow-visible">
      {/* ── Top Header Bar ── */}
      <header className="shrink-0 md:h-20 py-4 md:py-0 border-b border-gray-100 px-6 md:px-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-white w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#ff2301] flex items-center justify-center shadow-lg shadow-red-200">
            <Upload size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              นำเข้าข้อมูลเก่า
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Excel Import
            </p>
          </div>
        </div>
        <Link href="/service/calls" className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-[#ff2301] transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
        </Link>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 md:p-8 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-6">
              อัปโหลดไฟล์ Excel (.xlsx) เพื่อนำเข้าข้อมูล Service Call Log เก่า<br />ระบบจะพยายามจับคู่ชื่อผู้รับผิดชอบกับพนักงานในระบบอัตโนมัติ
            </p>

            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-red-50/50 hover:border-[#ff2301]/30 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {loading ? (
                    <Loader2 className="w-10 h-10 text-gray-300 animate-spin mb-3" />
                  ) : (
                    <Upload className="w-10 h-10 text-gray-300 group-hover:text-[#ff2301]/70 transition-colors mb-3" />
                  )}
                  <p className="text-sm font-bold text-gray-500 group-hover:text-[#ff2301] transition-colors">
                    {file ? file.name : 'คลิกเพื่อเลือกไฟล์ Excel'}
                  </p>
                </div>
                <input id="dropzone-file" type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          {previewData.length > 0 && (
            <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-gray-50/50">
                <h2 className="text-[13px] font-black text-gray-700 uppercase tracking-widest">
                  ตัวอย่างข้อมูลก่อนนำเข้า ({previewData.length} รายการ)
                </h2>
                <button
                  onClick={handleCommit}
                  disabled={importing}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#ff2301] text-white px-6 py-2.5 rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 disabled:bg-red-300 text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  ยืนยันการนำเข้าข้อมูล
                </button>
              </div>

              <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                <table className="w-full text-left text-sm min-w-[1000px]">
                  <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                    <tr className="border-b border-gray-100">
                      <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">ลำดับ</th>
                      <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">วันที่</th>
                      <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">บริษัท</th>
                      <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">โมเดล</th>
                      <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">สถานะ</th>
                      <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">ผู้รับผิดชอบ (จาก Excel)</th>
                      <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">การจับคู่บัญชีผู้ใช้</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewData.map((row, i) => (
                      <tr key={i} className="hover:bg-red-50/30 transition-colors group">
                        <td className="py-3 px-5 text-gray-500 font-medium">{row.legacyNo}</td>
                        <td className="py-3 px-5 text-gray-500">{row.receivedDate ? new Date(row.receivedDate).toLocaleDateString('th-TH') : '-'}</td>
                        <td className="py-3 px-5 font-semibold text-gray-900">{row.companyName}</td>
                        <td className="py-3 px-5 text-gray-600">{row.inverterModel}</td>
                        <td className="py-3 px-5">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${row.status?.includes('smoothly') || row.status?.includes('ปกติ') || row.status?.includes('ปิดเคส') || row.status?.includes('Customer has not yet made changes') || row.status?.includes('ระบบเดินได้เรียบร้อย') || row.status?.includes('ลูกค้ายังไม่แก้ไข') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {row.status || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-gray-600">{row.responsibleName || '-'}</td>
                        <td className="py-3 px-5">
                          {row.matchedUserId ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit">
                              <Check className="w-3 h-3" /> {row.matchedUserName}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                              <AlertTriangle className="w-3 h-3" /> บันทึกเป็นชื่อแทน
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
