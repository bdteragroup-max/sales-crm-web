'use client';

import React, { useState } from 'react';
import { Plus, Search, FileText, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import SiteSurveyForm from './SiteSurveyForm';
import { format } from 'date-fns';

type SurveyManagerProps = {
  initialSurveys: any[];
  companies: any[];
  salesReps: any[];
  currentUser: any;
};

export default function SurveyManager({ initialSurveys, companies, salesReps, currentUser }: SurveyManagerProps) {
  const [surveys, setSurveys] = useState(initialSurveys);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const isProjectRole = (currentUser.role || '').toLowerCase().includes('project');

  const handleNewSurvey = () => {
    setEditingSurveyId(null);
    setView('form');
  };

  const handleEditSurvey = (id: string) => {
    setEditingSurveyId(id);
    setView('form');
  };

  const handleBackToList = () => {
    setView('list');
    setEditingSurveyId(null);
    // Ideally, we'd trigger a re-fetch of the surveys here via Server Action, but for now we rely on router.refresh() from the form on success.
  };

  const filteredSurveys = surveys.filter(s => 
    s.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.projectName && s.projectName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (view === 'form') {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <button 
          onClick={handleBackToList}
          className="mb-6 flex items-center text-[#ff2301] hover:text-red-800 font-medium transition-colors"
        >
          <ChevronRight className="w-5 h-5 rotate-180 mr-1" />
          กลับหน้ารายการ (Back to List)
        </button>
        <SiteSurveyForm 
          surveyId={editingSurveyId} 
          companies={companies} 
          salesReps={salesReps}
          currentUser={currentUser}
          onSuccess={handleBackToList}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">บันทึกสำรวจไซต์งาน (Site Surveys)</h1>
          <p className="text-gray-500 mt-1">จัดการและบันทึกข้อมูลการสำรวจไซต์งานทั้งหมด</p>
        </div>
        {!isProjectRole && (
          <button
            onClick={handleNewSurvey}
            className="flex items-center gap-2 bg-[#ff2301] hover:bg-red-700 text-white px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all font-medium whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            สร้างบันทึกใหม่
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่, ชื่อลูกค้า, ชื่อโปรเจกต์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] focus:border-[#ff2301] transition-all outline-none"
            />
          </div>
        </div>

        <div className="w-full">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold">เลขที่เอกสาร</th>
                  <th className="py-3 px-4 font-semibold">วันที่สำรวจ</th>
                  <th className="py-3 px-4 font-semibold">ลูกค้า / โปรเจกต์</th>
                  <th className="py-3 px-4 font-semibold">เซลส์</th>
                  <th className="py-3 px-4 font-semibold">สถานะ</th>
                  <th className="py-3 px-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSurveys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-lg font-medium text-gray-600">ไม่พบข้อมูลการสำรวจ</p>
                        <p className="text-sm">ลองค้นหาด้วยคำอื่น หรือสร้างบันทึกใหม่</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSurveys.map((survey) => (
                    <tr key={survey.id} className="hover:bg-red-50/30 transition-colors group">
                      <td className="py-3 px-4">
                        <span className="font-medium text-[#ff2301] group-hover:text-red-800 transition-colors">
                          {survey.surveyNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {format(new Date(survey.surveyDate), 'dd MMM yyyy')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{survey.customerName || '-'}</div>
                        <div className="text-sm text-gray-500">{survey.projectName || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {survey.salesperson?.fullName || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          survey.status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                          survey.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {survey.status === 'Completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {survey.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button 
                          onClick={() => handleEditSurvey(survey.id)}
                          className="text-[#ff2301] hover:text-red-800 hover:underline font-medium text-sm transition-all"
                        >
                          เปิดดู / แก้ไข
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredSurveys.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center">
                  <FileText className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-lg font-medium text-gray-600">ไม่พบข้อมูลการสำรวจ</p>
                  <p className="text-sm">ลองค้นหาด้วยคำอื่น หรือสร้างบันทึกใหม่</p>
                </div>
              </div>
            ) : (
              filteredSurveys.map((survey) => (
                <div key={survey.id} className="p-4 space-y-3 bg-white hover:bg-red-50/30 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-medium text-[#ff2301] block">
                        {survey.surveyNumber}
                      </span>
                      <span className="text-xs text-gray-500 mt-0.5 block">
                        {format(new Date(survey.surveyDate), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                      survey.status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                      survey.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {survey.status === 'Completed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {survey.status}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{survey.customerName || '-'}</div>
                    <div className="text-xs text-gray-500">{survey.projectName || '-'}</div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                    <span className="text-xs text-gray-500">
                      เซลส์: <span className="font-medium text-gray-700">{survey.salesperson?.fullName || '-'}</span>
                    </span>
                    <button 
                      onClick={() => handleEditSurvey(survey.id)}
                      className="text-[#ff2301] font-medium text-sm transition-all"
                    >
                      เปิดดู / แก้ไข
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
