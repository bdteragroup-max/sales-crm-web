"use client";

import React, { useState } from 'react';
import { updateBDTaskStatus, updateBDTaskChecklist, updateBDTaskDueDate, blockBDTask, unblockBDTask, claimBDTask, releaseBDTask } from '@/app/actions/bd';

export default function BDTaskItem({ task, onTaskUpdated }: { task: any, onTaskUpdated: () => void }) {
  const [checklist, setChecklist] = useState<any[]>(
    typeof task.checklistState === 'string' ? JSON.parse(task.checklistState) : (task.checklistState || [])
  );
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState(task.blockedReason || '');
  const [waitingOn, setWaitingOn] = useState(task.waitingOn || '');
  
  const [dueDate, setDueDate] = useState<string>(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    const res = await updateBDTaskStatus(task.id, newStatus);
    if (res.success) onTaskUpdated();
  };

  const handleChecklistToggle = async (itemId: string, checked: boolean) => {
    const newList = checklist.map(item => 
      item.id === itemId ? { ...item, checked } : item
    );
    setChecklist(newList);
    await updateBDTaskChecklist(task.id, newList);
    // Don't call onTaskUpdated here to avoid jumpy UI, we just silently update backend
  };

  const handleDueDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDueDate(val);
    await updateBDTaskDueDate(task.id, val ? new Date(val) : null);
    onTaskUpdated();
  };

  const handleBlockSubmit = async () => {
    const res = await blockBDTask(task.id, blockReason, waitingOn);
    if (res.success) {
      setShowBlockModal(false);
      onTaskUpdated();
    }
  };

  const handleUnblock = async () => {
    const res = await unblockBDTask(task.id);
    if (res.success) onTaskUpdated();
  };

  const handleClaim = async () => {
    const res = await claimBDTask(task.id);
    if (res.success) {
      onTaskUpdated();
    } else {
      alert(res.error || 'Failed to claim task');
    }
  };

  const handleRelease = async () => {
    if (!confirm('Are you sure you want to release this task?')) return;
    const res = await releaseBDTask(task.id);
    if (res.success) {
      onTaskUpdated();
    } else {
      alert(res.error || 'Failed to release task');
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${task.status === 'COMPLETED' ? 'bg-green-50/50 border-green-200' : task.status === 'SKIPPED' ? 'bg-gray-100 border-gray-200 opacity-75' : task.blockedReason ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Left Side: Index & Name */}
        <div className="flex gap-3 flex-1">
          <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${task.status === 'COMPLETED' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
            {task.orderIndex}
          </div>
          <div className="flex-1">
            <h4 className={`font-medium text-lg ${task.status === 'COMPLETED' || task.status === 'SKIPPED' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
              {task.name}
            </h4>
            
            {/* Blocked Badge */}
            {task.blockedReason && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 rounded-md text-sm border border-red-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <span>Blocked: {task.blockedReason} (Waiting on: {task.waitingOn})</span>
              </div>
            )}

            {/* Checklist */}
            {checklist && checklist.length > 0 && (
              <div className="mt-4 space-y-2">
                {checklist.map((item, idx) => (
                  <label key={idx} className={`flex items-start gap-2 text-sm ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    <input 
                      type="checkbox" 
                      className="mt-1 rounded text-red-600 focus:ring-red-500"
                      checked={item.checked}
                      onChange={(e) => handleChecklistToggle(item.id, e.target.checked)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Controls */}
        <div className="flex flex-col gap-3 min-w-[200px]">
          {task.assigneeId === null ? (
            <div className="flex flex-col gap-2 justify-center h-full">
              <span className="text-xs text-gray-500 italic text-center">งานยังไม่มีผู้รับผิดชอบ</span>
              <button 
                onClick={handleClaim}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-md text-sm transition-colors"
              >
                รับงาน (Claim)
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select 
                  value={task.status} 
                  onChange={handleStatusChange}
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 p-1.5 border"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="SKIPPED">SKIPPED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                <input 
                  type="date"
                  value={dueDate}
                  onChange={handleDueDateChange}
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 p-1.5 border"
                />
              </div>

              <div>
                {task.blockedReason ? (
                  <button 
                    onClick={handleUnblock}
                    className="w-full text-sm px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors font-medium"
                  >
                    Unblock
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowBlockModal(true)}
                    className="w-full text-sm px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded transition-colors font-medium"
                  >
                    Mark Blocked
                  </button>
                )}
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <button 
                  onClick={handleRelease}
                  className="w-full text-xs px-3 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  ปล่อยงาน (Release)
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Mark Task as Blocked</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for block</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-red-500"
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  placeholder="e.g., Waiting for client approval"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Waiting On (Person/Entity)</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-red-500"
                  value={waitingOn}
                  onChange={e => setWaitingOn(e.target.value)}
                  placeholder="e.g., John Doe"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleBlockSubmit}
                disabled={!blockReason}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
