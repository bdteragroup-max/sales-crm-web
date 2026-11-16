'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  ClipboardList,
  Database,
  Loader2,
  MapPin,
  PenTool,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  CLEANING_JOB_TYPES,
  CLEANING_PROJECT_TYPES,
  STANDARD_CLEANING_WORK_PRESET,
  formatCleaningDateSlashBe,
  type CleaningWorkItem,
  type SelectableCustomerOption,
  type SelectableProjectOption,
} from '@/app/lib/solarCleaningConfig';
import {
  createSolarCleaningCustomer,
  searchSolarCleaningCustomers,
} from '@/app/actions/solarCleaning';
import { SURVEY_COMPANY_OPTIONS } from '@/app/lib/surveyMetadata';
import ThaiBeDateInput from '@/app/components/ThaiBeDateInput';
import SurveySignatureBox from '@/app/sales/surveys/components/SurveySignatureBox';

export type { SelectableCustomerOption, SelectableProjectOption };

export interface PrecheckStepFormValues {
  companyCode: string;
  projectId: string | null;
  projectName: string;
  location: string;
  customerName: string;
  customerPhone: string;
  inspectorNames: string;
  systemSizeKwp: string;
  inspectionRound: string;
  inspectionDate: string;

  projectTypes: string[];
  projectTypeOther: string;
  jobTypes: string[];
  jobTypeOther: string;
  workItems: CleaningWorkItem[];
  additionalDetail: string;

  checkInCustomerSignUrl: string | null;
  checkInCustomerName: string;
  checkInAt: string;
  checkOutCustomerSignUrl: string | null;
  checkOutCustomerName: string;
  checkOutAt: string;
  inspectorSignUrl: string | null;
  inspectorSignerName: string;
}

interface SolarCleaningPrecheckStepProps {
  value: PrecheckStepFormValues;
  onChange: (updater: (prev: PrecheckStepFormValues) => PrecheckStepFormValues) => void;
  projects: SelectableProjectOption[];
  customers?: SelectableCustomerOption[];
  onCustomerAdded?: (customer: SelectableCustomerOption) => void;
  currentUserFullName: string;
  readOnly?: boolean;
}

function matchesSearchTokens(haystack: string, query: string): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = haystack.toLowerCase();
  return tokens.every((tok) => hay.includes(tok));
}

function useDismissOnOutsideOrEscape(
  containerRef: React.RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  onDismiss: () => void
) {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        onDismissRef.current();
      }
    };
    const handleKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onDismissRef.current();
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [containerRef, isOpen]);
}

function toBkkNowDateTimeLocal(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  const hh = g('hour') === '24' ? '00' : g('hour');
  return `${g('year')}-${g('month')}-${g('day')}T${hh}:${g('minute')}`;
}

