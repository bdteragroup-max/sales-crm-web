import React from 'react';
import prisma from '@/app/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const SLA_THRESHOLDS_DAYS: Record<string, number> = {
  'รอยืนยัน': 2,        // Pending confirmation
  'กำลังผลิต': 7,       // In production
  'รอส่งมอบ': 3,        // Waiting for delivery
};

export default async function SLADashboard() {
  const now = new Date();
  
  // 1. Fetch Orders that might be breaching SLA
  const pendingOrders = await prisma.order.findMany({
    where: {
      status: { in: Object.keys(SLA_THRESHOLDS_DAYS) },
    },
    include: {
      company: { select: { companyName: true } },
      salesperson: { select: { fullName: true } }
    }
  });

  const breachedOrders = pendingOrders.filter(order => {
    const daysInStatus = Math.floor((now.getTime() - order.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    const threshold = SLA_THRESHOLDS_DAYS[order.status];
    return daysInStatus > threshold;
  }).map(order => {
    const daysInStatus = Math.floor((now.getTime() - order.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...order,
      daysInStatus,
      threshold: SLA_THRESHOLDS_DAYS[order.status],
      department: order.status === 'กำลังผลิต' ? 'Production' : 'Sales'
    };
  });

  // 2. Fetch Jobs stuck in a particular department (using JobStepLog logic approximation)
  // For simplicity, we just flag jobs that haven't been closed and are old
  const oldJobs = await prisma.job.findMany({
    where: {
      dateClosed: { gt: new Date('2099-01-01') }, // Assuming active jobs don't have a past dateClosed if not closed
      updatedAt: { lte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } // Older than 14 days
    },
    include: {
      stepLogs: {
        orderBy: { completedAt: 'desc' },
        take: 1
      }
    }
  });

  const breachedJobs = oldJobs.map(job => {
    const daysInStatus = Math.floor((now.getTime() - job.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    const lastStep = job.stepLogs[0];
    return {
      ...job,
      daysInStatus,
      threshold: 14,
      department: lastStep?.department || 'Unknown',
      currentStep: job.currentStep
    };
  });

  return (
    <div className="p-8 w-full h-full overflow-y-auto bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SLA และการติดตามงานล่าช้า</h1>
          <p className="text-gray-500">ติดตามคำสั่งซื้อและคิวงานที่ล่าช้าเกินกว่ามาตรฐานการให้บริการ (SLA)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Orders SLA Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold leading-none tracking-tight text-red-600 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              คำสั่งซื้อที่ล่าช้าเกิน SLA
            </h3>
          </div>
          <div className="p-0">
            <div className="w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-gray-100/50 data-[state=selected]:bg-gray-100">
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">เลขที่คำสั่งซื้อ</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">สถานะ / แผนก</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">จำนวนวันที่ค้าง</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {breachedOrders.map((order) => (
                    <tr key={order.id} className="border-b transition-colors hover:bg-gray-100/50 data-[state=selected]:bg-gray-100">
                      <td className="p-4 align-middle font-medium">
                        {order.orderNumber}<br/>
                        <span className="text-xs text-gray-400">{order.company?.companyName}</span>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2">{order.status}</span><br/>
                        <span className="text-xs text-gray-500">{order.department}</span>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="text-red-600 font-bold">{order.daysInStatus} วัน</span>
                        <span className="text-xs text-gray-400 ml-1">(ลิมิต: {order.threshold} วัน)</span>
                      </td>
                      <td className="p-4 align-middle">
                        <Link href={`/orders`} className="text-blue-600 hover:underline text-sm font-medium">
                          ตรวจสอบ
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {breachedOrders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 align-middle text-center py-8 text-gray-500">
                        ไม่มีคำสั่งซื้อที่ล่าช้าเกิน SLA ในขณะนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Jobs SLA Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold leading-none tracking-tight text-orange-600 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              คิวงานที่ติดขัด
            </h3>
          </div>
          <div className="p-0">
            <div className="w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-gray-100/50 data-[state=selected]:bg-gray-100">
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">เลขที่งาน (Job)</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">ขั้นตอน / แผนก</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">ระยะเวลาที่ค้าง</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {breachedJobs.map((job) => (
                    <tr key={job.id} className="border-b transition-colors hover:bg-gray-100/50 data-[state=selected]:bg-gray-100">
                      <td className="p-4 align-middle font-medium">
                        {job.jobNumber}<br/>
                        <span className="text-xs text-gray-400">{job.customerName}</span>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 border-transparent bg-gray-100 text-gray-900">{job.currentStep}</span><br/>
                        <span className="text-xs text-gray-500">{job.department}</span>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="text-orange-600 font-bold">{job.daysInStatus} วัน</span>
                      </td>
                      <td className="p-4 align-middle">
                        <Link href={`/jobs`} className="text-blue-600 hover:underline text-sm font-medium">
                          ตรวจสอบ
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {breachedJobs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 align-middle text-center py-8 text-gray-500">
                        ไม่พบคิวงานที่ติดขัดเกินกำหนด
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
