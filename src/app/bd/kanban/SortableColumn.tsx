import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';

interface Props {
  column: { id: string; title: string };
  projects: any[];
  children?: React.ReactNode;
}

export default function SortableColumn({ column, projects, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'Column' }
  });

  return (
    <div className="flex flex-col w-80 shrink-0 h-full max-h-full">
      {/* Column Header */}
      <div className="mb-3 px-1 flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">{column.title}</h3>
        <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
          {projects.length}
        </span>
      </div>

      {/* Column Body / Droppable Area */}
      <div 
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto bg-gray-100/50 rounded-xl p-2 transition-colors border-2 border-transparent ${
          isOver ? 'bg-gray-100 border-dashed border-gray-300' : ''
        }`}
      >
        {children || (
          <div className="flex flex-col gap-3 min-h-[150px]">
            <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {projects.map(project => (
                <KanbanCard key={project.id} project={project} />
              ))}
            </SortableContext>
          </div>
        )}
      </div>
    </div>
  );
}
