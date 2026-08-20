import React from 'react';
import { getFacilityRepairs } from '@/app/actions/facility-repairs';
import prisma from '@/app/lib/db';
import { notFound } from 'next/navigation';

export default async function FacilityRepairDetailPage({ params }: { params: { id: string } }) {
  const repair = await prisma.facilityRepairRequest.findUnique({
    where: { id: params.id },
    include: { logs: { include: { user: true }, orderBy: { createdAt: 'desc' } }, reporter: true, assignee: true }
  });

  if (!repair) notFound();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Repair Details: {repair.requestNumber}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 shadow rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Information</h2>
          <p><strong>Equipment:</strong> {repair.equipmentName}</p>
          <p><strong>Location:</strong> {repair.location}</p>
          <p><strong>Status:</strong> {repair.status}</p>
          <p><strong>Detail:</strong> {repair.issueDetail}</p>
          {repair.photoUrl && <img src={repair.photoUrl} alt="Issue" className="mt-4 max-w-full h-auto rounded" />}
        </div>
        
        <div className="bg-white p-6 shadow rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
          <ul className="space-y-4">
            {repair.logs.map((log) => (
              <li key={log.id} className="text-sm">
                <span className="font-semibold">{log.user?.fullName || 'System'}</span> ({new Date(log.createdAt).toLocaleString()}):
                <br/>
                <span className="text-gray-600">{log.action} - {log.details}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}\n