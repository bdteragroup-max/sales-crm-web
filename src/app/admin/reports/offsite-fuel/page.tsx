"use client";

import React, { useState, useEffect } from "react";
import { Download, Users } from "lucide-react";

export default function AdminOffsiteFuelReport() {
  const [month, setMonth] = useState("");
  const [employees, setEmployees] = useState<{ emp_id: string; name: string }[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");

  useEffect(() => {
    // Set default month to current
    const today = new Date();
    setMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);

    // Fetch employees for dropdown (mocking or fetching all)
    fetch('/api/admin/employees')
      .then(res => res.json())
      .then(data => {
        if (data && data.employees) {
          setEmployees(data.employees);
        }
      })
      .catch(err => console.error("Could not load employees", err));
  }, []);

  const exportIndividual = () => {
    if (!selectedEmpId) return alert("กรุณาเลือกพนักงานก่อน (Please select an employee)");
    window.location.href = `/api/admin/reports/offsite-fuel/export?month=${month}&employeeId=${selectedEmpId}`;
  };

  const exportDepartment = () => {
    window.location.href = `/api/admin/reports/offsite-fuel/export?month=${month}`;
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Offsite Fuel Report Export</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">เลือกเดือน (Select Month)</label>
          <input 
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full md:w-auto px-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">ส่งออกรายบุคคล (Export Individual)</label>
            <select 
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              <option value="">-- เลือกพนักงาน --</option>
              {employees.map(emp => (
                <option key={emp.emp_id} value={emp.emp_id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={exportIndividual}
            className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors border border-blue-100 whitespace-nowrap h-10"
          >
            <Download size={16} />
            Export Individual
          </button>
        </div>

        <hr className="my-6 border-gray-100" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ส่งออกทั้งแผนก (Export Entire Department)</label>
          <button 
            onClick={exportDepartment}
            className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors border border-emerald-100 whitespace-nowrap h-10"
          >
            <Users size={16} />
            Export Entire Department (.zip)
          </button>
          <p className="text-xs text-gray-500 mt-2">ดาวน์โหลดไฟล์ .zip ซึ่งรวมไฟล์ Excel ของพนักงานทุกคน</p>
        </div>
      </div>
    </div>
  );
}
