"use client";

import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, File, Trash2, Calendar, Loader2, Link as LinkIcon, PlusCircle } from "lucide-react";
import { th } from "date-fns/locale";
import { format } from "date-fns";

type JobDocument = {
  id: string;
  type: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  createdAt: string;
};

const DOC_TYPES = [
  { key: "BOQ", label: "BOQ" },
  { key: "QUOTATION", label: "ใบเสนอราคา (จากลูกค้า) / Quotation" },
  { key: "DRAWING", label: "ใบอนุมัติแบบตู้ / Container Drawing Approval Form" },
  { key: "PAYMENT", label: "เอกสารการชำระเงิน / Payment" },
  { key: "CUSTOMER_DOC", label: "เอกสารลูกค้า (ภ.พ.20, หนังสือรับรอง)" },
];

export default function CabinetDocumentSection({ 
  jobId, 
  initialRequiredDeliveryDate 
}: { 
  jobId: string;
  initialRequiredDeliveryDate?: Date | null;
}) {
  const [documents, setDocuments] = useState<JobDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [requiredDate, setRequiredDate] = useState<Date | null>(
    initialRequiredDeliveryDate ? new Date(initialRequiredDeliveryDate) : null
  );
  const [savingDate, setSavingDate] = useState(false);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    fetchDocuments();
  }, [jobId]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Failed to fetch documents", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("ขนาดไฟล์เกิน 20MB (File size exceeds 20MB)");
      return;
    }

    setUploadingType(type);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    try {
      const res = await fetch(`/api/jobs/${jobId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const newDoc = await res.json();
      setDocuments((prev) => [newDoc, ...prev]);
    } catch (error: any) {
      alert(`อัพโหลดไม่สำเร็จ: ${error.message}`);
    } finally {
      setUploadingType(null);
      if (fileInputRefs.current[type]) {
        fileInputRefs.current[type]!.value = "";
      }
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("คุณต้องการลบเอกสารนี้ใช่หรือไม่?")) return;

    setDeletingId(docId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/documents/${docId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (error) {
      alert("ลบเอกสารไม่สำเร็จ (Failed to delete document)");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const date = val ? new Date(val) : null;
    setRequiredDate(date);
    if (!date) return;
    
    setSavingDate(true);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiredDeliveryDate: date }),
      });
    } catch (error) {
      alert("บันทึกวันที่ไม่สำเร็จ (Failed to save date)");
    } finally {
      setSavingDate(false);
    }
  };

  const groupedDocs = documents.reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<string, JobDocument[]>);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 bg-[#ff2301] rounded-full"></div>
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <UploadCloud className="text-[#ff2301]" size={20} />
              เอกสารงานประกอบตู้ (Cabinet Documentation)
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-4">อัพโหลดไฟล์ BOQ, แบบตู้ และเอกสารสำคัญ (สูงสุด 20MB/ไฟล์)</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
          <Calendar className="text-amber-500" size={18} />
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase">วันที่ลูกค้าต้องการรับตู้</label>
            <div className="relative">
              <input
                type="date"
                value={requiredDate ? format(requiredDate, "yyyy-MM-dd") : ""}
                onChange={handleDateChange}
                className="text-sm font-bold text-gray-900 outline-none w-32 cursor-pointer bg-transparent"
              />
              {savingDate && (
                <Loader2 size={12} className="animate-spin text-gray-400 absolute -right-2 top-1.5" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50/20 grid grid-cols-1 md:grid-cols-2 gap-6">
        {DOC_TYPES.map(({ key, label }) => (
          <div key={key} className="bg-gray-50/50 border border-dashed border-gray-200 rounded-xl p-4 flex flex-col transition-colors hover:bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-700">{label}</h4>
              <button
                type="button"
                onClick={() => fileInputRefs.current[key]?.click()}
                disabled={uploadingType === key}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {uploadingType === key ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <PlusCircle size={14} />
                )}
                เพิ่มไฟล์
              </button>
              <input
                type="file"
                ref={(el) => {
                  fileInputRefs.current[key] = el;
                }}
                onChange={(e) => handleUpload(e, key)}
                className="hidden"
              />
            </div>
            
            <div className="flex-1 space-y-2">
              {groupedDocs[key]?.length > 0 ? (
                groupedDocs[key].map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg p-2.5 shadow-sm group">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="bg-blue-100 p-1.5 rounded text-blue-600">
                        <File size={14} />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <a 
                          href={doc.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs font-semibold text-gray-700 hover:text-blue-600 truncate transition-colors"
                          title={doc.fileName}
                        >
                          {doc.fileName}
                        </a>
                        <span className="text-[10px] text-gray-400">
                          {format(new Date(doc.createdAt), "dd MMM yy HH:mm", { locale: th })} • {formatFileSize(doc.fileSize)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center py-4 text-xs font-medium text-gray-400">
                  ยังไม่มีเอกสารแนบ
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
