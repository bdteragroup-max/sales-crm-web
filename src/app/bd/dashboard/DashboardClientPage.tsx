"use client";

import React, { useState, useEffect } from 'react';
import { getBDProjects, deleteBDProject, updateBDProject, getAllUsersForBD } from '@/app/actions/bd';
import Link from 'next/link';

export default function DashboardClientPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // All, My Pending Cases
  const [selectedOwner, setSelectedOwner] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ name: '', urgency: '', status: '', completedAt: '' });
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    const res = await deleteBDProject(projectToDelete);
    if (res.success) {
      setProjects(projects.filter(p => p.id !== projectToDelete));
      setProjectToDelete(null);
    } else {
      alert(res.error || 'Failed to delete');
    }
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    let completedAtStr = '';
    if (project.completedAt) {
      completedAtStr = new Date(project.completedAt).toISOString().split('T')[0];
    } else if (project.status === 'COMPLETED') {
      completedAtStr = new Date().toISOString().split('T')[0];
    }
    setEditFormData({ name: project.name, urgency: project.urgency, status: project.status, completedAt: completedAtStr });
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;
    const payload: any = { ...editFormData };
    if (payload.status === 'COMPLETED') {
      payload.completedAt = payload.completedAt ? new Date(payload.completedAt) : new Date();
    } else {
      payload.completedAt = null;
    }
    const res = await updateBDProject(editingProject.id, payload);
    if (res.success) {
      setProjects(projects.map(p => p.id === editingProject.id ? { ...p, ...payload } : p));
      setEditingProject(null);
    } else {
      alert(res.error || 'Failed to update');
    }
  };

  // Mock user ID for filtering "My Pending Cases". In real app, get from session.
  const mockCurrentUserId = 'clk8xxx';

  useEffect(() => {
    async function loadData() {
      const res = await getBDProjects();
      if (res.success && res.data) {
        setProjects(res.data);
      }
      
      const usersRes = await getAllUsersForBD();
      if (usersRes.success && usersRes.data) {
        // Just show users who are BD or Managers
        setTeamMembers(usersRes.data.filter((u: any) => 
          ['Business Development', 'BD Intern', 'ผู้จัดการ', 'Admin', 'SUPER_ADMIN'].includes(u.role)
        ));
      }
      
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredProjects = projects.filter(p => {
    if (filter === 'All') {
      // Do nothing, proceed to search filter
    } else if (filter === 'My Pending Cases') {
      // Logic: project owner is me OR a pending task is assigned to me
      const isOwner = p.ownerId === mockCurrentUserId;
      const hasMyTask = p.tasks.some((t: any) => t.assigneeId === mockCurrentUserId && t.status === 'PENDING');
      if (!isOwner && !hasMyTask) return false;
    } else if (filter === 'Unclaimed Briefs') {
      if (p.status !== 'PENDING_REVIEW' || p.ownerId !== null) return false;
    } else if (filter === 'Unclaimed Tasks') {
      if (p.status !== 'IN_PROGRESS') return false;
      const hasUnclaimedTask = p.tasks.some((t: any) => t.assigneeId === null && t.status === 'PENDING');
      if (!hasUnclaimedTask) return false;
    }

    if (selectedOwner !== 'All') {
      const isOwner = p.ownerId === selectedOwner;
      const isMember = p.members?.some((m: any) => m.id === selectedOwner);
      if (!isOwner && !isMember) return false;
    }

    if (searchQuery) {
      if (!p.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.workType?.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ดโครงการพัฒนาธุรกิจ (BD)</h1>
            <p className="text-gray-500 text-sm mt-1">ภาพรวมโครงการและการดำเนินงานพัฒนาธุรกิจทั้งหมด</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="ค้นหาโครงการ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none w-full md:w-48 lg:w-64"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none whitespace-nowrap"
            >
              <option value="All">โครงการทั้งหมด</option>
              <option value="My Pending Cases">งานที่รอฉันดำเนินการ</option>
              <option value="Unclaimed Briefs">บรีฟที่ว่าง (Unclaimed Briefs)</option>
              <option value="Unclaimed Tasks">งานที่ว่าง (Unclaimed Tasks)</option>
            </select>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none whitespace-nowrap"
            >
              <option value="All">ผู้รับผิดชอบทั้งหมด</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.fullName}</option>
              ))}
            </select>
            <Link
              href="/bd/intake"
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              สร้างงานใหม่ (Brief)
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                  <th className="p-4 font-semibold">ชื่อโครงการ</th>
                  <th className="p-4 font-semibold">ประเภท</th>
                  <th className="p-4 font-semibold">สถานะ</th>
                  <th className="p-4 font-semibold">ความเร่งด่วน</th>
                  <th className="p-4 font-semibold">งานถัดไป / รออยู่ที่</th>
                  <th className="p-4 font-semibold text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      ไม่พบโครงการ
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project) => {
                    // Find the next pending task
                    const pendingTask = project.tasks.find((t: any) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');

                    return (
                      <tr key={project.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="p-4">
                          <Link href={`/bd/projects/${project.id}`} className="font-medium text-red-600 hover:underline">
                            {project.name}
                          </Link>
                          <div className="text-xs text-gray-500 mt-1">ผู้ร้องขอ: {project.requester?.fullName}</div>
                        </td>
                        <td className="p-4 text-sm text-gray-700">
                          {project.workType?.name}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium 
                            ${project.status === 'PENDING_REVIEW' ? 'bg-white border border-gray-300 text-gray-600' : ''}
                            ${project.status === 'IN_PROGRESS' ? 'bg-red-100 text-red-800' : ''}
                            ${project.status === 'ON_HOLD' ? 'bg-gray-200 text-gray-800' : ''}
                            ${project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ''}
                          `}>
                            {project.status === 'PENDING_REVIEW' ? 'รอการพิจารณา' :
                              project.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' :
                                project.status === 'ON_HOLD' ? 'ระงับชั่วคราว' :
                                  project.status === 'COMPLETED' ? 'เสร็จสิ้น' : project.status.replace('_', ' ')}
                          </span>

                          {(() => {
                            const firstBlockedTask = project.tasks?.find((t: any) => t.blockedReason);
                            if (firstBlockedTask) {
                              return (
                                <div className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                  ติดปัญหา: {firstBlockedTask.name} ({firstBlockedTask.waitingOn || 'ภายนอก'})
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td className="p-4">
                          <span className={`text-sm font-medium
                            ${project.urgency === 'Urgent' ? 'text-red-600' : ''}
                            ${project.urgency === 'High' ? 'text-orange-500' : ''}
                            ${project.urgency === 'Normal' ? 'text-gray-600' : ''}
                          `}>
                            {project.urgency === 'Urgent' ? 'ด่วนมาก' :
                              project.urgency === 'High' ? 'ด่วน' :
                                project.urgency === 'Normal' ? 'ปกติ' : project.urgency}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-700">
                          {pendingTask ? (
                            <div>
                              <div className="font-medium">{pendingTask.name}</div>
                              <div className="text-xs text-gray-500 mt-1">ผู้รับผิดชอบ: {pendingTask.assignee?.fullName || 'ยังไม่ระบุ'}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">ไม่มีงานค้าง</span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button 
                            onClick={() => handleEdit(project)}
                            className="text-gray-500 hover:text-blue-600 transition-colors p-1"
                            title="แก้ไข"
                          >
                            <svg className="w-5 h-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button 
                            onClick={() => setProjectToDelete(project.id)}
                            className="text-gray-500 hover:text-red-600 transition-colors p-1"
                            title="ลบ"
                          >
                            <svg className="w-5 h-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">แก้ไขโครงการ</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโครงการ</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  value={editFormData.name}
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  value={editFormData.status}
                  onChange={e => setEditFormData({...editFormData, status: e.target.value})}
                >
                  <option value="PENDING_REVIEW">รอการพิจารณา</option>
                  <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                  <option value="ON_HOLD">ระงับชั่วคราว</option>
                  <option value="COMPLETED">เสร็จสิ้น</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ความเร่งด่วน</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  value={editFormData.urgency}
                  onChange={e => setEditFormData({...editFormData, urgency: e.target.value})}
                >
                  <option value="Normal">ปกติ</option>
                  <option value="High">ด่วน</option>
                  <option value="Urgent">ด่วนมาก</option>
                </select>
              </div>

              {editFormData.status === 'COMPLETED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เสร็จสิ้น</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    value={editFormData.completedAt}
                    onChange={e => setEditFormData({...editFormData, completedAt: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {projectToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">ลบโครงการ</h2>
            <p className="text-gray-500 text-sm mb-6">คุณแน่ใจหรือไม่ที่จะลบโครงการนี้? การดำเนินการนี้ไม่สามารถยกเลิกได้และจะลบข้อมูลที่เกี่ยวข้องทั้งหมด</p>
            
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium flex-1"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex-1"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
