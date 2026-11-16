'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Building2,
  Calculator,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  Home,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Paperclip,
  PenTool,
  X,
  Zap,
} from 'lucide-react';
import {
  REQUIRED_CHECKLIST_ITEMS,
  ROOF_PATTERN_LABELS,
  collectSurveyAttachments,
  extractAttachmentFilename,
  formatNum,
  formatThaiDate,
  getElectricityBillUrl,
  getEstimationStatusMeta,
  getSurveyCompanyMeta,
  getSurveyStatusMeta,
  parseNullableFloat,
} from '@/app/lib/surveyMetadata';
import SurveySignatureBox from './SurveySignatureBox';

function InfoItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="bg-gray-50/80 rounded-xl px-3.5 py-2.5 border border-gray-100">
      <div className="text-[11px] font-medium text-gray-500">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 break-words ${highlight ? 'text-[#ff2301]' : 'text-gray-900'}`}>
        {value || <span className="text-gray-400 font-normal">-</span>}
      </div>
    </div>
  );
}

type EstimationCardProps = {
  formData: any;
  currentUser: any;
  canEstimate: boolean;
  saving: boolean;
  isDirty: boolean;
  onSaveEstimation: (overrides: {
    estimatedPrice: number | null;
    estimationNote: string;
    estimationStatus: string;
    status: string;
    estimatedByUserId: string;
    estimatedAt: string;
    projectSignatureUrl: string | null;
    projectSignedAt: string | null;
  }) => Promise<void>;
  onOpenPdf: (pendingOverrides?: Record<string, any>) => void;
};

export function ProjectEstimationCard({
  formData,
  currentUser,
  canEstimate,
  saving,
  isDirty,
  onSaveEstimation,
  onOpenPdf,
}: EstimationCardProps) {
  const initialPrice =
    formData.estimatedPrice !== undefined && formData.estimatedPrice !== null
      ? Number(formData.estimatedPrice)
      : null;
  const initialNote = formData.estimationNote || '';
  const initialSig = formData.projectSignatureUrl || null;
  const initialSignedAt = formData.projectSignedAt || null;

  const [estPrice, setEstPrice] = useState<number | null>(initialPrice);
  const [estNote, setEstNote] = useState<string>(initialNote);
  const [projSigUrl, setProjSigUrl] = useState<string | null>(initialSig);
  const [projSignedAt, setProjSignedAt] = useState<string | null>(initialSignedAt);

  const hasLocalEstChanges =
    estPrice !== initialPrice ||
    estNote !== initialNote ||
    (projSigUrl || null) !== initialSig ||
    (projSignedAt || null) !== initialSignedAt;

  const statusMeta = getSurveyStatusMeta(formData.status);
  const estMeta = getEstimationStatusMeta(formData.estimationStatus);

  // Sales sees this card ONLY when Project / Admin Project has completed estimation
  const isEstimated = formData.estimationStatus === 'Estimated';
  if (!canEstimate && !isEstimated) {
    return null;
  }

  const triggerEstimateSave = async (nextEstStatus: string, nextSurveyStatus: string) => {
    await onSaveEstimation({
      estimatedPrice: estPrice,
      estimationNote: estNote,
      estimationStatus: nextEstStatus,
      status: nextSurveyStatus,
      estimatedByUserId: currentUser?.id || formData.estimatedByUserId || '',
      estimatedAt: new Date().toISOString(),
      projectSignatureUrl: projSigUrl,
      projectSignedAt: projSigUrl ? projSignedAt || new Date().toISOString() : null,
    });
  };

  const handleOpenPdfFromCard = () => {
    if (canEstimate && hasLocalEstChanges) {
      onOpenPdf({
        estimatedPrice: estPrice,
        estimationNote: estNote,
        estimatedByUserId: currentUser?.id || formData.estimatedByUserId || '',
        estimatedAt: formData.estimatedAt || new Date().toISOString(),
        estimationStatus: formData.estimationStatus || 'Draft',
        status: formData.status || 'In Progress',
        projectSignatureUrl: projSigUrl,
        projectSignedAt: projSigUrl ? projSignedAt || new Date().toISOString() : null,
      });
    } else {
      onOpenPdf();
    }
  };

  return (
    <aside className="lg:col-span-4 lg:sticky lg:top-4 space-y-4">
      <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-gray-900 text-white px-4 py-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Calculator className="w-4 h-4 text-[#ff2301] shrink-0" />
            <span className="font-bold text-sm truncate">ส่วนงานทีมโปรเจค (ประเมินราคา)</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${estMeta.badgeClass}`}>
            {estMeta.label}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 space-y-4">
          <div className="flex items-center justify-between text-xs bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <span className="text-gray-500 font-medium">สถานะงานสำรวจ:</span>
            <span className={`px-2 py-0.5 rounded-full font-bold border ${statusMeta.badgeClass}`}>
              {statusMeta.shortLabel}
            </span>
          </div>

          {canEstimate ? (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  ราคาประเมินเบื้องต้น (บาท)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={estPrice ?? ''}
                    onChange={(e) => setEstPrice(parseNullableFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-base font-bold text-gray-900 focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">฿</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  สเปคที่แนะนำ / หมายเหตุถึง Sales
                </label>
                <textarea
                  value={estNote}
                  onChange={(e) => setEstNote(e.target.value)}
                  rows={5}
                  placeholder="เช่น ขนาดกำลังติดตั้งที่เหมาะสม, จำนวนแผง/Inverter, ข้อจำกัดหน้างาน หรือข้อมูลที่ต้องการเพิ่ม..."
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                />
              </div>

              <SurveySignatureBox
                key={`proj-sig-${formData.id || 'new'}-${formData.version}`}
                title="ลายเซ็นฝ่ายวิศวกรรม / โปรเจค (Project Signature)"
                subtitle="แสดงในช่องลงนามทีมโปรเจคใน PDF"
                signerName={currentUser?.fullName || formData.estimatedByUser?.fullName}
                signedAt={projSignedAt || formData.estimatedAt}
                value={projSigUrl}
                savedKeyName={currentUser?.fullName}
                accentColor="slate"
                onChange={(nextUrl, nextSignedAt) => {
                  setProjSigUrl(nextUrl);
                  setProjSignedAt(nextSignedAt);
                }}
              />

              {formData.estimatedByUser?.fullName && (
                <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  ประเมินล่าสุดโดย <span className="font-bold text-gray-800">{formData.estimatedByUser.fullName}</span>
                  {formData.estimatedAt && <div>เมื่อ {formatThaiDate(formData.estimatedAt, true)}</div>}
                </div>
              )}

              {!formData.id ? (
                <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  กรุณาบันทึกข้อมูลสำรวจเป็นเอกสารก่อน จึงจะประเมินราคาได้
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => triggerEstimateSave('Estimated', 'Estimated')}
                    className="w-full flex items-center justify-center gap-2 bg-[#ff2301] hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 px-4 rounded-xl text-sm font-bold shadow-xs transition cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    บันทึกผลประเมิน & ส่งให้ Sales
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => triggerEstimateSave('Draft', formData.status || 'In Progress')}
                      className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      บันทึกร่าง
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => triggerEstimateSave('Need Info', 'Need Info')}
                      className="flex items-center justify-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      ขอข้อมูลเพิ่ม
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Sales View: Read-Only Result (shown ONLY after Project / Admin Project has estimated) */
            <div className="space-y-3">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 text-center">
                <div className="text-xs font-semibold text-emerald-800">ราคาประเมินเบื้องต้นจากทีมโปรเจค</div>
                <div className="text-2xl font-extrabold text-[#ff2301] mt-1 font-mono">
                  {formData.estimatedPrice !== null && formData.estimatedPrice !== undefined
                    ? `฿${formatNum(formData.estimatedPrice)}`
                    : '-'}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <div className="text-[11px] font-bold text-gray-500 mb-1">สเปคที่แนะนำ / หมายเหตุจากทีมโปรเจค</div>
                <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {formData.estimationNote || '-'}
                </div>
              </div>

              {formData.estimatedByUser?.fullName && (
                <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  ประเมินโดย <span className="font-bold text-gray-800">{formData.estimatedByUser.fullName}</span>
                  {formData.estimatedAt && <div>เมื่อ {formatThaiDate(formData.estimatedAt, true)}</div>}
                </div>
              )}

              {formData.projectSignatureUrl && (
                <SurveySignatureBox
                  readOnly
                  title="ลายเซ็นฝ่ายวิศวกรรม / โปรเจค"
                  signerName={formData.estimatedByUser?.fullName}
                  signedAt={formData.projectSignedAt || formData.estimatedAt}
                  value={formData.projectSignatureUrl}
                  onChange={() => {}}
                />
              )}
            </div>
          )}

          {formData.id && (
            <div className="pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={saving}
                onClick={handleOpenPdfFromCard}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#ff2301]" />
                {isDirty || hasLocalEstChanges ? 'บันทึกข้อมูลล่าสุด & เปิดดู PDF' : 'ดูตัวอย่าง / ดาวน์โหลด PDF'}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export function ReadOnlySurveySections({ formData }: { formData: any }) {
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; title: string; desc?: string } | null>(null);
  const companyMeta = getSurveyCompanyMeta(formData.companyCode);

  const usage = formData.usageBehavior || {};
  const elec = formData.electricalProfile || {};
  const tariff = formData.tariffSelection || {};
  const tiers: any[] = Array.isArray(tariff.tiers) ? tariff.tiers : [];
  const struct = formData.structure || {};
  const roofAges: any[] = Array.isArray(struct.roofAges) ? struct.roofAges : [];
  const qa = formData.qa || {};
  const { visualAttachments, fileAttachments } = collectSurveyAttachments(formData);
  const documents: any[] = Array.isArray(formData.documents)
    ? formData.documents.filter((d: any) => d.documentType || d.fileUrl || d.note)
    : [];
  const checklist: string[] = Array.isArray(formData.requiredInfoChecklist) ? formData.requiredInfoChecklist : [];
  const billUrl = getElectricityBillUrl(formData.electricityBill);
  const billCount = typeof formData.electricityBill === 'object' ? formData.electricityBill?.billCount : null;
  const billNote = typeof formData.electricityBill === 'object' ? formData.electricityBill?.note : null;

  const hasCoords =
    typeof formData.latitude === 'number' &&
    Number.isFinite(formData.latitude) &&
    typeof formData.longitude === 'number' &&
    Number.isFinite(formData.longitude);

  const totalTariffKwh = tiers.reduce((acc, t) => acc + (Number(t.qtyKwhPerMonth) || 0), 0);
  const totalTariffCost = tiers.reduce(
    (acc, t) => acc + (Number(t.ratePerKwh) || 0) * (Number(t.qtyKwhPerMonth) || 0),
    0
  );
  const blendedRate = totalTariffKwh > 0 ? totalTariffCost / totalTariffKwh : null;

  return (
    <div className="space-y-5">
      {/* 1. Project & Customer */}
      <section id="survey-sec-project" className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs scroll-mt-4">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 font-bold text-gray-900 text-sm">
          <Building2 className="w-4 h-4 text-[#ff2301]" />
          <span>1. ข้อมูลลูกค้า โครงการ และผู้ประสานงาน</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="sm:col-span-2 lg:col-span-3 bg-gray-50/80 rounded-xl px-3.5 py-2.5 border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 p-1 flex items-center justify-center shrink-0">
              <Image
                src={companyMeta.logoUrl}
                alt={companyMeta.enName}
                width={36}
                height={36}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-gray-500">บริษัทผู้ออกเอกสาร / หัวรายงาน PDF</div>
              <div className="text-sm font-bold text-gray-900 flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className={`px-1.5 py-0.5 rounded text-[11px] font-extrabold border ${companyMeta.badgeClass}`}>
                  {companyMeta.code}
                </span>
                <span className="truncate">
                  {companyMeta.thName} ({companyMeta.enName})
                </span>
              </div>
            </div>
          </div>
          <InfoItem label="ลูกค้า / บริษัท" value={formData.customerName} />
          <InfoItem label="ชื่อโครงการ" value={formData.projectName} />
          <InfoItem label="วันที่สำรวจ" value={formatThaiDate(formData.surveyDate)} />
          <InfoItem label="ผู้ประสานงานหน้างาน" value={formData.coordinatorName} />
          <InfoItem label="เบอร์โทรติดต่อ" value={formData.coordinatorPhone} />
          <InfoItem label="ผู้สำรวจ / เซลส์ผู้ดูแล" value={formData.surveyorName || formData.salesperson?.fullName} />
          <div className="sm:col-span-2 lg:col-span-3 bg-gray-50/80 rounded-xl px-3.5 py-2.5 border border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-medium text-gray-500">สถานที่ตั้ง & พิกัด GPS</div>
              <div className="text-sm font-semibold text-gray-900 mt-0.5">{formData.projectLocation || '-'}</div>
              {hasCoords && (
                <div className="text-xs text-gray-600 font-mono mt-0.5">
                  Lat: {formData.latitude} , Lng: {formData.longitude}
                </div>
              )}
            </div>
            {hasCoords && (
              <a
                href={`https://maps.google.com/?q=${formData.latitude},${formData.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-[#ff2301] text-xs font-bold border border-red-200 transition"
              >
                <MapPin className="w-3.5 h-3.5" />
                เปิด Google Maps
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 2. Usage Behavior */}
      <section id="survey-sec-behavior" className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs scroll-mt-4">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 font-bold text-gray-900 text-sm">
          <Clock className="w-4 h-4 text-[#ff2301]" />
          <span>2. พฤติกรรมการใช้พลังงาน</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <InfoItem label="เวลาทำงาน" value={usage.workingHours} />
          <InfoItem label="สัดส่วน กลางวัน / กลางคืน" value={usage.dayNightRatio} />
          <InfoItem
            label="ค่าไฟเฉลี่ย / เดือน"
            value={
              usage.avgBillThbPerMonth !== null && usage.avgBillThbPerMonth !== undefined
                ? `฿${formatNum(usage.avgBillThbPerMonth)}`
                : '-'
            }
            highlight
          />
          <InfoItem label="วันทำงาน / สัปดาห์" value={formatNum(usage.workingDaysPerWeek, 'วัน')} />
          <InfoItem label="วันทำงาน / ปี" value={formatNum(usage.workingDaysPerYear, 'วัน')} />
          <InfoItem
            label="วันหยุด สัปดาห์ / ปี"
            value={`${formatNum(usage.nonWorkingDaysPerWeek, 'วัน')} / ${formatNum(usage.nonWorkingDaysPerYear, 'วัน')}`}
          />
          <div className="sm:col-span-2 lg:col-span-3">
            <InfoItem label="เครื่องจักรและโหลดไฟฟ้าหลัก" value={usage.mainEquipment} />
          </div>
        </div>
      </section>

      {/* 3 & 4. Electrical Profile & Tariff */}
      <section id="survey-sec-electrical" className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs scroll-mt-4">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 font-bold text-gray-900 text-sm">
          <Zap className="w-4 h-4 text-[#ff2301]" />
          <span>3–4. ระบบไฟฟ้า หม้อแปลง และอัตราค่าไฟ</span>
        </div>
        <div className="p-4 space-y-3" id="survey-sec-tariff">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoItem label="การไฟฟ้า" value={elec.gridProvider} />
            <InfoItem label="ประเภทผู้ใช้ไฟ" value={elec.userType} />
            <InfoItem label="อัตราค่าไฟเฉลี่ย" value={formatNum(elec.rateThbPerKwh, 'บ./หน่วย', 4)} />
            <InfoItem label="ระดับแรงดันไฟฟ้า" value={(elec.voltageLevel || []).join(', ')} />
            <InfoItem label="ขนาดมิเตอร์" value={(elec.meterSize || []).join(', ')} />
            <InfoItem label="ปริมาณการใช้ไฟ" value={formatNum(elec.kwhQty, 'kWh/ด.')} />
            <InfoItem
              label="Peak (จ.-ศ. / ส.-อา.)"
              value={`${formatNum(elec.peakKwWeekday, 'kW')} / ${formatNum(elec.peakKwWeekend, 'kW')}`}
            />
            <InfoItem
              label="หม้อแปลง (จำนวน / kVA)"
              value={`${formatNum(elec.transformerCount, 'ลูก')} (${formatNum(elec.transformerKva, 'kVA')})`}
            />
            <InfoItem label="ยี่ห้อ / รุ่นหม้อแปลง" value={`${elec.transformerBrand || '-'} / ${elec.transformerModel || '-'}`} />
            <InfoItem label="เมนเบรกเกอร์ (AT)" value={formatNum(elec.breakerAmp, 'A')} />
            <InfoItem label="ระยะสายถึงตู้ MDB" value={formatNum(elec.mainPanelCableLengthM, 'เมตร')} />
            <InfoItem label="แบบ Single Line (SLD)" value={formData.hasSingleLineDiagram ? 'มี (Available)' : 'ไม่มี'} />
          </div>

          <div className="bg-red-50/40 border border-red-100 rounded-xl p-3">
            <div className="text-xs font-bold text-gray-800 mb-2">
              หมวดอัตราค่าไฟฟ้า: <span className="text-[#ff2301]">{tariff.tariffCategory || 'ยังไม่ระบุ'}</span>
            </div>
            {tiers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-red-200 text-gray-600">
                      <th className="py-1.5 pr-3">ช่วงอัตรา</th>
                      <th className="py-1.5 px-3 text-right">บาท/kWh</th>
                      <th className="py-1.5 px-3 text-right">จำนวน kWh/เดือน</th>
                      <th className="py-1.5 pl-3 text-right">ยอดประมาณการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((t: any, i: number) => (
                      <tr key={i} className="border-b border-red-100/70">
                        <td className="py-1.5 pr-3 font-medium text-gray-800">{t.tierName}</td>
                        <td className="py-1.5 px-3 text-right font-mono">{formatNum(t.ratePerKwh, '', 4)}</td>
                        <td className="py-1.5 px-3 text-right font-mono">{formatNum(t.qtyKwhPerMonth)}</td>
                        <td className="py-1.5 pl-3 text-right font-mono font-semibold">
                          ฿{formatNum((Number(t.ratePerKwh) || 0) * (Number(t.qtyKwhPerMonth) || 0))}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold text-gray-900 bg-white/80">
                      <td className="py-1.5 pr-3">รวม / เฉลี่ยก่อน VAT</td>
                      <td className="py-1.5 px-3 text-right font-mono">
                        {blendedRate !== null ? formatNum(blendedRate, 'บ.', 4) : '-'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono">{formatNum(totalTariffKwh, 'kWh')}</td>
                      <td className="py-1.5 pl-3 text-right font-mono text-[#ff2301]">฿{formatNum(totalTariffCost)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Roof Structure */}
      <section id="survey-sec-structure" className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs scroll-mt-4">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 font-bold text-gray-900 text-sm">
          <Home className="w-4 h-4 text-[#ff2301]" />
          <span>5. โครงสร้างหลังคา (Roof Structure)</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <InfoItem
              label="ประเภทหลังคาและอายุ"
              value={
                (struct.roofType || []).length > 0
                  ? struct.roofType
                      .map((rt: string) => {
                        const key = rt.startsWith('อื่นๆ:') ? 'อื่นๆ' : rt;
                        const age = roofAges.find((a: any) => a.roofType === key || a.roofType === rt);
                        return age ? `${rt} (${age.ageYear} ปี)` : rt;
                      })
                      .join(', ')
                  : '-'
              }
            />
          </div>
          <InfoItem label="ขนาดหลังคา (W×L)" value={struct.roofDimWxlM} />
          <InfoItem label="ความสูงอาคาร" value={formatNum(struct.buildingHeightM, 'เมตร')} />
          <InfoItem label="อายุหลังคาโดยรวม" value={formatNum(struct.roofAgeYear, 'ปี')} />
          <InfoItem
            label="รูปแบบหลังคา"
            value={struct.roofPattern ? ROOF_PATTERN_LABELS[struct.roofPattern] || struct.roofPattern : '-'}
          />
          <InfoItem label="ลอน Metal Sheet" value={struct.metalSheetType} />
          <InfoItem label="ความชัน (Slope)" value={formatNum(struct.roofSlopeDeg, '°')} />
          <InfoItem label="Azimuth / Tilt" value={`${formatNum(struct.azimuthDeg, '°')} / ${formatNum(struct.tiltDeg, '°')}`} />
          <InfoItem label="ระยะแป (Purlin)" value={formatNum(struct.purlinToPurlinM, 'ม.')} />
          <InfoItem label="ระยะจันทัน (Rafter)" value={formatNum(struct.rafterToRafterM, 'ม.')} />
          <InfoItem label="ระยะเสา (Column)" value={formatNum(struct.columnToColumnM, 'ม.')} />
          <InfoItem label="ระยะช่องแสง (Skylight)" value={formatNum(struct.skylightToSkylightM, 'ม.')} />
          <InfoItem label="Jack Roof / ลูกหมุน" value={`${struct.jackRoofDimM || '-'} / ${struct.ventilationDimM || '-'}`} />
          <InfoItem
            label="สายล่อฟ้า / บันได"
            value={`${formatNum(struct.lightningProtectionM, 'ม.')} / ${formatNum(struct.serviceLadderM, 'ม.')}`}
          />
          <div className="sm:col-span-2">
            <InfoItem label="หมายเหตุโครงสร้าง" value={struct.otherNotes} />
          </div>
        </div>
      </section>

      {/* 6. Q&A */}
      <section id="survey-sec-qa" className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs scroll-mt-4">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 font-bold text-gray-900 text-sm">
          <MessageSquare className="w-4 h-4 text-[#ff2301]" />
          <span>6. คำถามวิศวกรรมเพิ่มเติม (Q&A)</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoItem label="จุดประสงค์ติดตั้งโซลาร์" value={(qa.solarReasons || []).join(', ')} />
          <InfoItem label="รายละเอียดเพิ่มเติม" value={qa.solarReasonsDetail} />
          <InfoItem
            label="การใช้ไฟกลางวัน/กลางคืน"
            value={`${qa.dayNightUsage || '-'} ${qa.dayNightUsageDetail ? `(${qa.dayNightUsageDetail})` : ''}`}
          />
          <InfoItem label="Day Load / Night Load" value={`${qa.dayLoad || '-'} / ${qa.nightLoad || '-'}`} />
          <InfoItem
            label="Backup Load"
            value={`${qa.backupLoad || '-'} ${qa.backupLoadDetail ? `(${qa.backupLoadDetail})` : ''}`}
          />
          <InfoItem
            label="โหมดชาร์จแบตเตอรี่"
            value={`${qa.batteryChargeMode || '-'} ${qa.batteryChargeDetail ? `(${qa.batteryChargeDetail})` : ''}`}
          />
          <InfoItem
            label="ชาร์จจาก Grid กลางคืน / Backup ไฟดับ"
            value={`${qa.gridChargeAtNight || '-'} / ${qa.inverterBackupOnOutage || '-'}`}
          />
          <InfoItem
            label="ปัญหาคุณภาพไฟฟ้า"
            value={`${qa.powerQualityIssue || '-'} ${qa.powerQualityIssueDetail ? `(${qa.powerQualityIssueDetail})` : ''}`}
          />
        </div>
      </section>

      {/* 7. Checklist, Bill, Docs & Photos */}
      <section id="survey-sec-media" className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs scroll-mt-4">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 font-bold text-gray-900 text-sm">
          <ImageIcon className="w-4 h-4 text-[#ff2301]" />
          <span>7. Checklist, บิลค่าไฟ, เอกสาร และรูปถ่ายทั้งหมด ({visualAttachments.length} รูป)</span>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <div className="text-xs font-bold text-gray-700 mb-2">Checklist ข้อมูลที่ต้องเตรียม</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REQUIRED_CHECKLIST_ITEMS.map((item) => {
                const checked = checklist.includes(item.value);
                const fileUrl = 'fileField' in item && item.fileField ? formData[item.fileField] : null;
                return (
                  <div
                    key={item.value}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs ${
                      checked
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck2 className={`w-4 h-4 shrink-0 ${checked ? 'text-emerald-600' : 'text-gray-300'}`} />
                      <span className="truncate font-medium">{item.label}</span>
                    </div>
                    {fileUrl && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-[#ff2301] font-bold hover:underline flex items-center gap-0.5"
                      >
                        เปิดดู <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            {formData.amrCustomerCode && (
              <div className="mt-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                <span className="font-bold">AMR Customer Code:</span> {formData.amrCustomerCode}
                {elec.amrUsernamePlain && (
                  <span className="ml-3">
                    <span className="font-bold">User:</span> {elec.amrUsernamePlain}
                  </span>
                )}
                {elec.amrPasswordPlain && (
                  <span className="ml-3">
                    <span className="font-bold">Pass:</span> {elec.amrPasswordPlain}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="text-[11px] font-bold text-gray-500 mb-1">บิลค่าไฟฟ้า (Electricity Bill)</div>
              {billUrl ? (
                <div className="space-y-1">
                  <a
                    href={billUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#ff2301] hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    เปิดดูบิลค่าไฟ {billCount ? `(${billCount} เดือน)` : ''}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {billNote && <p className="text-xs text-gray-600">{billNote}</p>}
                </div>
              ) : (
                <span className="text-xs text-gray-400">ยังไม่ได้แนบบิลค่าไฟ</span>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="text-[11px] font-bold text-gray-500 mb-1">หมายเหตุเพิ่มเติม (Sales Remark)</div>
              <div className="text-xs text-gray-800 whitespace-pre-wrap">{formData.additionalRemark || '-'}</div>
            </div>
          </div>

          {documents.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-700 mb-2">เอกสารประกอบเพิ่มเติม ({documents.length} รายการ)</div>
              <div className="space-y-1.5">
                {documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <div>
                      <span className="font-bold text-gray-900">{doc.documentType || `เอกสารที่ ${idx + 1}`}</span>
                      {doc.customerProvided && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          ลูกค้าเตรียมให้
                        </span>
                      )}
                      {doc.note && <span className="ml-2 text-gray-600">- {doc.note}</span>}
                    </div>
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#ff2301] font-bold hover:underline inline-flex items-center gap-1"
                      >
                        {extractAttachmentFilename(doc.fileUrl, 'เปิดเอกสาร')} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-bold text-gray-700 mb-2">
              รูปถ่ายหน้างานและภาพเอกสารที่แนบ ({visualAttachments.length} ภาพ)
            </div>
            {visualAttachments.length === 0 ? (
              <p className="text-xs text-gray-400">ยังไม่มีรูปถ่ายหรือภาพเอกสารแนบ</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visualAttachments.map((att, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setLightboxPhoto({
                        url: att.fileUrl,
                        title: att.title,
                        desc: att.subtitle ? `${att.categoryLabel} • ${att.subtitle}` : att.categoryLabel,
                      })
                    }
                    className="group text-left bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#ff2301] hover:shadow-sm transition cursor-pointer"
                  >
                    <div className="aspect-video bg-gray-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={att.fileUrl}
                        alt={att.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-2">
                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-[#ff2301] border border-red-100 mb-1">
                        {att.categoryLabel}
                      </span>
                      <div className="text-xs font-bold text-gray-900 truncate">{att.title}</div>
                      {att.subtitle && <div className="text-[11px] text-gray-500 truncate">{att.subtitle}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {fileAttachments.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-[#ff2301]" />
                <span>ไฟล์เอกสารแนบทั้งหมด ({fileAttachments.length} ไฟล์ &mdash; รวมใน PDF อัตโนมัติ)</span>
              </div>
              <div className="space-y-1.5">
                {fileAttachments.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-mono text-[10px] font-bold uppercase shrink-0">
                        {f.ext || f.kind}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-gray-900">{f.title}</span>
                        <span className="text-gray-500 ml-1.5">({f.categoryLabel})</span>
                      </div>
                    </div>
                    <a
                      href={f.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#ff2301] font-bold hover:underline inline-flex items-center gap-1 min-w-0 max-w-full"
                    >
                      <span className="truncate">{f.fileName}</span> <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 8. Sign-off Overview */}
      <section
        id="survey-sec-signature"
        className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs scroll-mt-4"
      >
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 font-bold text-gray-900 text-sm">
          <PenTool className="w-4 h-4 text-[#ff2301]" />
          <span>8. ลายเซ็นประกอบแบบสำรวจ (Sales &amp; Project Signatures)</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SurveySignatureBox
            readOnly
            title="ผู้บันทึกสำรวจ / พนักงานขาย (Sales / Surveyor)"
            signerName={formData.surveyorName || formData.salesperson?.fullName}
            signedAt={formData.salesSignedAt || formData.surveyDate}
            value={formData.salesSignatureUrl}
            onChange={() => {}}
          />
          <SurveySignatureBox
            readOnly
            title="ฝ่ายวิศวกรรม / โปรเจค (Project & Engineering)"
            signerName={formData.estimatedByUser?.fullName}
            signedAt={formData.projectSignedAt || formData.estimatedAt}
            value={formData.projectSignatureUrl}
            onChange={() => {}}
          />
        </div>
      </section>

      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{lightboxPhoto.title}</h4>
                {lightboxPhoto.desc && <p className="text-xs text-gray-500">{lightboxPhoto.desc}</p>}
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-950 flex items-center justify-center max-h-[75vh] overflow-hidden p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightboxPhoto.url} alt={lightboxPhoto.title} className="max-h-[72vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
