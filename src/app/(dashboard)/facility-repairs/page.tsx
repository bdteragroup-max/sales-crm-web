import React from 'react';
import { getFacilityRepairs } from '@/app/actions/facility-repairs';
import Link from 'next/link';
import { getUser } from '@/app/lib/dal';

export default async function FacilityRepairsPage() {
  const user = await getUser();
  const repairs = await getFacilityRepairs();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Facility Repairs</h1>
        <Link href="/facility-repairs/new" className="bg-blue-600 text-white px-4 py-2 rounded">
          Report New Repair
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporter</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {repairs.map((r) => (
              <tr key={r.id}>
                <td className="px-6 py-4 whitespace-nowrap text-blue-600">
                  <Link href={`/facility-repairs/${r.id}`}>{r.requestNumber}</Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{r.equipmentName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{r.location}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{r.reporterName || r.reporter?.fullName || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{r.assignee?.fullName || 'Unassigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}\n