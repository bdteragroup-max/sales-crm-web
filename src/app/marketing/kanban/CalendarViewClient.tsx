'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react';
import type { TKanbanCard, TKanbanList } from './KanbanBoardClient';
import { POSTING_CHANNELS, PostingChannel } from '@/lib/marketingChannels';

type Props = {
  boardId: string | undefined;
  users: any[];
  lists: TKanbanList[];
  currentUser: any;
  onUpdateCard: (card: TKanbanCard) => void;
};

// Helper to reliably get Day/Month/Year in Bangkok timezone from an ISO string
const getBangkokDateParts = (dateString: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const date = new Date(dateString);
  const parts = formatter.formatToParts(date);
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1');
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2026');
  return { day, month, year };
};

const USER_COLORS = [
  'bg-blue-50 text-blue-800 border-blue-200',
  'bg-purple-50 text-purple-800 border-purple-200',
  'bg-emerald-50 text-emerald-800 border-emerald-200',
  'bg-amber-50 text-amber-800 border-amber-200',
  'bg-rose-50 text-rose-800 border-rose-200',
  'bg-indigo-50 text-indigo-800 border-indigo-200',
  'bg-cyan-50 text-cyan-800 border-cyan-200',
  'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
];

const getUserColorClass = (userId: string | null | undefined) => {
  if (!userId) return 'bg-gray-50 text-gray-700 border-gray-200'; // Unassigned
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};

export default function CalendarViewClient({ boardId, users, lists, currentUser, onUpdateCard }: Props) {
  const [currentDate, setCurrentDate] = useState(() => new Date()); // Local time is fine for current month navigation
  const [cards, setCards] = useState<TKanbanCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<PostingChannel[]>([]);

  const fetchCardsForMonth = async (month: number, year: number) => {
    if (!boardId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/kanban/calendar?boardId=${boardId}&month=${month}&year=${year}`);
      const data = await res.json();
      if (data.cards) {
        setCards(data.cards);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // JS getMonth() is 0-indexed, so we add 1 for our API
    fetchCardsForMonth(currentDate.getMonth() + 1, currentDate.getFullYear());
  }, [currentDate.getMonth(), currentDate.getFullYear(), boardId]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const toggleChannelFilter = (channel: PostingChannel) => {
    setSelectedChannels(prev => 
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  // Filter cards based on selected channels
  const filteredCards = useMemo(() => {
    if (selectedChannels.length === 0) return cards;
    return cards.filter(card => {
      if (!card.postingChannels || card.postingChannels.length === 0) return false;
      // Show card if it has ANY of the selected channels
      return card.postingChannels.some(c => selectedChannels.includes(c as PostingChannel));
    });
  }, [cards, selectedChannels]);

  // Map cards to their Bangkok day of the month
  const cardsByDay = useMemo(() => {
    const map = new Map<number, TKanbanCard[]>();
    filteredCards.forEach(card => {
      if (!card.scheduledPostDate) return;
      const { day, month, year } = getBangkokDateParts(card.scheduledPostDate);
      // Only include cards that match the currently viewed month and year
      if (month === currentDate.getMonth() + 1 && year === currentDate.getFullYear()) {
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(card);
      }
    });
    return map;
  }, [filteredCards, currentDate]);

  // Calendar Grid Logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sunday, 1 = Monday
  const monthName = currentDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' });

  const renderCellCards = (day: number) => {
    const dayCards = cardsByDay.get(day) || [];
    if (dayCards.length === 0) return null;

    const maxDisplay = 3;
    const displayedCards = dayCards.slice(0, maxDisplay);
    const hiddenCount = dayCards.length - maxDisplay;

    return (
      <div className="flex flex-col gap-1 mt-1">
        {displayedCards.map(card => {
          const colorClass = getUserColorClass(card.assignedToId);
          const assignee = users.find(u => u.id === card.assignedToId);
          
          return (
            <div 
              key={card.id} 
              className={`text-[10px] sm:text-xs truncate rounded px-1.5 py-1 border flex items-center justify-between group ${colorClass}`}
              title={`${card.title}${assignee ? ` (ผู้รับผิดชอบ: ${assignee.fullName})` : ''}`}
            >
              <span className="truncate flex-1 font-medium">{card.title}</span>
            {card.postingChannels && card.postingChannels.length > 0 && (
              <span className="shrink-0 flex gap-0.5 ml-1">
                {card.postingChannels.slice(0, 2).map(c => (
                  <span key={c} className="bg-white rounded-[2px] px-[3px] shadow-sm text-[8px] font-bold">
                    {c.substring(0, 1)}
                  </span>
                ))}
              </span>
            )}
            </div>
          );
        })}
        {hiddenCount > 0 && (
          <div className="text-[10px] text-gray-500 text-center font-medium mt-0.5 bg-gray-50 rounded">
            +{hiddenCount} งาน
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white m-6 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50 gap-4">
        
        {/* Month Navigation */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-gray-800 min-w-[160px] text-center">{monthName}</h2>
          <button 
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Channel Filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2 hidden md:inline">ตัวกรอง:</span>
          {POSTING_CHANNELS.map(channel => {
            const isSelected = selectedChannels.includes(channel);
            return (
              <button
                key={channel}
                onClick={() => toggleChannelFilter(channel)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  isSelected 
                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' 
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {channel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        )}
        
        <div className="min-w-[800px] h-full flex flex-col">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 shrink-0">
            {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map(day => (
              <div key={day} className="py-2 text-center text-xs font-bold text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="flex-1 grid grid-cols-7 auto-rows-fr">
            {/* Empty cells for padding start of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-start-${i}`} className="border-r border-b border-gray-100 bg-gray-50/30 p-2 min-h-[120px]" />
            ))}

            {/* Actual Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = 
                day === new Date().getDate() && 
                currentDate.getMonth() === new Date().getMonth() && 
                currentDate.getFullYear() === new Date().getFullYear();

              return (
                <div key={`day-${day}`} className={`border-r border-b border-gray-100 p-2 min-h-[120px] transition-colors hover:bg-gray-50/50 ${isToday ? 'bg-blue-50/30' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-500 text-white' : 'text-gray-700'}`}>
                      {day}
                    </span>
                  </div>
                  {renderCellCards(day)}
                </div>
              );
            })}

            {/* Empty cells for padding end of month */}
            {Array.from({ length: (42 - (firstDayOfMonth + daysInMonth)) % 7 }).map((_, i) => (
              <div key={`empty-end-${i}`} className="border-r border-b border-gray-100 bg-gray-50/30 p-2 min-h-[120px]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
