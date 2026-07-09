"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { getManagerCheckins } from "@/app/actions/checkins";
import { MapPin, Search, Calendar, User, Clock, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

// Haversine formula for distance calculation
function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c;
  return d * 1.35; // Apply circuity factor to estimate driving distance
}

const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

export default function CheckinsClientPage() {
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  });
  const [dateEnd, setDateEnd] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString().split("T")[0];
  });
  const [filterEmpId, setFilterEmpId] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [checkins, setCheckins] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const start = new Date(dateStart);
      const end = new Date(dateEnd);
      end.setHours(23, 59, 59, 999);
      
      const data = await getManagerCheckins(start, end, filterEmpId || undefined);
      
      let finalCheckins = data.checkins;
      if (selectedBranch) {
        const allowedEmpIds = new Set(data.employees.filter((e: any) => e.branches?.name === selectedBranch).map((e: any) => e.emp_id));
        finalCheckins = finalCheckins.filter((c: any) => allowedEmpIds.has(c.emp_id));
      }
      
      const COLORS = [
        '#dc2626', // Red
        '#2563eb', // Blue
        '#16a34a', // Green
        '#d97706', // Orange
        '#9333ea', // Purple
        '#0891b2', // Cyan
        '#be123c', // Rose
        '#4f46e5', // Indigo
        '#059669', // Emerald
        '#b45309', // Amber
      ];
      
      const employeeColors = new Map<string, string>();
      const processedCheckins = finalCheckins.map((c: any, idx: number) => {
        if (!employeeColors.has(c.employeeName)) {
          employeeColors.set(c.employeeName, COLORS[employeeColors.size % COLORS.length]);
        }
        return {
          ...c,
          color: employeeColors.get(c.employeeName),
          displayNumber: finalCheckins.length - idx
        };
      });

      setCheckins(processedCheckins);
      if (employees.length === 0 && !filterEmpId) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load check-ins");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateStart, dateEnd, filterEmpId, selectedBranch]);

  const uniqueBranches = React.useMemo(() => {
    return Array.from(new Set(employees.map(e => e.branches?.name).filter(Boolean))).sort();
  }, [employees]);

  return (
    <div className="h-full flex flex-col bg-gray-50/30 overflow-hidden flex-1 w-full">
      <header className="shrink-0 bg-white border-b border-gray-100 px-4 md:px-10 py-4 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 z-10 relative">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-200 shrink-0">
            <MapPin className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight leading-tight">ระบบตรวจสอบการลงเวลา</h1>
            <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">GPS Check-in Review Dashboard</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto lg:overflow-hidden p-4 sm:p-6 md:p-8 flex flex-col">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-8 flex-1 min-h-0">
          {/* Left Column: Filters & Table */}
          <div className="lg:col-span-1 flex flex-col gap-4 md:gap-8 h-[500px] lg:h-full min-h-0">
            {/* Filters */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 shrink-0">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Search size={16} /> ตัวกรองข้อมูล
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">วันที่เริ่มต้น</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">วันที่สิ้นสุด</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">สาขา</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      value={selectedBranch}
                      onChange={(e) => {
                        setSelectedBranch(e.target.value);
                        setFilterEmpId(""); // Reset employee filter when branch changes
                      }}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none"
                    >
                      <option value="">ทุกสาขา</option>
                      {uniqueBranches.map(branch => (
                        <option key={branch as string} value={branch as string}>
                          {branch as string}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">พนักงาน</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      value={filterEmpId}
                      onChange={(e) => setFilterEmpId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none"
                    >
                      <option value="">ทั้งหมดในแผนก</option>
                      {employees.filter(emp => !selectedBranch || emp.branches?.name === selectedBranch).map(emp => (
                        <option key={emp.emp_id} value={emp.emp_id}>
                          {emp.name}{emp.nickname ? ` (${emp.nickname})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* List/Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Clock size={16} /> ประวัติการลงเวลา
                </h3>
                <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-lg">
                  {checkins.length} รายการ
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  </div>
                ) : checkins.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                    <MapPin size={48} className="mb-4 text-gray-200" />
                    <p className="text-sm font-medium">ไม่พบข้อมูลการลงเวลา</p>
                    <p className="text-xs mt-1">ลองเปลี่ยนตัวกรองวันที่หรือพนักงาน</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {checkins.map((c, idx) => {
                      const newerC = checkins.slice(0, idx).reverse().find(next => next.employeeName === c.employeeName);
                      let distanceToPrev = 0;
                      if (newerC && c.lat && c.lon && newerC.lat && newerC.lon) {
                        distanceToPrev = getDistanceFromLatLonInKm(newerC.lat, newerC.lon, c.lat, c.lon);
                      }
                      
                      const olderC = checkins.slice(idx + 1).find(prev => prev.employeeName === c.employeeName);
                      let distanceToBranch = 0;
                      if (!olderC && c.branchLat && c.branchLon && c.lat && c.lon) {
                         distanceToBranch = getDistanceFromLatLonInKm(c.branchLat, c.branchLon, c.lat, c.lon);
                      }

                      let distanceToReturn = 0;
                      if (!newerC && c.branchLat && c.branchLon && c.lat && c.lon) {
                         distanceToReturn = getDistanceFromLatLonInKm(c.lat, c.lon, c.branchLat, c.branchLon);
                      }

                      return (
                        <React.Fragment key={c.id}>
                          {distanceToReturn > 0 && (
                            <>
                              <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 mb-2 relative z-0">
                                <div className="flex items-center gap-2">
                                  <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0">
                                    <MapPin size={12} />
                                  </span>
                                  <div>
                                    <span className="text-[11px] font-bold text-indigo-900 block">จุดสิ้นสุด (สาขาหลัก)</span>
                                    <span className="text-[10px] text-indigo-500">{c.employeeName}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-center -my-1 relative z-10 mb-2">
                                <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-medium shadow-sm">
                                  ระยะทางกลับสาขา: {distanceToReturn.toFixed(2)} km
                                </span>
                              </div>
                            </>
                          )}

                          {distanceToPrev > 0 && (
                            <div className="flex justify-center -my-1 relative z-10">
                              <span className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] px-2 py-0.5 rounded-full font-medium shadow-sm">
                                ระยะทางห่างกัน: {distanceToPrev.toFixed(2)} km
                              </span>
                            </div>
                          )}
                          <div className="p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors cursor-pointer group relative z-0">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-start gap-2">
                                <span 
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-white shadow-sm border border-white"
                                  style={{ backgroundColor: c.color }}
                                >
                                  {c.displayNumber}
                                </span>
                                <div>
                                  <span className="text-[11px] font-bold text-gray-900 block">{c.employeeName}</span>
                                  <span className="text-[10px] text-gray-500">
                                    {new Date(c.timestamp).toLocaleString("th-TH")}
                                  </span>
                                </div>
                              </div>
                              {c.type === 'IN' || c.type?.toLowerCase().includes('in') ? (
                                <span className="flex items-center gap-1 text-[9px] font-black uppercase text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 size={10} /> IN
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[9px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                  <XCircle size={10} /> OUT
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                              <MapPin size={12} className="text-red-600 shrink-0" />
                              <span className="truncate">{c.branch_name || c.project_name || "ไม่ระบุสถานที่"}</span>
                            </div>
                            {c.late_status && c.late_status !== 'ON_TIME' && (
                              <div className="mt-2 text-[10px] text-orange-700 bg-orange-50 px-2 py-1 rounded-md border border-orange-100 inline-block">
                                สาย {c.late_min} นาที
                              </div>
                            )}
                          </div>
                          
                          {distanceToBranch > 0 && (
                            <>
                              <div className="flex justify-center -my-1 relative z-10">
                                <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-medium shadow-sm">
                                  ระยะทางจากสาขา: {distanceToBranch.toFixed(2)} km
                                </span>
                              </div>
                              <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 mt-2 relative z-0">
                                <div className="flex items-center gap-2">
                                  <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0">0</span>
                                  <div>
                                    <span className="text-[11px] font-bold text-indigo-900 block">จุดเริ่มต้น (สาขาหลัก)</span>
                                    <span className="text-[10px] text-indigo-500">{c.employeeName}</span>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Map */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-2 h-[350px] lg:h-full min-h-[350px] relative z-0 order-first lg:order-last">
            {isLoading ? (
               <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
               </div>
            ) : (
              <MapComponent checkins={checkins} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
