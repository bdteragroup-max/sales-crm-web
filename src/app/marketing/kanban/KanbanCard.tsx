import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, Paperclip, AlignLeft, Calendar } from 'lucide-react';
import type { TKanbanCard } from './KanbanBoardClient';

type Props = {
  card: TKanbanCard;
  onClick: () => void;
};

export default function KanbanCard({ card, onClick }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: card.id,
    data: {
      type: 'Card',
      card
    }
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
      className={`bg-white rounded-xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:border-red-200 hover:shadow-md transition-all group relative overflow-hidden ${card.color ? 'pl-4 pr-3 py-3' : 'p-3'} ${
        isDragging ? 'opacity-50 ring-2 ring-red-500 scale-105 z-50' : ''
      }`}
    >
      {card.color && (
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${card.color}`} />
      )}


      <div className="flex flex-wrap gap-2 mb-2">
        {getRevisionBadge()}
      </div>

      <h4 className="font-semibold text-gray-800 text-sm leading-snug mb-3">
        {card.title}
      </h4>

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

        {hasDueDate && card.dueDate && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
            new Date(card.dueDate) < new Date() ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
          }`}>
            <Calendar size={12} />
            <span>{new Date(card.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
          </div>
        )}
      </div>

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
