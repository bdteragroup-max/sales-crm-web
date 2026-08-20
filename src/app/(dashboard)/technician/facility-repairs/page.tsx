import React from 'react';
import { getFacilityRepairs } from '@/app/actions/facility-repairs';
import { getUser } from '@/app/lib/dal';
import Link from 'next/link';

export default async function TechnicianFacilityRepairsPage() {
  const user = await getUser();
  if (!user || (user.role !== 'TECHNICIAN' && user.role !== 'ADMIN')) {
    return <div className="p-6 text-red-600">Access Denied</div>;
  }

  const allRepairs = await getFacilityRepairs();
  const unassignedRepairs = allRepairs.filter(r => r.status === 'REPORTED');
  const myRepairs = allRepairs.filter(r => r.assigneeId === user.id && r.status !== 'COMPLETED');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Technician Dashboard: Facility Repairs</h1>

      <h2 className="text-xl font-semibold mt-8 mb-4">My Active Tasks</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {myRepairs.map((r) => (
              <tr key={r.id}>
                <td className="px-6 py-4 whitespace-nowrap text-blue-600">
                  <Link href={`/facility-repairs/${r.id}`}>{r.requestNumber}</Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{r.equipmentName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{r.location}</td>
                <td className="px-6 py-4 whitespace-nowrap">{r.status}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/technician/facility-repairs/${r.id}/edit`} className="text-indigo-600 hover:text-indigo-900">
                    Update Status
                  </Link>
                </td>
              </tr>
            ))}
            {myRepairs.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No active tasks</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold mb-4">Unassigned Requests</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporter</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {unassignedRepairs.map((r) => (
              <tr key={r.id}>
                <td className="px-6 py-4 whitespace-nowrap text-blue-600">
                  <Link href={`/facility-repairs/${r.id}`}>{r.requestNumber}</Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{r.equipmentName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{r.location}</td>
                <td className="px-6 py-4 whitespace-nowrap">{r.reporterName || r.reporter?.fullName || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   {/* Normally this would be a Client Component button that calls assignFacilityRepair */}
                   <span className="text-sm text-gray-500">Requires Client Component to accept</span>
                </td>
              </tr>
            ))}
            {unassignedRepairs.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No unassigned requests</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}\n