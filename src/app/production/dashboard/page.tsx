import React from 'react';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import Sidebar from '@/app/components/Sidebar';
import { redirect } from 'next/navigation';
import ProductionDashboardClient from './ProductionDashboardClient';

export const dynamic = 'force-dynamic';

export default async function ProductionDashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch all cabinet orders with their linked PRs and POs
  const orders = await prisma.order.findMany({
    where: {
      quotation: {
        jobs: {
          some: {
            jobType: {
              in: ['งานตู้', 'งานตู้ + ติดตั้ง', 'Cabinet Work', 'Cabinet Work + Installation']
            }
          }
        }
      }
    },
    include: {
      company: true,
      quotation: {
        include: {
          jobs: {
            include: { project: true }
          }
        }
      },
      salesperson: {
        select: {
          id: true,
          fullName: true
        }
      },
      purchaseRequests: {
        include: {
          purchaseOrders: true
        },
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Flatten PRs and POs from the orders for the summary KPI cards
  const prs = orders.flatMap(o => o.purchaseRequests || []);
  const pos = prs.flatMap(pr => pr.purchaseOrders || []);

  const serializedOrders = JSON.parse(JSON.stringify(orders));
  const serializedPrs = JSON.parse(JSON.stringify(prs));
  const serializedPos = JSON.parse(JSON.stringify(pos));

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar activeRoute="/production/dashboard" userFullName={user.fullName} userId={user.id} userRole={user.role} />
      
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50 p-4 md:p-10 pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto w-full">
          <ProductionDashboardClient 
            orders={serializedOrders} 
            prs={serializedPrs} 
            pos={serializedPos} 
          />
        </div>
      </main>
    </div>
  );
}
