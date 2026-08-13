"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Search, FileText, Download, Trash2, Pencil, AlertCircle } from "lucide-react";
import { deleteGoodsReturn } from "@/app/actions/goodsReturns";

export default function GoodsReturnsClientPage({ initialData, currentUser }: { initialData: any[], currentUser: any, companies: any[], jobs: any[], quotations: any[] }) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filtered = data.filter((d: any) => 
    (d.documentNo || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.customer || "").toLowerCase().includes(search.toLowerCase())
  );

  const confirmDelete = async (id: string) => {
    const res = await deleteGoodsReturn(id);
    if (res.success) {
      setData(data.filter((d: any) => d.id !== id));
      setIsDeleting(null);
    } else {
      alert("Failed to delete document: " + res.error);
      setIsDeleting(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ใบส่งคืนสินค้า</h1>
          <p className="text-gray-500 text-sm">จัดการใบส่งคืนสินค้า (Goods Returns)</p>
        </div>
        <Link 
          href="/service/goods-returns/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#ff2301] text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm font-medium"
        >
          <Plus size={18} />
          สร้างใบส่งคืนสินค้า
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50/50">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="ค้นหาเลขที่เอกสาร หรือ ชื่อลูกค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ff2301] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">เลขที่เอกสาร</th>
                <th className="px-6 py-4">วันที่</th>
                <th className="px-6 py-4">ลูกค้า</th>
                <th className="px-6 py-4">ประเภท</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? filtered.map((doc: any) => (
                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{doc.documentNo}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {doc.date ? new Date(doc.date).toLocaleDateString('th-TH') : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {doc.customer || doc.company?.companyName || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {doc.returnType === 'DEFECT' ? 'คืนของเสีย' : doc.returnType === 'REPAIR' ? 'ส่งซ่อม' : doc.returnType === 'SUPPLIER' ? 'คืนซัพพลายเออร์' : doc.returnType === 'RETURN_TO_CUSTOMER' ? 'คืนลูกค้า' : doc.returnType === 'RETURN_WITHOUT_REPAIR' ? 'คืนโดยไม่ซ่อม' : doc.returnType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      doc.status === 'Draft' ? 'bg-gray-100 text-gray-600' :
                      doc.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={`/service/goods-returns/${doc.id}/edit`}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="แก้ไขเอกสาร"
                      >
                        <Pencil size={18} />
                      </Link>
                      <a 
                        href={`/api/service/goods-returns/${doc.id}/pdf`}
                        target="_blank"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="ดาวน์โหลด PDF"
                      >
                        <Download size={18} />
                      </a>
                      <button 
                        onClick={() => setIsDeleting(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบเอกสาร"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    ไม่มีข้อมูลใบส่งคืนสินค้า
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center transform transition-all">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">ลบเอกสาร</h3>
            <p className="text-gray-500 mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารนี้? การกระทำนี้ไม่สามารถยกเลิกได้</p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleting(null)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => confirmDelete(isDeleting)}
                className="flex-1 py-3 rounded-xl font-medium text-white bg-[#ff2301] hover:bg-red-700 transition-colors"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
