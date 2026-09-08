import { getUser } from '@/app/lib/dal';
import { redirect } from 'next/navigation';
import prisma from '@/app/lib/db';
import { isSuperUser } from '@/app/lib/roleHelper';
import CreatePRForm from './CreatePRForm';

export const dynamic = 'force-dynamic';

export default async function CreatePRPage(props: {
  searchParams?: Promise<any> | any;
}) {
  const user = await getUser();
  if (!user) redirect('/');

  const userRoleStr = (user.role || '').toLowerCase();
  const isSuperAdmin = isSuperUser(user.role);
  const isPurchasingOrAdmin = isSuperAdmin || ['purchasing', 'จัดซื้อ', 'admin', 'ผู้จัดการ', 'manager', 'director', 'superadmin'].some((r) => userRoleStr.includes(r));
  
  if (!isPurchasingOrAdmin) {
    redirect('/dashboard');
  }

  const searchParams = props.searchParams ? await props.searchParams : {};

  const orderId = typeof searchParams.orderId === 'string' ? searchParams.orderId : '';
  const note = typeof searchParams.note === 'string' ? searchParams.note : '';
  const project = typeof searchParams.project === 'string' ? searchParams.project : '';

  // Concurrently fetch recent distinct projects, pending orders requiring PRs, linked order, and latest PR
  const [recentPrs, pendingOrders, linkedOrder, latestPr] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where: { projectName: { not: null } },
      select: { projectName: true },
      orderBy: { id: 'desc' },
      take: 250
    }),
    prisma.order.findMany({
      where: {
        prRequired: true,
        purchaseRequests: { none: {} }
      },
      select: {
        id: true,
        orderNumber: true,
        prNote: true,
        targetDeliveryDate: true,
        status: true,
        company: {
          select: { companyName: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    }),
    orderId ? prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        prNote: true,
        targetDeliveryDate: true,
        status: true,
        company: {
          select: { companyName: true }
        }
      }
    }) : Promise.resolve(null),
    prisma.purchaseRequest.findFirst({
      select: { prNumber: true },
      orderBy: { id: 'desc' }
    })
  ]);

  // Extract unique clean project names
  const projectMap = new Map<string, number>();
  for (const pr of recentPrs) {
    const raw = pr.projectName?.trim();
    if (raw && raw !== '-' && raw.length > 1) {
      projectMap.set(raw, (projectMap.get(raw) || 0) + 1);
    }
  }

  // Sort project suggestions by frequency
  const projectSuggestions = Array.from(projectMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50/50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <CreatePRForm 
          defaultOrderId={orderId}
          defaultNote={note}
          defaultProject={project}
          currentUser={{
            name: user.fullName || '',
            email: user.email || ''
          }}
          projectSuggestions={projectSuggestions}
          pendingOrders={pendingOrders.map(o => ({
            id: o.id,
            orderNumber: o.orderNumber,
            prNote: o.prNote || '',
            targetDeliveryDate: o.targetDeliveryDate ? o.targetDeliveryDate.toISOString() : null,
            status: o.status,
            companyName: o.company?.companyName || '-'
          }))}
          linkedOrder={linkedOrder ? {
            id: linkedOrder.id,
            orderNumber: linkedOrder.orderNumber,
            prNote: linkedOrder.prNote || '',
            targetDeliveryDate: linkedOrder.targetDeliveryDate ? linkedOrder.targetDeliveryDate.toISOString() : null,
            status: linkedOrder.status,
            companyName: linkedOrder.company?.companyName || '-'
          } : null}
          latestPrNumber={latestPr?.prNumber || null}
        />
      </div>
    </div>
  );
}
