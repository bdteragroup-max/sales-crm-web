"use client";

import React, { useState } from 'react';
import { updateBDTaskStatus, updateBDTaskChecklist, updateBDTaskDueDate, blockBDTask, unblockBDTask, claimBDTask, releaseBDTask, updateBDTaskName, deleteBDTask } from '@/app/actions/bd';

export default function BDTaskItem({ task, onTaskUpdated }: { task: any, onTaskUpdated: () => void }) {
  const [checklist, setChecklist] = useState<any[]>(
    typeof task.checklistState === 'string' ? JSON.parse(task.checklistState) : (task.checklistState || [])
  );
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState(task.blockedReason || '');
  const [waitingOn, setWaitingOn] = useState(task.waitingOn || '');
  
  const [dueDate, setDueDate] = useState<string>(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [releasingTask, setReleasingTask] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(task.name);
  
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);

  const handleSaveName = async () => {
    if (!editNameValue.trim() || editNameValue === task.name) {
      setIsEditingName(false);
      setEditNameValue(task.name);
      return;
    }
    const res = await updateBDTaskName(task.id, editNameValue);
    if (res.success) {
      setIsEditingName(false);
      onTaskUpdated();
    } else {
      alert(res.error || 'Failed to update task name');
    }
  };

  const handleDeleteTask = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTask = async () => {
    setDeletingTask(true);
    const res = await deleteBDTask(task.id);
    setDeletingTask(false);
    if (res.success) {
      setShowDeleteConfirm(false);
      onTaskUpdated();
    } else {
      alert(res.error || 'Failed to delete task');
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    const res = await updateBDTaskStatus(task.id, newStatus);
    if (res.success) onTaskUpdated();
  };

  const autoUpdateStatusBasedOnChecklist = async (newChecklist: any[]) => {
    if (!newChecklist || newChecklist.length === 0) return;
    
    const allChecked = newChecklist.every(item => item.checked);
    const someChecked = newChecklist.some(item => item.checked);
    
    let newStatus = task.status;
    if (allChecked) newStatus = 'COMPLETED';
    else if (someChecked) newStatus = 'IN_PROGRESS';
    else newStatus = 'PENDING';

    if (newStatus !== task.status && task.status !== 'SKIPPED') {
      await updateBDTaskStatus(task.id, newStatus);
      onTaskUpdated();
    }
  };

  const handleChecklistToggle = async (itemId: string, checked: boolean) => {
    const newChecklist = checklist.map(item => item.id === itemId ? { ...item, checked } : item);
    setChecklist(newChecklist);
    const res = await updateBDTaskChecklist(task.id, newChecklist);
    if (!res.success) {
      alert(res.error || 'Failed to update checklist');
      return;
    }
    await autoUpdateStatusBasedOnChecklist(newChecklist);
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim()) return;
    const newItem = {
      id: `chk_${Date.now()}`,
      label: newChecklistItem.trim(),
      checked: false
    };
    const newChecklist = [...(checklist || []), newItem];
    setChecklist(newChecklist);
    setNewChecklistItem('');
    setIsAddingChecklist(false);
    
    const res = await updateBDTaskChecklist(task.id, newChecklist);
    if (!res.success) {
      alert(res.error || 'Failed to update checklist');
      return;
    }
    await autoUpdateStatusBasedOnChecklist(newChecklist);
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    const newChecklist = checklist.filter(item => item.id !== itemId);
    setChecklist(newChecklist);
    const res = await updateBDTaskChecklist(task.id, newChecklist);
    if (!res.success) {
      alert(res.error || 'Failed to update checklist');
      return;
    }
    await autoUpdateStatusBasedOnChecklist(newChecklist);
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

  const handleRelease = () => {
    setShowReleaseConfirm(true);
  };

  const confirmRelease = async () => {
    setReleasingTask(true);
    const res = await releaseBDTask(task.id);
    setReleasingTask(false);
    if (res.success) {
      setShowReleaseConfirm(false);
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
            <div className="flex items-center gap-2 group">
              {isEditingName ? (
                <div className="flex items-center gap-2 w-full max-w-sm">
                  <input
                    type="text"
                    value={editNameValue}
                    onChange={e => setEditNameValue(e.target.value)}
                    className="flex-1 border border-gray-300 rounded p-1 text-sm outline-none focus:border-red-500"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setIsEditingName(false);
                        setEditNameValue(task.name);
                      }
                    }}
                  />
                  <button onClick={handleSaveName} className="text-green-600 hover:text-green-700 font-medium text-sm">Save</button>
                  <button onClick={() => { setIsEditingName(false); setEditNameValue(task.name); }} className="text-gray-500 hover:text-gray-700 font-medium text-sm">Cancel</button>
                </div>
              ) : (
                <>
                  <h4 className={`font-medium text-lg ${task.status === 'COMPLETED' || task.status === 'SKIPPED' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {task.name}
                  </h4>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={() => setIsEditingName(true)} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded" title="Edit Task Name">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button onClick={handleDeleteTask} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete Task">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {/* Blocked Badge */}
            {task.blockedReason && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 rounded-md text-sm border border-red-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <span>ติดปัญหา: {task.blockedReason} (รอ: {task.waitingOn})</span>
              </div>
            )}

            {/* Checklist */}
            <div className="mt-4">
              {checklist && checklist.length > 0 && (
                <div className="space-y-2 mb-2">
                  {checklist.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start group/chk">
                      <label className={`flex items-start gap-2 text-sm ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        <input 
                          type="checkbox" 
                          className="mt-1 rounded text-red-600 focus:ring-red-500"
                          checked={item.checked}
                          onChange={(e) => handleChecklistToggle(item.id, e.target.checked)}
                        />
                        <span>{item.label}</span>
                      </label>
                      <button 
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="opacity-0 group-hover/chk:opacity-100 text-gray-400 hover:text-red-500 transition-opacity ml-2"
                        title="Delete item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {isAddingChecklist ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder="เพิ่มรายการ..."
                    className="flex-1 text-sm border-gray-300 rounded p-1 focus:ring-red-500 focus:border-red-500 border outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddChecklistItem();
                      if (e.key === 'Escape') setIsAddingChecklist(false);
                    }}
                  />
                  <button onClick={handleAddChecklistItem} className="text-sm font-medium text-green-600 hover:text-green-700">Save</button>
                  <button onClick={() => setIsAddingChecklist(false)} className="text-sm font-medium text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingChecklist(true)}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium flex items-center gap-1 mt-1 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  เพิ่มเช็คลิสต์ (Add Item)
                </button>
              )}
            </div>
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
                    ปลดบล็อค (Unblock)
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowBlockModal(true)}
                    className="w-full text-sm px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded transition-colors font-medium"
                  >
                    ระบุว่าติดปัญหา (Mark Blocked)
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
            <h2 className="text-xl font-bold mb-4">ระบุว่างานติดปัญหา (Blocked)</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สาเหตุที่ติดปัญหา</label>
                <input 
                  type="text"
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  placeholder="เช่น รอการอนุมัติจากลูกค้า"
                  className="w-full border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 p-2 border"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รอผู้ใด/หน่วยงานใด</label>
                <input 
                  type="text"
                  value={waitingOn}
                  onChange={e => setWaitingOn(e.target.value)}
                  placeholder="เช่น แผนกบัญชี, ลูกค้า"
                  className="w-full border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 p-2 border"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleBlockSubmit();
                  }}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleBlockSubmit}
                disabled={!blockReason}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="p-2 bg-red-100 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">ลบงานนี้?</h2>
            </div>
            
            <p className="text-gray-600 text-sm mb-6">
              คุณแน่ใจหรือไม่ว่าต้องการลบงาน <strong>"{task.name}"</strong>? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                disabled={deletingTask}
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmDeleteTask}
                disabled={deletingTask}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {deletingTask ? 'กำลังลบ...' : 'ลบงาน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release Confirmation Modal */}
      {showReleaseConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4 text-orange-600">
              <div className="p-2 bg-orange-100 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">ปล่อยงานนี้?</h2>
            </div>
            
            <p className="text-gray-600 text-sm mb-6">
              คุณแน่ใจหรือไม่ว่าต้องการปล่อยงาน <strong>"{task.name}"</strong> กลับไปให้คนอื่นรับผิดชอบแทน?
            </p>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowReleaseConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                disabled={releasingTask}
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmRelease}
                disabled={releasingTask}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
              >
                {releasingTask ? 'กำลังปล่อยงาน...' : 'ยืนยันปล่อยงาน'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