function SearchableProjectCombobox({
  projects,
  selectedProjectId,
  onSelect,
}: {
  projects: SelectableProjectOption[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return projects;
    return projects.filter((p) =>
      matchesSearchTokens(
        `${p.projectNumber} ${p.name} ${p.clientName || ''} ${p.siteAddress || ''}`,
        query
      )
    );
  }, [projects, query]);

  useDismissOnOutsideOrEscape(containerRef, isOpen, () => setIsOpen(false));

  const handleToggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  };

  const handlePick = (id: string) => {
    onSelect(id);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleToggleOpen}
          className="flex-1 min-h-[42px] px-3 py-2 bg-white border border-blue-200 hover:border-blue-400 rounded-xl text-left flex items-center justify-between gap-2 transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
        >
          <span className="min-w-0 flex-1 truncate text-xs sm:text-sm font-medium text-gray-900">
            {selectedProject ? (
              <span>
                <span className="font-mono font-bold text-blue-700 mr-1.5">
                  {selectedProject.projectNumber}
                </span>
                <span>{selectedProject.name}</span>
                {selectedProject.clientName && (
                  <span className="text-gray-500"> ({selectedProject.clientName})</span>
                )}
              </span>
            ) : (
              <span className="text-gray-500">
                -- พิมพ์ค้นหาหรือเลือกโครงการอ้างอิง ({projects.length} โครงการ) --
              </span>
            )}
          </span>
          <ChevronDown
            size={16}
            className={`text-blue-600 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {selectedProject && (
          <button
            type="button"
            onClick={() => handlePick('')}
            className="h-[42px] px-3 rounded-xl bg-white border border-blue-200 hover:bg-red-50 hover:border-red-200 text-gray-500 hover:text-red-600 text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer transition"
            title="ล้างโครงการที่เลือก"
          >
            <X size={14} />
            <span className="hidden sm:inline">ล้าง</span>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-40 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-blue-200 shadow-xl overflow-hidden">
          <div className="p-2.5 bg-blue-50/70 border-b border-blue-100">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredProjects.length > 0) {
                    e.preventDefault();
                    handlePick(filteredProjects[0].id);
                  }
                }}
                placeholder="พิมพ์รหัส PJ, ชื่อโครงการ, หรือชื่อลูกค้า..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-blue-200 rounded-xl text-base sm:text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  title="ล้างคำค้นหา"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-blue-700/80 px-1">
              <span>พบ {filteredProjects.length} โครงการ</span>
              {filteredProjects.length > 0 && (
                <span className="hidden sm:inline">กด Enter เพื่อเลือกรายการแรก</span>
              )}
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {selectedProjectId && (
              <button
                type="button"
                onClick={() => handlePick('')}
                className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-gray-500 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
              >
                <X size={13} />
                <span>ไม่ผูกกับโครงการ (กรอกข้อมูลเอง)</span>
              </button>
            )}

            {filteredProjects.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                ไม่พบโครงการที่ตรงกับ &quot;{query}&quot;
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isSelected = p.id === selectedProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePick(p.id)}
                    className={`w-full px-3.5 py-2.5 text-left transition flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected ? 'bg-blue-50/90' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-gray-900 text-white font-mono text-[11px] font-bold shrink-0">
                          {p.projectNumber}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-gray-900 break-words">
                          {p.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        ลูกค้า: {p.clientName || 'ไม่ระบุลูกค้า'}
                        {p.siteAddress ? ` • ${p.siteAddress}` : ''}
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={16} className="text-blue-600 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchableCustomerCombobox({
  customers,
  customerName,
  currentPhone,
  currentLocation,
  readOnly,
  onSelectCustomer,
  onUseCustomName,
  onClear,
  onCustomerAdded,
}: {
  customers: SelectableCustomerOption[];
  customerName: string;
  currentPhone: string;
  currentLocation: string;
  readOnly?: boolean;
  onSelectCustomer: (customer: SelectableCustomerOption) => void;
  onUseCustomName: (name: string) => void;
  onClear: () => void;
  onCustomerAdded: (customer: SelectableCustomerOption) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<SelectableCustomerOption[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef('');

  // Quick-add customer modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'นิติบุคคล' | 'บุคคลธรรมดา'>('นิติบุคคล');
  const [newContactName, setNewContactName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newTaxId, setNewTaxId] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useDismissOnOutsideOrEscape(containerRef, isOpen, () => setIsOpen(false));

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const allKnownCustomers = useMemo(() => {
    const byId = new Map<string, SelectableCustomerOption>();
    for (const c of customers) byId.set(c.id, c);
    for (const c of remoteResults) {
      if (!byId.has(c.id)) byId.set(c.id, c);
    }
    return Array.from(byId.values());
  }, [customers, remoteResults]);

  const matchedCustomer = useMemo(() => {
    const clean = customerName.trim().toLowerCase();
    if (!clean) return null;
    return (
      allKnownCustomers.find((c) => c.companyName.trim().toLowerCase() === clean) || null
    );
  }, [allKnownCustomers, customerName]);

  const filteredCustomers = useMemo(() => {
    if (!query.trim()) return allKnownCustomers.slice(0, 80);
    return allKnownCustomers.filter((c) =>
      matchesSearchTokens(
        `${c.companyName} ${c.contactName} ${c.phone} ${c.fullAddress} ${c.taxId || ''}`,
        query
      )
    );
  }, [allKnownCustomers, query]);

  const hasExactQueryMatch = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return false;
    return allKnownCustomers.some((c) => c.companyName.trim().toLowerCase() === clean);
  }, [allKnownCustomers, query]);

  const handleToggleOpen = () => {
    if (readOnly) return;
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  };

  const handleQueryChange = (nextVal: string) => {
    setQuery(nextVal);
    latestQueryRef.current = nextVal;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const trimmed = nextVal.trim();
    if (!trimmed) {
      setRemoteResults([]);
      setIsSearchingRemote(false);
      return;
    }

    setIsSearchingRemote(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await searchSolarCleaningCustomers(trimmed);
        if (latestQueryRef.current.trim() === trimmed && res.success) {
          setRemoteResults(res.data);
        }
      } finally {
        if (latestQueryRef.current.trim() === trimmed) {
          setIsSearchingRemote(false);
        }
      }
    }, 240);
  };

  const handlePickCustomer = (customer: SelectableCustomerOption) => {
    onSelectCustomer(customer);
    setIsOpen(false);
    setQuery('');
  };

  const openAddModal = (prefillName?: string) => {
    setNewName((prefillName ?? (query.trim() || customerName.trim())).trim());
    setNewType('นิติบุคคล');
    setNewContactName('');
    setNewPhone(currentPhone.trim());
    setNewAddress(currentLocation.trim());
    setNewProvince('');
    setNewTaxId('');
    setAddError(null);
    setIsOpen(false);
    setIsAddOpen(true);
  };

  const handleSaveNewCustomer = async () => {
    if (!newName.trim()) {
      setAddError('กรุณาระบุชื่อลูกค้าหรือชื่อบริษัท');
      return;
    }
    setIsSavingNew(true);
    setAddError(null);
    try {
      const res = await createSolarCleaningCustomer({
        companyName: newName.trim(),
        customerType: newType,
        contactName: newContactName.trim(),
        phone: newPhone.trim(),
        address: newAddress.trim(),
        province: newProvince.trim(),
        taxId: newTaxId.trim(),
      });
      if (!res.success || !res.data) {
        setAddError(res.error || 'ไม่สามารถเพิ่มข้อมูลลูกค้าได้');
        return;
      }
      onCustomerAdded(res.data);
      onSelectCustomer(res.data);
      setQuery('');
      setIsAddOpen(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSavingNew(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-1.5">
      <div className="min-h-[22px] flex flex-wrap items-center justify-between gap-1.5">
        <label className="block text-xs font-bold text-gray-700">
          ชื่อลูกค้า / บริษัทลูกค้า <span className="text-red-500">*</span>
        </label>
        {customerName.trim() ? (
          matchedCustomer ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
              <Database size={10} />
              <span>พบในฐานข้อมูลลูกค้า CRM</span>
            </span>
          ) : !readOnly ? (
            <button
              type="button"
              onClick={() => openAddModal(customerName)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-800 transition cursor-pointer"
              title="บันทึกชื่อลูกค้านี้เข้าฐานข้อมูลลูกค้า CRM"
            >
              <UserPlus size={10} />
              <span>เพิ่มเข้าฐานข้อมูลลูกค้า CRM</span>
            </button>
          ) : null
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400">
            <Database size={10} />
            <span>เชื่อมฐานข้อมูลลูกค้า CRM</span>
          </span>
        )}
      </div>

      <div className="relative">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={readOnly}
            onClick={handleToggleOpen}
            className={`flex-1 min-h-[42px] px-3.5 py-2 bg-white border rounded-xl text-left flex items-center justify-between gap-2 transition focus:outline-none ${
              readOnly
                ? 'bg-gray-100 border-gray-200 text-gray-700 cursor-not-allowed'
                : isOpen
                ? 'border-[#ff2301] ring-2 ring-[#ff2301]/20 cursor-pointer'
                : 'border-gray-300 hover:border-gray-400 cursor-pointer'
            }`}
          >
            <span className="min-w-0 flex-1 truncate text-base sm:text-sm font-medium text-gray-900">
              {customerName ? (
                customerName
              ) : (
                <span className="text-gray-400">
                  เลือกหรือค้นหาลูกค้าจากฐานข้อมูล / เพิ่มใหม่...
                </span>
              )}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-400 shrink-0 transition-transform ${
                isOpen ? 'rotate-180 text-[#ff2301]' : ''
              }`}
            />
          </button>

          {customerName && !readOnly && (
            <button
              type="button"
              onClick={onClear}
              className="h-[42px] px-2.5 rounded-xl bg-white border border-gray-300 hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-600 transition shrink-0 cursor-pointer"
              title="ล้างชื่อลูกค้า"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {isOpen && !readOnly && (
          <div className="absolute z-40 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="p-2.5 bg-gray-50 border-b border-gray-200 space-y-1.5">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredCustomers.length > 0) {
                        handlePickCustomer(filteredCustomers[0]);
                      } else if (query.trim()) {
                        openAddModal(query);
                      }
                    }
                  }}
                  placeholder="พิมพ์ชื่อลูกค้า, บริษัท, เบอร์โทร, หรือจังหวัด..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      handleQueryChange('');
                      inputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                    title="ล้างคำค้นหา"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                <span className="inline-flex items-center gap-1.5">
                  {isSearchingRemote ? (
                    <>
                      <Loader2 size={11} className="animate-spin text-[#ff2301]" />
                      <span>กำลังค้นหาในฐานข้อมูล...</span>
                    </>
                  ) : (
                    <span>พบ {filteredCustomers.length} รายการในฐานข้อมูล CRM</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => openAddModal()}
                  className="inline-flex items-center gap-1 font-bold text-[#ff2301] hover:underline cursor-pointer"
                >
                  <UserPlus size={12} />
                  <span>เพิ่มลูกค้าใหม่</span>
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {query.trim() && !hasExactQueryMatch && (
                <div className="p-2 bg-red-50/40 space-y-1">
                  <button
                    type="button"
                    onClick={() => openAddModal(query)}
                    className="w-full px-3 py-2 rounded-xl bg-[#ff2301] hover:bg-red-700 text-white text-xs font-bold flex items-center justify-between gap-2 transition cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                      <UserPlus size={14} className="shrink-0" />
                      <span className="truncate">
                        เพิ่ม &ldquo;{query.trim()}&rdquo; เข้าฐานข้อมูลลูกค้า CRM
                      </span>
                    </span>
                    <span className="text-[10px] opacity-90 shrink-0">บันทึกลง DB</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUseCustomName(query.trim());
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[11px] font-bold text-left cursor-pointer transition"
                  >
                    หรือใช้ชื่อ &ldquo;{query.trim()}&rdquo; เฉพาะเอกสารนี้ (ยังไม่เพิ่มเข้า DB)
                  </button>
                </div>
              )}

              {filteredCustomers.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <div className="text-xs text-gray-400">
                    ไม่พบรายชื่อลูกค้าในฐานข้อมูล{query.trim() ? ` ที่ตรงกับ "${query.trim()}"` : ''}
                  </div>
                  <button
                    type="button"
                    onClick={() => openAddModal(query)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-[#ff2301] text-xs font-bold cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>เพิ่มข้อมูลลูกค้าใหม่</span>
                  </button>
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const isSelected =
                    c.companyName.trim().toLowerCase() === customerName.trim().toLowerCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handlePickCustomer(c)}
                      className={`w-full px-3.5 py-2.5 text-left transition flex items-start justify-between gap-2 cursor-pointer ${
                        isSelected ? 'bg-red-50/70' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-gray-900 break-words">
                            {c.companyName}
                          </span>
                          {c.customerType && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold shrink-0">
                              {c.customerType}
                            </span>
                          )}
                        </div>
                        {(c.phone || c.fullAddress || c.contactName) && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                            {c.phone && (
                              <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                                <Phone size={10} className="text-[#ff2301]" />
                                {c.phone}
                              </span>
                            )}
                            {c.contactName && c.contactName !== c.companyName && (
                              <span>ผู้ติดต่อ: {c.contactName}</span>
                            )}
                            {c.fullAddress && (
                              <span className="inline-flex items-center gap-1 truncate max-w-full">
                                <MapPin size={10} className="shrink-0" />
                                <span className="truncate">{c.fullAddress}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check size={16} className="text-[#ff2301] shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick-Add Customer Modal */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4"
          onClick={() => {
            if (!isSavingNew) setIsAddOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#ff2301] flex items-center justify-center shrink-0">
                  <UserPlus size={17} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-gray-900">
                    เพิ่มลูกค้าใหม่เข้าฐานข้อมูล CRM
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    ข้อมูลจะถูกบันทึกในทะเบียนลูกค้า (Client 360) และนำมาใช้ในฟอร์มทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSavingNew}
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/70 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {addError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                  {addError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  ชื่อลูกค้า / บริษัทลูกค้า <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น บริษัท โรงสีกิตติธัญญพัฒนา จำกัด"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">ประเภทลูกค้า</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['นิติบุคคล', 'บุคคลธรรมดา'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewType(t)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        newType === t
                          ? 'border-[#ff2301] bg-red-50 text-[#ff2301]'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">ชื่อผู้ติดต่อหลัก</label>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="เช่น คุณสมชาย"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">เบอร์โทรติดต่อ</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="08x-xxx-xxxx"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">จังหวัด</label>
                  <input
                    type="text"
                    value={newProvince}
                    onChange={(e) => setNewProvince(e.target.value)}
                    placeholder="เช่น กรุงเทพมหานคร"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    เลขผู้เสียภาษี (ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    value={newTaxId}
                    onChange={(e) => setNewTaxId(e.target.value)}
                    placeholder="13 หลัก"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">ที่อยู่ / สถานที่</label>
                <textarea
                  rows={2}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="เลขที่, ถนน, แขวง/ตำบล, เขต/อำเภอ"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
                />
              </div>
            </div>

            <div className="px-4 sm:px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isSavingNew}
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSavingNew}
                onClick={handleSaveNewCustomer}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff2301] hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingNew ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UserPlus size={14} />
                )}
                <span>{isSavingNew ? 'กำลังบันทึก...' : 'บันทึกเข้าฐานข้อมูล & เลือกใช้'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SolarCleaningPrecheckStep({
  value,
  onChange,
  projects,
  customers = [],
  onCustomerAdded,
  currentUserFullName,
  readOnly = false,
}: SolarCleaningPrecheckStepProps) {
  const handleSelectProject = (projectId: string) => {
    const found = projects.find((p) => p.id === projectId);
    if (!found) {
      onChange((prev) => ({ ...prev, projectId: null }));
      return;
    }
    const matchedCust = found.clientName
      ? customers.find(
          (c) => c.companyName.trim().toLowerCase() === found.clientName!.trim().toLowerCase()
        )
      : undefined;
    onChange((prev) => ({
      ...prev,
      projectId: found.id,
      projectName: found.name || prev.projectName,
      customerName: matchedCust?.companyName || found.clientName || prev.customerName,
      customerPhone: prev.customerPhone || matchedCust?.phone || '',
      location: found.siteAddress || prev.location || matchedCust?.fullAddress || '',
      inspectorNames:
        found.siteTeamMembers || found.siteSupervisor || prev.inspectorNames,
      companyCode: found.job?.companyCode || prev.companyCode,
    }));
  };

  const handleSelectCustomer = (cust: SelectableCustomerOption) => {
    onChange((prev) => ({
      ...prev,
      customerName: cust.companyName,
      customerPhone: cust.phone || prev.customerPhone,
      location: !prev.projectId
        ? cust.fullAddress || prev.location
        : prev.location.trim()
        ? prev.location
        : cust.fullAddress || prev.location,
    }));
  };

  const toggleArrayValue = (field: 'projectTypes' | 'jobTypes', option: string) => {
    if (readOnly) return;
    onChange((prev) => {
      const current = prev[field];
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option];
      return { ...prev, [field]: next };
    });
  };

  const handleWorkItemChange = (index: number, key: 'detail' | 'remark', val: string) => {
    onChange((prev) => {
      const next = [...prev.workItems];
      next[index] = { ...next[index], [key]: val };
      return { ...prev, workItems: next };
    });
  };

  const addWorkItem = () => {
    onChange((prev) => ({
      ...prev,
      workItems: [
        ...prev.workItems,
        { no: prev.workItems.length + 1, detail: '', remark: '' },
      ],
    }));
  };

  const removeWorkItem = (index: number) => {
    onChange((prev) => {
      const filtered = prev.workItems.filter((_, i) => i !== index);
      return {
        ...prev,
        workItems: filtered.map((row, idx) => ({ ...row, no: idx + 1 })),
      };
    });
  };

  const applyStandardPreset = () => {
    onChange((prev) => ({
      ...prev,
      jobTypes: prev.jobTypes.includes('ล้างแผง และตรวจเช็คระบบ')
        ? prev.jobTypes
        : ['ล้างแผง และตรวจเช็คระบบ'],
      workItems: STANDARD_CLEANING_WORK_PRESET.map((item) => ({ ...item })),
    }));
  };

  return (
    <div className="space-y-5">
      {/* ── Section A: Company & Reference Info ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50 border-b border-gray-200 rounded-t-2xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 size={17} className="text-[#ff2301] shrink-0" />
            <h3 className="font-black text-sm text-gray-900">
              1. ข้อมูลบริษัท โครงการ และลูกค้า
            </h3>
          </div>
          <span className="text-[11px] font-bold text-gray-500">ใบตรวจเช็คระบบ</span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Company Switcher */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              เลือกบริษัทผู้ออกเอกสาร
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SURVEY_COMPANY_OPTIONS.map((co) => {
                const active = value.companyCode === co.code;
                return (
                  <button
                    key={co.code}
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange((prev) => ({ ...prev, companyCode: co.code }))}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                      active
                        ? 'border-[#ff2301] bg-red-50/60 ring-2 ring-[#ff2301]/15'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-black text-xs text-gray-900 truncate">{co.shortName}</div>
                      <div className="text-[11px] text-gray-500 truncate">{co.enName}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border shrink-0 ${co.badgeClass}`}
                    >
                      {co.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Searchable Link to Existing Project */}
          {projects.length > 0 && !readOnly && (
            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/80">
              <label className="block text-xs font-bold text-blue-900 mb-1.5">
                ดึงข้อมูลจากโครงการที่มีในระบบ (พิมพ์ค้นหาได้ • ไม่บังคับ)
              </label>
              <SearchableProjectCombobox
                projects={projects}
                selectedProjectId={value.projectId}
                onSelect={handleSelectProject}
              />
            </div>
          )}

          {/* Core Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="min-h-[22px] flex items-center gap-1 text-xs font-bold text-gray-700">
                <span>ชื่อโครงการ</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={readOnly}
                value={value.projectName}
                onChange={(e) => onChange((prev) => ({ ...prev, projectName: e.target.value }))}
                placeholder="เช่น SOLAR ROOFTOP ล้างแผงบำรุงรักษา"
                className="w-full min-h-[42px] px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
              />
            </div>

            <SearchableCustomerCombobox
              customers={customers}
              customerName={value.customerName}
              currentPhone={value.customerPhone}
              currentLocation={value.location}
              readOnly={readOnly}
              onSelectCustomer={handleSelectCustomer}
              onUseCustomName={(customName) =>
                onChange((prev) => ({ ...prev, customerName: customName }))
              }
              onClear={() => onChange((prev) => ({ ...prev, customerName: '' }))}
              onCustomerAdded={(added) => onCustomerAdded?.(added)}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">เบอร์โทรติดต่อ</label>
              <input
                type="text"
                disabled={readOnly}
                value={value.customerPhone}
                onChange={(e) => onChange((prev) => ({ ...prev, customerPhone: e.target.value }))}
                placeholder="08x-xxx-xxxx"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                วันที่เข้าตรวจเช็ค (วัน/เดือน/ปี พ.ศ.)
              </label>
              <ThaiBeDateInput
                disabled={readOnly}
                value={value.inspectionDate}
                onChange={(iso) => onChange((prev) => ({ ...prev, inspectionDate: iso }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                ขนาดกำลังการผลิตรวม (kWp)
              </label>
              <input
                type="text"
                disabled={readOnly}
                value={value.systemSizeKwp}
                onChange={(e) => onChange((prev) => ({ ...prev, systemSizeKwp: e.target.value }))}
                placeholder="เช่น 158.40 kWp."
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                รอบการตรวจเช็ค (สำหรับหน้าปก Report)
              </label>
              <input
                type="text"
                disabled={readOnly}
                value={value.inspectionRound}
                onChange={(e) => onChange((prev) => ({ ...prev, inspectionRound: e.target.value }))}
                placeholder="เช่น ครั้งที่ 2 ประจำปี 2569"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-gray-700">สถานที่เข้าดำเนินการ</label>
              <textarea
                rows={2}
                disabled={readOnly}
                value={value.location}
                onChange={(e) => onChange((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="ที่อยู่หน้างาน / โรงงาน / จังหวัด"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-bold text-gray-700">
                  รายชื่อผู้เข้าตรวจเช็ค (Inspector / ทีมช่างหน้างาน)
                </label>
                {!readOnly && currentUserFullName && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({
                        ...prev,
                        inspectorNames: prev.inspectorNames
                          ? `${prev.inspectorNames}, ${currentUserFullName}`
                          : currentUserFullName,
                      }))
                    }
                    className="text-xs font-bold text-[#ff2301] hover:text-red-700 cursor-pointer"
                  >
                    + ใส่ชื่อฉัน
                  </button>
                )}
              </div>
              <input
                type="text"
                disabled={readOnly}
                value={value.inspectorNames}
                onChange={(e) => onChange((prev) => ({ ...prev, inspectorNames: e.target.value }))}
                placeholder="ระบุรายชื่อช่าง/วิศวกรที่เข้าหน้างาน"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section B: Project Type & Job Type Checkboxes ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* ลักษณะโครงการ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col h-full">
          <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <CheckSquare size={16} className="text-[#ff2301]" />
            <h3 className="font-black text-sm text-gray-900">2.1 ลักษณะโครงการ</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2.5 flex-1">
            {CLEANING_PROJECT_TYPES.map((option) => {
              const checked = value.projectTypes.includes(option);
              return (
                <label
                  key={option}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs sm:text-sm font-bold cursor-pointer transition ${
                    checked
                      ? 'bg-red-50/70 border-red-300 text-gray-900'
                      : 'bg-gray-50/60 border-gray-200 text-gray-700 hover:bg-gray-100/70'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={checked}
                    onChange={() => toggleArrayValue('projectTypes', option)}
                    className="w-4 h-4 rounded border-gray-300 text-[#ff2301] focus:ring-[#ff2301] shrink-0"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
            {value.projectTypes.includes('อื่นๆ') && (
              <div className="col-span-2 pt-1">
                <input
                  type="text"
                  disabled={readOnly}
                  value={value.projectTypeOther}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, projectTypeOther: e.target.value }))
                  }
                  placeholder="ระบุลักษณะโครงการอื่นๆ..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
                />
              </div>
            )}
          </div>
        </div>

        {/* ลักษณะงาน */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col h-full">
          <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <CheckSquare size={16} className="text-emerald-600" />
            <h3 className="font-black text-sm text-gray-900">2.2 ลักษณะงาน</h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
            {CLEANING_JOB_TYPES.map((option) => {
              const checked = value.jobTypes.includes(option);
              return (
                <label
                  key={option}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs sm:text-sm font-bold cursor-pointer transition ${
                    checked
                      ? 'bg-emerald-50/70 border-emerald-300 text-gray-900'
                      : 'bg-gray-50/60 border-gray-200 text-gray-700 hover:bg-gray-100/70'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={checked}
                    onChange={() => toggleArrayValue('jobTypes', option)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600 shrink-0"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
            {value.jobTypes.includes('อื่นๆ') && (
              <div className="sm:col-span-2 pt-1">
                <input
                  type="text"
                  disabled={readOnly}
                  value={value.jobTypeOther}
                  onChange={(e) => onChange((prev) => ({ ...prev, jobTypeOther: e.target.value }))}
                  placeholder="ระบุลักษณะงานอื่นๆ..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-emerald-600"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Section C: Work Items & Additional Notes ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList size={17} className="text-[#ff2301] shrink-0" />
            <h3 className="font-black text-sm text-gray-900">
              3. รายละเอียดของงาน (Work Details)
            </h3>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyStandardPreset}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-[#ff2301] border border-red-200 text-xs font-bold cursor-pointer transition"
              >
                <Sparkles size={13} />
                <span>เติมรายการมาตรฐาน 5 ข้อ</span>
              </button>
              <button
                type="button"
                onClick={addWorkItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition"
              >
                <Plus size={13} />
                <span>เพิ่มรายการ</span>
              </button>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          {value.workItems.map((item, idx) => (
            <div
              key={`work-row-${idx}`}
              className="p-3 rounded-xl bg-gray-50/70 border border-gray-200 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center"
            >
              <div className="flex items-center justify-between md:justify-center gap-2 shrink-0">
                <span className="w-7 h-7 rounded-lg bg-gray-900 text-white text-xs font-mono font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                {!readOnly && value.workItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWorkItem(idx)}
                    className="md:hidden p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                    title="ลบแถว"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <input
                type="text"
                disabled={readOnly}
                value={item.detail}
                onChange={(e) => handleWorkItemChange(idx, 'detail', e.target.value)}
                placeholder={`รายละเอียดข้อที่ ${idx + 1}`}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
              />

              <input
                type="text"
                disabled={readOnly}
                value={item.remark}
                onChange={(e) => handleWorkItemChange(idx, 'remark', e.target.value)}
                placeholder="หมายเหตุ (ถ้ามี)"
                className="md:w-64 px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
              />

              {!readOnly && value.workItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWorkItem(idx)}
                  className="hidden md:flex p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                  title="ลบแถว"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}

          <div className="pt-2 space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              รายละเอียดเพิ่มเติม (Additional Notes)
            </label>
            <textarea
              rows={2}
              disabled={readOnly}
              value={value.additionalDetail}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, additionalDetail: e.target.value }))
              }
              placeholder="ข้อสังเกตหรือรายละเอียดเพิ่มเติมจากหน้างาน..."
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
            />
          </div>
        </div>
      </section>

      {/* ── Section D: 3-Column Field Sign-Off (Check-in Customer / Check-out Customer / Inspector) ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <PenTool size={17} className="text-[#ff2301] shrink-0" />
          <div>
            <h3 className="font-black text-sm text-gray-900">
              4. ลายเซ็นใบตรวจเช็คระบบหน้างาน (ลูกค้าเข้า / ลูกค้าเสร็จงาน / ผู้เข้าตรวจเช็ค)
            </h3>
            <p className="text-[11px] text-gray-500">
              สามารถพิมพ์ PDF แบบยังไม่เซ็นไปให้ลูกค้าเซ็นด้วยปากกา หรือให้ลูกค้าเซ็นผ่านมือถือหน้างานได้เลย
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Check-in Customer */}
          <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200 flex flex-col justify-between">
            <SurveySignatureBox
              title="เข้าตรวจเช็ค (ลูกค้า)"
              subtitle="ลายเซ็นลูกค้าตอนเริ่มเข้าหน้างาน"
              signerName={value.checkInCustomerName || value.customerName}
              value={value.checkInCustomerSignUrl}
              readOnly={readOnly}
              accentColor="red"
              onChange={(nextUrl) =>
                onChange((prev) => ({
                  ...prev,
                  checkInCustomerSignUrl: nextUrl,
                  checkInAt:
                    nextUrl && !prev.checkInAt ? toBkkNowDateTimeLocal() : nextUrl ? prev.checkInAt : '',
                }))
              }
            />
            <div className="space-y-2 pt-1">
              <input
                type="text"
                disabled={readOnly}
                value={value.checkInCustomerName}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, checkInCustomerName: e.target.value }))
                }
                placeholder="ชื่อตัวแทนลูกค้า (Check-in)"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-xs"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="datetime-local"
                  disabled={readOnly}
                  value={value.checkInAt}
                  onChange={(e) => onChange((prev) => ({ ...prev, checkInAt: e.target.value }))}
                  className="flex-1 px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-xs font-mono"
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({ ...prev, checkInAt: toBkkNowDateTimeLocal() }))
                    }
                    className="px-2.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-700 shrink-0 cursor-pointer"
                    title="ใช้เวลาปัจจุบัน"
                  >
                    <Clock size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Check-out Customer */}
          <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200 flex flex-col justify-between">
            <SurveySignatureBox
              title="ตรวจเช็คเสร็จ (ลูกค้า)"
              subtitle="ลายเซ็นลูกค้าตรวจรับมอบหลังเสร็จงาน"
              signerName={value.checkOutCustomerName || value.customerName}
              value={value.checkOutCustomerSignUrl}
              readOnly={readOnly}
              accentColor="red"
              onChange={(nextUrl) =>
                onChange((prev) => ({
                  ...prev,
                  checkOutCustomerSignUrl: nextUrl,
                  checkOutAt:
                    nextUrl && !prev.checkOutAt
                      ? toBkkNowDateTimeLocal()
                      : nextUrl
                      ? prev.checkOutAt
                      : '',
                }))
              }
            />
            <div className="space-y-2 pt-1">
              <input
                type="text"
                disabled={readOnly}
                value={value.checkOutCustomerName}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, checkOutCustomerName: e.target.value }))
                }
                placeholder="ชื่อตัวแทนลูกค้า (Check-out)"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-xs"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="datetime-local"
                  disabled={readOnly}
                  value={value.checkOutAt}
                  onChange={(e) => onChange((prev) => ({ ...prev, checkOutAt: e.target.value }))}
                  className="flex-1 px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-xs font-mono"
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({ ...prev, checkOutAt: toBkkNowDateTimeLocal() }))
                    }
                    className="px-2.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-700 shrink-0 cursor-pointer"
                    title="ใช้เวลาปัจจุบัน"
                  >
                    <Clock size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Inspector */}
          <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200 flex flex-col justify-between">
            <SurveySignatureBox
              title="ผู้เข้าตรวจเช็ค (Inspector)"
              subtitle="ลายเซ็นหัวหน้าทีม / ช่างผู้เข้าตรวจเช็ค"
              signerName={value.inspectorSignerName || value.inspectorNames || currentUserFullName}
              savedKeyName={value.inspectorSignerName || currentUserFullName}
              value={value.inspectorSignUrl}
              readOnly={readOnly}
              accentColor="slate"
              onChange={(nextUrl) =>
                onChange((prev) => ({ ...prev, inspectorSignUrl: nextUrl }))
              }
            />
            <div className="space-y-2 pt-1">
              <input
                type="text"
                disabled={readOnly}
                value={value.inspectorSignerName}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, inspectorSignerName: e.target.value }))
                }
                placeholder="ชื่อผู้เข้าตรวจเช็ค"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-xs"
              />
              <div className="h-[38px] px-3 rounded-xl bg-white/70 border border-gray-200 flex items-center text-xs text-gray-500">
                วันที่: {formatCleaningDateSlashBe(value.inspectionDate)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
