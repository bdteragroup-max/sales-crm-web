'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import SignatureCanvas from 'react-signature-canvas';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  Calculator,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ClipboardSignature,
  Clock,
  Eraser,
  ExternalLink,
  Fuel,
  Loader2,
  MapPin,
  Navigation,
  PackageCheck,
  Pencil,
  Phone,
  Play,
  Plus,
  Receipt,
  Route,
  Trash2,
  Truck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  approveTripExpenses,
  checkInLogisticsStop,
  closeLogisticsTrip,
  markLogisticsStopIssue,
  reorderLogisticsTripStop,
  signRequisitionPickupInTrip,
  updateLogisticsTripSchedule,
  updateLogisticsTripState,
} from '@/app/actions/logistics';
import {
  calculateTripAllowanceAndExpenses,
  DEFAULT_ALLOWANCE_RATE_THB,
  EXPENSE_CATEGORY_META,
  formatIsoDateToSlashThai,
  formatThaiDateSlash,
  formatThaiTime24Dot,
  LOGISTICS_SOURCE_META,
  LOGISTICS_STOP_STATUS_META,
  LOGISTICS_TRIP_STATUS_META,
  parseLogisticsTime24,
  parseSlashDateToIso,
  toBangkokDateKey,
  type LogisticsExpenseCategory,
  type LogisticsPermissions,
  type LogisticsTripExpenseItem,
  type LogisticsTripRecord,
  type LogisticsTripStopItem,
} from '@/app/lib/logisticsTypes';
import {
  ensureUploadedMediaUrl,
  formatServerActionError,
  uploadSelectedPhotoFiles,
} from '@/app/lib/requisitionPhotoUpload';
import {
  calibrateSignaturePad,
  extractSignatureDataUrlFromPad,
} from '@/app/requisitions/components/signaturePadHelper';
import StopPodModal from './StopPodModal';

interface TripExecutionViewProps {
  trip: LogisticsTripRecord;
  permissions: LogisticsPermissions;
  onRefresh: () => Promise<void> | void;
  showBackLink?: boolean;
}

