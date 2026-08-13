import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { User, AlertCircle, CheckCircle, KanbanSquare, Clock, Tag } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface Props {
  project: any;
  onClick?: (projectId: string) => void;
}

export default function KanbanCard({ project, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    data: { type: 'Card', project }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tasks = project.tasks || [];
  const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED' || t.status === 'SKIPPED').length;
  const totalTasks = tasks.length;
  
  const subProjects = project.subProjects || [];
  const totalSubProjects = subProjects.length;
  const completedSubProjects = subProjects.filter((sp: any) => sp.status === 'COMPLETED').length;
  
  // A project is blocked if any of its IN_PROGRESS tasks has a blockedReason
  const isBlocked = tasks.some((t: any) => t.status === 'IN_PROGRESS' && t.blockedReason);

  const urgencyColor = 
    project.urgency === 'Urgent' ? 'bg-red-100 text-red-800' :
    project.urgency === 'High' ? 'bg-orange-100 text-orange-800' :
    'bg-gray-100 text-gray-800';

  const tags = project.tags || [];
  
  let deadlineBadge = null;
  if (project.deadline && project.status !== 'COMPLETED') {
    const deadlineDate = new Date(project.deadline);
    const diff = differenceInDays(deadlineDate, new Date());
    
    if (diff < 0) {
      deadlineBadge = <div className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold border border-red-200"><Clock className="w-3 h-3" /> {Math.abs(diff)} days overdue</div>;
    } else if (diff === 0) {
      deadlineBadge = <div className="flex items-center gap-1 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold border border-orange-200"><Clock className="w-3 h-3" /> Due today</div>;
    } else if (diff <= 3) {
      deadlineBadge = <div className="flex items-center gap-1 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold border border-yellow-200"><Clock className="w-3 h-3" /> {diff} days left</div>;
    } else {
      deadlineBadge = <div className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200"><Clock className="w-3 h-3" /> {diff} days left</div>;
    }
  }

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderTop: project.color && project.color !== '#ffffff' ? `6px solid ${project.color}` : undefined
      }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(project.id);
        }
      }}
      className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:border-red-300 transition-colors ${
        isDragging ? 'opacity-50 ring-2 ring-red-500' : ''
      } ${isBlocked ? 'border-l-4 border-l-red-500' : ''}`}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <div 
          className="font-semibold text-gray-900 hover:text-red-600 transition-colors line-clamp-2 text-sm cursor-pointer"
        >
          {project.name}
        </div>
      </div>
      
      {deadlineBadge && <div className="mb-2">{deadlineBadge}</div>}

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
          {project.workType?.name}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${urgencyColor}`}>
          {project.urgency}
        </span>
        {tags.map((tag: string) => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Tag className="w-2.5 h-2.5" /> {tag}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1" title="Requester">
            <User className="w-3.5 h-3.5" />
            <span className="truncate max-w-[80px]">{project.requester?.fullName}</span>
          </div>
          <div className="flex -space-x-1 overflow-hidden" title="Responsible (Owner & Members)">
            {project.owner && (
              <span className="w-5 h-5 rounded-full bg-red-100 border-2 border-white text-red-600 flex items-center justify-center font-bold text-[10px] z-10 relative">
                {project.owner.fullName.charAt(0)}
              </span>
            )}
            {project.members?.filter((m: any) => m.id !== project.ownerId).slice(0, 2).map((m: any, idx: number) => (
              <span key={m.id} className={`w-5 h-5 rounded-full bg-gray-200 border-2 border-white text-gray-700 flex items-center justify-center font-bold text-[10px] relative z-${9-idx}`}>
                {m.fullName.charAt(0)}
              </span>
            ))}
            {(project.members?.filter((m: any) => m.id !== project.ownerId).length || 0) > 2 && (
              <span className="w-5 h-5 rounded-full bg-gray-100 border-2 border-white text-gray-500 flex items-center justify-center font-bold text-[9px] relative z-0">
                +{(project.members?.filter((m: any) => m.id !== project.ownerId).length || 0) - 2}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          {isBlocked ? (
            <div className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded w-fit">
              <AlertCircle className="w-3.5 h-3.5" />
              Blocked
            </div>
          ) : totalSubProjects > 0 ? (
            <div className={`flex items-center gap-1 text-xs ${completedSubProjects === totalSubProjects ? 'text-green-600' : 'text-red-600'}`}>
              <KanbanSquare className="w-3.5 h-3.5" />
              {completedSubProjects}/{totalSubProjects} Sub-projects
            </div>
          ) : totalTasks > 0 ? (
            <div className="w-full mt-1">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {completedTasks}/{totalTasks} tasks</span>
                <span>{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${completionPercentage === 100 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${completionPercentage}%` }}></div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400">No tasks</div>
          )}
        </div>
      </div>
    </div>
  );
}
