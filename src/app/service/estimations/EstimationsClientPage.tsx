"use client";

import React, { useState } from 'react';
import { Calculator, CheckCircle2, Clock, FileText, Search, User, X, Printer, Building2, Users, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { submitEstimation, assignEstimation } from '@/app/actions/estimations';

interface EstimationsClientPageProps {
  currentUser: any;
  initialRecords: any[];
  serviceTeamMembers?: any[];
  isManager?: boolean;
}

export default function EstimationsClientPage({ currentUser, initialRecords, serviceTeamMembers, isManager }: EstimationsClientPageProps) {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ESTIMATED' | 'COMPANY' | 'TECHNICIAN' | 'MONTHLY'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  
  // MGR Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterTechnician, setFilterTechnician] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | ''>('');
  const [estimationNote, setEstimationNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAssignReq, setSelectedAssignReq] = useState<any>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const filteredRecords = initialRecords.filter(item => {
    let statusMatch = true;
    if (activeTab === 'PENDING') statusMatch = item.estimationStatus === 'PENDING';
    if (activeTab === 'ESTIMATED') statusMatch = item.estimationStatus === 'ESTIMATED';
    
    if (activeTab === 'MONTHLY' || activeTab === 'COMPANY' || activeTab === 'TECHNICIAN') {
      if (filterStatus) {
        statusMatch = item.estimationStatus === filterStatus;
      } else {
        statusMatch = true;
      }
    }
      
    const searchMatch = 
      item.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.salesperson?.toLowerCase().includes(searchTerm.toLowerCase());
      
    let dateMatch = true;
    const itemDate = new Date(item.createdAt || item.date);
    if (filterDate) {
      const fd = new Date(filterDate);
      if (itemDate.getFullYear() !== fd.getFullYear() || itemDate.getMonth() !== fd.getMonth() || itemDate.getDate() !== fd.getDate()) {
        dateMatch = false;
      }
    }
    if (filterMonth) {
      const [y, m] = filterMonth.split('-');
      if (itemDate.getFullYear() !== parseInt(y) || itemDate.getMonth() !== parseInt(m) - 1) {
        dateMatch = false;
      }
    }

    let techMatch = true;
    if (filterTechnician) {
      if (item.assignedToUserId !== filterTechnician && item.assignedTo !== filterTechnician) {
        techMatch = false;
      }
    }
      
    return statusMatch && searchMatch && dateMatch && techMatch;
  });

  const companyMap = initialRecords.reduce((acc, record) => {
    const comp = record.companyName || "ไม่ระบุบริษัท"
    if (!acc[comp]) acc[comp] = []
    acc[comp].push(record)
    return acc
  }, {} as Record<string, any[]>)

  const companyData = Object.keys(companyMap).map(key => ({
    company: key,
    count: companyMap[key].length,
    records: companyMap[key]
  })).sort((a, b) => b.count - a.count)

  const techMap = initialRecords.reduce((acc, record) => {
    const tech = record.assignedTo || "ไม่ได้มอบหมาย"
    if (!acc[tech]) acc[tech] = []
    acc[tech].push(record)
    return acc
  }, {} as Record<string, any[]>)

  const techData = Object.keys(techMap).map(key => ({
    technician: key,
    count: techMap[key].length,
    records: techMap[key]
  })).sort((a, b) => b.count - a.count)

  const handleOpenModal = (req: any) => {
    setSelectedReq(req);
    setEstimatedPrice('');
    setEstimationNote('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || estimatedPrice === '') return;
    
    setIsSubmitting(true);
    try {
      await submitEstimation(
        selectedReq.id,
        {
          estimatedPrice: Number(estimatedPrice),
          estimationNote: estimationNote
        },
        currentUser.fullName
      );
      setIsModalOpen(false);
      // Wait for revalidation
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error(err);
      alert("Failed to submit estimation");
      setIsSubmitting(false);
    }
  };

  const handleOpenAssignModal = (req: any) => {
    setSelectedAssignReq(req);
    setAssignUserId(req.assignedToUserId || '');
    setAssignDueDate(req.estimationDueDate ? new Date(req.estimationDueDate).toISOString().split('T')[0] : '');
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignReq || !assignUserId || !assignDueDate) return;
    
    setIsAssigning(true);
    try {
      const member = serviceTeamMembers?.find(m => m.id === assignUserId);
      await assignEstimation(
        selectedAssignReq.id,
        assignUserId,
        member?.fullName || '',
        new Date(assignDueDate),
        currentUser.fullName
      );
      setIsAssignModalOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error(err);
      alert("Failed to assign estimation");
      setIsAssigning(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm md:overflow-hidden overflow-visible">
      {/* ── Top Header Bar ── */}
      <header className="shrink-0 md:h-20 py-4 md:py-0 border-b border-gray-100 px-6 md:px-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-white w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#ff2301] flex items-center justify-center shadow-lg shadow-red-200">
            <Calculator size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">ประเมินราคางานซ่อม/ประกอบ</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price Estimations</p>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <div className="shrink-0 flex items-center justify-between px-8 pt-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-1">
          {[
            { id: 'PENDING' as const, label: 'รอประเมิน', icon: <Clock size={14} /> },
            { id: 'ESTIMATED' as const, label: 'ประเมินแล้ว', icon: <CheckCircle2 size={14} /> },
            { id: 'MONTHLY' as const, label: 'รายเดือน', icon: <CalendarDays size={14} /> },
            { id: 'COMPANY' as const, label: 'แยกตามลูกค้า/บริษัท', icon: <Building2 size={14} /> },
            { id: 'TECHNICIAN' as const, label: 'รายงานตามช่าง', icon: <Users size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'text-[#ff2301] border-[#ff2301] bg-red-50/50'
                  : 'text-gray-400 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30 p-8 space-y-6">
        {/* Search & Manager Filters */}
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between w-full animate-in fade-in zoom-in-95">
          {/* Search */}
          <div className="relative w-full max-w-sm shrink-0">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาบริษัท, พนักงานขาย..."
              className="w-full pl-9 pr-4 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] placeholder-gray-400 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Manager Advanced Filters */}
          {isManager && (
            <div className="flex flex-wrap gap-4 items-center flex-1 xl:justify-end w-full xl:w-auto">
              <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase">ตัวกรอง (MGR):</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400">ระบุวันที่</label>
              <input type="date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setFilterMonth(''); }} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-red-500" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400">เดือน</label>
              <input type="month" value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setFilterDate(''); }} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-red-500" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400">ช่าง/วิศวกร</label>
              <select value={filterTechnician} onChange={(e) => setFilterTechnician(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-red-500 min-w-[150px]">
                <option value="">ทั้งหมด</option>
                {serviceTeamMembers?.map(member => (
                  <option key={member.id} value={member.fullName}>{member.fullName}</option>
                ))}
              </select>
            </div>

            {activeTab === 'MONTHLY' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400">สถานะ</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-red-500">
                  <option value="">ทั้งหมด</option>
                  <option value="PENDING">รอประเมิน</option>
                  <option value="ESTIMATED">ประเมินแล้ว</option>
                </select>
              </div>
            )}
            
            {(filterDate || filterMonth || filterTechnician || filterStatus) && (
              <button onClick={() => { setFilterDate(''); setFilterMonth(''); setFilterTechnician(''); setFilterStatus(''); }} className="mt-4 text-xs font-bold text-red-500 hover:text-red-700 underline">ล้างตัวกรอง</button>
            )}
          </div>
        )}
        </div>

        {/* Cards Grid */}
        {(activeTab === 'PENDING' || activeTab === 'ESTIMATED' || activeTab === 'MONTHLY') && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record: any) => {
              const products = [];
              if (record.formData?.["สินค้า_INVERTER"]) products.push("INVERTER");
              if (record.formData?.["สินค้า_MDB"]) products.push("MDB");
              if (record.formData?.["สินค้า_DB"]) products.push("DB");
              if (record.formData?.["สินค้า_CONTROL"]) products.push("CONTROL");
              
              return (
                <div key={record.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group overflow-hidden">
                  {/* Card Header */}
                  <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gradient-to-br from-gray-50/50 to-white">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold text-xs shadow-sm">
                        <FileText size={12} className="text-[#ff2301]" />
                        {record.boqNumber ? (
                          <span className="text-[#ff2301]">{record.boqNumber}</span>
                        ) : (
                          record.requirementNumber || <span className="text-gray-400 italic">ไม่มีข้อมูล</span>
                        )}
                      </span>
                      {record.boqNumber && record.requirementNumber && (
                        <span className="text-[10px] text-gray-400 font-medium pl-1">
                          Ref: {record.requirementNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">วันที่รับเรื่อง</span>
                      <span className="text-xs font-bold text-gray-900">
                        {new Date(record.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col gap-4">
                    <div>
                      <h3 className="text-[15px] font-black text-gray-900 mb-2 line-clamp-1">{record.companyName}</h3>
                      <div className="flex flex-col gap-1.5 text-[11px] text-gray-500 font-medium">
                        <span className="flex items-center gap-2"><User size={12} className="text-gray-400"/> ผู้ติดต่อ: {record.contactName || '—'}</span>
                        <span className="flex items-center gap-2"><User size={12} className="text-gray-400"/> เซลล์: {record.salesperson}</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">สิ่งที่ต้องการประเมิน</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {products.length > 0 ? products.map(p => (
                          <span key={p} className="px-2 py-1 bg-red-50 border border-red-100 text-[#ff2301] text-[10px] font-black rounded-md">{p}</span>
                        )) : <span className="text-gray-300 text-[10px]">—</span>}
                      </div>

                      {/* Detailed specifications */}
                      {record.formData && (
                        <div className="space-y-1.5 mt-2">
                          {record.formData["สินค้า_INVERTER"] && (
                            <div className="text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-600">
                              <strong className="text-gray-800">INVERTER:</strong> 
                              {record.formData["INVERTER_ยี่ห้อ"] ? ` ยี่ห้อ ${record.formData["INVERTER_ยี่ห้อ"]}` : ''}
                              {record.formData["INVERTER_ขนาดเครื่อง_kW"] ? ` ขนาด ${record.formData["INVERTER_ขนาดเครื่อง_kW"]}kW` : ''}
                              {record.formData["INVERTER_ขนาดเครื่อง_HP"] ? ` ${record.formData["INVERTER_ขนาดเครื่อง_HP"]}HP` : ''}
                              {record.formData["INVERTER_Input_220V_1P"] ? ` (Input 220V 1P)` : ''}
                              {record.formData["INVERTER_Input_220V_3P"] ? ` (Input 220V 3P)` : ''}
                              {record.formData["INVERTER_Input_380V_3P"] ? ` (Input 380V 3P)` : ''}
                              {record.formData["INVERTER_Input_อื่นๆ"] ? ` (${record.formData["INVERTER_Input_อื่นๆ_ระบุ"]})` : ''}
                            </div>
                          )}
                          {record.formData["สินค้า_MOTOR"] && (
                            <div className="text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-600">
                              <strong className="text-gray-800">MOTOR:</strong> 
                              {record.formData["MOTOR_ยี่ห้อ"] ? ` ยี่ห้อ ${record.formData["MOTOR_ยี่ห้อ"]}` : ''}
                              {record.formData["MOTOR_ขนาด_kW"] ? ` ขนาด ${record.formData["MOTOR_ขนาด_kW"]}kW` : ''}
                              {record.formData["MOTOR_ขนาด_HP"] ? ` ${record.formData["MOTOR_ขนาด_HP"]}HP` : ''}
                              {record.formData["MOTOR_ขาตั้ง"] ? ` (ขาตั้ง B3)` : ''}
                              {record.formData["MOTOR_หน้าแปลน"] ? ` (หน้าแปลน B5/B14)` : ''}
                            </div>
                          )}
                          {record.formData["สินค้า_PUMP"] && (
                            <div className="text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-600">
                              <strong className="text-gray-800">PUMP:</strong> 
                              {record.formData["PUMP_ยี่ห้อ"] ? ` ยี่ห้อ ${record.formData["PUMP_ยี่ห้อ"]}` : ''}
                              {record.formData["PUMP_รุ่น"] ? ` รุ่น ${record.formData["PUMP_รุ่น"]}` : ''}
                            </div>
                          )}
                          {record.formData["สินค้า_SOLAR_ROOF"] && (
                            <div className="text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-600">
                              <strong className="text-gray-800">SOLAR ROOF:</strong> 
                              {record.formData["SOLAR_ROOF_OnGrid"] ? ` On-Grid` : ''}
                              {record.formData["SOLAR_ROOF_OffGrid"] ? ` Off-Grid` : ''}
                              {record.formData["SOLAR_ROOF_kW"] ? ` ขนาด ${record.formData["SOLAR_ROOF_kW"]}kW` : ''}
                              {record.formData["SOLAR_ROOF_ยี่ห้อแผง"] ? ` แผง ${record.formData["SOLAR_ROOF_ยี่ห้อแผง"]}` : ''}
                              {record.formData["SOLAR_ROOF_ยี่ห้ออินเวอร์เตอร์"] ? ` อินเวอร์เตอร์ ${record.formData["SOLAR_ROOF_ยี่ห้ออินเวอร์เตอร์"]}` : ''}
                            </div>
                          )}
                          {record.formData["สินค้า_SOLAR_PUMP"] && (
                            <div className="text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-600">
                              <strong className="text-gray-800">SOLAR PUMP:</strong> 
                              {record.formData["SOLAR_PUMP_ยี่ห้อ"] ? ` ยี่ห้อ ${record.formData["SOLAR_PUMP_ยี่ห้อ"]}` : ''}
                              {record.formData["SOLAR_PUMP_รุ่น"] ? ` รุ่น ${record.formData["SOLAR_PUMP_รุ่น"]}` : ''}
                              {record.formData["SOLAR_PUMP_kW"] ? ` ขนาด ${record.formData["SOLAR_PUMP_kW"]}kW` : ''}
                              {record.formData["SOLAR_PUMP_HP"] ? ` ${record.formData["SOLAR_PUMP_HP"]}HP` : ''}
                            </div>
                          )}
                          {(record.formData["สินค้า_MDB"] || record.formData["สินค้า_DB"] || record.formData["สินค้า_CONTROL"]) && (
                            <div className="text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-600">
                              <strong className="text-gray-800">ตู้ MDB / DB / CONTROL:</strong> 
                              {record.formData["ตู้_ลักษณะ"] ? ` ${record.formData["ตู้_ลักษณะ"]}` : ''}
                              {record.formData["ตู้_กว้าง"] && record.formData["ตู้_ยาว"] && record.formData["ตู้_ลึก"] ? ` ขนาด ${record.formData["ตู้_กว้าง"]}x${record.formData["ตู้_ยาว"]}x${record.formData["ตู้_ลึก"]}mm` : ''}
                            </div>
                          )}
                          {record.note && (
                            <div className="text-[11px] bg-yellow-50/50 p-2 rounded-lg border border-yellow-100/50 text-gray-700 mt-2">
                              <strong className="text-gray-800">Note จากเซลล์:</strong> {record.note}
                            </div>
                          )}
                          {record.formData["งบประมาณลูกค้า"] && (
                            <div className="text-[11px] bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50 text-emerald-700 mt-2">
                              <strong className="text-emerald-800">งบประมาณลูกค้า:</strong> {record.formData["งบประมาณลูกค้า"]}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Assignment Info */}
                      {record.assignedTo && (
                        <div className="mt-3 text-[11px] bg-blue-50/50 p-2 rounded-lg border border-blue-100/50 text-blue-700 flex flex-col gap-1">
                          <div><strong className="text-blue-800">ผู้รับผิดชอบ:</strong> {record.assignedTo}</div>
                          {record.estimationDueDate && (
                            <div><strong className="text-blue-800">กำหนดส่ง:</strong> {new Date(record.estimationDueDate).toLocaleDateString('th-TH')}</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Show Result if Estimated */}
                    {activeTab === 'ESTIMATED' && (
                      <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">ราคาประเมิน</span>
                          <span className="text-sm font-black text-gray-900">฿{record.estimatedPrice?.toLocaleString()}</span>
                        </div>
                        {record.estimationNote && (
                          <p className="text-[11px] text-gray-600 mt-2"><strong>หมายเหตุ:</strong> {record.estimationNote}</p>
                        )}
                        <p className="text-[9px] text-gray-400 mt-2 text-right">ประเมินโดย {record.estimatedBy}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Card Actions */}
                  <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                    <Link
                      href={`/sales/requirements/print/${record.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 border border-gray-200 text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-gray-50 hover:text-[#ff2301] hover:border-red-200 shadow-sm transition-all"
                      title="Download/Print PDF"
                    >
                      <Printer size={14} /> ดาวน์โหลด PDF
                    </Link>
                    
                    {activeTab === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        {isManager && (
                          <button 
                            onClick={() => handleOpenAssignModal(record)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#ff2301] border border-red-200 text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-red-50 hover:border-[#ff2301] shadow-sm transition-all"
                          >
                            <User size={14} /> มอบหมาย
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenModal(record)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-[#ff2301] hover:shadow-lg hover:shadow-red-200 transition-all transform hover:-translate-y-0.5"
                        >
                          <Calculator size={14} /> ประเมินราคา
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-gray-100 border-dashed">
              <div className="flex flex-col items-center gap-4 text-gray-300">
                <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                  <Calculator size={32} strokeWidth={1.5} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                  {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : `ไม่มีข้อมูล${activeTab === 'PENDING' ? 'ที่รอประเมิน' : 'ที่ประเมินแล้ว'}`}
                </p>
              </div>
            </div>
          )}
          </div>
        )}
        {activeTab === 'COMPANY' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companyData.length === 0 ? (
              <div className="col-span-full py-8 text-center text-gray-400">ยังไม่มีข้อมูล</div>
            ) : companyData.map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-gray-800 line-clamp-2">{item.company}</h3>
                  <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-xs font-bold shrink-0">{item.count} งาน</span>
                </div>
                <div className="space-y-3">
                  {item.records.slice(0, 3).map((o: any, i: number) => (
                    <div key={i} className="text-sm">
                      <span className="text-red-600 font-medium text-xs block">
                        {o.boqNumber || o.requirementNumber || 'ไม่มีหมายเลข'}
                      </span>
                      <span className="text-gray-500 text-xs truncate block">เซลล์: {o.salesperson || '-'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${o.estimationStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} mt-1 inline-block`}>
                        {o.estimationStatus === 'PENDING' ? 'รอประเมิน' : 'ประเมินแล้ว'}
                      </span>
                    </div>
                  ))}
                  {item.count > 3 && <div className="text-xs text-gray-400 pt-2">และอีก {item.count - 3} รายการ...</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'TECHNICIAN' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {techData.length === 0 ? (
              <div className="col-span-full py-8 text-center text-gray-400">ยังไม่มีข้อมูล</div>
            ) : techData.map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{item.technician}</h3>
                    <p className="text-xs text-gray-500">{item.count} งานประเมิน</p>
                  </div>
                </div>
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  {item.records.slice(0, 3).map((o: any, i: number) => (
                    <div key={i} className="flex flex-col gap-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 truncate mr-2 font-medium">{o.companyName || 'ไม่ระบุบริษัท'}</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold shrink-0 text-[10px] ${o.estimationStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {o.estimationStatus === 'PENDING' ? 'รอประเมิน' : 'เสร็จสิ้น'}
                        </span>
                      </div>
                      <span className="text-gray-400 text-[10px]">
                        กำหนดส่ง: {o.estimationDueDate ? new Date(o.estimationDueDate).toLocaleDateString('th-TH') : '-'}
                      </span>
                    </div>
                  ))}
                  {item.count > 3 && <div className="text-xs text-gray-400 pt-2 text-center">ดูเพิ่มเติม...</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estimation Modal */}
      {isModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <Calculator size={16} className="text-[#ff2301]" />
                </div>
                <h2 className="text-lg font-black text-gray-900">ประเมินราคา</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <p className="text-sm font-bold text-gray-800 mb-1">{selectedReq.companyName}</p>
                <p className="text-xs text-gray-500">เซลล์: {selectedReq.salesperson}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">ราคาประเมิน (บาท) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  min="0"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] bg-gray-50/50"
                  placeholder="เช่น 15000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">รายละเอียดเพิ่มเติม (ถ้ามี)</label>
                <textarea
                  rows={3}
                  value={estimationNote}
                  onChange={(e) => setEstimationNote(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] bg-gray-50/50 resize-none"
                  placeholder="รายละเอียดอุปกรณ์ที่ต้องใช้หรือข้อจำกัด..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || estimatedPrice === ''}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-[#ff2301] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg hover:shadow-red-200 transition-all"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกราคา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {isAssignModalOpen && selectedAssignReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <User size={16} className="text-blue-600" />
                </div>
                <h2 className="text-lg font-black text-gray-900">มอบหมายงานประเมิน</h2>
              </div>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-5">
              <div>
                <p className="text-sm font-bold text-gray-800 mb-1">{selectedAssignReq.companyName}</p>
                <p className="text-xs text-gray-500">เซลล์: {selectedAssignReq.salesperson}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">เลือกผู้รับผิดชอบ <span className="text-red-500">*</span></label>
                <select
                  required
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50"
                >
                  <option value="">-- เลือกพนักงาน --</option>
                  {serviceTeamMembers?.map(member => (
                    <option key={member.id} value={member.id}>{member.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">กำหนดส่ง <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !assignUserId || !assignDueDate}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg hover:shadow-blue-200 transition-all"
                >
                  {isAssigning ? 'กำลังบันทึก...' : 'มอบหมายงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
