'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building2,
  MapPin,
  Phone,
  FileText,
  Truck,
  Download,
  Send,
  Lock,
  MessageSquare,
  History,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ShieldCheck,
  Tag,
  Loader2,
  ExternalLink,
  Store,
  Megaphone,
  Coins,
  Package,
  Headphones,
  MoreHorizontal,
  Lightbulb,
  AlertTriangle,
  Flame,
  XCircle,
  UserCheck
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  REQUEST_TYPES,
  REQUEST_STATUSES,
  REQUEST_PRIORITIES,
  RequestTypeCode,
  RequestStatusCode,
  PriorityCode
} from '@/constants/marketingRequests';

const TYPE_ICONS: Record<RequestTypeCode, React.ElementType> = {
  FILES_MEDIA: FileText,
  IN_STORE_MEDIA: Store,
  PR_MEDIA: Megaphone,
  BUDGET: Coins,
  EQUIPMENT: Package,
  ASSISTANCE: Headphones,
  OTHER: MoreHorizontal,
};

const STATUS_ICONS: Record<RequestStatusCode, React.ElementType> = {
  BACKLOG: Clock,
  TO_DO: Clock,
  IN_PROGRESS: Loader2,
  WAITING: AlertCircle,
  REVIEW: ShieldCheck,
  DONE: CheckCircle2,
  CANCELLED: XCircle,
};

const PRIORITY_ICONS: Record<PriorityCode, React.ElementType> = {
  LOW: Tag,
  NORMAL: Clock,
  HIGH: AlertTriangle,
  URGENT: Flame,
};
import {
  updateMarketingRequestStatus,
  assignMarketingRequest,
  updateMarketingInternalFields,
  addMarketingRequestComment
} from '@/app/actions/marketingRequests';

interface Props {
  request: any;
  isMarketingOrAdmin: boolean;
  isRequester: boolean;
  currentUserId: string;
  marketingUsers: { id: string; fullName: string; role: string; employeeId?: string; employeeSale?: { nickname?: string } }[];
}

