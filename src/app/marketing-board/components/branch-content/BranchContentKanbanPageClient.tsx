'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  KanbanSquare,
  Calendar as CalendarIcon,
  BarChart3,
  PanelRightClose,
  PanelRightOpen,
  Filter,
  Activity,
  Plus,
  Check,
  MessageSquare,
  Paperclip,
  AlignLeft,
  Calendar,
  Send,
  Building2,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Clock,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  getBranchContentBoardData,
  createBranchContent,
  moveBranchContentCardStatus,
} from '@/app/actions/branchContent';
import type {
  BranchContentItem,
  BranchContentPermissions,
  BranchContentStatus,
  BranchMasterItem,
} from '@/app/lib/branchContentTypes';
import { KANBAN_COLUMNS, PRODUCT_GROUPS } from '@/app/lib/branchContentTypes';
import { matchBranch } from '@/app/lib/roleHelper';
import CreateEditBranchContentModal from './CreateEditBranchContentModal';
import BranchContentDetailModal from './BranchContentDetailModal';
import BranchContentCalendarView from './BranchContentCalendarView';
import BranchContentDashboardView from './BranchContentDashboardView';

interface BranchContentKanbanPageClientProps {
  initialData: {
    contents: BranchContentItem[];
    branches: BranchMasterItem[];
    staffOptions: { id: string; name: string; branch: string | null }[];
    permissions: BranchContentPermissions | null;
  };
}

