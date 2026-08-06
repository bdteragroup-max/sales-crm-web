import { NextRequest, NextResponse } from 'next/server';
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
    const { listId, title, description, assignedToId, engineeringReviewers, startDate, dueDate } = data;

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
        position: newPosition
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

    return NextResponse.json(card);
  } catch (error: any) {
    console.error('Error in POST /api/marketing/kanban/cards:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    const { id, listId, position, title, description, assignedToId, engineeringReviewers, startDate, dueDate, revisionStatus, checklist, color, isCompleted } = data;

    if (!id) {
      return NextResponse.json({ error: 'Missing card ID' }, { status: 400 });
    }

    const updateData: any = {};
    const logDetails: string[] = [];
    let isMove = false;

    if (listId !== undefined) {
      updateData.listId = listId;
      isMove = true;
    }
    if (position !== undefined) updateData.position = position;
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

    const oldCard = await prisma.kanbanCard.findUnique({ where: { id } });
    if (!oldCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const finalStartDate = startDate !== undefined ? (startDate ? new Date(startDate) : null) : oldCard.startDate;
    const finalDueDate = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : oldCard.dueDate;

    if (finalStartDate && finalDueDate && finalStartDate > finalDueDate) {
      return NextResponse.json({ error: 'Start date must not exceed end date' }, { status: 400 });
    }

    const card = await prisma.kanbanCard.update({
      where: { id },
      data: updateData,
      include: {
        attachments: true,
        comments: true,
        activityLogs: true
      }
    });

    if (isMove && oldCard && oldCard.listId !== listId) {
       await prisma.kanbanActivityLog.create({
         data: {
           cardId: card.id,
           userId: user.id,
           actionType: 'MOVED',
           details: `Moved to another list`
         }
       });
       
       const newList = await prisma.kanbanList.findUnique({ where: { id: listId } });
       if (newList && newList.name === 'Product & Service Review' && card.engineeringReviewers?.length > 0) {
         for (const reviewerId of card.engineeringReviewers) {
           await sendPushToUser(reviewerId, {
             title: 'Product & Service Review Required',
             body: `A Kanban card "${card.title}" has been moved to the Product & Service Review list.`,
             url: '/marketing/kanban',
             category: 'kanban_review'
           }).catch(console.error);
         }
       }
    }

    if (revisionStatus !== undefined && oldCard && oldCard.revisionStatus !== revisionStatus) {
       await prisma.kanbanActivityLog.create({
         data: {
           cardId: card.id,
           userId: user.id,
           actionType: 'STATUS_CHANGE',
           details: `Status changed to ${revisionStatus}`
         }
       });
    }

    return NextResponse.json(card);
  } catch (error: any) {
    console.error('Error in PUT /api/marketing/kanban/cards:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
