'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Download, Eye, FileText, CheckSquare, 
  Square, Calendar, Users, ArrowUpDown, Sparkles, ExternalLink, RefreshCw 
} from 'lucide-react';
import { incrementDownloadCount } from '@/app/actions/marketingBoard';
import JSZip from 'jszip';
import MarketingConfirmModal from './MarketingConfirmModal';

interface MaterialItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType?: string | null;
  documentType: string;
  productGroup: string;
  relatedCampaign: string;
  relatedCampaignId?: string | null;
  version: string;
  effectiveDate?: Date | string | null;
  expiryDate?: Date | string | null;
  downloadCount: number;
  uploadedBy: string;
  uploadedAt: Date | string;
  isExpired: boolean;
  isNewVersion: boolean;
}

interface SalesMaterialsTabProps {
  initialMaterials: MaterialItem[];
  onRefresh: () => void;
  userPermissions?: any;
}

const DOCUMENT_TYPES = [
  { value: 'All Types', label: 'ทุกประเภทเอกสาร' },
  { value: 'Promotion Artwork', label: 'ภาพสื่อโปรโมชั่น (Artwork)' },
  { value: 'Product Brochure', label: 'โบรชัวร์สินค้า (Brochure)' },
  { value: 'Catalog', label: 'แคตตาล็อกสินค้า (Catalog)' },
  { value: 'Price List', label: 'ตารางราคา (Price List)' },
  { value: 'Promotion Terms & Conditions', label: 'เงื่อนไขโปรโมชั่น (Terms)' },
  { value: 'Sales Script', label: 'สคริปต์การขาย (Sales Script)' },
  { value: 'Telesales Script', label: 'สคริปต์เทเลเซลส์ (Telesales Script)' },
  { value: 'Product Presentation', label: 'สไลด์นำเสนอสินค้า (Presentation)' },
  { value: 'Quotation Template', label: 'ใบเสนอราคาตัวอย่าง (Quotation)' },
  { value: 'Order Form', label: 'แบบฟอร์มสั่งซื้อ (Order Form)' },
  { value: 'Product Specification', label: 'สเปกสินค้า (Specification)' },
  { value: 'Video', label: 'วิดีโอ (Video)' },
  { value: 'Social Media Artwork', label: 'สื่อโซเชียลมีเดีย (Social Media)' },
  { value: 'LINE OA Material', label: 'สื่อ LINE OA' },
  { value: 'Others', label: 'อื่นๆ (Others)' }
];

const PRODUCT_GROUPS = [
  { value: 'All Product Groups', label: 'ทุกกลุ่มสินค้า' },
  { value: 'Marketing Headquarters', label: 'การตลาดส่วนกลาง (Headquarters)' },
  { value: 'Inverter', label: 'อินเวอร์เตอร์ (Inverter)' },
  { value: 'BLDC / Solar Pump', label: 'ปั๊มน้ำโซล่าเซลล์ (BLDC / Solar Pump)' },
  { value: 'Solar Roof', label: 'โซลาร์รูฟ (Solar Roof)' }
];

