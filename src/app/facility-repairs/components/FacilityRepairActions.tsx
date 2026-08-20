'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignFacilityRepair, updateFacilityRepairStatus } from '@/app/actions/facility-repairs';

interface FacilityRepairActionsProps {
  repair: {
    id: string;
    status: string;
    assigneeId: string | null;
  };
  currentUser: {
    id: string;
    role: string;
  };
  isTechnician: boolean;
  isAdmin: boolean;
}

export default function FacilityRepairActions({ repair, currentUser, isTechnician, isAdmin }: FacilityRepairActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAcceptJob = async () => {
    try {
      setLoading(true);
      setError(null);
      await assignFacilityRepair(repair.id, currentUser.id);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to accept the job");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (!newStatus || newStatus === repair.status) return;

    try {
      setLoading(true);
      setError(null);
      await updateFacilityRepairStatus(repair.id, newStatus);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update status");
      // Reset select
      e.target.value = repair.status;
    } finally {
      setLoading(false);
    }
  };

  // 1. Show Accept Job button if it's REPORTED and user is Tech/Admin
  if (repair.status === 'REPORTED' && (isTechnician || isAdmin)) {
    return (
      <div className="flex flex-col w-full sm:w-auto items-stretch sm:items-end mt-4 sm:mt-0">
        <button
          onClick={handleAcceptJob}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 sm:py-2 px-6 rounded-lg shadow-sm transition-colors disabled:opacity-50 w-full sm:w-auto"
        >
          {loading ? 'กำลังดำเนินการ...' : 'รับงาน (Accept Job)'}
        </button>
        {error && <p className="text-red-600 text-sm mt-2 text-center sm:text-right">{error}</p>}
      </div>
    );
  }

  // 2. Show Update Status if assigned and user is assignee or admin
  const isAssignee = repair.assigneeId === currentUser.id;
  if ((repair.status === 'ASSIGNED' || repair.status === 'IN_PROGRESS') && (isAssignee || isAdmin)) {
    return (
      <div className="flex flex-col w-full sm:w-auto items-stretch sm:items-end mt-4 sm:mt-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 bg-white border border-gray-200 p-3 sm:px-4 sm:py-2 rounded-lg shadow-sm w-full sm:w-auto">
          <label className="text-sm font-medium text-gray-700">อัปเดตสถานะ (Status):</label>
          <select
            className="border-gray-300 rounded-md shadow-sm text-sm focus:border-red-500 focus:ring-red-500 disabled:opacity-50 py-2 sm:py-1.5 w-full sm:w-auto"
            defaultValue={repair.status}
            onChange={handleUpdateStatus}
            disabled={loading}
          >
            <option value="ASSIGNED" disabled={repair.status === 'IN_PROGRESS'}>มอบหมายแล้ว (Assigned)</option>
            <option value="IN_PROGRESS">กำลังดำเนินการ (In Progress)</option>
            <option value="COMPLETED">เสร็จสิ้น (Completed)</option>
          </select>
        </div>
        {error && <p className="text-red-600 text-sm mt-2 text-center sm:text-right">{error}</p>}
        {loading && <p className="text-gray-500 text-xs mt-1 text-center sm:text-right">กำลังบันทึก...</p>}
      </div>
    );
  }

  // Otherwise, render nothing
  return null;
}
