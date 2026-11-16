'use client';

import React from 'react';
import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
  Eye,
  FileCheck2,
  Flame,
  PenTool,
  Plus,
  ShieldCheck,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  DEFAULT_VISUAL_CHECK_ITEMS,
  REPORT_OVERALL_REMARK_ELEMENT_ID,
  countReportPhotos,
  createDefaultAcInverter,
  createDefaultDcInverter,
  createDefaultThermoCheckpoint,
  findMissingReportPhotoNotes,
  isOverallRemarkMissing,
  resolveElectricalChecks,
  resolveManagerSignConfig,
  type ElectricalCheckMode,
  type InspectionPassStatus,
  type ManagerSignMode,
  type SolarCleaningReportData,
  type VisualCheckCondition,
  type VisualCheckTableItem,
} from '@/app/lib/solarCleaningConfig';
import ThaiBeDateInput from '@/app/components/ThaiBeDateInput';
import SurveySignatureBox from '@/app/sales/surveys/components/SurveySignatureBox';
import CleaningPhotoUploader from './CleaningPhotoUploader';

interface SolarCleaningReportStepProps {
  reportTitle: string;
  reportDate: string;
  overallResult: InspectionPassStatus;
  reportData: SolarCleaningReportData;
  onMetaChange: (patch: {
    reportTitle?: string;
    reportDate?: string;
    overallResult?: InspectionPassStatus;
  }) => void;
  onReportChange: (updater: (prev: SolarCleaningReportData) => SolarCleaningReportData) => void;
  readOnly?: boolean;
  showRemarkErrors?: boolean;
  // Manager approvals
  projectMgrSignUrl: string | null;
  projectMgrName?: string | null;
  projectMgrSignedAt?: string | null;
  serviceMgrSignUrl: string | null;
  serviceMgrName?: string | null;
  serviceMgrSignedAt?: string | null;
  canSignProjectMgr: boolean;
  canSignServiceMgr: boolean;
  isSigningManager?: boolean;
  onQuickManagerSign?: (
    roleType: 'project_manager' | 'service_manager',
    sigUrl: string | null
  ) => Promise<void>;
  onDirectManagerSignChange: (
    roleType: 'project_manager' | 'service_manager',
    sigUrl: string | null
  ) => void;
  currentUserFullName: string;
  recordId?: string;
}

function PassFailToggle({
  value,
  onChange,
  readOnly,
}: {
  value: InspectionPassStatus;
  onChange: (next: InspectionPassStatus) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200 gap-1 shrink-0">
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onChange('PASS')}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
          value === 'PASS'
            ? 'bg-emerald-600 text-white shadow-2xs'
            : 'text-gray-600 hover:bg-white'
        }`}
      >
        <CheckCircle2 size={13} />
        <span>Pass</span>
      </button>
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onChange('NOT_PASS')}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
          value === 'NOT_PASS'
            ? 'bg-red-600 text-white shadow-2xs'
            : 'text-gray-600 hover:bg-white'
        }`}
      >
        <XCircle size={13} />
        <span>Not Pass</span>
      </button>
    </div>
  );
}

