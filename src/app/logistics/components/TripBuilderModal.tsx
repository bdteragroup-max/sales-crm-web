'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Route,
  Search,
  Trash2,
  Truck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  createLogisticsTrip,
  quickCreateLogisticsVehicle,
  type CreateLogisticsTripStopInput,
} from '@/app/actions/logistics';
import {
  DEFAULT_LOGISTICS_BRANCHES,
  filterLogisticsBranches,
  filterLogisticsCrewMembers,
  filterLogisticsVehicles,
  formatIsoDateToSlashThai,
  LOGISTICS_SOURCE_META,
  parseLogisticsTime24,
  parseSlashDateToIso,
  toBangkokDateKey,
  type LogisticsBranchOption,
  type LogisticsCrewMember,
  type LogisticsQueueItem,
  type LogisticsTripRecord,
  type LogisticsVehicleOption,
} from '@/app/lib/logisticsTypes';
import { useIsPortalClientReady } from '@/app/requisitions/components/signaturePadHelper';

interface TripBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: LogisticsVehicleOption[];
  crewMembers: LogisticsCrewMember[];
  branches?: LogisticsBranchOption[];
  existingTrips: LogisticsTripRecord[];
  initialQueueItems: LogisticsQueueItem[];
  currentUserId: string;
  currentUserEmployeeId: string;
  currentUserName: string;
  onVehicleAdded?: (vehicle: LogisticsVehicleOption) => void;
  onCreated: (trip: LogisticsTripRecord) => Promise<void> | void;
}

const ROUTE_PRESETS = [
  'กทม. & ปริมณฑล',
  'ภาคกลาง / ตะวันตก',
  'ภาคตะวันออก (EEC)',
  'ภาคอีสาน',
  'ภาคเหนือ',
  'ภาคใต้',
];

const HOURS_24 = Array.from({ length: 24 }, (_, idx) => String(idx).padStart(2, '0'));
const MINUTES_24 = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '59'];
const DEPARTURE_TIME_PRESETS = ['06.00', '08.30', '10.00', '13.00', '18.00', '23.00', '23.59', '00.00'];
const VEHICLE_TYPE_PRESETS = ['รถกระบะตู้ทึบ', 'รถกระบะ', 'รถเฮี้ยบ', 'รถตู้', 'รถ 6 ล้อ'];

type OpenMenuKey = 'TIME' | 'VEHICLE' | 'DRIVER' | 'HELPER' | 'BRANCH' | null;