export default function MarketingRequestDetailClient({
  request,
  isMarketingOrAdmin,
  isRequester,
  currentUserId,
  marketingUsers
}: Props) {
  const router = useRouter();

  const [status, setStatus] = useState<RequestStatusCode>(request.status as RequestStatusCode);
  const [assigneeId, setAssigneeId] = useState<string>(request.assignedToId || '');
  const [priority, setPriority] = useState<PriorityCode>(request.priority as PriorityCode || 'NORMAL');
  const [internalDueDate, setInternalDueDate] = useState<string>(
    request.internalDueDate ? new Date(request.internalDueDate).toISOString().split('T')[0] : ''
  );
  const [internalNote, setInternalNote] = useState<string>(request.internalNote || '');

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
  const [isUpdatingInternal, setIsUpdatingInternal] = useState(false);

  // Comments
  const [comments, setComments] = useState<any[]>(request.comments || []);
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Type & Status configs
  const typeConfig = REQUEST_TYPES[request.requestType as RequestTypeCode];
  const statusConfig = REQUEST_STATUSES[status];
  const priorityConfig = REQUEST_PRIORITIES[priority];

  const TypeIcon = TYPE_ICONS[request.requestType as RequestTypeCode] || FileText;
  const StatusIcon = STATUS_ICONS[status] || Clock;
  const PriorityIcon = PRIORITY_ICONS[priority] || Tag;

  const formattedCreatedDate = new Date(request.createdAt).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const formattedRequiredDate = new Date(request.requiredDate).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Handle Status Update
  const handleStatusChange = async (newStatus: RequestStatusCode) => {
    if (newStatus === status) return;

    setIsUpdatingStatus(true);
    try {
      const res = await updateMarketingRequestStatus(request.id, newStatus);
      if (!res.success) throw new Error(res.error || 'Failed to update status');

      setStatus(newStatus);
      Swal.fire({
        icon: 'success',
        title: 'อัปเดตสถานะสำเร็จ',
        text: `เปลี่ยนสถานะเป็น ${REQUEST_STATUSES[newStatus]?.label || newStatus}`,
        timer: 1500,
        showConfirmButton: false
      });
      router.refresh();
    } catch (err: any) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Assignee Update (Requirement 22)
  const handleAssigneeChange = async (newAssigneeId: string) => {
    setIsUpdatingAssignee(true);
    try {
      const res = await assignMarketingRequest(request.id, newAssigneeId || null);
      if (!res.success) throw new Error(res.error || 'Failed to assign');

      setAssigneeId(newAssigneeId);

      // Requirement 22: If status was BACKLOG and now assigned, status became TO_DO
      if (status === 'BACKLOG' && newAssigneeId) {
        setStatus('TO_DO');
      }

      Swal.fire({
        icon: 'success',
        title: 'มอบหมายงานสำเร็จ',
        timer: 1500,
        showConfirmButton: false
      });
      router.refresh();
    } catch (err: any) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    } finally {
      setIsUpdatingAssignee(false);
    }
  };

  // Handle Internal Fields Update
  const handleSaveInternalFields = async () => {
    setIsUpdatingInternal(true);
    try {
      const res = await updateMarketingInternalFields(request.id, {
        priority,
        internalDueDate: internalDueDate || null,
        internalNote: internalNote || null
      });
      if (!res.success) throw new Error(res.error || 'Failed to save');

      Swal.fire({
        icon: 'success',
        title: 'บันทึกข้อมูลสำเร็จ',
        timer: 1500,
        showConfirmButton: false
      });
      router.refresh();
    } catch (err: any) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    } finally {
      setIsUpdatingInternal(false);
    }
  };

  // Handle Comment Submission
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await addMarketingRequestComment(request.id, commentText, isInternalComment);
      if (!res.success) throw new Error(res.error || 'Failed to add comment');

      setComments(prev => [...prev, res.data]);
      setCommentText('');
      setIsInternalComment(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'ส่งข้อความไม่สำเร็จ', text: err.message });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={isMarketingOrAdmin ? '/marketing/requests' : '/marketing/requests/new?tab=status'}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-sm"
        >
          <ArrowLeft size={16} />
          <span>{isMarketingOrAdmin ? 'กลับไปยังกระดานงานการตลาด' : 'กลับไปยังรายการคำขอของฉัน'}</span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock size={13} className="text-gray-400 shrink-0" />
          <span>สร้างเมื่อ: {formattedCreatedDate}</span>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-lg font-black text-sm bg-red-50 text-red-700 border border-red-200">
              {request.requestNo}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold text-xs bg-gray-100 text-gray-700 border border-gray-200">
              <TypeIcon size={13} className="text-red-600 shrink-0" />
              <span>{typeConfig?.title || request.requestType}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs border ${statusConfig?.badgeBg} ${statusConfig?.badgeText} ${statusConfig?.borderColor}`}
            >
              <StatusIcon
                size={12}
                className={status === 'IN_PROGRESS' ? 'animate-spin shrink-0' : 'shrink-0'}
              />
              <span>{statusConfig?.label || status}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-xs ${priorityConfig?.badgeBg} ${priorityConfig?.badgeText}`}
            >
              <PriorityIcon size={12} className="shrink-0" />
              <span>ความสำคัญ: {priorityConfig?.label || priority}</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            {request.title}
          </h1>

          <p className="text-xs sm:text-sm text-gray-500 flex flex-wrap items-center gap-3 pt-1">
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <User size={14} className="text-gray-400 shrink-0" />
              {request.requesterName} ({request.requesterDepartment})
            </span>
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <MapPin size={14} className="text-gray-400 shrink-0" />
              {request.requesterBranch}
            </span>
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1.5 font-semibold text-red-600">
              <Calendar size={14} className="shrink-0" />
              ใช้งาน: {formattedRequiredDate}
            </span>
          </p>
        </div>
      </div>

      {/* Grid: 8 Cols Details, 4 Cols Management */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols): Content Details */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section: ข้อมูลคำขอทั่วไป */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <FileText size={18} className="text-red-600" />
              <span>รายละเอียดคำขอ</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 block mb-1">วันที่ต้องการนำไปใช้งานจริง</span>
                <span className="font-bold text-gray-800 text-sm">{formattedRequiredDate}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 block mb-1">สถานที่นำไปใช้งาน</span>
                <span className="font-bold text-gray-800 text-sm">
                  {request.usageLocationType === 'REQUESTER_BRANCH' && `สาขาของผู้ขอ (${request.requesterBranch})`}
                  {request.usageLocationType === 'HEAD_OFFICE' && 'สำนักงานใหญ่'}
                  {request.usageLocationType === 'OTHER_BRANCH' && `สาขาอื่น (${request.usageBranch || '-'})`}
                  {request.usageLocationType === 'EXTERNAL' && `Event ภายนอก (${request.usageProvince || '-'})`}
                </span>
                {request.usageLocationName && (
                  <span className="text-gray-500 block text-xs mt-0.5">
                    สถานที่: {request.usageLocationName} {request.usageLocationDetails ? `(${request.usageLocationDetails})` : ''}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-500 block mb-2">รายละเอียดที่ต้องการ:</span>
              <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-100 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {request.description}
              </div>
            </div>
          </div>

          {/* Section: ข้อมูลเฉพาะประเภทคำขอ (Tailored Views) */}
          {request.typeDetails && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <TypeIcon size={18} className="text-red-600 shrink-0" />
                <span>ข้อมูลเฉพาะประเภท: {typeConfig?.title}</span>
              </h2>

              {/* Type 1: Files */}
              {request.requestType === 'FILES_MEDIA' && (
                <div className="space-y-4 text-xs">
                  {request.typeDetails.fileTypes && (
                    <div>
                      <span className="font-semibold text-gray-500 block mb-1.5">ประเภทไฟล์ที่ขอ:</span>
                      <div className="flex flex-wrap gap-2">
                        {request.typeDetails.fileTypes.map((ft: string, i: number) => (
                          <span key={i} className="px-3 py-1 rounded-lg bg-red-50 text-red-700 font-semibold border border-red-100">
                            {ft}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {request.typeDetails.productModel && (
                    <div>
                      <span className="font-semibold text-gray-500 block mb-1">สินค้า / รุ่น:</span>
                      <p className="text-sm font-medium text-gray-800">{request.typeDetails.productModel}</p>
                    </div>
                  )}

                  {request.typeDetails.additionalDetails && (
                    <div>
                      <span className="font-semibold text-gray-500 block mb-1">รายละเอียดเพิ่มเติม:</span>
                      <p className="text-sm text-gray-700">{request.typeDetails.additionalDetails}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Type 2: In-Store Media */}
              {request.requestType === 'IN_STORE_MEDIA' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-400 block mb-1">ประเภทสื่อ</span>
                    <span className="font-bold text-gray-800 text-sm">{request.typeDetails.materialType || '-'}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-400 block mb-1">ขนาด</span>
                    <span className="font-bold text-gray-800 text-sm">{request.typeDetails.size || 'ไม่ระบุ'}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-400 block mb-1">จำนวน</span>
                    <span className="font-bold text-red-600 text-sm">{request.typeDetails.quantity || 1} ชิ้น</span>
                  </div>
                  {request.typeDetails.details && (
                    <div className="col-span-full p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block mb-1">ข้อความที่ต้องการสื่อสาร</span>
                      <p className="text-gray-800 text-sm">{request.typeDetails.details}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Type 3: PR Media */}
              {request.requestType === 'PR_MEDIA' && (
                <div className="space-y-4 text-xs">
                  {request.typeDetails.channels && (
                    <div>
                      <span className="font-semibold text-gray-500 block mb-1.5">ช่องทางที่ต้องการเผยแพร่:</span>
                      <div className="flex flex-wrap gap-2">
                        {request.typeDetails.channels.map((ch: string, i: number) => (
                          <span key={i} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 font-semibold border border-gray-200">
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {request.typeDetails.subject && (
                    <div>
                      <span className="font-semibold text-gray-500 block mb-1">หัวข้อ / แคมเปญโปรโมชั่น:</span>
                      <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap">{request.typeDetails.subject}</p>
                    </div>
                  )}

                  {(request.typeDetails.startDate || request.typeDetails.endDate) && (
                    <div className="flex items-center gap-4 text-gray-600">
                      <span>ระยะเวลาโปรโมท: {request.typeDetails.startDate || '-'} ถึง {request.typeDetails.endDate || '-'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Type 4: Budget */}
              {request.requestType === 'BUDGET' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-red-50 rounded-xl col-span-2 border border-red-100">
                      <span className="text-red-600 block mb-1">งบประมาณที่ขอ</span>
                      <span className="font-black text-red-700 text-lg">
                        {Number(request.typeDetails.requestedBudget || 0).toLocaleString()} บาท
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block mb-1">ชื่องาน</span>
                      <span className="font-bold text-gray-800">{request.typeDetails.eventName || '-'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block mb-1">จังหวัด / สถานที่</span>
                      <span className="font-bold text-gray-800">{request.typeDetails.province || '-'} ({request.typeDetails.venue || '-'})</span>
                    </div>
                  </div>

                  {request.typeDetails.expenseCategories && request.typeDetails.expenseCategories.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-500 block mb-1.5">หมวดหมู่ค่าใช้จ่าย:</span>
                      <div className="flex flex-wrap gap-2">
                        {request.typeDetails.expenseCategories.map((cat: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-medium">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {request.typeDetails.budgetDetails && (
                    <div>
                      <span className="font-semibold text-gray-500 block mb-1">รายละเอียดงบประมาณ:</span>
                      <p className="p-3 bg-gray-50 rounded-xl text-gray-800 whitespace-pre-wrap">{request.typeDetails.budgetDetails}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Type 5: Equipment */}
              {request.requestType === 'EQUIPMENT' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block mb-1">วันที่ต้องการอุปกรณ์</span>
                      <span className="font-bold text-gray-800">{request.typeDetails.dateRequired || '-'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block mb-1">วันที่นำไปใช้งาน</span>
                      <span className="font-bold text-gray-800">{request.typeDetails.dateOfUse || '-'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block mb-1">วันที่ส่งคืน</span>
                      <span className="font-bold text-gray-800">{request.typeDetails.expectedReturnDate || '-'}</span>
                    </div>
                  </div>

                  {request.typeDetails.items && (
                    <div>
                      <span className="font-semibold text-gray-500 block mb-2">รายการอุปกรณ์ที่ขอยืม:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {request.typeDetails.items.map((it: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="font-medium text-gray-800">{it.name}</span>
                            <span className="font-bold text-red-600 bg-white px-2 py-0.5 rounded shadow-xs">
                              {it.quantity} ชิ้น
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Type 6: Assistance */}
              {request.requestType === 'ASSISTANCE' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block mb-1">วันที่ต้องการความช่วยเหลือ</span>
                      <span className="font-bold text-gray-800">{request.typeDetails.dateNeeded || '-'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block mb-1">สถานที่นัดหมาย</span>
                      <span className="font-bold text-gray-800">{request.typeDetails.location || '-'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500 block mb-1">ความช่วยเหลือที่ต้องการ:</span>
                    <p className="p-3 bg-gray-50 rounded-xl text-gray-800 text-sm whitespace-pre-wrap">{request.typeDetails.assistanceNeeded}</p>
                  </div>
                </div>
              )}

              {/* Type 7: Other */}
              {request.requestType === 'OTHER' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-1">ประเภทที่ระบุ:</span>
                    <span className="font-bold text-gray-800 text-sm">{request.typeDetails.customType}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-1">รายละเอียด:</span>
                    <p className="p-3 bg-gray-50 rounded-xl text-gray-800 text-sm whitespace-pre-wrap">{request.typeDetails.details}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section: ข้อมูลการจัดส่ง (ถ้ามี) */}
          {request.shippingMethod === 'DELIVERY' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Truck size={18} className="text-red-600" />
                <span>ข้อมูลการจัดส่งพัสดุ</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block mb-1">ผู้รับสินค้า</span>
                  <p className="font-bold text-gray-800 text-sm">{request.recipientName}</p>
                  <p className="text-gray-500">{request.recipientPhone}</p>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">บริษัท / สาขาปลายทาง</span>
                  <p className="font-bold text-gray-800 text-sm">{request.recipientCompanyBranch || '-'}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-gray-400 block mb-1">ที่อยู่จัดส่ง</span>
                  <p className="text-gray-800 leading-relaxed font-medium">
                    {request.deliveryAddress} {request.deliveryProvince} {request.deliveryPostalCode}
                  </p>
                </div>
                {request.requestedDeliveryDate && (
                  <div>
                    <span className="text-gray-400 block mb-1">วันที่ต้องการให้ส่งถึง</span>
                    <p className="font-bold text-red-600">
                      {new Date(request.requestedDeliveryDate).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
                {request.shippingRemarks && (
                  <div>
                    <span className="text-gray-400 block mb-1">หมายเหตุการจัดส่ง</span>
                    <p className="text-gray-700">{request.shippingRemarks}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: ไฟล์แนบ */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Download size={18} className="text-red-600" />
              <span>ไฟล์แนบ ({request.attachments?.length || 0})</span>
            </h2>

            {(!request.attachments || request.attachments.length === 0) ? (
              <p className="text-xs text-gray-400 italic py-2">ไม่มีไฟล์แนบในคำขอนี้</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {request.attachments.map((att: any) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-red-50/30 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                        {att.fileName.split('.').pop() || 'FILE'}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-semibold text-gray-800 truncate" title={att.fileName}>
                          {att.fileName}
                        </p>
                        {att.fileSize && (
                          <p className="text-[10px] text-gray-400">
                            {(att.fileSize / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        )}
                      </div>
                    </div>

                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      title="ดาวน์โหลด / เปิดดูไฟล์"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: ความคิดเห็นและการสนทนา (Comments & Updates) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <MessageSquare size={18} className="text-red-600" />
              <span>การสนทนาและการตอบกลับ ({comments.length})</span>
            </h2>

            {/* Comments List */}
            <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4 text-center">ยังไม่มีข้อความตอบกลับในคำขอนี้</p>
              ) : (
                comments.map((cm: any) => {
                  const isAuthor = cm.userId === currentUserId;
                  const formattedTime = new Date(cm.createdAt).toLocaleString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={cm.id}
                      className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                        cm.isInternal
                          ? 'bg-gray-100 border-gray-300 text-gray-900'
                          : isAuthor
                          ? 'bg-red-50/50 border-red-200 text-gray-900 ml-4'
                          : 'bg-gray-50 border-gray-200 text-gray-900 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <span>{cm.user?.fullName || 'ผู้ใช้งาน'}</span>
                          {cm.isInternal && (
                            <span className="flex items-center gap-0.5 text-[10px] bg-gray-200 text-gray-800 px-1.5 py-0.2 rounded font-bold border border-gray-300">
                              <Lock size={10} />
                              <span>บันทึกภายใน</span>
                            </span>
                          )}
                        </div>
                        <span className="text-gray-400 text-[10px]">{formattedTime}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800">{cm.message}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Box */}
            <form onSubmit={handleSendComment} className="pt-2 border-t border-gray-100 space-y-3">
              <textarea
                rows={2}
                required
                placeholder="พิมพ์ข้อความตอบกลับ หรือสอบถามข้อมูลเพิ่มเติม..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs focus:border-red-500 outline-none resize-y"
              />

              <div className="flex items-center justify-between">
                {isMarketingOrAdmin ? (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 select-none">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={e => setIsInternalComment(e.target.checked)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="font-semibold flex items-center gap-1 text-gray-700">
                      <Lock size={12} className="text-gray-500" />
                      <span>บันทึกภายใน (เห็นเฉพาะทีมการตลาด)</span>
                    </span>
                  </label>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all shadow-sm shadow-red-500/20 disabled:opacity-40"
                >
                  {isSubmittingComment ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  <span>ส่งข้อความ</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section: ประวัติการดำเนินงาน (Audit Log) */}
          {request.logs && request.logs.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <History size={18} className="text-red-600" />
                <span>ประวัติกิจกรรม (Audit Trail)</span>
              </h2>

              <div className="space-y-3 text-xs">
                {request.logs.map((lg: any) => (
                  <div key={lg.id} className="flex items-start gap-3 text-gray-600">
                    <div className="w-2 h-2 rounded-full bg-red-600 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800">{lg.details}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(lg.createdAt).toLocaleString('th-TH')} {lg.user ? `โดย ${lg.user.fullName}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 Cols): Marketing Action Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Internal Management Panel (Only Marketing/Admin can edit) */}
          {isMarketingOrAdmin ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-red-600" />
                  <span>จัดการงานการตลาด</span>
                </h3>
                <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold border border-red-100">
                  Marketing Team
                </span>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <Clock size={13} className="text-gray-400 shrink-0" />
                  <span>สถานะคำขอ (Status)</span>
                </label>
                <select
                  disabled={isUpdatingStatus}
                  value={status}
                  onChange={e => handleStatusChange(e.target.value as RequestStatusCode)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white focus:border-red-500 outline-none"
                >
                  {(Object.keys(REQUEST_STATUSES) as RequestStatusCode[]).map(st => (
                    <option key={st} value={st}>
                      {REQUEST_STATUSES[st].label} - {REQUEST_STATUSES[st].description}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  เมื่อเริ่มงานให้เปลี่ยนเป็น To Do / In Progress
                </p>
              </div>

              {/* Assignee Selector (Requirement 22) */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <UserCheck size={13} className="text-gray-400 shrink-0" />
                  <span>ผู้รับผิดชอบงาน (Assignee)</span>
                </label>
                <select
                  disabled={isUpdatingAssignee}
                  value={assigneeId}
                  onChange={e => handleAssigneeChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white focus:border-red-500 outline-none"
                >
                  <option value="">-- ยังไม่มีผู้รับผิดชอบ --</option>
                  {marketingUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} {u.employeeSale?.nickname ? `(${u.employeeSale.nickname})` : ''} - {u.role}
                    </option>
                  ))}
                </select>
                {request.assignedBy && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    มอบหมายโดย: {request.assignedBy.fullName}
                  </p>
                )}
              </div>

              {/* Priority Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-gray-400 shrink-0" />
                  <span>ระดับความสำคัญ (Priority)</span>
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as PriorityCode)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white focus:border-red-500 outline-none"
                >
                  {(Object.keys(REQUEST_PRIORITIES) as PriorityCode[]).map(pr => (
                    <option key={pr} value={pr}>
                      {REQUEST_PRIORITIES[pr].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Internal Due Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-gray-400 shrink-0" />
                  <span>กำหนดส่งภายในทีม (Internal Due Date)</span>
                </label>
                <input
                  type="date"
                  value={internalDueDate}
                  onChange={e => setInternalDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:border-red-500 outline-none"
                />
              </div>

              {/* Internal Note */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                  <Lock size={12} className="text-gray-500" />
                  <span>บันทึกภายในเฉพาะทีม (Internal Note)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="บันทึกช่วยจำสำหรับทีมการตลาด..."
                  value={internalNote}
                  onChange={e => setInternalNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:border-red-500 outline-none resize-y"
                />
              </div>

              <button
                type="button"
                disabled={isUpdatingInternal}
                onClick={handleSaveInternalFields}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isUpdatingInternal ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                <span>บันทึกข้อมูลการจัดการ</span>
              </button>
            </div>
          ) : (
            /* Requester Progress Card */
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Clock size={16} className="text-red-600 shrink-0" />
                <span>สถานะคำขอของคุณ</span>
              </h3>
              <div className="p-4 bg-red-50/60 rounded-xl border border-red-100 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">สถานะปัจจุบัน:</span>
                  <span className="font-bold text-red-700 inline-flex items-center gap-1.5">
                    <StatusIcon
                      size={13}
                      className={status === 'IN_PROGRESS' ? 'animate-spin shrink-0' : 'shrink-0'}
                    />
                    <span>{statusConfig?.label}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">ผู้รับผิดชอบ:</span>
                  <span className="font-bold text-gray-800 inline-flex items-center gap-1.5">
                    <UserCheck size={13} className="text-gray-400 shrink-0" />
                    <span>
                      {request.assignedTo ? request.assignedTo.fullName : 'รอการมอบหมายงาน'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1.5 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 font-bold text-gray-800">
                  <Lightbulb size={15} className="text-amber-500 shrink-0" />
                  <span>คำแนะนำ:</span>
                </div>
                <p className="text-gray-600 leading-relaxed pl-5">
                  เมื่อฝ่ายการตลาดตอบรับงานหรือเสร็จสิ้น จะมีการแจ้งเตือนทางระบบและช่องทาง Tera Bot ให้ท่านทราบ
                </p>
              </div>
            </div>
          )}

          {/* Requester Contact Info Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3.5 text-xs">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <User size={16} className="text-red-600 shrink-0" />
              <span>ข้อมูลผู้ส่งคำขอ</span>
            </h3>

            <div className="space-y-2 text-gray-700">
              <div className="flex items-center gap-2">
                <User size={14} className="text-gray-400 shrink-0" />
                <span className="font-semibold">{request.requesterName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-gray-400 shrink-0" />
                <span>{request.requesterDepartment}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-gray-400 shrink-0" />
                <span>{request.requesterBranch}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-gray-400 shrink-0" />
                <span className="font-medium">{request.requesterPhone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
