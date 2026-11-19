import {
  CollisionDetection,
  closestCorners,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';

export type TKanbanUser = {
  id: string;
  fullName: string | null;
  email?: string | null;
  role?: string | null;
};

export type TKanbanChecklistItem = {
  id?: string;
  text?: string;
  title?: string;
  completed?: boolean;
};

export type TKanbanAttachment = {
  id?: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string | null;
  attachmentType?: string | null;
};

export type TKanbanComment = {
  id: string;
  cardId?: string;
  userId?: string | null;
  message: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TKanbanActivityLog = {
  id: string;
  cardId?: string;
  userId?: string | null;
  actionType: string;
  details?: string | null;
  timestamp: string;
  cardTitle?: string;
};

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
  checklist: TKanbanChecklistItem[] | null;
  color?: string | null;
  engineeringReviewers?: string[];
  attachments: TKanbanAttachment[];
  comments: TKanbanComment[];
  activityLogs: TKanbanActivityLog[];
  isCompleted?: boolean;
  salespersonId?: string | null;
  scheduledPostDate?: string | null;
  postingChannels?: string[];
};

export type TKanbanBoard = {
  id: string;
  name: string;
  ownerId?: string | null;
  colorTheme?: string;
  lists: TKanbanList[];
};

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export type TKanbanList = {
  id: string;
  boardId: string;
  name: string;
  position: number;
  color?: string | null;
  cards: TKanbanCard[];
};

export type TDragOriginMeta = {
  type: 'Card' | 'List';
  activeId: string;
  originListId?: string;
  originIndex: number;
  originCard?: TKanbanCard;
  originLists: TKanbanList[];
};

export type TKanbanFilters = {
  showCompleted: boolean;
  filterAssignee: string | null;
  filterLabel: string | null;
};

export function moveArrayItem<T>(array: T[], from: number, to: number): T[] {
  const next = array.slice();
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) {
    return next;
  }
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function isCardVisibleWithFilters(card: TKanbanCard, filters: TKanbanFilters): boolean {
  if (!filters.showCompleted && card.isCompleted) return false;
  if (
    filters.filterAssignee &&
    card.assignedToId !== filters.filterAssignee &&
    !(card.engineeringReviewers || []).includes(filters.filterAssignee)
  ) {
    return false;
  }
  if (filters.filterLabel === 'needs_revision' && card.revisionStatus !== 'needs_revision') {
    return false;
  }
  if (filters.filterLabel === 'pending_review' && card.revisionStatus !== 'pending_review') {
    return false;
  }
  return true;
}

type DroppableContainerLike = Parameters<CollisionDetection>[0]['droppableContainers'][number];

function getContainerRect(
  container: DroppableContainerLike,
  droppableRects: Parameters<CollisionDetection>[0]['droppableRects']
) {
  return droppableRects.get(container.id) ?? container.rect.current ?? null;
}

/**
 * Column-first collision detection that supports empty/short columns via horizontal lane lookup,
 * avoids offscreen scrolled-card rect traps, and never lets a card collide with itself in the wrong column.
 */
export const kanbanCardCollisionDetection: CollisionDetection = (args) => {
  const activeType = args.active?.data?.current?.type;
  const listContainers = args.droppableContainers.filter(
    (c) => c.data?.current?.type === 'List'
  );

  if (activeType === 'List') {
    return closestCorners({ ...args, droppableContainers: listContainers });
  }

  const cardContainers = args.droppableContainers.filter(
    (c) => c.data?.current?.type === 'Card'
  );

  // 1. Identify target list
  const listPointerHits = pointerWithin({ ...args, droppableContainers: listContainers });
  let listHit = listPointerHits[0];

  if (!listHit && args.pointerCoordinates) {
    const { x: px, y: py } = args.pointerCoordinates;
    let bestLaneContainer: DroppableContainerLike | null = null;
    let bestLaneDist = Infinity;

    for (const c of listContainers) {
      const rect = getContainerRect(c, args.droppableRects);
      if (!rect) continue;
      // Cover the column lane (including the 24px inter-column gutter margin) and any vertical space below short columns
      if (px >= rect.left - 14 && px <= rect.right + 14 && py >= rect.top - 48) {
        const centerX = rect.left + rect.width / 2;
        const dist = Math.abs(px - centerX);
        if (dist < bestLaneDist) {
          bestLaneDist = dist;
          bestLaneContainer = c;
        }
      }
    }

    if (bestLaneContainer) {
      listHit = {
        id: bestLaneContainer.id,
        data: { droppableContainer: bestLaneContainer, value: bestLaneDist },
      };
    }
  }

  if (!listHit) {
    const listRectHits = rectIntersection({ ...args, droppableContainers: listContainers });
    listHit = listRectHits[0];
  }

  if (!listHit && !args.pointerCoordinates) {
    // Keyboard dragging has no pointer coordinates: fall back to closestCorners on lists only
    const listCornerHits = closestCorners({ ...args, droppableContainers: listContainers });
    listHit = listCornerHits[0];
  }

  if (!listHit) {
    return [];
  }

  const targetListId = String(listHit.id);
  const activeContainer = cardContainers.find((c) => c.id === args.active.id);
  const activeCardListId = activeContainer?.data?.current?.card?.listId
    ? String(activeContainer.data.current.card.listId)
    : undefined;

  const otherCardsInList = cardContainers.filter((c) => {
    if (c.id === args.active.id) return false;
    const card = c.data?.current?.card as TKanbanCard | undefined;
    return card?.listId === targetListId;
  });

  if (otherCardsInList.length === 0) {
    return [listHit];
  }

  if (args.pointerCoordinates) {
    const pointerY = args.pointerCoordinates.y;

    const cardPointerHits = pointerWithin({
      ...args,
      droppableContainers: otherCardsInList,
    });
    if (cardPointerHits.length > 0) {
      return [cardPointerHits[0]];
    }

    // If active card already lives in targetListId and pointer rests over its placeholder, keep it anchored there
    if (activeContainer && activeCardListId === targetListId) {
      const selfHits = pointerWithin({
        ...args,
        droppableContainers: [activeContainer],
      });
      if (selfHits.length > 0) {
        return [selfHits[0]];
      }
    }

    const listContainer = listContainers.find((c) => c.id === listHit.id);
    const listRect = listContainer ? getContainerRect(listContainer, args.droppableRects) : null;

    const candidateCardsWithRect = otherCardsInList
      .map((c) => ({ container: c, rect: getContainerRect(c, args.droppableRects) }))
      .filter((entry): entry is { container: DroppableContainerLike; rect: NonNullable<ReturnType<typeof getContainerRect>> } => Boolean(entry.rect));

    const visibleCards = listRect
      ? candidateCardsWithRect.filter(
          ({ rect }) => rect.bottom >= listRect.top - 10 && rect.top <= listRect.bottom + 10
        )
      : candidateCardsWithRect;

    const scopedCards = visibleCards.length > 0 ? visibleCards : candidateCardsWithRect;

    if (scopedCards.length > 0) {
      const minTop = Math.min(...scopedCards.map((c) => c.rect.top));
      const maxBottom = Math.max(...scopedCards.map((c) => c.rect.bottom));

      if (pointerY < minTop) {
        const topCard = scopedCards.reduce((best, curr) =>
          curr.rect.top < best.rect.top ? curr : best
        );
        return [{ id: topCard.container.id, data: { droppableContainer: topCard.container } }];
      }

      if (pointerY > maxBottom) {
        return [listHit];
      }

      return closestCorners({
        ...args,
        droppableContainers: scopedCards.map((c) => c.container),
      });
    }

    return [listHit];
  }

  return closestCorners({
    ...args,
    droppableContainers: otherCardsInList,
  });
};

export function isPointerBelowRect(
  activeTranslatedRect: { top: number; height: number } | null | undefined,
  overRect: { top: number; height: number } | null | undefined,
  pointerY?: number | null
): boolean {
  if (!overRect) return false;
  const overMidY = overRect.top + overRect.height / 2;
  if (typeof pointerY === 'number' && Number.isFinite(pointerY)) {
    return pointerY > overMidY;
  }
  if (!activeTranslatedRect) return false;
  const activeMidY = activeTranslatedRect.top + activeTranslatedRect.height / 2;
  return activeMidY > overMidY;
}

export function applyCrossListDragOver(
  prev: TKanbanList[],
  params: {
    activeId: string;
    overId: string;
    isOverList: boolean;
    isOverCard: boolean;
    isBelowOverItem: boolean;
  }
): { changed: boolean; lists: TKanbanList[] } {
  const { activeId, overId, isOverList, isOverCard, isBelowOverItem } = params;
  if (activeId === overId) {
    return { changed: false, lists: prev };
  }

  const activeListIndex = prev.findIndex((l) => l.cards.some((c) => c.id === activeId));
  const overListIndex = isOverList
    ? prev.findIndex((l) => l.id === overId)
    : prev.findIndex((l) => l.cards.some((c) => c.id === overId));

  if (activeListIndex === -1 || overListIndex === -1 || activeListIndex === overListIndex) {
    return { changed: false, lists: prev };
  }

  const srcList = prev[activeListIndex];
  const dstList = prev[overListIndex];
  const activeCardIndex = srcList.cards.findIndex((c) => c.id === activeId);
  if (activeCardIndex === -1) {
    return { changed: false, lists: prev };
  }

  const movedCard: TKanbanCard = {
    ...srcList.cards[activeCardIndex],
    listId: dstList.id,
  };

  const newSrcCards = srcList.cards.filter((_, i) => i !== activeCardIndex);
  let insertIndex = dstList.cards.length;

  if (isOverCard) {
    const overCardIndex = dstList.cards.findIndex((c) => c.id === overId);
    if (overCardIndex !== -1) {
      insertIndex = isBelowOverItem ? overCardIndex + 1 : overCardIndex;
    }
  }

  const newDstCards = [...dstList.cards];
  newDstCards.splice(insertIndex, 0, movedCard);

  const nextLists = [...prev];
  nextLists[activeListIndex] = { ...srcList, cards: newSrcCards };
  nextLists[overListIndex] = { ...dstList, cards: newDstCards };

  return { changed: true, lists: nextLists };
}

export function hasListCorruptedPositions(cards: TKanbanCard[]): boolean {
  for (let i = 0; i < cards.length; i++) {
    const pos = cards[i].position;
    if (!Number.isFinite(pos) || pos < 1) {
      return true;
    }
    if (i > 0 && pos - cards[i - 1].position < 1) {
      return true;
    }
  }
  return false;
}

export function computeCardDropResult(params: {
  currentLists: TKanbanList[];
  dragMeta: TDragOriginMeta;
  activeId: string;
  overId: string;
  isOverList: boolean;
  isOverCard: boolean;
  isBelowOverItem: boolean;
  overCardListId?: string;
  visibleCardIdsByList?: Map<string, Set<string>>;
}): {
  targetListId: string;
  newPosition: number;
  orderedCardIds: string[];
  nextLists: TKanbanList[];
} | null {
  const {
    currentLists,
    dragMeta,
    activeId,
    overId,
    isOverList,
    isOverCard,
    isBelowOverItem,
    overCardListId,
    visibleCardIdsByList,
  } = params;

  const currentListIndex = currentLists.findIndex((l) => l.cards.some((c) => c.id === activeId));
  if (currentListIndex === -1) return null;

  let targetListIndex =
    overId === activeId
      ? currentListIndex
      : isOverList
      ? currentLists.findIndex((l) => l.id === overId)
      : currentLists.findIndex((l) => l.cards.some((c) => c.id === overId));

  if (targetListIndex === -1 && overCardListId) {
    targetListIndex = currentLists.findIndex((l) => l.id === overCardListId);
  }

  if (targetListIndex === -1) return null;

  const sourceListObj = currentLists[currentListIndex];
  const targetListObj = currentLists[targetListIndex];
  const oldIndexInSource = sourceListObj.cards.findIndex((c) => c.id === activeId);
  if (oldIndexInSource === -1) return null;

  let finalTargetCards: TKanbanCard[];
  let finalCardIndex: number;

  if (sourceListObj.id === targetListObj.id) {
    if (overId === activeId) {
      finalTargetCards = [...targetListObj.cards];
      finalCardIndex = oldIndexInSource;
    } else if (overId === targetListObj.id) {
      // Dropped in empty area below visible cards of this list -> place after the last visible card
      const visibleIds = visibleCardIdsByList?.get(targetListObj.id);
      let lastVisibleIdx = -1;
      if (visibleIds && visibleIds.size > 0) {
        for (let i = targetListObj.cards.length - 1; i >= 0; i--) {
          const c = targetListObj.cards[i];
          if (c.id !== activeId && visibleIds.has(c.id)) {
            lastVisibleIdx = i;
            break;
          }
        }
      } else {
        lastVisibleIdx = targetListObj.cards.length - 1;
      }

      if (lastVisibleIdx !== -1 && oldIndexInSource < lastVisibleIdx) {
        finalTargetCards = moveArrayItem(targetListObj.cards, oldIndexInSource, lastVisibleIdx);
        finalCardIndex = lastVisibleIdx;
      } else {
        finalTargetCards = [...targetListObj.cards];
        finalCardIndex = oldIndexInSource;
      }
    } else {
      const overIdx = targetListObj.cards.findIndex((c) => c.id === overId);
      if (overIdx === -1) {
        finalTargetCards = [...targetListObj.cards];
        finalCardIndex = oldIndexInSource;
      } else {
        finalTargetCards = moveArrayItem(targetListObj.cards, oldIndexInSource, overIdx);
        finalCardIndex = overIdx;
      }
    }
  } else {
    const movedCard: TKanbanCard = {
      ...sourceListObj.cards[oldIndexInSource],
      listId: targetListObj.id,
    };
    let insertIdx = targetListObj.cards.length;
    if (isOverCard) {
      const overIdx = targetListObj.cards.findIndex((c) => c.id === overId);
      if (overIdx !== -1) {
        insertIdx = isBelowOverItem ? overIdx + 1 : overIdx;
      }
    }
    finalTargetCards = [...targetListObj.cards];
    finalTargetCards.splice(insertIdx, 0, movedCard);
    finalCardIndex = insertIdx;
  }

  // No-op only if it returned to exact original list AND exact original index
  if (
    targetListObj.id === dragMeta.originListId &&
    finalCardIndex === dragMeta.originIndex
  ) {
    return null;
  }

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

  // Also check if target list already has corrupted/duplicate positions anywhere else (e.g. DONE / Approval)
  if (!shouldLocalRebalance) {
    const previewForSpacingCheck = finalTargetCards.map((c) =>
      c.id === activeId ? { ...c, position: newPosition } : c
    );
    if (hasListCorruptedPositions(previewForSpacingCheck)) {
      shouldLocalRebalance = true;
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

  const nextLists = currentLists.map((l) => {
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
  });

  return {
    targetListId: targetListObj.id,
    newPosition,
    orderedCardIds,
    nextLists,
  };
}

/**
 * Surgically rolls back ONLY the failed moved card to its origin list & position
 * without clobbering unrelated concurrent moves/edits on other cards.
 */
export function revertFailedCardMove(
  currentLists: TKanbanList[],
  dragMeta: TDragOriginMeta
): TKanbanList[] {
  if (!dragMeta.originListId || !dragMeta.originCard) {
    return dragMeta.originLists;
  }

  const originListId = dragMeta.originListId;
  const restoredCard: TKanbanCard = {
    ...dragMeta.originCard,
    listId: originListId,
  };

  return currentLists.map((l) => {
    const withoutActive = l.cards.filter((c) => c.id !== dragMeta.activeId);
    if (l.id !== originListId) {
      return withoutActive.length !== l.cards.length ? { ...l, cards: withoutActive } : l;
    }
    const nextCards = [...withoutActive];
    const insertAt = Math.max(0, Math.min(dragMeta.originIndex, nextCards.length));
    nextCards.splice(insertAt, 0, restoredCard);
    return { ...l, cards: nextCards };
  });
}
