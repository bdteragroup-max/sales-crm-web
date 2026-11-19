"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { Loader2, Plus, KanbanSquare, PanelRightClose, PanelRightOpen, Filter, Activity, X, Check, RefreshCw, AlertCircle } from 'lucide-react';
import KanbanList from '@/app/marketing/kanban/KanbanList';
import KanbanCard from '@/app/marketing/kanban/KanbanCard';
import CardModal from '@/app/marketing/kanban/CardModal';
import CalendarViewClient from '@/app/marketing/kanban/CalendarViewClient';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  TKanbanCard,
  TKanbanList,
  TKanbanBoard,
  TKanbanUser,
  TKanbanActivityLog,
  TDragOriginMeta,
  applyCrossListDragOver,
  computeCardDropResult,
  getErrorMessage,
  isCardVisibleWithFilters,
  isPointerBelowRect,
  kanbanCardCollisionDetection,
  moveArrayItem,
  revertFailedCardMove,
} from './kanbanDndHelpers';

export type { TKanbanCard, TKanbanList };

export default function KanbanBoardClient({ 
  currentUser,
  initialBoard,
  initialUsers
}: { 
  currentUser: TKanbanUser | null;
  initialBoard?: TKanbanBoard | null;
  initialUsers?: TKanbanUser[];
}) {
  const [board, setBoard] = useState<TKanbanBoard | null>(initialBoard || null);
  const [lists, setLists] = useState<TKanbanList[]>(initialBoard?.lists || []);
  const listsRef = useRef<TKanbanList[]>(initialBoard?.lists || []);
  const lastSyncedBoardRef = useRef<TKanbanBoard | null | undefined>(initialBoard);
  const pendingMutationsRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [users, setUsers] = useState<TKanbanUser[]>(initialUsers || []);
  const [loading, setLoading] = useState(!initialBoard);
  const [isRefreshingBoard, setIsRefreshingBoard] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'board' | 'calendar'>('board');

  const [activeCard, setActiveCard] = useState<TKanbanCard | null>(null);
  const [activeList, setActiveList] = useState<TKanbanList | null>(null);

  useEffect(() => {
    listsRef.current = lists;
  }, [lists]);

  const dragStateRef = useRef<TDragOriginMeta | null>(null);

  const updateLists = useCallback(
    (updater: TKanbanList[] | ((prev: TKanbanList[]) => TKanbanList[])) => {
      setLists((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        listsRef.current = next;
        return next;
      });
    },
    []
  );

  useEffect(() => {
    if (!initialBoard || initialBoard === lastSyncedBoardRef.current) return;
    lastSyncedBoardRef.current = initialBoard;
    if (!isDraggingRef.current && pendingMutationsRef.current === 0) {
      setBoard(initialBoard);
      updateLists(initialBoard.lists || []);
    }
  }, [initialBoard, updateLists]);

  const showBoardError = useCallback((msg: string) => {
    setActionError(msg);
  }, []);

  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 5000);
    return () => clearTimeout(t);
  }, [actionError]);

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

  const fetchBoard = useCallback(async (isSilent = false) => {
    try {
      setLoadError(null);
      if (isSilent) setIsRefreshingBoard(true);
      const res = await fetch('/api/marketing/kanban/boards', { cache: 'no-store' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch board');
      }
      const data = await res.json();
      if (data.board) {
        setBoard(data.board);
        updateLists(data.board.lists || []);
      }
      if (data.users) {
        setUsers(data.users || []);
      }
    } catch (error: unknown) {
      console.error(error);
      const errMsg = getErrorMessage(error, 'เกิดข้อผิดพลาดในการโหลดข้อมูลบอร์ด');
      if (isSilent) {
        showBoardError(getErrorMessage(error, 'รีเฟรชข้อมูลบอร์ดไม่สำเร็จ'));
      } else {
        setLoadError(errMsg);
      }
    } finally {
      setLoading(false);
      setIsRefreshingBoard(false);
    }
  }, [showBoardError, updateLists]);

  useEffect(() => {
    if (initialBoard) return;
    let cancelled = false;
    fetch('/api/marketing/kanban/boards', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to fetch board');
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.board) {
          setBoard(data.board);
          updateLists(data.board.lists || []);
        }
        if (data.users) {
          setUsers(data.users || []);
        }
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) {
          setLoadError(getErrorMessage(error, 'เกิดข้อผิดพลาดในการโหลดข้อมูลบอร์ด'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialBoard, updateLists]);

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

  const filteredLists = useMemo(() => {
    const filters = { showCompleted, filterAssignee, filterLabel };
    return lists.map((list) => ({
      ...list,
      cards: list.cards.filter((card) => isCardVisibleWithFilters(card, filters)),
    }));
  }, [lists, showCompleted, filterAssignee, filterLabel]);

  const visibleCardIdsByList = useMemo(() => {
    const map = new Map<string, Set<string>>();
    filteredLists.forEach((l) => {
      map.set(l.id, new Set(l.cards.map((c) => c.id)));
    });
    return map;
  }, [filteredLists]);

  const listIds = useMemo(() => lists.map((l) => l.id), [lists]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const id = String(active.id);
    const snapshot = listsRef.current.map((l) => ({ ...l, cards: [...l.cards] }));

    const listIdx = listsRef.current.findIndex((l) => l.id === id);
    if (listIdx !== -1) {
      isDraggingRef.current = true;
      dragStateRef.current = {
        type: 'List',
        activeId: id,
        originIndex: listIdx,
        originLists: snapshot,
      };
      setActiveList(listsRef.current[listIdx]);
      setActiveCard(null);
      return;
    }

    for (const l of listsRef.current) {
      const cIdx = l.cards.findIndex((c) => c.id === id);
      if (cIdx !== -1) {
        isDraggingRef.current = true;
        dragStateRef.current = {
          type: 'Card',
          activeId: id,
          originListId: l.id,
          originIndex: cIdx,
          originCard: { ...l.cards[cIdx] },
          originLists: snapshot,
        };
        setActiveCard(l.cards[cIdx]);
        setActiveList(null);
        return;
      }
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;

      if (active.data?.current?.type !== 'Card') return;

      const isOverCard = over.data?.current?.type === 'Card';
      const isOverList = over.data?.current?.type === 'List';
      const isBelowOverItem = isPointerBelowRect(
        active.rect.current.translated,
        over.rect
      );

      updateLists((prev) => {
        const res = applyCrossListDragOver(prev, {
          activeId,
          overId,
          isOverList,
          isOverCard,
          isBelowOverItem,
        });
        return res.changed ? res.lists : prev;
      });
    },
    [updateLists]
  );

  const handleDragCancel = useCallback(() => {
    isDraggingRef.current = false;
    setActiveCard(null);
    setActiveList(null);
    const dragMeta = dragStateRef.current;
    dragStateRef.current = null;
    if (dragMeta) {
      updateLists((prev) => revertFailedCardMove(prev, dragMeta));
    }
  }, [updateLists]);

  const handleDragEnd = async (event: DragEndEvent) => {
    isDraggingRef.current = false;
    setActiveCard(null);
    setActiveList(null);

    const dragMeta = dragStateRef.current;
    dragStateRef.current = null;

    const { active, over } = event;
    const activeId = String(active.id);

    if (!dragMeta) return;

    // Handle List Reordering & persist to DB
    if (dragMeta.type === 'List') {
      if (!over || activeId === String(over.id)) return;
      const overId = String(over.id);
      const currLists = listsRef.current;
      const oldIndex = currLists.findIndex((l) => l.id === activeId);
      const newIndex = currLists.findIndex((l) => l.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reorderedLists = moveArrayItem(currLists, oldIndex, newIndex).map((l, idx) => ({
        ...l,
        position: (idx + 1) * 1000,
      }));
      updateLists(reorderedLists);

      pendingMutationsRef.current += 1;
      try {
        const res = await fetch('/api/marketing/kanban/lists', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedListIds: reorderedLists.map((l) => l.id) }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'ย้ายลำดับรายการไม่สำเร็จ');
        }
      } catch (e: unknown) {
        console.error('Failed to save list reorder', e);
        updateLists(dragMeta.originLists);
        showBoardError(getErrorMessage(e, 'ย้ายลำดับคอลัมน์ไม่สำเร็จ ระบบคืนค่าเดิมให้แล้ว'));
      } finally {
        pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
      }
      return;
    }

    // Drag dropped outside any valid droppable: rollback optimistic dragOver move
    if (!over) {
      updateLists((prev) => revertFailedCardMove(prev, dragMeta));
      return;
    }

    const overId = String(over.id);
    const dropResult = computeCardDropResult({
      currentLists: listsRef.current,
      dragMeta,
      activeId,
      overId,
      isOverList: over.data?.current?.type === 'List',
      isOverCard: over.data?.current?.type === 'Card',
      isBelowOverItem: isPointerBelowRect(active.rect.current.translated, over.rect),
      overCardListId: over.data?.current?.card?.listId,
      visibleCardIdsByList,
    });

    if (!dropResult) {
      updateLists((prev) => revertFailedCardMove(prev, dragMeta));
      return;
    }

    updateLists(dropResult.nextLists);

    pendingMutationsRef.current += 1;
    try {
      const res = await fetch('/api/marketing/kanban/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeId,
          listId: dropResult.targetListId,
          position: dropResult.newPosition,
          orderedCardIds: dropResult.orderedCardIds,
        }),
      });
      const saved = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(saved.error || `บันทึกการย้ายการ์ดไม่สำเร็จ (HTTP ${res.status})`);
      }

      const posMap =
        saved.listPositions && typeof saved.listPositions === 'object'
          ? (saved.listPositions as Record<string, number>)
          : null;

      updateLists((prev) =>
        prev.map((l) => {
          if (l.id !== dropResult.targetListId) return l;
          return {
            ...l,
            cards: l.cards
              .map((c) => {
                let updatedCard =
                  c.id === activeId && saved?.id
                    ? { ...c, ...saved, listId: dropResult.targetListId }
                    : c;
                if (posMap && posMap[updatedCard.id] !== undefined) {
                  updatedCard = { ...updatedCard, position: posMap[updatedCard.id] };
                }
                return updatedCard;
              })
              .sort((a, b) => a.position - b.position),
          };
        })
      );
    } catch (e: unknown) {
      console.error('Failed to save card move', e);
      updateLists((prev) => revertFailedCardMove(prev, dragMeta));
      showBoardError(getErrorMessage(e, 'ย้ายงานไม่สำเร็จ ระบบคืนตำแหน่งเดิมให้แล้ว'));
    } finally {
      pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
    }
  };

  const handleAddCard = useCallback(async (listId: string, title: string) => {
    pendingMutationsRef.current += 1;
    try {
      const res = await fetch('/api/marketing/kanban/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, title })
      });
      const newCard = await res.json().catch(() => ({}));
      if (!res.ok || !newCard?.id) {
        throw new Error(newCard?.error || 'เพิ่มงานใหม่ไม่สำเร็จ');
      }

      updateLists((prev) =>
        prev.map((list) => {
          if (list.id === listId) {
            return { ...list, cards: [...list.cards, newCard] };
          }
          return list;
        })
      );
    } catch (e: unknown) {
      console.error(e);
      showBoardError(getErrorMessage(e, 'เพิ่มงานใหม่ไม่สำเร็จ'));
    } finally {
      pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
    }
  }, [showBoardError, updateLists]);

  const handleUpdateList = useCallback(async (listId: string, updates: Partial<TKanbanList>) => {
    const prevLists = listsRef.current;
    updateLists((prev) => prev.map((l) => (l.id === listId ? { ...l, ...updates } : l)));
    pendingMutationsRef.current += 1;
    try {
      const res = await fetch('/api/marketing/kanban/lists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: listId, ...updates })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'อัปเดตรายการไม่สำเร็จ');
      }
    } catch (e: unknown) {
      console.error(e);
      updateLists(prevLists);
      showBoardError(getErrorMessage(e, 'อัปเดตรายการไม่สำเร็จ'));
    } finally {
      pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
    }
  }, [showBoardError, updateLists]);

  const executeDeleteList = async () => {
    if (!listToDelete) return;
    const listId = listToDelete.id;
    pendingMutationsRef.current += 1;
    try {
      const res = await fetch(`/api/marketing/kanban/lists?id=${listId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'ลบรายการไม่สำเร็จ');
      }
      updateLists((prev) => prev.filter((l) => l.id !== listId));
      setListToDelete(null);
    } catch (e: unknown) {
      console.error(e);
      showBoardError(getErrorMessage(e, 'ลบรายการไม่สำเร็จ'));
    } finally {
      pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
    }
  };

  const handleAddList = async () => {
    if (!board) return;
    if (!newListTitle.trim()) return;

    pendingMutationsRef.current += 1;
    try {
      const res = await fetch('/api/marketing/kanban/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: board.id, name: newListTitle.trim() })
      });
      const newList = await res.json().catch(() => ({}));
      if (!res.ok || !newList?.id) {
        throw new Error(newList?.error || 'เพิ่มรายการใหม่ไม่สำเร็จ');
      }
      updateLists((prev) => [...prev, newList]);
      setNewListTitle('');
      setIsAddingList(false);
    } catch (e: unknown) {
      console.error(e);
      showBoardError(getErrorMessage(e, 'เพิ่มรายการใหม่ไม่สำเร็จ'));
    } finally {
      pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
    }
  };

  const handleCardUpdate = useCallback((updatedCard: TKanbanCard & { listPositions?: Record<string, number> }) => {
    if (!updatedCard?.id) return;
    const { listPositions, ...cardData } = updatedCard;

    updateLists((prev) =>
      prev.map((list) => {
        const cardExists = list.cards.some((c) => c.id === cardData.id);
        let nextCards = list.cards;

        if (cardExists && list.id === cardData.listId) {
          nextCards = list.cards.map((c) => (c.id === cardData.id ? cardData : c));
        } else if (cardExists && list.id !== cardData.listId) {
          nextCards = list.cards.filter((c) => c.id !== cardData.id);
        } else if (!cardExists && list.id === cardData.listId) {
          nextCards = [...list.cards, cardData];
        }

        if (list.id === cardData.listId && listPositions) {
          nextCards = nextCards.map((c) =>
            listPositions[c.id] !== undefined ? { ...c, position: listPositions[c.id] } : c
          );
        }

        if (nextCards !== list.cards) {
          nextCards = [...nextCards].sort((a, b) => a.position - b.position);
        }

        return nextCards !== list.cards ? { ...list, cards: nextCards } : list;
      })
    );

    setEditingCard((prev) => (prev && prev.id === cardData.id ? cardData : prev));
  }, [updateLists]);

  const handleDeleteCard = useCallback((cardId: string) => {
    updateLists((prevLists) =>
      prevLists.map((list) => ({
        ...list,
        cards: list.cards.filter((c) => c.id !== cardId),
      }))
    );
    setEditingCard(null);
  }, [updateLists]);

  const handleCompleteCard = useCallback(async (cardId: string, isCompleted: boolean) => {
    const prevLists = listsRef.current;
    updateLists((prev) =>
      prev.map((list) => ({
        ...list,
        cards: list.cards.map((c) => (c.id === cardId ? { ...c, isCompleted } : c)),
      }))
    );
    pendingMutationsRef.current += 1;
    try {
      const res = await fetch('/api/marketing/kanban/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cardId, isCompleted })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'อัปเดตสถานะงานไม่สำเร็จ');
      }
    } catch (e: unknown) {
      console.error("Failed to update card completion", e);
      updateLists(prevLists);
      showBoardError(getErrorMessage(e, 'อัปเดตสถานะงานไม่สำเร็จ'));
    } finally {
      pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
    }
  }, [showBoardError, updateLists]);

  const handleOpenCardModal = useCallback((card: TKanbanCard) => {
    const latest = listsRef.current.flatMap((l) => l.cards).find((c) => c.id === card.id) || card;
    setEditingCard(latest);
  }, []);

  const handleRequestDeleteList = useCallback((id: string) => {
    setListToDelete(listsRef.current.find((l) => l.id === id) || null);
  }, []);
  const allActivities = React.useMemo(() => {
    const acts: TKanbanActivityLog[] = [];
    lists.forEach(list => {
      list.cards.forEach(card => {
        if (card.activityLogs) {
          card.activityLogs.forEach((log) => {
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
    
    const sortedUsers = [...users]
      .filter((u): u is TKanbanUser & { fullName: string } => Boolean(u.fullName))
      .sort((a, b) => b.fullName.length - a.fullName.length);
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
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-[#ff2301]" size={40} />
        <p className="text-sm font-semibold text-gray-500">กำลังโหลดข้อมูลกระดานการตลาด...</p>
      </div>
    );
  }

  if (loadError && !board) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-xl">
          !
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">ไม่สามารถโหลดข้อมูลกระดานได้</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-md">{loadError}</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchBoard();
          }}
          className="px-4 py-2 bg-[#ff2301] hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
        >
          ลองใหม่อีกครั้ง (Retry)
        </button>
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
          <div className="min-w-0 flex items-center gap-4">
            <h1 className="font-bold text-base md:text-lg text-gray-900 tracking-tight truncate">{board?.name || 'กระดานการตลาด (Marketing Board)'}</h1>
            
            <div className="hidden sm:flex bg-gray-100 p-1 rounded-xl items-center">
              <button 
                onClick={() => setViewType('board')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${viewType === 'board' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <KanbanSquare size={16} /> บอร์ด
              </button>
              <button 
                onClick={() => setViewType('calendar')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${viewType === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <CalendarIcon size={16} /> ปฏิทิน
              </button>
            </div>
            <p className="text-[10px] md:text-xs text-gray-500 font-medium truncate">ระบบจัดการงาน (Task Management System)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchBoard(true)}
            disabled={isRefreshingBoard}
            title="รีเฟรชข้อมูลบอร์ดล่าสุด"
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={isRefreshingBoard ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSidebarOpen ? 'bg-red-50 text-[#ff2301]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
          >
            {isSidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
          </button>
        </div>
      </header>

      {actionError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 flex items-center justify-between gap-3 text-xs font-bold text-red-700 z-10">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {viewType === 'calendar' ? (
          <CalendarViewClient 
            boardId={board?.id} 
            users={users} 
            lists={lists} 
            currentUser={currentUser} 
            onUpdateCard={handleCardUpdate}
            onCardClick={handleOpenCardModal}
          />
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar transition-all duration-300">
            <DndContext
              id="marketing-kanban-dnd"
              sensors={sensors}
              collisionDetection={kanbanCardCollisionDetection}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="flex gap-6 h-full items-start">
                <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
                  {filteredLists.map((filteredList) => (
                    <KanbanList
                      key={filteredList.id}
                      list={filteredList}
                      users={users}
                      onAddCard={handleAddCard}
                      onCardClick={handleOpenCardModal}
                      onUpdateList={handleUpdateList}
                      onDeleteList={handleRequestDeleteList}
                      onCompleteCard={handleCompleteCard}
                    />
                  ))}
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
              <DragOverlay dropAnimation={null}>
                {activeCard ? (
                  <KanbanCard
                    card={activeCard}
                    users={users}
                    onClick={() => {}}
                    isOverlay
                  />
                ) : activeList ? (
                  <KanbanList
                    list={filteredLists.find((l) => l.id === activeList.id) || activeList}
                    users={users}
                    onAddCard={() => {}}
                    onCardClick={() => {}}
                    isOverlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

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
                              <span className="font-semibold">{user?.fullName ? user.fullName.split(' ')[0] : 'ระบบ'}</span>
                              {' '}
                              {(() => {
                                const act = (log.actionType || '').toUpperCase();
                                if (act === 'CREATE' || act === 'CREATED') return 'สร้างงาน';
                                if (act === 'MOVE' || act === 'MOVED') return 'ย้ายงาน';
                                if (act === 'UPDATE' || act === 'STATUS_CHANGE') return 'อัปเดตงาน';
                                if (act === 'COMMENT' || act === 'COMMENTED') return 'แสดงความเห็น';
                                if (act === 'UPLOAD' || act === 'ATTACHED') return 'อัปโหลดไฟล์';
                                if (act === 'DELETE' || act === 'DELETED ATTACHMENT') return 'ลบข้อมูล';
                                return log.actionType;
                              })()}
                              {' '}
                              <span className="font-medium text-gray-600">&ldquo;{log.cardTitle}&rdquo;</span>
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
          key={editingCard.id}
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
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการ <span className="font-semibold text-gray-900">&ldquo;{listToDelete.name}&rdquo;</span>?
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