function TripPickupSignModal({
  stop,
  trip,
  onClose,
  onSuccess,
}: {
  stop: LogisticsTripStopItem;
  trip: LogisticsTripRecord;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [driverName, setDriverName] = useState(
    trip.driverName || (trip.transportType === 'EXTERNAL' ? trip.courierName || '' : '')
  );
  const [companyInfo, setCompanyInfo] = useState(
    trip.vehiclePlate
      ? `รถบริษัท ${trip.vehiclePlate}${trip.vehicleName ? ` (${trip.vehicleName})` : ''}`
      : trip.courierName || ''
  );
  const [sigUrl, setSigUrl] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem('crm_user_signature') : null;
    } catch {
      return null;
    }
  });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (sigUrl) return;
    const cal = () => calibrateSignaturePad(sigRef);
    const t = setTimeout(cal, 80);
    return () => clearTimeout(t);
  }, [sigUrl]);

  const submitPickup = async () => {
    if (!driverName.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุชื่อคนขับผู้รับสินค้า' });
      return;
    }
    const rawSig = sigUrl || extractSignatureDataUrlFromPad(sigRef);
    if (!rawSig) {
      Swal.fire({ icon: 'warning', title: 'กรุณาลงลายเซ็นรับของออกจากคลัง' });
      return;
    }
    setSaving(true);
    try {
      const uploadedSig = await ensureUploadedMediaUrl(rawSig, 'req-sig', 0, {
        maxDimension: 1200,
        quality: 0.85,
        preserveAlpha: true,
      });
      const res = await signRequisitionPickupInTrip(stop.id, {
        transportType: trip.transportType,
        transportName: driverName.trim(),
        transportCompany: companyInfo.trim(),
        transportSignatureUrl: uploadedSig,
      });
      if (!res.success) {
        Swal.fire({
          icon: 'error',
          title: 'เซ็นรับสินค้าไม่สำเร็จ',
          text: res.error || 'กรุณาลองใหม่อีกครั้ง',
        });
        return;
      }
      await onSuccess();
      onClose();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `เซ็นรับใบเบิก ${stop.referenceNumber || ''} ออกจากสโตร์แล้ว`,
        showConfirmButton: false,
        timer: 2200,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: formatServerActionError(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/65 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={() => !saving && onClose()} />
      <div className="relative z-10 bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-orange-50/70 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              เซ็นรับของออกจากสโตร์ ({stop.referenceNumber})
            </h3>
            <p className="text-[11px] text-slate-500">{stop.customerName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">ชื่อคนขับ / ผู้รับสินค้า *</label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-xl font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">ทะเบียนรถ / ข้อมูลรถ</label>
            <input
              type="text"
              value={companyInfo}
              onChange={(e) => setCompanyInfo(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-xl font-medium text-slate-800"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">ลายเซ็นผู้รับของ *</label>
              <button
                type="button"
                onClick={() => {
                  setSigUrl(null);
                  sigRef.current?.clear();
                }}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600 font-bold cursor-pointer"
              >
                <Eraser size={12} /> ล้างลายเซ็น
              </button>
            </div>
            {sigUrl ? (
              <div className="h-36 border border-slate-300 rounded-xl p-2 flex items-center justify-center relative bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sigUrl} alt="Saved Sig" className="max-h-full object-contain" />
              </div>
            ) : (
              <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white">
                <SignatureCanvas
                  ref={sigRef}
                  clearOnResize={false}
                  penColor="#0f172a"
                  canvasProps={{
                    className: 'w-full h-36 bg-white block touch-none',
                    style: { touchAction: 'none' },
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="h-10 px-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submitPickup}
            className="h-10 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            <span>ยืนยันเซ็นรับสินค้า</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TripScheduleEditModal({
  trip,
  onClose,
  onSuccess,
}: {
  trip: LogisticsTripRecord;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const [dateDisplay, setDateDisplay] = useState<string>(() =>
    formatIsoDateToSlashThai(toBangkokDateKey(trip.tripDate))
  );
  const [timeDisplay, setTimeDisplay] = useState<string>(trip.departureTime || '08.30');
  const [saving, setSaving] = useState(false);

  const isoDate = parseSlashDateToIso(dateDisplay) || '';
  const parsedTime = parseLogisticsTime24(timeDisplay);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isoDate) {
      Swal.fire({
        icon: 'warning',
        title: 'รูปแบบวันที่ไม่ถูกต้อง',
        text: 'กรุณาระบุเป็น วัน/เดือน/ปี เช่น 26/11/2569',
      });
      return;
    }
    if (!parsedTime.ok) {
      Swal.fire({ icon: 'warning', title: 'เวลาไม่ถูกต้อง', text: parsedTime.error });
      return;
    }

    setSaving(true);
    try {
      const res = await updateLogisticsTripSchedule(trip.id, {
        tripDate: isoDate,
        departureTime: parsedTime.dot24 || '',
      });
      if (!res.success) {
        Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: res.error });
        return;
      }
      await onSuccess();
      onClose();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'อัปเดตวัน/เวลาจัดส่งและซิงค์หน้า Jobs แล้ว',
        showConfirmButton: false,
        timer: 2000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
      <form
        onSubmit={handleSave}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-slate-100 bg-sky-50/70 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              แก้ไขวัน/เวลาออกรถ · {trip.tripNumber}
            </h3>
            <p className="text-[11px] text-slate-500">
              ระบบจะอัปเดตวัน-เวลาจัดส่งไปยังหน้า Jobs ที่ผูกอยู่โดยอัตโนมัติ
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              วันที่ออกรถ (วัน/เดือน/ปี)
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="numeric"
                value={dateDisplay}
                onChange={(e) => setDateDisplay(e.target.value)}
                onBlur={() => {
                  const iso = parseSlashDateToIso(dateDisplay);
                  if (iso) setDateDisplay(formatIsoDateToSlashThai(iso));
                }}
                placeholder="วว/ดด/ปปปป"
                className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
              />
              <button
                type="button"
                onClick={() => {
                  const el = dateInputRef.current;
                  if (!el) return;
                  const withPicker = el as HTMLInputElement & { showPicker?: () => void };
                  if (typeof withPicker.showPicker === 'function') withPicker.showPicker();
                  else el.click();
                }}
                className="absolute right-1.5 w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                title="เลือกจากปฏิทิน"
              >
                <Calendar size={14} />
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={isoDate}
                onChange={(e) => {
                  if (e.target.value) setDateDisplay(formatIsoDateToSlashThai(e.target.value));
                }}
                className="sr-only"
                tabIndex={-1}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              เวลาออกรถ (24 ชม. 00.00 - 23.59 น.)
            </label>
            <input
              type="text"
              value={timeDisplay}
              onChange={(e) => setTimeDisplay(e.target.value)}
              onBlur={() => {
                if (parsedTime.ok && parsedTime.dot24) setTimeDisplay(parsedTime.dot24);
              }}
              placeholder="เช่น 08.30 หรือ 23.00"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['07.30', '08.30', '09.00', '10.30', '13.00', '15.00', '23.00', '00.00'].map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTimeDisplay(preset)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                      timeDisplay === preset
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            <span>บันทึกวัน/เวลา</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TripExecutionView({
  trip,
  permissions,
  onRefresh,
  showBackLink = false,
}: TripExecutionViewProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [podStop, setPodStop] = useState<LogisticsTripStopItem | null>(null);
  const [pickupStop, setPickupStop] = useState<LogisticsTripStopItem | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Close Trip & Expense Calculator state (keyed at parent/trip level via default values when open)
  const initialCrew = useMemo(() => {
    if (trip.transportType === 'EXTERNAL' && !trip.driverName && !trip.helperNames) {
      return trip.crewCount > 0 ? trip.crewCount : 0;
    }
    const helperCount = trip.helperNames
      ? trip.helperNames.split(/[,/]+/).map((s) => s.trim()).filter(Boolean).length
      : 0;
    return trip.crewCount > 0 ? trip.crewCount : 1 + helperCount;
  }, [trip.transportType, trip.driverName, trip.crewCount, trip.helperNames]);

  const [startMileage, setStartMileage] = useState<string>(
    trip.startMileage !== null ? String(trip.startMileage) : ''
  );
  const [endMileage, setEndMileage] = useState<string>(
    trip.endMileage !== null ? String(trip.endMileage) : ''
  );
  const [allowancePerDay, setAllowancePerDay] = useState<string>(
    String(trip.allowancePerDay > 0 ? trip.allowancePerDay : DEFAULT_ALLOWANCE_RATE_THB)
  );
  const [allowanceDays, setAllowanceDays] = useState<string>(
    String(trip.allowanceDays > 0 ? trip.allowanceDays : 1)
  );
  const [crewCount, setCrewCount] = useState<string>(String(initialCrew));
  const [overnightNights, setOvernightNights] = useState<string>(String(trip.overnightNights || 0));
  const [accommodationAmount, setAccommodationAmount] = useState<string>(
    String(trip.accommodationAmount || 0)
  );
  const [directTollAmount, setDirectTollAmount] = useState<string>(String(trip.tollAmount || 0));
  const [directFuelAmount, setDirectFuelAmount] = useState<string>(String(trip.fuelAmount || 0));
  const [directOtherAmount, setDirectOtherAmount] = useState<string>(
    String(trip.otherExpenseAmount || 0)
  );
  const [expenseItems, setExpenseItems] = useState<LogisticsTripExpenseItem[]>(
    trip.expenseItems || []
  );
  const [expenseReceipts, setExpenseReceipts] = useState<string[]>(trip.expenseReceipts || []);
  const [closeNote, setCloseNote] = useState<string>(trip.closeNote || '');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const canOperateTrip =
    permissions.canManageAllTrips ||
    (permissions.canPlanTrips &&
      ((trip.transportType === 'EXTERNAL' && !trip.driverUserId && !trip.driverName) ||
        trip.driverUserId === permissions.userId ||
        trip.createdById === permissions.userId ||
        trip.driverName === permissions.fullName));

  const isClosedOrCancelled = trip.status === 'COMPLETED' || trip.status === 'CANCELLED';
  const deliveredCount = trip.stops.filter((s) => s.status === 'DELIVERED').length;
  const unresolvedCount = trip.stops.filter(
    (s) => !['DELIVERED', 'FAILED', 'RESCHEDULED'].includes(s.status)
  ).length;

  const liveCalc = useMemo(
    () =>
      calculateTripAllowanceAndExpenses({
        allowancePerDay: Number(allowancePerDay || 0),
        allowanceDays: Number(allowanceDays || 0),
        crewCount: Number(crewCount || 0),
        overnightNights: Number(overnightNights || 0),
        accommodationAmount: Number(accommodationAmount || 0),
        tollAmount: Number(directTollAmount || 0),
        fuelAmount: Number(directFuelAmount || 0),
        otherExpenseAmount: Number(directOtherAmount || 0),
        expenseItems,
        startMileage: startMileage ? Number(startMileage) : null,
        endMileage: endMileage ? Number(endMileage) : null,
      }),
    [
      allowancePerDay,
      allowanceDays,
      crewCount,
      overnightNights,
      accommodationAmount,
      directTollAmount,
      directFuelAmount,
      directOtherAmount,
      expenseItems,
      startMileage,
      endMileage,
    ]
  );

  const hasTollRows = expenseItems.some((it) => it.category === 'TOLL');
  const hasFuelRows = expenseItems.some((it) => it.category === 'FUEL');
  const hasAccomRows = expenseItems.some((it) => it.category === 'ACCOMMODATION');
  const hasOtherRows = expenseItems.some((it) => it.category === 'OTHER');

  const handleTripAction = async (action: 'START_LOADING' | 'START_TRANSIT' | 'CANCEL') => {
    if (action === 'CANCEL') {
      const conf = await Swal.fire({
        icon: 'warning',
        title: `ยกเลิกทริป ${trip.tripNumber}?`,
        input: 'text',
        inputPlaceholder: 'ระบุเหตุผลในการยกเลิก (ถ้ามี)',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        confirmButtonText: 'ยืนยันยกเลิก',
        cancelButtonText: 'ไม่ยกเลิก',
      });
      if (!conf.isConfirmed) return;
      setBusyKey('CANCEL');
      try {
        const res = await updateLogisticsTripState(trip.id, 'CANCEL', {
          note: String(conf.value || ''),
        });
        if (!res.success) {
          Swal.fire({ icon: 'error', title: 'ยกเลิกไม่สำเร็จ', text: res.error });
          return;
        }
        await onRefresh();
      } finally {
        setBusyKey(null);
      }
      return;
    }

    setBusyKey(action);
    try {
      const res = await updateLogisticsTripState(trip.id, action, {
        startMileage: startMileage ? Number(startMileage) : null,
      });
      if (!res.success) {
        Swal.fire({ icon: 'error', title: 'อัปเดตไม่สำเร็จ', text: res.error });
        return;
      }
      await onRefresh();
    } finally {
      setBusyKey(null);
    }
  };

  const handleCheckInStop = async (stop: LogisticsTripStopItem) => {
    setBusyKey(`checkin-${stop.id}`);
    try {
      let gpsLat: number | null = null;
      let gpsLng: number | null = null;
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 4000,
            })
          );
          gpsLat = pos.coords.latitude;
          gpsLng = pos.coords.longitude;
        } catch {
          // Allow check-in without GPS if blocked
        }
      }
      const res = await checkInLogisticsStop(stop.id, { gpsLat, gpsLng });
      if (!res.success) {
        Swal.fire({ icon: 'error', title: 'เช็กอินไม่สำเร็จ', text: res.error });
        return;
      }
      await onRefresh();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `เช็กอินจุดส่ง #${stop.stopOrder} แล้ว`,
        showConfirmButton: false,
        timer: 1800,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleStopIssue = async (stop: LogisticsTripStopItem) => {
    const resPrompt = await Swal.fire({
      title: `ระบุสถานะจุดส่ง #${stop.stopOrder}`,
      text: stop.customerName,
      input: 'text',
      inputPlaceholder: 'สาเหตุ เช่น ติดต่อผู้รับไม่ได้ / หน้างานปิด / ขอเลื่อนเป็นพรุ่งนี้',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'เลื่อนนัดส่ง',
      denyButtonText: 'ส่งไม่สำเร็จ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ea580c',
      denyButtonColor: '#e11d48',
      preConfirm: (val) => {
        if (!String(val || '').trim()) {
          Swal.showValidationMessage('กรุณาระบุสาเหตุ');
        }
        return val;
      },
      preDeny: () => {
        const val = Swal.getInput()?.value;
        if (!String(val || '').trim()) {
          Swal.showValidationMessage('กรุณาระบุสาเหตุ');
          return false;
        }
        return val;
      },
    });

    let status: 'FAILED' | 'RESCHEDULED' | null = null;
    let reason = '';
    if (resPrompt.isConfirmed) {
      status = 'RESCHEDULED';
      reason = String(resPrompt.value || '').trim();
    } else if (resPrompt.isDenied) {
      status = 'FAILED';
      reason = String(resPrompt.value || '').trim();
    }
    if (!status || !reason) return;

    setBusyKey(`issue-${stop.id}`);
    try {
      const res = await markLogisticsStopIssue(stop.id, { status, failReason: reason });
      if (!res.success) {
        Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: res.error });
        return;
      }
      await onRefresh();
    } finally {
      setBusyKey(null);
    }
  };

  const handleReorder = async (stopId: string, dir: 'UP' | 'DOWN') => {
    setBusyKey(`move-${stopId}`);
    try {
      await reorderLogisticsTripStop(trip.id, stopId, dir);
      await onRefresh();
    } finally {
      setBusyKey(null);
    }
  };

  const addExpenseRow = (category: LogisticsExpenseCategory) => {
    setExpenseItems((prev) => [
      ...prev,
      {
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category,
        label: '',
        amount: 0,
        receiptUrl: null,
      },
    ]);
  };

  const handleUploadReceiptFiles = async (
    files: FileList | null,
    targetItemId?: string
  ) => {
    if (!files || files.length === 0) return;
    setIsUploadingReceipt(true);
    try {
      const { uploadedUrls, failedMessages } = await uploadSelectedPhotoFiles(
        Array.from(files),
        'log-exp',
        { maxDimension: 1400, quality: 0.8 }
      );
      if (uploadedUrls.length > 0) {
        if (targetItemId) {
          setExpenseItems((prev) =>
            prev.map((it) =>
              it.id === targetItemId ? { ...it, receiptUrl: uploadedUrls[0] } : it
            )
          );
        } else {
          setExpenseReceipts((prev) => [...prev, ...uploadedUrls]);
        }
      }
      if (failedMessages.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'อัปโหลดสลิปไม่สำเร็จ',
          text: failedMessages[0],
        });
      }
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleCloseTrip = async () => {
    if (unresolvedCount > 0) {
      Swal.fire({
        icon: 'warning',
        title: `ยังมีจุดส่งที่ยังไม่ปิดงาน ${unresolvedCount} จุด`,
        text: 'กรุณาบันทึก POD (ส่งมอบสำเร็จ) หรือระบุเหตุผลไม่สำเร็จ/เลื่อนส่งให้ครบทุกจุดก่อนปิดทริป',
      });
      return;
    }

    const conf = await Swal.fire({
      icon: 'question',
      title: `ยืนยันปิดทริป ${trip.tripNumber}?`,
      html: `<div class="text-xs text-slate-600 space-y-1">
        <div>จุดส่งสำเร็จ <strong>${deliveredCount}/${trip.stops.length} จุด</strong></div>
        <div>เบี้ยเลี้ยง: <strong>฿${liveCalc.allowanceTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong> | ทางด่วน: <strong>฿${liveCalc.tollAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong></div>
        <div>รวมค่าใช้จ่ายทั้งทริป: <strong class="text-emerald-700">฿${liveCalc.totalExpenseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong></div>
      </div>`,
      showCancelButton: true,
      confirmButtonColor: '#059669',
      confirmButtonText: 'ยืนยันปิดทริป',
      cancelButtonText: 'ตรวจสอบก่อน',
    });
    if (!conf.isConfirmed) return;

    setBusyKey('CLOSE_TRIP');
    try {
      const res = await closeLogisticsTrip(trip.id, {
        startMileage: startMileage ? Number(startMileage) : null,
        endMileage: endMileage ? Number(endMileage) : null,
        allowancePerDay: Number(allowancePerDay || 0),
        allowanceDays: Number(allowanceDays || 0),
        crewCount: Number(crewCount || 0),
        overnightNights: Number(overnightNights || 0),
        accommodationAmount: liveCalc.accommodationAmount,
        tollAmount: liveCalc.tollAmount,
        fuelAmount: liveCalc.fuelAmount,
        otherExpenseAmount: liveCalc.otherExpenseAmount,
        expenseItems,
        expenseReceipts,
        closeNote,
      });
      if (!res.success) {
        Swal.fire({ icon: 'error', title: 'ปิดทริปไม่สำเร็จ', text: res.error });
        return;
      }
      await onRefresh();
      Swal.fire({
        icon: 'success',
        title: `ปิดทริป ${trip.tripNumber} เรียบร้อย`,
        timer: 2000,
        showConfirmButton: false,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleApproveExpense = async (status: 'APPROVED' | 'PAID') => {
    setBusyKey(`EXP_${status}`);
    try {
      const res = await approveTripExpenses(trip.id, status);
      if (!res.success) {
        Swal.fire({ icon: 'error', title: 'ไม่สำเร็จ', text: res.error });
        return;
      }
      await onRefresh();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: status === 'PAID' ? 'บันทึกจ่ายเงินทริปแล้ว' : 'อนุมัติค่าเบี้ยเลี้ยง/ทางด่วนแล้ว',
        showConfirmButton: false,
        timer: 2000,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const tripMeta = LOGISTICS_TRIP_STATUS_META[trip.status] || LOGISTICS_TRIP_STATUS_META.PLANNED;

  return (
    <div className="space-y-4">
      {/* Trip Top Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {showBackLink && (
              <Link
                href="/logistics"
                className="inline-flex items-center gap-1 h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                <ArrowLeft size={13} /> กลับหน้าหลักขนส่ง
              </Link>
            )}
            <span className="font-mono text-base font-black text-slate-900">
              {trip.tripNumber}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border inline-flex items-center gap-1.5 ${tripMeta.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${tripMeta.dot}`} />
              {tripMeta.label}
            </span>
            <span className="text-xs font-bold text-slate-500 inline-flex items-center gap-1.5">
              <span>
                วันที่ {formatThaiDateSlash(trip.tripDate)}
                {trip.departureTime ? ` · ออกรถ ${trip.departureTime} น.` : ''}
              </span>
              {canOperateTrip && !isClosedOrCancelled && (
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200 hover:border-sky-200 text-[10px] font-bold cursor-pointer transition-colors"
                  title="แก้ไขวันและเวลาออกรถ (ซิงค์ไปหน้า Jobs อัตโนมัติ)"
                >
                  <Pencil size={10} />
                  <span>แก้เวลา</span>
                </button>
              )}
            </span>
          </div>

          {/* Quick Trip State Buttons */}
          {canOperateTrip && !isClosedOrCancelled && (
            <div className="flex flex-wrap items-center gap-2">
              {trip.status === 'PLANNED' && (
                <button
                  type="button"
                  disabled={Boolean(busyKey)}
                  onClick={() => void handleTripAction('START_LOADING')}
                  className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <PackageCheck size={14} /> เริ่มโหลดของขึ้นรถ
                </button>
              )}
              {(trip.status === 'PLANNED' || trip.status === 'LOADING') && (
                <button
                  type="button"
                  disabled={Boolean(busyKey)}
                  onClick={() => void handleTripAction('START_TRANSIT')}
                  className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Play size={14} /> ออกรถวิ่งส่ง
                </button>
              )}
              {permissions.canManageAllTrips && (
                <button
                  type="button"
                  disabled={Boolean(busyKey)}
                  onClick={() => void handleTripAction('CANCEL')}
                  className="h-9 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  ยกเลิกทริป
                </button>
              )}
            </div>
          )}
        </div>

        {/* Symmetrical 3-Column Metadata Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2.5 flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-100/80 text-orange-600 flex items-center justify-center shrink-0">
              <Truck size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400">รถที่ใช้วิ่ง</div>
              <div className="font-extrabold text-slate-900 truncate">
                {trip.vehiclePlate || trip.courierName || 'รถบริษัท'}
                {trip.vehicleName ? ` (${trip.vehicleName})` : ''}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2.5 flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0">
              <Users size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400">
                {trip.transportType === 'EXTERNAL' && !trip.driverName
                  ? 'ผู้ดำเนินการ / บริษัทขนส่ง'
                  : 'คนขับรถ & ทีมติดรถ'}
              </div>
              <div className="font-extrabold text-slate-900 truncate">
                {trip.driverName || (trip.transportType === 'EXTERNAL' ? trip.courierName || 'ขนส่งนอก' : '-')}
                {trip.helperNames ? (
                  <span className="font-semibold text-slate-500"> (+ {trip.helperNames})</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2.5 flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
              <Route size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400">โซนเส้นทาง &amp; ต้นทาง</div>
              <div className="font-extrabold text-slate-900 truncate">
                {trip.routeZone || 'ไม่ระบุโซน'}
                {trip.originBranch ? ` · ${trip.originBranch}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Strip */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-slate-600">
              ความคืบหน้าจุดส่ง: <strong className="text-slate-900">{deliveredCount}/{trip.stops.length} จุด</strong>
            </span>
            <div className="w-32 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: `${trip.stops.length > 0 ? Math.round((deliveredCount / trip.stops.length) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
          {trip.planNote && (
            <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              หมายเหตุ: {trip.planNote}
            </span>
          )}
        </div>
      </div>

      {/* Multi-Stop Driver Action List */}
      <div className="space-y-3">
        {trip.stops.map((stop, idx) => {
          const stMeta = LOGISTICS_STOP_STATUS_META[stop.status] || LOGISTICS_STOP_STATUS_META.PENDING;
          const srcMeta = LOGISTICS_SOURCE_META[stop.sourceType] || LOGISTICS_SOURCE_META.MANUAL;
          const isFinalized = ['DELIVERED', 'FAILED', 'RESCHEDULED'].includes(stop.status);
          const mapsQuery = encodeURIComponent(
            [stop.customerName, stop.destination, stop.province].filter(Boolean).join(' ')
          );

          return (
            <div
              key={stop.id}
              className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all ${
                stop.status === 'DELIVERED'
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : stop.status === 'FAILED' || stop.status === 'RESCHEDULED'
                  ? 'border-rose-200 bg-rose-50/20'
                  : 'border-slate-200/90'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center shrink-0 ${
                      stop.status === 'DELIVERED'
                        ? 'bg-emerald-600 text-white'
                        : stop.status === 'ARRIVED'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    {stop.stopOrder}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${srcMeta.badge}`}>
                        {srcMeta.short}
                      </span>
                      {stop.referenceNumber && (
                        <span className="font-mono text-xs font-extrabold text-slate-800">
                          {stop.referenceNumber}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${stMeta.badge}`}>
                        {stMeta.label}
                      </span>
                      {stop.targetDate && (
                        <span className="text-[11px] font-semibold text-slate-500">
                          กำหนดส่ง: {formatThaiDateSlash(stop.targetDate)}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-black text-slate-900">{stop.customerName}</h4>

                    {stop.destination && (
                      <p className="text-xs text-slate-600 flex items-start gap-1.5">
                        <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" />
                        <span>{stop.destination}</span>
                      </p>
                    )}

                    {stop.itemSummary && (
                      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200/70 rounded-lg px-2.5 py-1.5">
                        รายการของ: <strong className="text-slate-700">{stop.itemSummary}</strong>
                      </p>
                    )}

                    {/* Quick Nav & Tel Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {stop.destination && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold"
                        >
                          <Navigation size={12} /> เปิด Google Maps
                        </a>
                      )}
                      {stop.contactPhone && (
                        <a
                          href={`tel:${stop.contactPhone}`}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-[11px] font-bold"
                        >
                          <Phone size={12} /> โทร {stop.contactPhone}
                        </a>
                      )}
                      {stop.sourceType === 'REQUISITION' && stop.requisitionSignedTransport && (
                        <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          <CheckCircle2 size={12} /> เซ็นรับของจากสโตร์แล้ว ({stop.requisitionTransportName})
                        </span>
                      )}
                    </div>

                    {/* POD Receipt Display if DELIVERED */}
                    {stop.status === 'DELIVERED' && (
                      <div className="mt-2 rounded-xl bg-white border border-emerald-200 p-3 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-extrabold text-emerald-800">
                            ผู้รับ: {stop.receiverName || '-'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            ส่งสำเร็จ: {formatThaiDateSlash(stop.deliveredAt)}{' '}
                            {formatThaiTime24Dot(stop.deliveredAt)} น.
                          </span>
                        </div>
                        {stop.trackingNumber && (
                          <div className="text-[11px] font-mono text-slate-700">
                            Tracking: {stop.courierCompany ? `${stop.courierCompany} · ` : ''}
                            {stop.trackingNumber}
                          </div>
                        )}
                        {stop.podNote && (
                          <div className="text-[11px] text-slate-600">หมายเหตุ: {stop.podNote}</div>
                        )}
                        {(stop.podPhotoUrls.length > 0 || stop.receiverSignatureUrl) && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {stop.podPhotoUrls.map((url, pIdx) => (
                              <a
                                key={`${url}-${pIdx}`}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 block"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`POD ${pIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                            {stop.receiverSignatureUrl && (
                              <a
                                href={stop.receiverSignatureUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="h-16 px-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center"
                                title="ดูลายเซ็นผู้รับ"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={stop.receiverSignatureUrl}
                                  alt="Signature"
                                  className="max-h-14 object-contain"
                                />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {(stop.status === 'FAILED' || stop.status === 'RESCHEDULED') && stop.failReason && (
                      <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800 font-semibold">
                        เหตุผล: {stop.failReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fixed-Width Aligned Action Rail */}
                {canOperateTrip && !isClosedOrCancelled && (
                  <div className="flex flex-col gap-2 shrink-0 w-full sm:w-52">
                    {!isFinalized && trip.stops.length > 1 && (
                      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400">จัดลำดับจุดส่ง</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0 || Boolean(busyKey)}
                            onClick={() => void handleReorder(stop.id, 'UP')}
                            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center disabled:opacity-30 cursor-pointer"
                            title="เลื่อนขึ้น"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === trip.stops.length - 1 || Boolean(busyKey)}
                            onClick={() => void handleReorder(stop.id, 'DOWN')}
                            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center disabled:opacity-30 cursor-pointer"
                            title="เลื่อนลง"
                          >
                            <ArrowDown size={13} />
                          </button>
                        </div>
                      </div>
                    )}

                    {stop.sourceType === 'REQUISITION' && !stop.requisitionSignedTransport && !isFinalized && (
                      <button
                        type="button"
                        onClick={() => setPickupStop(stop)}
                        className="w-full h-10 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <ClipboardSignature size={14} /> เซ็นรับของสโตร์
                      </button>
                    )}

                    {!isFinalized && (
                      <>
                        {stop.status !== 'ARRIVED' && (
                          <button
                            type="button"
                            disabled={Boolean(busyKey)}
                            onClick={() => void handleCheckInStop(stop)}
                            className="w-full h-10 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {busyKey === `checkin-${stop.id}` ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <MapPin size={14} />
                            )}
                            <span>ถึงจุดส่งแล้ว (เช็กอิน)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={Boolean(busyKey)}
                          onClick={() => setPodStop(stop)}
                          className="w-full h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Camera size={15} /> ปิดส่ง &amp; เซ็นรับ (POD)
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(busyKey)}
                          onClick={() => void handleStopIssue(stop)}
                          className="w-full h-9 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <XCircle size={13} /> ส่งไม่สำเร็จ / เลื่อน
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Close Trip & Allowance/Toll Calculator Panel */}
      {trip.status !== 'CANCELLED' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <Calculator size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  ปิดทริป &amp; คิดค่าเบี้ยเลี้ยง / ค่าทางด่วน
                </h3>
                <p className="text-[11px] text-slate-500">
                  บันทึกเลขไมล์ ค่าเบี้ยเลี้ยงทีมวิ่งรถ ค่าทางด่วน และแนบหลักฐานใบเสร็จได้ทันทีในหน้าปิดทริป
                </p>
              </div>
            </div>

            {trip.status === 'COMPLETED' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                    trip.expenseApprovedStatus === 'PAID'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : trip.expenseApprovedStatus === 'APPROVED'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : trip.expenseApprovedStatus === 'PENDING_REVIEW'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {trip.expenseApprovedStatus === 'PAID'
                    ? 'จ่ายค่าใช้จ่ายทริปแล้ว'
                    : trip.expenseApprovedStatus === 'APPROVED'
                    ? 'อนุมัติค่าเบี้ยเลี้ยง/ทางด่วนแล้ว'
                    : trip.expenseApprovedStatus === 'PENDING_REVIEW'
                    ? 'รอหัวหน้าตรวจสอบค่าใช้จ่าย'
                    : 'ไม่มีค่าใช้จ่ายเพิ่ม'}
                </span>

                {permissions.canManageAllTrips &&
                  trip.expenseApprovedStatus === 'PENDING_REVIEW' && (
                    <button
                      type="button"
                      disabled={Boolean(busyKey)}
                      onClick={() => void handleApproveExpense('APPROVED')}
                      className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <BadgeCheck size={13} /> อนุมัติยอดเบิกทริป
                    </button>
                  )}

                {permissions.canManageAllTrips &&
                  trip.expenseApprovedStatus === 'APPROVED' && (
                    <button
                      type="button"
                      disabled={Boolean(busyKey)}
                      onClick={() => void handleApproveExpense('PAID')}
                      className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Check size={13} /> ยืนยันจ่ายเงินแล้ว
                    </button>
                  )}
              </div>
            )}
          </div>

          {/* 1. Balanced Two-Panel Mileage & Allowance Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 text-xs">
            {/* Left Sub-panel: Mileage (3 Equal Columns) */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-3.5 space-y-2.5">
              <div className="text-[11px] font-extrabold text-slate-700">
                1. เลขไมล์รถ &amp; ระยะทางทริป
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="flex flex-col justify-between gap-1.5">
                  <label className="font-bold text-slate-600 truncate">ไมล์เริ่มต้น (กม.)</label>
                  <input
                    type="number"
                    disabled={isClosedOrCancelled}
                    value={startMileage}
                    onChange={(e) => setStartMileage(e.target.value)}
                    placeholder="กม."
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 disabled:opacity-75"
                  />
                </div>

                <div className="flex flex-col justify-between gap-1.5">
                  <label className="font-bold text-slate-600 truncate">ไมล์ขากลับ (กม.)</label>
                  <input
                    type="number"
                    disabled={isClosedOrCancelled}
                    value={endMileage}
                    onChange={(e) => setEndMileage(e.target.value)}
                    placeholder="กม."
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 disabled:opacity-75"
                  />
                </div>

                <div className="flex flex-col justify-between gap-1.5">
                  <label className="font-bold text-slate-600 truncate">ระยะทางรวม</label>
                  <div className="h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center font-mono font-black text-slate-800">
                    {liveCalc.distanceKm !== null
                      ? `${liveCalc.distanceKm.toLocaleString('th-TH')} กม.`
                      : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sub-panel: Allowance Calculator (4 Equal Columns) */}
            <div className="rounded-2xl bg-indigo-50/40 border border-indigo-200/70 p-3.5 space-y-2.5">
              <div className="text-[11px] font-extrabold text-indigo-900">
                2. คำนวณเบี้ยเลี้ยงทีมวิ่งรถ (อัตรา × วัน × คน)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="flex flex-col justify-between gap-1.5">
                  <label className="font-bold text-slate-600 truncate">เบี้ยเลี้ยง/วัน (฿)</label>
                  <input
                    type="number"
                    min={0}
                    step="50"
                    disabled={isClosedOrCancelled}
                    value={allowancePerDay}
                    onChange={(e) => setAllowancePerDay(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-indigo-200/80 rounded-xl font-mono font-bold text-slate-900 disabled:opacity-75"
                  />
                </div>

                <div className="flex flex-col justify-between gap-1.5">
                  <label className="font-bold text-slate-600 truncate">จำนวนวัน</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    disabled={isClosedOrCancelled}
                    value={allowanceDays}
                    onChange={(e) => setAllowanceDays(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-indigo-200/80 rounded-xl font-mono font-bold text-slate-900 text-center disabled:opacity-75"
                  />
                </div>

                <div className="flex flex-col justify-between gap-1.5">
                  <label className="font-bold text-slate-600 truncate">จำนวนคน</label>
                  <input
                    type="number"
                    min={1}
                    disabled={isClosedOrCancelled}
                    value={crewCount}
                    onChange={(e) => setCrewCount(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-indigo-200/80 rounded-xl font-mono font-bold text-slate-900 text-center disabled:opacity-75"
                  />
                </div>

                <div className="flex flex-col justify-between gap-1.5">
                  <label className="font-bold text-indigo-800 truncate">ยอดเบี้ยเลี้ยงรวม</label>
                  <div className="h-10 px-3 bg-indigo-100/80 border border-indigo-200 rounded-xl flex items-center font-mono font-black text-indigo-900">
                    ฿{liveCalc.allowanceTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Uniform 4-Column Direct Expense Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-sky-200/80 bg-sky-50/40 p-3 flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between gap-1">
                <label className="font-bold text-slate-700 truncate">ค่าทางด่วนรวม (฿)</label>
                {hasTollRows && (
                  <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[9px] font-black shrink-0">
                    จากรายการย่อย
                  </span>
                )}
              </div>
              <input
                type="number"
                min={0}
                disabled={isClosedOrCancelled || hasTollRows}
                value={hasTollRows ? liveCalc.tollAmount : directTollAmount}
                onChange={(e) => setDirectTollAmount(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-sky-200 rounded-xl font-mono font-bold text-sky-900 disabled:opacity-75"
              />
            </div>

            <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3 flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between gap-1">
                <label className="font-bold text-slate-700 truncate">ค่าน้ำมันสำรองจ่าย (฿)</label>
                {hasFuelRows && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black shrink-0">
                    จากรายการย่อย
                  </span>
                )}
              </div>
              <input
                type="number"
                min={0}
                disabled={isClosedOrCancelled || hasFuelRows}
                value={hasFuelRows ? liveCalc.fuelAmount : directFuelAmount}
                onChange={(e) => setDirectFuelAmount(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-amber-200 rounded-xl font-mono font-bold text-amber-900 disabled:opacity-75"
              />
            </div>

            <div className="rounded-xl border border-purple-200/80 bg-purple-50/35 p-3 flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between gap-1">
                <label className="font-bold text-slate-700 truncate">ค้างคืน (คืน) / ที่พัก (฿)</label>
                {hasAccomRows && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[9px] font-black shrink-0">
                    จากรายการย่อย
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="number"
                  min={0}
                  disabled={isClosedOrCancelled}
                  value={overnightNights}
                  onChange={(e) => setOvernightNights(e.target.value)}
                  placeholder="คืน"
                  className="col-span-1 h-10 px-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-center"
                />
                <input
                  type="number"
                  min={0}
                  disabled={isClosedOrCancelled || hasAccomRows}
                  value={hasAccomRows ? liveCalc.accommodationAmount : accommodationAmount}
                  onChange={(e) => setAccommodationAmount(e.target.value)}
                  placeholder="฿"
                  className="col-span-2 h-10 px-2.5 bg-white border border-purple-200 rounded-xl font-mono font-bold text-purple-900 disabled:opacity-75"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between gap-1">
                <label className="font-bold text-slate-700 truncate">ค่าจอด / อื่นๆ (฿)</label>
                {hasOtherRows && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[9px] font-black shrink-0">
                    จากรายการย่อย
                  </span>
                )}
              </div>
              <input
                type="number"
                min={0}
                disabled={isClosedOrCancelled || hasOtherRows}
                value={hasOtherRows ? liveCalc.otherExpenseAmount : directOtherAmount}
                onChange={(e) => setDirectOtherAmount(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 disabled:opacity-75"
              />
            </div>
          </div>

          {/* 3. Itemized Toll / Fuel / Other Receipts */}
          <div className="rounded-2xl bg-slate-50/80 border border-slate-200 p-3.5 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <Receipt size={14} className="text-sky-600" /> รายการย่อยค่าทางด่วน / น้ำมัน / ใบเสร็จหน้างาน
              </span>
              {!isClosedOrCancelled && canOperateTrip && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => addExpenseRow('TOLL')}
                    className="h-8 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> เพิ่มค่าทางด่วน
                  </button>
                  <button
                    type="button"
                    onClick={() => addExpenseRow('FUEL')}
                    className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Fuel size={12} /> เพิ่มค่าน้ำมัน
                  </button>
                  <button
                    type="button"
                    onClick={() => addExpenseRow('OTHER')}
                    className="h-8 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> ค่าใช้จ่ายอื่น
                  </button>
                </div>
              )}
            </div>

            {expenseItems.length > 0 && (
              <div className="space-y-2">
                {expenseItems.map((item) => {
                  const meta = EXPENSE_CATEGORY_META[item.category] || EXPENSE_CATEGORY_META.OTHER;
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200"
                    >
                      <select
                        disabled={isClosedOrCancelled}
                        value={item.category}
                        onChange={(e) =>
                          setExpenseItems((prev) =>
                            prev.map((row) =>
                              row.id === item.id
                                ? { ...row, category: e.target.value as LogisticsExpenseCategory }
                                : row
                            )
                          )
                        }
                        className="sm:col-span-3 h-9 px-2.5 rounded-lg border border-slate-200 font-bold text-slate-800 text-[11px]"
                      >
                        <option value="TOLL">ค่าทางด่วน / M-Flow</option>
                        <option value="FUEL">ค่าน้ำมันสำรอง</option>
                        <option value="ACCOMMODATION">ค่าที่พักค้างคืน</option>
                        <option value="OTHER">ค่าจอด/ยกของ/อื่น</option>
                      </select>

                      <input
                        type="text"
                        disabled={isClosedOrCancelled}
                        value={item.label}
                        onChange={(e) =>
                          setExpenseItems((prev) =>
                            prev.map((row) =>
                              row.id === item.id ? { ...row, label: e.target.value } : row
                            )
                          )
                        }
                        placeholder={meta.placeholder}
                        className="sm:col-span-4 h-9 px-2.5 rounded-lg border border-slate-200 font-medium text-slate-800"
                      />

                      <input
                        type="number"
                        min={0}
                        disabled={isClosedOrCancelled}
                        value={item.amount || ''}
                        onChange={(e) =>
                          setExpenseItems((prev) =>
                            prev.map((row) =>
                              row.id === item.id
                                ? { ...row, amount: Number(e.target.value || 0) }
                                : row
                            )
                          )
                        }
                        placeholder="จำนวนเงิน ฿"
                        className="sm:col-span-2 h-9 px-2.5 rounded-lg border border-slate-200 font-mono font-bold text-slate-900"
                      />

                      <div className="sm:col-span-3 flex items-center justify-end gap-1.5">
                        {item.receiptUrl ? (
                          <a
                            href={item.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="h-9 px-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] inline-flex items-center gap-1"
                          >
                            <ExternalLink size={11} /> สลิป
                          </a>
                        ) : !isClosedOrCancelled ? (
                          <label className="h-9 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer">
                            <Camera size={11} /> แนบสลิป
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingReceipt}
                              className="hidden"
                              onChange={(e) => {
                                void handleUploadReceiptFiles(e.target.files, item.id);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        ) : null}

                        {!isClosedOrCancelled && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpenseItems((prev) => prev.filter((row) => row.id !== item.id))
                            }
                            className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Additional Receipts Pool */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {!isClosedOrCancelled && canOperateTrip && (
                <label className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer">
                  {isUploadingReceipt ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Camera size={12} />
                  )}
                  <span>แนบรูปรวมใบเสร็จทางด่วน/บิลอื่นๆ</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isUploadingReceipt}
                    className="hidden"
                    onChange={(e) => {
                      void handleUploadReceiptFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
              {expenseReceipts.map((url, idx) => (
                <a
                  key={`${url}-${idx}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-blue-700"
                >
                  <ExternalLink size={11} /> ใบเสร็จ #{idx + 1}
                </a>
              ))}
            </div>
          </div>

          {/* 4. Equal-Height 50/50 Close Note & Total Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 flex flex-col justify-center gap-1.5 text-xs">
              <label className="font-bold text-slate-700">หมายเหตุปิดทริป</label>
              <input
                type="text"
                disabled={isClosedOrCancelled}
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                placeholder="สรุปสภาพรถ ความเรียบร้อย หรือแจ้งซ่อมบำรุง (ถ้ามี)"
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800"
              />
            </div>

            <div className="rounded-2xl bg-slate-900 text-white p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-300 font-semibold leading-snug">
                  ยอดรวมปิดทริป (เบี้ยเลี้ยง ฿{liveCalc.allowanceTotal.toLocaleString('th-TH')} + ทางด่วน ฿{liveCalc.tollAmount.toLocaleString('th-TH')} + อื่นๆ ฿{(liveCalc.fuelAmount + liveCalc.accommodationAmount + liveCalc.otherExpenseAmount).toLocaleString('th-TH')})
                </div>
                <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                  ฿{liveCalc.totalExpenseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {!isClosedOrCancelled && canOperateTrip && (
                <button
                  type="button"
                  disabled={Boolean(busyKey) || isUploadingReceipt}
                  onClick={() => void handleCloseTrip()}
                  className={`h-11 px-5 rounded-xl font-black text-xs inline-flex items-center gap-2 shrink-0 transition-all cursor-pointer disabled:opacity-50 ${
                    unresolvedCount > 0
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                  }`}
                >
                  {busyKey === 'CLOSE_TRIP' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : unresolvedCount > 0 ? (
                    <AlertTriangle size={15} />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  <span>
                    {unresolvedCount > 0
                      ? `ยังเหลือ ${unresolvedCount} จุดส่ง`
                      : 'ยืนยันปิดทริป'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {trip.status === 'COMPLETED' && trip.closedAt && (
            <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1">
              <Clock size={12} />
              <span>
                ปิดทริปเมื่อ {formatThaiDateSlash(trip.closedAt)} {formatThaiTime24Dot(trip.closedAt)} น. โดย{' '}
                <strong className="text-slate-700">{trip.closedByName || trip.driverName}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      <StopPodModal
        stop={podStop}
        tripNumber={trip.tripNumber}
        isOpen={Boolean(podStop)}
        onClose={() => setPodStop(null)}
        onSuccess={onRefresh}
      />

      {pickupStop && (
        <TripPickupSignModal
          stop={pickupStop}
          trip={trip}
          onClose={() => setPickupStop(null)}
          onSuccess={onRefresh}
        />
      )}

      {showScheduleModal && (
        <TripScheduleEditModal
          trip={trip}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
