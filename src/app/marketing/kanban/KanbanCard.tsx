import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, Paperclip, AlignLeft, Calendar, Check, Send } from 'lucide-react';
import type { TKanbanCard } from './KanbanBoardClient';

type Props = {
  card: TKanbanCard;
  users: any[];
  onClick: () => void;
  onCompleteCard?: (id: string, isCompleted: boolean) => void;
};

export default function KanbanCard({ card, users, onClick, onCompleteCard }: Props) {
  const sortableData = React.useMemo(() => ({
    type: 'Card',
    card
  }), [card]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: card.id,
    data: sortableData
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const hasComments = card.comments && card.comments.length > 0;
  const hasAttachments = card.attachments && card.attachments.length > 0;
  const hasDescription = !!card.description;
  const hasChecklist = card.checklist && Array.isArray(card.checklist) && card.checklist.length > 0;
  const hasDueDate = !!card.dueDate;

  let checklistProgress = 0;
  if (hasChecklist) {
    const completed = card.checklist.filter((i: any) => i.completed).length;
    checklistProgress = completed / card.checklist.length;
  }

  // Find cover image (first image attachment)
  const coverImage = card.attachments?.find((att: any) => att.fileType?.startsWith('image/'));

  const assignedUser = users.find(u => u.id === card.assignedToId);
  const serviceReviewers = (card.engineeringReviewers || []).map(id => users.find(u => u.id === id)).filter(Boolean);

  const getRevisionBadge = () => {
    switch (card.revisionStatus) {
      case 'needs_revision':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase tracking-wider">ต้องแก้ไข</span>;
      case 'pending_review':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-black rounded-full uppercase tracking-wider">รอตรวจ</span>;
      case 'approved':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase tracking-wider">ผ่าน</span>;
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:border-red-200 hover:shadow-md transition-all group relative overflow-hidden ${card.color ? 'pl-4 pr-3 py-3' : 'p-3'} ${
        isDragging ? 'opacity-50 ring-2 ring-red-500 scale-105 z-50' : ''
      }`}
    >
      {card.color && (
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${card.color}`} />
      )}


      <div className="flex flex-wrap gap-2 mb-2">
        {getRevisionBadge()}
      </div>

      <div className={`flex items-start gap-2 ${assignedUser || serviceReviewers.length > 0 ? 'mb-2' : 'mb-3'}`}>
        <button
          title={card.isCompleted ? "เสร็จสิ้น (Completed)" : "ทำเครื่องหมายว่าเสร็จและบันทึก (Mark as completed and saved)"}
          onClick={(e) => {
            e.stopPropagation();
            if (onCompleteCard) {
              onCompleteCard(card.id, !card.isCompleted);
            }
          }}
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag start when clicking the checkbox
          className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
            card.isCompleted 
              ? 'bg-green-500 border-green-500 text-white' 
              : 'border-gray-300 text-transparent hover:border-green-500 hover:text-green-500 bg-white'
          }`}
        >
          <Check size={12} strokeWidth={4} />
        </button>
        <h4 className={`font-semibold text-gray-800 text-sm leading-snug flex-1 ${card.isCompleted ? 'line-through text-gray-400' : ''}`}>
          {card.title}
        </h4>
      </div>

      {assignedUser && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1 font-medium">
          <div className="w-5 h-5 rounded-full bg-red-100 text-[#ff2301] flex items-center justify-center font-bold text-[10px] shrink-0">
            {assignedUser.fullName?.charAt(0) || assignedUser.email?.charAt(0) || '?'}
          </div>
          <span className="truncate">{assignedUser.fullName}</span>
        </div>
      )}

      {serviceReviewers.map(reviewer => (
        <div key={reviewer.id} className="flex items-center gap-1.5 text-xs text-blue-600 mb-1 font-medium">
          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
            {reviewer.fullName?.charAt(0) || reviewer.email?.charAt(0) || '?'}
          </div>
          <span className="truncate">{reviewer.fullName} (บริการ)</span>
        </div>
      ))}

      {(assignedUser || serviceReviewers.length > 0) && <div className="mb-2"></div>}

      <div className="flex items-center justify-between text-gray-400">
        <div className="flex items-center gap-3">
          {hasDescription && (
            <div className="hover:text-gray-600 transition-colors">
              <AlignLeft size={14} />
            </div>
          )}
          {hasComments && (
            <div className="flex items-center gap-1 text-xs font-semibold hover:text-gray-600 transition-colors">
              <MessageSquare size={14} />
              <span>{card.comments.length}</span>
            </div>
          )}
          {hasAttachments && (
            <div className="flex items-center gap-1 text-xs font-semibold hover:text-gray-600 transition-colors">
              <Paperclip size={14} />
              <span>{card.attachments.length}</span>
            </div>
          )}
          {hasChecklist && (
            <div className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md ${checklistProgress === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              <span>{card.checklist.filter((i:any) => i.completed).length}/{card.checklist.length}</span>
            </div>
          )}
        </div>

        {(card.startDate || card.dueDate) && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
            card.dueDate && new Date(card.dueDate) < new Date() ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
          }`}>
            <Calendar size={12} />
            <span>
              {card.startDate ? new Date(card.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
              {card.startDate && card.dueDate ? ' - ' : ''}
              {card.dueDate ? new Date(card.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
            </span>
          </div>
        )}
      </div>

      {/* Scheduled Post */}
      {card.scheduledPostDate && (
        <div className="mt-2 flex items-center justify-between text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
          <div className="flex items-center gap-1.5">
            <Send size={12} />
            <span>{new Date(card.scheduledPostDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
          </div>
          {card.postingChannels && card.postingChannels.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-blue-600">
              {card.postingChannels.map(c => {
                if (c === 'Facebook') return <span key={c} className="bg-white rounded px-1 shadow-sm">FB</span>;
                if (c === 'Instagram') return <span key={c} className="bg-white rounded px-1 shadow-sm">IG</span>;
                if (c === 'TikTok') return <span key={c} className="bg-white rounded px-1 shadow-sm">TK</span>;
                if (c === 'YouTube') return <span key={c} className="bg-white rounded px-1 shadow-sm">YT</span>;
                return <span key={c} className="bg-white rounded px-1 shadow-sm">{c.substring(0, 2).toUpperCase()}</span>;
              })}
            </div>
          )}
        </div>
      )}

      {/* Cover Image */}
      {coverImage && (
        <div className="w-[calc(100%+1.5rem)] h-32 mt-3 -mx-3 -mb-3 rounded-b-xl overflow-hidden shrink-0 border-t border-gray-100">
          <img 
            src={coverImage.fileUrl} 
            alt={coverImage.fileName || 'Cover image'} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
