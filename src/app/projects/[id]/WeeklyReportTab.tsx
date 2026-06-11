"use client";

import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';
import { th } from 'date-fns/locale';
import { getWeeklyReport } from '@/app/actions/projectReports';
import { Loader2, Printer, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, TrendingUp, Sun, CloudRain } from 'lucide-react';

export default function WeeklyReportTab({ project, isManager }: { project: any, isManager: boolean }) {
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const res = await getWeeklyReport(project.id, weekStart);
      if (res.success) {
        setReportData(res);
      }
      setIsLoading(false);
    }
    loadData();
  }, [weekStart, project.id]);

  const handlePrevWeek = () => setWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setWeekStart(prev => addWeeks(prev, 1));

  const handlePrint = () => {
    window.open(`/projects/${project.id}/weekly/${format(weekStart, 'yyyy-MM-dd')}/print`, '_blank');
  };

  if (isLoading && !reportData) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-brand-red" /></div>;
  }

  const logs = reportData?.logs || [];
  
  // Calculate KPIs
  const workingDays = logs.length;
  const avgWorkers = workingDays > 0 ? Math.round(logs.reduce((acc: number, log: any) => acc + (log.workerCount || 0), 0) / workingDays) : 0;
  const totalIncidents = logs.reduce((acc: number, log: any) => acc + (log.incidents || 0), 0);

  // Compute Task Progress change over the week
  // For simplicity, we just show current task progress as "Plan vs Actual"
  // If we wanted exact "this week change", we would need to store snapshots or look at Monday's log vs Sunday's log.
  const tasks = reportData?.project?.tasks || [];
  
  // Collect all images
  const weekImages = logs.flatMap((log: any) => log.imageUrls || []);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      
      {/* Header and Week Navigation */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <TrendingUp className="text-brand-red" size={24} /> รายงานประจำสัปดาห์ (Weekly Report)
          </h2>
          <div className="flex items-center gap-4">
            <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="font-medium text-gray-800">
              {format(weekStart, 'dd MMM', { locale: th })} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: th })}
            </span>
            <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium mb-1">วันทำงานในสัปดาห์</p>
            <p className="text-2xl font-black text-blue-900">{workingDays} วัน</p>
          </div>
          <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium mb-1">จำนวนคนงานเฉลี่ย</p>
            <p className="text-2xl font-black text-green-900">{avgWorkers} คน/วัน</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg">
            <p className="text-sm text-orange-600 font-medium mb-1">อุบัติเหตุ</p>
            <p className="text-2xl font-black text-orange-900">{totalIncidents} ครั้ง</p>
          </div>
        </div>

        {/* Daily Summary */}
        <div className="mb-8">
          <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">สรุปงานรายวัน (Daily Summary)</h3>
          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5, 6].map(offset => {
              const currentDate = new Date(weekStart);
              currentDate.setDate(currentDate.getDate() + offset);
              const log = logs.find((l: any) => new Date(l.date).toDateString() === currentDate.toDateString());
              
              return (
                <div key={offset} className={`p-4 rounded-lg border ${log ? 'bg-white border-gray-200' : 'bg-gray-50 border-dashed border-gray-300'}`}>
                  <div className="flex justify-between items-start">
                    <div className="font-medium w-32 flex-shrink-0">
                      {format(currentDate, 'EEEE dd/MM', { locale: th })}
                    </div>
                    {log ? (
                      <div className="flex-1 text-sm text-gray-700">
                        <p className="flex items-center gap-1">
                          <strong>สภาพอากาศ:</strong> 
                          {log.weather === 'Sunny' ? <><Sun size={14} className="text-orange-500"/> แดดออก</> : 
                           log.weather === 'Rainy' ? <><CloudRain size={14} className="text-blue-500"/> ฝนตก</> : 
                           log.weather}
                        </p>
                        <p className="mt-1"><strong>งานที่ทำ:</strong> {log.workSummary || '-'}</p>
                        {log.issues && <p className="text-red-600 mt-1"><strong>ปัญหา:</strong> {log.issues}</p>}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-2 text-sm text-gray-400">
                        <AlertTriangle size={14} className="text-yellow-500" />
                        ไม่มีบันทึก (No Report)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Progress */}
        <div className="mb-8">
          <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">ความคืบหน้างานปัจจุบัน (Task Progress)</h3>
          <div className="space-y-4">
            {tasks.map((task: any) => (
              <div key={task.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{task.title}</span>
                  {task.actualPct >= 100 ? (
                    <span className="text-green-600 flex items-center gap-1 font-medium"><CheckCircle2 size={14} /> Completed</span>
                  ) : (
                    <span className="text-gray-500">Plan: {task.planPct}% | Actual: {task.actualPct}%</span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${task.actualPct >= task.planPct ? 'bg-green-500' : 'bg-brand-red'}`} 
                    style={{ width: `${task.actualPct}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Images */}
        {weekImages.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">รูปภาพประกอบ (Weekly Photos)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {weekImages.map((img: string, idx: number) => (
                <div key={idx} className="aspect-square bg-gray-100 rounded-md overflow-hidden">
                  <img src={img} alt={`week-img-${idx}`} className="w-full h-full object-cover hover:scale-110 transition-transform" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Print Button */}
        <div className="flex justify-center mt-12">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-md"
          >
            <Printer size={20} />
            พิมพ์รายงานเป็น PDF (Print to PDF)
          </button>
        </div>

      </div>
    </div>
  );
}
