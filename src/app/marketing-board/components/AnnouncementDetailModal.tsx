'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Users, Paperclip, Download, CheckCircle2, Clock, 
  AlertTriangle, Phone, Mail, User, ShieldCheck, History, FileText, 
  Eye, Layers, Sparkles, Check, ChevronRight, Archive, Edit3, XCircle,
  Building2, ArrowDownToLine, CheckCheck, Megaphone, FileSpreadsheet,
  FileBarChart, Video, Info, Tag, Trash2
} from 'lucide-react';
import { 
  getAnnouncementDetail, 
  acknowledgeAnnouncement, 
  getAcknowledgmentReport, 
  approveAnnouncement, 
  cancelAnnouncement,
  deleteAnnouncement,
  incrementDownloadCount 
} from '@/app/actions/marketingBoard';
import JSZip from 'jszip';
import MarketingConfirmModal from './MarketingConfirmModal';

interface AnnouncementDetailModalProps {
  announcementId: string | null;
  onClose: () => void;
  onEdit?: (item: any) => void;
  onRefresh?: () => void;
  userPermissions?: any;
}

export default function AnnouncementDetailModal({
  announcementId,
  onClose,
  onEdit,
  onRefresh,
  userPermissions
}: AnnouncementDetailModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'tracking' | 'history'>('overview');
  const [isAckLoading, setIsAckLoading] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // HTML Popup Modal Config
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    type?: 'confirm' | 'prompt' | 'alert';
    variant?: 'danger' | 'primary' | 'warning' | 'success';
    title: string;
    message: string;
    subMessage?: string;
    inputLabel?: string;
    inputPlaceholder?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (val?: string) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (!announcementId) return;

    setLoading(true);
    getAnnouncementDetail(announcementId)
      .then(res => {
        setData(res);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [announcementId]);

  // Load tracking report if manager/marketing
  useEffect(() => {
    if (activeTab === 'tracking' && announcementId && !report) {
      setReportLoading(true);
      getAcknowledgmentReport(announcementId)
        .then(setReport)
        .catch(console.error)
        .finally(() => setReportLoading(false));
    }
  }, [activeTab, announcementId, report]);

  if (!announcementId) return null;

  const handleAcknowledge = async () => {
    if (!data || data.isAcknowledged || isAckLoading) return;
    try {
      setIsAckLoading(true);
      const res = await acknowledgeAnnouncement(data.id);
      setData((prev: any) => ({
        ...prev,
        isAcknowledged: true,
        acknowledgedAt: res.acknowledgedAt
      }));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    } finally {
      setIsAckLoading(false);
    }
  };

  const handleDownloadFile = async (asset: any) => {
    incrementDownloadCount(asset.id).catch(() => {});
    window.open(asset.fileUrl, '_blank');
  };

  const handleDownloadAllZip = async () => {
    if (!data?.assets || data.assets.length === 0 || isZipping) return;

    try {
      setIsZipping(true);
      const zip = new JSZip();
      const folderName = `${data.campaignName.replace(/[^a-zA-Z0-9_\u0E00-\u0E7F]/g, '_')}_Files`;
      const folder = zip.folder(folderName) || zip;

      // Fetch each file as blob and add to zip
      const promises = data.assets.map(async (asset: any) => {
        try {
          incrementDownloadCount(asset.id).catch(() => {});
          const response = await fetch(asset.fileUrl);
          const blob = await response.blob();
          folder.file(asset.fileName, blob);
        } catch (e) {
          console.warn(`Could not fetch ${asset.fileName} for zip, skipping`, e);
        }
      });

      await Promise.all(promises);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to create ZIP:', err);
      setConfirmConfig({
        isOpen: true,
        type: 'alert',
        variant: 'warning',
        title: 'ไม่สามารถสร้างไฟล์ ZIP ได้',
        message: 'ระบบไม่สามารถรวมไฟล์ทั้งหมดเป็น ZIP ได้ในขณะนี้',
        subMessage: 'กรุณาดาวน์โหลดไฟล์แยกเป็นรายไฟล์แทน',
        confirmText: 'เข้าใจแล้ว',
        onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setIsZipping(false);
    }
  };

  const handleApprove = () => {
    if (!data) return;
    setConfirmConfig({
      isOpen: true,
      type: 'confirm',
      variant: 'success',
      title: 'อนุมัติและเผยแพร่ประกาศ',
      message: 'คุณต้องการอนุมัติและเผยแพร่ประกาศนี้ใช่หรือไม่?',
      subMessage: `แคมเปญ: "${data.campaignName}" จะเปิดให้ทุกสาขาและทีมขายสามารถเข้าถึงได้ทันที`,
      confirmText: 'ยืนยันอนุมัติ',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await approveAnnouncement(data.id);
          if (onRefresh) onRefresh();
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          onClose();
        } catch (e: any) {
          setConfirmConfig({
            isOpen: true,
            type: 'alert',
            variant: 'danger',
            title: 'ไม่สามารถอนุมัติได้',
            message: e.message || 'เกิดข้อผิดพลาดในการอนุมัติประกาศ',
            confirmText: 'ปิด',
            onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false }))
          });
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleCancelAnnouncement = () => {
    if (!data) return;
    setConfirmConfig({
      isOpen: true,
      type: 'prompt',
      variant: 'danger',
      title: 'ยกเลิกประกาศแคมเปญ',
      message: 'คุณต้องการยกเลิกประกาศแคมเปญนี้ใช่หรือไม่?',
      subMessage: 'การยกเลิกจะมีผลให้ประกาศถูกย้ายไปเก็บที่คลังเอกสารประวัติทันที และไม่แสดงบนหน้ากระดานหลัก',
      inputLabel: 'ระบุเหตุผลในการยกเลิกประกาศ',
      inputPlaceholder: 'เช่น ปรับกลยุทธ์การตลาด, สินค้าหมดสต็อก, เลื่อนกำหนดการ...',
      confirmText: 'ยืนยันการยกเลิก',
      cancelText: 'ย้อนกลับ',
      onConfirm: async (reason?: string) => {
        if (!reason) return;
        try {
          setActionLoading(true);
          await cancelAnnouncement(data.id, reason);
          if (onRefresh) onRefresh();
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          onClose();
        } catch (e: any) {
          setConfirmConfig({
            isOpen: true,
            type: 'alert',
            variant: 'danger',
            title: 'ไม่สามารถยกเลิกได้',
            message: e.message || 'เกิดข้อผิดพลาดในการยกเลิกประกาศ',
            confirmText: 'ปิด',
            onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false }))
          });
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleDeleteAnnouncement = () => {
    if (!data) return;
    setConfirmConfig({
      isOpen: true,
      type: 'confirm',
      variant: 'danger',
      title: 'ลบประกาศนี้ถาวร',
      message: 'คุณต้องการลบประกาศนี้ออกจากระบบอย่างถาวรใช่หรือไม่?',
      subMessage: `แคมเปญ "${data.campaignName}" และไฟล์เอกสารแนบทั้งหมดจะถูกลบออกจากฐานข้อมูลอย่างถาวรและไม่สามารถกู้คืนได้`,
      confirmText: 'ยืนยันลบถาวร',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await deleteAnnouncement(data.id);
          if (onRefresh) onRefresh();
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          onClose();
        } catch (e: any) {
          setConfirmConfig({
            isOpen: true,
            type: 'alert',
            variant: 'danger',
            title: 'ไม่สามารถลบได้',
            message: e.message || 'เกิดข้อผิดพลาดในการลบประกาศ',
            confirmText: 'ปิด',
            onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false }))
          });
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const formatAnnouncementType = (type?: string) => {
    switch (type) {
      case 'Promotion': return 'โปรโมชั่น (Promotion)';
      case 'Marketing Update': return 'ข่าวการตลาด (Update)';
      case 'Product Update': return 'อัปเดตสินค้า/ราคา (Product)';
      case 'Event': return 'กิจกรรม (Event)';
      case 'Urgent Notice': return 'ประกาศด่วน (Urgent)';
      default: return type || '';
    }
  };

  const getProductGroupLabel = (pg?: string) => {
    switch (pg) {
      case 'Marketing Headquarters': return 'การตลาดส่วนกลาง (HQ)';
      case 'Inverter': return 'อินเวอร์เตอร์ (Inverter)';
      case 'BLDC / Solar Pump': return 'ปั๊มน้ำโซล่าเซลล์ (BLDC)';
      case 'Solar Roof': return 'โซลาร์รูฟ (Solar Roof)';
      default: return pg || 'การตลาด';
    }
  };

  const formatAuditAction = (action: string) => {
    switch (action) {
      case 'CREATED': return 'สร้างประกาศ';
      case 'UPDATED': return 'แก้ไขข้อมูล';
      case 'STATUS_CHANGED': return 'เปลี่ยนสถานะ';
      case 'APPROVED': return 'อนุมัติประกาศ';
      case 'CANCELLED': return 'ยกเลิกประกาศ';
      case 'PUBLISHED': return 'เผยแพร่';
      default: return action;
    }
  };

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const canManage = userPermissions?.canManage;
  const canApprove = userPermissions?.canApprove;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Accent Gradient Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600 shrink-0" />

        {/* Modal Symmetrical Hero Header */}
        <div className="relative shrink-0 bg-slate-950 text-white overflow-hidden">
          {data?.coverImageUrl && (
            <div className="absolute inset-0 opacity-20">
              <img 
                src={data.coverImageUrl} 
                alt={data.campaignName} 
                className="w-full h-full object-cover blur-sm scale-105"
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-900/80" />

          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-xl border border-white/20 hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>

          {/* Symmetrical Hero Content */}
          <div className="relative z-10 p-6 md:p-8">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2 mb-3.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white shadow-2xs">
                {getProductGroupLabel(data?.productGroup)}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-white border border-white/15">
                {formatAnnouncementType(data?.announcementType)}
              </span>
              {data?.dynamicStatus && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  data.dynamicStatus === 'Active' ? 'bg-red-600/90 text-white border border-red-500/50' :
                  data.dynamicStatus === 'Ending Soon' ? 'bg-amber-500 text-white' :
                  data.dynamicStatus === 'Scheduled' ? 'bg-slate-700 text-slate-200 border border-slate-600' :
                  data.dynamicStatus === 'Pending Approval' ? 'bg-amber-600 text-white' :
                  data.dynamicStatus === 'Cancelled' ? 'bg-rose-700 text-white' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  {data.dynamicStatus === 'Active' ? 'กำลังใช้งาน' :
                   data.dynamicStatus === 'Ending Soon' ? 'ใกล้หมดอายุ' :
                   data.dynamicStatus === 'Scheduled' ? 'ตั้งเวลาล่วงหน้า' :
                   data.dynamicStatus === 'Pending Approval' ? 'รออนุมัติ' :
                   data.dynamicStatus === 'Draft' ? 'แบบร่าง' :
                   data.dynamicStatus === 'Expired' ? 'หมดอายุ' :
                   data.dynamicStatus === 'Cancelled' ? 'ยกเลิกแล้ว' : data.dynamicStatus}
                </span>
              )}
              {data?.priority === 'Urgent' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white animate-pulse shadow-2xs">
                  ด่วนมาก
                </span>
              )}
              {data?.version > 1 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  เวอร์ชัน {data.version}
                </span>
              )}
            </div>

            {/* Campaign Title */}
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight max-w-4xl">
              {loading ? 'กำลังโหลดรายละเอียด...' : data?.campaignName}
            </h1>

            {/* Symmetrical Meta Bar */}
            <div className="mt-3.5 flex flex-wrap items-center gap-4 text-xs md:text-sm text-slate-300">
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-xs border border-white/10">
                <Calendar size={14} className="text-red-400 shrink-0" />
                <span>
                  {data ? `${formatDate(data.startAt)} — ${data.endAt ? formatDate(data.endAt) : 'ไม่มีกำหนดสิ้นสุด'}` : ''}
                </span>
              </div>

              {data?.daysRemaining !== null && data?.daysRemaining !== undefined && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-950/70 text-red-300 border border-red-800/60 text-xs font-bold">
                  <Clock size={13} className="text-red-400" />
                  <span>เหลือเวลาอีก {data.daysRemaining} วัน</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Building2 size={14} className="text-slate-400 shrink-0" />
                <span>
                  {data?.branchScope === 'ALL' 
                    ? 'ทุกสาขาทั่วประเทศ' 
                    : `เฉพาะสาขาที่กำหนด (${data?.branches?.length || 0} สาขา)`}
                </span>
              </div>
            </div>
          </div>

          {/* Symmetrical Navigation Tabs */}
          <div className="relative z-10 flex border-t border-white/10 px-6 md:px-8 bg-slate-950/60 backdrop-blur-md overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3.5 px-5 text-xs md:text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText size={15} className={activeTab === 'overview' ? 'text-red-500' : 'text-slate-400'} />
              <span>รายละเอียดและเงื่อนไข</span>
            </button>

            <button
              onClick={() => setActiveTab('assets')}
              className={`py-3.5 px-5 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'assets'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Paperclip size={15} className={activeTab === 'assets' ? 'text-red-500' : 'text-slate-400'} />
              <span>เอกสาร & สื่อช่วยขาย</span>
              {data?.assets?.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-600/80 text-white font-mono font-bold">
                  {data.assets.length}
                </span>
              )}
            </button>

            {(canManage || userPermissions?.isBranchManager) && (
              <button
                onClick={() => setActiveTab('tracking')}
                className={`py-3.5 px-5 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'tracking'
                    ? 'border-red-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCheck size={15} className={activeTab === 'tracking' ? 'text-red-500' : 'text-slate-400'} />
                <span>สถิติการรับทราบ</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('history')}
              className={`py-3.5 px-5 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'history'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History size={15} className={activeTab === 'history' ? 'text-red-500' : 'text-slate-400'} />
              <span>ประวัติการแก้ไข</span>
            </button>
          </div>
        </div>

        {/* Branch Eligibility Warning Banner */}
        {data && !data.isBranchApplicable && (
          <div className="bg-red-50/80 border-b border-red-200 px-6 py-3 flex items-center gap-3 text-red-800 text-xs md:text-sm">
            <AlertTriangle size={18} className="text-red-600 shrink-0" />
            <div>
              <span className="font-bold">หมายเหตุสำหรับสาขาของคุณ:</span> แคมเปญนี้ไม่ได้เปิดใช้งานสำหรับสาขาที่ท่านสังกัด
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6 bg-slate-50/60 text-xs md:text-sm">
          {loading ? (
            <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Clock size={24} className="animate-spin text-red-600" />
              <span className="font-medium">กำลังโหลดรายละเอียดประกาศ...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Short description card */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/90 text-slate-800 text-sm md:text-base font-semibold leading-relaxed shadow-2xs flex items-start gap-3">
                    <Megaphone size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <span>{data.shortDescription}</span>
                  </div>

                  {/* Symmetrical 2-Column Split: Campaign Details vs Terms & Conditions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left: Campaign Details */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-2xs flex flex-col">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 pb-3 mb-3 border-b border-slate-100">
                        <Sparkles size={16} className="text-red-600" />
                        <span>รายละเอียดแคมเปญและสิทธิประโยชน์</span>
                      </div>
                      <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line leading-relaxed font-sans flex-1">
                        {data.campaignDetails}
                      </div>
                    </div>

                    {/* Right: Terms & Conditions */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-2xs flex flex-col">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 pb-3 mb-3 border-b border-slate-100">
                        <FileText size={16} className="text-slate-600" />
                        <span>เงื่อนไขและข้อกำหนด (Terms & Conditions)</span>
                      </div>
                      <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line leading-relaxed font-sans flex-1">
                        {data.termsConditions || 'ไม่มีเงื่อนไขเพิ่มเติม'}
                      </div>
                    </div>
                  </div>

                  {/* Symmetrical 2-Column Split: Branch Scope vs Contact Person */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Branch Scope */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Users size={14} className="text-red-600" />
                        <span>ขอบเขตสาขาที่ร่วมรายการ</span>
                      </div>
                      {data.branchScope === 'ALL' ? (
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <CheckCircle2 size={18} className="text-red-600" />
                          <span>เปิดให้ใช้งานทุกสาขาทั่วประเทศ</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span className="text-xs text-slate-500 font-medium">เฉพาะสาขาที่กำหนด:</span>
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                            {data.branches?.map((b: any) => (
                              <span key={b.branchId} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                {b.branchId}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contact Person */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Phone size={14} className="text-red-600" />
                        <span>ผู้ประสานงานแคมเปญ / ข้อมูลติดต่อ</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5">
                        <User size={16} className="text-slate-500" />
                        <span>{data.contactPerson || 'ฝ่ายการตลาดส่วนกลาง (TERA Marketing HQ)'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ASSETS & DOCUMENTS */}
              {activeTab === 'assets' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/90">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">เอกสารและสื่อช่วยขายทั้งหมด</h3>
                      <p className="text-xs text-slate-500 mt-0.5">สามารถดาวน์โหลดเพื่อนำไปใช้ในการขาย ติดตามลูกค้า และประชาสัมพันธ์</p>
                    </div>

                    {data?.assets?.length > 0 && (
                      <button
                        onClick={handleDownloadAllZip}
                        disabled={isZipping}
                        className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-2xs hover:shadow-md transition-all"
                      >
                        <Download size={15} />
                        <span>{isZipping ? 'กำลังสร้างไฟล์ ZIP...' : 'ดาวน์โหลดทั้งหมด (ZIP)'}</span>
                      </button>
                    )}
                  </div>

                  {data?.assets && data.assets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.assets.map((asset: any) => (
                        <div 
                          key={asset.id}
                          className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0 font-black text-xs shadow-2xs">
                              {asset.fileName.endsWith('.pdf') ? 'PDF' :
                               asset.fileName.endsWith('.xlsx') || asset.fileName.endsWith('.xls') ? 'XLS' :
                               asset.fileName.endsWith('.pptx') ? 'PPT' :
                               asset.fileName.endsWith('.mp4') ? 'VID' : 'FILE'}
                            </div>

                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {asset.documentType}
                              </span>
                              <h4 className="font-bold text-slate-800 text-sm truncate mt-0.5" title={asset.fileName}>
                                {asset.fileName}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                <span>{formatBytes(asset.fileSize)}</span>
                                <span>•</span>
                                <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded text-[10px] border border-slate-200">
                                  {asset.version || 'V1'}
                                </span>
                                <span>•</span>
                                <span>ดาวน์โหลด {asset.downloadCount || 0} ครั้ง</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                              onClick={() => window.open(asset.fileUrl, '_blank')}
                              className="py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 transition-colors"
                            >
                              <Eye size={13} />
                              <span>ดูตัวอย่าง</span>
                            </button>
                            <button
                              onClick={() => handleDownloadFile(asset)}
                              className="py-1.5 px-3.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-black flex items-center gap-1.5 transition-colors shadow-2xs"
                            >
                              <Download size={13} />
                              <span>ดาวน์โหลด</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/90">
                      ไม่มีไฟล์เอกสารแนบในประกาศนี้
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TRACKING & ACKNOWLEDGMENT */}
              {activeTab === 'tracking' && (
                <div className="space-y-6">
                  {reportLoading ? (
                    <div className="py-16 text-center text-slate-400">กำลังโหลดข้อมูลการรับทราบ...</div>
                  ) : report ? (
                    <div className="space-y-6">
                      {/* Symmetrical 4-Card Overview */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                          <span className="text-xs font-semibold text-slate-500">พนักงานที่เกี่ยวข้อง</span>
                          <div className="text-2xl font-black text-slate-900 mt-1">{report.total} คน</div>
                        </div>
                        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                          <span className="text-xs font-semibold text-slate-700">รับทราบแล้ว</span>
                          <div className="text-2xl font-black text-slate-900 mt-1">{report.acknowledgedCount} คน</div>
                        </div>
                        <div className="p-4 rounded-2xl border border-red-200 bg-red-50/50 shadow-2xs ring-1 ring-red-500/20">
                          <span className="text-xs font-semibold text-red-700">ยังไม่รับทราบ</span>
                          <div className="text-2xl font-black text-red-700 mt-1">{report.pendingCount} คน</div>
                        </div>
                        <div className="p-4 rounded-2xl border border-slate-900 bg-slate-900 text-white shadow-2xs">
                          <span className="text-xs font-semibold text-slate-300">อัตราการรับทราบ (Rate)</span>
                          <div className="text-2xl font-black text-white mt-1">{report.rate}%</div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-red-600 h-2.5 rounded-full transition-all duration-500" 
                          style={{ width: `${report.rate}%` }}
                        />
                      </div>

                      {/* Staff Breakdown Table */}
                      <div className="rounded-2xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="p-3.5">ชื่อ-นามสกุล</th>
                                <th className="p-3.5">สาขา</th>
                                <th className="p-3.5">ตำแหน่ง / แผนก</th>
                                <th className="p-3.5 text-center">สถานะ</th>
                                <th className="p-3.5 text-right">เวลาที่รับทราบ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {report.rows.map((r: any) => (
                                <tr key={r.userId} className="hover:bg-slate-50/50">
                                  <td className="p-3.5 font-semibold text-slate-800">{r.fullName}</td>
                                  <td className="p-3.5 text-slate-600">{r.branch}</td>
                                  <td className="p-3.5 text-slate-500">{r.role}</td>
                                  <td className="p-3.5 text-center">
                                    {r.isAcknowledged ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                        รับทราบแล้ว
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                        รอดำเนินการ
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3.5 text-right text-slate-500 font-mono">
                                    {r.acknowledgedAt ? formatDate(r.acknowledgedAt) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/90">
                      ไม่มีข้อมูลการรับทราบ
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: AUDIT TRAIL */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div className="pb-3 border-b border-slate-200/90">
                    <h3 className="font-bold text-slate-900 text-base">ประวัติการปรับปรุงและการเปลี่ยนแปลง</h3>
                    <p className="text-xs text-slate-500 mt-0.5">บันทึกประวัติการแก้ไขและเวอร์ชันทั้งหมดของแคมเปญนี้</p>
                  </div>

                  {data.auditLogs && data.auditLogs.length > 0 ? (
                    <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6 py-2">
                      {data.auditLogs.map((log: any) => (
                        <div key={log.id} className="relative">
                          <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-2xs" />
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-bold text-slate-800">{log.performedByName || 'Staff'}</span>
                            <span>•</span>
                            <span className="font-mono">{formatDate(log.performedAt)}</span>
                            <span>•</span>
                            <span className="px-2 py-0.2 rounded bg-slate-100 font-bold uppercase text-[10px] text-slate-700 border border-slate-200">
                              {formatAuditAction(log.action)}
                            </span>
                            <span className="font-semibold text-slate-900">v{log.version}</span>
                          </div>
                          {log.notes && (
                            <p className="text-xs text-slate-700 mt-1.5 font-medium bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                              {log.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/90">
                      ไม่มีบันทึกประวัติการแก้ไข
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Symmetrical Footer */}
        <div className="px-6 py-4 md:px-8 md:py-4.5 border-t border-slate-200/90 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left: Admin Management Tools */}
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => {
                  if (onEdit) onEdit(data);
                  onClose();
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Edit3 size={14} />
                <span>แก้ไขประกาศ</span>
              </button>
            )}

            {canApprove && data?.dynamicStatus === 'Pending Approval' && (
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Check size={14} />
                <span>อนุมัติประกาศ</span>
              </button>
            )}

            {canManage && !['Cancelled', 'Expired'].includes(data?.dynamicStatus) && (
              <button
                onClick={handleCancelAnnouncement}
                disabled={actionLoading}
                className="py-2.5 px-4 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <XCircle size={14} />
                <span>ยกเลิกประกาศ</span>
              </button>
            )}

            {canManage && (
              <button
                onClick={handleDeleteAnnouncement}
                disabled={actionLoading}
                className="py-2.5 px-4 rounded-xl text-red-600 hover:bg-red-50 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="ลบประกาศนี้ออกจากระบบถาวร"
              >
                <Trash2 size={14} />
                <span>ลบประกาศ</span>
              </button>
            )}
          </div>

          {/* Right: Primary user actions */}
          <div className="flex items-center gap-3 ml-auto">
            {data?.assets?.length > 0 && (
              <button
                onClick={handleDownloadAllZip}
                disabled={isZipping}
                className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Download size={15} />
                <span>{isZipping ? 'กำลังบีบอัด...' : 'ดาวน์โหลดทั้งหมด (ZIP)'}</span>
              </button>
            )}

            {/* Acknowledge Button */}
            {data?.isAcknowledged ? (
              <div className="py-2.5 px-5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-red-600" />
                <span>รับทราบแล้ว ({formatDate(data.acknowledgedAt)})</span>
              </div>
            ) : (
              <button
                onClick={handleAcknowledge}
                disabled={isAckLoading}
                className="py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg shadow-red-500/20 transition-all"
              >
                <CheckCircle2 size={16} />
                <span>{isAckLoading ? 'กำลังบันทึก...' : 'กดรับทราบประกาศนี้'}</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Modern HTML Popup Dialog */}
      <MarketingConfirmModal
        isOpen={confirmConfig.isOpen}
        type={confirmConfig.type}
        variant={confirmConfig.variant}
        title={confirmConfig.title}
        message={confirmConfig.message}
        subMessage={confirmConfig.subMessage}
        inputLabel={confirmConfig.inputLabel}
        inputPlaceholder={confirmConfig.inputPlaceholder}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        isLoading={actionLoading}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
