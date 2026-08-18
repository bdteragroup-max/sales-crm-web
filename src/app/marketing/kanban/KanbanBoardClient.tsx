"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  Active,
  Over
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { Loader2, Plus, KanbanSquare, PanelRightClose, PanelRightOpen, Filter, Activity, X, Check } from 'lucide-react';
import KanbanList from '@/app/marketing/kanban/KanbanList';
import CardModal from '@/app/marketing/kanban/CardModal';

// Types based on Prisma schema
export type TKanbanCard = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  assignedToId: string | null;
  startDate: string | null;
  dueDate: string | null;
  revisionStatus: string | null;
  position: number;
  checklist: any | null;
  color?: string | null;
  engineeringReviewers?: string[];
  attachments: any[];
  comments: any[];
  activityLogs: any[];
  isCompleted?: boolean;
  salespersonId?: string | null;
};

export type TKanbanList = {
  id: string;
  boardId: string;
  name: string;
  position: number;
  color?: string | null;
  cards: TKanbanCard[];
};

export default function KanbanBoardClient({ currentUser }: { currentUser: any }) {
  const [board, setBoard] = useState<any>(null);
  const [lists, setLists] = useState<TKanbanList[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCard, setActiveCard] = useState<TKanbanCard | null>(null);
  const [activeList, setActiveList] = useState<TKanbanList | null>(null);

  // For Card Modal
  const [editingCard, setEditingCard] = useState<TKanbanCard | null>(null);

  // For List Delete Modal
  const [listToDelete, setListToDelete] = useState<TKanbanList | null>(null);

  // For Add List
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  // For Sidebar & Filters
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'filters' | 'activity'>('filters');
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch('/api/marketing/kanban/boards');
      if (!res.ok) throw new Error('Failed to fetch board');
      const data = await res.json();
      setBoard(data.board);
      setLists(data.board.lists || []);
      setUsers(data.users || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Trigger resize event for dnd-kit when sidebar opens/closes to recalculate droppables
  useEffect(() => {
    const timeout = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 310); // slightly longer than the 300ms transition
    return () => clearTimeout(timeout);
  }, [isSidebarOpen]);

  const pointerSensorOptions = React.useMemo(() => ({
    activationConstraint: {
      distance: 5,
    },
  }), []);

  const keyboardSensorOptions = React.useMemo(() => ({
    coordinateGetter: sortableKeyboardCoordinates,
  }), []);

  const sensors = useSensors(
    useSensor(PointerSensor, pointerSensorOptions),
    useSensor(KeyboardSensor, keyboardSensorOptions)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const { id } = active;

    // Find if we're dragging a list or a card
    const list = lists.find((l) => l.id === id);
    if (list) {
      setActiveList(list);
      return;
    }

    const card = lists.flatMap((l) => l.cards).find((c) => c.id === id);
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // Are we dragging a card?
    const isActiveCard = active.data?.current?.type === 'Card';
    const isOverCard = over.data?.current?.type === 'Card';
    const isOverList = over.data?.current?.type === 'List';

    if (!isActiveCard) return;

    setLists((prev) => {
      const activeListIndex = prev.findIndex((l) => l.cards.some((c) => c.id === activeId));
      const overListIndex = isOverList
        ? prev.findIndex((l) => l.id === overId)
        : prev.findIndex((l) => l.cards.some((c) => c.id === overId));

      if (activeListIndex === -1 || overListIndex === -1) return prev;

      const activeList = prev[activeListIndex];
      const overList = prev[overListIndex];

      const activeCardIndex = activeList.cards.findIndex((c) => c.id === activeId);

      // If moving within the same list, handle in DragEnd
      if (activeList.id === overList.id) {
        return prev;
      }

      // Moving to a different list (optimistic UI update during drag over)
      const overCardIndex = isOverCard
        ? overList.cards.findIndex((c) => c.id === overId)
        : overList.cards.length;

      const newLists = [...prev];
      const newActiveCards = [...activeList.cards];
      const [movedCard] = newActiveCards.splice(activeCardIndex, 1);

      // Mutate the dragged card to conceptually belong to the new list immediately for UI
      movedCard.listId = overList.id;

      const newOverCards = [...overList.cards];
      newOverCards.splice(overCardIndex, 0, movedCard);

      newLists[activeListIndex] = { ...activeList, cards: newActiveCards };
      newLists[overListIndex] = { ...overList, cards: newOverCards };

      return newLists;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    setActiveList(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const isActiveList = active.data?.current?.type === 'List';

    // Handle List Reordering (omitted API call for brevity in MVP, but state updates)
    if (isActiveList) {
      setLists((prev) => {
        const oldIndex = prev.findIndex((l) => l.id === activeId);
        const newIndex = prev.findIndex((l) => l.id === overId);
        return arrayMove(prev, oldIndex, newIndex);
      });
      return;
    }

    // Handle Card Reordering
    const isActiveCard = active.data?.current?.type === 'Card';
    if (!isActiveCard) return;

    // Find final lists
    const activeListIndex = lists.findIndex((l) => l.cards.some((c) => c.id === activeId));
    let overListIndex = lists.findIndex((l) => l.cards.some((c) => c.id === overId));
    if (overListIndex === -1) {
      overListIndex = lists.findIndex((l) => l.id === overId);
    }

    if (activeListIndex === -1 || overListIndex === -1) return;

    const activeListObj = lists[activeListIndex];
    const overListObj = lists[overListIndex];

    const oldIndex = activeListObj.cards.findIndex((c) => c.id === activeId);
    const newIndex = overListObj.cards.findIndex((c) => c.id === overId);

    let newPosition = 1000;

    // Calculate new position float
    if (activeListObj.id === overListObj.id) {
      // Same list reorder
      const reorderedCards = arrayMove(activeListObj.cards, oldIndex, newIndex);
      const prevCard = reorderedCards[newIndex - 1];
      const nextCard = reorderedCards[newIndex + 1];

      if (prevCard && nextCard) {
        newPosition = (prevCard.position + nextCard.position) / 2;
      } else if (prevCard) {
        newPosition = prevCard.position + 1000;
      } else if (nextCard) {
        newPosition = nextCard.position / 2;
      }

      setLists((prev) => {
        const updatedLists = [...prev];
        updatedLists[activeListIndex] = {
          ...activeListObj,
          cards: reorderedCards.map(c => c.id === activeId ? { ...c, position: newPosition } : c)
        };
        return updatedLists;
      });
    } else {
      // Different list move - already partially handled in dragOver for UI, but let's recalculate position
      const prevCard = overListObj.cards[newIndex - 1];
      const nextCard = overListObj.cards[newIndex + 1];

      if (prevCard && nextCard) {
        newPosition = (prevCard.position + nextCard.position) / 2;
      } else if (prevCard) {
        newPosition = prevCard.position + 1000;
      } else if (nextCard) {
        newPosition = nextCard.position / 2;
      } else if (overListObj.cards.length > 0) {
        // It was dropped on the list itself or an empty list
        newPosition = 1000;
      }

      setLists((prev) => {
        const newLists = [...prev];
        const cList = newLists[overListIndex];
        cList.cards = cList.cards.map(c => c.id === activeId ? { ...c, position: newPosition, listId: overListObj.id } : c);
        // Sort cards by position just in case
        cList.cards.sort((a, b) => a.position - b.position);
        return newLists;
      });
    }

    // Call API to persist
    try {
      await fetch('/api/marketing/kanban/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeId,
          listId: overListObj.id,
          position: newPosition
        })
      });
    } catch (e) {
      console.error("Failed to save card move", e);
    }
  };

  const handleAddCard = async (listId: string, title: string) => {
    try {
      const res = await fetch('/api/marketing/kanban/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, title })
      });
      const newCard = await res.json();

      setLists(prev => prev.map(list => {
        if (list.id === listId) {
          return { ...list, cards: [...list.cards, newCard] };
        }
        return list;
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateList = async (listId: string, updates: Partial<TKanbanList>) => {
    try {
      const res = await fetch('/api/marketing/kanban/lists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: listId, ...updates })
      });
      if (res.ok) {
        setLists(prev => prev.map(l => l.id === listId ? { ...l, ...updates } : l));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const executeDeleteList = async () => {
    if (!listToDelete) return;
    const listId = listToDelete.id;
    try {
      const res = await fetch(`/api/marketing/kanban/lists?id=${listId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setLists(prev => prev.filter(l => l.id !== listId));
        setListToDelete(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddList = async () => {
    if (!board) return;
    if (!newListTitle.trim()) return;

    try {
      const res = await fetch('/api/marketing/kanban/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: board.id, name: newListTitle.trim() })
      });
      if (res.ok) {
        const newList = await res.json();
        setLists([...lists, newList]);
        setNewListTitle('');
        setIsAddingList(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCardUpdate = (updatedCard: TKanbanCard) => {
    setLists(prev => prev.map(list => {
      const cardExists = list.cards.some(c => c.id === updatedCard.id);
      if (cardExists && list.id === updatedCard.listId) {
        return {
          ...list,
          cards: list.cards.map(c => c.id === updatedCard.id ? updatedCard : c)
        };
      } else if (cardExists && list.id !== updatedCard.listId) {
        return {
          ...list,
          cards: list.cards.filter(c => c.id !== updatedCard.id)
        };
      } else if (!cardExists && list.id === updatedCard.listId) {
        return {
          ...list,
          cards: [...list.cards, updatedCard].sort((a, b) => a.position - b.position)
        };
      }
      return list;
    }));
  };

  const handleDeleteCard = (cardId: string) => {
    setLists(prevLists => prevLists.map(list => ({
      ...list,
      cards: list.cards.filter(c => c.id !== cardId)
    })));
    setEditingCard(null);
  };

  const handleCompleteCard = async (cardId: string, isCompleted: boolean) => {
    setLists(prev => prev.map(list => ({
      ...list,
      cards: list.cards.map(c => c.id === cardId ? { ...c, isCompleted } : c)
    })));
    try {
      await fetch('/api/marketing/kanban/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cardId, isCompleted })
      });
    } catch (e) {
      console.error("Failed to update card completion", e);
    }
  };
  const allActivities = React.useMemo(() => {
    const acts: any[] = [];
    lists.forEach(list => {
      list.cards.forEach(card => {
        if (card.activityLogs) {
          card.activityLogs.forEach((log: any) => {
            acts.push({
              ...log,
              cardTitle: card.title
            });
          });
        }
      });
    });
    acts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return acts;
  }, [lists]);

  const renderCommentText = (text: string) => {
    if (!text) return null;
    if (!users || users.length === 0) return <span className="whitespace-pre-wrap">{text}</span>;
    
    const sortedUsers = [...users].filter(u => u.fullName).sort((a, b) => b.fullName.length - a.fullName.length);
    const namesRegexStr = sortedUsers.map(u => u.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    
    if (!namesRegexStr) return <span className="whitespace-pre-wrap">{text}</span>;
    
    const mentionRegex = new RegExp(`@(${namesRegexStr})`, 'g');
    const parts = text.split(mentionRegex);
    
    return parts.map((part, i) => {
      if (i % 2 === 1) {
         return <span key={i} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-semibold text-xs mx-0.5 inline-block">@{part}</span>;
      }
      return <span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#ff2301]" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8fafc]">
      <header className="flex-shrink-0 h-16 bg-white border-b px-6 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#ff2301]">
            <KanbanSquare size={20} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base md:text-lg text-gray-900 tracking-tight truncate">{board?.name || 'กระดานการตลาด (Marketing Board)'}</h1>
            <p className="text-[10px] md:text-xs text-gray-500 font-medium truncate">ระบบจัดการงาน (Task Management System)</p>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSidebarOpen ? 'bg-red-50 text-[#ff2301]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
        >
          {isSidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
        </button>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar transition-all duration-300">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 h-full items-start">
              <SortableContext items={lists.map(l => l.id)} strategy={horizontalListSortingStrategy}>
                {lists.map(list => {
                  const filteredList = {
                    ...list,
                    cards: list.cards.filter(card => {
                      if (!showCompleted && card.isCompleted) return false;
                      if (filterAssignee && card.assignedToId !== filterAssignee && !(card.engineeringReviewers || []).includes(filterAssignee)) return false;
                      // Mock label filter for revisionStatus
                      if (filterLabel === 'needs_revision' && card.revisionStatus !== 'needs_revision') return false;
                      if (filterLabel === 'pending_review' && card.revisionStatus !== 'pending_review') return false;
                      return true;
                    })
                  };
                  return (
                    <KanbanList
                      key={filteredList.id}
                      list={filteredList}
                      users={users}
                      onAddCard={handleAddCard}
                      onCardClick={(card: TKanbanCard) => setEditingCard(card)}
                      onUpdateList={handleUpdateList}
                      onDeleteList={(id: string) => setListToDelete(lists.find(l => l.id === id) || null)}
                      onCompleteCard={handleCompleteCard}
                    />
                  );
                })}
              </SortableContext>

              {/* Add List Button / Form */}
              {isAddingList ? (
                <div className="flex-shrink-0 w-72 bg-gray-100 rounded-2xl p-3 shadow-sm border border-gray-200 flex flex-col gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddList();
                      if (e.key === 'Escape') setIsAddingList(false);
                    }}
                    placeholder="ชื่อรายการใหม่ (New List Name)..."
                    className="w-full bg-white border-0 ring-1 ring-gray-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#ff2301] shadow-inner"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddList}
                      className="flex-1 bg-[#ff2301] hover:bg-red-600 text-white font-bold py-2 rounded-xl text-sm transition-colors shadow-sm"
                    >
                      บันทึก (Save)
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingList(false);
                        setNewListTitle('');
                      }}
                      className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 rounded-xl text-sm border border-gray-200 transition-colors shadow-sm"
                    >
                      ยกเลิก (Cancel)
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingList(true)}
                  className="flex-shrink-0 w-72 h-12 bg-gray-200/50 hover:bg-gray-200 rounded-xl flex items-center gap-2 px-4 text-gray-600 font-semibold transition-colors"
                >
                  <Plus size={18} />
                  เพิ่มรายการใหม่ (Add List)
                </button>
              )}
            </div>
          </DndContext>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="md:hidden absolute inset-0 bg-slate-900/40 z-10 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Right Sidebar */}
        <div
          className={`absolute top-0 right-0 bottom-0 z-20 md:relative flex-shrink-0 bg-white border-l transition-all duration-300 ease-in-out flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 translate-x-full border-transparent opacity-0'
            }`}
        >
          <div className="flex-1 min-w-[320px] max-w-[320px] flex flex-col h-full">
            <div className="h-14 border-b flex p-1 bg-gray-50/50">
              <button
                onClick={() => setSidebarTab('filters')}
                className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-colors ${sidebarTab === 'filters' ? 'bg-white shadow-sm text-gray-900 border border-gray-100' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Filter size={16} /> ตัวกรอง
              </button>
              <button
                onClick={() => setSidebarTab('activity')}
                className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-colors ${sidebarTab === 'activity' ? 'bg-white shadow-sm text-gray-900 border border-gray-100' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Activity size={16} /> กิจกรรม
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {sidebarTab === 'filters' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">ผู้รับผิดชอบ (Assignees)</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setFilterAssignee(null)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl border text-sm font-medium transition-all ${filterAssignee === null
                          ? 'border-[#ff2301] bg-red-50 text-[#ff2301]'
                          : 'border-transparent hover:bg-gray-50 text-gray-700'
                          }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                          A
                        </div>
                        ทุกคน (All)
                      </button>
                      {users.map(u => (
                        <button
                          key={u.id}
                          onClick={() => setFilterAssignee(u.id)}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl border text-sm font-medium transition-all text-left ${filterAssignee === u.id
                            ? 'border-[#ff2301] bg-red-50 text-[#ff2301]'
                            : 'border-transparent hover:bg-gray-50 text-gray-700'
                            }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-red-100 text-[#ff2301] flex items-center justify-center font-bold shrink-0">
                            {u.fullName?.charAt(0) || u.email?.charAt(0) || '?'}
                          </div>
                          <div className="truncate flex-1">
                            <div>{u.fullName}</div>
                            <div className="text-[10px] text-gray-400 font-normal truncate">{u.role}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">สถานะงาน (Status)</h3>
                    <button
                      onClick={() => setShowCompleted(!showCompleted)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl border text-sm font-medium transition-all text-left ${showCompleted
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${showCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                        {showCompleted && <Check size={12} strokeWidth={4} />}
                      </div>
                      <div className="flex-1">
                        แสดงงานที่ทำเสร็จแล้ว
                      </div>
                    </button>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">ป้ายกำกับ (Labels)</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFilterLabel(filterLabel === 'needs_revision' ? null : 'needs_revision')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${filterLabel === 'needs_revision'
                          ? 'bg-red-500 text-white border-red-600'
                          : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                          }`}
                      >
                        ต้องแก้ไขด่วน
                      </button>
                      <button
                        onClick={() => setFilterLabel(filterLabel === 'pending_review' ? null : 'pending_review')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${filterLabel === 'pending_review'
                          ? 'bg-orange-500 text-white border-orange-600'
                          : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'
                          }`}
                      >
                        รอตรวจทาน
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {sidebarTab === 'activity' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">ล่าสุด (Recent)</h3>

                  {allActivities.length === 0 ? (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <Activity size={14} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-800"><span className="font-semibold">ระบบ</span> เริ่มต้นกระดานนี้</p>
                        <p className="text-xs text-gray-400 mt-0.5">วันนี้</p>
                      </div>
                    </div>
                  ) : (
                    allActivities.map((log) => {
                      const user = users.find(u => u.id === log.userId);
                      return (
                        <div key={log.id} className="flex gap-3 group">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                            {user ? (user.fullName?.charAt(0) || user.email?.charAt(0) || '?') : 'S'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 break-words">
                              <span className="font-semibold">{user ? user.fullName.split(' ')[0] : 'ระบบ'}</span>
                              {' '}
                              {log.actionType === 'create' ? 'สร้างงาน' :
                                log.actionType === 'move' ? 'ย้ายงาน' :
                                  log.actionType === 'update' ? 'อัปเดตงาน' :
                                    log.actionType === 'comment' ? 'แสดงความเห็น' :
                                      log.actionType === 'upload' ? 'อัปโหลดไฟล์' :
                                        log.actionType === 'delete' ? 'ลบงาน' : log.actionType}
                              {' '}
                              <span className="font-medium text-gray-600">"{log.cardTitle}"</span>
                            </p>
                            {log.details && (
                              <p className="text-xs text-gray-500 mt-0.5 break-words bg-gray-50 p-1.5 rounded border border-gray-100">
                                {renderCommentText(log.details)}
                              </p>
                            )}
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(log.timestamp).toLocaleString('th-TH', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editingCard && (
        <CardModal
          card={editingCard}
          users={users}
          lists={lists}
          currentUser={currentUser}
          onClose={() => setEditingCard(null)}
          onUpdate={handleCardUpdate}
          onDeleteCard={handleDeleteCard}
        />
      )}

      {listToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden">
            <h3 className="text-lg font-bold text-gray-900 mb-2">ลบรายการ (Delete List)</h3>
            <p className="text-sm text-gray-600 mb-6">
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการ <span className="font-semibold text-gray-900">"{listToDelete.name}"</span>?
              งานทั้งหมดในรายการนี้จะถูกลบด้วยและไม่สามารถกู้คืนได้
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setListToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                onClick={executeDeleteList}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#ff2301] hover:bg-red-600 shadow-md shadow-red-200 transition-all"
              >
                ยืนยันการลบ (Delete)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
