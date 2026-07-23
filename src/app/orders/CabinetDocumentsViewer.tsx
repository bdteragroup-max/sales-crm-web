"use client";

import React, { useState, useEffect } from "react";
import { File, Loader2, Link as LinkIcon, ExternalLink, Eye, X } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

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
  { key: "QUOTATION", label: "Quotation" },
  { key: "DRAWING", label: "Drawing Approval" },
  { key: "PAYMENT", label: "Payment" },
  { key: "CUSTOMER_DOC", label: "Customer Docs" },
];

export default function CabinetDocumentsViewer({ jobId }: { jobId: string }) {
  const [documents, setDocuments] = useState<JobDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<JobDocument | null>(null);

  const getPreviewUrl = (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (
      lowerUrl.includes('.pdf') ||
      lowerUrl.includes('.jpg') ||
      lowerUrl.includes('.jpeg') ||
      lowerUrl.includes('.png') ||
      lowerUrl.includes('.webp')
    ) {
      return url;
    }
    if (
      lowerUrl.includes('.doc') ||
      lowerUrl.includes('.xls') ||
      lowerUrl.includes('.ppt') ||
      lowerUrl.includes('.csv')
    ) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }
    return null;
  };

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
      <div className="flex justify-center p-4">
        <Loader2 className="animate-spin text-blue-500" size={20} />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-gray-400">
        ไม่มีเอกสารแนบ
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {DOC_TYPES.map(({ key, label }) => {
        const docs = groupedDocs[key];
        if (!docs || docs.length === 0) return null;

        return (
          <div key={key} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <h5 className="text-[11px] font-bold text-gray-500 uppercase mb-2">{label}</h5>
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-200 rounded p-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <File size={14} className="text-blue-500 shrink-0" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-semibold text-gray-700 truncate" title={doc.fileName}>
                        {doc.fileName}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {format(new Date(doc.createdAt), "dd MMM yy HH:mm", { locale: th })} • {formatFileSize(doc.fileSize)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {getPreviewUrl(doc.fileUrl) && (
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors"
                        title="ดูตัวอย่างเอกสาร (Preview)"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                      title="เปิดไฟล์ใหม่ / ดาวน์โหลด (Open in new tab / Download)"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 truncate">
                <File className="text-blue-500 shrink-0" size={20} />
                <span className="truncate">{previewDoc.fileName}</span>
              </h2>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 bg-gray-100 w-full h-full relative p-2">
              <iframe
                src={getPreviewUrl(previewDoc.fileUrl) || ''}
                className="w-full h-full rounded-lg shadow-inner bg-white"
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
