"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  closestCorners,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
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
  arrayMove,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { Loader2, Plus, KanbanSquare, PanelRightClose, PanelRightOpen, Filter, Activity, X, Check, RefreshCw, AlertCircle } from 'lucide-react';
import KanbanList from '@/app/marketing/kanban/KanbanList';
import KanbanCard from '@/app/marketing/kanban/KanbanCard';
import CardModal from '@/app/marketing/kanban/CardModal';
import CalendarViewClient from '@/app/marketing/kanban/CalendarViewClient';
import { Calendar as CalendarIcon } from 'lucide-react';

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
  scheduledPostDate?: string | null;
  postingChannels?: string[];
};

export type TKanbanList = {
  id: string;
  boardId: string;
  name: string;
  position: number;
  color?: string | null;
  cards: TKanbanCard[];
};

export default function KanbanBoardClient({ 
  currentUser,
  initialBoard,
  initialUsers
}: { 
  currentUser: any;
  initialBoard?: any;
  initialUsers?: any[];
}) {
  const router = useRouter();
  const [prevInitialBoard, setPrevInitialBoard] = useState<any>(initialBoard);
  const [board, setBoard] = useState<any>(initialBoard || null);
  const [lists, setLists] = useState<TKanbanList[]>(initialBoard?.lists || []);
  const listsRef = useRef<TKanbanList[]>(initialBoard?.lists || []);
  const [users, setUsers] = useState<any[]>(initialUsers || []);
  const [loading, setLoading] = useState(!initialBoard);
  const [isRefreshingBoard, setIsRefreshingBoard] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'board' | 'calendar'>('board');

  const [activeCard, setActiveCard] = useState<TKanbanCard | null>(null);
  const [activeList, setActiveList] = useState<TKanbanList | null>(null);
  const isDragging = Boolean(activeCard || activeList);

  if (initialBoard && initialBoard !== prevInitialBoard) {
    setPrevInitialBoard(initialBoard);
    if (!isDragging) {
      setBoard(initialBoard);
      setLists(initialBoard.lists || []);
    }
  }

  useEffect(() => {
    listsRef.current = lists;
  }, [lists]);

  const dragStateRef = useRef<{
    type: 'Card' | 'List';
    activeId: string;
    originListId?: string;
    originIndex: number;
    originLists: TKanbanList[];
  } | null>(null);

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
    } catch (error: any) {
      console.error(error);
      if (isSilent) {
        showBoardError(error.message || 'รีเฟรชข้อมูลบอร์ดไม่สำเร็จ');
      } else {
        setLoadError(error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลบอร์ด');
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
      .catch((error: any) => {
        console.error(error);
        if (!cancelled) {
          setLoadError(error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลบอร์ด');
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

  const kanbanCollisionDetection: CollisionDetection = useCallback((args) => {
    const activeType = args.active?.data?.current?.type;

    if (activeType === 'List') {
      const listContainers = args.droppableContainers.filter(
        (c) => c.data?.current?.type === 'List'
      );
      return closestCenter({ ...args, droppableContainers: listContainers });
    }

    const pointerCollisions = pointerWithin(args);
    const intersections =
      pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);

    if (intersections.length > 0) {
      const containerById = new Map(args.droppableContainers.map((c) => [c.id, c]));

      const nonActiveCardHit = intersections.find((hit) => {
        const container = containerById.get(hit.id);
        return (
          container?.data?.current?.type === 'Card' &&
          hit.id !== args.active.id
        );
      });
      if (nonActiveCardHit) {
        return [nonActiveCardHit];
      }

      const listHit = intersections.find((hit) => {
        const container = containerById.get(hit.id);
        return container?.data?.current?.type === 'List';
      });

      if (listHit) {
        const targetListId = String(listHit.id);
        const cardContainersInList = args.droppableContainers.filter((c) => {
          if (c.data?.current?.type !== 'Card') return false;
          const card = c.data?.current?.card as TKanbanCard | undefined;
          return card?.listId === targetListId && c.id !== args.active.id;
        });

        if (cardContainersInList.length === 0) {
          return [listHit];
        }

        if (args.pointerCoordinates) {
          const pointerY = args.pointerCoordinates.y;
          const bottoms = cardContainersInList
            .map((c) => c.rect.current?.bottom)
            .filter((b): b is number => typeof b === 'number');
          const tops = cardContainersInList
            .map((c) => c.rect.current?.top)
            .filter((t): t is number => typeof t === 'number');

          if (bottoms.length > 0 && pointerY > Math.max(...bottoms)) {
            return [listHit];
          }
          if (tops.length > 0 && pointerY < Math.min(...tops)) {
            const topCard = cardContainersInList.reduce((best, curr) => {
              const bestTop = best.rect.current?.top ?? Infinity;
              const currTop = curr.rect.current?.top ?? Infinity;
              return currTop < bestTop ? curr : best;
            });
            return [{ id: topCard.id, data: { droppableContainer: topCard } }];
          }
        }

        return closestCorners({
          ...args,
          droppableContainers: cardContainersInList,
        });
      }

      const selfHit = intersections.find((hit) => hit.id === args.active.id);
      if (selfHit) {
        return [selfHit];
      }
    }

    return closestCorners(args);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = String(active.id);
    const snapshot = listsRef.current.map((l) => ({ ...l, cards: [...l.cards] }));

    const listIdx = listsRef.current.findIndex((l) => l.id === id);
    if (listIdx !== -1) {
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
        dragStateRef.current = {
          type: 'Card',
          activeId: id,
          originListId: l.id,
          originIndex: cIdx,
          originLists: snapshot,
        };
        setActiveCard(l.cards[cIdx]);
        setActiveList(null);
        return;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const isActiveCard = active.data?.current?.type === 'Card';
    if (!isActiveCard) return;

    const isOverCard = over.data?.current?.type === 'Card';
    const isOverList = over.data?.current?.type === 'List';

    updateLists((prev) => {
      const activeListIndex = prev.findIndex((l) => l.cards.some((c) => c.id === activeId));
      const overListIndex = isOverList
        ? prev.findIndex((l) => l.id === overId)
        : prev.findIndex((l) => l.cards.some((c) => c.id === overId));

      if (activeListIndex === -1 || overListIndex === -1) return prev;
      if (activeListIndex === overListIndex) return prev;

      const srcList = prev[activeListIndex];
      const dstList = prev[overListIndex];
      const activeCardIndex = srcList.cards.findIndex((c) => c.id === activeId);
      if (activeCardIndex === -1) return prev;

      const movedCard: TKanbanCard = {
        ...srcList.cards[activeCardIndex],
        listId: dstList.id,
      };

      const newSrcCards = srcList.cards.filter((_, i) => i !== activeCardIndex);
      let insertIndex = dstList.cards.length;

      if (isOverCard) {
        const overCardIndex = dstList.cards.findIndex((c) => c.id === overId);
        if (overCardIndex !== -1) {
          const isBelowOverItem =
            Boolean(active.rect.current.translated) &&
            active.rect.current.translated!.top > over.rect.top + over.rect.height / 2;
          insertIndex = isBelowOverItem ? overCardIndex + 1 : overCardIndex;
        }
      }

      const newDstCards = [...dstList.cards];
      newDstCards.splice(insertIndex, 0, movedCard);

      const nextLists = [...prev];
      nextLists[activeListIndex] = { ...srcList, cards: newSrcCards };
      nextLists[overListIndex] = { ...dstList, cards: newDstCards };
      return nextLists;
    });
  };

  const handleDragCancel = () => {
    setActiveCard(null);
    setActiveList(null);
    const dragMeta = dragStateRef.current;
    dragStateRef.current = null;
    if (dragMeta?.originLists) {
      updateLists(dragMeta.originLists);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
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

      const reorderedLists = arrayMove(currLists, oldIndex, newIndex).map((l, idx) => ({
        ...l,
        position: (idx + 1) * 1000,
      }));
      updateLists(reorderedLists);

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
        router.refresh();
      } catch (e: any) {
        console.error('Failed to save list reorder', e);
        updateLists(dragMeta.originLists);
        showBoardError(e?.message || 'ย้ายลำดับคอลัมน์ไม่สำเร็จ ระบบคืนค่าเดิมให้แล้ว');
      }
      return;
    }

    // Drag dropped outside any valid droppable: rollback optimistic dragOver move
    if (!over) {
      updateLists(dragMeta.originLists);
      return;
    }

    const overId = String(over.id);
    const currentLists = listsRef.current;
    const currentListIndex = currentLists.findIndex((l) =>
      l.cards.some((c) => c.id === activeId)
    );
    if (currentListIndex === -1) {
      updateLists(dragMeta.originLists);
      return;
    }

    // If overId === activeId, user dropped on the previewed slot created during handleDragOver
    let targetListIndex =
      overId === activeId
        ? currentListIndex
        : over.data?.current?.type === 'List'
        ? currentLists.findIndex((l) => l.id === overId)
        : currentLists.findIndex((l) => l.cards.some((c) => c.id === overId));

    if (targetListIndex === -1 && over.data?.current?.card?.listId) {
      targetListIndex = currentLists.findIndex(
        (l) => l.id === over.data?.current?.card?.listId
      );
    }

    if (targetListIndex === -1) {
      updateLists(dragMeta.originLists);
      return;
    }

    const sourceListObj = currentLists[currentListIndex];
    const targetListObj = currentLists[targetListIndex];
    const oldIndexInSource = sourceListObj.cards.findIndex((c) => c.id === activeId);
    if (oldIndexInSource === -1) {
      updateLists(dragMeta.originLists);
      return;
    }

    let finalTargetCards: TKanbanCard[];
    let finalCardIndex: number;

    if (sourceListObj.id === targetListObj.id) {
      if (overId === activeId || overId === targetListObj.id) {
        finalTargetCards = [...targetListObj.cards];
        finalCardIndex = oldIndexInSource;
      } else {
        const overIdx = targetListObj.cards.findIndex((c) => c.id === overId);
        if (overIdx === -1) {
          finalTargetCards = [...targetListObj.cards];
          finalCardIndex = oldIndexInSource;
        } else {
          finalTargetCards = arrayMove(targetListObj.cards, oldIndexInSource, overIdx);
          finalCardIndex = overIdx;
        }
      }
    } else {
      const movedCard: TKanbanCard = {
        ...sourceListObj.cards[oldIndexInSource],
        listId: targetListObj.id,
      };
      const isOverCard = over.data?.current?.type === 'Card';
      let insertIdx = targetListObj.cards.length;
      if (isOverCard) {
        const overIdx = targetListObj.cards.findIndex((c) => c.id === overId);
        if (overIdx !== -1) {
          const isBelowOverItem =
            Boolean(active.rect.current.translated) &&
            active.rect.current.translated!.top > over.rect.top + over.rect.height / 2;
          insertIdx = isBelowOverItem ? overIdx + 1 : overIdx;
        }
      }
      finalTargetCards = [...targetListObj.cards];
      finalTargetCards.splice(insertIdx, 0, movedCard);
      finalCardIndex = insertIdx;
    }

    // Skip save if card stayed in exact original list and index
    if (
      targetListObj.id === dragMeta.originListId &&
      finalCardIndex === dragMeta.originIndex
    ) {
      return;
    }

    // Compute clean position (rebalance locally if neighboring float gap < 2 or invalid)
    const prevCard = finalTargetCards[finalCardIndex - 1];
    const nextCard = finalTargetCards[finalCardIndex + 1];
    let newPosition = 1000;
    let shouldLocalRebalance = false;

    if (prevCard && nextCard) {
      const gap = nextCard.position - prevCard.position;
      if (!Number.isFinite(gap) || gap < 2 || prevCard.position <= 0) {
        shouldLocalRebalance = true;
      } else {
        newPosition = (prevCard.position + nextCard.position) / 2;
      }
    } else if (prevCard) {
      if (!Number.isFinite(prevCard.position) || prevCard.position <= 0) {
        shouldLocalRebalance = true;
      } else {
        newPosition = prevCard.position + 1000;
      }
    } else if (nextCard) {
      if (!Number.isFinite(nextCard.position) || nextCard.position < 2) {
        shouldLocalRebalance = true;
      } else {
        newPosition = nextCard.position / 2;
      }
    }

    const updatedTargetCards = shouldLocalRebalance
      ? finalTargetCards.map((c, idx) => ({
          ...c,
          listId: targetListObj.id,
          position: (idx + 1) * 1000,
        }))
      : finalTargetCards.map((c) =>
          c.id === activeId ? { ...c, listId: targetListObj.id, position: newPosition } : c
        );

    if (shouldLocalRebalance) {
      newPosition = (finalCardIndex + 1) * 1000;
    }

    const orderedCardIds = updatedTargetCards.map((c) => c.id);

    updateLists((prev) =>
      prev.map((l) => {
        if (sourceListObj.id !== targetListObj.id && l.id === sourceListObj.id) {
          return {
            ...l,
            cards: l.cards.filter((c) => c.id !== activeId),
          };
        }
        if (l.id === targetListObj.id) {
          return {
            ...l,
            cards: updatedTargetCards,
          };
        }
        return l;
      })
    );

    try {
      const res = await fetch('/api/marketing/kanban/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeId,
          listId: targetListObj.id,
          position: newPosition,
          orderedCardIds,
        }),
      });
      const saved = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(saved.error || `บันทึกการย้ายการ์ดไม่สำเร็จ (HTTP ${res.status})`);
      }

      if (saved.listPositions && typeof saved.listPositions === 'object') {
        const posMap = saved.listPositions as Record<string, number>;
        updateLists((prev) =>
          prev.map((l) => {
            if (l.id !== targetListObj.id) return l;
            return {
              ...l,
              cards: l.cards
                .map((c) =>
                  posMap[c.id] !== undefined ? { ...c, position: posMap[c.id] } : c
                )
                .sort((a, b) => a.position - b.position),
            };
          })
        );
      }
      router.refresh();
    } catch (e: any) {
      console.error('Failed to save card move', e);
      updateLists(dragMeta.originLists);
      showBoardError(e?.message || 'ย้ายงานไม่สำเร็จ ระบบคืนตำแหน่งเดิมให้แล้ว');
    }
  };

  const handleAddCard = async (listId: string, title: string) => {
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
      router.refresh();
    } catch (e: any) {
      console.error(e);
      showBoardError(e?.message || 'เพิ่มงานใหม่ไม่สำเร็จ');
    }
  };

  const handleUpdateList = async (listId: string, updates: Partial<TKanbanList>) => {
    const prevLists = listsRef.current;
    updateLists((prev) => prev.map((l) => (l.id === listId ? { ...l, ...updates } : l)));
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
      router.refresh();
    } catch (e: any) {
      console.error(e);
      updateLists(prevLists);
      showBoardError(e?.message || 'อัปเดตรายการไม่สำเร็จ');
    }
  };

  const executeDeleteList = async () => {
    if (!listToDelete) return;
    const listId = listToDelete.id;
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
      router.refresh();
    } catch (e: any) {
      console.error(e);
      showBoardError(e?.message || 'ลบรายการไม่สำเร็จ');
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
      const newList = await res.json().catch(() => ({}));
      if (!res.ok || !newList?.id) {
        throw new Error(newList?.error || 'เพิ่มรายการใหม่ไม่สำเร็จ');
      }
      updateLists((prev) => [...prev, newList]);
      setNewListTitle('');
      setIsAddingList(false);
      router.refresh();
    } catch (e: any) {
      console.error(e);
      showBoardError(e?.message || 'เพิ่มรายการใหม่ไม่สำเร็จ');
    }
  };

  const handleCardUpdate = (updatedCard: TKanbanCard & { listPositions?: Record<string, number> }) => {
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
    router.refresh();
  };

  const handleDeleteCard = (cardId: string) => {
    updateLists((prevLists) =>
      prevLists.map((list) => ({
        ...list,
        cards: list.cards.filter((c) => c.id !== cardId),
      }))
    );
    setEditingCard(null);
    router.refresh();
  };

  const handleCompleteCard = async (cardId: string, isCompleted: boolean) => {
    const prevLists = listsRef.current;
    updateLists((prev) =>
      prev.map((list) => ({
        ...list,
        cards: list.cards.map((c) => (c.id === cardId ? { ...c, isCompleted } : c)),
      }))
    );
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
      router.refresh();
    } catch (e: any) {
      console.error("Failed to update card completion", e);
      updateLists(prevLists);
      showBoardError(e?.message || 'อัปเดตสถานะงานไม่สำเร็จ');
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
            onCardClick={(card) => {
              const latest = lists.flatMap((l) => l.cards).find((c) => c.id === card.id) || card;
              setEditingCard(latest);
            }}
          />
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar transition-all duration-300">
            <DndContext
              sensors={sensors}
              collisionDetection={kanbanCollisionDetection}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
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
                    list={activeList}
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
                              <span className="font-semibold">{user ? user.fullName.split(' ')[0] : 'ระบบ'}</span>
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