export default function SolarCleaningReportStep({
  reportTitle,
  reportDate,
  overallResult,
  reportData,
  onMetaChange,
  onReportChange,
  readOnly = false,
  showRemarkErrors = false,
  projectMgrSignUrl,
  projectMgrName,
  projectMgrSignedAt,
  serviceMgrSignUrl,
  serviceMgrName,
  serviceMgrSignedAt,
  canSignProjectMgr,
  canSignServiceMgr,
  isSigningManager = false,
  onQuickManagerSign,
  onDirectManagerSignChange,
  currentUserFullName,
  recordId,
}: SolarCleaningReportStepProps) {
  const totalPhotos = countReportPhotos(reportData);
  const missingPhotoNotes = findMissingReportPhotoNotes(reportData);
  const hasMissingPhotoNotes = missingPhotoNotes.length > 0;
  const missingOverallRemark = isOverallRemarkMissing(reportData);
  const showOverallRemarkError = showRemarkErrors && missingOverallRemark;
  const hasMissingRequiredReportFields = hasMissingPhotoNotes || missingOverallRemark;

  const { mode: electricalMode, includeAc, includeDc } = resolveElectricalChecks(
    reportData.electricalCheckMode
  );
  const { mode: managerSignMode, showProjectMgr, showServiceMgr } = resolveManagerSignConfig(
    reportData.managerSignMode
  );
  const managerHeadingLabel =
    managerSignMode === 'PM'
      ? 'Project Manager'
      : managerSignMode === 'SM'
      ? 'Service Manager'
      : managerSignMode === 'ANY'
      ? 'Project Manager หรือ Service Manager'
      : 'Project Manager & Service Manager';
  let nextSecNo = 3;
  const acSectionNo = includeAc ? nextSecNo++ : 0;
  const dcVoltSectionNo = includeDc ? nextSecNo++ : 0;
  const dcCurrSectionNo = includeDc ? nextSecNo++ : 0;
  const thermoSectionNo = nextSecNo++;
  const finalSectionNo = nextSecNo++;

  return (
    <div className="space-y-5">
      {/* ── Photo Explanation & Required Summary Helper Banner ── */}
      {!readOnly && (
        <div
          className={`rounded-2xl border p-3.5 sm:px-4 flex flex-wrap items-center justify-between gap-2.5 ${
            hasMissingRequiredReportFields
              ? showRemarkErrors
                ? 'bg-red-50 border-red-300 text-red-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-start sm:items-center gap-2 text-xs font-bold">
            {hasMissingRequiredReportFields ? (
              <AlertCircle size={16} className="shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 sm:mt-0" />
            )}
            <span>
              {hasMissingPhotoNotes && missingOverallRemark
                ? `กรุณาพิมพ์คำอธิบายใต้รูปให้ครบทุกรูป (ยังขาด ${missingPhotoNotes.length}/${totalPhotos} รูป) และกรอกข้อเสนอแนะ / สรุปผลการตรวจสอบระบบโดยรวม *`
                : hasMissingPhotoNotes
                ? `กรุณาพิมพ์คำอธิบายใต้รูปที่แนบให้ครบทุกรูป (ยังขาด ${missingPhotoNotes.length} / ${totalPhotos} รูป)`
                : missingOverallRemark
                ? totalPhotos === 0
                  ? 'กรุณากรอกข้อเสนอแนะ / สรุปผลการตรวจสอบระบบโดยรวม * (และหากแนบรูปถ่าย กรุณาพิมพ์คำอธิบายใต้รูปทุกรูป)'
                  : `อธิบายรูปถ่ายครบทั้ง ${totalPhotos} รูปแล้ว — กรุณากรอกข้อเสนอแนะ / สรุปผลการตรวจสอบระบบโดยรวม * ก่อนบันทึก`
                : totalPhotos === 0
                ? 'กรอกข้อเสนอแนะ / สรุปผลการตรวจสอบระบบโดยรวมเรียบร้อยแล้ว'
                : `อธิบายรายละเอียดรูปถ่ายครบทั้ง ${totalPhotos} รูป และกรอกสรุปผลการตรวจสอบระบบเรียบร้อยแล้ว`}
            </span>
          </div>
        </div>
      )}

      {/* ── Cover Setup ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50 border-b border-gray-200 rounded-t-2xl flex items-center gap-2">
          <FileCheck2 size={17} className="text-[#ff2301] shrink-0" />
          <h3 className="font-black text-sm text-gray-900">
            ข้อมูลหน้าปก Inspection Report
          </h3>
        </div>
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">หัวข้อย่อยหน้าปก</label>
            <input
              type="text"
              disabled={readOnly}
              value={reportData.coverSubtitle}
              onChange={(e) =>
                onReportChange((prev) => ({ ...prev, coverSubtitle: e.target.value }))
              }
              placeholder="PROJECT: SOLAR ROOFTOP"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">ชื่อรายงานบนหน้าปก</label>
            <input
              type="text"
              disabled={readOnly}
              value={reportTitle}
              onChange={(e) => onMetaChange({ reportTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              วันที่ในหน้าปก Report (วัน/เดือน/ปี พ.ศ.)
            </label>
            <ThaiBeDateInput
              disabled={readOnly}
              value={reportDate}
              onChange={(iso) => onMetaChange({ reportDate: iso })}
            />
          </div>
        </div>
      </section>

      {/* ── Section 1: Cleaning PV Solar (Before / During / After) ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-900 text-white flex items-center gap-2">
          <Camera size={17} className="text-red-400 shrink-0" />
          <h3 className="font-black text-sm">
            1. Cleaning PV Solar (ภาพถ่ายการล้างทำความสะอาดแผงโซลาร์)
          </h3>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {[
            {
              key: 'cleaningBefore' as const,
              title: '1.1 ภาพแผงก่อนดำเนินการล้างทำความสะอาด (Before Cleaning)',
            },
            {
              key: 'cleaningDuring' as const,
              title: '1.2 ภาพรวมระหว่างการปฏิบัติงาน (During Cleaning)',
            },
            {
              key: 'cleaningAfter' as const,
              title: '1.3 ภาพหลังจากทำความสะอาดแผง (After Cleaning)',
            },
          ].map((part) => (
            <div
              key={part.key}
              className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200 space-y-3"
            >
              <h4 className="font-bold text-sm text-gray-900">{part.title}</h4>
              <CleaningPhotoUploader
                photos={reportData[part.key].photos}
                photoNotes={reportData[part.key].photoNotes}
                readOnly={readOnly}
                sectionIdPrefix={part.key}
                highlightMissingNotes={showRemarkErrors}
                notePlaceholder="อธิบายสิ่งที่เห็นในรูปนี้ให้ลูกค้าเข้าใจ..."
                onChange={(nextPhotos, nextPhotoNotes) =>
                  onReportChange((prev) => ({
                    ...prev,
                    [part.key]: {
                      ...prev[part.key],
                      photos: nextPhotos,
                      photoNotes: nextPhotoNotes,
                    },
                  }))
                }
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Visual Inspection ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-900 text-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Eye size={17} className="text-emerald-400 shrink-0" />
            <h3 className="font-black text-sm">
              2. Visual Inspection (ตรวจสอบสภาพโดยรวมของอุปกรณ์ในระบบไฟฟ้า)
            </h3>
          </div>
          <PassFailToggle
            value={reportData.visualInspection.status}
            readOnly={readOnly}
            onChange={(status) =>
              onReportChange((prev) => ({
                ...prev,
                visualInspection: { ...prev.visualInspection, status },
              }))
            }
          />
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700">
                รายการอุปกรณ์ที่ตรวจสอบ (เช่น Inverter, AC Box, DC Box, Communication Box)
              </label>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() =>
                    onReportChange((prev) => ({
                      ...prev,
                      visualInspection: {
                        ...prev.visualInspection,
                        equipmentList: [...prev.visualInspection.equipmentList, ''],
                      },
                    }))
                  }
                  className="text-xs font-bold text-[#ff2301] hover:text-red-700 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} /> เพิ่มอุปกรณ์
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {reportData.visualInspection.equipmentList.map((eq, idx) => (
                <div key={`eq-${idx}`} className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled={readOnly}
                    value={eq}
                    onChange={(e) =>
                      onReportChange((prev) => {
                        const list = [...prev.visualInspection.equipmentList];
                        list[idx] = e.target.value;
                        return {
                          ...prev,
                          visualInspection: { ...prev.visualInspection, equipmentList: list },
                        };
                      })
                    }
                    placeholder="เช่น 1. INVERTER SUN2000-50KTL-M3 จำนวน 3 ชุด"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
                  />
                  {!readOnly && reportData.visualInspection.equipmentList.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onReportChange((prev) => ({
                          ...prev,
                          visualInspection: {
                            ...prev.visualInspection,
                            equipmentList: prev.visualInspection.equipmentList.filter(
                              (_, i) => i !== idx
                            ),
                          },
                        }))
                      }
                      className="p-2 text-gray-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Overall Electrical Equipment Visual Check Table */}
          {(() => {
            const visualCheckItems =
              reportData.visualInspection.visualCheckItems &&
              reportData.visualInspection.visualCheckItems.length > 0
                ? reportData.visualInspection.visualCheckItems
                : DEFAULT_VISUAL_CHECK_ITEMS;

            const updateVisualCheckRow = (
              rowIdx: number,
              patch: Partial<VisualCheckTableItem>
            ) => {
              onReportChange((prev) => {
                const base =
                  prev.visualInspection.visualCheckItems &&
                  prev.visualInspection.visualCheckItems.length > 0
                    ? prev.visualInspection.visualCheckItems
                    : DEFAULT_VISUAL_CHECK_ITEMS.map((i) => ({ ...i }));
                const next = base.map((r, i) => (i === rowIdx ? { ...r, ...patch } : r));
                return {
                  ...prev,
                  visualInspection: { ...prev.visualInspection, visualCheckItems: next },
                };
              });
            };

            const renderConditionButtons = (
              currentVal: VisualCheckCondition,
              onSelect: (nextVal: VisualCheckCondition) => void
            ) => (
              <div className="inline-flex rounded-lg bg-gray-100 p-0.5 border border-gray-200 gap-0.5">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => onSelect(currentVal === 'NORMAL' ? '' : 'NORMAL')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    currentVal === 'NORMAL'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  ปกติ
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => onSelect(currentVal === 'ABNORMAL' ? '' : 'ABNORMAL')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    currentVal === 'ABNORMAL'
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  ไม่ปกติ
                </button>
              </div>
            );

            return (
              <div className="space-y-2.5 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-gray-800">
                    ตารางตรวจสอบสภาพโดยรวมของอุปกรณ์ในระบบไฟฟ้า (Visual Check)
                  </label>
                  {!readOnly && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onReportChange((prev) => {
                            const base =
                              prev.visualInspection.visualCheckItems &&
                              prev.visualInspection.visualCheckItems.length > 0
                                ? prev.visualInspection.visualCheckItems
                                : DEFAULT_VISUAL_CHECK_ITEMS;
                            return {
                              ...prev,
                              visualInspection: {
                                ...prev.visualInspection,
                                visualCheckItems: base.map((item) => ({
                                  ...item,
                                  wiringStatus: 'NORMAL',
                                  cabinetStatus: 'NORMAL',
                                })),
                              },
                            };
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-bold cursor-pointer"
                      >
                        ปกติทั้งหมด
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onReportChange((prev) => {
                            const base =
                              prev.visualInspection.visualCheckItems &&
                              prev.visualInspection.visualCheckItems.length > 0
                                ? prev.visualInspection.visualCheckItems
                                : DEFAULT_VISUAL_CHECK_ITEMS.map((i) => ({ ...i }));
                            return {
                              ...prev,
                              visualInspection: {
                                ...prev.visualInspection,
                                visualCheckItems: [
                                  ...base,
                                  {
                                    no: `1.${base.length + 1}`,
                                    label: '',
                                    wiringStatus: 'NORMAL',
                                    cabinetStatus: 'NORMAL',
                                  },
                                ],
                              },
                            };
                          })
                        }
                        className="text-xs font-bold text-[#ff2301] hover:text-red-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} /> เพิ่มรายการตรวจ
                      </button>
                    </div>
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-300">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-900 text-white">
                        <th className="w-16 px-2.5 py-2 text-center border-r border-gray-700">NO.</th>
                        <th className="px-3 py-2 text-left border-r border-gray-700">รายการ</th>
                        <th className="w-40 px-2.5 py-2 text-center border-r border-gray-700">
                          สายไฟฟ้า
                        </th>
                        <th className="w-40 px-2.5 py-2 text-center border-r border-gray-700">
                          อุปกรณ์ไฟฟ้าภายในตู้
                        </th>
                        {!readOnly && <th className="w-12 px-2 py-2 text-center">ลบ</th>}
                      </tr>
                      <tr className="bg-red-50/60 border-b border-gray-300 text-[#ff2301] font-bold">
                        <td className="px-2.5 py-1.5 text-center border-r border-gray-200">1</td>
                        <td className="px-3 py-1.5 border-r border-gray-200">
                          ตรวจเช็คสภาพโดยทั่วไป (Visual check)
                        </td>
                        <td className="px-2.5 py-1.5 text-center border-r border-gray-200 text-[11px]">
                          ปกติ / ไม่ปกติ
                        </td>
                        <td className="px-2.5 py-1.5 text-center border-r border-gray-200 text-[11px]">
                          ปกติ / ไม่ปกติ
                        </td>
                        {!readOnly && <td />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {visualCheckItems.map((row, idx) => (
                        <tr key={`vc-row-${idx}`} className="hover:bg-gray-50/70">
                          <td className="px-2 py-2 border-r border-gray-200 text-center">
                            <input
                              type="text"
                              disabled={readOnly}
                              value={row.no}
                              onChange={(e) =>
                                updateVisualCheckRow(idx, { no: e.target.value })
                              }
                              className="w-full text-center font-mono font-bold text-gray-700 bg-transparent border border-transparent focus:border-gray-300 focus:bg-white rounded-md py-1 outline-none"
                            />
                          </td>
                          <td className="px-2.5 py-2 border-r border-gray-200">
                            <input
                              type="text"
                              disabled={readOnly}
                              value={row.label}
                              onChange={(e) =>
                                updateVisualCheckRow(idx, { label: e.target.value })
                              }
                              placeholder="ระบุรายการอุปกรณ์..."
                              className="w-full px-2 py-1 text-sm text-gray-900 bg-transparent border border-transparent focus:border-gray-300 focus:bg-white rounded-lg outline-none"
                            />
                          </td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">
                            {renderConditionButtons(row.wiringStatus, (nextVal) =>
                              updateVisualCheckRow(idx, { wiringStatus: nextVal })
                            )}
                          </td>
                          <td className="px-2 py-2 border-r border-gray-200 text-center">
                            {renderConditionButtons(row.cabinetStatus, (nextVal) =>
                              updateVisualCheckRow(idx, { cabinetStatus: nextVal })
                            )}
                          </td>
                          {!readOnly && (
                            <td className="px-2 py-2 text-center">
                              {visualCheckItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onReportChange((prev) => ({
                                      ...prev,
                                      visualInspection: {
                                        ...prev.visualInspection,
                                        visualCheckItems: visualCheckItems.filter(
                                          (_, i) => i !== idx
                                        ),
                                      },
                                    }))
                                  }
                                  className="p-1.5 text-gray-400 hover:text-red-600 cursor-pointer"
                                  title="ลบรายการ"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-2.5">
                  {visualCheckItems.map((row, idx) => (
                    <div
                      key={`vc-mob-${idx}`}
                      className="p-3 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          disabled={readOnly}
                          value={row.no}
                          onChange={(e) => updateVisualCheckRow(idx, { no: e.target.value })}
                          className="w-12 px-2 py-1.5 text-center font-mono text-xs font-bold bg-white border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          disabled={readOnly}
                          value={row.label}
                          onChange={(e) => updateVisualCheckRow(idx, { label: e.target.value })}
                          placeholder="ระบุรายการอุปกรณ์..."
                          className="flex-1 px-2.5 py-1.5 text-base sm:text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-[#ff2301]"
                        />
                        {!readOnly && visualCheckItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              onReportChange((prev) => ({
                                ...prev,
                                visualInspection: {
                                  ...prev.visualInspection,
                                  visualCheckItems: visualCheckItems.filter((_, i) => i !== idx),
                                },
                              }))
                            }
                            className="p-1.5 text-red-500 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-2 rounded-lg border border-gray-200 space-y-1">
                          <div className="text-[11px] font-bold text-gray-500">สายไฟฟ้า</div>
                          {renderConditionButtons(row.wiringStatus, (nextVal) =>
                            updateVisualCheckRow(idx, { wiringStatus: nextVal })
                          )}
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-gray-200 space-y-1">
                          <div className="text-[11px] font-bold text-gray-500">
                            อุปกรณ์ภายในตู้
                          </div>
                          {renderConditionButtons(row.cabinetStatus, (nextVal) =>
                            updateVisualCheckRow(idx, { cabinetStatus: nextVal })
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <CleaningPhotoUploader
            photos={reportData.visualInspection.photos}
            photoNotes={reportData.visualInspection.photoNotes}
            readOnly={readOnly}
            sectionIdPrefix="visualInspection"
            highlightMissingNotes={showRemarkErrors}
            notePlaceholder="อธิบายอุปกรณ์หรือจุดที่ตรวจเช็คในรูปนี้..."
            onChange={(photos, photoNotes) =>
              onReportChange((prev) => ({
                ...prev,
                visualInspection: { ...prev.visualInspection, photos, photoNotes },
              }))
            }
          />
        </div>
      </section>

      {/* ── Electrical Check Scope Selector (AC / DC / Both) ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap size={17} className="text-[#ff2301] shrink-0" />
            <div>
              <h3 className="font-black text-sm text-gray-900">
                ระบบไฟฟ้าที่ตรวจวัด (AC / DC Electrical Inspection)
              </h3>
              <p className="text-[11px] text-gray-500">
                เลือกว่าหน้างานมีเฉพาะระบบ AC, เฉพาะระบบ DC หรือตรวจสอบครบทั้ง 2 ระบบ (AC และ DC)
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-[11px] font-bold text-gray-700">
            {electricalMode === 'BOTH'
              ? 'กำลังตรวจ: AC + DC (ทั้ง 2 ระบบ)'
              : electricalMode === 'AC'
              ? 'กำลังตรวจ: เฉพาะ AC'
              : 'กำลังตรวจ: เฉพาะ DC'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(
            [
              {
                mode: 'BOTH' as ElectricalCheckMode,
                title: 'ทั้ง AC และ DC (2 ระบบ)',
                desc: 'ตรวจครบ AC Voltage + DC Voltage + DC Current',
              },
              {
                mode: 'AC' as ElectricalCheckMode,
                title: 'เฉพาะระบบ AC',
                desc: 'ตรวจวัดค่าแรงดันไฟฟ้า AC Output เท่านั้น',
              },
              {
                mode: 'DC' as ElectricalCheckMode,
                title: 'เฉพาะระบบ DC',
                desc: 'ตรวจวัดค่า DC Voltage & DC Current เท่านั้น',
              },
            ] as const
          ).map((opt) => {
            const active = electricalMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                disabled={readOnly}
                onClick={() =>
                  onReportChange((prev) => ({
                    ...prev,
                    electricalCheckMode: opt.mode,
                  }))
                }
                className={`p-3 rounded-xl border text-left transition cursor-pointer disabled:cursor-not-allowed ${
                  active
                    ? 'border-[#ff2301] bg-red-50/70 ring-2 ring-[#ff2301]/15'
                    : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-black text-xs sm:text-sm ${
                      active ? 'text-[#ff2301]' : 'text-gray-900'
                    }`}
                  >
                    {opt.title}
                  </span>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      active
                        ? 'border-[#ff2301] bg-[#ff2301] text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── AC Voltage System ── */}
      {includeAc && (
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-900 text-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap size={17} className="text-amber-400 shrink-0" />
            <h3 className="font-black text-sm">
              {acSectionNo}. AC Voltage System (ตรวจวัดค่าแรงดันไฟฟ้า AC Output)
            </h3>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                onReportChange((prev) => ({
                  ...prev,
                  acVoltageSystems: [
                    ...prev.acVoltageSystems,
                    createDefaultAcInverter(prev.acVoltageSystems.length + 1),
                  ],
                }))
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff2301] hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus size={13} /> เพิ่ม Inverter AC
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {reportData.acVoltageSystems.map((inv, idx) => (
            <div
              key={`ac-inv-${idx}`}
              className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  type="text"
                  disabled={readOnly}
                  value={inv.inverterName}
                  onChange={(e) =>
                    onReportChange((prev) => {
                      const next = [...prev.acVoltageSystems];
                      next[idx] = { ...next[idx], inverterName: e.target.value };
                      return { ...prev, acVoltageSystems: next };
                    })
                  }
                  className="font-black text-sm text-gray-900 bg-white border border-gray-300 rounded-xl px-3 py-1.5 w-48"
                />
                <div className="flex items-center gap-2">
                  <PassFailToggle
                    value={inv.status}
                    readOnly={readOnly}
                    onChange={(status) =>
                      onReportChange((prev) => {
                        const next = [...prev.acVoltageSystems];
                        next[idx] = { ...next[idx], status };
                        return { ...prev, acVoltageSystems: next };
                      })
                    }
                  />
                  {!readOnly && reportData.acVoltageSystems.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onReportChange((prev) => ({
                          ...prev,
                          acVoltageSystems: prev.acVoltageSystems.filter((_, i) => i !== idx),
                        }))
                      }
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: 'voltRS' as const, label: 'Volt AC (R-S) [VAC]' },
                  { key: 'voltRT' as const, label: 'Volt AC (R-T) [VAC]' },
                  { key: 'voltST' as const, label: 'Volt AC (S-T) [VAC]' },
                ].map((f) => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600">{f.label}</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={inv[f.key]}
                      onChange={(e) =>
                        onReportChange((prev) => {
                          const next = [...prev.acVoltageSystems];
                          next[idx] = { ...next[idx], [f.key]: e.target.value };
                          return { ...prev, acVoltageSystems: next };
                        })
                      }
                      placeholder="เช่น 406.9"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-sm font-mono font-bold outline-none focus:border-[#ff2301]"
                    />
                  </div>
                ))}
              </div>

              <CleaningPhotoUploader
                photos={inv.photos}
                photoNotes={inv.photoNotes}
                readOnly={readOnly}
                label="อัปโหลดภาพถ่ายวัดค่า AC Output"
                sectionIdPrefix={`ac-${idx}`}
                highlightMissingNotes={showRemarkErrors}
                notePlaceholder={`อธิบายภาพวัดค่าแรงดัน AC ของ ${inv.inverterName || `INVERTER NO.${idx + 1}`}...`}
                onChange={(photos, photoNotes) =>
                  onReportChange((prev) => {
                    const next = [...prev.acVoltageSystems];
                    next[idx] = { ...next[idx], photos, photoNotes };
                    return { ...prev, acVoltageSystems: next };
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>
      )}

      {/* ── DC Voltage & DC Current Systems ── */}
      {includeDc &&
        [
          {
            field: 'dcVoltageSystems' as const,
            sectionNo: dcVoltSectionNo,
            title: 'DC Voltage System (ตรวจวัดแรงดันไฟฟ้า DC Input)',
            unit: 'VDC',
            placeholder: 'เช่น 619.9',
          },
          {
            field: 'dcCurrentSystems' as const,
            sectionNo: dcCurrSectionNo,
            title: 'DC Current System (ตรวจวัดกระแสไฟฟ้า DC Input)',
            unit: 'A',
            placeholder: 'เช่น 15.7',
          },
        ].map((cfg) => (
        <section
          key={cfg.field}
          className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden"
        >
          <div className="px-4 sm:px-5 py-3.5 bg-gray-900 text-white flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity size={17} className="text-blue-400 shrink-0" />
              <h3 className="font-black text-sm">
                {cfg.sectionNo}. {cfg.title}
              </h3>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() =>
                  onReportChange((prev) => ({
                    ...prev,
                    [cfg.field]: [
                      ...prev[cfg.field],
                      createDefaultDcInverter(prev[cfg.field].length + 1),
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff2301] hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus size={13} /> เพิ่ม Inverter
              </button>
            )}
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {reportData[cfg.field].map((inv, idx) => (
              <div
                key={`${cfg.field}-${idx}`}
                className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <input
                    type="text"
                    disabled={readOnly}
                    value={inv.inverterName}
                    onChange={(e) =>
                      onReportChange((prev) => {
                        const next = [...prev[cfg.field]];
                        next[idx] = { ...next[idx], inverterName: e.target.value };
                        return { ...prev, [cfg.field]: next };
                      })
                    }
                    className="font-black text-sm text-gray-900 bg-white border border-gray-300 rounded-xl px-3 py-1.5 w-48"
                  />
                  <div className="flex items-center gap-2">
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          onReportChange((prev) => {
                            const next = [...prev[cfg.field]];
                            const strings = [
                              ...next[idx].strings,
                              { label: `STRING NO.${next[idx].strings.length + 1}`, value: '' },
                            ];
                            next[idx] = { ...next[idx], strings };
                            return { ...prev, [cfg.field]: next };
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-700 cursor-pointer"
                      >
                        + เพิ่ม String
                      </button>
                    )}
                    <PassFailToggle
                      value={inv.status}
                      readOnly={readOnly}
                      onChange={(status) =>
                        onReportChange((prev) => {
                          const next = [...prev[cfg.field]];
                          next[idx] = { ...next[idx], status };
                          return { ...prev, [cfg.field]: next };
                        })
                      }
                    />
                    {!readOnly && reportData[cfg.field].length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          onReportChange((prev) => ({
                            ...prev,
                            [cfg.field]: prev[cfg.field].filter((_, i) => i !== idx),
                          }))
                        }
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {inv.strings.map((st, sIdx) => (
                    <div
                      key={`${cfg.field}-${idx}-st-${sIdx}`}
                      className="p-2.5 rounded-xl bg-white border border-gray-200 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <input
                          type="text"
                          disabled={readOnly}
                          value={st.label}
                          onChange={(e) =>
                            onReportChange((prev) => {
                              const next = [...prev[cfg.field]];
                              const strings = [...next[idx].strings];
                              strings[sIdx] = { ...strings[sIdx], label: e.target.value };
                              next[idx] = { ...next[idx], strings };
                              return { ...prev, [cfg.field]: next };
                            })
                          }
                          className="text-[11px] font-bold text-gray-600 w-full outline-none"
                        />
                        {!readOnly && inv.strings.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              onReportChange((prev) => {
                                const next = [...prev[cfg.field]];
                                next[idx] = {
                                  ...next[idx],
                                  strings: next[idx].strings.filter((_, i) => i !== sIdx),
                                };
                                return { ...prev, [cfg.field]: next };
                              })
                            }
                            className="text-gray-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          disabled={readOnly}
                          value={st.value}
                          onChange={(e) =>
                            onReportChange((prev) => {
                              const next = [...prev[cfg.field]];
                              const strings = [...next[idx].strings];
                              strings[sIdx] = { ...strings[sIdx], value: e.target.value };
                              next[idx] = { ...next[idx], strings };
                              return { ...prev, [cfg.field]: next };
                            })
                          }
                          placeholder={cfg.placeholder}
                          className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-base sm:text-sm font-mono font-bold outline-none focus:border-[#ff2301]"
                        />
                        <span className="text-xs font-mono font-bold text-gray-500 shrink-0">
                          {cfg.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <CleaningPhotoUploader
                  photos={inv.photos}
                  photoNotes={inv.photoNotes}
                  readOnly={readOnly}
                  label={`อัปโหลดภาพถ่ายมิเตอร์ ${cfg.unit}`}
                  sectionIdPrefix={`${cfg.field === 'dcVoltageSystems' ? 'dc-volt' : 'dc-curr'}-${idx}`}
                  highlightMissingNotes={showRemarkErrors}
                  notePlaceholder={`อธิบายภาพมิเตอร์ ${cfg.unit} ของ ${inv.inverterName || `INVERTER NO.${idx + 1}`}...`}
                  onChange={(photos, photoNotes) =>
                    onReportChange((prev) => {
                      const next = [...prev[cfg.field]];
                      next[idx] = { ...next[idx], photos, photoNotes };
                      return { ...prev, [cfg.field]: next };
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* ── Thermo Scan Check ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-900 text-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame size={17} className="text-orange-400 shrink-0" />
            <h3 className="font-black text-sm">
              {thermoSectionNo}. Thermo Scan Check (ตรวจเช็คภาพความร้อนอุปกรณ์ไฟฟ้า)
            </h3>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                onReportChange((prev) => ({
                  ...prev,
                  thermoScan: {
                    ...prev.thermoScan,
                    checkpoints: [
                      ...prev.thermoScan.checkpoints,
                      createDefaultThermoCheckpoint(`จุดตรวจเช็ค #${prev.thermoScan.checkpoints.length + 1}`),
                    ],
                  },
                }))
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff2301] hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus size={13} /> เพิ่มจุดตรวจ Thermo
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-amber-900">
                มาตรฐาน NETA และข้อกำหนดอุณหภูมิ
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                value={reportData.thermoScan.netaDescription}
                onChange={(e) =>
                  onReportChange((prev) => ({
                    ...prev,
                    thermoScan: { ...prev.thermoScan, netaDescription: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-base sm:text-xs outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-amber-900">
                รุ่นกล้องถ่ายภาพความร้อนที่ใช้ตรวจเช็ค
              </label>
              <input
                type="text"
                disabled={readOnly}
                value={reportData.thermoScan.cameraModel}
                onChange={(e) =>
                  onReportChange((prev) => ({
                    ...prev,
                    thermoScan: { ...prev.thermoScan, cameraModel: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-base sm:text-sm outline-none"
              />
            </div>
          </div>

          {reportData.thermoScan.checkpoints.map((cp, idx) => (
            <div
              key={`thermo-${idx}`}
              className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  type="text"
                  disabled={readOnly}
                  value={cp.title}
                  onChange={(e) =>
                    onReportChange((prev) => {
                      const next = [...prev.thermoScan.checkpoints];
                      next[idx] = { ...next[idx], title: e.target.value };
                      return { ...prev, thermoScan: { ...prev.thermoScan, checkpoints: next } };
                    })
                  }
                  placeholder="เช่น AC BOX / DC BOX / MDB"
                  className="font-bold text-sm text-gray-900 bg-white border border-gray-300 rounded-xl px-3 py-1.5 flex-1 max-w-xs"
                />
                <div className="flex items-center gap-2">
                  <PassFailToggle
                    value={cp.status}
                    readOnly={readOnly}
                    onChange={(status) =>
                      onReportChange((prev) => {
                        const next = [...prev.thermoScan.checkpoints];
                        next[idx] = { ...next[idx], status };
                        return { ...prev, thermoScan: { ...prev.thermoScan, checkpoints: next } };
                      })
                    }
                  />
                  {!readOnly && reportData.thermoScan.checkpoints.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onReportChange((prev) => ({
                          ...prev,
                          thermoScan: {
                            ...prev.thermoScan,
                            checkpoints: prev.thermoScan.checkpoints.filter((_, i) => i !== idx),
                          },
                        }))
                      }
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <CleaningPhotoUploader
                photos={cp.photos}
                photoNotes={cp.photoNotes}
                readOnly={readOnly}
                label="อัปโหลดภาพถ่าย Thermo Scan"
                sectionIdPrefix={`thermo-${idx}`}
                highlightMissingNotes={showRemarkErrors}
                notePlaceholder={`อธิบายภาพความร้อนจุด ${cp.title || `#${idx + 1}`} ให้ลูกค้าเข้าใจ...`}
                onChange={(photos, photoNotes) =>
                  onReportChange((prev) => {
                    const next = [...prev.thermoScan.checkpoints];
                    next[idx] = { ...next[idx], photos, photoNotes };
                    return { ...prev, thermoScan: { ...prev.thermoScan, checkpoints: next } };
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 7: System Test Results & Dual Manager Certification ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-900 text-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-emerald-400 shrink-0" />
            <h3 className="font-black text-sm">
              {finalSectionNo}. System test results — สรุปผลการตรวจระบบ &amp; ลงนามรับรอง ({managerHeadingLabel})
            </h3>
          </div>
          <PassFailToggle
            value={overallResult}
            readOnly={readOnly}
            onChange={(val) => onMetaChange({ overallResult: val })}
          />
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-black text-gray-900 underline underline-offset-4">
                System test results
              </span>
              <span className="text-xs font-semibold text-gray-500">
                ผลการทดสอบระบบโดยรวม
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onMetaChange({ overallResult: 'PASS' })}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition cursor-pointer disabled:cursor-default ${
                  overallResult !== 'NOT_PASS'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-black shrink-0 ${
                    overallResult !== 'NOT_PASS'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-gray-400 bg-white text-transparent'
                  }`}
                >
                  &#10003;
                </span>
                <span className="text-sm font-black">Pass</span>
              </button>

              <button
                type="button"
                disabled={readOnly}
                onClick={() => onMetaChange({ overallResult: 'NOT_PASS' })}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition cursor-pointer disabled:cursor-default ${
                  overallResult === 'NOT_PASS'
                    ? 'border-red-600 bg-red-50 text-red-900 shadow-2xs'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-black shrink-0 ${
                    overallResult === 'NOT_PASS'
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-gray-400 bg-white text-transparent'
                  }`}
                >
                  &#10003;
                </span>
                <span className="text-sm font-black">Not Pass</span>
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={REPORT_OVERALL_REMARK_ELEMENT_ID}
              className="block text-xs font-bold text-gray-700"
            >
              ข้อเสนอแนะ / สรุปผลการตรวจสอบระบบโดยรวม <span className="text-red-600">*</span>
            </label>
            <textarea
              id={REPORT_OVERALL_REMARK_ELEMENT_ID}
              rows={2}
              required
              disabled={readOnly}
              value={reportData.overallRemark}
              onChange={(e) =>
                onReportChange((prev) => ({ ...prev, overallRemark: e.target.value }))
              }
              placeholder="กรุณาสรุปสภาพการทำงานของระบบและข้อเสนอแนะเพิ่มเติมสำหรับลูกค้า..."
              className={`w-full px-3.5 py-2.5 border rounded-xl text-base sm:text-sm outline-none transition ${
                showOverallRemarkError
                  ? 'border-red-400 bg-red-50/40 focus:border-red-600 ring-2 ring-red-500/15'
                  : 'border-gray-300 focus:border-[#ff2301]'
              } disabled:bg-gray-100 disabled:text-gray-600`}
            />
            {showOverallRemarkError && (
              <p className="text-[11px] font-bold text-red-600">
                * กรุณากรอกข้อเสนอแนะ / สรุปผลการตรวจสอบระบบโดยรวมก่อนบันทึก
              </p>
            )}
          </div>

          {/* Manager Signature Mode Selector */}
          <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-gray-900">
                <PenTool size={14} className="text-[#ff2301]" />
                ผู้ลงนามรับรองรายงาน (เลือก Project Manager หรือ Service Manager)
              </span>
              {managerSignMode === 'ANY' && (projectMgrSignUrl || serviceMgrSignUrl) && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  อนุมัติครบตามเงื่อนไขแล้ว ({projectMgrSignUrl ? 'Project Manager' : 'Service Manager'} ลงนามแล้ว)
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {(
                [
                  {
                    value: 'PM' as ManagerSignMode,
                    title: 'เฉพาะ Project Manager',
                    desc: 'ให้ Project Manager ลงนามคนเดียว',
                  },
                  {
                    value: 'SM' as ManagerSignMode,
                    title: 'เฉพาะ Service Manager',
                    desc: 'ให้ Service Manager ลงนามคนเดียว',
                  },
                  {
                    value: 'ANY' as ManagerSignMode,
                    title: 'PM หรือ Service Mgr (คนใดคนหนึ่ง)',
                    desc: 'คนใดคนหนึ่งลงนามถือว่าเสร็จสมบูรณ์',
                  },
                  {
                    value: 'BOTH' as ManagerSignMode,
                    title: 'ทั้ง 2 ฝ่าย (PM & Service Mgr)',
                    desc: 'ต้องลงนามรับรองครบทั้ง 2 คน',
                  },
                ] as const
              ).map((opt) => {
                const active = managerSignMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={readOnly}
                    onClick={() =>
                      onReportChange((prev) => ({ ...prev, managerSignMode: opt.value }))
                    }
                    className={`p-3 rounded-xl border text-left transition cursor-pointer disabled:cursor-default ${
                      active
                        ? 'border-[#ff2301] bg-red-50/60 ring-2 ring-red-500/15'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-black text-gray-900">{opt.title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`grid gap-4 ${
              showProjectMgr && showServiceMgr
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 max-w-2xl'
            }`}
          >
            {/* Project Manager Signature */}
            {showProjectMgr && (
              <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-gray-900">
                    <PenTool size={14} className="text-[#ff2301]" />
                    ผู้จัดการฝ่ายโปรเจค (Project Manager)
                  </span>
                  {!canSignProjectMgr && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600">
                      สงวนสิทธิ์เฉพาะ PM / Eng Mgr.
                    </span>
                  )}
                </div>

                <SurveySignatureBox
                  title="ลงนามตรวจสอบโดย Project Manager"
                  subtitle="สำหรับผู้จัดการโปรเจค / วิศวกรรม เซ็นรับรองรายงาน"
                  signerName={projectMgrName || (canSignProjectMgr ? currentUserFullName : 'ผู้จัดการโปรเจค')}
                  signedAt={projectMgrSignedAt || undefined}
                  savedKeyName={canSignProjectMgr ? currentUserFullName : undefined}
                  value={projectMgrSignUrl}
                  readOnly={!canSignProjectMgr || isSigningManager}
                  accentColor="red"
                  onChange={(nextUrl) => onDirectManagerSignChange('project_manager', nextUrl)}
                />

                {recordId && canSignProjectMgr && onQuickManagerSign && (
                  <button
                    type="button"
                    disabled={isSigningManager || !projectMgrSignUrl}
                    onClick={() => onQuickManagerSign('project_manager', projectMgrSignUrl)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#ff2301] hover:bg-red-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    บันทึกและยืนยันลายเซ็น Project Manager
                  </button>
                )}
              </div>
            )}

            {/* Service Manager Signature */}
            {showServiceMgr && (
              <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-gray-900">
                    <PenTool size={14} className="text-blue-600" />
                    ผู้จัดการฝ่ายเซอร์วิส (Service Manager)
                  </span>
                  {!canSignServiceMgr && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600">
                      สงวนสิทธิ์เฉพาะ Service Mgr.
                    </span>
                  )}
                </div>

                <SurveySignatureBox
                  title="ลงนามตรวจสอบโดย Service Manager"
                  subtitle="สำหรับผู้จัดการเซอร์วิส เซ็นรับรองรายงาน"
                  signerName={serviceMgrName || (canSignServiceMgr ? currentUserFullName : 'ผู้จัดการเซอร์วิส')}
                  signedAt={serviceMgrSignedAt || undefined}
                  savedKeyName={canSignServiceMgr ? currentUserFullName : undefined}
                  value={serviceMgrSignUrl}
                  readOnly={!canSignServiceMgr || isSigningManager}
                  accentColor="slate"
                  onChange={(nextUrl) => onDirectManagerSignChange('service_manager', nextUrl)}
                />

                {recordId && canSignServiceMgr && onQuickManagerSign && (
                  <button
                    type="button"
                    disabled={isSigningManager || !serviceMgrSignUrl}
                    onClick={() => onQuickManagerSign('service_manager', serviceMgrSignUrl)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    บันทึกและยืนยันลายเซ็น Service Manager
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