function DropdownSearchHeader({
  inputRef,
  value,
  onChange,
  placeholder,
}: {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <div className="p-2 border-b border-slate-100 bg-slate-50">
      <div className="relative">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          placeholder={placeholder}
          className="w-full h-8 pl-8 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="ล้างคำค้นหา"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function formatMemberLabel(m: Pick<LogisticsCrewMember, 'fullName' | 'nickname'>): string {
  return m.nickname ? `${m.fullName} (${m.nickname})` : m.fullName;
}

function TripBuilderModalInner({
  onClose,
  vehicles,
  crewMembers,
  branches = DEFAULT_LOGISTICS_BRANCHES,
  existingTrips,
  initialQueueItems,
  currentUserId,
  currentUserEmployeeId,
  currentUserName,
  onVehicleAdded,
  onCreated,
}: Omit<TripBuilderModalProps, 'isOpen'>) {
  const defaultDriver = useMemo(() => {
    const me = crewMembers.find((c) => c.userId === currentUserId);
    if (me && !me.isManager) return me;
    return (
      crewMembers.find((c) => c.isTransportTeam && !c.isManager && !c.isCustom) ||
      crewMembers.find((c) => !c.isManager && !c.isCustom) ||
      me ||
      null
    );
  }, [crewMembers, currentUserId]);

  const defaultVehicle = useMemo(
    () =>
      vehicles.find(
        (v) =>
          v.status === 'available' &&
          (v.vehicleType?.includes('เฮี้ยบ') || v.vehicleType?.includes('กระบะ'))
      ) ||
      vehicles.find((v) => v.status === 'available') ||
      vehicles[0] ||
      null,
    [vehicles]
  );

  // Local additions ("ถ้าไม่มีสามารถเพิ่มได้")
  const [addedVehicles, setAddedVehicles] = useState<LogisticsVehicleOption[]>([]);
  const [addedCrewMembers, setAddedCrewMembers] = useState<LogisticsCrewMember[]>([]);
  const [addedBranches, setAddedBranches] = useState<LogisticsBranchOption[]>([]);

  const allVehicles = useMemo(() => {
    const seen = new Set(vehicles.map((v) => v.id));
    return [...addedVehicles.filter((v) => !seen.has(v.id)), ...vehicles];
  }, [vehicles, addedVehicles]);

  const allCrewMembers = useMemo(() => {
    const seen = new Set(crewMembers.map((c) => c.userId));
    return [...addedCrewMembers.filter((c) => !seen.has(c.userId)), ...crewMembers];
  }, [crewMembers, addedCrewMembers]);

  const allBranches = useMemo(() => {
    const base = branches.length > 0 ? branches : DEFAULT_LOGISTICS_BRANCHES;
    const seen = new Set(base.map((b) => b.code.toUpperCase()));
    return [...base, ...addedBranches.filter((b) => !seen.has(b.code.toUpperCase()))];
  }, [branches, addedBranches]);

  // Core Form States
  const [tripDateDisplay, setTripDateDisplay] = useState<string>(() =>
    formatIsoDateToSlashThai(toBangkokDateKey(new Date()))
  );
  const [departureTimeDisplay, setDepartureTimeDisplay] = useState<string>('08.30');
  const [transportType, setTransportType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [vehicleAssetId, setVehicleAssetId] = useState<number | ''>(
    defaultVehicle ? defaultVehicle.id : ''
  );
  const [courierName, setCourierName] = useState('');
  const [externalPlate, setExternalPlate] = useState('');

  const [driverUserId, setDriverUserId] = useState<string>(defaultDriver?.userId || '');
  const [driverName, setDriverName] = useState<string>(
    defaultDriver?.fullName || currentUserName
  );
  const [selectedHelperKeys, setSelectedHelperKeys] = useState<string[]>([]);
  const [routeZone, setRouteZone] = useState<string>('');
  const [originBranch, setOriginBranch] = useState<string>(
    () => (branches[0]?.code || 'BKK-HQ')
  );
  const [startMileage, setStartMileage] = useState<string>('');
  const [planNote, setPlanNote] = useState<string>('');

  // Popover controls (single shared openMenu guarantees mutual exclusion)
  const [openMenu, setOpenMenu] = useState<OpenMenuKey>(null);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const [helperSearch, setHelperSearch] = useState('');
  const [branchSearch, setBranchSearch] = useState('');

  // Inline Quick-Add states inside each dropdown
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleType, setNewVehicleType] = useState('รถกระบะตู้ทึบ');
  const [newVehicleMainUser, setNewVehicleMainUser] = useState('');
  const [isCreatingVehicle, setIsCreatingVehicle] = useState(false);

  const [showAddDriverForm, setShowAddDriverForm] = useState(false);
  const [newDriverFullName, setNewDriverFullName] = useState('');
  const [newDriverNickname, setNewDriverNickname] = useState('');

  const [showAddHelperForm, setShowAddHelperForm] = useState(false);
  const [newHelperFullName, setNewHelperFullName] = useState('');
  const [newHelperNickname, setNewHelperNickname] = useState('');

  const [showAddBranchForm, setShowAddBranchForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');

  // Refs for click-outside and autofocus
  const timeBoxRef = useRef<HTMLDivElement>(null);
  const vehicleBoxRef = useRef<HTMLDivElement>(null);
  const driverBoxRef = useRef<HTMLDivElement>(null);
  const helperBoxRef = useRef<HTMLDivElement>(null);
  const branchBoxRef = useRef<HTMLDivElement>(null);
  const nativeDateRef = useRef<HTMLInputElement>(null);

  const vehicleSearchRef = useRef<HTMLInputElement>(null);
  const driverSearchRef = useRef<HTMLInputElement>(null);
  const helperSearchRef = useRef<HTMLInputElement>(null);
  const branchSearchRef = useRef<HTMLInputElement>(null);

  // Ordered Stops
  const [stops, setStops] = useState<CreateLogisticsTripStopInput[]>(() =>
    initialQueueItems.map((q) => ({
      sourceType: q.sourceType,
      jobId: q.sourceType === 'JOB' ? q.sourceId : null,
      requisitionId: q.sourceType === 'REQUISITION' ? q.sourceId : null,
      repairDeliveryId: q.sourceType === 'REPAIR_DELIVERY' ? q.sourceId : null,
      referenceNumber: q.referenceNumber,
      customerName: q.customerName,
      destination: q.destination,
      province: q.province,
      contactName: q.contactName,
      contactPhone: q.contactPhone,
      itemSummary: q.itemSummary,
      targetDate: q.targetDate,
      deliveryMethod: q.deliveryMethodHint,
    }))
  );

  // Quick manual stop adder
  const [showManualAdd, setShowManualAdd] = useState(initialQueueItems.length === 0);
  const [manualCustomer, setManualCustomer] = useState('');
  const [manualDest, setManualDest] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualItems, setManualItems] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Close popovers on outside click / Escape
  useEffect(() => {
    const handleOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      const activeRef =
        openMenu === 'TIME'
          ? timeBoxRef
          : openMenu === 'VEHICLE'
          ? vehicleBoxRef
          : openMenu === 'DRIVER'
          ? driverBoxRef
          : openMenu === 'HELPER'
          ? helperBoxRef
          : openMenu === 'BRANCH'
          ? branchBoxRef
          : null;
      if (activeRef?.current && !activeRef.current.contains(target)) {
        setOpenMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openMenu) {
        e.stopPropagation();
        setOpenMenu(null);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openMenu]);

  // Autofocus search box when opening a searchable dropdown
  useEffect(() => {
    const refMap: Record<Exclude<OpenMenuKey, 'TIME' | null>, React.RefObject<HTMLInputElement | null>> = {
      VEHICLE: vehicleSearchRef,
      DRIVER: driverSearchRef,
      HELPER: helperSearchRef,
      BRANCH: branchSearchRef,
    };
    if (!openMenu || openMenu === 'TIME') return;
    const targetRef = refMap[openMenu];
    const t = setTimeout(() => targetRef.current?.focus(), 15);
    return () => clearTimeout(t);
  }, [openMenu]);

  const toggleMenu = (key: Exclude<OpenMenuKey, null>) => {
    setOpenMenu((prev) => (prev === key ? null : key));
  };

  // Date & Time derived values
  const isoTripDate = useMemo(() => parseSlashDateToIso(tripDateDisplay) || '', [tripDateDisplay]);
  const parsedTime = useMemo(() => parseLogisticsTime24(departureTimeDisplay), [departureTimeDisplay]);
  const selectedHour = parsedTime.ok && parsedTime.dot24 ? parsedTime.dot24.slice(0, 2) : null;
  const selectedMinute = parsedTime.ok && parsedTime.dot24 ? parsedTime.dot24.slice(3, 5) : null;

  const bookedPlatesOnSelectedDate = useMemo(() => {
    const dateKey = isoTripDate || toBangkokDateKey(new Date());
    const map = new Map<number, string[]>();
    for (const t of existingTrips) {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED') continue;
      if (!t.vehicleAssetId) continue;
      if (toBangkokDateKey(t.tripDate) === dateKey) {
        const list = map.get(t.vehicleAssetId) || [];
        list.push(t.tripNumber);
        map.set(t.vehicleAssetId, list);
      }
    }
    return map;
  }, [existingTrips, isoTripDate]);

  // Selected entity lookups
  const selectedVehicle = useMemo(
    () => (typeof vehicleAssetId === 'number' ? allVehicles.find((v) => v.id === vehicleAssetId) || null : null),
    [allVehicles, vehicleAssetId]
  );

  const selectedDriverMember = useMemo(
    () =>
      allCrewMembers.find((c) => c.userId === driverUserId) ||
      allCrewMembers.find((c) => c.fullName === driverName) ||
      null,
    [allCrewMembers, driverUserId, driverName]
  );

  const selectedHelperMembers = useMemo(
    () =>
      selectedHelperKeys
        .map((k) => allCrewMembers.find((m) => m.userId === k))
        .filter((m): m is LogisticsCrewMember => Boolean(m)),
    [selectedHelperKeys, allCrewMembers]
  );

  const selectedBranchOption = useMemo(
    () =>
      allBranches.find(
        (b) =>
          b.code.toLowerCase() === originBranch.toLowerCase() ||
          b.name.toLowerCase() === originBranch.toLowerCase()
      ) || null,
    [allBranches, originBranch]
  );

  // Filtered lists
  const filteredVehicles = useMemo(
    () => filterLogisticsVehicles(allVehicles, vehicleSearch),
    [allVehicles, vehicleSearch]
  );
  const filteredDrivers = useMemo(
    () => filterLogisticsCrewMembers(allCrewMembers, driverSearch),
    [allCrewMembers, driverSearch]
  );
  const helperCandidates = useMemo(
    () =>
      allCrewMembers.filter(
        (m) => m.userId !== driverUserId && m.fullName !== driverName
      ),
    [allCrewMembers, driverUserId, driverName]
  );
  const filteredHelpers = useMemo(
    () => filterLogisticsCrewMembers(helperCandidates, helperSearch),
    [helperCandidates, helperSearch]
  );
  const filteredBranches = useMemo(
    () => filterLogisticsBranches(allBranches, branchSearch),
    [allBranches, branchSearch]
  );

  // Handlers: Date & Time
  const handleTripDateBlur = () => {
    const iso = parseSlashDateToIso(tripDateDisplay);
    if (iso) {
      setTripDateDisplay(formatIsoDateToSlashThai(iso));
    }
  };

  const handleNativeDateChange = (iso: string) => {
    if (!iso) return;
    setTripDateDisplay(formatIsoDateToSlashThai(iso));
  };

  const openNativeDatePicker = () => {
    const el = nativeDateRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        // Fallback when showPicker unsupported
      }
    }
    el.focus();
    el.click();
  };

  const handleTimeBlur = () => {
    const res = parseLogisticsTime24(departureTimeDisplay);
    if (res.ok && res.dot24) {
      setDepartureTimeDisplay(res.dot24);
    }
  };

  // Handlers: Vehicle
  const handleQuickAddVehicle = async () => {
    const cleanPlate = newVehiclePlate.trim();
    if (!cleanPlate) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุทะเบียนรถ' });
      return;
    }
    setIsCreatingVehicle(true);
    try {
      const res = await quickCreateLogisticsVehicle({
        plate: cleanPlate,
        name: newVehicleName.trim() || `${newVehicleType} (${cleanPlate})`,
        vehicleType: newVehicleType.trim() || 'รถขนส่ง',
        mainUser: newVehicleMainUser.trim() || undefined,
      });
      if (!res.success || !res.vehicle) {
        Swal.fire({
          icon: 'error',
          title: 'เพิ่มทะเบียนรถไม่สำเร็จ',
          text: res.error || 'กรุณาลองใหม่อีกครั้ง',
        });
        return;
      }
      const created = res.vehicle;
      setAddedVehicles((prev) =>
        prev.some((v) => v.id === created.id) ? prev : [created, ...prev]
      );
      onVehicleAdded?.(created);
      setVehicleAssetId(created.id);
      setShowAddVehicleForm(false);
      setNewVehiclePlate('');
      setNewVehicleName('');
      setNewVehicleMainUser('');
      setVehicleSearch('');
      setOpenMenu(null);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `เพิ่มรถ ${created.assetId} เข้าทะเบียนแล้ว`,
        showConfirmButton: false,
        timer: 1800,
      });
    } finally {
      setIsCreatingVehicle(false);
    }
  };

  // Handlers: Driver & Helpers
  const handleSelectDriver = (member: LogisticsCrewMember) => {
    setDriverUserId(member.userId);
    setDriverName(member.fullName);
    setSelectedHelperKeys((prev) => prev.filter((k) => k !== member.userId));
    setDriverSearch('');
    setShowAddDriverForm(false);
    setOpenMenu(null);
  };

  const handleAddCustomDriver = () => {
    const cleanName = newDriverFullName.trim();
    if (!cleanName) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุชื่อคนขับรถ' });
      return;
    }
    const cleanNick = newDriverNickname.trim() || null;
    const customMember: LogisticsCrewMember = {
      userId: `custom:${cleanName}-${Date.now()}`,
      employeeId: '',
      fullName: cleanName,
      nickname: cleanNick,
      role: 'คนขับเพิ่มเติม',
      position: null,
      isManager: false,
      isTransportTeam: true,
      isCustom: true,
    };
    setAddedCrewMembers((prev) => [customMember, ...prev]);
    handleSelectDriver(customMember);
    setNewDriverFullName('');
    setNewDriverNickname('');
  };

  const toggleHelperKey = (userId: string) => {
    setSelectedHelperKeys((prev) =>
      prev.includes(userId) ? prev.filter((k) => k !== userId) : [...prev, userId]
    );
  };

  const handleAddCustomHelper = () => {
    const cleanName = newHelperFullName.trim();
    if (!cleanName) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุชื่อผู้ช่วยติดรถ' });
      return;
    }
    const cleanNick = newHelperNickname.trim() || null;
    const customHelper: LogisticsCrewMember = {
      userId: `custom:helper-${cleanName}-${Date.now()}`,
      employeeId: '',
      fullName: cleanName,
      nickname: cleanNick,
      role: 'ผู้ช่วยเพิ่มเติม',
      position: null,
      isManager: false,
      isTransportTeam: true,
      isCustom: true,
    };
    setAddedCrewMembers((prev) => [customHelper, ...prev]);
    setSelectedHelperKeys((prev) => [...prev, customHelper.userId]);
    setNewHelperFullName('');
    setNewHelperNickname('');
    setHelperSearch('');
    setShowAddHelperForm(false);
  };

  // Handlers: Origin Branch
  const handleSelectBranch = (b: LogisticsBranchOption) => {
    setOriginBranch(b.code);
    setBranchSearch('');
    setShowAddBranchForm(false);
    setOpenMenu(null);
  };

  const handleAddCustomBranch = () => {
    const cleanName = newBranchName.trim();
    if (!cleanName) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุชื่อสาขาต้นทาง' });
      return;
    }
    const cleanCode = newBranchCode.trim();
    const displayCode = cleanCode ? `${cleanName} (${cleanCode})` : cleanName;
    const createdBranch: LogisticsBranchOption = {
      code: displayCode,
      name: cleanName,
      aliases: cleanCode ? [cleanCode] : [],
      isCustom: true,
    };
    setAddedBranches((prev) => [...prev, createdBranch]);
    setOriginBranch(createdBranch.code);
    setNewBranchName('');
    setNewBranchCode('');
    setBranchSearch('');
    setShowAddBranchForm(false);
    setOpenMenu(null);
  };

  // Handlers: Stops
  const moveStop = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= stops.length) return;
    setStops((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const addManualStop = () => {
    if (!manualCustomer.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุชื่อลูกค้า / ปลายทาง' });
      return;
    }
    setStops((prev) => [
      ...prev,
      {
        sourceType: 'MANUAL',
        customerName: manualCustomer.trim(),
        destination: manualDest.trim(),
        contactPhone: manualPhone.trim(),
        itemSummary: manualItems.trim() || 'จุดส่งเพิ่มเติม',
        deliveryMethod: transportType === 'EXTERNAL' ? 'courier' : 'in-house',
      },
    ]);
    setManualCustomer('');
    setManualDest('');
    setManualPhone('');
    setManualItems('');
    setShowManualAdd(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedDateIso = parseSlashDateToIso(tripDateDisplay);
    if (!parsedDateIso) {
      Swal.fire({
        icon: 'warning',
        title: 'รูปแบบวันที่ออกรถไม่ถูกต้อง',
        text: 'กรุณาระบุเป็น วัน/เดือน/ปี เช่น 26/11/2569',
      });
      return;
    }

    const parsedDepTime = parseLogisticsTime24(departureTimeDisplay);
    if (!parsedDepTime.ok) {
      Swal.fire({
        icon: 'warning',
        title: 'เวลาออกรถไม่ถูกต้อง',
        text: parsedDepTime.error,
      });
      return;
    }

    if (transportType === 'INTERNAL' && !selectedVehicle) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกรถบริษัทจากทะเบียนกลาง',
        text: 'สามารถพิมพ์ค้นหาหรือกดเพิ่มรถใหม่ในช่องเลือกรถได้',
      });
      return;
    }

    if (transportType === 'EXTERNAL' && !courierName.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุชื่อบริษัทขนส่งนอก / รถร่วม' });
      return;
    }

    if (transportType === 'INTERNAL' && !driverName.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกหรือระบุชื่อพนักงานขับรถหลัก' });
      return;
    }

    if (stops.length === 0) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเพิ่มจุดส่งอย่างน้อย 1 จุด' });
      return;
    }

    setIsSaving(true);
    try {
      const isoForSubmit = new Date(`${parsedDateIso}T08:00:00+07:00`).toISOString();
      const helperNamesFormatted =
        transportType === 'INTERNAL'
          ? selectedHelperMembers.map((m) => formatMemberLabel(m)).join(', ')
          : '';

      const res = await createLogisticsTrip({
        tripDate: isoForSubmit,
        departureTime: parsedDepTime.dot24 || '',
        transportType,
        vehicleAssetId: transportType === 'INTERNAL' && selectedVehicle ? selectedVehicle.id : null,
        vehiclePlate:
          transportType === 'INTERNAL'
            ? selectedVehicle?.assetId || ''
            : externalPlate.trim(),
        vehicleName:
          transportType === 'INTERNAL'
            ? selectedVehicle
              ? `${selectedVehicle.name}${
                  selectedVehicle.vehicleType ? ` (${selectedVehicle.vehicleType})` : ''
                }`
              : 'รถบริษัท'
            : courierName.trim() || 'ขนส่งนอก',
        courierName: transportType === 'EXTERNAL' ? courierName.trim() : undefined,
        driverUserId:
          transportType === 'INTERNAL' ? selectedDriverMember?.userId || null : null,
        driverEmployeeId:
          transportType === 'INTERNAL'
            ? selectedDriverMember?.employeeId || currentUserEmployeeId || null
            : null,
        driverName: transportType === 'INTERNAL' ? driverName.trim() : '',
        helperNames: helperNamesFormatted,
        routeZone: routeZone.trim(),
        originBranch: originBranch.trim() || 'BKK-HQ',
        startMileage:
          transportType === 'INTERNAL' && startMileage.trim() ? Number(startMileage) : null,
        planNote: planNote.trim(),
        stops,
      });

      if (!res.success || !res.trip) {
        Swal.fire({
          icon: 'error',
          title: 'สร้างทริปไม่สำเร็จ',
          text: res.error || 'กรุณาลองใหม่อีกครั้ง',
        });
        return;
      }

      await onCreated(res.trip);
      onClose();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `สร้างทริป ${res.trip.tripNumber} (${res.trip.stops.length} จุดส่ง) แล้ว`,
        showConfirmButton: false,
        timer: 2600,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-3xl max-h-[94dvh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                จัดคิวรถ &amp; สร้างรอบวิ่งรถ (Multi-Stop Trip)
              </h2>
              <p className="text-[11px] text-slate-500">
                มัดรวมหลายจุดส่งในรถ 1 คัน · จัดลำดับเส้นทาง · ปิดส่ง POD รายจุด
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 pb-10 space-y-4 text-xs">
          {/* ─── ROW 1: DATE (DD/MM/YYYY), 24H TIME DROPDOWN, TRANSPORT TYPE ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* วันที่ออกรถ (วัน/เดือน/ปี) */}
            <div className="sm:col-span-4 space-y-1">
              <label className="font-bold text-slate-700 flex items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={13} className="text-orange-600" />
                  <span>วันที่ออกรถ *</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400">วัน/เดือน/ปี</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={tripDateDisplay}
                  onChange={(e) => setTripDateDisplay(e.target.value)}
                  onBlur={handleTripDateBlur}
                  placeholder="26/11/2569"
                  required
                  className={`w-full h-10 pl-3 pr-10 bg-slate-50 border rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${
                    tripDateDisplay.trim() && !isoTripDate
                      ? 'border-amber-400 focus:ring-amber-500/20 focus:border-amber-500'
                      : 'border-slate-200 focus:ring-orange-500/20 focus:border-orange-400'
                  }`}
                />
                <input
                  ref={nativeDateRef}
                  type="date"
                  value={isoTripDate}
                  onChange={(e) => handleNativeDateChange(e.target.value)}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="absolute right-0 top-0 w-9 h-10 opacity-0 pointer-events-none"
                />
                <button
                  type="button"
                  onClick={openNativeDatePicker}
                  title="เลือกจากปฏิทิน"
                  aria-label="เลือกวันที่จากปฏิทิน"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                >
                  <Calendar size={14} />
                </button>
              </div>
              {tripDateDisplay.trim() && !isoTripDate && (
                <p className="text-[10px] font-medium text-amber-700">
                  ใส่รูปแบบ วัน/เดือน/ปี เช่น 26/11/2569
                </p>
              )}
            </div>

            {/* เวลาออกรถ 24 ชม. (00.00 - 23.59 น.) ดรอปดาวน์ + พิมพ์เอง */}
            <div className="sm:col-span-3 space-y-1">
              <label className="font-bold text-slate-700 flex items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1">
                  <Clock size={13} className="text-orange-600" />
                  <span>เวลาออกรถ</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400">00.00-23.59</span>
              </label>
              <div ref={timeBoxRef} className="relative">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={departureTimeDisplay}
                    onFocus={() => setOpenMenu('TIME')}
                    onChange={(e) => setDepartureTimeDisplay(e.target.value)}
                    onBlur={handleTimeBlur}
                    placeholder="08.30"
                    className={`w-full h-10 pl-3 pr-9 bg-slate-50 border rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${
                      !parsedTime.ok
                        ? 'border-amber-400 focus:ring-amber-500/20 focus:border-amber-500'
                        : 'border-slate-200 focus:ring-orange-500/20 focus:border-orange-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => toggleMenu('TIME')}
                    title="เลือกเวลา (24 ชม.)"
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                      openMenu === 'TIME'
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-slate-500 hover:text-orange-600 hover:bg-orange-50'
                    }`}
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${openMenu === 'TIME' ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {openMenu === 'TIME' && (
                  <div className="absolute left-0 sm:left-auto sm:right-0 top-[calc(100%+4px)] w-64 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-slate-700">
                        เวลาออกรถ (24 ชม.)
                      </span>
                      {departureTimeDisplay && (
                        <button
                          type="button"
                          onClick={() => {
                            setDepartureTimeDisplay('');
                            setOpenMenu(null);
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                        >
                          ล้างเวลา
                        </button>
                      )}
                    </div>

                    <div className="px-2.5 py-2 flex flex-wrap gap-1 border-b border-slate-100">
                      {DEPARTURE_TIME_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setDepartureTimeDisplay(preset);
                            setOpenMenu(null);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                            parsedTime.ok && parsedTime.dot24 === preset
                              ? 'bg-orange-600 text-white border-orange-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-orange-50 hover:border-orange-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-slate-100">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 text-center py-1 bg-slate-50/70">
                          ชั่วโมง (00-23)
                        </div>
                        <div className="max-h-44 overflow-y-auto p-1 grid grid-cols-2 gap-0.5">
                          {HOURS_24.map((hh) => {
                            const active = selectedHour === hh;
                            return (
                              <button
                                key={hh}
                                type="button"
                                onClick={() => setDepartureTimeDisplay(`${hh}.${selectedMinute || '00'}`)}
                                className={`py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-orange-600 text-white'
                                    : 'text-slate-700 hover:bg-orange-50'
                                }`}
                              >
                                {hh}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-slate-400 text-center py-1 bg-slate-50/70">
                          นาที (00-59)
                        </div>
                        <div className="max-h-44 overflow-y-auto p-1 grid grid-cols-2 gap-0.5">
                          {MINUTES_24.map((mm) => {
                            const active = selectedMinute === mm;
                            return (
                              <button
                                key={mm}
                                type="button"
                                onClick={() => setDepartureTimeDisplay(`${selectedHour || '08'}.${mm}`)}
                                className={`py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-orange-600 text-white'
                                    : 'text-slate-700 hover:bg-orange-50'
                                }`}
                              >
                                {mm}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-semibold">
                        ที่เลือก:{' '}
                        <strong className="text-slate-900">
                          {parsedTime.ok && parsedTime.dot24 ? `${parsedTime.dot24} น.` : 'ไม่ระบุ'}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenMenu(null)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold cursor-pointer"
                      >
                        ตกลง
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {!parsedTime.ok && (
                <p className="text-[10px] font-medium text-amber-700">ระบุเวลา 00.00 - 23.59 น.</p>
              )}
            </div>

            {/* รูปแบบรถที่ใช้วิ่ง */}
            <div className="sm:col-span-5 space-y-1">
              <label className="font-bold text-slate-700">รูปแบบรถที่ใช้วิ่ง</label>
              <div className="grid grid-cols-2 gap-1.5 h-10">
                <button
                  type="button"
                  onClick={() => setTransportType('INTERNAL')}
                  className={`rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                    transportType === 'INTERNAL'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                  }`}
                >
                  รถบริษัท (In-House)
                </button>
                <button
                  type="button"
                  onClick={() => setTransportType('EXTERNAL')}
                  className={`rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                    transportType === 'EXTERNAL'
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                  }`}
                >
                  ขนส่งนอก / รถร่วม
                </button>
              </div>
            </div>
          </div>

          {/* ─── ROW 2: SEARCHABLE VEHICLE, MAIN DRIVER & HELPERS ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 rounded-2xl bg-slate-50/90 border border-slate-200 p-3.5">
            {transportType === 'INTERNAL' ? (
              <div className="sm:col-span-6 space-y-1.5">
                <label className="font-bold text-slate-700 flex items-center justify-between gap-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <Truck size={13} className="text-orange-600" />
                    <span>เลือกรถบริษัทจากทะเบียนกลาง *</span>
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">ค้นหา/เพิ่มได้</span>
                </label>

                <div ref={vehicleBoxRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddVehicleForm(false);
                      toggleMenu('VEHICLE');
                    }}
                    className={`w-full h-10 px-3 bg-white border rounded-xl font-bold text-slate-800 flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                      openMenu === 'VEHICLE'
                        ? 'ring-2 ring-orange-500/20 border-orange-400'
                        : 'border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <span className="truncate">
                      {selectedVehicle ? (
                        <>
                          <span className="font-mono font-black text-slate-900">
                            {selectedVehicle.assetId}
                          </span>{' '}
                          <span className="text-slate-600 font-semibold">
                            · {selectedVehicle.name}
                            {selectedVehicle.vehicleType ? ` (${selectedVehicle.vehicleType})` : ''}
                          </span>
                        </>
                      ) : (
                        'เลือกรถบริษัท / ค้นหาทะเบียนหรือชื่อ...'
                      )}
                    </span>
                    <ChevronDown
                      size={15}
                      className={`text-slate-400 shrink-0 transition-transform ${
                        openMenu === 'VEHICLE' ? 'rotate-180 text-orange-600' : ''
                      }`}
                    />
                  </button>

                  {openMenu === 'VEHICLE' && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <DropdownSearchHeader
                        inputRef={vehicleSearchRef}
                        value={vehicleSearch}
                        onChange={setVehicleSearch}
                        placeholder="ค้นหาทะเบียน, ชื่อรถ, ชื่อจริง/ชื่อเล่นคนดูแล..."
                      />

                      {!showAddVehicleForm && (
                        <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                          {filteredVehicles.length === 0 ? (
                            <div className="py-5 px-3 text-center text-[11px] text-slate-400 font-medium">
                              ไม่พบรถที่ตรงกับ &ldquo;{vehicleSearch}&rdquo;
                            </div>
                          ) : (
                            filteredVehicles.map((v) => {
                              const selected = v.id === vehicleAssetId;
                              const booked = bookedPlatesOnSelectedDate.get(v.id);
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    setVehicleAssetId(v.id);
                                    setVehicleSearch('');
                                    setOpenMenu(null);
                                  }}
                                  className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                                    selected
                                      ? 'bg-orange-50 text-orange-950 font-bold'
                                      : 'hover:bg-slate-50 text-slate-800'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-xs font-extrabold text-slate-900">
                                        {v.assetId}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                                        {v.vehicleType || 'รถบริษัท'}
                                      </span>
                                      {booked && booked.length > 0 ? (
                                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[9px] font-black">
                                          มีคิว {booked.join(', ')}
                                        </span>
                                      ) : v.status === 'available' ? (
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-black">
                                          ว่าง
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black">
                                          {v.status === 'borrowed' ? 'ถูกเบิกใช้' : 'งดใช้งาน'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                      {v.name}
                                      {v.mainUser
                                        ? ` · ผู้ใช้: ${v.mainUser}${
                                            v.mainUserNickname && !v.mainUser.includes(v.mainUserNickname)
                                              ? ` (${v.mainUserNickname})`
                                              : ''
                                          }`
                                        : ''}
                                    </div>
                                  </div>
                                  {selected && <Check size={14} className="text-orange-600 shrink-0" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Quick Add Vehicle Footer */}
                      <div className="border-t border-slate-100 bg-slate-50 p-2">
                        {!showAddVehicleForm ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (vehicleSearch.trim() && !newVehiclePlate) {
                                setNewVehiclePlate(vehicleSearch.trim());
                              }
                              setShowAddVehicleForm(true);
                            }}
                            className="w-full h-8 px-3 rounded-xl bg-white hover:bg-orange-50 border border-dashed border-orange-300 text-orange-700 font-bold text-[11px] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Plus size={13} />
                            <span>
                              {vehicleSearch.trim()
                                ? `เพิ่มรถใหม่ "${vehicleSearch.trim()}" เข้าทะเบียนกลาง`
                                : 'เพิ่มรถบริษัทใหม่เข้าทะเบียนกลาง'}
                            </span>
                          </button>
                        ) : (
                          <div className="space-y-2 p-1">
                            <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-800">
                              <span>เพิ่มรถใหม่เข้าทะเบียนกลาง</span>
                              <button
                                type="button"
                                onClick={() => setShowAddVehicleForm(false)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <input
                                type="text"
                                value={newVehiclePlate}
                                onChange={(e) => setNewVehiclePlate(e.target.value)}
                                placeholder="ทะเบียนรถ * เช่น 4ฒญ-7230"
                                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                              />
                              <select
                                value={newVehicleType}
                                onChange={(e) => setNewVehicleType(e.target.value)}
                                className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                              >
                                {VEHICLE_TYPE_PRESETS.map((vt) => (
                                  <option key={vt} value={vt}>
                                    {vt}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={newVehicleName}
                                onChange={(e) => setNewVehicleName(e.target.value)}
                                placeholder="ชื่อรถ / รุ่น เช่น Isuzu D-Max"
                                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800"
                              />
                              <input
                                type="text"
                                value={newVehicleMainUser}
                                onChange={(e) => setNewVehicleMainUser(e.target.value)}
                                placeholder="ชื่อผู้ขับประจำ (จริง/เล่น)"
                                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800"
                              />
                            </div>
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={isCreatingVehicle}
                                onClick={() => setShowAddVehicleForm(false)}
                                className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600 cursor-pointer"
                              >
                                ยกเลิก
                              </button>
                              <button
                                type="button"
                                disabled={isCreatingVehicle}
                                onClick={() => void handleQuickAddVehicle()}
                                className="h-8 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {isCreatingVehicle && <Loader2 size={12} className="animate-spin" />}
                                <span>บันทึก &amp; เลือกใช้</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="sm:col-span-12 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7 space-y-1.5">
                    <label className="font-bold text-slate-700 flex items-center justify-between gap-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <Truck size={13} className="text-orange-600" />
                        <span>ชื่อบริษัทขนส่งนอก / รถร่วม *</span>
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        ไม่ต้องระบุคนขับบริษัท
                      </span>
                    </label>
                    <input
                      type="text"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="เช่น Flash Express, Kerry, J&T, รถร่วม 6 ล้อ *"
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {['Flash Express', 'Kerry Express', 'J&T', 'Nim Express', 'Lalamove', 'รถร่วม 6 ล้อ'].map(
                        (preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCourierName(preset)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer transition-colors ${
                              courierName === preset
                                ? 'bg-orange-600 text-white border-orange-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-orange-50 hover:text-orange-700'
                            }`}
                          >
                            {preset}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-5 space-y-1.5">
                    <label className="font-bold text-slate-700">ทะเบียนรถร่วม (ถ้าทราบ)</label>
                    <input
                      type="text"
                      value={externalPlate}
                      onChange={(e) => setExternalPlate(e.target.value)}
                      placeholder="ทะเบียนรถร่วม (ถ้ามี)"
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* พนักงานขับรถหลัก * & ผู้ช่วยติดรถ (เฉพาะรถบริษัท In-House) */}
            {transportType === 'INTERNAL' && (
              <>
                <div className="sm:col-span-6 space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <UserCheck size={13} className="text-orange-600" />
                      <span>พนักงานขับรถหลัก *</span>
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">ค้นหาชื่อเล่น/จริงได้</span>
                  </label>

              <div ref={driverBoxRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDriverForm(false);
                    toggleMenu('DRIVER');
                  }}
                  className={`w-full h-10 px-3 bg-white border rounded-xl font-bold text-slate-800 flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                    openMenu === 'DRIVER'
                      ? 'ring-2 ring-orange-500/20 border-orange-400'
                      : 'border-slate-200 hover:border-orange-300'
                  }`}
                >
                  <span className="truncate">
                    {selectedDriverMember
                      ? formatMemberLabel(selectedDriverMember)
                      : driverName || 'เลือกพนักงานขับรถหลัก...'}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`text-slate-400 shrink-0 transition-transform ${
                      openMenu === 'DRIVER' ? 'rotate-180 text-orange-600' : ''
                    }`}
                  />
                </button>

                {openMenu === 'DRIVER' && (
                  <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <DropdownSearchHeader
                      inputRef={driverSearchRef}
                      value={driverSearch}
                      onChange={setDriverSearch}
                      placeholder="พิมพ์ชื่อจริง, ชื่อเล่น, รหัสพนักงาน..."
                    />

                    {!showAddDriverForm && (
                      <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                        {filteredDrivers.length === 0 ? (
                          <div className="py-5 px-3 text-center text-[11px] text-slate-400 font-medium">
                            ไม่พบรายชื่อที่ตรงกับ &ldquo;{driverSearch}&rdquo;
                          </div>
                        ) : (
                          filteredDrivers.map((m) => {
                            const selected =
                              m.userId === driverUserId ||
                              (!driverUserId && m.fullName === driverName);
                            return (
                              <button
                                key={m.userId}
                                type="button"
                                onClick={() => handleSelectDriver(m)}
                                className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                                  selected
                                    ? 'bg-orange-50 text-orange-950 font-bold'
                                    : 'hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold truncate">
                                      {formatMemberLabel(m)}
                                    </span>
                                    {m.isCustom ? (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black">
                                        เพิ่มเติม
                                      </span>
                                    ) : m.isTransportTeam ? (
                                      <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[9px] font-black">
                                        ขนส่ง/สโตร์
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">
                                    {m.employeeId ? `${m.employeeId} · ` : ''}
                                    {m.position || m.role}
                                  </div>
                                </div>
                                {selected && <Check size={14} className="text-orange-600 shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}

                    <div className="border-t border-slate-100 bg-slate-50 p-2">
                      {!showAddDriverForm ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (driverSearch.trim() && !newDriverFullName) {
                              setNewDriverFullName(driverSearch.trim());
                            }
                            setShowAddDriverForm(true);
                          }}
                          className="w-full h-8 px-3 rounded-xl bg-white hover:bg-orange-50 border border-dashed border-orange-300 text-orange-700 font-bold text-[11px] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Plus size={13} />
                          <span>
                            {driverSearch.trim()
                              ? `เพิ่มชื่อคนขับ "${driverSearch.trim()}"`
                              : 'เพิ่มรายชื่อคนขับรถใหม่'}
                          </span>
                        </button>
                      ) : (
                        <div className="space-y-2 p-1">
                          <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-800">
                            <span>เพิ่มชื่อพนักงานขับรถ</span>
                            <button
                              type="button"
                              onClick={() => setShowAddDriverForm(false)}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              value={newDriverFullName}
                              onChange={(e) => setNewDriverFullName(e.target.value)}
                              placeholder="ชื่อ-นามสกุล *"
                              className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                            />
                            <input
                              type="text"
                              value={newDriverNickname}
                              onChange={(e) => setNewDriverNickname(e.target.value)}
                              placeholder="ชื่อเล่น (ถ้ามี)"
                              className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800"
                            />
                          </div>
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowAddDriverForm(false)}
                              className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600 cursor-pointer"
                            >
                              ยกเลิก
                            </button>
                            <button
                              type="button"
                              onClick={handleAddCustomDriver}
                              className="h-8 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold cursor-pointer"
                            >
                              เพิ่ม &amp; เลือกคนนี้
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ผู้ช่วยติดรถ / เด็กติดรถ (Searchable Multi-Select + Quick Add) */}
            <div className="sm:col-span-12 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Users size={13} className="text-indigo-600" />
                  <span>ผู้ช่วยติดรถ / เด็กติดรถ (สำหรับคำนวณเบี้ยเลี้ยงตอนปิดทริป)</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold">
                    ทีมรวม {1 + selectedHelperMembers.length} คน
                  </span>
                </label>
                {selectedHelperKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedHelperKeys([])}
                    className="text-[11px] font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    ล้างผู้ช่วย ({selectedHelperKeys.length})
                  </button>
                )}
              </div>

              <div ref={helperBoxRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddHelperForm(false);
                    toggleMenu('HELPER');
                  }}
                  className={`w-full min-h-10 px-3 py-2 bg-white border rounded-xl font-semibold text-slate-800 flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                    openMenu === 'HELPER'
                      ? 'ring-2 ring-indigo-500/20 border-indigo-400'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <span className="truncate text-xs">
                    {selectedHelperMembers.length === 0
                      ? 'เลือกผู้ช่วยติดรถ / เด็กติดรถ (พิมพ์ค้นหาชื่อจริงหรือชื่อเล่นได้)...'
                      : `เลือกแล้ว ${selectedHelperMembers.length} คน: ${selectedHelperMembers
                          .map((m) => m.nickname || m.fullName)
                          .join(', ')}`}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`text-slate-400 shrink-0 transition-transform ${
                      openMenu === 'HELPER' ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>

                {openMenu === 'HELPER' && (
                  <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <DropdownSearchHeader
                      inputRef={helperSearchRef}
                      value={helperSearch}
                      onChange={setHelperSearch}
                      placeholder="พิมพ์ชื่อจริง, ชื่อเล่น, รหัสพนักงาน..."
                    />

                    {!showAddHelperForm && (
                      <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                        {filteredHelpers.length === 0 ? (
                          <div className="py-5 px-3 text-center text-[11px] text-slate-400 font-medium">
                            {helperSearch.trim()
                              ? `ไม่พบรายชื่อที่ตรงกับ "${helperSearch}"`
                              : 'ไม่มีรายชื่อเพิ่มเติม'}
                          </div>
                        ) : (
                          filteredHelpers.map((m) => {
                            const selected = selectedHelperKeys.includes(m.userId);
                            return (
                              <button
                                key={m.userId}
                                type="button"
                                onClick={() => toggleHelperKey(m.userId)}
                                className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                                  selected
                                    ? 'bg-indigo-50 text-indigo-950 font-bold'
                                    : 'hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                      selected
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {selected && <Check size={11} strokeWidth={3} />}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-bold truncate">
                                        {formatMemberLabel(m)}
                                      </span>
                                      {m.isCustom ? (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black">
                                          เพิ่มเติม
                                        </span>
                                      ) : m.isTransportTeam ? (
                                        <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[9px] font-black">
                                          ขนส่ง/สโตร์
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">
                                      {m.employeeId ? `${m.employeeId} · ` : ''}
                                      {m.position || m.role}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}

                    <div className="border-t border-slate-100 bg-slate-50 p-2 space-y-2">
                      {!showAddHelperForm ? (
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (helperSearch.trim() && !newHelperFullName) {
                                setNewHelperFullName(helperSearch.trim());
                              }
                              setShowAddHelperForm(true);
                            }}
                            className="h-8 px-3 rounded-xl bg-white hover:bg-indigo-50 border border-dashed border-indigo-300 text-indigo-700 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Plus size={13} />
                            <span>
                              {helperSearch.trim()
                                ? `เพิ่มผู้ช่วย "${helperSearch.trim()}" เข้าทีม`
                                : 'เพิ่มผู้ช่วยใหม่เข้าทีม'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenMenu(null)}
                            className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] cursor-pointer"
                          >
                            เลือกเสร็จสิ้น ({selectedHelperKeys.length})
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 p-1">
                          <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-800">
                            <span>เพิ่มผู้ช่วยติดรถใหม่</span>
                            <button
                              type="button"
                              onClick={() => setShowAddHelperForm(false)}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              value={newHelperFullName}
                              onChange={(e) => setNewHelperFullName(e.target.value)}
                              placeholder="ชื่อ-นามสกุล *"
                              className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                            />
                            <input
                              type="text"
                              value={newHelperNickname}
                              onChange={(e) => setNewHelperNickname(e.target.value)}
                              placeholder="ชื่อเล่น (ถ้ามี)"
                              className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800"
                            />
                          </div>
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowAddHelperForm(false)}
                              className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600 cursor-pointer"
                            >
                              ยกเลิก
                            </button>
                            <button
                              type="button"
                              onClick={handleAddCustomHelper}
                              className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer"
                            >
                              เพิ่ม &amp; เลือกเข้าทีม
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedHelperMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {selectedHelperMembers.map((m) => (
                    <span
                      key={m.userId}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-indigo-600 text-white text-[11px] font-bold shadow-2xs"
                    >
                      <span>{formatMemberLabel(m)}</span>
                      <button
                        type="button"
                        onClick={() => toggleHelperKey(m.userId)}
                        className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center cursor-pointer"
                        aria-label={`นำ ${m.fullName} ออก`}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
                </div>
              </>
            )}
          </div>

          {/* ─── ROW 3: ROUTE ZONE, ORIGIN BRANCH (SEARCHABLE + ADD), START MILEAGE ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className={`${transportType === 'EXTERNAL' ? 'sm:col-span-7' : 'sm:col-span-5'} space-y-1`}>
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Route size={13} className="text-orange-600" /> โซน / เส้นทางวิ่ง
              </label>
              <input
                type="text"
                value={routeZone}
                onChange={(e) => setRouteZone(e.target.value)}
                placeholder="เช่น กทม. - สมุทรสาคร, สายอีสาน"
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <div className="flex flex-wrap gap-1 pt-0.5">
                {ROUTE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setRouteZone(p)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-700 text-[10px] font-bold cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* สาขาต้นทาง (Searchable Dropdown + Quick Add) */}
            <div className={`${transportType === 'EXTERNAL' ? 'sm:col-span-5' : 'sm:col-span-4'} space-y-1`}>
              <label className="font-bold text-slate-700 flex items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 size={13} className="text-orange-600" />
                  <span>สาขาต้นทาง</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400">ค้นหา/เพิ่มได้</span>
              </label>

              <div ref={branchBoxRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBranchForm(false);
                    toggleMenu('BRANCH');
                  }}
                  className={`w-full h-10 px-3 bg-slate-50 border rounded-xl font-bold text-slate-800 flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                    openMenu === 'BRANCH'
                      ? 'bg-white ring-2 ring-orange-500/20 border-orange-400'
                      : 'border-slate-200 hover:bg-white'
                  }`}
                >
                  <span className="truncate">
                    {selectedBranchOption
                      ? selectedBranchOption.code !== selectedBranchOption.name
                        ? `${selectedBranchOption.name} (${selectedBranchOption.code})`
                        : selectedBranchOption.name
                      : originBranch || 'เลือกสาขาต้นทาง...'}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`text-slate-400 shrink-0 transition-transform ${
                      openMenu === 'BRANCH' ? 'rotate-180 text-orange-600' : ''
                    }`}
                  />
                </button>

                {openMenu === 'BRANCH' && (
                  <div className="absolute left-0 top-[calc(100%+4px)] min-w-full sm:w-80 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <DropdownSearchHeader
                      inputRef={branchSearchRef}
                      value={branchSearch}
                      onChange={setBranchSearch}
                      placeholder="ค้นหาชื่อสาขา, ชื่อย่อ (เช่น สนง.ใหญ่, มหาชัย)..."
                    />

                    {!showAddBranchForm && (
                      <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
                        {filteredBranches.length === 0 ? (
                          <div className="py-5 px-3 text-center text-[11px] text-slate-400 font-medium">
                            ไม่พบสาขาที่ตรงกับ &ldquo;{branchSearch}&rdquo;
                          </div>
                        ) : (
                          filteredBranches.map((b) => {
                            const selected =
                              b.code.toLowerCase() === originBranch.toLowerCase() ||
                              b.name.toLowerCase() === originBranch.toLowerCase();
                            return (
                              <button
                                key={b.code}
                                type="button"
                                onClick={() => handleSelectBranch(b)}
                                className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                                  selected
                                    ? 'bg-orange-50 text-orange-950 font-bold'
                                    : 'hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-bold truncate">
                                    {b.name}
                                    {b.code !== b.name && (
                                      <span className="ml-1.5 font-mono text-[10px] text-slate-500">
                                        ({b.code})
                                      </span>
                                    )}
                                  </div>
                                  {b.aliases && b.aliases.length > 0 && (
                                    <div className="text-[10px] text-slate-400 truncate">
                                      {b.aliases.slice(0, 3).join(' · ')}
                                    </div>
                                  )}
                                </div>
                                {selected && <Check size={14} className="text-orange-600 shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}

                    <div className="border-t border-slate-100 bg-slate-50 p-2">
                      {!showAddBranchForm ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (branchSearch.trim() && !newBranchName) {
                              setNewBranchName(branchSearch.trim());
                            }
                            setShowAddBranchForm(true);
                          }}
                          className="w-full h-8 px-3 rounded-xl bg-white hover:bg-orange-50 border border-dashed border-orange-300 text-orange-700 font-bold text-[11px] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Plus size={13} />
                          <span>
                            {branchSearch.trim()
                              ? `เพิ่มสาขาต้นทาง "${branchSearch.trim()}"`
                              : 'เพิ่มสาขาต้นทางใหม่'}
                          </span>
                        </button>
                      ) : (
                        <div className="space-y-2 p-1">
                          <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-800">
                            <span>เพิ่มสาขาต้นทางใหม่</span>
                            <button
                              type="button"
                              onClick={() => setShowAddBranchForm(false)}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            <input
                              type="text"
                              value={newBranchName}
                              onChange={(e) => setNewBranchName(e.target.value)}
                              placeholder="ชื่อสาขา *"
                              className="col-span-2 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                            />
                            <input
                              type="text"
                              value={newBranchCode}
                              onChange={(e) => setNewBranchCode(e.target.value)}
                              placeholder="ชื่อย่อ/รหัส"
                              className="col-span-1 h-8 px-2 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800"
                            />
                          </div>
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowAddBranchForm(false)}
                              className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600 cursor-pointer"
                            >
                              ยกเลิก
                            </button>
                            <button
                              type="button"
                              onClick={handleAddCustomBranch}
                              className="h-8 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold cursor-pointer"
                            >
                              เพิ่ม &amp; เลือกใช้
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {transportType === 'INTERNAL' && (
              <div className="sm:col-span-3 space-y-1">
                <label className="font-bold text-slate-700">เลขไมล์เริ่มต้น (กม.)</label>
                <input
                  type="number"
                  min={0}
                  value={startMileage}
                  onChange={(e) => setStartMileage(e.target.value)}
                  placeholder="เช่น 45120"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            )}
          </div>

          {/* Ordered Multi-Stops */}
          <div className="space-y-2 rounded-2xl border border-slate-200 p-3.5 bg-white">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <MapPin size={14} className="text-red-600" />
                <span>ลำดับจุดส่งในทริปนี้ ({stops.length} จุด)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowManualAdd((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
              >
                <Plus size={12} /> เพิ่มจุดส่งเพิ่มเติม
              </button>
            </div>

            {showManualAdd && (
              <div className="rounded-xl bg-orange-50/70 border border-orange-200 p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={manualCustomer}
                    onChange={(e) => setManualCustomer(e.target.value)}
                    placeholder="ชื่อลูกค้า / สาขา / สถานที่ส่ง *"
                    className="h-9 px-3 bg-white border border-orange-200 rounded-lg font-semibold text-slate-800"
                  />
                  <input
                    type="text"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="เบอร์โทรติดต่อผู้รับ"
                    className="h-9 px-3 bg-white border border-orange-200 rounded-lg font-medium text-slate-800"
                  />
                  <input
                    type="text"
                    value={manualDest}
                    onChange={(e) => setManualDest(e.target.value)}
                    placeholder="ที่อยู่ / ไซต์งาน"
                    className="h-9 px-3 bg-white border border-orange-200 rounded-lg font-medium text-slate-800 sm:col-span-2"
                  />
                  <input
                    type="text"
                    value={manualItems}
                    onChange={(e) => setManualItems(e.target.value)}
                    placeholder="รายละเอียดสินค้า/ของที่นำไปส่ง"
                    className="h-9 px-3 bg-white border border-orange-200 rounded-lg font-medium text-slate-800 sm:col-span-2"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualAdd(false)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-600 cursor-pointer"
                  >
                    ปิด
                  </button>
                  <button
                    type="button"
                    onClick={addManualStop}
                    className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer"
                  >
                    เพิ่มเข้าจุดส่ง
                  </button>
                </div>
              </div>
            )}

            {stops.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                ยังไม่มีจุดส่ง กดปุ่ม &ldquo;+ เพิ่มจุดส่งเพิ่มเติม&rdquo; หรือเลือกจากหน้าคิวงาน
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {stops.map((st, idx) => {
                  const src = LOGISTICS_SOURCE_META[st.sourceType] || LOGISTICS_SOURCE_META.MANUAL;
                  return (
                    <div
                      key={`${st.sourceType}-${st.jobId || st.requisitionId || st.repairDeliveryId || idx}-${idx}`}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 flex items-start justify-between gap-2"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${src.badge}`}>
                              {src.short}
                            </span>
                            {st.referenceNumber && (
                              <span className="font-mono font-bold text-slate-700">
                                {st.referenceNumber}
                              </span>
                            )}
                            <span className="font-extrabold text-slate-900 truncate">
                              {st.customerName}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={st.destination || ''}
                            onChange={(e) =>
                              setStops((prev) =>
                                prev.map((item, sIdx) =>
                                  sIdx === idx ? { ...item, destination: e.target.value } : item
                                )
                              )
                            }
                            placeholder="ระบุ/แก้ไขสถานที่จัดส่ง..."
                            className="w-full h-7 px-2 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700"
                          />
                          {st.itemSummary && (
                            <p className="text-[11px] text-slate-500 truncate">
                              รายการ: {st.itemSummary}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveStop(idx, -1)}
                          title="เลื่อนขึ้น"
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center disabled:opacity-35 cursor-pointer"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === stops.length - 1}
                          onClick={() => moveStop(idx, 1)}
                          title="เลื่อนลง"
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center disabled:opacity-35 cursor-pointer"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setStops((prev) => prev.filter((_, sIdx) => sIdx !== idx))
                          }
                          title="นำจุดส่งนี้ออก"
                          className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-600 text-rose-600 hover:text-white flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">หมายเหตุการวิ่งรถ / การขนย้าย</label>
            <input
              type="text"
              value={planNote}
              onChange={(e) => setPlanNote(e.target.value)}
              placeholder="เช่น ระวังตู้ควบคุมหนัก ต้องใช้รถเฮี้ยบยก / เข้าหน้างานก่อน 16.00 น."
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#ff2301] hover:bg-red-600 text-white font-extrabold shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
              <span>บันทึกจัดคิวรถ ({stops.length} จุดส่ง)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TripBuilderModal(props: TripBuilderModalProps) {
  const ready = useIsPortalClientReady();
  if (!ready || !props.isOpen) return null;

  return createPortal(
    <TripBuilderModalInner
      key={`tb-${props.initialQueueItems.map((q) => q.queueKey).join('|')}`}
      vehicles={props.vehicles}
      crewMembers={props.crewMembers}
      branches={props.branches}
      existingTrips={props.existingTrips}
      initialQueueItems={props.initialQueueItems}
      currentUserId={props.currentUserId}
      currentUserEmployeeId={props.currentUserEmployeeId}
      currentUserName={props.currentUserName}
      onVehicleAdded={props.onVehicleAdded}
      onClose={props.onClose}
      onCreated={props.onCreated}
    />,
    document.body
  );
}