const COLUMN_STYLE: Record<BranchContentStatus, { bg: string; border: string; dot: string }> = {
  BACKLOG: { bg: 'bg-gray-100', border: 'border-transparent', dot: 'bg-gray-400' },
  IN_PROGRESS: { bg: 'bg-blue-50/70', border: 'border-blue-200/70', dot: 'bg-blue-500' },
  PENDING_REVIEW: { bg: 'bg-yellow-50/80', border: 'border-yellow-200', dot: 'bg-amber-500' },
  APPROVE_1: { bg: 'bg-purple-50/80', border: 'border-purple-200', dot: 'bg-purple-600' },
  REVISE: { bg: 'bg-orange-50/80', border: 'border-orange-200', dot: 'bg-orange-500' },
  APPROVED: { bg: 'bg-green-100/70', border: 'border-green-300', dot: 'bg-emerald-500' },
  PUBLISHED: { bg: 'bg-indigo-50/80', border: 'border-indigo-200', dot: 'bg-indigo-600' },
  CANCELLED: { bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500' },
};

function DraggableBranchCard({
  card,
  onClick,
}: {
  card: BranchContentItem;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { type: 'BranchCard', card },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const coverImage = card.media?.find(
    m =>
      m.fileType === 'IMAGE' ||
      m.mimeType?.startsWith('image/') ||
      /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(m.fileName || '')
  );
  const coverVideo = !coverImage
    ? card.media?.find(m => m.fileType === 'VIDEO' || m.mimeType?.startsWith('video/'))
    : null;

  const isCompleted = card.status === 'PUBLISHED';

  const getRevisionBadge = () => {
    if (card.isOverdue) {
      return (
        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase tracking-wider inline-flex items-center gap-1">
          <AlertTriangle size={10} /> เกินกำหนด
        </span>
      );
    }
    if (card.status === 'REVISE') {
      return (
        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase tracking-wider">
          ต้องแก้ไข (รอบ {card.revisionCount})
        </span>
      );
    }
    if (card.status === 'PENDING_REVIEW') {
      return (
        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-black rounded-full uppercase tracking-wider">
          รอ ผจก.สาขาตรวจ
        </span>
      );
    }
    if (card.status === 'APPROVE_1') {
      if (card.reviewSubStatus === 'ENDORSED_FOR_MARKETING_MANAGER') {
        return (
          <span className="px-2 py-0.5 bg-fuchsia-100 text-fuchsia-800 text-[10px] font-black rounded-full uppercase tracking-wider">
            MKT ผ่าน • รอ ผจก.อนุมัติ
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black rounded-full uppercase tracking-wider">
          Approve - 1 • รอการตลาด
        </span>
      );
    }
    if (card.status === 'APPROVED') {
      return (
        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase tracking-wider">
          อนุมัติแล้ว • พร้อมโพสต์
        </span>
      );
    }
    return null;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:border-red-200 hover:shadow-md transition-all group relative overflow-hidden p-3 ${
        isDragging ? 'opacity-50 ring-2 ring-red-500 scale-105 z-50' : ''
      }`}
    >
      {/* Top Badges: Branch + Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
        <span className="px-2 py-0.5 bg-red-50 text-[#ff2301] border border-red-100 text-[10px] font-extrabold rounded-md">
          สาขา{card.branchName}
        </span>
        <span className="text-[10px] font-mono text-gray-400 font-semibold">
          {card.contentNo} (V{card.currentVersion})
        </span>
      </div>

      {getRevisionBadge() && <div className="flex flex-wrap gap-1.5 mb-2">{getRevisionBadge()}</div>}

      {/* Card Title with Circle Check like /marketing/kanban */}
      <div className="flex items-start gap-2 mb-2">
        <div
          className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
            isCompleted
              ? 'bg-green-500 border-green-500 text-white'
              : card.status === 'APPROVED'
              ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
              : 'border-gray-300 text-transparent group-hover:border-red-400 bg-white'
          }`}
        >
          <Check size={12} strokeWidth={4} />
        </div>
        <h4
          className={`font-semibold text-gray-800 text-sm leading-snug flex-1 ${
            isCompleted ? 'line-through text-gray-400' : ''
          }`}
        >
          {card.title}
        </h4>
      </div>

      {/* Assignee Row like /marketing/kanban */}
      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2 font-medium">
        <div className="w-5 h-5 rounded-full bg-red-100 text-[#ff2301] flex items-center justify-center font-bold text-[10px] shrink-0">
          {(card.assigneeName || card.createdByName || '?').charAt(0)}
        </div>
        <span className="truncate">{card.assigneeName || card.createdByName}</span>
      </div>

      {/* Reviewer / Approver Info if present */}
      {card.reviewerName && (
        <div className="flex items-center gap-1.5 text-xs text-purple-700 mb-2 font-medium">
          <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[10px] shrink-0">
            {card.reviewerName.charAt(0)}
          </div>
          <span className="truncate">{card.reviewerName} (ผู้ตรวจ)</span>
        </div>
      )}

      {/* Meta Icons Row */}
      <div className="flex items-center justify-between text-gray-400">
        <div className="flex items-center gap-3">
          {(card.caption || card.description) && (
            <div className="hover:text-gray-600 transition-colors" title="มีรายละเอียด / Caption">
              <AlignLeft size={14} />
            </div>
          )}
          {card.comments && card.comments.length > 0 && (
            <div className="flex items-center gap-1 text-xs font-semibold hover:text-gray-600 transition-colors">
              <MessageSquare size={14} />
              <span>{card.comments.length}</span>
            </div>
          )}
          {card.media && card.media.length > 0 && (
            <div className="flex items-center gap-1 text-xs font-semibold hover:text-gray-600 transition-colors">
              <Paperclip size={14} />
              <span>{card.media.length}</span>
            </div>
          )}
        </div>

        {card.submissionDueDate && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
              card.isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
            }`}
            title="กำหนดส่งตรวจ"
          >
            <Calendar size={12} />
            <span>
              {new Date(card.submissionDueDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
              })}
            </span>
          </div>
        )}
      </div>

      {/* Scheduled Post Banner like /marketing/kanban */}
      {card.plannedPublishDate && (
        <div className="mt-2 flex items-center justify-between text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
          <div className="flex items-center gap-1.5">
            <Send size={12} />
            <span>
              {new Date(card.plannedPublishDate).toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>
          {card.targetChannels && card.targetChannels.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-blue-600">
              {card.targetChannels.slice(0, 3).map(c => {
                if (c.includes('Facebook'))
                  return (
                    <span key={c} className="bg-white rounded px-1 shadow-sm">
                      FB
                    </span>
                  );
                if (c.includes('TikTok'))
                  return (
                    <span key={c} className="bg-white rounded px-1 shadow-sm">
                      TK
                    </span>
                  );
                if (c.includes('LINE'))
                  return (
                    <span key={c} className="bg-white rounded px-1 shadow-sm">
                      LINE
                    </span>
                  );
                if (c.includes('YouTube'))
                  return (
                    <span key={c} className="bg-white rounded px-1 shadow-sm">
                      YT
                    </span>
                  );
                return (
                  <span key={c} className="bg-white rounded px-1 shadow-sm">
                    {c.substring(0, 2).toUpperCase()}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cover Image / Video at bottom like /marketing/kanban */}
      {coverImage && (
        <div className="w-[calc(100%+1.5rem)] h-32 mt-3 -mx-3 -mb-3 rounded-b-xl overflow-hidden shrink-0 border-t border-gray-100">
          <img
            src={coverImage.thumbnailUrl || coverImage.fileUrl}
            alt={coverImage.fileName}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {coverVideo && (
        <div className="w-[calc(100%+1.5rem)] h-32 mt-3 -mx-3 -mb-3 rounded-b-xl overflow-hidden shrink-0 border-t border-gray-100 bg-black">
          <video
            src={coverVideo.fileUrl}
            className="w-full h-full object-cover opacity-90"
            muted
            playsInline
            preload="metadata"
          />
        </div>
      )}
    </div>
  );
}

function DroppableKanbanColumn({
  statusId,
  title,
  subtitle,
  cards,
  onCardClick,
  onQuickAddCard,
  onOpenFullCreateModal,
}: {
  statusId: BranchContentStatus;
  title: string;
  subtitle: string;
  cards: BranchContentItem[];
  onCardClick: (card: BranchContentItem) => void;
  onQuickAddCard: (statusId: BranchContentStatus, title: string) => Promise<void>;
  onOpenFullCreateModal: (initialStatus: BranchContentStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: statusId,
    data: { type: 'BranchColumn', statusId },
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isSavingQuick, setIsSavingQuick] = useState(false);

  const colStyle = COLUMN_STYLE[statusId] || COLUMN_STYLE.BACKLOG;

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSavingQuick) return;
    setIsSavingQuick(true);
    try {
      await onQuickAddCard(statusId, newTitle.trim());
      setNewTitle('');
      setIsAdding(false);
    } finally {
      setIsSavingQuick(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 flex flex-col ${colStyle.bg} border ${
        isOver ? 'border-[#ff2301] ring-2 ring-red-200' : colStyle.border
      } rounded-2xl max-h-full shadow-sm transition-all`}
    >
      {/* Column Header matching /marketing/kanban */}
      <div className="p-4 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colStyle.dot}`} />
            <h3 className="font-bold text-gray-800 text-[15px] leading-tight tracking-tight truncate">
              {title}
            </h3>
          </div>
          <p className="text-[11px] text-gray-500 font-medium truncate pl-4 mt-1">
            {subtitle}
          </p>
        </div>
        <span className="h-6 min-w-[24px] px-2 flex items-center justify-center text-xs font-bold text-gray-600 bg-white/90 border border-gray-200/70 rounded-full shadow-sm shrink-0">
          {cards.length}
        </span>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar flex flex-col gap-3 min-h-[10px]">
        {cards.map(card => (
          <DraggableBranchCard
            key={card.id}
            card={card}
            onClick={() => onCardClick(card)}
          />
        ))}

        {/* Bottom Footer Row: Quick Add for steps 1-2, Clear workflow hint of identical height for review/approval steps */}
        {statusId === 'BACKLOG' || statusId === 'IN_PROGRESS' ? (
          isAdding ? (
            <form
              onSubmit={handleQuickSubmit}
              className="bg-white p-3 rounded-xl shadow-sm border border-red-200"
            >
              <textarea
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleQuickSubmit(e);
                  }
                  if (e.key === 'Escape') setIsAdding(false);
                }}
                placeholder="กรอกหัวข้อคอนเทนต์สาขา..."
                className="w-full text-sm resize-none outline-none text-gray-700 font-medium bg-transparent"
                rows={3}
              />
              <div className="flex items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    disabled={isSavingQuick}
                    className="bg-[#ff2301] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-red-200 hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {isSavingQuick ? 'กำลังบันทึก...' : 'เพิ่มการ์ด'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-gray-500 hover:text-gray-700 text-xs font-bold px-2 py-1.5"
                  >
                    ยกเลิก
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    onOpenFullCreateModal(statusId);
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  +แนบไฟล์เต็มรูปแบบ
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="h-10 flex items-center gap-2 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all"
            >
              <Plus size={16} strokeWidth={2.5} />
              เพิ่มงานใหม่
            </button>
          )
        ) : (
          <div className="h-10 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-400 select-none">
            {statusId === 'PENDING_REVIEW' && 'รอผู้จัดการสาขากดอนุมัติงาน'}
            {statusId === 'APPROVE_1' && 'รอทีมการตลาดตรวจและอนุมัติ'}
            {statusId === 'REVISE' && 'สาขาแก้ไขงานแล้วส่งตรวจใหม่'}
            {statusId === 'APPROVED' && 'พร้อมให้สาขานำไปโพสต์จริง'}
            {statusId === 'PUBLISHED' && 'โพสต์จริงและแนบลิงก์เสร็จสิ้น'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BranchContentKanbanPageClient({
  initialData,
}: BranchContentKanbanPageClientProps) {
  const [contents, setContents] = useState<BranchContentItem[]>(
    initialData.contents || []
  );
  const [branches] = useState<BranchMasterItem[]>(initialData.branches || []);
  const [staffOptions] = useState(initialData.staffOptions || []);
  const permissions = initialData.permissions;

  // View Switcher in Top Header matching /marketing/kanban
  const [viewType, setViewType] = useState<'board' | 'calendar' | 'dashboard'>('board');

  // Right Drawer State matching /marketing/kanban
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'filters' | 'activity'>('filters');

  // Filter States
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [filterLabel, setFilterLabel] = useState<
    | null
    | 'WAITING_BRANCH_MGR'
    | 'APPROVE_1'
    | 'ENDORSED'
    | 'REVISE'
    | 'OVERDUE'
  >(null);
  const [showPublished, setShowPublished] = useState(true);

  // Modals
  const [selectedItem, setSelectedItem] = useState<BranchContentItem | null>(null);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BranchContentItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Recalculate dnd-kit droppables when right drawer toggles
  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 310);
    return () => clearTimeout(t);
  }, [isSidebarOpen]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const fresh = await getBranchContentBoardData();
      if (fresh.success) {
        setContents(fresh.contents);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleItemUpsert = (updated: BranchContentItem) => {
    setContents(prev => {
      const exists = prev.some(c => c.id === updated.id);
      if (exists) {
        return prev.map(c => (c.id === updated.id ? updated : c));
      }
      return [updated, ...prev];
    });
    if (selectedItem?.id === updated.id) {
      setSelectedItem(updated);
    }
  };

  // Drag End Handler to move cards between columns like /marketing/kanban
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const cardId = String(active.id);
    const targetStatus = String(over.id) as BranchContentStatus;

    const validStatuses: BranchContentStatus[] = [
      'BACKLOG',
      'IN_PROGRESS',
      'PENDING_REVIEW',
      'APPROVE_1',
      'REVISE',
      'APPROVED',
      'PUBLISHED',
    ];
    if (!validStatuses.includes(targetStatus)) return;

    const currentCard = contents.find(c => c.id === cardId);
    if (!currentCard || currentCard.status === targetStatus) return;

    // If dragging to PUBLISHED, open the detail modal on the Publish tab so user can attach the URL
    if (targetStatus === 'PUBLISHED' && !currentCard.publishedUrl) {
      setSelectedItem(currentCard);
      Swal.fire({
        icon: 'info',
        title: 'กรุณาแนบลิงก์โพสต์จริง (Published URL)',
        text: 'เลือกแท็บ "3. บันทึกผลเผยแพร่จริง" ในหน้าต่างรายละเอียดเพื่อวางลิงก์โพสต์และปิดงาน',
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    // Optimistic UI update
    const previousContents = [...contents];
    setContents(prev =>
      prev.map(c => (c.id === cardId ? { ...c, status: targetStatus } : c))
    );

    const res = await moveBranchContentCardStatus(cardId, targetStatus);
    if (res.success && res.data) {
      handleItemUpsert(res.data);
    } else {
      // Revert on permission error
      setContents(previousContents);
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถย้ายการ์ดไปยังสถานะนี้ได้',
        text: res.error || 'กรุณาตรวจสอบสิทธิ์การอนุมัติ',
      });
    }
  };

  // Quick Add Card inline inside Backlog / In Progress column
  const handleQuickAddCard = async (
    statusId: BranchContentStatus,
    cardTitle: string
  ) => {
    const defaultBranchId =
      selectedBranch !== 'ALL'
        ? selectedBranch
        : permissions?.userBranchId || branches[0]?.id || 'KK01';

    const fiveDaysLater = new Date(Date.now() + 5 * 86400000)
      .toISOString()
      .split('T')[0];

    const res = await createBranchContent({
      title: cardTitle,
      branchId: defaultBranchId,
      contentType: 'SHORT_VIDEO',
      productGroup: PRODUCT_GROUPS[0],
      targetChannels: ['Facebook Page สาขา'],
      plannedPublishDate: fiveDaysLater,
      initialStatus: statusId === 'BACKLOG' ? 'BACKLOG' : 'IN_PROGRESS',
    });

    if (res.success && res.data) {
      handleItemUpsert(res.data);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'ไม่สามารถสร้างงานได้',
        text: res.error,
      });
    }
  };

  // Filtered Cards
  const filteredContents = useMemo(() => {
    return contents.filter(card => {
      if (!showPublished && card.status === 'PUBLISHED') return false;

      if (selectedBranch !== 'ALL') {
        const matchB =
          card.branchId === selectedBranch ||
          matchBranch(card.branchName, selectedBranch) ||
          matchBranch(card.branchId, selectedBranch);
        if (!matchB) return false;
      }

      if (filterAssignee) {
        if (card.assigneeId !== filterAssignee && card.createdById !== filterAssignee) {
          return false;
        }
      }

      if (filterLabel === 'WAITING_BRANCH_MGR' && card.status !== 'PENDING_REVIEW')
        return false;
      if (filterLabel === 'APPROVE_1' && card.status !== 'APPROVE_1') return false;
      if (
        filterLabel === 'ENDORSED' &&
        (card.status !== 'APPROVE_1' ||
          card.reviewSubStatus !== 'ENDORSED_FOR_MARKETING_MANAGER')
      )
        return false;
      if (filterLabel === 'REVISE' && card.status !== 'REVISE') return false;
      if (filterLabel === 'OVERDUE' && !card.isOverdue) return false;

      return true;
    });
  }, [contents, showPublished, selectedBranch, filterAssignee, filterLabel]);

  // All Activity Logs for Right Drawer
  const allActivities = useMemo(() => {
    const list: {
      id: string;
      cardTitle: string;
      branchName: string;
      userName: string;
      action: string;
      details: string | null;
      createdAt: string;
    }[] = [];

    contents.forEach(c => {
      (c.logs || []).forEach(l => {
        list.push({
          id: l.id,
          cardTitle: c.title,
          branchName: c.branchName,
          userName: l.userName || 'ระบบ',
          action: l.action,
          details: l.details ?? null,
          createdAt: l.createdAt,
        });
      });
    });

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [contents]);

  const activeFilterCount =
    (selectedBranch !== 'ALL' ? 1 : 0) +
    (filterAssignee ? 1 : 0) +
    (filterLabel ? 1 : 0);

  return (
    <div className="flex-1 flex flex-col h-screen min-h-0 bg-[#f8fafc] overflow-hidden">
      {/* ─── TOP HEADER BAR (Symmetrical single-row layout matching /marketing/kanban) ─── */}
      <header className="flex-shrink-0 h-16 bg-white border-b border-gray-200/80 px-6 flex items-center justify-between gap-4 shadow-sm z-10">
        {/* Left Group: Icon + Title + View Switcher */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#ff2301] shrink-0">
            <KanbanSquare size={20} strokeWidth={2.5} />
          </div>

          <div className="min-w-0 flex items-center gap-3.5">
            <div className="min-w-0">
              <h1 className="font-bold text-base md:text-lg text-gray-900 leading-tight tracking-tight truncate whitespace-nowrap">
                บอร์ดคอนเทนต์สาขา
              </h1>
              <p className="text-[11px] text-gray-500 font-medium leading-tight truncate hidden xl:block">
                {permissions?.canViewAllBranches
                  ? 'Branch Content Board • ภาพรวม 11 สาขา'
                  : `Branch Content Board • สาขา${permissions?.userBranchName || branches[0]?.name || 'ของฉัน'}`}
              </p>
            </div>

            {/* View Switcher Pill: บอร์ด / ปฏิทิน / (สรุป 11 สาขา เฉพาะ HQ Marketing & Admin) */}
            <div className="hidden sm:flex h-10 bg-gray-100 p-1 rounded-xl items-center shrink-0">
              <button
                type="button"
                onClick={() => setViewType('board')}
                className={`h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                  viewType === 'board'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <KanbanSquare size={15} /> บอร์ด
              </button>
              <button
                type="button"
                onClick={() => setViewType('calendar')}
                className={`h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                  viewType === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <CalendarIcon size={15} /> ปฏิทิน
              </button>
              {permissions?.canViewAllBranches && (
                <button
                  type="button"
                  onClick={() => setViewType('dashboard')}
                  className={`h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                    viewType === 'dashboard'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <BarChart3 size={15} /> สรุป 11 สาขา
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Controls: Branch Selector (HQ only) or Locked Branch Badge (Branch users) + Create Button + Refresh + Right Sidebar Drawer Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          {permissions?.canViewAllBranches ? (
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="hidden md:block h-10 px-3.5 bg-gray-100 hover:bg-gray-200/70 rounded-xl text-xs font-bold text-gray-700 outline-none border border-transparent focus:border-red-300 transition-all shrink-0 cursor-pointer"
            >
              <option value="ALL">ทุกสาขา (11 สาขา)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  สาขา{b.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="hidden md:flex h-10 px-3.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-700 items-center gap-1.5 border border-gray-200/70 shrink-0 whitespace-nowrap">
              <Building2 size={14} className="text-[#ff2301] shrink-0" />
              <span>
                สาขา{permissions?.userBranchName || branches[0]?.name || 'ของฉัน'}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsCreateEditOpen(true);
            }}
            className="h-10 bg-[#ff2301] hover:bg-red-600 text-white px-4 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} className="shrink-0" />
            <span className="hidden sm:inline">สร้างคอนเทนต์สาขา</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={17} className={isRefreshing ? 'animate-spin text-[#ff2301]' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative shrink-0 ${
              isSidebarOpen
                ? 'bg-red-50 text-[#ff2301]'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title="ตัวกรอง & กิจกรรม"
          >
            {isSidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
            {activeFilterCount > 0 && !isSidebarOpen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ff2301] text-white text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ─── MAIN WORKSPACE + COLLAPSIBLE RIGHT SIDEBAR (Like /marketing/kanban) ─── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {viewType === 'calendar' ? (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <BranchContentCalendarView
              contents={filteredContents}
              onCardClick={clicked => setSelectedItem(clicked)}
            />
          </div>
        ) : viewType === 'dashboard' ? (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <BranchContentDashboardView
              contents={filteredContents}
              branches={branches}
            />
          </div>
        ) : (
          /* KANBAN BOARD VIEW */
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar transition-all duration-300">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-6 h-full items-start">
                {KANBAN_COLUMNS.map(col => {
                  const colCards = filteredContents.filter(c => c.status === col.id);
                  return (
                    <DroppableKanbanColumn
                      key={col.id}
                      statusId={col.id}
                      title={col.title}
                      subtitle={col.subtitle}
                      cards={colCards}
                      onCardClick={card => setSelectedItem(card)}
                      onQuickAddCard={handleQuickAddCard}
                      onOpenFullCreateModal={() => {
                        setEditingItem(null);
                        setIsCreateEditOpen(true);
                      }}
                    />
                  );
                })}
              </div>
            </DndContext>
          </div>
        )}

        {/* Mobile Right Drawer Backdrop */}
        {isSidebarOpen && (
          <div
            className="md:hidden absolute inset-0 bg-slate-900/40 z-10 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* ─── RIGHT SIDEBAR DRAWER (ตัวกรอง / กิจกรรม - Identical to /marketing/kanban) ─── */}
        <div
          className={`absolute top-0 right-0 bottom-0 z-20 md:relative flex-shrink-0 bg-white border-l transition-all duration-300 ease-in-out flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] ${
            isSidebarOpen
              ? 'w-80 translate-x-0'
              : 'w-0 translate-x-full border-transparent opacity-0'
          }`}
        >
          <div className="flex-1 min-w-[320px] max-w-[320px] flex flex-col h-full">
            <div className="h-14 border-b flex p-1 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setSidebarTab('filters')}
                className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-colors ${
                  sidebarTab === 'filters'
                    ? 'bg-white shadow-sm text-gray-900 border border-gray-100'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Filter size={16} /> ตัวกรอง
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('activity')}
                className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-colors ${
                  sidebarTab === 'activity'
                    ? 'bg-white shadow-sm text-gray-900 border border-gray-100'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Activity size={16} /> กิจกรรม
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {sidebarTab === 'filters' && (
                <div className="space-y-6">
                  {/* 1. ป้ายกำกับ / คิวตรวจ (Labels) */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      ป้ายกำกับสถานะ (Labels)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFilterLabel(
                            filterLabel === 'WAITING_BRANCH_MGR'
                              ? null
                              : 'WAITING_BRANCH_MGR'
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          filterLabel === 'WAITING_BRANCH_MGR'
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        1. รอ ผจก.สาขาตรวจ
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setFilterLabel(
                            filterLabel === 'APPROVE_1' ? null : 'APPROVE_1'
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          filterLabel === 'APPROVE_1'
                            ? 'bg-purple-600 text-white border-purple-700'
                            : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                        }`}
                      >
                        2. Approve - 1 (รอการตลาด)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setFilterLabel(filterLabel === 'ENDORSED' ? null : 'ENDORSED')
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          filterLabel === 'ENDORSED'
                            ? 'bg-fuchsia-600 text-white border-fuchsia-700'
                            : 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100'
                        }`}
                      >
                        3. รอ ผจก.การตลาดอนุมัติ
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setFilterLabel(filterLabel === 'REVISE' ? null : 'REVISE')
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          filterLabel === 'REVISE'
                            ? 'bg-red-500 text-white border-red-600'
                            : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                        }`}
                      >
                        ต้องแก้ไขด่วน (Revise)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setFilterLabel(filterLabel === 'OVERDUE' ? null : 'OVERDUE')
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          filterLabel === 'OVERDUE'
                            ? 'bg-rose-600 text-white border-rose-700'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        เกินกำหนดส่ง (Overdue)
                      </button>
                    </div>
                  </div>

                  {/* 2. สาขา (11 Branches) — เฉพาะ HQ Marketing / Executive / Admin */}
                  {permissions?.canViewAllBranches && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        กรองตามสาขา (11 Branches)
                      </h3>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        <button
                          type="button"
                          onClick={() => setSelectedBranch('ALL')}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                            selectedBranch === 'ALL'
                              ? 'border-[#ff2301] bg-red-50 text-[#ff2301]'
                              : 'border-transparent hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span>ทุกสาขา (All 11 Branches)</span>
                          <span className="text-[11px]">{contents.length}</span>
                        </button>
                        {branches.map(b => {
                          const bCount = contents.filter(
                            c =>
                              c.branchId === b.id ||
                              matchBranch(c.branchName, b.name)
                          ).length;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setSelectedBranch(b.id)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                selectedBranch === b.id
                                  ? 'border-[#ff2301] bg-red-50 text-[#ff2301] font-bold'
                                  : 'border-transparent hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <span>สาขา{b.name}</span>
                              <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px]">
                                {bCount}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. สถานะงานที่เผยแพร่แล้ว */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      สถานะงาน (Status)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPublished(!showPublished)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                        showPublished
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          showPublished
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {showPublished && <Check size={12} strokeWidth={4} />}
                      </div>
                      <div className="flex-1 text-xs font-bold">
                        แสดงงานที่เผยแพร่สำเร็จแล้ว (Published)
                      </div>
                    </button>
                  </div>

                  {/* 4. ผู้รับผิดชอบ (Assignees) */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      ผู้รับผิดชอบ (Assignees)
                    </h3>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => setFilterAssignee(null)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl border text-xs font-medium transition-all ${
                          filterAssignee === null
                            ? 'border-[#ff2301] bg-red-50 text-[#ff2301] font-bold'
                            : 'border-transparent hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                          A
                        </div>
                        ทุกคน (All)
                      </button>
                      {staffOptions.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setFilterAssignee(u.id)}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl border text-xs font-medium transition-all text-left ${
                            filterAssignee === u.id
                              ? 'border-[#ff2301] bg-red-50 text-[#ff2301] font-bold'
                              : 'border-transparent hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-red-100 text-[#ff2301] flex items-center justify-center font-bold shrink-0">
                            {u.name?.charAt(0) || '?'}
                          </div>
                          <div className="truncate flex-1">
                            <div>{u.name}</div>
                            {u.branch && (
                              <div className="text-[10px] text-gray-400 font-normal truncate">
                                สาขา{u.branch}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {sidebarTab === 'activity' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    กิจกรรมล่าสุด (Recent Activity)
                  </h3>
                  {allActivities.length === 0 ? (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <Activity size={14} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">ระบบ</span> เริ่มต้นกระดานคอนเทนต์สาขา
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">วันนี้</p>
                      </div>
                    </div>
                  ) : (
                    allActivities.slice(0, 40).map(log => (
                      <div key={log.id} className="flex gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-red-50 text-[#ff2301] flex items-center justify-center shrink-0 font-bold text-xs">
                          {log.userName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-800 break-words leading-relaxed">
                            <span className="font-bold">{log.userName}</span>{' '}
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-semibold">
                              สาขา{log.branchName}
                            </span>{' '}
                            <span className="font-medium text-gray-600">
                              &ldquo;{log.cardTitle}&rdquo;
                            </span>
                          </p>
                          {log.details && (
                            <p className="text-[11px] text-gray-500 mt-0.5 break-words">
                              {log.details}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(log.createdAt).toLocaleString('th-TH', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <CreateEditBranchContentModal
        isOpen={isCreateEditOpen}
        onClose={() => {
          setIsCreateEditOpen(false);
          setEditingItem(null);
        }}
        onSuccess={savedItem => handleItemUpsert(savedItem)}
        editItem={editingItem}
        branches={branches}
        staffOptions={staffOptions}
        permissions={permissions}
      />

      {/* Detail & Review Modal */}
      <BranchContentDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={updatedItem => handleItemUpsert(updatedItem)}
        onEditClick={itemToEdit => {
          setSelectedItem(null);
          setEditingItem(itemToEdit);
          setIsCreateEditOpen(true);
        }}
        permissions={permissions}
      />
    </div>
  );
}

