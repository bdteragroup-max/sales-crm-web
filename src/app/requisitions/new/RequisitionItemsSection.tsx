'use client';

import React from 'react';
import {
  Plus,
  Minus,
  Trash2,
  FileSpreadsheet,
  Info,
  ShieldAlert,
} from 'lucide-react';

export interface ProjectItem {
  detail: string;
  quantity: number;
  unit: string;
  job: string;
  remark: string;
}

export interface EquipmentItem {
  detail: string;
  assetCode: string;
  quantity: number;
  unit: string;
  condition: string;
  remark: string;
}

export interface ClaimItem {
  detail: string;
  assetCode: string;
  quantity: number;
  unit: string;
  job: string;
  remark: string;
}

export const EQUIPMENT_CONDITION_OPTIONS = [
  'สมบูรณ์พร้อมใช้งาน',
  'มีรอยขีดข่วนทั่วไป',
  'อุปกรณ์เสริมครบกล่อง',
  'ต้องระมัดระวังพิเศษ',
];

export const EQUIPMENT_UNITS = ['เครื่อง', 'ตัว', 'ชุด', 'กล่อง', 'อัน', 'ปาก', 'ชิ้น'];
export const MATERIAL_UNITS = ['เมตร', 'ม้วน', 'เส้น', 'EA', 'กล่อง', 'ถุง', 'ชุด', 'ท่อน'];
const CLAIM_UNITS = [...EQUIPMENT_UNITS, ...MATERIAL_UNITS].filter(
  (v, i, a) => a.indexOf(v) === i
);

interface RequisitionItemsSectionProps {
  requisitionType: 'PROJECT' | 'BORROW_EQUIPMENT' | 'CLAIM';
  projectItems: ProjectItem[];
  onAddProjectItem: () => void;
  onRemoveProjectItem: (index: number) => void;
  onUpdateProjectItem: (index: number, field: keyof ProjectItem, value: string | number) => void;
  onExcelImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  equipmentItems: EquipmentItem[];
  onAddEquipmentItem: () => void;
  onRemoveEquipmentItem: (index: number) => void;
  onUpdateEquipmentItem: (index: number, field: keyof EquipmentItem, value: string | number) => void;
  claimItems: ClaimItem[];
  claimRefName: string;
  onAddClaimItem: () => void;
  onRemoveClaimItem: (index: number) => void;
  onUpdateClaimItem: (index: number, field: keyof ClaimItem, value: string | number) => void;
}

