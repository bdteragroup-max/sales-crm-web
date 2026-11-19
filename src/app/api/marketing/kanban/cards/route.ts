import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@/generated/client';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import { sendPushToUser } from '@/app/lib/pushNotification';

// POST: Create a new card
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { listId, title, description, assignedToId, engineeringReviewers, startDate, dueDate, salespersonId, scheduledPostDate, postingChannels } = data;

    if (!listId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      return NextResponse.json({ error: 'Start date must not exceed end date' }, { status: 400 });
    }

    // Find the max position in the list
    const lastCard = await prisma.kanbanCard.findFirst({
      where: { listId },
      orderBy: { position: 'desc' }
    });
    
    const newPosition = lastCard ? lastCard.position + 1000 : 1000;

    const card = await prisma.kanbanCard.create({
      data: {
        listId,
        title,
        description,
        assignedToId,
        engineeringReviewers: engineeringReviewers || [],
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        position: newPosition,
        salespersonId,
        scheduledPostDate: scheduledPostDate ? new Date(scheduledPostDate) : null,
        postingChannels: postingChannels || []
      },
      include: {
        attachments: true,
        comments: true,
        activityLogs: true
      }
    });

    await prisma.kanbanActivityLog.create({
      data: {
        cardId: card.id,
        userId: user.id,
        actionType: 'CREATED',
        details: 'Created card'
      }
    });

    revalidatePath('/marketing/kanban');
    return NextResponse.json(card);
  } catch (error: unknown) {
    console.error('Error in POST /api/marketing/kanban/cards:', error);
    const message = error instanceof Error ? error.message : 'Failed to create card';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: Update card details or move/reorder
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      id,
      listId,
      position,
      orderedCardIds,
      title,
      description,
      assignedToId,
      engineeringReviewers,
      startDate,
      dueDate,
      revisionStatus,
      checklist,
      color,
      isCompleted,
      salespersonId,
      scheduledPostDate,
      postingChannels
    } = data;

    if (!id) {
      return NextResponse.json({ error: 'Missing card ID' }, { status: 400 });
    }

    const oldCard = await prisma.kanbanCard.findUnique({ where: { id } });
    if (!oldCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Only enforce date ordering when dates are actually being modified
    if (startDate !== undefined || dueDate !== undefined) {
      const finalStartDate = startDate !== undefined ? (startDate ? new Date(startDate) : null) : oldCard.startDate;
      const finalDueDate = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : oldCard.dueDate;

      if (finalStartDate && finalDueDate && finalStartDate > finalDueDate) {
        return NextResponse.json({ error: 'Start date must not exceed end date' }, { status: 400 });
      }
    }

    const updateData: Prisma.KanbanCardUncheckedUpdateInput = {};
    let isMove = false;

    if (listId !== undefined) {
      updateData.listId = listId;
      isMove = true;
    }
    if (typeof position === 'number' && Number.isFinite(position)) {
      updateData.position = position;
    } else if (listId !== undefined && listId !== oldCard.listId) {
      // Moving to a different list without an explicit position (e.g. from modal): place at bottom of target list
      const lastInTarget = await prisma.kanbanCard.findFirst({
        where: { listId },
        orderBy: [{ position: 'desc' }, { createdAt: 'desc' }],
        select: { position: true }
      });
      updateData.position = lastInTarget && Number.isFinite(lastInTarget.position)
        ? Math.max(1000, lastInTarget.position + 1000)
        : 1000;
    }
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (engineeringReviewers !== undefined) updateData.engineeringReviewers = engineeringReviewers;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (revisionStatus !== undefined) updateData.revisionStatus = revisionStatus;
    if (checklist !== undefined) updateData.checklist = checklist;
    if (color !== undefined) updateData.color = color;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (salespersonId !== undefined) updateData.salespersonId = salespersonId;
    if (scheduledPostDate !== undefined) updateData.scheduledPostDate = scheduledPostDate ? new Date(scheduledPostDate) : null;
    if (postingChannels !== undefined) updateData.postingChannels = postingChannels;

    const cleanOrderedIds: string[] | null = Array.isArray(orderedCardIds)
      ? orderedCardIds.filter((cid: unknown): cid is string => typeof cid === 'string' && cid.length > 0)
      : null;

    const { card, listPositions } = await prisma.$transaction(async (tx) => {
      const updated = await tx.kanbanCard.update({
        where: { id },
        data: updateData,
        include: {
          attachments: true,
          comments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          activityLogs: {
            orderBy: { timestamp: 'desc' },
            take: 5,
          }
        }
      });

      let rebalancedMap: Record<string, number> | undefined;

      if (isMove || position !== undefined || cleanOrderedIds) {
        const targetListCards = await tx.kanbanCard.findMany({
          where: { listId: updated.listId },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true, position: true }
        });

        let needsRebalance = false;
        for (let i = 0; i < targetListCards.length; i++) {
          const currPos = targetListCards[i].position;
          if (!Number.isFinite(currPos) || currPos < 1) {
            needsRebalance = true;
            break;
          }
          if (i > 0 && currPos - targetListCards[i - 1].position < 1) {
            needsRebalance = true;
            break;
          }
        }

        if (cleanOrderedIds && cleanOrderedIds.length > 0) {
          // If client provided explicit card order and any positions conflict or order differs, rebalance to clean spacing
          const dbOrderIds = targetListCards.map((c) => c.id);
          const idxById = new Map(cleanOrderedIds.map((cid, idx) => [cid, idx]));
          const clientOrderedDbIds = dbOrderIds.filter((cid) => idxById.has(cid));
          const clientOrderedClean = cleanOrderedIds.filter((cid) => dbOrderIds.includes(cid));
          if (
            clientOrderedDbIds.length === clientOrderedClean.length &&
            clientOrderedDbIds.some((cid, i) => cid !== clientOrderedClean[i])
          ) {
            needsRebalance = true;
          }
        }

        if (needsRebalance && targetListCards.length > 0) {
          let orderedCardsForRebalance = targetListCards;
          if (cleanOrderedIds && cleanOrderedIds.length > 0) {
            const byId = new Map(targetListCards.map((c) => [c.id, c]));
            const seen = new Set<string>();
            const arranged: typeof targetListCards = [];
            for (const cid of cleanOrderedIds) {
              const found = byId.get(cid);
              if (found && !seen.has(cid)) {
                arranged.push(found);
                seen.add(cid);
              }
            }
            for (const c of targetListCards) {
              if (!seen.has(c.id)) arranged.push(c);
            }
            orderedCardsForRebalance = arranged;
          }

          rebalancedMap = {};
          const rebalanceChanges: Array<{ id: string; pos: number }> = [];
          for (let i = 0; i < orderedCardsForRebalance.length; i++) {
            const c = orderedCardsForRebalance[i];
            const nextPos = (i + 1) * 1000;
            rebalancedMap[c.id] = nextPos;
            if (c.position !== nextPos) {
              rebalanceChanges.push({ id: c.id, pos: nextPos });
            }
          }
          if (rebalanceChanges.length > 0) {
            const rebalancePayloadJson = JSON.stringify(rebalanceChanges);
            await tx.$executeRaw`
              UPDATE "KanbanCard" AS c
              SET "position" = v.pos
              FROM jsonb_to_recordset(${rebalancePayloadJson}::jsonb) AS v(id text, pos double precision)
              WHERE c.id = v.id AND c."listId" = ${updated.listId}
            `;
          }
          if (rebalancedMap[updated.id] !== undefined) {
            updated.position = rebalancedMap[updated.id];
          }
        }
      }

      return { card: updated, listPositions: rebalancedMap };
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    const newActivityLogs: Awaited<ReturnType<typeof prisma.kanbanActivityLog.create>>[] = [];

    if (isMove && oldCard && oldCard.listId !== listId) {
      try {
        const moveLog = await prisma.kanbanActivityLog.create({
          data: {
            cardId: card.id,
            userId: user.id,
            actionType: 'MOVED',
            details: `Moved to another list`
          }
        });
        newActivityLogs.push(moveLog);

        const newList = await prisma.kanbanList.findUnique({ where: { id: listId } });
        if (newList && newList.name === 'Product & Service Review' && card.engineeringReviewers?.length > 0) {
          await Promise.allSettled(
            card.engineeringReviewers.map((reviewerId) =>
              sendPushToUser(reviewerId, {
                title: 'Product & Service Review Required',
                body: `A Kanban card "${card.title}" has been moved to the Product & Service Review list.`,
                url: '/marketing/kanban',
                category: 'kanban_review'
              })
            )
          );
        }
      } catch (notifyErr) {
        console.warn('Non-fatal error logging move / sending notification:', notifyErr);
      }
    }

    if (revisionStatus !== undefined && oldCard && oldCard.revisionStatus !== revisionStatus) {
      try {
        const statusLog = await prisma.kanbanActivityLog.create({
          data: {
            cardId: card.id,
            userId: user.id,
            actionType: 'STATUS_CHANGE',
            details: `Status changed to ${revisionStatus}`
          }
        });
        newActivityLogs.push(statusLog);
      } catch (logErr) {
        console.warn('Non-fatal error logging revisionStatus change:', logErr);
      }
    }

    try {
      revalidatePath('/marketing/kanban');
    } catch (revalErr) {
      console.warn('Non-fatal revalidatePath error:', revalErr);
    }

    const mergedActivityLogs =
      newActivityLogs.length > 0
        ? [...newActivityLogs, ...(card.activityLogs || [])].slice(0, 5)
        : card.activityLogs;

    return NextResponse.json({
      ...card,
      activityLogs: mergedActivityLogs,
      ...(listPositions ? { listPositions } : {})
    });
  } catch (error: unknown) {
    console.error('Error in PUT /api/marketing/kanban/cards:', error);
    const message = error instanceof Error ? error.message : 'Failed to update card';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
