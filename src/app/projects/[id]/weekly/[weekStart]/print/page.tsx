import { getWeeklyReport } from '@/app/actions/projectReports';
import { format, endOfWeek } from 'date-fns';
import { th } from 'date-fns/locale';
import prisma from '@/app/lib/db';
import { redirect } from 'next/navigation';

export default async function WeeklyPrintPage({ params }: { params: Promise<{ id: string, weekStart: string }> }) {
  const resolvedParams = await params;
  const { id, weekStart } = resolvedParams;

  const startDate = new Date(weekStart);
  if (isNaN(startDate.getTime())) {
    redirect(`/projects/${id}`);
  }

  const res = await getWeeklyReport(id, startDate);
  if (!res.success) {
    return <div>Error loading report</div>;
  }

  const project = res.project;
  const logs = res.logs || [];
  
  // Calculate KPIs
  const workingDays = logs.length;
  const avgWorkers = workingDays > 0 ? Math.round(logs.reduce((acc: number, log: any) => acc + (log.workerCount || 0), 0) / workingDays) : 0;
  
  const weekImages = logs.flatMap((log: any) => log.imageUrls || []);
  const issues = logs.filter((l: any) => l.issues).map((l: any) => ({ date: l.date, text: l.issues }));
  const solutions = logs.filter((l: any) => l.solutions).map((l: any) => ({ date: l.date, text: l.solutions }));

  return (
    <div className="bg-white text-black print:text-black">
      {/* Hide on screen, show on print, but typically you just let the user see it on screen as a preview and then ctrl+p */}
      <div className="max-w-4xl mx-auto p-8 print:p-0">
        
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black">TERA GROUP</h1>
              <h2 className="text-lg font-bold mt-1">รายงานสรุปความคืบหน้าโครงการรายสัปดาห์</h2>
            </div>
            <div className="text-right text-sm">
              <p><strong>โครงการ:</strong> {project?.name}</p>
              <p><strong>ประจำสัปดาห์:</strong> {format(startDate, 'dd MMM', { locale: th })} - {format(endOfWeek(startDate, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: th })}</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="flex justify-between mb-8 text-sm">
          <p><strong>จำนวนวันทำงานในสัปดาห์:</strong> {workingDays} วัน</p>
          <p><strong>จำนวนคนงานเฉลี่ย:</strong> {avgWorkers} คน/วัน</p>
          <p><strong>ผู้จัดการโครงการ:</strong> {project?.manager?.fullName || 'ไม่ระบุ'}</p>
        </div>

        {/* Task Progress */}
        <div className="mb-8 print:break-inside-avoid">
          <h3 className="font-bold text-md mb-2 bg-gray-100 p-2">1. ความคืบหน้างานหลัก (Task Progress)</h3>
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-2 text-left">ชื่องาน</th>
                <th className="border border-gray-300 p-2 text-center w-24">% แผน</th>
                <th className="border border-gray-300 p-2 text-center w-24">% จริง</th>
                <th className="border border-gray-300 p-2 text-center w-24">ผลต่าง</th>
              </tr>
            </thead>
            <tbody>
              {project?.tasks?.map((task: any) => {
                const diff = task.actualPct - task.planPct;
                return (
                  <tr key={task.id}>
                    <td className="border border-gray-300 p-2">{task.title}</td>
                    <td className="border border-gray-300 p-2 text-center">{task.planPct}%</td>
                    <td className="border border-gray-300 p-2 text-center font-bold">{task.actualPct}%</td>
                    <td className={`border border-gray-300 p-2 text-center font-bold ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {diff > 0 ? '+' : ''}{diff}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Daily Summary */}
        <div className="mb-8 print:break-inside-avoid">
          <h3 className="font-bold text-md mb-2 bg-gray-100 p-2">2. สรุปการปฏิบัติงานรายวัน (Daily Summary)</h3>
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-2 text-left w-32">วันที่</th>
                <th className="border border-gray-300 p-2 text-center w-24">สภาพอากาศ</th>
                <th className="border border-gray-300 p-2 text-center w-24">คนงาน</th>
                <th className="border border-gray-300 p-2 text-left">รายละเอียดงาน</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td className="border border-gray-300 p-2 whitespace-nowrap">{format(new Date(log.date), 'EEE dd/MM/yyyy', { locale: th })}</td>
                  <td className="border border-gray-300 p-2 text-center">{log.weather}</td>
                  <td className="border border-gray-300 p-2 text-center">{log.workerCount || 0}</td>
                  <td className="border border-gray-300 p-2">{log.workSummary || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="border border-gray-300 p-4 text-center text-gray-500">ไม่มีบันทึกการทำงานในสัปดาห์นี้</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Issues & Solutions */}
        {(issues.length > 0 || solutions.length > 0) && (
          <div className="mb-8 print:break-inside-avoid">
            <h3 className="font-bold text-md mb-2 bg-gray-100 p-2">3. ปัญหาและแนวทางแก้ไข (Issues & Solutions)</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="border border-gray-300 p-3">
                <strong className="block mb-2 text-red-700">ปัญหาที่พบ:</strong>
                <ul className="list-disc pl-4 space-y-1">
                  {issues.map((i: any, idx: number) => (
                    <li key={idx}>({format(new Date(i.date), 'dd/MM')}) {i.text}</li>
                  ))}
                </ul>
              </div>
              <div className="border border-gray-300 p-3">
                <strong className="block mb-2 text-green-700">แนวทางแก้ไข:</strong>
                <ul className="list-disc pl-4 space-y-1">
                  {solutions.map((s: any, idx: number) => (
                    <li key={idx}>({format(new Date(s.date), 'dd/MM')}) {s.text}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Images */}
        {weekImages.length > 0 && (
          <div className="mb-8 print:break-before-page">
            <h3 className="font-bold text-md mb-4 bg-gray-100 p-2">4. ภาพถ่ายความคืบหน้า (Progress Photos)</h3>
            <div className="grid grid-cols-2 gap-4">
              {weekImages.slice(0, 4).map((img: string, idx: number) => (
                <div key={idx} className="aspect-video bg-gray-200 border border-gray-300 flex items-center justify-center">
                  <img src={img} alt="progress" className="max-w-full max-h-full object-contain" />
                </div>
              ))}
            </div>
            {weekImages.length > 4 && (
              <p className="text-xs text-gray-500 mt-2">*แสดงเฉพาะ 4 รูปภาพแรกเพื่อความเหมาะสมของหน้ากระดาษ</p>
            )}
          </div>
        )}

        {/* Signatures */}
        <div className="mt-16 pt-8 print:break-inside-avoid">
          <div className="grid grid-cols-2 gap-16 text-center text-sm">
            <div>
              <div className="border-b border-black w-48 mx-auto mb-2"></div>
              <p>( ผู้จัดทำรายงาน )</p>
              <p className="mt-1">วันที่: ....../....../......</p>
            </div>
            <div>
              <div className="border-b border-black w-48 mx-auto mb-2"></div>
              <p>( ผู้ตรวจรับ / Project Manager )</p>
              <p className="mt-1">วันที่: ....../....../......</p>
            </div>
          </div>
        </div>

        {/* Action Buttons (Hide on Print) */}
        <div className="mt-12 text-center print:hidden flex gap-4 justify-center">
          <button 
            onClick={() => {
              window.history.back();
            }}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
          >
            กลับ (Back)
          </button>
          <button 
            className="px-6 py-2 bg-brand-red text-white font-bold rounded-md hover:bg-red-700 shadow-sm"
            style={{ display: 'none' }} // NextJS server component, we need a client component wrapper or just use native window.print on load. 
            // Wait, we can't use onClick in server component. We'll use a script tag to auto-open print dialog or add a client component wrapper.
          >
            พิมพ์ (Print)
          </button>
        </div>

        {/* Auto print script */}
        <script dangerouslySetInnerHTML={{ __html: `
          setTimeout(function() { window.print(); }, 1000);
        `}} />

      </div>
    </div>
  );
}