export default function SalesMaterialsTab({
  initialMaterials,
  onRefresh,
  userPermissions
}: SalesMaterialsTabProps) {
  const [materials, setMaterials] = useState<MaterialItem[]>(initialMaterials);
  const [search, setSearch] = useState('');
  const [selectedProductGroup, setSelectedProductGroup] = useState('All Product Groups');
  const [selectedDocType, setSelectedDocType] = useState('All Types');
  const [latestOnly, setLatestOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isZipping, setIsZipping] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    subMessage?: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  // Update materials when initialMaterials changes
  React.useEffect(() => {
    setMaterials(initialMaterials);
  }, [initialMaterials]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      if (search.trim() !== '') {
        const q = search.toLowerCase().trim();
        const match = m.fileName.toLowerCase().includes(q) ||
          m.relatedCampaign.toLowerCase().includes(q) ||
          m.documentType.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedProductGroup !== 'All Product Groups' && m.productGroup !== selectedProductGroup) {
        return false;
      }
      if (selectedDocType !== 'All Types' && m.documentType !== selectedDocType) {
        return false;
      }
      if (latestOnly && m.isExpired) {
        return false;
      }
      return true;
    });
  }, [materials, search, selectedProductGroup, selectedDocType, latestOnly]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredMaterials.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMaterials.map(m => m.id));
    }
  };

  const handleDownload = async (item: MaterialItem) => {
    incrementDownloadCount(item.id).catch(() => {});
    setMaterials(prev => prev.map(m => m.id === item.id ? { ...m, downloadCount: m.downloadCount + 1 } : m));
    window.open(item.fileUrl, '_blank');
  };

  const handleDownloadSelectedZip = async () => {
    const targetItems = materials.filter(m => selectedIds.includes(m.id));
    if (targetItems.length === 0 || isZipping) return;

    try {
      setIsZipping(true);
      const zip = new JSZip();
      const folder = zip.folder('TERA_Sales_Materials') || zip;

      const promises = targetItems.map(async item => {
        try {
          incrementDownloadCount(item.id).catch(() => {});
          const res = await fetch(item.fileUrl);
          const blob = await res.blob();
          folder.file(item.fileName, blob);
        } catch (e) {
          console.warn(`Could not add ${item.fileName} to ZIP`, e);
        }
      });

      await Promise.all(promises);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `TERA_Sales_Materials_Selected_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      setAlertConfig({
        isOpen: true,
        title: 'ไม่สามารถสร้างไฟล์ ZIP ได้',
        message: 'ระบบไม่สามารถรวมไฟล์ที่เลือกเป็น ZIP ได้ในขณะนี้',
        subMessage: 'กรุณาดาวน์โหลดไฟล์แยกเป็นรายไฟล์แทน'
      });
    } finally {
      setIsZipping(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getProductGroupLabel = (pg: string) => {
    switch (pg) {
      case 'Marketing Headquarters': return 'การตลาดส่วนกลาง (HQ)';
      case 'Inverter': return 'อินเวอร์เตอร์';
      case 'BLDC / Solar Pump': return 'ปั๊มน้ำโซล่าเซลล์';
      case 'Solar Roof': return 'โซลาร์รูฟ';
      default: return pg;
    }
  };

  const getDocumentTypeLabel = (docType: string) => {
    const match = DOCUMENT_TYPES.find(t => t.value === docType);
    return match ? match.label : docType;
  };

  return (
    <div className="flex flex-col flex-1 space-y-6 pb-12">
      {/* Symmetrical Top Filter & Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        
        {/* Left: Search & Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อเอกสาร, แคมเปญ หรือประเภทเอกสาร..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none transition-all"
            />
          </div>

          {/* Product Group Dropdown */}
          <select
            value={selectedProductGroup}
            onChange={(e) => setSelectedProductGroup(e.target.value)}
            className="text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
          >
            {PRODUCT_GROUPS.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>

          {/* Document Type Dropdown */}
          <select
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value)}
            className="text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
          >
            {DOCUMENT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Latest Version Only Toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none py-1 px-2 rounded-lg hover:bg-slate-50">
            <input
              type="checkbox"
              checked={latestOnly}
              onChange={(e) => setLatestOnly(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
            />
            <span>เฉพาะเอกสารล่าสุด (ซ่อนเอกสารหมดอายุ)</span>
          </label>
        </div>

        {/* Right: Batch Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDownloadSelectedZip}
              disabled={isZipping}
              className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Download size={15} />
              <span>{isZipping ? 'กำลังสร้างไฟล์ ZIP...' : `ดาวน์โหลดที่เลือก (${selectedIds.length}) เป็น ZIP`}</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200/80 shadow-2xs"
            title="รีเฟรชข้อมูล (Refresh)"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Symmetrical Document Library Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4 w-12 text-center">
                  <button 
                    onClick={handleSelectAll}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    {selectedIds.length === filteredMaterials.length && filteredMaterials.length > 0 ? (
                      <CheckSquare size={16} className="text-red-600" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="p-4">ชื่อเอกสาร</th>
                <th className="p-4">กลุ่มสินค้า</th>
                <th className="p-4">ประเภทเอกสาร</th>
                <th className="p-4">แคมเปญที่เกี่ยวข้อง</th>
                <th className="p-4 text-center">เวอร์ชัน</th>
                <th className="p-4">ขนาดไฟล์</th>
                <th className="p-4 text-center">ดาวน์โหลด</th>
                <th className="p-4 text-right">ดำเนินการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map(item => {
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr 
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <button 
                          onClick={() => handleToggleSelect(item.id)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-red-600" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>

                      {/* Name with badges */}
                      <td className="p-3.5 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 font-bold text-[10px]">
                            {item.fileName.endsWith('.pdf') ? 'PDF' :
                             item.fileName.endsWith('.xlsx') || item.fileName.endsWith('.xls') ? 'XLS' :
                             item.fileName.endsWith('.pptx') ? 'PPT' :
                             item.fileName.endsWith('.mp4') ? 'VID' : 'DOC'}
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate max-w-xs md:max-w-sm font-bold text-slate-800" title={item.fileName}>
                              {item.fileName}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {item.isNewVersion && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                                  เวอร์ชันใหม่
                                </span>
                              )}
                              {item.isExpired && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-700">
                                  หมดอายุ — ห้ามใช้
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                {formatDate(item.uploadedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Product Group */}
                      <td className="p-3.5 text-slate-700 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {getProductGroupLabel(item.productGroup)}
                        </span>
                      </td>

                      {/* Document Type */}
                      <td className="p-3.5 text-slate-600">
                        {getDocumentTypeLabel(item.documentType)}
                      </td>

                      {/* Campaign */}
                      <td className="p-3.5 text-slate-700 font-medium truncate max-w-[180px]">
                        {item.relatedCampaign}
                      </td>

                      {/* Version */}
                      <td className="p-3.5 text-center font-mono font-bold text-slate-700">
                        {item.version}
                      </td>

                      {/* Size */}
                      <td className="p-3.5 text-slate-500 font-mono">
                        {formatBytes(item.fileSize)}
                      </td>

                      {/* Download Count */}
                      <td className="p-3.5 text-center text-slate-600 font-mono font-semibold">
                        {item.downloadCount}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => window.open(item.fileUrl, '_blank')}
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-slate-200/80 shadow-2xs"
                            title="ดูตัวอย่าง (Preview)"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDownload(item)}
                            className="py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                          >
                            <Download size={13} />
                            <span>ดาวน์โหลด</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    ไม่พบเอกสารที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HTML Popup Modal */}
      <MarketingConfirmModal
        isOpen={alertConfig.isOpen}
        type="alert"
        variant="warning"
        title={alertConfig.title}
        message={alertConfig.message}
        subMessage={alertConfig.subMessage}
        confirmText="เข้าใจแล้ว"
        onConfirm={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        onCancel={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
