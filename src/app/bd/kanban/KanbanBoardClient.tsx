"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { Loader2, KanbanSquare, Plus } from 'lucide-react';
import Link from 'next/link';
import { getBDKanbanProjects, updateBDProject, acceptBDProject, getBDWorkflowTemplates } from '@/app/actions/bd';
import KanbanCard from './KanbanCard';
import SortableColumn from './SortableColumn';
import BDProjectDetailView from '../projects/[id]/BDProjectDetailView';

const COLUMNS = [
  { id: 'PENDING_REVIEW', title: 'รอการพิจารณา (Pending)' },
  { id: 'IN_PROGRESS', title: 'กำลังดำเนินการ (In Progress)' },
  { id: 'ON_HOLD', title: 'ระงับชั่วคราว (On Hold)' },
  { id: 'COMPLETED', title: 'เสร็จสิ้น (Completed)' },
];

export default function KanbanBoardClient({ currentUser }: { currentUser: any }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Accept Modal State
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [pendingAcceptProject, setPendingAcceptProject] = useState<any | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [accepting, setAccepting] = useState(false);

  // Detail Modal State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Active Drag State
  const [activeId, setActiveId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await getBDKanbanProjects();
      if (res.success) {
        setProjects(res.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    const res = await getBDWorkflowTemplates();
    if (res.success && res.data) {
      setTemplates(res.data);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchTemplates();
  }, [fetchProjects, fetchTemplates]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columnsData = useMemo(() => {
    const data: Record<string, any[]> = {
      PENDING_REVIEW: [],
      IN_PROGRESS: [],
      ON_HOLD: [],
      COMPLETED: []
    };

    projects.forEach(p => {
      if (data[p.status]) {
        data[p.status].push(p);
      }
    });

    return data;
  }, [projects]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Only handling visual feedback if needed, but not moving data optimistically here to avoid weird flickers 
    // when moving between lists. We'll handle it in DragEnd.
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const projectId = active.id as string;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // Find what column it was dropped over
    let overId = over.id as string;
    let targetStatus = overId;

    // If dropped on a card, find that card's status
    if (!COLUMNS.find(c => c.id === overId)) {
      const overProject = projects.find(p => p.id === overId);
      if (overProject) {
        targetStatus = overProject.status;
      }
    }

    if (!COLUMNS.find(c => c.id === targetStatus)) return;
    if (project.status === targetStatus) return; // Didn't change column

    const sourceStatus = project.status;

    // 1. Moving from COMPLETED to something else
    if (sourceStatus === 'COMPLETED' && targetStatus !== 'COMPLETED') {
      const confirmed = window.confirm("Do you want to reopen this job?");
      if (!confirmed) return; // cancel drag
    }

    // 2. Moving to COMPLETED: Block if sub-projects are incomplete
    if (targetStatus === 'COMPLETED') {
      const subProjects = project.subProjects || [];
      const incompleteSubProjects = subProjects.filter((sp: any) => sp.status !== 'COMPLETED');
      if (incompleteSubProjects.length > 0) {
        alert(`Cannot mark as Completed. There are ${incompleteSubProjects.length} incomplete sub-projects.`);
        return; // cancel drag
      }
    }

    // 3. Moving from PENDING_REVIEW to IN_PROGRESS
    if (sourceStatus === 'PENDING_REVIEW' && targetStatus === 'IN_PROGRESS') {
      setPendingAcceptProject(project);

      // Select default template if available
      const workTypeMatch = templates.find(t => t.workTypes?.some((wt: any) => wt.id === project.workTypeId));
      if (workTypeMatch) setSelectedTemplateId(workTypeMatch.id);

      setShowAcceptModal(true);
      return; // Stop here, the modal will handle the API call
    }

    // Optimistic Update
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: targetStatus } : p));

    // Call API for normal status changes
    const res = await updateBDProject(projectId, { status: targetStatus });
    if (!res.success) {
      alert("Failed to update status");
      // Revert
      fetchProjects();
    }
  };

  const handleAcceptBrief = async () => {
    if (!pendingAcceptProject) return;
    setAccepting(true);

    const res = await acceptBDProject(pendingAcceptProject.id, selectedTemplateId || undefined);

    setAccepting(false);
    if (res.success) {
      setShowAcceptModal(false);
      setPendingAcceptProject(null);
      fetchProjects(); // Refresh data
    } else {
      alert(res.error || 'Failed to accept project');
    }
  };

  const handleCancelAccept = () => {
    setShowAcceptModal(false);
    setPendingAcceptProject(null);
    // Card automatically jumps back because we didn't optimistic update
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <KanbanSquare className="w-6 h-6 text-red-600" />
            กระดานงาน BD (Kanban)
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage project flow and statuses</p>
        </div>

        <Link
          href="/bd/intake"
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          สร้างบรีฟใหม่ (New Brief)
        </Link>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 h-full items-start">
              {COLUMNS.map(column => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  projects={columnsData[column.id]}
                >
                  <div className="flex flex-col gap-3 min-h-[150px]">
                    <SortableContext items={columnsData[column.id].map(p => p.id)} strategy={rectSortingStrategy}>
                      {columnsData[column.id].map(project => (
                        <KanbanCard
                          key={project.id}
                          project={project}
                          onClick={(id) => setSelectedProjectId(id)}
                        />
                      ))}
                    </SortableContext>
                  </div>
                </SortableColumn>
              ))}
            </div>
          </DndContext>
        )}
      </div>

      {/* Detail Modal */}
      {selectedProjectId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-end transition-opacity">
          <div className="bg-white w-full max-w-5xl h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <BDProjectDetailView
              id={selectedProjectId}
              isModal={true}
              onClose={() => {
                setSelectedProjectId(null);
                fetchProjects();
              }}
            />
          </div>
        </div>
      )}

      {/* Accept Modal */}
      {showAcceptModal && pendingAcceptProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-2">รับมอบหมายงาน (Accept Brief)</h2>
            <p className="text-sm text-gray-600 mb-6">
              คุณกำลังย้าย <strong>{pendingAcceptProject.name}</strong> ไปที่ กำลังดำเนินการ กรุณาเลือก Workflow Template เพื่อสร้างรายการงาน (Tasks)
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value="">-- ไม่ใช้ Template (สร้างงานเองภายหลัง) --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelAccept}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                disabled={accepting}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAcceptBrief}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                disabled={accepting}
              >
                {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                ยืนยันการรับงาน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
