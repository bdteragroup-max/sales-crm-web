"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  MapPin,
  Wrench,
} from "lucide-react";

interface DashboardChartsProps {
  projects: any[];
}

const PALETTE = [
  "#4f46e5", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#64748b", // Slate
];

const STATUS_COLOR_MAP: Record<string, string> = {
  "In progress": "#4f46e5",
  "Completed": "#10b981",
  "Delayed": "#f59e0b",
  "Cancelled": "#94a3b8",
  "Planning": "#06b6d4",
};

const EQUIPMENT_COLOR_MAP: Record<string, string> = {
  "ใช้งาน": "#10b981",
  "พร้อมใช้": "#06b6d4",
  "ซ่อม": "#f59e0b",
  "ชำรุด": "#f43f5e",
  "สูญหาย": "#94a3b8",
};

function CustomTooltip({ active, payload, label, prefix = "", suffix = "" }: any) {
  if (active && payload && payload.length) {
    const item = payload[0];
    const val = item.value;
    const formattedVal =
      typeof val === "number" ? val.toLocaleString("th-TH") : val;
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
        <p className="font-bold text-slate-800">{label || item.name}</p>
        <p className="text-slate-600 mt-0.5">
          <span className="font-semibold text-indigo-600">
            {prefix}
            {formattedVal}
            {suffix}
          </span>
        </p>
      </div>
    );
  }
  return null;
}

export default function DashboardCharts({ projects }: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
        กำลังประมวลผลข้อมูลกราฟิก...
      </div>
    );
  }

  // 1. Donut: Project Status
  const statusCounts = projects.reduce((acc, p) => {
    const status = p.status || "ไม่ระบุ";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const statusData = Object.keys(statusCounts).map((key) => ({
    name: key,
    value: statusCounts[key],
  }));

  // 2. Bar: Project Value by Category
  const categoryValues = projects.reduce((acc, p) => {
    const cat = p.projectCategory || "ไม่ระบุหมวดหมู่";
    acc[cat] = (acc[cat] || 0) + (Number(p.projectValue) || 0);
    return acc;
  }, {} as Record<string, number>);
  const categoryData = Object.keys(categoryValues)
    .map((key) => ({
      name: key,
      value: categoryValues[key],
    }))
    .sort((a, b) => b.value - a.value);

  // 3. Line/Area: Monthly Trend (Projects created per month)
  const monthlyCounts = projects.reduce((acc, p) => {
    const date = new Date(p.createdAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const monthlyData = Object.keys(monthlyCounts)
    .sort()
    .slice(-12)
    .map((key) => {
      const [year, month] = key.split("-");
      const shortYear = (parseInt(year) + 543).toString().slice(-2);
      return {
        name: `${month}/${shortYear}`,
        projects: monthlyCounts[key],
      };
    });

  // 4. Bar: Projects by Province (Top 8)
  const provinceCounts = projects.reduce((acc, p) => {
    const prov = p.province || "ไม่ระบุ";
    acc[prov] = (acc[prov] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const provinceData = Object.keys(provinceCounts)
    .map((key) => ({ name: key, value: provinceCounts[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // 5. Donut: Equipment by Status
  const allEquipment = projects.flatMap((p) => p.equipment || []);
  const equipmentStatusCounts = allEquipment.reduce((acc, eq: any) => {
    const s = eq.status || "ไม่ระบุ";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const equipmentData = Object.keys(equipmentStatusCounts).map((key) => ({
    name: key,
    value: equipmentStatusCounts[key],
  }));

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `฿${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `฿${(val / 1000).toFixed(0)}k`;
    return `฿${val.toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
      {/* ── Chart 1: Status Donut ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PieIcon size={15} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              สัดส่วนสถานะโครงการ
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            รวม {projects.length} โครงการ
          </span>
        </div>
        <div className="h-64 w-full">
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        STATUS_COLOR_MAP[entry.name] ||
                        PALETTE[index % PALETTE.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip suffix=" โครงการ" />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              ไม่มีข้อมูลสถานะโครงการ
            </div>
          )}
        </div>
      </div>

      {/* ── Chart 2: Category Bar Chart ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BarChart3 size={15} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              มูลค่าโครงการตามหมวดหมู่
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {categoryData.length} หมวดหมู่
          </span>
        </div>
        <div className="h-64 w-full">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  angle={-30}
                  textAnchor="end"
                  height={50}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  width={55}
                />
                <Tooltip content={<CustomTooltip prefix="฿" />} />
                <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              ไม่มีข้อมูลมูลค่าตามหมวดหมู่
            </div>
          )}
        </div>
      </div>

      {/* ── Chart 3: Monthly Trend Area Chart ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              แนวโน้มการเปิดโครงการใหม่ (รายเดือน)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            ย้อนหลัง 12 เดือน
          </span>
        </div>
        <div className="h-64 w-full">
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: 0, bottom: 15 }}
              >
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  width={35}
                />
                <Tooltip content={<CustomTooltip suffix=" โครงการ" />} />
                <Area
                  type="monotone"
                  dataKey="projects"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorTrend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              ไม่มีข้อมูลแนวโน้มรายเดือน
            </div>
          )}
        </div>
      </div>

      {/* ── Chart 4: Projects by Province ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <MapPin size={15} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              การกระจายตัวตามจังหวัด (Top 8)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">พื้นที่โครงการ</span>
        </div>
        <div className="h-64 w-full">
          {provinceData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={provinceData}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={75}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                />
                <Tooltip content={<CustomTooltip suffix=" โครงการ" />} />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              ไม่มีข้อมูลจังหวัด
            </div>
          )}
        </div>
      </div>

      {/* ── Chart 5: Equipment Status Breakdown (Span 2 cols on lg) ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Wrench size={15} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              สถานะและความพร้อมของอุปกรณ์หน้างาน
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            รวม {allEquipment.length} ชิ้น
          </span>
        </div>
        <div className="h-60 w-full flex items-center justify-center">
          {equipmentData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={equipmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {equipmentData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        EQUIPMENT_COLOR_MAP[entry.name] ||
                        PALETTE[(index + 3) % PALETTE.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip suffix=" ชิ้น" />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              ไม่มีข้อมูลอุปกรณ์หน้างาน
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
