"use client";

import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';

interface DashboardChartsProps {
  projects: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

export default function DashboardCharts({ projects }: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-[300px] flex items-center justify-center text-gray-400">กำลังโหลดข้อมูลกราฟ...</div>;

  // 1. Donut: Project Status
  const statusCounts = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const statusData = Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] }));

  // 2. Bar: Project Value by Category
  const categoryValues = projects.reduce((acc, p) => {
    const cat = p.projectCategory || 'ไม่ระบุหมวดหมู่';
    acc[cat] = (acc[cat] || 0) + (Number(p.projectValue) || 0);
    return acc;
  }, {} as Record<string, number>);
  const categoryData = Object.keys(categoryValues).map(key => ({ name: key, value: categoryValues[key] }));

  // 3. Line: Monthly Trend (Projects created per month)
  const monthlyCounts = projects.reduce((acc, p) => {
    const date = new Date(p.createdAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const monthlyData = Object.keys(monthlyCounts).sort().map(key => ({ name: key, projects: monthlyCounts[key] }));

  // 4. Bar: Projects by Province
  const provinceCounts = projects.reduce((acc, p) => {
    const prov = p.province || 'ไม่ระบุ';
    acc[prov] = (acc[prov] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const provinceData = Object.keys(provinceCounts).map(key => ({ name: key, value: provinceCounts[key] })).sort((a, b) => b.value - a.value).slice(0, 10);

  // 5. Donut: Equipment by Status
  const allEquipment = projects.flatMap(p => p.equipment || []);
  const equipmentStatusCounts = allEquipment.reduce((acc, eq: any) => {
    acc[eq.status] = (acc[eq.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const equipmentData = Object.keys(equipmentStatusCounts).map(key => ({ name: key, value: equipmentStatusCounts[key] }));

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    return `${val.toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">สัดส่วนสถานะโครงการ</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">มูลค่าโครงการตามหมวดหมู่</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} fontSize={12} />
              <YAxis tickFormatter={formatCurrency} fontSize={12} />
              <Tooltip formatter={(value: any) => `฿${value.toLocaleString()}`} />
              <Bar dataKey="value" fill="#ff2301" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">แนวโน้มโครงการรายเดือน</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="projects" stroke="#00C49F" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">โครงการตามจังหวัด</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={provinceData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" fontSize={12} />
              <YAxis dataKey="name" type="category" width={80} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">สถานะอุปกรณ์</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={equipmentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                {equipmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
