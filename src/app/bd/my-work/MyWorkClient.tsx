"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { UnifiedWorkItem } from '@/app/actions/bd-my-work';
import { Clock, AlertCircle, CheckCircle, Ticket, CheckSquare, Search, Filter } from 'lucide-react';

interface MyWorkClientProps {
  initialData: UnifiedWorkItem[];
  error?: string;
}

export default function MyWorkClient({ initialData, error }: MyWorkClientProps) {
  const [data] = useState<UnifiedWorkItem[]>(initialData);
  const [filterType, setFilterType] = useState<'ALL' | 'PROJECT' | 'TASK' | 'TICKET'>('ALL');
  const [search, setSearch] = useState('');

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg m-6">
        เกิดข้อผิดพลาดในการโหลดข้อมูล: {error}
      </div>
    );
  }

  const filteredData = data.filter(item => {
    if (filterType !== 'ALL' && item.source !== filterType) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !(item.parentName || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (item: UnifiedWorkItem) => {
    const now = new Date();
    
    // 1. Check for overdue
    if (item.deadline && new Date(item.deadline) < now) {
      return "bg-red-50 border-red-200 text-red-800";
    }
    
    // 2. Check for approaching (within 2 days)
    if (item.deadline) {
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      if (new Date(item.deadline) <= twoDaysFromNow) {
        return "bg-orange-50 border-orange-200 text-orange-800";
      }
    }

    // 3. High urgency but no deadline (like tickets)
    const urgency = (item.urgency || '').toUpperCase();
    if (urgency.includes('HIGH') || urgency.includes('ด่วนมาก') || urgency.includes('CRITICAL')) {
      return "bg-yellow-50 border-yellow-200 text-yellow-800";
    }

    return "bg-white border-gray-200 text-gray-800";
  };

  const getUrgencyBadge = (urgency: string) => {
    const u = (urgency || '').toUpperCase();
    if (u.includes('HIGH') || u.includes('ด่วนมาก') || u.includes('CRITICAL')) {
      return <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800 font-medium">{urgency}</span>;
    }
    if (u.includes('MEDIUM') || u.includes('ด่วน')) {
      return <span className="px-2 py-0.5 text-xs rounded bg-orange-100 text-orange-800 font-medium">{urgency}</span>;
    }
    return <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">{urgency || 'Normal'}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">งานของฉัน (My Work)</h1>
          <p className="text-gray-500 mt-1">รายการงานที่ได้รับมอบหมายเรียงตามความสำคัญและกำหนดส่ง</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-red-500 focus:border-red-500"
              placeholder="ค้นหางาน..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filterType === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilterType('PROJECT')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${filterType === 'PROJECT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CheckSquare className="h-4 w-4" /> โปรเจกต์
            </button>
            <button
              onClick={() => setFilterType('TASK')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${filterType === 'TASK' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CheckSquare className="h-4 w-4" /> งานย่อย
            </button>
            <button
              onClick={() => setFilterType('TICKET')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${filterType === 'TICKET' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Ticket className="h-4 w-4" /> ทิคเก็ต
            </button>
          </div>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">ยอดเยี่ยมมาก! ไม่มีงานค้าง</h3>
          <p className="text-gray-500 mt-1">คุณจัดการงานที่ได้รับมอบหมายทั้งหมดเรียบร้อยแล้ว</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredData.map((item) => {
            const isOverdue = item.deadline && new Date(item.deadline) < new Date();
            
            return (
              <Link 
                key={`${item.source}-${item.id}`}
                href={item.linkUrl}
                className={`block border rounded-xl p-5 transition-shadow hover:shadow-md ${getStatusColor(item)}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {item.source === 'PROJECT' ? (
                        <span className="flex items-center gap-1 text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                          <CheckSquare className="h-3 w-3" /> PROJECT
                        </span>
                      ) : item.source === 'TASK' ? (
                        <span className="flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          <CheckSquare className="h-3 w-3" /> TASK
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          <Ticket className="h-3 w-3" /> TICKET
                        </span>
                      )}
                      
                      {getUrgencyBadge(item.urgency)}
                      
                      <span className="text-sm font-medium px-2 py-0.5 rounded bg-black/5">
                        {item.status}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                    
                    {item.parentName && (
                      <p className="text-sm opacity-80 flex items-center gap-1">
                        <span className="font-medium">ภายใต้:</span> {item.parentName}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col md:items-end gap-2">
                    {item.deadline ? (
                      <div className={`flex items-center gap-1.5 text-sm font-medium ${isOverdue ? 'text-red-600' : 'opacity-80'}`}>
                        {isOverdue ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        กำหนดส่ง: {new Date(item.deadline).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm opacity-60">
                        <Clock className="h-4 w-4" />
                        เปิดเมื่อ: {new Date(item.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                  
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
