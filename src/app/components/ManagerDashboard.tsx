import React from 'react';
import {
  TrendingUp, Trophy, PhoneCall, CalendarDays, Users,
  Medal, Crown,
} from 'lucide-react';
import { SalesOverviewChart } from './DashboardCharts';

interface LeaderboardEntry {
  userId: string;
  fullName: string;
  quotationCount: number;
  pipelineValue: number;
  wonCount: number;
  telesalesCount: number;
}

interface ManagerDashboardProps {
  userFirstName: string;
  metrics: {
    totalPipeline: number;
    totalWonCount: number;
    totalWonValue: number;
    totalTelesales: number;
    activeRepsCount: number;
    upcomingMeetings: number;
  };
  leaderboard: LeaderboardEntry[];
  recentQuotations: {
    id: string;
    quotationNumber?: string | null;
    status: string;
    totalAmountBeforeVat?: number | null;
    actualClosingAmount?: number | null;
    company?: { companyName: string } | null;
    salesperson?: { fullName: string } | null;
  }[];
  nextMeetings: {
    id: string;
    lastMeetingDate?: string | null;
    company?: { companyName: string } | null;
    user?: { fullName: string } | null;
  }[];
}

const fmt = (n: number) => `฿${n.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;

const RANK_STYLE = [
  { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', icon: <Crown size={14} className="text-red-500" /> },
  { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', icon: <Medal size={14} className="text-gray-400" /> },
  { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', icon: <Medal size={14} className="text-gray-400" /> },
];

export default function ManagerDashboard({
  userFirstName, metrics, leaderboard, recentQuotations, nextMeetings,
}: ManagerDashboardProps) {
  const totalPipelineForBar = leaderboard.reduce((s, r) => s + r.pipelineValue, 0) || 1;

  return (
    <div className="w-full">
      {/* ── Header ── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-wider">ผู้จัดการ</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ภาพรวมทีมขาย</h1>
          <p className="text-gray-500 mt-1 text-sm">สวัสดี, {userFirstName} — ภาพรวมประสิทธิภาพทีมของคุณ</p>
        </div>
        <div className="hidden xl:flex items-center gap-2 bg-brand-red text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-red-200">
          <Users size={16} />
          ทีมขาย {metrics.activeRepsCount} คน
        </div>
      </div>

      {/* ── 5 KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <ManagerCard icon={<TrendingUp size={22} className="text-red-600" />} bg="bg-red-50"
          title="มูลค่าไปป์ไลน์รวม" value={fmt(metrics.totalPipeline)} />
        <ManagerCard icon={<Trophy size={22} className="text-gray-700" />} bg="bg-gray-100"
          title="ปิดการขายแล้ว" value={`${metrics.totalWonCount} ดีล`} sub={fmt(metrics.totalWonValue)} />
        <ManagerCard icon={<PhoneCall size={22} className="text-gray-700" />} bg="bg-gray-100"
          title="ยอดโทรหาลูกค้า" value={`${metrics.totalTelesales.toLocaleString()}`} />
        <ManagerCard icon={<CalendarDays size={22} className="text-gray-700" />} bg="bg-gray-100"
          title="นัดหมายรอ" value={`${metrics.upcomingMeetings}`} />
        <ManagerCard icon={<Users size={22} className="text-gray-700" />} bg="bg-gray-100"
          title="พนักงานขายที่ใช้งาน" value={`${metrics.activeRepsCount} คน`} />
      </div>

      {/* ── Main Grid: Leaderboard + Right Column ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">

        {/* Leaderboard — 2/3 */}
        <div className="xl:col-span-2 bg-white rounded-3xl p-7 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Crown size={18} className="text-amber-500" />
              อันดับทีมขาย
            </h3>
            <span className="text-xs text-gray-400">{leaderboard.length} คน</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">ยังไม่มีข้อมูลทีมขาย</div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((rep, i) => {
                const style = RANK_STYLE[i] ?? { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-400', icon: <span className="text-xs font-bold text-gray-400">#{i + 1}</span> };
                const barPct = Math.round((rep.pipelineValue / totalPipelineForBar) * 100);
                return (
                  <div key={rep.userId} className={`flex items-center gap-4 p-4 rounded-2xl border ${style.bg} ${style.border} transition-all hover:shadow-sm`}>
                    {/* Rank */}
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${style.border} ${style.bg}`}>
                      {i < 3 ? style.icon : <span className={`text-xs font-bold ${style.text}`}>#{i + 1}</span>}
                    </div>
                    {/* Avatar + Name */}
                    <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-black text-base shrink-0">
                      {rep.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{rep.fullName}</p>
                      {/* Progress bar */}
                      <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden w-full max-w-[160px]">
                        <div className="h-full bg-brand-red rounded-full transition-all" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-5 shrink-0">
                      <Stat label="ใบเสนอ" value={rep.quotationCount} />
                      <Stat label="ปิดขาย" value={rep.wonCount} color="text-gray-900" />
                      <Stat label="โทร" value={rep.telesalesCount} color="text-gray-600" />
                      <div className="text-right">
                        <p className="text-xs text-gray-400">มูลค่า</p>
                        <p className="font-bold text-gray-900 text-sm">{fmt(rep.pipelineValue)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-6">
          {/* Upcoming meetings */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 text-base flex items-center gap-2">
              <CalendarDays size={16} className="text-amber-500" />
              นัดหมายที่กำลังจะมาถึง
            </h3>
            <div className="space-y-3">
              {nextMeetings.length > 0 ? nextMeetings.map(m => (
                <div key={m.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{m.company?.companyName || '-'}</p>
                    <p className="text-xs text-gray-500 truncate">{m.user?.fullName || '-'}</p>
                    <p className="text-xs text-red-500 mt-0.5">
                      {m.lastMeetingDate ? new Date(m.lastMeetingDate).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </p>
                  </div>
                </div>
              )) : <p className="text-sm text-gray-400 text-center py-4">ไม่มีนัดหมาย</p>}
            </div>
          </div>

          {/* Recent quotations */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" />
              ใบเสนอราคาล่าสุด
            </h3>
            <div className="space-y-3">
              {recentQuotations.length > 0 ? recentQuotations.map(q => (
                <div key={q.id} className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 mr-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{q.company?.companyName || '-'}</p>
                    <p className="text-xs text-gray-400 truncate">{q.salesperson?.fullName || '-'}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 shrink-0">
                    {fmt(q.actualClosingAmount || q.totalAmountBeforeVat || 0)}
                  </span>
                </div>
              )) : <p className="text-sm text-gray-400 text-center py-4">ไม่มีข้อมูล</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 text-lg">ภาพรวมไปป์ไลน์ทีม</h3>
          <p className="text-sm text-gray-500 mt-1">สรุปผลการดำเนินงานของทีม</p>
        </div>
        <div className="w-full h-[280px] -ml-4">
          <SalesOverviewChart data={[]} visibleSeries={{ cumulativeSales: true, calls: true }} />
        </div>
      </div>
    </div>
  );
}

function ManagerCard({ icon, bg, title, value, sub }: { icon: React.ReactNode; bg: string; title: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function Stat({ label, value, color = 'text-gray-700' }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-bold text-sm ${color}`}>{value}</p>
    </div>
  );
}
