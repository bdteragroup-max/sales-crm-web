import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Tag,
  Flame,
  Zap,
  BarChart3,
  FolderTree,
  Building2,
  Factory,
  Database,
  TrendingUp,
  Radio,
  ExternalLink,
  Lightbulb,
  Rocket,
  Wrench,
  Calculator,
  BadgeDollarSign,
  Megaphone,
  Headphones,
  Package,
  FlaskConical,
  Users,
  LifeBuoy,
  Code2,
  Search,
  Briefcase
} from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface Props {
  project: any;
  onClick?: (projectId: string) => void;
}

// Helper to strip any emoji characters from text
export function stripEmojis(str: string = ''): string {
  if (!str) return '';
  return str
    .replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{200D}]|[\u{FE0E}-\u{FE0F}]/gu, '')
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .trim();
}

// Helper for Work Type styling
function getWorkTypeStyle(name: string = '') {
  const lower = name.toLowerCase().trim();

  if (lower.includes('mkt') || lower.includes('market') || lower.includes('การตลาด')) {
    return 'bg-rose-50 text-rose-700 border-rose-200/80';
  }
  if (lower.includes('dev') || lower.includes('soft') || lower.includes(' it') || lower.startsWith('it') || lower.includes('ระบบ') || lower.includes('code') || lower.includes('แอป')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
  }
  if (lower === 'ev' || lower.startsWith('ev ') || lower.endsWith(' ev') || lower.includes(' ev ') || lower.includes('ชาร์จ') || lower.includes('station')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
  }
  if (lower.includes('บัญชี') || lower.includes('account') || lower.includes('finance') || lower.includes('การเงิน')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
  }
  if (lower.includes('sale') || lower.includes('ขาย')) {
    return 'bg-blue-50 text-blue-700 border-blue-200/80';
  }
  if (lower.includes('service') || lower.includes('บริการ') || lower.includes('ซ่อม')) {
    return 'bg-cyan-50 text-cyan-700 border-cyan-200/80';
  }
  if (lower.includes('store') || lower.includes('สต็อก') || lower.includes('stock')) {
    return 'bg-amber-50 text-amber-700 border-amber-200/80';
  }
  if (lower.includes('r&d') || lower.includes('rnd') || lower.includes('วิศวกรรม') || lower.includes('engineer')) {
    return 'bg-violet-50 text-violet-700 border-violet-200/80';
  }
  if (lower.includes('hr') || lower.includes('บุคคล') || lower.includes('สรรหา')) {
    return 'bg-pink-50 text-pink-700 border-pink-200/80';
  }
  if (lower.includes('data') || lower.includes('ฐานข้อมูล') || lower.includes('db')) {
    return 'bg-purple-50 text-purple-700 border-purple-200/80';
  }
  if (lower.includes('outsource') || lower.includes('ภายนอก') || lower.includes('external')) {
    return 'bg-orange-50 text-orange-700 border-orange-200/80';
  }
  if (lower.includes('branch') || lower.includes('สาขา')) {
    return 'bg-blue-50 text-blue-700 border-blue-200/80';
  }
  if (lower.includes('factory') || lower.includes('โรงงาน') || lower.includes('คลัง')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
  }
  if (lower.includes('โอกาส') || lower.includes('opportunity')) {
    return 'bg-amber-50 text-amber-800 border-amber-200/80';
  }
  if (lower.includes('ขยายธุรกิจ') || lower.includes('expansion')) {
    return 'bg-sky-50 text-sky-700 border-sky-200/80';
  }
  if (lower.includes('หาข้อมูล') || lower.includes('research') || lower.includes('สำรวจ')) {
    return 'bg-teal-50 text-teal-700 border-teal-200/80';
  }
  if (lower.includes('พัฒนาภายใน') || lower.includes('internal')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
  }
  if (lower.includes('kaizen') || lower.includes('ปรับปรุง')) {
    return 'bg-teal-50 text-teal-700 border-teal-200/80';
  }
  if (lower.includes('rfid')) {
    return 'bg-cyan-50 text-cyan-700 border-cyan-200/80';
  }
  if (lower.includes('project') || lower.includes('โครงการ')) {
    return 'bg-slate-100 text-slate-800 border-slate-300/80';
  }
  if (lower.includes('ทุกฝ่าย') || lower.includes('support') || lower.includes('help')) {
    return 'bg-blue-50 text-blue-700 border-blue-200/80';
  }

  return 'bg-slate-50 text-slate-700 border-slate-200/80';
}

