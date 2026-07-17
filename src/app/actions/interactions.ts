'use server';

import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';

export async function loadMoreInteractions(companyId: string, skip: number, take: number = 10) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const interactions = await prisma.companyInteraction.findMany({
    where: { companyId },
    orderBy: { occurredAt: 'desc' },
    skip,
    take,
    include: {
      user: { select: { fullName: true, role: true } }
    }
  });

  return interactions;
}

export async function addInteraction(data: {
  companyId: string;
  type: string;
  title: string;
  description?: string;
  occurredAt?: Date;
}) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const interaction = await prisma.companyInteraction.create({
    data: {
      companyId: data.companyId,
      userId: user.id,
      type: data.type,
      title: data.title,
      description: data.description,
      occurredAt: data.occurredAt || new Date()
    }
  });

  revalidatePath(`/admin/companies/${data.companyId}`);
  return interaction;
}