function QuantityStepper({
  value,
  onChange,
  accentClass,
}: {
  value: number;
  onChange: (nextQty: number) => void;
  accentClass: string;
}) {
  const safeVal = Number(value) || 1;
  return (
    <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden min-h-[44px]">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, safeVal - 1))}
        disabled={safeVal <= 1}
        className="w-11 min-h-[44px] flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 transition-colors border-r border-slate-200 shrink-0"
        aria-label="ลดจำนวน"
      >
        <Minus size={16} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={safeVal}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
        className={`w-full min-w-0 min-h-[44px] px-1 text-center font-black text-slate-900 bg-white outline-none text-base sm:text-sm ${accentClass}`}
      />
      <button
        type="button"
        onClick={() => onChange(safeVal + 1)}
        className="w-11 min-h-[44px] flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors border-l border-slate-200 shrink-0"
        aria-label="เพิ่มจำนวน"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

function UnitQuickChips({
  units,
  selectedUnit,
  activeClass,
  onSelect,
}: {
  units: string[];
  selectedUnit: string;
  activeClass: string;
  onSelect: (unit: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {units.slice(0, 6).map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onSelect(u)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
            selectedUnit === u
              ? activeClass
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

/**
 * Responsive items editor rendering touch-friendly stacked cards on mobile (< md)
 * and a multi-column table on desktop (>= md) across all three requisition modes.
 */
export default function RequisitionItemsSection({
  requisitionType,
  projectItems,
  onAddProjectItem,
  onRemoveProjectItem,
  onUpdateProjectItem,
  onExcelImport,
  equipmentItems,
  onAddEquipmentItem,
  onRemoveEquipmentItem,
  onUpdateEquipmentItem,
  claimItems,
  claimRefName,
  onAddClaimItem,
  onRemoveClaimItem,
  onUpdateClaimItem,
}: RequisitionItemsSectionProps) {
  const inputMobileSafe =
    'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none text-base sm:text-sm';

  if (requisitionType === 'PROJECT') {
    return (
      <div className="space-y-4 pt-4 border-t border-slate-100 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-900">
              รายการวัสดุ/อุปกรณ์โครงการ ({projectItems.length} รายการ)
            </label>
            <p className="text-xs text-slate-500">
              กรอกรายการวัสดุ หรือกดนำเข้าจากไฟล์ Excel ของโครงการ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:flex items-center gap-2">
            <label className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:bg-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-emerald-300 shadow-xs">
              <FileSpreadsheet size={16} />
              <span>นำเข้าไฟล์ Excel (.xlsx)</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={onExcelImport}
              />
            </label>

            <button
              type="button"
              onClick={onAddProjectItem}
              className="hidden sm:inline-flex min-h-[40px] items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <Plus size={15} />
              <span>เพิ่มรายการวัสดุ</span>
            </button>
          </div>
        </div>

        {/* Mobile Touch Cards (< md) */}
        <div className="md:hidden space-y-3">
          {projectItems.map((item, index) => (
            <div
              key={index}
              className="p-3.5 rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/40 to-white space-y-3 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-800">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white inline-flex items-center justify-center text-[11px]">
                    {index + 1}
                  </span>
                  <span>รายการวัสดุ #{index + 1}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveProjectItem(index)}
                  disabled={projectItems.length === 1}
                  className="min-w-[40px] min-h-[36px] px-2.5 inline-flex items-center justify-center gap-1 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 disabled:opacity-30 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>ลบ</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ชื่อรายการวัสดุ / อุปกรณ์ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={item.detail}
                  onChange={(e) => onUpdateProjectItem(index, 'detail', e.target.value)}
                  placeholder="เช่น สายไฟ VCT-G 3C x 6, Cable gland..."
                  className={`${inputMobileSafe} focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    จำนวน <span className="text-red-500">*</span>
                  </label>
                  <QuantityStepper
                    value={item.quantity}
                    onChange={(q) => onUpdateProjectItem(index, 'quantity', q)}
                    accentClass="focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    หน่วย <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="material-units"
                    value={item.unit}
                    onChange={(e) => onUpdateProjectItem(index, 'unit', e.target.value)}
                    placeholder="หน่วย..."
                    className={`${inputMobileSafe} text-center font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                  />
                </div>
              </div>

              <UnitQuickChips
                units={MATERIAL_UNITS}
                selectedUnit={item.unit}
                activeClass="bg-blue-600 text-white border-blue-600"
                onSelect={(u) => onUpdateProjectItem(index, 'unit', u)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    งานที่ใช้ / Sub-Job
                  </label>
                  <input
                    type="text"
                    value={item.job}
                    onChange={(e) => onUpdateProjectItem(index, 'job', e.target.value)}
                    placeholder="เช่น งานติดตั้ง Zone C..."
                    className={`${inputMobileSafe} focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    หมายเหตุ
                  </label>
                  <input
                    type="text"
                    value={item.remark}
                    onChange={(e) => onUpdateProjectItem(index, 'remark', e.target.value)}
                    placeholder="หมายเหตุ..."
                    className={`${inputMobileSafe} focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onAddProjectItem}
            className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-2xl text-sm font-bold transition-all shadow-sm"
          >
            <Plus size={18} />
            <span>เพิ่มรายการวัสดุ</span>
          </button>
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-700 font-bold">
                <th className="px-3 py-3 w-12 text-center">ลำดับ</th>
                <th className="px-4 py-3">รายการวัสดุ / อุปกรณ์</th>
                <th className="px-3 py-3 w-28 text-center">จำนวน</th>
                <th className="px-3 py-3 w-28 text-center">หน่วย</th>
                <th className="px-4 py-3 w-44">งานที่ใช้ / Sub-Job</th>
                <th className="px-4 py-3 w-40">หมายเหตุ</th>
                <th className="px-2 py-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {projectItems.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-3 py-2.5 text-center text-slate-400 font-bold text-xs">{index + 1}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      value={item.detail}
                      onChange={(e) => onUpdateProjectItem(index, 'detail', e.target.value)}
                      placeholder="เช่น สายไฟ VCT-G 3C x 6, Cable gland M32, ท่อ PVC..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => onUpdateProjectItem(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm text-center font-bold text-slate-800"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="text"
                      list="material-units"
                      value={item.unit}
                      onChange={(e) => onUpdateProjectItem(index, 'unit', e.target.value)}
                      placeholder="หน่วย..."
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm text-center"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      value={item.job}
                      onChange={(e) => onUpdateProjectItem(index, 'job', e.target.value)}
                      placeholder="เช่น งานติดตั้ง Zone C..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      value={item.remark}
                      onChange={(e) => onUpdateProjectItem(index, 'remark', e.target.value)}
                      placeholder="หมายเหตุ..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm"
                    />
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveProjectItem(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                      disabled={projectItems.length === 1}
                      title="ลบรายการ"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <datalist id="material-units">
          {MATERIAL_UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
          <Info size={14} className="text-blue-600 shrink-0" />
          <span>วัสดุอุปกรณ์รายการนี้จะถูกตัดยอดเข้าต้นทุนโครงการจริง ไม่ต้องนำส่งคืนสโตร์</span>
        </div>
      </div>
    );
  }

  if (requisitionType === 'BORROW_EQUIPMENT') {
    return (
      <div className="space-y-4 pt-4 border-t border-slate-100 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-900">
              รายการเครื่องมือและอุปกรณ์ที่ขอยืม ({equipmentItems.length} รายการ)
            </label>
            <p className="text-xs text-slate-500">
              ระบุชื่อเครื่องมือ รหัสทรัพย์สิน (ถ้ามี) จำนวน และสภาพของเครื่องมือก่อนนำออกจากสโตร์
            </p>
          </div>

          <button
            type="button"
            onClick={onAddEquipmentItem}
            className="hidden sm:inline-flex min-h-[40px] items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Plus size={15} />
            <span>เพิ่มเครื่องมือที่ยืม</span>
          </button>
        </div>

        {/* Mobile Touch Cards (< md) */}
        <div className="md:hidden space-y-3">
          {equipmentItems.map((item, index) => (
            <div
              key={index}
              className="p-3.5 rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/40 to-white space-y-3 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-100">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-900">
                  <span className="w-6 h-6 rounded-lg bg-amber-600 text-white inline-flex items-center justify-center text-[11px]">
                    {index + 1}
                  </span>
                  <span>อุปกรณ์ #{index + 1}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveEquipmentItem(index)}
                  disabled={equipmentItems.length === 1}
                  className="min-w-[40px] min-h-[36px] px-2.5 inline-flex items-center justify-center gap-1 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 disabled:opacity-30 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>ลบ</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ชื่อเครื่องมือ / รายการอุปกรณ์ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={item.detail}
                  onChange={(e) => onUpdateEquipmentItem(index, 'detail', e.target.value)}
                  placeholder="เช่น สว่านกระแทกไร้สาย 18V, Clamp Meter..."
                  className={`${inputMobileSafe} font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    จำนวน <span className="text-red-500">*</span>
                  </label>
                  <QuantityStepper
                    value={item.quantity}
                    onChange={(q) => onUpdateEquipmentItem(index, 'quantity', q)}
                    accentClass="focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    หน่วย <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="equipment-units"
                    value={item.unit}
                    onChange={(e) => onUpdateEquipmentItem(index, 'unit', e.target.value)}
                    placeholder="หน่วย..."
                    className={`${inputMobileSafe} text-center font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500`}
                  />
                </div>
              </div>

              <UnitQuickChips
                units={EQUIPMENT_UNITS}
                selectedUnit={item.unit}
                activeClass="bg-amber-600 text-white border-amber-600"
                onSelect={(u) => onUpdateEquipmentItem(index, 'unit', u)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    รหัส / Serial No.
                  </label>
                  <input
                    type="text"
                    value={item.assetCode}
                    onChange={(e) => onUpdateEquipmentItem(index, 'assetCode', e.target.value)}
                    placeholder="เช่น TL-012..."
                    className={`${inputMobileSafe} focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    สภาพก่อนยืม
                  </label>
                  <select
                    value={item.condition}
                    onChange={(e) => onUpdateEquipmentItem(index, 'condition', e.target.value)}
                    className={`${inputMobileSafe} font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500`}
                  >
                    {EQUIPMENT_CONDITION_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  อุปกรณ์เสริม / หมายเหตุ
                </label>
                <input
                  type="text"
                  value={item.remark}
                  onChange={(e) => onUpdateEquipmentItem(index, 'remark', e.target.value)}
                  placeholder="เช่น แบต 2 ก้อน + สายชาร์จ..."
                  className={`${inputMobileSafe} focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500`}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onAddEquipmentItem}
            className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white rounded-2xl text-sm font-bold transition-all shadow-sm"
          >
            <Plus size={18} />
            <span>เพิ่มเครื่องมือที่ยืม</span>
          </button>
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto border border-amber-200/80 rounded-2xl shadow-xs">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-amber-50/70 border-b border-amber-200 text-xs text-amber-950 font-bold">
                <th className="px-3 py-3 w-12 text-center">ลำดับ</th>
                <th className="px-4 py-3">ชื่อเครื่องมือ / รายการอุปกรณ์</th>
                <th className="px-3 py-3 w-32">รหัส / Serial No.</th>
                <th className="px-3 py-3 w-24 text-center">จำนวน</th>
                <th className="px-3 py-3 w-28 text-center">หน่วย</th>
                <th className="px-3 py-3 w-44">สภาพก่อนยืม</th>
                <th className="px-4 py-3 w-40">อุปกรณ์เสริม / หมายเหตุ</th>
                <th className="px-2 py-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {equipmentItems.map((item, index) => (
                <tr key={index} className="hover:bg-amber-50/30 transition-colors">
                  <td className="px-3 py-2.5 text-center text-slate-400 font-bold text-xs">{index + 1}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      value={item.detail}
                      onChange={(e) => onUpdateEquipmentItem(index, 'detail', e.target.value)}
                      placeholder="เช่น สว่านกระแทกไร้สาย 18V, ตู้เชื่อม, Clamp Meter Fluke..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm font-medium"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="text"
                      value={item.assetCode}
                      onChange={(e) => onUpdateEquipmentItem(index, 'assetCode', e.target.value)}
                      placeholder="เช่น TL-012..."
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => onUpdateEquipmentItem(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm text-center font-bold text-slate-800"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="text"
                      list="equipment-units"
                      value={item.unit}
                      onChange={(e) => onUpdateEquipmentItem(index, 'unit', e.target.value)}
                      placeholder="หน่วย..."
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm text-center"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={item.condition}
                      onChange={(e) => onUpdateEquipmentItem(index, 'condition', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs bg-white"
                    >
                      {EQUIPMENT_CONDITION_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      value={item.remark}
                      onChange={(e) => onUpdateEquipmentItem(index, 'remark', e.target.value)}
                      placeholder="เช่น แบต 2 ก้อน + สายชาร์จ..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm"
                    />
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveEquipmentItem(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                      disabled={equipmentItems.length === 1}
                      title="ลบรายการ"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <datalist id="equipment-units">
          {EQUIPMENT_UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>

        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <ShieldAlert size={15} className="text-amber-600 shrink-0" />
          <span>
            เครื่องมือและอุปกรณ์ทั้งหมดเป็นทรัพย์สินส่วนกลาง กรุณาดูแลรักษาให้อยู่ในสภาพพร้อมใช้งาน และนำส่งคืนตามกำหนดเวลา
          </span>
        </div>
      </div>
    );
  }

  // CLAIM
  return (
    <div className="space-y-4 pt-4 border-t border-slate-100 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-900">
            รายการสินค้า / อะไหล่ที่เบิกเคลม ({claimItems.length} รายการ)
          </label>
          <p className="text-xs text-slate-500">
            ระบุรุ่นสินค้าหรืออะไหล่ที่เบิกไปเคลม พร้อมรหัส/Serial No. (ถ้ามี) และอ้างอิงงานเคลม
          </p>
        </div>

        <button
          type="button"
          onClick={onAddClaimItem}
          className="hidden sm:inline-flex min-h-[40px] items-center justify-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
        >
          <Plus size={15} />
          <span>เพิ่มรายการเบิกเคลม</span>
        </button>
      </div>

      {/* Mobile Touch Cards (< md) */}
      <div className="md:hidden space-y-3">
        {claimItems.map((item, index) => (
          <div
            key={index}
            className="p-3.5 rounded-2xl border border-violet-200/90 bg-gradient-to-b from-violet-50/40 to-white space-y-3 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-violet-100">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-violet-900">
                <span className="w-6 h-6 rounded-lg bg-violet-600 text-white inline-flex items-center justify-center text-[11px]">
                  {index + 1}
                </span>
                <span>รายการเคลม #{index + 1}</span>
              </span>
              <button
                type="button"
                onClick={() => onRemoveClaimItem(index)}
                disabled={claimItems.length === 1}
                className="min-w-[40px] min-h-[36px] px-2.5 inline-flex items-center justify-center gap-1 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 disabled:opacity-30 transition-colors"
              >
                <Trash2 size={14} />
                <span>ลบ</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                รายการสินค้า / อะไหล่ที่เบิกเคลม <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={item.detail}
                onChange={(e) => onUpdateClaimItem(index, 'detail', e.target.value)}
                placeholder="เช่น Inverter Namwon 37kW, ปั๊มน้ำ Calpeda..."
                className={`${inputMobileSafe} font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  จำนวน <span className="text-red-500">*</span>
                </label>
                <QuantityStepper
                  value={item.quantity}
                  onChange={(q) => onUpdateClaimItem(index, 'quantity', q)}
                  accentClass="focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  หน่วย <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="claim-units"
                  value={item.unit}
                  onChange={(e) => onUpdateClaimItem(index, 'unit', e.target.value)}
                  placeholder="หน่วย..."
                  className={`${inputMobileSafe} text-center font-semibold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500`}
                />
              </div>
            </div>

            <UnitQuickChips
              units={CLAIM_UNITS}
              selectedUnit={item.unit}
              activeClass="bg-violet-600 text-white border-violet-600"
              onSelect={(u) => onUpdateClaimItem(index, 'unit', u)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  รหัส / Serial No.
                </label>
                <input
                  type="text"
                  value={item.assetCode}
                  onChange={(e) => onUpdateClaimItem(index, 'assetCode', e.target.value)}
                  placeholder="Serial / รหัส..."
                  className={`${inputMobileSafe} focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  งานเคลม / ลูกค้า
                </label>
                <input
                  type="text"
                  value={item.job}
                  onChange={(e) => onUpdateClaimItem(index, 'job', e.target.value)}
                  placeholder={claimRefName || 'ชื่อลูกค้า / เลขเคลม...'}
                  className={`${inputMobileSafe} focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                อาการเสีย / หมายเหตุ
              </label>
              <input
                type="text"
                value={item.remark}
                onChange={(e) => onUpdateClaimItem(index, 'remark', e.target.value)}
                placeholder="เช่น เคลมเปลี่ยนตัวใหม่..."
                className={`${inputMobileSafe} focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500`}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={onAddClaimItem}
          className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 active:scale-[0.99] text-white rounded-2xl text-sm font-bold transition-all shadow-sm"
        >
          <Plus size={18} />
          <span>เพิ่มรายการเบิกเคลม</span>
        </button>
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto border border-violet-200/80 rounded-2xl shadow-xs">
        <table className="w-full text-left border-collapse min-w-[750px]">
          <thead>
            <tr className="bg-violet-50/70 border-b border-violet-200 text-xs text-violet-950 font-bold">
              <th className="px-3 py-3 w-12 text-center">ลำดับ</th>
              <th className="px-4 py-3">รายการสินค้า / อะไหล่ที่เบิกเคลม</th>
              <th className="px-3 py-3 w-36">รหัส / Serial No.</th>
              <th className="px-3 py-3 w-24 text-center">จำนวน</th>
              <th className="px-3 py-3 w-28 text-center">หน่วย</th>
              <th className="px-4 py-3 w-44">งานเคลม / ลูกค้า</th>
              <th className="px-4 py-3 w-40">อาการเสีย / หมายเหตุ</th>
              <th className="px-2 py-3 w-12 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {claimItems.map((item, index) => (
              <tr key={index} className="hover:bg-violet-50/30 transition-colors">
                <td className="px-3 py-2.5 text-center text-slate-400 font-bold text-xs">{index + 1}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="text"
                    value={item.detail}
                    onChange={(e) => onUpdateClaimItem(index, 'detail', e.target.value)}
                    placeholder="เช่น Inverter Namwon 37kW, ปั๊มน้ำ Calpeda, บอร์ดควบคุม..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-xs sm:text-sm font-medium"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <input
                    type="text"
                    value={item.assetCode}
                    onChange={(e) => onUpdateClaimItem(index, 'assetCode', e.target.value)}
                    placeholder="Serial / รหัส..."
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-xs sm:text-sm"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onUpdateClaimItem(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-xs sm:text-sm text-center font-bold text-slate-800"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <input
                    type="text"
                    list="claim-units"
                    value={item.unit}
                    onChange={(e) => onUpdateClaimItem(index, 'unit', e.target.value)}
                    placeholder="หน่วย..."
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-xs sm:text-sm text-center"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="text"
                    value={item.job}
                    onChange={(e) => onUpdateClaimItem(index, 'job', e.target.value)}
                    placeholder={claimRefName || 'ชื่อลูกค้า / เลขเคลม...'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-xs sm:text-sm"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="text"
                    value={item.remark}
                    onChange={(e) => onUpdateClaimItem(index, 'remark', e.target.value)}
                    placeholder="เช่น เคลมตัวใหม่..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-xs sm:text-sm"
                  />
                </td>
                <td className="px-2 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => onRemoveClaimItem(index)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                    disabled={claimItems.length === 1}
                    title="ลบรายการ"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <datalist id="claim-units">
        {CLAIM_UNITS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <div className="p-3 bg-violet-50/70 border border-violet-200/80 rounded-xl text-xs text-violet-900 flex items-center gap-2">
        <Info size={15} className="text-violet-600 shrink-0" />
        <span>
          รายการเบิกเคลมนี้เป็นการเบิกตัดจ่ายถาวรเพื่อส่งมอบหรือเปลี่ยนสินค้าเคลมให้ลูกค้า <strong>ไม่มีการคืนสินค้าเข้าสโตร์</strong>
        </span>
      </div>
    </div>
  );
}
