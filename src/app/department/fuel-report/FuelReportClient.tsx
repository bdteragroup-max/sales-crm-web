"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Calendar, User, CheckCircle2, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, MapPin, Receipt, Download } from "lucide-react";
import * as XLSX from 'xlsx';

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

export default function FuelReportClient() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split("T")[0];
  });
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const [reviewNote, setReviewNote] = useState("");
  const [reviewingFlag, setReviewingFlag] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/department/fuel-report?startDate=${startDate}&endDate=${endDate}`);
      const result = await res.json();
      if (res.ok) {
        setData(result.data || []);
      } else {
        alert(result.error || "Failed to load report");
      }
    } catch (err) {
      console.error(err);
      alert("Error loading fuel report");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const handleReviewSubmit = async () => {
    if (!reviewingFlag) return;
    try {
      const res = await fetch(`/api/department/fuel-report/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: reviewingFlag.emp_id,
          flagDate: reviewingFlag.date,
          flagType: reviewingFlag.type,
          note: reviewNote
        })
      });
      const result = await res.json();
      if (res.ok) {
        setReviewingFlag(null);
        setReviewNote("");
        loadData(); // reload to show updated review status
      } else {
        alert(result.error || "Failed to update review");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating review");
    }
  };

  const uniqueBranches = React.useMemo(() => {
    const branches = new Set<string>();
    data.forEach(emp => {
      if (emp.branch_name) {
        branches.add(emp.branch_name);
      }
      if (emp.dailyList) {
        emp.dailyList.forEach((day: any) => {
          if (day.checkinsList) {
            day.checkinsList.forEach((chk: any) => {
              if (chk.branch_name) branches.add(chk.branch_name);
              if (chk.project_name) branches.add(chk.project_name);
            });
          }
        });
      }
    });
    return Array.from(branches).sort();
  }, [data]);

  const uniqueDepartments = React.useMemo(() => {
    const departments = new Set<string>();
    data.forEach(emp => {
      if (emp.department_name) {
        departments.add(emp.department_name);
      }
    });
    return Array.from(departments).sort();
  }, [data]);

  const filteredData = React.useMemo(() => {
    return data.map(emp => {
      if (!selectedBranch) return emp;
      
      if (emp.branch_name === selectedBranch) return emp;

      const filteredDailyList = (emp.dailyList || []).filter((day: any) => {
        return day.checkinsList && day.checkinsList.some((c: any) => 
          c.branch_name === selectedBranch || c.project_name === selectedBranch
        );
      });

      return {
        ...emp,
        dailyList: filteredDailyList
      };
    }).filter(emp => {
      if (selectedBranch && emp.branch_name !== selectedBranch && (!emp.dailyList || emp.dailyList.length === 0)) return false;
      if (selectedDepartment && emp.department_name !== selectedDepartment) return false;
      
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return emp.name && emp.name.toLowerCase().includes(q);
    });
  }, [data, selectedBranch, selectedDepartment, searchQuery]);

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert("ไม่มีข้อมูลสำหรับส่งออก");
      return;
    }
    
    const exportData: any[] = [];

    filteredData.forEach(emp => {
      if (emp.dailyList && emp.dailyList.length > 0) {
        emp.dailyList.forEach((day: any) => {
          let routeDetails = "";
          let gpsCoordinates = "";
          if (day.checkinsList && day.checkinsList.length > 0) {
            routeDetails = "จุดเริ่มต้น: สาขาหลัก";
            gpsCoordinates = (emp.branch_lat && emp.branch_lon) ? `${emp.branch_lat.toFixed(4)}, ${emp.branch_lon.toFixed(4)}` : "-";
            day.checkinsList.forEach((chk: any, idx: number) => {
              let distanceToPrev = 0;
              if (idx > 0) {
                const prevChk = day.checkinsList[idx - 1];
                if (chk.lat && chk.lon && prevChk.lat && prevChk.lon) {
                  distanceToPrev = getDistanceFromLatLonInKm(prevChk.lat, prevChk.lon, chk.lat, chk.lon);
                }
              } else {
                if (chk.lat && chk.lon && emp.branch_lat && emp.branch_lon) {
                  distanceToPrev = getDistanceFromLatLonInKm(emp.branch_lat, emp.branch_lon, chk.lat, chk.lon);
                }
              }
              const coordStr = (chk.lat && chk.lon) ? `${chk.lat.toFixed(4)}, ${chk.lon.toFixed(4)}` : "-";
              if (distanceToPrev > 0) {
                routeDetails += `\n↓ ${distanceToPrev.toFixed(2)} km\n${idx + 1}. ${chk.type}`;
                gpsCoordinates += `\n\n${coordStr}`;
              } else {
                routeDetails += `\n${idx + 1}. ${chk.type}`;
                gpsCoordinates += `\n${coordStr}`;
              }
            });
            const lastChk = day.checkinsList[day.checkinsList.length - 1];
            let distanceToBranch = 0;
            if (lastChk.lat && lastChk.lon && emp.branch_lat && emp.branch_lon) {
              distanceToBranch = getDistanceFromLatLonInKm(lastChk.lat, lastChk.lon, emp.branch_lat, emp.branch_lon);
            }
            const branchCoordStr = (emp.branch_lat && emp.branch_lon) ? `${emp.branch_lat.toFixed(4)}, ${emp.branch_lon.toFixed(4)}` : "-";
            if (distanceToBranch > 0) {
              routeDetails += `\n↓ ${distanceToBranch.toFixed(2)} km\nจุดสิ้นสุด: สาขาหลัก`;
              gpsCoordinates += `\n\n${branchCoordStr}`;
            } else {
              routeDetails += `\nจุดสิ้นสุด: สาขาหลัก`;
              gpsCoordinates += `\n${branchCoordStr}`;
            }
          }

          exportData.push({
            'ชื่อพนักงาน': emp.name,
            'แผนก': emp.department_name || 'ไม่ระบุแผนก',
            'สาขา': emp.branch_name || 'ไม่ระบุสาขา',
            'วันที่': day.date,
            'รายละเอียดเส้นทาง': routeDetails,
            'พิกัด GPS': gpsCoordinates,
            'ระยะทาง GPS (กม.)': day.distance,
            'ระยะทางไมล์ (กม.)': day.odometerDistance != null ? day.odometerDistance : '-',
            'ค่าเสื่อม (3บ/กม)': day.depreciation,
            'เติมน้ำมัน (ลิตร)': day.fuelLiters || 0,
            'ยอดเงิน Fleetcard': day.fuelAmount || 0,
            'เบิกจ่าย Manual': day.manualExpenseAmount || 0,
            'การแจ้งเตือน': (day.flags || []).map((f: any) => f.type).join(', ') || '-'
          });
        });
      }
    });

    if (exportData.length === 0) {
      alert("ไม่มีข้อมูลรายวันสำหรับส่งออกในช่วงเวลานี้ (No daily data to export for this period)");
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Fuel Report");
    XLSX.writeFile(wb, `Fuel_Report_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/30 overflow-hidden flex-1 w-full">
      <header className="shrink-0 bg-white border-b border-gray-100 px-4 md:px-6 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 z-10 relative">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-200 shrink-0">
            <ShieldCheck className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight leading-tight whitespace-nowrap">รายงานการใช้น้ำมันและพิกัด (Fuel & GPS)</h1>
            <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Fleetcard & Depreciation Review</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-auto flex gap-2">
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full sm:w-32 px-3 py-2 pr-8 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none text-gray-700"
              >
                <option value="">ทุกแผนก</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full sm:w-32 px-3 py-2 pr-8 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none text-gray-700"
              >
                <option value="">ทุกสาขา</option>
                {uniqueBranches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="ค้นหาชื่อพนักงาน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <Link href="/sales/expenses" className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors border border-blue-100 whitespace-nowrap">
            <Receipt size={16} />
            บันทึกการเบิกจ่าย
          </Link>
          <button 
            onClick={exportToExcel}
            className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors border border-emerald-100 whitespace-nowrap"
          >
            <Download size={16} />
            ส่งออก Excel
          </button>
          <div className="relative w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-auto pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <span className="hidden sm:block text-gray-400 text-sm">-</span>
            <div className="relative w-full sm:w-auto">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-auto pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-12">
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
            <ShieldCheck size={48} className="mb-4 text-gray-200" />
            <p className="text-lg font-bold text-gray-700">ไม่พบข้อมูลที่ค้นหา</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredData.map((emp) => (
              <div key={emp.emp_id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div 
                  className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors"
                  onClick={() => setExpandedEmp(expandedEmp === emp.emp_id ? null : emp.emp_id)}
                >
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full bg-red-100 flex items-center justify-center">
                        <User className="text-red-700 w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">{emp.name}</h3>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                          {emp.department_name ? `${emp.department_name} • ` : ''}
                          {emp.branch_name || "ไม่ระบุสาขา"}
                        </p>
                      </div>
                    </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">ข้อมูลรายวัน</p>
                      <p className="text-sm font-bold text-gray-900">{emp.dailyList.length} วัน</p>
                    </div>
                    {expandedEmp === emp.emp_id ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                  </div>
                </div>

                {expandedEmp === emp.emp_id && (
                  <div className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-white border-b border-gray-100">
                            <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">วันที่</th>
                            <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">ระยะทาง GPS</th>
                            <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">ระยะทางไมล์รถ</th>
                            <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">ค่าเสื่อม (3บ/กม)</th>
                            <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">รายละเอียดเส้นทาง</th>
                            <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">พิกัด GPS</th>
                            <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">เติมน้ำมัน (ลิตร)</th>
                            <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">ยอดเงิน (Fleetcard)</th>
                            <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">เบิกจ่าย (Manual)</th>
                            <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">การแจ้งเตือน (Flags)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {emp.dailyList.map((day: any) => (
                            <tr key={day.date} className="hover:bg-gray-50/50 transition-colors align-top">
                              <td className="px-4 md:px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{day.date}</td>
                              <td className="px-4 md:px-6 py-4 text-sm text-gray-600 text-right">{day.distance.toLocaleString()} กม.</td>
                              <td className="px-4 md:px-6 py-4 text-sm text-gray-600 text-right">{day.odometerDistance != null ? `${day.odometerDistance.toLocaleString()} กม.` : '-'}</td>
                              <td className="px-4 md:px-6 py-4 text-sm text-gray-600 text-right">{day.depreciation.toLocaleString()} ฿</td>
                              <td className="px-4 md:px-6 py-4 text-sm text-gray-600">
                                {day.checkinsList && day.checkinsList.length > 0 ? (
                                  <div className="flex flex-col gap-1.5">
                                    {emp.branch_lat && emp.branch_lon && (
                                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 text-[10px] mb-1 min-h-[24px]">
                                        <span className="font-bold text-indigo-700 w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200">0</span>
                                        <span className="px-1.5 py-0.5 rounded font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                                          จุดเริ่มต้น (สาขาหลัก)
                                        </span>
                                      </div>
                                    )}
                                    {day.checkinsList.map((chk: any, idx: number) => {
                                      let distanceToPrev = 0;
                                      if (idx > 0) {
                                        const prevChk = day.checkinsList[idx - 1];
                                        if (chk.lat && chk.lon && prevChk.lat && prevChk.lon) {
                                          distanceToPrev = getDistanceFromLatLonInKm(prevChk.lat, prevChk.lon, chk.lat, chk.lon);
                                        }
                                      } else {
                                        if (chk.lat && chk.lon && emp.branch_lat && emp.branch_lon) {
                                          distanceToPrev = getDistanceFromLatLonInKm(emp.branch_lat, emp.branch_lon, chk.lat, chk.lon);
                                        }
                                      }

                                      return (
                                        <React.Fragment key={idx}>
                                          {distanceToPrev > 0 && (
                                            <div className="text-[10px] text-blue-500 font-medium pl-6 py-0.5 border-l-2 border-dashed border-blue-200 ml-2 my-0.5 flex items-center gap-1 min-h-[20px]">
                                              ↓ {distanceToPrev.toFixed(2)} km
                                            </div>
                                          )}
                                          <div className="flex items-center gap-1.5 text-[10px] flex-wrap sm:flex-nowrap min-h-[24px]">
                                            <span className="font-bold text-gray-500 w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">{idx + 1}</span>
                                            <span className={`px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${chk.isOffsite || chk.isProject || chk.isTrip ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                              {chk.type}
                                            </span>
                                            {chk.distance > 0 && <span className="text-xs text-gray-500 font-semibold text-right flex-1 sm:ml-auto whitespace-nowrap">{chk.distance} km</span>}
                                          </div>
                                        </React.Fragment>
                                      );
                                    })}
                                    {emp.branch_lat && emp.branch_lon && day.checkinsList.length > 0 && (() => {
                                      const lastChk = day.checkinsList[day.checkinsList.length - 1];
                                      let distanceToBranch = 0;
                                      if (lastChk.lat && lastChk.lon) {
                                        distanceToBranch = getDistanceFromLatLonInKm(lastChk.lat, lastChk.lon, emp.branch_lat, emp.branch_lon);
                                      }
                                      return (
                                        <React.Fragment>
                                          {distanceToBranch > 0 && (
                                            <div className="text-[10px] text-blue-500 font-medium pl-6 py-0.5 border-l-2 border-dashed border-blue-200 ml-2 my-0.5 flex items-center gap-1 min-h-[20px]">
                                              ↓ {distanceToBranch.toFixed(2)} km
                                            </div>
                                          )}
                                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 text-[10px] mt-1 min-h-[24px]">
                                            <span className="font-bold text-indigo-700 w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200">
                                              {day.checkinsList.length + 1}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                                              จุดสิ้นสุด (สาขาหลัก)
                                            </span>
                                          </div>
                                        </React.Fragment>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-4 md:px-6 py-4 text-sm text-gray-600">
                                {day.checkinsList && day.checkinsList.length > 0 ? (
                                  <div className="flex flex-col gap-1.5">
                                    {emp.branch_lat && emp.branch_lon && (
                                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 text-[10px] mb-1 min-h-[24px]">
                                        <a href={`https://maps.google.com/?q=${emp.branch_lat},${emp.branch_lon}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 whitespace-nowrap">
                                          <MapPin size={10} className="shrink-0" />
                                          <span className="whitespace-nowrap">{emp.branch_lat.toFixed(4)}, {emp.branch_lon.toFixed(4)}</span>
                                        </a>
                                      </div>
                                    )}
                                    {day.checkinsList.map((chk: any, idx: number) => {
                                      let distanceToPrev = 0;
                                      if (idx > 0) {
                                        const prevChk = day.checkinsList[idx - 1];
                                        if (chk.lat && chk.lon && prevChk.lat && prevChk.lon) {
                                          distanceToPrev = getDistanceFromLatLonInKm(prevChk.lat, prevChk.lon, chk.lat, chk.lon);
                                        }
                                      } else {
                                        if (chk.lat && chk.lon && emp.branch_lat && emp.branch_lon) {
                                          distanceToPrev = getDistanceFromLatLonInKm(emp.branch_lat, emp.branch_lon, chk.lat, chk.lon);
                                        }
                                      }

                                      return (
                                        <React.Fragment key={`gps-${idx}`}>
                                          {distanceToPrev > 0 && (
                                            <div className="text-[10px] text-transparent select-none font-medium pl-6 py-0.5 border-l-2 border-transparent ml-2 my-0.5 flex items-center gap-1 min-h-[20px]">
                                              |
                                            </div>
                                          )}
                                          <div className="flex items-center gap-1.5 text-[10px] flex-wrap sm:flex-nowrap min-h-[24px]">
                                            {chk.lat && chk.lon ? (
                                              <a href={`https://maps.google.com/?q=${chk.lat},${chk.lon}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 whitespace-nowrap">
                                                <MapPin size={10} className="shrink-0" />
                                                <span className="whitespace-nowrap">{chk.lat.toFixed(4)}, {chk.lon.toFixed(4)}</span>
                                              </a>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </div>
                                        </React.Fragment>
                                      );
                                    })}
                                    {emp.branch_lat && emp.branch_lon && day.checkinsList.length > 0 && (() => {
                                      const lastChk = day.checkinsList[day.checkinsList.length - 1];
                                      let distanceToBranch = 0;
                                      if (lastChk.lat && lastChk.lon) {
                                        distanceToBranch = getDistanceFromLatLonInKm(lastChk.lat, lastChk.lon, emp.branch_lat, emp.branch_lon);
                                      }
                                      return (
                                        <React.Fragment>
                                          {distanceToBranch > 0 && (
                                            <div className="text-[10px] text-transparent select-none font-medium pl-6 py-0.5 border-l-2 border-transparent ml-2 my-0.5 flex items-center gap-1 min-h-[20px]">
                                              |
                                            </div>
                                          )}
                                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 text-[10px] mt-1 min-h-[24px]">
                                            <a href={`https://maps.google.com/?q=${emp.branch_lat},${emp.branch_lon}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 whitespace-nowrap">
                                              <MapPin size={10} className="shrink-0" />
                                              <span className="whitespace-nowrap">{emp.branch_lat.toFixed(4)}, {emp.branch_lon.toFixed(4)}</span>
                                            </a>
                                          </div>
                                        </React.Fragment>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-4 md:px-6 py-4 text-sm text-gray-600 text-right">{day.fuelLiters > 0 ? `${day.fuelLiters} L` : '-'}</td>
                              <td className="px-4 md:px-6 py-4 text-sm text-gray-600 text-right">{day.fuelAmount > 0 ? `${day.fuelAmount.toLocaleString()} ฿` : '-'}</td>
                              <td className="px-4 md:px-6 py-4 text-sm text-gray-600 text-right">{day.manualExpenseAmount > 0 ? `${day.manualExpenseAmount.toLocaleString()} ฿` : '-'}</td>
                              <td className="px-4 md:px-6 py-4 text-sm">
                                {day.flags.length === 0 ? (
                                  <span className="text-gray-400 text-xs">-</span>
                                ) : (
                                  <div className="flex flex-col gap-2 items-start">
                                    {day.flags.map((flag: any, idx: number) => (
                                      <div key={idx} className="flex flex-col xl:flex-row items-start xl:items-center gap-2">
                                        {flag.review ? (
                                          <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap">
                                            <CheckCircle2 size={12} /> {flag.type} (ตรวจสอบแล้ว)
                                          </div>
                                        ) : (
                                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-700 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap">
                                              <AlertTriangle size={12} /> {flag.type}
                                            </div>
                                            <button 
                                              onClick={() => setReviewingFlag({ emp_id: emp.emp_id, date: day.date, type: flag.type })}
                                              className="text-[10px] bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded shadow-sm transition-colors font-bold whitespace-nowrap"
                                            >
                                              Verified (ตรวจสอบ)
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewingFlag && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900">บันทึกการตรวจสอบความผิดปกติ</h3>
              <p className="text-xs text-gray-500 mt-1">
                พนักงาน: {data.find(e => e.emp_id === reviewingFlag.emp_id)?.name} <br/>
                วันที่: {reviewingFlag.date} <br/>
                ประเภท: {reviewingFlag.type}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">หมายเหตุการตรวจสอบ (Optional)</label>
                <textarea 
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="ระบุเหตุผล หรือคำอธิบายเพิ่มเติม..."
                  className="w-full h-24 p-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setReviewingFlag(null)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleReviewSubmit}
                  className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 rounded-xl transition-all active:scale-95"
                >
                  บันทึกการตรวจสอบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
