"use client";

import React, { useState, useEffect } from 'react';
import { getBDProjectDetails, acceptBDProject, getBDWorkflowTemplates, updateBDProject, addBDComment, claimBDBrief, releaseBDBrief, createBDTask, getAllUsersForBD } from '@/app/actions/bd';
import Link from 'next/link';
import BDTaskItem from './BDTaskItem';
import { useRouter } from 'next/navigation';

export default function BDProjectDetailView({ id, isModal = false, onClose }: { id: string; isModal?: boolean; onClose?: () => void }) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showAutoCompletePrompt, setShowAutoCompletePrompt] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [commentText, setCommentText] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Add Task Modal State
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskChecklist, setNewTaskChecklist] = useState<string[]>([]);
  const [newChecklistItemText, setNewChecklistItemText] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const loadData = async () => {
    const res = await getBDProjectDetails(id);
    if (res.success && res.data) {
      setProject(res.data);
      checkAutoCompleteConditions(res.data);
    } else {
      setError(res.error || 'Failed to load project details');
    }
    setLoading(false);
    
    const tRes = await getBDWorkflowTemplates();
    if (tRes.success && tRes.data) {
      setTemplates(tRes.data);
    }

    const uRes = await getAllUsersForBD();
    if (uRes.success && uRes.data) {
      setAllUsers(uRes.data);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const checkAutoCompleteConditions = (projData: any) => {
    if (!projData.tasks || projData.tasks.length === 0) return;
    if (projData.status === 'COMPLETED' || projData.status === 'ON_HOLD') return;

    const allFinished = projData.tasks.every((t: any) => t.status === 'COMPLETED' || t.status === 'SKIPPED');
    const noBlocked = projData.tasks.every((t: any) => !t.blockedReason);

    if (allFinished && noBlocked) {
      setShowAutoCompletePrompt(true);
    }
  };

  const handleCompleteProject = async () => {
    // Check sub-projects first
    if (project.subProjects && project.subProjects.length > 0) {
      const incomplete = project.subProjects.filter((sp: any) => sp.status !== 'COMPLETED');
      if (incomplete.length > 0) {
        alert(`Cannot complete this project. There are ${incomplete.length} incomplete sub-projects.`);
        return;
      }
    }

    const res = await updateBDProject(id, { status: 'COMPLETED' });
    if (res.success) {
      setShowAutoCompletePrompt(false);
      loadData();
    } else {
      alert(res.error || 'Failed to complete project');
    }
  };

  const handleAccept = async () => {
    const res = await acceptBDProject(id, selectedTemplateId || undefined);
    if (res.success) {
      // Reload project details
      setLoading(true);
      const projRes = await getBDProjectDetails(id);
      if (projRes.success && projRes.data) setProject(projRes.data);
      setLoading(false);
      setShowAcceptModal(false);
    } else {
      alert(res.error || 'Failed to accept project');
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    const res = await addBDComment(id, commentText);
    if (res.success) {
      setCommentText('');
      loadData();
    }
  };

  const handleClaimBrief = async () => {
    const res = await claimBDBrief(id);
    if (res.success) {
      loadData();
      // Auto open accept modal after claiming
      setSelectedTemplateId(project.workType?.defaultTemplateId || '');
      setShowAcceptModal(true);
    } else {
      alert(res.error || 'Failed to claim brief');
    }
  };

  const handleReleaseBrief = async () => {
    if (!confirm('Are you sure you want to release this brief back to the pool?')) return;
    const res = await releaseBDBrief(id);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || 'Failed to release brief');
    }
  };

  const startEdit = () => {
    setEditForm({
      name: project.name,
      objective: project.objective,
      urgency: project.urgency,
      deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
      intakeDate: project.intakeDate ? new Date(project.intakeDate).toISOString().split('T')[0] : '',
      color: project.color || '#ffffff',
      memberIds: project.members ? project.members.map((m: any) => m.id) : []
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    const res = await updateBDProject(id, {
      name: editForm.name,
      objective: editForm.objective,
      urgency: editForm.urgency,
      deadline: editForm.deadline ? new Date(editForm.deadline) : null,
      intakeDate: editForm.intakeDate ? new Date(editForm.intakeDate) : null,
      color: editForm.color !== '#ffffff' ? editForm.color : null,
      memberIds: editForm.memberIds,
    });
    setSavingEdit(false);
    
    if (res.success) {
      setIsEditing(false);
      loadData();
    } else {
      alert(res.error || 'Failed to update project');
    }
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;
    setAddingTask(true);
    
    const checklistPayload = newTaskChecklist.length > 0 ? newTaskChecklist.map((label, idx) => ({
      id: `chk_${Date.now()}_${idx}`,
      label,
      checked: false
    })) : undefined;

    const res = await createBDTask(id, newTaskName, checklistPayload);
    setAddingTask(false);
    if (res.success) {
      setShowAddTaskModal(false);
      setNewTaskName('');
      setNewTaskChecklist([]);
      setNewChecklistItemText('');
      loadData();
    } else {
      alert(res.error || 'Failed to add task');
    }
  };

  if (loading) return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;
  if (error || !project) return <div className="p-8 text-center text-red-500">{error || 'ไม่พบข้อมูลโครงการ'}</div>;

  const getResponsibleText = () => {
    const allRes = [];
    if (project.owner) allRes.push(project.owner.fullName + ' (Lead)');
    if (project.members) {
      project.members.forEach((m: any) => {
        if (m.id !== project.ownerId) {
          allRes.push(m.fullName);
        }
      });
    }
    return allRes.length > 0 ? allRes.join(', ') : 'ยังไม่กำหนด (Unassigned)';
  };

  return (
    <div className={`${isModal ? 'p-4 md:p-6' : 'min-h-screen bg-gray-50 p-6 md:p-8'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {!isModal && (
                <Link href="/bd/dashboard" className="text-sm text-gray-500 hover:text-red-600 transition-colors">&larr; กลับหน้าแดชบอร์ด</Link>
              )}
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider
                ${project.status === 'PENDING_REVIEW' ? 'bg-gray-100 text-gray-800 border border-gray-200' : ''}
                ${project.status === 'IN_PROGRESS' ? 'bg-red-100 text-red-800' : ''}
                ${project.status === 'ON_HOLD' ? 'bg-white text-red-600 border border-red-200' : ''}
                ${project.status === 'COMPLETED' ? 'bg-gray-800 text-white' : ''}
              `}>
                {project.status.replace('_', ' ')}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                ${project.urgency === 'Urgent' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}
              `}>
                {project.urgency}
              </span>
            </div>
            
            {project.parent && (
              <div className="mb-2">
                <span className="text-sm text-gray-500">โครงการย่อยของ: </span>
                <Link href={`/bd/projects/${project.parent.id}`} className="text-sm font-medium text-red-600 hover:underline">
                  {project.parent.name}
                </Link>
              </div>
            )}
            
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-500 text-sm mt-1">ผู้ร้องขอ: <span className="font-medium text-gray-700">{project.requester?.fullName}</span> | ประเภทงาน: <span className="font-medium text-gray-700">{project.workType?.name}</span> | ผู้รับผิดชอบ: <span className="font-medium text-gray-700">{getResponsibleText()}</span></p>
          </div>
          
          <div className="flex gap-2">
             <button onClick={startEdit} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">แก้ไขรายละเอียด</button>
             {project.ownerId === null && (
               <button 
                 onClick={handleClaimBrief}
                 className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
               >
                 {project.status === 'PENDING_REVIEW' ? 'รับบรีฟ (Claim)' : 'รับเป็นผู้รับผิดชอบ (Claim Project)'}
               </button>
             )}
             {project.status === 'PENDING_REVIEW' && project.ownerId !== null && (
               <>
                 <button 
                   onClick={() => {
                     setSelectedTemplateId(project.workType?.defaultTemplateId || '');
                     setShowAcceptModal(true);
                   }}
                   className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                 >
                   รับบรีฟ
                 </button>
                 <button 
                   onClick={handleReleaseBrief}
                   className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                 >
                   ปล่อยงาน (Release)
                 </button>
               </>
             )}
             {isModal && onClose && (
               <button 
                 onClick={onClose}
                 className="ml-2 px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
               </button>
             )}
          </div>
        </div>

        {project.status === 'ON_HOLD' && project.blockedReason && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">โครงการถูกระงับชั่วคราว</h3>
                <div className="mt-1 text-sm text-red-700">
                  <p><strong>เหตุผล:</strong> {project.blockedReason}</p>
                  <p><strong>รอจาก:</strong> {project.waitingOn || 'บุคคลภายนอก'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">วัตถุประสงค์ / รายละเอียด</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{project.objective}</p>
            </div>

            {/* Sub-projects Section */}
            {(!project.parent) && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">โครงการย่อย (Sub-projects)</h2>
                  <Link 
                    href={`/bd/intake?parentId=${project.id}`}
                    className="text-sm text-red-600 font-medium hover:underline bg-red-50 px-3 py-1.5 rounded-lg"
                  >
                    + เพิ่มโครงการย่อย
                  </Link>
                </div>
                
                {project.subProjects && project.subProjects.length > 0 ? (
                  <div className="space-y-3">
                    {project.subProjects.map((sp: any) => (
                      <Link key={sp.id} href={`/bd/projects/${sp.id}`} className="block">
                        <div className="border border-gray-200 rounded-lg p-4 hover:border-red-300 hover:shadow-sm transition-all bg-gray-50 flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{sp.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">ผู้รับผิดชอบ: {sp.owner?.fullName || 'ยังไม่กำหนด'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider
                            ${sp.status === 'PENDING_REVIEW' ? 'bg-gray-100 text-gray-800 border border-gray-200' : ''}
                            ${sp.status === 'IN_PROGRESS' ? 'bg-red-100 text-red-800' : ''}
                            ${sp.status === 'ON_HOLD' ? 'bg-white text-red-600 border border-red-200' : ''}
                            ${sp.status === 'COMPLETED' ? 'bg-gray-800 text-white' : ''}
                          `}>
                            {sp.status.replace('_', ' ')}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    ยังไม่มีโครงการย่อย
                  </div>
                )}
              </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                <span>ขั้นตอนการทำงาน (Workflow & Tasks)</span>
                <button onClick={() => setShowAddTaskModal(true)} className="text-sm text-red-600 font-medium hover:underline">+ เพิ่มงาน</button>
              </h2>
              
              {project.tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  ยังไม่มีการเลือกเทมเพลตงาน
                </div>
              ) : (
                <div className="space-y-3">
                  {project.tasks.map((task: any) => (
                    <BDTaskItem key={task.id} task={task} onTaskUpdated={loadData} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">บันทึกกิจกรรม (Activity Log)</h2>
              
              <div className="space-y-4">
                {project.activities.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">ยังไม่มีกิจกรรม</p>
                ) : (
                  <div className="flow-root max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    <ul role="list" className="-mb-8">
                      {project.activities.map((activity: any, activityIdx: number) => (
                        <li key={activity.id}>
                          <div className="relative pb-8">
                            {activityIdx !== project.activities.length - 1 ? (
                              <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                            ) : null}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center ring-8 ring-white">
                                  <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              </div>
                              <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                <div>
                                  <p className="text-sm text-gray-500">
                                    <span className="font-medium text-gray-900">{activity.user.fullName}</span> {activity.action.replace('_', ' ').toLowerCase()}
                                  </p>
                                  {activity.details && (
                                    <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">{activity.details}</p>
                                  )}
                                </div>
                                <div className="whitespace-nowrap text-right text-xs text-gray-500">
                                  {new Date(activity.createdAt).toLocaleDateString('th-TH')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="mt-6 border-t border-gray-100 pt-4">
                <textarea 
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none" 
                  placeholder="เพิ่มความคิดเห็น หรืออัปเดตงาน..."
                  rows={2}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                ></textarea>
                <button 
                  onClick={handlePostComment}
                  disabled={!commentText.trim()}
                  className="mt-2 w-full bg-red-50 text-red-700 font-medium py-2 rounded-lg text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  ส่งความคิดเห็น
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Accept Brief Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">รับมอบหมายงาน (Accept Brief)</h2>
            <p className="text-sm text-gray-500 mb-6">กรุณาเลือก Workflow Template เพื่อสร้างรายการงาน (Tasks) สำหรับโครงการนี้</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Template</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">-- ไม่ใช้ Template (สร้างงานเองภายหลัง) --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleAccept}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                ยืนยันการรับงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">แก้ไขรายละเอียดโครงการ</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโครงการ</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วัตถุประสงค์ / รายละเอียด</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 outline-none h-32"
                  value={editForm.objective}
                  onChange={e => setEditForm({...editForm, objective: e.target.value})}
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ความเร่งด่วน</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    value={editForm.urgency}
                    onChange={e => setEditForm({...editForm, urgency: e.target.value})}
                  >
                    <option value="Normal">ปกติ</option>
                    <option value="High">ด่วน</option>
                    <option value="Urgent">ด่วนมาก</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่รับงาน (Intake Date)</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    value={editForm.intakeDate}
                    onChange={e => setEditForm({...editForm, intakeDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">กำหนดส่ง (Deadline)</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    value={editForm.deadline}
                    onChange={e => setEditForm({...editForm, deadline: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">สีการ์ด (Card Color)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      value={editForm.color || '#ffffff'}
                      onChange={e => setEditForm({...editForm, color: e.target.value})}
                    />
                    <span className="text-sm text-gray-500 uppercase">{editForm.color || '#FFFFFF'}</span>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">สมาชิกในทีม (Team Members)</label>
                  <p className="text-xs text-gray-500 mb-2">เลือกผู้ที่มีส่วนร่วมหรือรับผิดชอบในโครงการนี้ (นอกเหนือจาก Project Lead)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                    {allUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input 
                          type="checkbox"
                          className="rounded text-red-600 focus:ring-red-500"
                          checked={editForm.memberIds?.includes(u.id) || false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditForm({...editForm, memberIds: [...(editForm.memberIds || []), u.id]});
                            } else {
                              setEditForm({...editForm, memberIds: (editForm.memberIds || []).filter((id: string) => id !== u.id)});
                            }
                          }}
                        />
                        <span className="truncate">{u.fullName}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                disabled={savingEdit}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Complete Prompt Modal */}
      {showAutoCompletePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md border-t-4 border-green-500">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-center mb-2">งานทั้งหมดเสร็จสิ้นแล้ว!</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              งาน (Tasks) ในโครงการนี้ได้รับการดำเนินการ (Completed/Skipped) หมดแล้ว และไม่มีงานใดที่ถูก Block<br/>คุณต้องการปิดโครงการนี้เป็น <strong>COMPLETED</strong> เลยหรือไม่?
            </p>

            <div className="mt-8 flex justify-center gap-3">
              <button 
                onClick={() => setShowAutoCompletePrompt(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                ยังไม่ปิด (เก็บไว้ก่อน)
              </button>
              <button 
                onClick={handleCompleteProject}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                ยืนยันปิดโครงการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">เพิ่มงานใหม่</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่องาน (Task Name)</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  placeholder="เช่น ระบุเป้าหมายการดำเนินงาน"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); }}
                />
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">รายการเช็คลิสต์ย่อย (Checklist) - ทางเลือก</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
                    value={newChecklistItemText}
                    onChange={e => setNewChecklistItemText(e.target.value)}
                    placeholder="เช่น ตรวจสอบเอกสาร..."
                    onKeyDown={e => { 
                      if (e.key === 'Enter' && newChecklistItemText.trim()) {
                        e.preventDefault();
                        setNewTaskChecklist([...newTaskChecklist, newChecklistItemText.trim()]);
                        setNewChecklistItemText('');
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newChecklistItemText.trim()) {
                        setNewTaskChecklist([...newTaskChecklist, newChecklistItemText.trim()]);
                        setNewChecklistItemText('');
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-200"
                  >
                    + เพิ่ม
                  </button>
                </div>
                {newTaskChecklist.length > 0 && (
                  <ul className="space-y-2 mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-60 overflow-y-auto custom-scrollbar">
                    {newTaskChecklist.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          {item}
                        </div>
                        <button 
                          type="button"
                          onClick={() => setNewTaskChecklist(newTaskChecklist.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddTaskModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                disabled={addingTask}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleAddTask}
                disabled={addingTask || !newTaskName.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {addingTask ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
