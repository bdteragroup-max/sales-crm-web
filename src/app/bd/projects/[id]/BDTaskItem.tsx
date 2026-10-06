"use client";

import React, { useState } from 'react';
import { 
  updateBDTaskStatus, 
  updateBDTaskChecklist, 
  updateBDTaskDueDate, 
  blockBDTask, 
  unblockBDTask, 
  claimBDTask, 
  releaseBDTask, 
  updateBDTaskName, 
  deleteBDTask 
} from '@/app/actions/bd';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Check, 
  X, 
  Trash2, 
  Edit3, 
  Calendar, 
  User, 
  Plus, 
  AlertCircle,
  CornerDownRight,
  ListTodo,
  CheckSquare
} from 'lucide-react';

export default function BDTaskItem({ task, onTaskUpdated }: { task: any; onTaskUpdated: () => void }) {
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

  const isCompleted = task.status === 'COMPLETED';
  const isSkipped = task.status === 'SKIPPED';
  const isBlocked = !!task.blockedReason;

  const totalChecklist = checklist.length;
  const checkedCount = checklist.filter(item => item.checked).length;
  const checklistPercent = totalChecklist > 0 ? Math.round((checkedCount / totalChecklist) * 100) : 0;

  return (
    <div className={`p-4 rounded-xl border transition-all duration-200 ${
      isCompleted 
        ? 'bg-gray-50/70 border-gray-200 text-gray-800' 
        : isSkipped 
          ? 'bg-gray-100/60 border-gray-200 opacity-70' 
          : isBlocked 
            ? 'bg-red-50/50 border-red-300' 
            : 'bg-white border-gray-200 hover:border-red-200 hover:shadow-xs'
    }`}>
      
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        {/* Left Side: Index & Name & Checklist */}
        <div className="flex gap-3 flex-1 min-w-0">
          <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors ${
            isCompleted 
              ? 'bg-red-600 border-red-600 text-white' 
              : isBlocked 
                ? 'bg-red-100 border-red-300 text-red-700' 
                : 'bg-gray-100 border-gray-200 text-gray-700'
          }`}>
            {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : task.orderIndex}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 group flex-wrap">
              {isEditingName ? (
                <div className="flex items-center gap-2 w-full max-w-md">
                  <input
                    type="text"
                    value={editNameValue}
                    onChange={e => setEditNameValue(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setIsEditingName(false);
                        setEditNameValue(task.name);
                      }
                    }}
                  />
                  <button 
                    onClick={handleSaveName} 
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                  >
                    บันทึก
                  </button>
                  <button 
                    onClick={() => { setIsEditingName(false); setEditNameValue(task.name); }} 
                    className="px-2 py-1 text-gray-600 hover:text-gray-800 text-xs font-medium"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <>
                  <h4 className={`font-semibold text-base break-words ${
                    isCompleted || isSkipped ? 'text-gray-500 line-through' : 'text-gray-900'
                  }`}>
                    {task.name}
                  </h4>

                  {/* Actions for editing task name & deleting */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button 
                      onClick={() => setIsEditingName(true)} 
                      className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors" 
                      title="แก้ไขชื่องาน"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={handleDeleteTask} 
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                      title="ลบงานนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Blocked Alert Banner */}
            {task.blockedReason && (
              <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-800 rounded-lg text-xs font-medium border border-red-200">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span><strong>ติดปัญหา:</strong> {task.blockedReason} {task.waitingOn ? `(รอ: ${task.waitingOn})` : ''}</span>
              </div>
            )}

            {/* Checklist Section */}
            <div className="mt-3">
              {totalChecklist > 0 && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span className="flex items-center gap-1 font-medium text-gray-600">
                      <ListTodo className="w-3.5 h-3.5 text-gray-400" /> เช็คลิสต์ย่อย
                    </span>
                    <span className="font-semibold text-gray-700">
                      {checkedCount}/{totalChecklist} ({checklistPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <div 
                      className="h-full bg-red-600 rounded-full transition-all duration-300"
                      style={{ width: `${checklistPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {checklist && checklist.length > 0 && (
                <div className="space-y-1.5 mb-2 pl-1">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex justify-between items-center group/chk py-0.5">
                      <label className={`flex items-center gap-2 text-sm cursor-pointer select-none transition-colors ${
                        item.checked ? 'text-gray-400 line-through' : 'text-gray-700 hover:text-gray-900'
                      }`}>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded text-red-600 border-gray-300 focus:ring-red-500 accent-red-600 cursor-pointer"
                          checked={item.checked}
                          onChange={(e) => handleChecklistToggle(item.id, e.target.checked)}
                        />
                        <span className="text-xs sm:text-sm">{item.label}</span>
                      </label>
                      <button 
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="opacity-0 group-hover/chk:opacity-100 text-gray-400 hover:text-red-600 transition-opacity p-0.5"
                        title="ลบรายการนี้"
                      >
                        <X className="w-3.5 h-3.5" />
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
                    placeholder="พิมพ์รายการเช็คลิสต์..."
                    className="flex-1 text-xs sm:text-sm border border-gray-300 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddChecklistItem();
                      if (e.key === 'Escape') setIsAddingChecklist(false);
                    }}
                  />
                  <button 
                    onClick={handleAddChecklistItem} 
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-medium transition-colors"
                  >
                    เพิ่ม
                  </button>
                  <button 
                    onClick={() => setIsAddingChecklist(false)} 
                    className="px-2 py-1 text-gray-500 hover:text-gray-700 text-xs font-medium"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingChecklist(true)}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 font-medium transition-colors mt-0.5"
                >
                  <Plus className="w-3 h-3" />
                  เพิ่มเช็คลิสต์ (Add Item)
                </button>
              )}
            </div>

            {/* Assignee Footer badge */}
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span>ผู้รับผิดชอบ: </span>
              {task.assignee ? (
                <span className="font-medium text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-xs">
                  {task.assignee.fullName}
                </span>
              ) : (
                <span className="italic text-gray-400">ยังไม่มีผู้รับผิดชอบ</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Symmetrical Task Control Panel */}
        <div className="flex flex-col gap-2.5 lg:w-48 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 pt-3 lg:pt-0 lg:pl-4 justify-between">
          {task.assigneeId === null ? (
            <div className="flex flex-col gap-2 justify-center h-full py-1">
              <span className="text-xs text-gray-500 italic text-center">ยังไม่มีผู้รับผิดชอบ</span>
              <button 
                onClick={handleClaim}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-3 rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                รับงาน (Claim)
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">สถานะ</label>
                <select 
                  value={task.status} 
                  onChange={handleStatusChange}
                  className="w-full text-xs font-medium border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 p-1.5 bg-white text-gray-800 outline-none"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="SKIPPED">SKIPPED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">กำหนดส่ง</label>
                <div className="relative">
                  <input 
                    type="date"
                    value={dueDate}
                    onChange={handleDueDateChange}
                    className="w-full text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 p-1.5 bg-white text-gray-800 outline-none"
                  />
                </div>
              </div>

              <div className="pt-1 flex flex-col gap-1.5">
                {task.blockedReason ? (
                  <button 
                    onClick={handleUnblock}
                    className="w-full text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors font-medium border border-gray-200 flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-gray-600" />
                    ปลดบล็อค (Unblock)
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowBlockModal(true)}
                    className="w-full text-xs px-2.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    ระบุปัญหา (Block)
                  </button>
                )}

                <button 
                  onClick={handleRelease}
                  className="w-full text-[11px] px-2 py-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors text-center"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">ระบุว่างานติดปัญหา (Blocked)</h2>
                <p className="text-xs text-gray-500">แจ้งเตือนเพื่อนร่วมงานเกี่ยวกับอุปสรรค</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">สาเหตุที่ติดปัญหา</label>
                <input 
                  type="text"
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  placeholder="เช่น รอเอกสารอนุมัติ, ระบบภายนอกขัดข้อง"
                  className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 p-2.5 text-sm outline-none"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">รอผู้ใด / หน่วยงานใด</label>
                <input 
                  type="text"
                  value={waitingOn}
                  onChange={e => setWaitingOn(e.target.value)}
                  placeholder="เช่น ลูกค้า, ฝ่ายบัญชี, ผู้บริหาร"
                  className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 p-2.5 text-sm outline-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleBlockSubmit();
                  }}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button 
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleBlockSubmit}
                disabled={!blockReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium text-sm shadow-xs disabled:opacity-50"
              >
                บันทึกสถานะติดปัญหา
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">ลบงานนี้?</h2>
            </div>
            
            <p className="text-gray-600 text-sm mb-6">
              ต้องการลบงาน <strong className="text-gray-900">"{task.name}"</strong> หรือไม่? รายการและเช็คลิสต์จะถูกลบถาวร
            </p>

            <div className="flex justify-end gap-2.5">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm"
                disabled={deletingTask}
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmDeleteTask}
                disabled={deletingTask}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium text-sm shadow-xs disabled:opacity-50"
              >
                {deletingTask ? 'กำลังลบ...' : 'ยืนยันลบงาน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release Confirmation Modal */}
      {showReleaseConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">ปล่อยงานนี้?</h2>
            </div>
            
            <p className="text-gray-600 text-sm mb-6">
              ต้องการสละสิทธิ์รับผิดชอบงาน <strong className="text-gray-900">"{task.name}"</strong> กลับสู่รายการงานส่วนกลางหรือไม่?
            </p>

            <div className="flex justify-end gap-2.5">
              <button 
                onClick={() => setShowReleaseConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm"
                disabled={releasingTask}
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmRelease}
                disabled={releasingTask}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors font-medium text-sm shadow-xs disabled:opacity-50"
              >
                {releasingTask ? 'กำลังบันทึก...' : 'ยืนยันปล่อยงาน'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