// Helper for Work Type Icon
function getWorkTypeIcon(name: string = '') {
  const lower = name.toLowerCase().trim();
  const cls = "w-3 h-3 shrink-0";

  if (lower.includes('mkt') || lower.includes('market') || lower.includes('การตลาด')) {
    return <Megaphone className={`${cls} text-rose-500`} />;
  }
  if (lower.includes('dev') || lower.includes('soft') || lower.includes(' it') || lower.startsWith('it') || lower.includes('ระบบ') || lower.includes('code') || lower.includes('แอป')) {
    return <Code2 className={`${cls} text-indigo-600`} />;
  }
  if (lower === 'ev' || lower.startsWith('ev ') || lower.endsWith(' ev') || lower.includes(' ev ') || lower.includes('ชาร์จ') || lower.includes('station')) {
    return <Zap className={`${cls} text-emerald-500`} />;
  }
  if (lower.includes('บัญชี') || lower.includes('account') || lower.includes('finance') || lower.includes('การเงิน')) {
    return <Calculator className={`${cls} text-emerald-600`} />;
  }
  if (lower.includes('sale') || lower.includes('ขาย')) {
    return <BadgeDollarSign className={`${cls} text-blue-600`} />;
  }
  if (lower.includes('service') || lower.includes('บริการ') || lower.includes('ซ่อม')) {
    return <Headphones className={`${cls} text-cyan-600`} />;
  }
  if (lower.includes('store') || lower.includes('สต็อก') || lower.includes('stock')) {
    return <Package className={`${cls} text-amber-600`} />;
  }
  if (lower.includes('r&d') || lower.includes('rnd') || lower.includes('วิศวกรรม') || lower.includes('engineer')) {
    return <FlaskConical className={`${cls} text-violet-600`} />;
  }
  if (lower.includes('hr') || lower.includes('บุคคล') || lower.includes('สรรหา')) {
    return <Users className={`${cls} text-pink-500`} />;
  }
  if (lower.includes('data') || lower.includes('ฐานข้อมูล') || lower.includes('db')) {
    return <Database className={`${cls} text-purple-600`} />;
  }
  if (lower.includes('outsource') || lower.includes('ภายนอก') || lower.includes('external')) {
    return <ExternalLink className={`${cls} text-orange-500`} />;
  }
  if (lower.includes('branch') || lower.includes('สาขา')) {
    return <Building2 className={`${cls} text-blue-600`} />;
  }
  if (lower.includes('factory') || lower.includes('โรงงาน') || lower.includes('คลัง')) {
    return <Factory className={`${cls} text-indigo-600`} />;
  }
  if (lower.includes('โอกาส') || lower.includes('opportunity')) {
    return <Lightbulb className={`${cls} text-amber-500`} />;
  }
  if (lower.includes('ขยายธุรกิจ') || lower.includes('expansion')) {
    return <Rocket className={`${cls} text-sky-500`} />;
  }
  if (lower.includes('หาข้อมูล') || lower.includes('research') || lower.includes('สำรวจ')) {
    return <Search className={`${cls} text-teal-600`} />;
  }
  if (lower.includes('พัฒนาภายใน') || lower.includes('internal')) {
    return <Wrench className={`${cls} text-emerald-600`} />;
  }
  if (lower.includes('kaizen') || lower.includes('ปรับปรุง') || lower.includes('พัฒนา')) {
    return <TrendingUp className={`${cls} text-teal-600`} />;
  }
  if (lower.includes('rfid')) {
    return <Radio className={`${cls} text-cyan-500`} />;
  }
  if (lower.includes('project') || lower.includes('โครงการ')) {
    return <FolderTree className={`${cls} text-slate-600`} />;
  }
  if (lower.includes('ทุกฝ่าย') || lower.includes('support') || lower.includes('help')) {
    return <LifeBuoy className={`${cls} text-blue-600`} />;
  }

  return <Briefcase className={`${cls} text-slate-500`} />;
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
  const firstBlockedTask = tasks.find((t: any) => t.status === 'IN_PROGRESS' && t.blockedReason);
  const isBlocked = !!firstBlockedTask || !!project.blockedReason;
  const blockerReason = firstBlockedTask?.blockedReason || project.blockedReason;

  const tags = project.tags || [];

  let deadlineBadge = null;
  if (project.deadline && project.status !== 'COMPLETED') {
    const deadlineDate = new Date(project.deadline);
    const diff = differenceInDays(deadlineDate, new Date());

    if (diff < 0) {
      deadlineBadge = (
        <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-md font-semibold border border-rose-200 shrink-0">
          <Clock className="w-2.5 h-2.5 text-rose-500" />
          <span>เกิน {Math.abs(diff)} วัน</span>
        </span>
      );
    } else if (diff === 0) {
      deadlineBadge = (
        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded-md font-semibold border border-amber-200 shrink-0">
          <Clock className="w-2.5 h-2.5 text-amber-600" />
          <span>ครบกำหนดวันนี้</span>
        </span>
      );
    } else if (diff <= 3) {
      deadlineBadge = (
        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-medium border border-amber-200 shrink-0">
          <Clock className="w-2.5 h-2.5 text-amber-500" />
          <span>เหลือ {diff} วัน</span>
        </span>
      );
    } else {
      deadlineBadge = (
        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded-md border border-slate-200 shrink-0">
          <Clock className="w-2.5 h-2.5 text-slate-400" />
          <span>{diff} วัน</span>
        </span>
      );
    }
  }

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const workTypeStyle = getWorkTypeStyle(project.workType?.name);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderTop: project.color && project.color !== '#ffffff' ? `3px solid ${project.color}` : undefined
      }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(project.id);
        }
      }}
      className={`bg-white p-3 rounded-xl shadow-2xs border border-slate-200/90 cursor-grab active:cursor-grabbing hover:border-slate-300 hover:shadow-md transition-all duration-200 group relative flex flex-col justify-between ${
        isDragging ? 'opacity-40 ring-2 ring-brand-red shadow-lg' : ''
      } ${isBlocked ? 'border-l-4 border-l-rose-500' : ''}`}
    >
      <div>
        {/* Row 1: Category & Urgency */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium border whitespace-nowrap truncate max-w-[55%] ${workTypeStyle}`}>
            {getWorkTypeIcon(project.workType?.name)}
            <span className="truncate">{stripEmojis(project.workType?.name) || 'ทั่วไป'}</span>
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {project.urgency === 'Urgent' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <Flame className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                <span>ด่วนมาก</span>
              </span>
            )}
            {project.urgency === 'High' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Zap className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                <span>ด่วน</span>
              </span>
            )}
            {deadlineBadge}
          </div>
        </div>

        {/* Row 2: Title (fixed height for symmetrical card heights) */}
        <div className="min-h-[2.25rem] flex items-start mb-1.5">
          <h4 className="font-semibold text-slate-800 group-hover:text-brand-red transition-colors line-clamp-2 text-xs leading-snug tracking-tight">
            {stripEmojis(project.name)}
          </h4>
        </div>

        {/* Optional Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                <Tag className="w-2 h-2 text-slate-400" /> {stripEmojis(tag)}
              </span>
            ))}
          </div>
        )}

        {/* Blocker Alert Banner */}
        {isBlocked && (
          <div className="mb-1.5 p-1.5 rounded-lg bg-rose-50 border border-rose-200/70 flex items-center gap-1 text-rose-800 text-[10px]">
            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
            <span className="truncate font-semibold">{stripEmojis(blockerReason) || 'มีงานย่อยติดปัญหา'}</span>
          </div>
        )}

        {/* Progress or Subprojects Bar (balanced vertical block) */}
        <div className="min-h-[1.5rem] flex flex-col justify-center mb-2">
          {totalSubProjects > 0 ? (
            <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <FolderTree className="w-3 h-3 text-slate-400" />
                <span>โครงการย่อย</span>
              </span>
              <span className="font-semibold text-slate-700">
                {completedSubProjects}/{totalSubProjects}
              </span>
            </div>
          ) : totalTasks > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-2.5 h-2.5 text-slate-400" />
                  <span>ความคืบหน้า</span>
                </span>
                <span className="font-semibold text-slate-700">
                  {completedTasks}/{totalTasks} ({completionPercentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    completionPercentage === 100
                      ? 'bg-emerald-500'
                      : isBlocked
                        ? 'bg-rose-500'
                        : 'bg-brand-red'
                  }`}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 italic">
              บรีฟใหม่ · รอจัดสรรขั้นตอนงาน
            </div>
          )}
        </div>
      </div>

      {/* Row: Footer Metadata (Requester & Team Avatars) */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[10.5px] text-slate-500">
        <div className="flex items-center gap-1 truncate max-w-[130px]" title={`ผู้ร้องขอ: ${stripEmojis(project.requester?.fullName) || 'ไม่ระบุ'}`}>
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{stripEmojis(project.requester?.fullName) || 'ไม่ระบุ'}</span>
        </div>

        {/* Responsible Avatars */}
        <div className="flex items-center -space-x-1 shrink-0 overflow-hidden" title="ผู้รับผิดชอบ">
          {project.owner && (
            <span className="w-5 h-5 rounded-full bg-rose-100 border border-white text-brand-red flex items-center justify-center font-bold text-[9.5px] shrink-0 z-10">
              {project.owner.fullName.charAt(0)}
            </span>
          )}
          {project.members?.filter((m: any) => m.id !== project.ownerId).slice(0, 2).map((m: any) => (
            <span key={m.id} className="w-5 h-5 rounded-full bg-slate-200 border border-white text-slate-700 flex items-center justify-center font-bold text-[9.5px] shrink-0">
              {m.fullName.charAt(0)}
            </span>
          ))}
          {(project.members?.filter((m: any) => m.id !== project.ownerId).length || 0) > 2 && (
            <span className="w-5 h-5 rounded-full bg-slate-100 border border-white text-slate-500 flex items-center justify-center font-bold text-[9px] shrink-0">
              +{(project.members?.filter((m: any) => m.id !== project.ownerId).length || 0) - 2}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
