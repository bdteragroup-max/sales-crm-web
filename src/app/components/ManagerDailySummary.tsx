import React, { useState } from 'react';
import { Target, TrendingUp, Users, MapPin, DollarSign, Activity, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { exportToExcel, exportToPDF } from '@/app/utils/exportUtils';

interface ManagerDailySummaryProps {
  productPerformance: any[];
  branchPerformance: any[];
  employeePerformance: any[];
  branchExpenses: any[];
  salesReps: any[];
  monthlyTargets: any[];
}

export default function ManagerDailySummary({
  productPerformance,
  branchPerformance,
  employeePerformance,
  branchExpenses,
  salesReps,
  monthlyTargets
}: ManagerDailySummaryProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Aggregate expenses by branch
  const expensesByBranch = branchExpenses.reduce((acc, expense) => {
    const branch = expense.branch || 'Head Office';
    if (!acc[branch]) acc[branch] = 0;
    acc[branch] += expense.amount || 0;
    return acc;
  }, {} as Record<string, number>);

  // Enhanced Branch Performance (Sales vs Expenses)
  const enrichedBranchPerformance = branchPerformance.map(bp => {
    const expenses = expensesByBranch[bp.branch] || 0;
    return {
      ...bp,
      expenses,
      profit: bp.closedAmount - expenses
    };
  });

  // Aggregate expenses by salesperson
  const expensesByIndividual = branchExpenses.reduce((acc, expense) => {
    if (expense.salespersonId) {
      if (!acc[expense.salespersonId]) acc[expense.salespersonId] = 0;
      acc[expense.salespersonId] += expense.amount || 0;
    }
    return acc;
  }, {} as Record<string, number>);

  // Enhanced Individual Performance (Sales vs Expenses)
  const enrichedEmployeePerformance = employeePerformance.map(ep => {
    // Find the rep id from name since employeePerformance might only have name
    const rep = salesReps.find(r => r.fullName === ep.fullName);
    const expenses = rep ? (expensesByIndividual[rep.id] || 0) : 0;
    return {
      ...ep,
      expenses,
      profit: (ep.won || 0) - expenses
    };
  }).sort((a, b) => (b.won || 0) - (a.won || 0)); // Sort by highest sales

  const handleExportExcel = () => {
    setIsExporting('excel');
    try {
      exportToExcel({
        productPerformance,
        branchPerformance: enrichedBranchPerformance,
        employeePerformance: enrichedEmployeePerformance
      }, `Executive_Summary_${new Date().toISOString().split('T')[0]}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting('pdf');
    try {
      await exportToPDF('manager-summary-export-area', `Executive_Summary_${new Date().toISOString().split('T')[0]}`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-8">
      
      {/* EXPORT HEADER */}
      <div className="flex items-center justify-between bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">ข้อมูลสรุปผู้บริหาร (Executive Summary)</h2>
          <p className="text-sm font-bold text-gray-400 mt-1">ภาพรวมผลการดำเนินงาน ยอดขาย และค่าใช้จ่าย</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={isExporting !== null}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 transition-colors rounded-xl font-bold text-sm disabled:opacity-50"
          >
            {isExporting === 'excel' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting !== null}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-brand-red hover:bg-red-100 transition-colors rounded-xl font-bold text-sm disabled:opacity-50"
          >
            {isExporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            PDF
          </button>
        </div>
      </div>

      <div id="manager-summary-export-area" className="flex flex-col gap-8">
        {/* 1. PRODUCT GROUP PERFORMANCE */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-6">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Target size={20} className="text-brand-red" />
            เป้าหมายรายกลุ่มสินค้าและสถานะปัจจุบัน (เป้าหมายและสถานะกลุ่มสินค้า)
          </h3>
          <p className="text-xs font-bold text-gray-400 mt-1">เปรียบเทียบยอดขายรวมกับเป้าหมายที่อิงตามแผนก</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {productPerformance.map(pp => (
            <div key={pp.category} className="bg-gray-50/80 border border-gray-100 rounded-2xl p-5 flex flex-col gap-3">
              <span className="text-sm font-black text-gray-700 uppercase">{pp.category}</span>
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">ยอดขาย / สถานะ</span>
                  <span className="text-xl font-black text-gray-900">฿{(pp.closedAmount / 1000000).toFixed(2)}M</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">เป้าหมาย</span>
                  <span className="text-sm font-black text-gray-500">{pp.targetAmount > 0 ? `฿${(pp.targetAmount / 1000000).toFixed(2)}M` : 'N/A'}</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-2.5 rounded-full ${pp.targetComparisonPct >= 100 ? 'bg-green-500' : pp.targetComparisonPct >= 70 ? 'bg-yellow-400' : 'bg-red-500'}`} 
                  style={{ width: `${Math.min(100, pp.targetComparisonPct)}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-[10px] font-bold text-gray-500">
                <span>{pp.targetComparisonPct.toFixed(1)}% บรรลุเป้า</span>
                <span className="text-brand-red">PO ค้าง: ฿{(pp.pendingPoAmount / 1000000).toFixed(2)}M</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. BRANCH COMPARISON (Sales vs Expenses) */}
      <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <div className="mb-6">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <MapPin size={20} className="text-blue-600" />
            เปรียบเทียบยอดขายและค่าใช้จ่ายรายสาขา (ยอดขายเทียบกับค่าใช้จ่ายรายสาขา)
          </h3>
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={enrichedBranchPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="branch" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#6B7280' }} 
                tickFormatter={(val) => `฿${(val / 1000000).toFixed(1)}M`} 
              />
              <RechartsTooltip 
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
                        <p className="font-black text-sm text-gray-800 mb-2">{payload[0].payload.branch}</p>
                        <p className="text-xs font-bold text-green-600">Sales: ฿{payload[0].value?.toLocaleString()}</p>
                        <p className="text-xs font-bold text-red-500">Expenses: ฿{payload[1].value?.toLocaleString()}</p>
                        <p className="text-xs font-black text-gray-900 mt-1 pt-1 border-t border-gray-100">
                          Profit: ฿{(Number(payload[0].value) - Number(payload[1].value)).toLocaleString()}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px' }} />
              <Bar dataKey="closedAmount" name="ยอดขาย" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={60} />
              <Bar dataKey="expenses" name="ค่าใช้จ่าย" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 3. INDIVIDUAL COMPARISON (Sales vs Expenses) */}
      <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <div className="mb-6">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Users size={20} className="text-indigo-600" />
            เปรียบเทียบยอดขายและค่าใช้จ่ายรายบุคคล (ยอดขายเทียบกับค่าใช้จ่ายรายบุคคล)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase">พนักงานขาย</th>
                <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase text-right">ยอดขาย</th>
                <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase text-right">ค่าใช้จ่าย</th>
                <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase text-right">กำไรเบื้องต้น</th>
                <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase text-center">สัดส่วนต้นทุนต่อยอดขาย %</th>
              </tr>
            </thead>
            <tbody>
              {enrichedEmployeePerformance.map((emp, idx) => {
                const costRatio = emp.won > 0 ? (emp.expenses / emp.won) * 100 : 0;
                return (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 text-sm font-bold text-gray-900">{emp.fullName}</td>
                    <td className="px-4 py-4 text-sm font-black text-green-600 text-right">฿{(emp.won || 0).toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm font-black text-red-500 text-right">฿{emp.expenses.toLocaleString()}</td>
                    <td className={`px-4 py-4 text-sm font-black text-right ${emp.profit >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                      ฿{emp.profit.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black ${costRatio > 20 ? 'bg-red-100 text-red-700' : costRatio > 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {costRatio.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      </div>{/* End export area */}
    </div>
  );
}
