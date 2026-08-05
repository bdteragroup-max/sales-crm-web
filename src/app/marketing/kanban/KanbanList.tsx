import React, { useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreHorizontal } from 'lucide-react';
import KanbanCard from './KanbanCard';
import type { TKanbanList, TKanbanCard } from './KanbanBoardClient';

type Props = {
  list: TKanbanList;
  onAddCard: (listId: string, title: string) => void;
  onCardClick: (card: TKanbanCard) => void;
  onUpdateList?: (listId: string, updates: Partial<TKanbanList>) => void;
  onDeleteList?: (listId: string) => void;
};

export default function KanbanList({ list, onAddCard, onCardClick, onUpdateList, onDeleteList }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isRenamingList, setIsRenamingList] = useState(false);
  const [editListName, setEditListName] = useState(list.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: list.id,
    data: {
      type: 'List',
      list
    }
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;
    onAddCard(list.id, newCardTitle.trim());
    setNewCardTitle('');
    setIsAdding(false);
  };

  const LIST_COLORS: Record<string, string> = {
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-100 border-green-300', // Matches reference screenshot
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    gray: 'bg-gray-100 border-gray-200'
  };

  const currentBgClass = list.color && LIST_COLORS[list.color] ? LIST_COLORS[list.color].split(' ')[0] : 'bg-gray-100';
  const currentBorderClass = list.color && LIST_COLORS[list.color] ? LIST_COLORS[list.color].split(' ')[1] : 'border-transparent';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex-shrink-0 w-72 flex flex-col ${currentBgClass} border ${currentBorderClass} rounded-2xl max-h-full shadow-sm transition-colors ${
        isDragging ? 'opacity-50 ring-2 ring-red-500' : ''
      }`}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="p-4 flex items-center justify-between cursor-grab active:cursor-grabbing group relative"
      >
        {isRenamingList ? (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (editListName.trim() && editListName.trim() !== list.name) {
                onUpdateList?.(list.id, { name: editListName.trim() });
              }
              setIsRenamingList(false);
            }}
            className="flex-1 mr-2"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input 
              autoFocus
              value={editListName}
              onChange={(e) => setEditListName(e.target.value)}
              onBlur={() => {
                if (editListName.trim() && editListName.trim() !== list.name) {
                  onUpdateList?.(list.id, { name: editListName.trim() });
                }
                setIsRenamingList(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditListName(list.name);
                  setIsRenamingList(false);
                }
              }}
              className="font-bold text-gray-800 text-[15px] tracking-tight w-full outline-none bg-white px-2 py-1 rounded border border-red-200 focus:ring-2 focus:ring-red-100"
            />
          </form>
        ) : (
          <h3 className="font-bold text-gray-800 text-[15px] tracking-tight truncate flex-1 pr-2">{list.name}</h3>
        )}
        
        <div className="relative">
          <button 
            onPointerDown={(e) => e.stopPropagation()} // Prevent drag start when interacting with menu
            onClick={() => setShowMenu(!showMenu)}
            onBlur={() => setTimeout(() => setShowMenu(false), 200)}
            className="text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200"
          >
            <MoreHorizontal size={18} />
          </button>
          
          {showMenu && (
            <div 
              className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-[100]"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button 
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setShowMenu(false);
                  setEditListName(list.name);
                  setIsRenamingList(true);
                }}
              >
                แก้ไขชื่อ (Rename)
              </button>
              <button 
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-b border-gray-100"
                onClick={() => {
                  setShowMenu(false);
                  onDeleteList?.(list.id);
                }}
              >
                ลบรายการ (Delete)
              </button>
              
              <div className="px-4 py-2">
                <span className="text-xs text-gray-500 font-semibold mb-2 block">สีรายการ (List Color)</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => { onUpdateList?.(list.id, { color: null }); setShowMenu(false); }}
                    className={`w-6 h-6 rounded-full border border-gray-300 bg-gray-100 flex items-center justify-center ${!list.color ? 'ring-2 ring-gray-400 ring-offset-1' : ''}`}
                    title="None"
                  >
                    {!list.color && <div className="w-2 h-2 bg-gray-500 rounded-full" />}
                  </button>
                  {[
                    { c: 'red', bg: 'bg-red-400' },
                    { c: 'orange', bg: 'bg-orange-400' },
                    { c: 'yellow', bg: 'bg-yellow-400' },
                    { c: 'green', bg: 'bg-green-400' },
                    { c: 'blue', bg: 'bg-blue-400' },
                    { c: 'purple', bg: 'bg-purple-400' },
                    { c: 'gray', bg: 'bg-gray-400' }
                  ].map(({ c, bg }) => (
                    <button
                      key={c}
                      onClick={() => { onUpdateList?.(list.id, { color: c }); setShowMenu(false); }}
                      className={`w-6 h-6 rounded-full ${bg} hover:opacity-80 transition-opacity ${list.color === c ? 'ring-2 ring-gray-900 ring-offset-1' : ''}`}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar flex flex-col gap-3 min-h-[10px]">
        <SortableContext 
          items={list.cards.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </SortableContext>

        {isAdding ? (
          <form onSubmit={handleAddSubmit} className="bg-white p-3 rounded-xl shadow-sm border border-red-200">
            <textarea
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddSubmit(e);
                }
                if (e.key === 'Escape') setIsAdding(false);
              }}
              placeholder="กรอกชื่อสำหรับงานนี้..."
              className="w-full text-sm resize-none outline-none text-gray-700 font-medium bg-transparent"
              rows={3}
            />
            <div className="flex items-center gap-2 mt-2">
              <button 
                type="submit"
                className="bg-[#ff2301] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-red-200 hover:bg-red-600 transition-colors"
              >
                เพิ่มงาน
              </button>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="text-gray-500 hover:text-gray-700 text-xs font-bold px-2 py-1.5"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        ) : (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-gray-500 hover:bg-gray-200 hover:text-gray-800 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all"
          >
            <Plus size={16} strokeWidth={2.5} />
            เพิ่มงานใหม่
          </button>
        )}
      </div>
    </div>
  );
}
