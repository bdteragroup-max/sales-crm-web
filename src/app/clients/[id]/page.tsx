import React from 'react';
import prisma from '@/app/lib/db';
import CompanyDetailClient from './CompanyDetailClient';
import { notFound } from 'next/navigation';
import { getUser } from '@/app/lib/dal';

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getUser();
  
  const company = await prisma.company.findUnique({
    where: { id: resolvedParams.id },
    include: {
      interactions: {
        orderBy: { occurredAt: 'desc' },
        include: {
          user: {
            select: { fullName: true }
          }
        }
      },
      contacts: true,
      assignedUser: { select: { fullName: true } }
    }
  });

  if (!company) {
    return notFound();
  }

  return (
    <CompanyDetailClient company={company} currentUser={user} />
  );
}
