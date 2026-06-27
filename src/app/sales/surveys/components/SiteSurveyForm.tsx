'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Save, Loader2, RefreshCcw, Check, X, FileText, Zap, Battery, Home, Info, Image as ImageIcon, Clock, DollarSign, MapPin, Locate, Plus, UploadCloud, Trash2, Link } from 'lucide-react';
import { getSiteSurveyById, createCompanyForSurvey } from '@/app/actions/siteSurveys';
import { format } from 'date-fns';
import SearchableSelect from '@/app/components/SearchableSelect';

type Props = {
  surveyId: string | null;
  companies: any[];
  salesReps: any[];
  currentUser: any;
  onSuccess: () => void;
};

const TABS = [
  { id: 'project', label: '1. ข้อมูลโครงการ', icon: FileText },
  { id: 'behavior', label: '2. พฤติกรรมการใช้ไฟ', icon: Clock },
  { id: 'electrical', label: '3. ลักษณะของผู้ใช้ไฟฟ้า', icon: Zap },
  { id: 'tariff', label: '4. อัตราค่าไฟ', icon: DollarSign },
  { id: 'structure', label: '5. โครงสร้างหลังคา', icon: Home },
  { id: 'qa', label: '6. คำถามเพิ่มเติม', icon: Info },
  { id: 'media', label: '7. รูปถ่ายและเอกสาร', icon: ImageIcon },
];

const TARIFF_OPTIONS = [
  {
    group: 'ประเภทที่ 1 บ้านอยู่อาศัย และ ประเภทที่ 2 กิจการขนาดเล็ก',
    subgroups: [
      {
        subgroup: 'อัตราปกติ (TOD)',
        options: [
          {
            id: '1.2.1_2.1.2',
            label: 'ประเภทผู้ใช้ไฟฟ้า 1.2.1 และ 2.1.2 (ต่ำกว่า 12 kV)',
            tiers: [
              { name: 'หน่วยที่ 1 - 150', rate: 3.2484 },
              { name: 'หน่วยที่ 151 - 400', rate: 4.2218 },
              { name: 'หน่วยที่ 400 ขึ้นไป', rate: 4.4217 }
            ]
          },
          {
            id: '2.1.1',
            label: 'ประเภทผู้ใช้ไฟฟ้า 2.1.1 : 12 - 24 kV',
            tiers: [
              { name: 'อัตราปกติ', rate: 3.9086 }
            ]
          }
        ]
      },
      {
        subgroup: 'อัตราตามช่วงเวลาของการใช้ (TOU)',
        options: [
          {
            id: '1.2.1_2.2.1',
            label: 'ประเภทผู้ใช้ไฟฟ้า 1.2.1 และ 2.2.1 : 12 - 24 kV',
            tiers: [
              { name: 'On - Peak', rate: 5.1135 },
              { name: 'Off - Peak', rate: 2.6037 }
            ]
          },
          {
            id: '1.2.2_2.2.2',
            label: 'ประเภทผู้ใช้ไฟฟ้า 1.2.2 และ 2.2.2 : ต่ำกว่า 12 kV',
            tiers: [
              { name: 'On - Peak', rate: 5.7982 },
              { name: 'Off - Peak', rate: 2.6369 }
            ]
          }
        ]
      }
    ]
  },
  {
    group: 'ประเภทที่ 3 กิจการขนาดกลาง และ ประเภทที่ 4 กิจการขนาดใหญ่',
    subgroups: [
      {
        subgroup: 'อัตราปกติ (TOD)',
        options: [
          {
            id: '3.1.1_4.1.1',
            label: 'ประเภทผู้ใช้ไฟฟ้า 3.1.1 และ 4.1.1 : 69 kV ขึ้นไป',
            tiers: [
              { name: 'อัตราปกติ', rate: 3.1097 }
            ]
          },
          {
            id: '3.1.2_4.1.2',
            label: 'ประเภทผู้ใช้ไฟฟ้า 3.1.2 และ 4.1.2 : 12 - 24 kV',
            tiers: [
              { name: 'อัตราปกติ', rate: 3.1471 }
            ]
          },
          {
            id: '3.1.3_4.1.3',
            label: 'ประเภทผู้ใช้ไฟฟ้า 3.1.3 และ 4.1.3 : ต่ำกว่า 12 kV',
            tiers: [
              { name: 'อัตราปกติ', rate: 3.1751 }
            ]
          }
        ]
      },
      {
        subgroup: 'อัตราตามช่วงเวลาของการใช้ (TOU)',
        options: [
          {
            id: '3.2.1_4.2.1',
            label: 'ประเภทผู้ใช้ไฟฟ้า 3.2.1 และ 4.2.1 : 69 kV ขึ้นไป',
            tiers: [
              { name: 'On - Peak', rate: 4.1025 },
              { name: 'Off - Peak', rate: 2.5849 }
            ]
          },
          {
            id: '3.2.2_4.2.2',
            label: 'ประเภทผู้ใช้ไฟฟ้า 3.2.2 และ 4.2.2 : 12 - 24 kV',
            tiers: [
              { name: 'On - Peak', rate: 4.1839 },
              { name: 'Off - Peak', rate: 2.6037 }
            ]
          },
          {
            id: '3.2.3_4.2.3',
            label: 'ประเภทผู้ใช้ไฟฟ้า 3.2.3 และ 4.2.3 : ต่ำกว่า 12 kV',
            tiers: [
              { name: 'On - Peak', rate: 4.3297 },
              { name: 'Off - Peak', rate: 2.6369 }
            ]
          }
        ]
      }
    ]
  }
];

export default function SiteSurveyForm({ surveyId, companies, salesReps, currentUser, onSuccess }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('project');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  const isProjectRole = (currentUser?.role || '').toLowerCase().includes('project');

  const [localCompanies, setLocalCompanies] = useState(companies);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  // Conflict Resolution State
  const [conflictError, setConflictError] = useState<{ currentVersion: number, message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({
    // Project Info
    surveyNumber: `SV${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    surveyDate: format(new Date(), 'yyyy-MM-dd'),
    companyId: '',
    customerName: '',
    projectName: '',
    projectLocation: '',
    coordinatorName: '',
    coordinatorPhone: '',
    salespersonId: currentUser?.id || '',
    surveyorName: currentUser?.fullName || '',
    status: 'Draft',
    version: 1,
    latitude: '',
    longitude: '',
    hasSingleLineDiagram: false,
    requiredInfoChecklist: [],
    additionalRemark: '',

    // Usage Behavior
    usageBehavior: {},
    // Electrical Profile
    electricalProfile: {},
    // Tariff Selection
    tariffSelection: { tiers: [] },
    // Structure
    structure: { roofAges: [] },
    // QA
    qa: { solarReasons: [] },
    // Media & Docs
    photos: [],
    documents: [],
    electricityBill: null
  });

  useEffect(() => {
    if (surveyId) {
      loadSurvey(surveyId);
    } else {
      setLoading(false);
    }
  }, [surveyId]);

  const loadSurvey = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSiteSurveyById(id);
      if (res.success && res.data) {
        const d = res.data;
        setFormData({
          ...d,
          surveyDate: format(new Date(d.surveyDate), 'yyyy-MM-dd'),
          usageBehavior: d.usageBehavior || {},
          electricalProfile: d.electricalProfile || {},
          tariffSelection: d.tariffSelection || { tiers: [] },
          structure: d.structure || { roofAges: [] },
          qa: d.qa || { solarReasons: [] },
          photos: d.photos || [],
          documents: d.documents || [],
          electricityBill: d.electricityBill || null
        });
      } else {
        setError(res.error || 'Failed to load survey');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'photos' | 'documents' | 'electricityBill', index?: number, keyName?: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingMedia(true);
    const form = new FormData();
    form.append('file', file);
    
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      
      if (data.success && data.url) {
        if (fieldName === 'electricityBill') {
          updateField('electricityBill', data.url);
        } else if (index !== undefined && keyName) {
          const arr = [...formData[fieldName]];
          arr[index] = { ...arr[index], [keyName]: data.url };
          updateField(fieldName, arr);
        }
      } else {
        alert('อัปโหลดไฟล์ไม่สำเร็จ: ' + data.error);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSave = async (forceOverwrite = false) => {
    setSaving(true);
    setError(null);
    setConflictError(null);

    try {
      const payload = { ...formData };
      if (forceOverwrite && conflictError) {
        payload.version = conflictError.currentVersion; // bypass conflict by using latest version
      }

      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 409) {
        setConflictError({ currentVersion: data.currentVersion, message: data.error });
        setSaving(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save survey');
      }

      router.refresh();
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any, section?: string) => {
    if (section) {
      setFormData((prev: any) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const handleCreateCompany = async (name: string) => {
    setIsCreatingCompany(true);
    try {
      const res = await createCompanyForSurvey(name);
      if (res.success && res.data) {
        setLocalCompanies(prev => [...prev, res.data]);
        updateField('companyId', res.data.id);
        updateField('customerName', res.data.companyName);
      } else {
        setError(res.error || 'Failed to create company');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateField('latitude', position.coords.latitude);
          updateField('longitude', position.coords.longitude);
        },
        (error) => {
          alert('ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณาตรวจสอบการอนุญาต Location ของเบราว์เซอร์');
        }
      );
    } else {
      alert('เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่ง');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#ff2301] animate-spin mb-4" />
        <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

      {/* Header & Conflict Resolution */}
      <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {surveyId ? `แก้ไขแบบสำรวจ: ${formData.surveyNumber}` : 'สร้างแบบสำรวจใหม่'}
          </h2>
          {surveyId && <p className="text-sm text-gray-500">เวอร์ชัน: {formData.version}</p>}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {surveyId && (
            <a
              href={`/api/surveys/${surveyId}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg shadow-sm font-medium transition-colors"
            >
              <FileText className="w-5 h-5 text-[#ff2301]" />
              พิมพ์ PDF
            </a>
          )}
          
          {!isProjectRole && (
            <button
              onClick={() => handleSave()}
              disabled={saving || !!conflictError}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#ff2301] hover:bg-red-700 disabled:bg-red-300 text-white px-6 py-2.5 rounded-lg shadow font-medium transition-colors"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              บันทึกข้อมูล
            </button>
          )}
        </div>
      </div>
      
      {isProjectRole && (
        <div className="bg-blue-50 text-blue-700 p-3 text-center text-sm font-medium border-b border-blue-100">
          โหมดดูข้อมูล (Read-Only) - สำหรับผู้ใช้งานในแผนก Project
        </div>
      )}

      {/* Conflict Error Dialog / Banner */}
      {conflictError && (
        <div className="m-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 text-orange-800">
            <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold">ตรวจพบข้อมูลชนกัน (Version Conflict)</h3>
              <p className="text-sm mt-1">{conflictError.message}</p>
              <p className="text-sm">เวอร์ชันปัจจุบันในระบบคือ {conflictError.currentVersion} แต่ของคุณคือ {formData.version}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => loadSurvey(surveyId!)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-orange-300 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium"
            >
              <RefreshCcw className="w-4 h-4" />
              โหลดข้อมูลล่าสุด
            </button>
            <button
              onClick={() => handleSave(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              <Check className="w-4 h-4" />
              บังคับเขียนทับ
            </button>
          </div>
        </div>
      )}

      {error && !conflictError && (
        <div className="m-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
          <X className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50/50 scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${isActive
                ? 'border-[#ff2301] text-[#ff2301] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      <div className="p-6">

        {/* TAB 1: Project Info */}
        {activeTab === 'project' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่สำรวจ</label>
                <input
                  type="text"
                  value={formData.surveyNumber}
                  onChange={(e) => updateField('surveyNumber', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#ff2301] outline-none"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สำรวจ</label>
                <input
                  type="date"
                  value={formData.surveyDate}
                  onChange={(e) => updateField('surveyDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                <select
                  value={formData.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                >
                  <option value="Draft">Draft</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">ลูกค้า (อ้างอิงจากระบบ CRM)</label>
                <SearchableSelect
                  value={formData.companyId || ''}
                  onChange={(val) => {
                    const comp = localCompanies.find(c => c.id === val);
                    updateField('companyId', val);
                    if (comp) {
                      updateField('customerName', comp.companyName);

                      if (!formData.projectLocation) {
                        const locParts = [];
                        if (comp.address) locParts.push(comp.address);
                        if (comp.subDistrict) locParts.push(`ต.${comp.subDistrict}`);
                        if (comp.district) locParts.push(`อ.${comp.district}`);
                        if (comp.province) locParts.push(`จ.${comp.province}`);
                        if (comp.postalCode) locParts.push(comp.postalCode);

                        const locString = locParts.join(' ');
                        if (locString) {
                          updateField('projectLocation', locString);
                        }
                      }
                    }
                  }}
                  options={localCompanies.map(c => ({ label: c.companyName, value: c.id }))}
                  placeholder="-- ค้นหาหรือระบุชื่อลูกค้า --"
                  onCreate={handleCreateCompany}
                  isCreating={isCreatingCompany}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโครงการ (ถ้ามี)</label>
                <input
                  type="text"
                  value={formData.projectName || ''}
                  onChange={(e) => updateField('projectName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">สถานที่ตั้งโครงการ</label>
                <textarea
                  value={formData.projectLocation || ''}
                  onChange={(e) => updateField('projectLocation', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เซลส์ผู้ดูแล</label>
                <select
                  value={formData.salespersonId || ''}
                  onChange={(e) => updateField('salespersonId', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                >
                  <option value="">-- เลือกเซลส์ --</option>
                  {salesReps.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">พิกัดละติจูด (Latitude)</label>
                <input
                  type="number"
                  value={formData.latitude || ''}
                  onChange={(e) => updateField('latitude', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">พิกัดลองจิจูด (Longitude)</label>
                <input
                  type="number"
                  value={formData.longitude || ''}
                  onChange={(e) => updateField('longitude', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                />
              </div>

              {/* Location Tools */}
              <div className="md:col-span-2 flex flex-wrap gap-3 mt-2">
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <Locate className="w-4 h-4" />
                  ดึงตำแหน่งปัจจุบัน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Usage Behavior Tab */}
        {activeTab === 'behavior' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">2. พฤติกรรมการใช้ไฟ</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เวลาทำงาน (Working Hours)</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <select
                      value={(formData.usageBehavior?.workingHours || '').split(' - ')[0]?.split(':')[0] || '08'}
                      onChange={(e) => {
                        const currentStartMin = (formData.usageBehavior?.workingHours || '').split(' - ')[0]?.split(':')[1] || '00';
                        const end = (formData.usageBehavior?.workingHours || '').split(' - ')[1] || '17:00';
                        updateField('workingHours', `${e.target.value}:${currentStartMin} - ${end}`, 'usageBehavior');
                      }}
                      className="px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff2301] outline-none"
                    >
                      {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span>:</span>
                    <select
                      value={(formData.usageBehavior?.workingHours || '').split(' - ')[0]?.split(':')[1] || '00'}
                      onChange={(e) => {
                        const currentStartHour = (formData.usageBehavior?.workingHours || '').split(' - ')[0]?.split(':')[0] || '08';
                        const end = (formData.usageBehavior?.workingHours || '').split(' - ')[1] || '17:00';
                        updateField('workingHours', `${currentStartHour}:${e.target.value} - ${end}`, 'usageBehavior');
                      }}
                      className="px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff2301] outline-none"
                    >
                      {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <span className="text-gray-500 font-medium">ถึง</span>

                  <div className="flex items-center gap-1">
                    <select
                      value={(formData.usageBehavior?.workingHours || '').split(' - ')[1]?.split(':')[0] || '17'}
                      onChange={(e) => {
                        const start = (formData.usageBehavior?.workingHours || '').split(' - ')[0] || '08:00';
                        const currentEndMin = (formData.usageBehavior?.workingHours || '').split(' - ')[1]?.split(':')[1] || '00';
                        updateField('workingHours', `${start} - ${e.target.value}:${currentEndMin}`, 'usageBehavior');
                      }}
                      className="px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff2301] outline-none"
                    >
                      {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span>:</span>
                    <select
                      value={(formData.usageBehavior?.workingHours || '').split(' - ')[1]?.split(':')[1] || '00'}
                      onChange={(e) => {
                        const start = (formData.usageBehavior?.workingHours || '').split(' - ')[0] || '08:00';
                        const currentEndHour = (formData.usageBehavior?.workingHours || '').split(' - ')[1]?.split(':')[0] || '17';
                        updateField('workingHours', `${start} - ${currentEndHour}:${e.target.value}`, 'usageBehavior');
                      }}
                      className="px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff2301] outline-none"
                    >
                      {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สัดส่วนการใช้ไฟ กลางวัน/กลางคืน</label>
                <input
                  type="text"
                  placeholder="เช่น 70/30"
                  value={formData.usageBehavior?.dayNightRatio || ''}
                  onChange={(e) => updateField('dayNightRatio', e.target.value, 'usageBehavior')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันทำงานต่อสัปดาห์ (วัน)</label>
                <input
                  type="number"
                  value={formData.usageBehavior?.workingDaysPerWeek || ''}
                  onChange={(e) => updateField('workingDaysPerWeek', parseInt(e.target.value), 'usageBehavior')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันหยุดต่อสัปดาห์ (วัน)</label>
                <input
                  type="number"
                  value={formData.usageBehavior?.nonWorkingDaysPerWeek || ''}
                  onChange={(e) => updateField('nonWorkingDaysPerWeek', parseInt(e.target.value), 'usageBehavior')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันทำงานต่อปี (วัน)</label>
                <input
                  type="number"
                  value={formData.usageBehavior?.workingDaysPerYear || ''}
                  onChange={(e) => updateField('workingDaysPerYear', parseInt(e.target.value), 'usageBehavior')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันหยุดต่อปี (วัน)</label>
                <input
                  type="number"
                  value={formData.usageBehavior?.nonWorkingDaysPerYear || ''}
                  onChange={(e) => updateField('nonWorkingDaysPerYear', parseInt(e.target.value), 'usageBehavior')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ค่าไฟเฉลี่ยต่อเดือน (บาท)</label>
                <input
                  type="number"
                  value={formData.usageBehavior?.avgBillThbPerMonth || ''}
                  onChange={(e) => updateField('avgBillThbPerMonth', parseFloat(e.target.value), 'usageBehavior')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">เครื่องใช้ไฟฟ้าหลัก (Main Equipment)</label>
                <textarea
                  placeholder="เช่น Chiller, Air compressor, เครื่องรีดพลาสติก..."
                  value={formData.usageBehavior?.mainEquipment || ''}
                  onChange={(e) => updateField('mainEquipment', e.target.value, 'usageBehavior')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* Electrical Profile Tab */}
        {activeTab === 'electrical' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">3. ข้อมูลระบบไฟฟ้า (Electrical Profile)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Grid & Account Info */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">การไฟฟ้า (Grid Provider)</label>
                  <select
                    value={formData.electricalProfile?.gridProvider || ''}
                    onChange={(e) => updateField('gridProvider', e.target.value, 'electricalProfile')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                  >
                    <option value="">-- เลือก --</option>
                    <option value="PEA">การไฟฟ้าส่วนภูมิภาค (PEA)</option>
                    <option value="MEA">การไฟฟ้านครหลวง (MEA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทผู้ใช้ไฟฟ้า (User Type)</label>
                  <select
                    value={formData.electricalProfile?.userType || ''}
                    onChange={(e) => updateField('userType', e.target.value, 'electricalProfile')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                  >
                    <option value="">-- เลือก --</option>
                    <option value="Type 2">กิจการขนาดเล็ก (Type 2)</option>
                    <option value="Type 3">กิจการขนาดกลาง (Type 3)</option>
                    <option value="Type 4">กิจการขนาดใหญ่ (Type 4)</option>
                    <option value="Type 5">กิจการเฉพาะอย่าง (Type 5)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อัตราค่าไฟเฉลี่ย (บาท/หน่วย)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.electricalProfile?.rateThbPerKwh || ''}
                    onChange={(e) => updateField('rateThbPerKwh', parseFloat(e.target.value), 'electricalProfile')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                  />
                </div>
              </div>

              {/* Voltage & Meter (Checkbox UI) */}
              <div className="lg:col-span-3 bg-white p-6 border border-gray-200 rounded-xl space-y-6">
                <div className="flex items-baseline gap-2 border-b border-gray-100 pb-3">
                  <h4 className="text-lg font-bold text-gray-900">ระดับแรงดันไฟฟ้า</h4>
                  <span className="text-gray-600">Connected Voltage Level</span>
                </div>

                {/* 230V Group */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={formData.electricalProfile?.voltageLevel?.includes('230 V (1 Phase)') || false}
                      onChange={(e) => {
                        const current = formData.electricalProfile?.voltageLevel || [];
                        updateField('voltageLevel', e.target.checked ? [...current, '230 V (1 Phase)'] : current.filter((v: string) => v !== '230 V (1 Phase)'), 'electricalProfile');
                      }}
                      className="w-5 h-5 text-[#ff2301] focus:ring-[#ff2301] border-gray-300 rounded"
                    />
                    <span className="text-gray-800 font-medium">230 V (1 Phase)</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-4 ml-7 text-sm text-gray-700">
                    <span>ขนาดมิเตอร์:</span>
                    {['15(45) A', '30(100) A', '50(150) A'].map(m => (
                      <label key={`230-${m}`} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.electricalProfile?.meterSize?.includes(`${m} (1P)`) || false}
                          onChange={(e) => {
                            const current = formData.electricalProfile?.meterSize || [];
                            updateField('meterSize', e.target.checked ? [...current, `${m} (1P)`] : current.filter((v: string) => v !== `${m} (1P)`), 'electricalProfile');
                          }}
                          className="w-4 h-4 text-[#ff2301] focus:ring-[#ff2301] border-gray-300 rounded"
                        />
                        <span>{m}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 400V Group */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={formData.electricalProfile?.voltageLevel?.includes('400 V (3 Phase)') || false}
                      onChange={(e) => {
                        const current = formData.electricalProfile?.voltageLevel || [];
                        updateField('voltageLevel', e.target.checked ? [...current, '400 V (3 Phase)'] : current.filter((v: string) => v !== '400 V (3 Phase)'), 'electricalProfile');
                      }}
                      className="w-5 h-5 text-[#ff2301] focus:ring-[#ff2301] border-gray-300 rounded"
                    />
                    <span className="text-gray-800 font-medium">400 V (3 Phase)</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-4 ml-7 text-sm text-gray-700">
                    <span>ขนาดมิเตอร์:</span>
                    {['15(45) A', '30(100) A', '50(150) A', '200/400 A'].map(m => (
                      <label key={`400-${m}`} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.electricalProfile?.meterSize?.includes(`${m} (3P)`) || false}
                          onChange={(e) => {
                            const current = formData.electricalProfile?.meterSize || [];
                            updateField('meterSize', e.target.checked ? [...current, `${m} (3P)`] : current.filter((v: string) => v !== `${m} (3P)`), 'electricalProfile');
                          }}
                          className="w-4 h-4 text-[#ff2301] focus:ring-[#ff2301] border-gray-300 rounded"
                        />
                        <span>{m}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* High Voltage Group */}
                <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-gray-100">
                  {['22 kV (PEA)', '24 kV (MEA)', '33 kV (PEA-ภาคใต้)', '69 kV', '115 kV'].map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.electricalProfile?.voltageLevel?.includes(v) || false}
                        onChange={(e) => {
                          const current = formData.electricalProfile?.voltageLevel || [];
                          updateField('voltageLevel', e.target.checked ? [...current, v] : current.filter((val: string) => val !== v), 'electricalProfile');
                        }}
                        className="w-5 h-5 text-[#ff2301] focus:ring-[#ff2301] border-gray-300 rounded"
                      />
                      <span className="text-gray-800">{v}</span>
                    </label>
                  ))}
                </div>
              </div>



              {/* Row 1: Peak Power, Transformer Count, kVA & Breaker */}
              <div className="md:col-span-2 lg:col-span-3 pt-4 mt-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Peak Power Consumption */}
                <div>
                  <div className="flex flex-wrap items-baseline gap-2 mb-3">
                    <h4 className="font-semibold text-gray-800">กำลังไฟฟ้าสูงสุด</h4>
                    <span className="text-gray-500 text-sm">Peak Power Consumption</span>
                  </div>
                  <div className="flex flex-col gap-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="w-28">วันจันทร์ - วันศุกร์:</span>
                      <input
                        type="number"
                        value={formData.electricalProfile?.peakKwWeekday || ''}
                        onChange={(e) => updateField('peakKwWeekday', parseFloat(e.target.value), 'electricalProfile')}
                        className="w-24 px-3 py-1.5 border border-gray-200 rounded-md outline-none focus:border-[#ff2301]"
                        placeholder="0"
                      />
                      <span>kWac</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-28">เสาร์ - อาทิตย์:</span>
                      <input
                        type="number"
                        value={formData.electricalProfile?.peakKwWeekend || ''}
                        onChange={(e) => updateField('peakKwWeekend', parseFloat(e.target.value), 'electricalProfile')}
                        className="w-24 px-3 py-1.5 border border-gray-200 rounded-md outline-none focus:border-[#ff2301]"
                        placeholder="0"
                      />
                      <span>kWac</span>
                    </div>
                  </div>
                </div>

                {/* Number of Transformer */}
                <div>
                  <div className="flex flex-wrap items-baseline gap-2 mb-3">
                    <h4 className="font-semibold text-gray-800">จำนวนหม้อแปลง</h4>
                    <span className="text-gray-500 text-sm">Number of Transformer</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="number"
                      value={formData.electricalProfile?.transformerCount || ''}
                      onChange={(e) => updateField('transformerCount', parseInt(e.target.value), 'electricalProfile')}
                      className="w-24 px-3 py-1.5 border border-gray-200 rounded-md outline-none focus:border-[#ff2301]"
                      placeholder="0"
                    />
                    <span>Transformer</span>
                  </div>
                </div>

                {/* kVA Transformer & Breaker */}
                <div>
                  <div className="flex flex-wrap items-baseline gap-2 mb-3">
                    <h4 className="font-semibold text-gray-800">พิกัดหม้อแปลง / เบรกเกอร์</h4>
                    <span className="text-gray-500 text-sm">kVA Transformer & AT of ACDB</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.electricalProfile?.transformerKva || ''}
                        onChange={(e) => updateField('transformerKva', parseFloat(e.target.value), 'electricalProfile')}
                        className="w-24 px-3 py-1.5 border border-gray-200 rounded-md outline-none focus:border-[#ff2301]"
                        placeholder="kVA"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.electricalProfile?.breakerAmp || ''}
                        onChange={(e) => updateField('breakerAmp', parseFloat(e.target.value), 'electricalProfile')}
                        className="w-28 px-3 py-1.5 border border-gray-200 rounded-md outline-none focus:border-[#ff2301]"
                        placeholder="Breaker (A)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Brand, Model, Single Line Diagram */}
              <div className="md:col-span-2 lg:col-span-3 pt-4 mt-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Transformer Brand */}
                <div>
                  <div className="flex flex-wrap items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">ยี่ห้อหม้อแปลง</h4>
                    <span className="text-gray-500 text-sm">Transformer Brand</span>
                  </div>
                  <input
                    type="text"
                    value={formData.electricalProfile?.transformerBrand || ''}
                    onChange={(e) => updateField('transformerBrand', e.target.value, 'electricalProfile')}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md outline-none focus:border-[#ff2301]"
                    placeholder="เช่น ABB, Schneider"
                  />
                </div>

                {/* Transformer Model */}
                <div>
                  <div className="flex flex-wrap items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">รุ่นหม้อแปลง</h4>
                    <span className="text-gray-500 text-sm">Transformer Model</span>
                  </div>
                  <input
                    type="text"
                    value={formData.electricalProfile?.transformerModel || ''}
                    onChange={(e) => updateField('transformerModel', e.target.value, 'electricalProfile')}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md outline-none focus:border-[#ff2301]"
                    placeholder="เช่น DTR-315/11"
                  />
                </div>

                {/* Single Line Diagram */}
                <div>
                  <div className="flex flex-wrap items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">แบบไฟฟ้า</h4>
                    <span className="text-gray-500 text-sm">Single Line Diagram</span>
                  </div>
                  <div className="flex items-center gap-6 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="hasSingleLineDiagram"
                        checked={formData.hasSingleLineDiagram === true}
                        onChange={() => updateField('hasSingleLineDiagram', true)}
                        className="w-5 h-5 text-[#ff2301] focus:ring-[#ff2301] border-gray-300"
                      />
                      <span className="text-gray-800 group-hover:text-red-700">มี</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="hasSingleLineDiagram"
                        checked={formData.hasSingleLineDiagram === false}
                        onChange={() => updateField('hasSingleLineDiagram', false)}
                        className="w-5 h-5 text-[#ff2301] focus:ring-[#ff2301] border-gray-300"
                      />
                      <span className="text-gray-800 group-hover:text-red-700">ไม่มี</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tariff Selection Tab */}
        {/* Tariff Selection Tab (Thai Standard Form) */}
        {activeTab === 'tariff' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-baseline gap-2 border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">อัตราค่าไฟฟ้า</h3>
              <span className="text-gray-600 text-sm">Electricity Tariffs</span>
            </div>

            <p className="text-xs text-gray-500 mb-6">ไม่รวมภาษีมูลค่าเพิ่ม 7%</p>

            <div className="bg-white rounded-xl border border-gray-200">
              {TARIFF_OPTIONS.map((group, groupIdx) => (
                <div key={groupIdx} className="border-b border-gray-100 last:border-0">
                  <div className="bg-gray-50 px-4 py-3 font-semibold text-gray-800 text-sm border-y border-gray-100 first:border-t-0">
                    {group.group}
                  </div>

                  {group.subgroups.map((sub, subIdx) => (
                    <div key={subIdx} className="p-4 space-y-4">
                      <h4 className="font-medium text-sm text-gray-700">{sub.subgroup}</h4>

                      <div className="space-y-6 pl-4 border-l-2 border-gray-100 ml-2">
                        {sub.options.map((opt) => {
                          const isSelected = formData.tariffSelection?.tariffCategory === opt.label;
                          return (
                            <div key={opt.id} className="space-y-3">
                              <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="mt-0.5">
                                  <input
                                    type="radio"
                                    name="tariffCategory"
                                    checked={isSelected}
                                    onChange={() => {
                                      updateField('tariffCategory', opt.label, 'tariffSelection');
                                      const newTiers = opt.tiers.map(t => ({
                                        tierName: t.name,
                                        ratePerKwh: t.rate,
                                        qtyKwhPerMonth: 0
                                      }));
                                      updateField('tiers', newTiers, 'tariffSelection');
                                    }}
                                    onClick={(e) => {
                                      if (isSelected) {
                                        e.preventDefault();
                                        updateField('tariffCategory', '', 'tariffSelection');
                                        updateField('tiers', [], 'tariffSelection');
                                      }
                                    }}
                                    className="w-5 h-5 text-[#ff2301] focus:ring-[#ff2301] border-gray-300"
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-800 group-hover:text-red-700 transition-colors">
                                  {opt.label}
                                </span>
                              </label>

                              {isSelected && (
                                <div className="pl-8 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                  {opt.tiers.map((t, tierIdx) => {
                                    const currentTier = (formData.tariffSelection?.tiers || []).find((ct: any) => ct.tierName === t.name);
                                    return (
                                      <div key={tierIdx} className="flex flex-wrap items-center gap-4 text-sm text-gray-700 bg-red-50/50 p-2 rounded-lg">
                                        <div className="w-32 font-medium">{t.name}</div>
                                        <div className="w-48 text-gray-500">{t.rate} บาทต่อหน่วย (Baht/kWh)</div>
                                        <div className="flex items-center gap-2">
                                          <span>จำนวน</span>
                                          <input
                                            type="number"
                                            value={currentTier?.qtyKwhPerMonth || ''}
                                            onChange={(e) => {
                                              const newTiers = [...(formData.tariffSelection?.tiers || [])];
                                              const tierToUpdate = newTiers.find((ct: any) => ct.tierName === t.name);
                                              if (tierToUpdate) {
                                                tierToUpdate.qtyKwhPerMonth = parseFloat(e.target.value) || 0;
                                              }
                                              updateField('tiers', newTiers, 'tariffSelection');
                                            }}
                                            className="w-24 px-2 py-1 text-center border border-gray-300 rounded focus:ring-1 focus:ring-[#ff2301] outline-none"
                                          />
                                          <span>หน่วย (kWh/เดือน)</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              <div className="p-4 bg-yellow-50 text-xs text-yellow-800 rounded-b-xl border-t border-gray-200">
                <p>หมายเหตุ: On-peak วันจันทร์ - วันศุกร์ เวลา 9.00 - 22.00 น.</p>
                <p>Off-peak วันจันทร์ - วันศุกร์ เวลา 22.00 - 9.00 น. ก่อนวันถัดไป</p>
                <p>Off-peak วันเสาร์, วันอาทิตย์ และ วันหยุดนักขัตฤกษ์</p>
              </div>
            </div>

            {/* Global VAT & Units Summary if needed based on the bottom of the image */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">อัตราค่าไฟก่อน VAT (บาท/หน่วย) Rate</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  disabled
                  value={(formData.tariffSelection?.tiers || []).reduce((acc: number, t: any) => acc + (t.ratePerKwh || 0) * (t.qtyKwhPerMonth || 0), 0) / ((formData.tariffSelection?.tiers || []).reduce((acc: number, t: any) => acc + (t.qtyKwhPerMonth || 0), 0) || 1) || 0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนหน่วย (kWh) kWh</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  disabled
                  value={(formData.tariffSelection?.tiers || []).reduce((acc: number, t: any) => acc + (t.qtyKwhPerMonth || 0), 0) || 0}
                />
              </div>
            </div>
          </div>
        )}

        {/* Structure Tab */}
        {activeTab === 'structure' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">5. โครงสร้างหลังคา (Roof Structure)</h3>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อายุหลังคา (ปี)</label>
                  <input
                    type="number"
                    value={formData.structure?.roofAgeYear || ''}
                    onChange={(e) => updateField('roofAgeYear', parseInt(e.target.value), 'structure')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ขนาดพื้นที่หลังคา</label>
                  <input
                    type="text"
                    value={formData.structure?.roofDimWxlM || ''}
                    onChange={(e) => updateField('roofDimWxlM', e.target.value, 'structure')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                    placeholder="เช่น 20 x 50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ความสูงอาคาร (m)</label>
                  <input
                    type="number"
                    value={formData.structure?.buildingHeightM || ''}
                    onChange={(e) => updateField('buildingHeightM', parseFloat(e.target.value), 'structure')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-2 mb-4">
                  <h4 className="font-semibold text-gray-800">3.1 ประเภทหลังคา และอายุ</h4>
                  <span className="text-gray-500 text-sm">Type and Age of Roof</span>
                </div>

                <div className="flex flex-col gap-0 max-w-4xl">
                  {['กระเบื้องลอนคู่', 'กระเบื้องเซรามิคแบบลอนต่ำ', 'กระเบื้องหลังคาเซรามิคแบบเรียบ', 'สแลปคอนกรีต', 'เมทัลชีท'].map(r => {
                    const isChecked = formData.structure?.roofType?.includes(r);
                    const ageObj = formData.structure?.roofAges?.find((a: any) => a.roofType === r);

                    return (
                      <div key={r} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked || false}
                            onChange={(e) => {
                              const current = formData.structure?.roofType || [];
                              updateField('roofType', e.target.checked ? [...current, r] : current.filter((v: string) => v !== r), 'structure');

                              if (!e.target.checked) {
                                const currentAges = formData.structure?.roofAges || [];
                                updateField('roofAges', currentAges.filter((a: any) => a.roofType !== r), 'structure');
                              }
                            }}
                            className="w-5 h-5 text-[#ff2301] focus:ring-[#ff2301] border-gray-300 rounded"
                          />
                          <span className="text-gray-800">{r}</span>
                        </label>

                        <div className="flex items-center gap-4">
                          <span className="text-gray-600">อายุ:</span>
                          <input
                            type="number"
                            disabled={!isChecked}
                            value={ageObj?.ageYear || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const currentAges = formData.structure?.roofAges || [];
                              const filtered = currentAges.filter((a: any) => a.roofType !== r);
                              updateField('roofAges', [...filtered, { roofType: r, ageYear: val }], 'structure');
                            }}
                            className={`w-20 px-3 py-1.5 text-center border rounded-md outline-none focus:border-[#ff2301] ${!isChecked ? 'bg-gray-50 border-gray-100' : 'border-gray-200 bg-white shadow-sm'}`}
                            placeholder="0"
                          />
                          <span className="text-gray-600">ปี</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* อื่นๆ */}
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.structure?.roofType?.some((r: string) => r.startsWith('อื่นๆ:')) || false}
                          onChange={(e) => {
                            const current = formData.structure?.roofType || [];
                            if (e.target.checked) {
                              updateField('roofType', [...current, 'อื่นๆ: '], 'structure');
                            } else {
                              updateField('roofType', current.filter((v: string) => !v.startsWith('อื่นๆ:')), 'structure');
                              const currentAges = formData.structure?.roofAges || [];
                              updateField('roofAges', currentAges.filter((a: any) => a.roofType !== 'อื่นๆ'), 'structure');
                            }
                          }}
                          className="w-5 h-5 text-[#ff2301] focus:ring-[#ff2301] border-gray-300 rounded"
                        />
                        <span className="text-gray-800">อื่นๆ:</span>
                      </label>
                      <input
                        type="text"
                        disabled={!formData.structure?.roofType?.some((r: string) => r.startsWith('อื่นๆ:'))}
                        value={(formData.structure?.roofType?.find((r: string) => r.startsWith('อื่นๆ:')) || '').replace('อื่นๆ: ', '')}
                        onChange={(e) => {
                          const val = 'อื่นๆ: ' + e.target.value;
                          const current = formData.structure?.roofType || [];
                          updateField('roofType', [...current.filter((v: string) => !v.startsWith('อื่นๆ:')), val], 'structure');
                        }}
                        className="w-48 px-3 py-1.5 text-sm border border-gray-200 rounded-md outline-none focus:border-[#ff2301] disabled:bg-gray-50"
                        placeholder="ระบุ"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-gray-600">อายุ:</span>
                      <input
                        type="number"
                        disabled={!formData.structure?.roofType?.some((r: string) => r.startsWith('อื่นๆ:'))}
                        value={formData.structure?.roofAges?.find((a: any) => a.roofType === 'อื่นๆ')?.ageYear || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          const currentAges = formData.structure?.roofAges || [];
                          const filtered = currentAges.filter((a: any) => a.roofType !== 'อื่นๆ');
                          updateField('roofAges', [...filtered, { roofType: 'อื่นๆ', ageYear: val }], 'structure');
                        }}
                        className={`w-20 px-3 py-1.5 text-center border rounded-md outline-none focus:border-[#ff2301] disabled:bg-gray-50 disabled:border-gray-100 bg-white shadow-sm`}
                        placeholder="0"
                      />
                      <span className="text-gray-600">ปี</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">รูปแบบหลังคา (Roof Pattern)</label>
                  <select
                    value={formData.structure?.roofPattern || ''}
                    onChange={(e) => updateField('roofPattern', e.target.value, 'structure')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none bg-white text-gray-700"
                  >
                    <option value="" className="text-gray-400">-- เลือกรูปแบบ (Select Pattern) --</option>
                    <option value="Gable">ทรงจั่ว(Gable)</option>
                    <option value="Hip">ทรงปั้นหยา (Hip)</option>
                    <option value="Shed">เพิงหมาแหงน (Shed)</option>
                    <option value="Flat">ดาดฟ้า (Flat)</option>
                    <option value="Mono-pitch">จั่วพิง (Mono-pitch)</option>
                    <option value="Lean-to">เพิงข้าง (Lean-to)</option>
                    <option value="Gambrel">ทรงจั่วหักมุม (Gambrel)</option>
                    <option value="Mansard">ทรงปั้นหยาหักมุม (Mansard)</option>
                    <option value="Butterfly">ทรงผีเสื้อ (Butterfly)</option>
                    <option value="Dutch Gable">จั่วผสมปั้นหยา (Dutch Gable)</option>
                    <option value="A-Frame">ทรงเอเฟรม (A-Frame)</option>
                    <option value="Curved">ทรงโค้ง (Curved)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทรอน Metal Sheet</label>
                  <input
                    type="text"
                    value={formData.structure?.metalSheetType || ''}
                    onChange={(e) => updateField('metalSheetType', e.target.value, 'structure')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                  />
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {/* 3.6 Slope */}
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">3.6 ความชันหลังคา</h4>
                    <span className="text-gray-500 text-sm">Slope of Roof</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={formData.structure?.roofSlopeDeg || ''}
                      onChange={(e) => updateField('roofSlopeDeg', parseFloat(e.target.value), 'structure')}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                      placeholder="0"
                    />
                    <span className="text-gray-600 text-sm whitespace-nowrap">องศา [°]</span>
                  </div>
                </div>

                {/* 3.7 Azimuth / Tilt */}
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">3.7 Azimuth / Tilt Angle for Solar</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative flex items-center">
                      <input
                        type="number"
                        value={formData.structure?.azimuthDeg || ''}
                        onChange={(e) => updateField('azimuthDeg', parseFloat(e.target.value), 'structure')}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none pr-8"
                        placeholder="Azimuth"
                      />
                      <span className="absolute right-3 text-gray-400">°</span>
                    </div>
                    <div className="flex-1 relative flex items-center">
                      <input
                        type="number"
                        value={formData.structure?.tiltDeg || ''}
                        onChange={(e) => updateField('tiltDeg', parseFloat(e.target.value), 'structure')}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none pr-8"
                        placeholder="Tilt"
                      />
                      <span className="absolute right-3 text-gray-400">°</span>
                    </div>
                  </div>
                </div>

                {/* 3.8 Purlin to Purlin */}
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">3.8 ระยะแป ถึง แป</h4>
                    <span className="text-gray-500 text-sm">Purlin to Purlin</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={formData.structure?.purlinToPurlinM || ''}
                      onChange={(e) => updateField('purlinToPurlinM', parseFloat(e.target.value), 'structure')}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                      placeholder="0"
                    />
                    <span className="text-gray-600 text-sm whitespace-nowrap">เมตร (m)</span>
                  </div>
                </div>

                {/* 3.9 Truss/Rafter to Rafter */}
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">3.9 ระยะจันทัน ถึง จันทัน</h4>
                    <span className="text-gray-500 text-sm">Truss/Rafter to Rafter</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={formData.structure?.rafterToRafterM || ''}
                      onChange={(e) => updateField('rafterToRafterM', parseFloat(e.target.value), 'structure')}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                      placeholder="0"
                    />
                    <span className="text-gray-600 text-sm whitespace-nowrap">เมตร (m)</span>
                  </div>
                </div>

                {/* 3.10 Column to Column */}
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">3.10 ระยะเสา ถึง เสา</h4>
                    <span className="text-gray-500 text-sm">Column to Column</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={formData.structure?.columnToColumnM || ''}
                      onChange={(e) => updateField('columnToColumnM', parseFloat(e.target.value), 'structure')}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                      placeholder="0"
                    />
                    <span className="text-gray-600 text-sm whitespace-nowrap">เมตร (m)</span>
                  </div>
                </div>

                {/* 3.11 Sky light to Purlin */}
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">3.11 ระยะช่องแสง ถึง ช่องแสง</h4>
                    <span className="text-gray-500 text-sm">Sky light to Purlin</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={formData.structure?.skylightToSkylightM || ''}
                      onChange={(e) => updateField('skylightToSkylightM', parseFloat(e.target.value), 'structure')}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                      placeholder="0"
                    />
                    <span className="text-gray-600 text-sm whitespace-nowrap">เมตร (m)</span>
                  </div>
                </div>

                {/* 3.12 Jack Roof */}
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">3.12 ระยะของ Jack Roof</h4>
                    <span className="text-gray-500 text-sm">Jack Roof (W×L)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={formData.structure?.jackRoofDimM || ''}
                      onChange={(e) => updateField('jackRoofDimM', e.target.value, 'structure')}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                      placeholder="เช่น 1.20 x 3.50"
                    />
                    <span className="text-gray-600 text-sm whitespace-nowrap">เมตร (m)</span>
                  </div>
                </div>

                {/* 3.13 Ventilation */}
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">3.13 ระยะของ ลูกหมุน</h4>
                    <span className="text-gray-500 text-sm">Ventilation (W×L)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={formData.structure?.ventilationDimM || ''}
                      onChange={(e) => updateField('ventilationDimM', e.target.value, 'structure')}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                      placeholder="เช่น 0.60 x 0.60"
                    />
                    <span className="text-gray-600 text-sm whitespace-nowrap">เมตร (m)</span>
                  </div>
                </div>

                {/* 3.14 Lightning Protection */}
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">3.14 ระบบป้องกันฟ้าผ่า</h4>
                    <span className="text-gray-500 text-sm">Lightning Protection</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={formData.structure?.lightningProtectionM || ''}
                      onChange={(e) => updateField('lightningProtectionM', parseFloat(e.target.value), 'structure')}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                      placeholder="0"
                    />
                    <span className="text-gray-600 text-sm whitespace-nowrap">เมตร (m)</span>
                  </div>
                </div>

                {/* 3.15 Service Ladder */}
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">3.15 บันไดลิง/บันไดขึ้นหลังคา</h4>
                    <span className="text-gray-500 text-sm">Service Ladder</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={formData.structure?.serviceLadderM || ''}
                      onChange={(e) => updateField('serviceLadderM', parseFloat(e.target.value), 'structure')}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                      placeholder="0"
                    />
                    <span className="text-gray-600 text-sm whitespace-nowrap">เมตร (m)</span>
                  </div>
                </div>

                {/* 3.16 Other Notes */}
                <div className="md:col-span-2">
                  <div className="flex items-baseline gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">3.16 อื่นๆ</h4>
                    <span className="text-gray-500 text-sm">Other Notes</span>
                  </div>
                  <textarea
                    value={formData.structure?.otherNotes || ''}
                    onChange={(e) => updateField('otherNotes', e.target.value, 'structure')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none min-h-[100px]"
                    placeholder="หมายเหตุเพิ่มเติม / Additional notes"
                  />
                </div>

              </div>
            </div>
          </div>
        )}
        {/* QA Tab */}
        {activeTab === 'qa' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">6. คำถามเพิ่มเติม (QA)</h3>
            
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-6">
              
              {/* Day/Night Usage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">6.1 การใช้ไฟกลางวันและกลางคืน (Day / Night Usage)</label>
                <input
                  type="text"
                  value={formData.qa?.dayNightUsage || ''}
                  onChange={(e) => updateField('dayNightUsage', e.target.value, 'qa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none mb-2"
                  placeholder="ระบุสัดส่วนหรือรายละเอียด"
                />
                <textarea
                  value={formData.qa?.dayNightUsageDetail || ''}
                  onChange={(e) => updateField('dayNightUsageDetail', e.target.value, 'qa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none min-h-[60px]"
                  placeholder="หมายเหตุเพิ่มเติม"
                />
              </div>

              {/* Day Load / Night Load */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">6.2 โหลดช่วงกลางวัน (Day Load)</label>
                  <input
                    type="text"
                    value={formData.qa?.dayLoad || ''}
                    onChange={(e) => updateField('dayLoad', e.target.value, 'qa')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">6.3 โหลดช่วงกลางคืน (Night Load)</label>
                  <input
                    type="text"
                    value={formData.qa?.nightLoad || ''}
                    onChange={(e) => updateField('nightLoad', e.target.value, 'qa')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none"
                  />
                </div>
              </div>

              {/* Backup Load */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">6.4 โหลดที่ต้องการสำรองไฟ (Backup Load)</label>
                <input
                  type="text"
                  value={formData.qa?.backupLoad || ''}
                  onChange={(e) => updateField('backupLoad', e.target.value, 'qa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none mb-2"
                />
                <textarea
                  value={formData.qa?.backupLoadDetail || ''}
                  onChange={(e) => updateField('backupLoadDetail', e.target.value, 'qa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none min-h-[60px]"
                  placeholder="หมายเหตุเพิ่มเติม"
                />
              </div>

              {/* Battery Charge Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">6.5 โหมดการชาร์จแบตเตอรี่ (Battery Charge Mode)</label>
                <input
                  type="text"
                  value={formData.qa?.batteryChargeMode || ''}
                  onChange={(e) => updateField('batteryChargeMode', e.target.value, 'qa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none mb-2"
                />
                <textarea
                  value={formData.qa?.batteryChargeDetail || ''}
                  onChange={(e) => updateField('batteryChargeDetail', e.target.value, 'qa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none min-h-[60px]"
                  placeholder="หมายเหตุเพิ่มเติม"
                />
              </div>

              {/* Grid Charge at Night */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">6.6 ชาร์จไฟจาก Grid เวลากลางคืน? (Grid Charge at Night)</label>
                <select
                  value={formData.qa?.gridChargeAtNight || ''}
                  onChange={(e) => updateField('gridChargeAtNight', e.target.value, 'qa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none bg-white mb-2"
                >
                  <option value="">-- เลือก --</option>
                  <option value="Yes">ใช่ (Yes)</option>
                  <option value="No">ไม่ (No)</option>
                </select>
                <textarea
                  value={formData.qa?.gridChargeAtNightDetail || ''}
                  onChange={(e) => updateField('gridChargeAtNightDetail', e.target.value, 'qa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none min-h-[60px]"
                  placeholder="รายละเอียดเพิ่มเติม"
                />
              </div>

              {/* Inverter Backup on Outage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">6.7 ให้ Inverter สำรองไฟเมื่อไฟดับ? (Inverter Backup on Outage)</label>
                <select
                  value={formData.qa?.inverterBackupOnOutage || ''}
                  onChange={(e) => updateField('inverterBackupOnOutage', e.target.value, 'qa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none bg-white mb-2"
                >
                  <option value="">-- เลือก --</option>
                  <option value="Yes">ใช่ (Yes)</option>
                  <option value="No">ไม่ (No)</option>
                </select>
                <textarea
                  value={formData.qa?.inverterBackupOnOutageDetail || ''}
                  onChange={(e) => updateField('inverterBackupOnOutageDetail', e.target.value, 'qa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none min-h-[60px]"
                  placeholder="รายละเอียดเพิ่มเติม"
                />
              </div>

              {/* Power Quality Issue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">6.8 ปัญหาคุณภาพไฟฟ้า? (Power Quality Issue)</label>
                <select
                  value={formData.qa?.powerQualityIssue || ''}
                  onChange={(e) => updateField('powerQualityIssue', e.target.value, 'qa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none bg-white mb-2"
                >
                  <option value="">-- เลือก --</option>
                  <option value="Yes">มี (Yes)</option>
                  <option value="No">ไม่มี (No)</option>
                </select>
                <textarea
                  value={formData.qa?.powerQualityIssueDetail || ''}
                  onChange={(e) => updateField('powerQualityIssueDetail', e.target.value, 'qa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none min-h-[60px]"
                  placeholder="ระบุปัญหา เช่น ไฟตก ไฟกระชาก"
                />
              </div>

              {/* Solar Reasons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">6.9 จุดประสงค์ในการติดตั้งโซลาร์ (Reasons for Solar)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {['ลดค่าไฟ (Reduce Bill)', 'สำรองไฟ (Backup Power)', 'ขายไฟ (Sell to Grid)', 'เพื่อสิ่งแวดล้อม (Environmental)'].map(r => (
                    <label key={r} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.qa?.solarReasons?.includes(r) || false}
                        onChange={(e) => {
                          const current = formData.qa?.solarReasons || [];
                          updateField('solarReasons', e.target.checked ? [...current, r] : current.filter((v: string) => v !== r), 'qa');
                        }}
                        className="w-5 h-5 text-[#ff2301] focus:ring-[#ff2301] border-gray-300 rounded"
                      />
                      <span className="text-gray-800">{r}</span>
                    </label>
                  ))}
                </div>
                <textarea
                  value={formData.qa?.solarReasonsDetail || ''}
                  onChange={(e) => updateField('solarReasonsDetail', e.target.value, 'qa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff2301] outline-none min-h-[60px]"
                  placeholder="รายละเอียดเพิ่มเติม"
                />
              </div>

            </div>
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">7. รูปถ่ายและเอกสาร (Media & Documents)</h3>
            
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-8">
              
              {/* Electricity Bill */}
              <div>
                 <h4 className="font-semibold text-gray-800 mb-2">7.1 บิลค่าไฟ (Electricity Bill)</h4>
                 <div className="flex items-center gap-4">
                   <input
                     type="file"
                     accept="image/*,.pdf"
                     onChange={(e) => handleFileUpload(e, 'electricityBill')}
                     className="block w-full max-w-sm text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#ff2301] file:text-white hover:file:bg-red-700 cursor-pointer"
                   />
                   {uploadingMedia && <Loader2 className="w-5 h-5 animate-spin text-[#ff2301]" />}
                 </div>
                 {formData.electricityBill && (
                   <a href={formData.electricityBill} target="_blank" rel="noreferrer" className="text-[#ff2301] hover:underline text-sm mt-3 inline-flex items-center gap-1">
                     <Link className="w-4 h-4" /> ดูบิลค่าไฟที่อัปโหลดแล้ว
                   </a>
                 )}
              </div>

              {/* Photos */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-800">7.2 รูปถ่ายหน้างาน (Site Photos)</h4>
                  <button
                    onClick={() => updateField('photos', [...(formData.photos || []), { photoType: '', fileUrl: '', photoDesc: '' }])}
                    className="flex items-center gap-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มรูป
                  </button>
                </div>
                
                {(!formData.photos || formData.photos.length === 0) && <p className="text-gray-400 text-sm">ยังไม่มีรูปถ่าย</p>}
                
                <div className="space-y-4">
                  {formData.photos?.map((photo: any, index: number) => (
                    <div key={index} className="flex flex-col md:flex-row gap-4 items-start bg-white p-4 rounded-lg border border-gray-200">
                      <div className="w-full md:w-1/4">
                        <input
                          type="text"
                          value={photo.photoType}
                          onChange={(e) => {
                            const arr = [...formData.photos];
                            arr[index].photoType = e.target.value;
                            updateField('photos', arr);
                          }}
                          placeholder="ประเภทรูป (เช่น หลังคา, ตู้ไฟ)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#ff2301] outline-none"
                        />
                      </div>
                      <div className="w-full md:w-2/4">
                        <input
                          type="text"
                          value={photo.photoDesc || ''}
                          onChange={(e) => {
                            const arr = [...formData.photos];
                            arr[index].photoDesc = e.target.value;
                            updateField('photos', arr);
                          }}
                          placeholder="คำอธิบายรูป"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#ff2301] outline-none mb-3"
                        />
                        <div className="flex items-center gap-4">
                           <input
                             type="file"
                             accept="image/*"
                             onChange={(e) => handleFileUpload(e, 'photos', index, 'fileUrl')}
                             className="block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                           />
                           {photo.fileUrl && (
                             <a href={photo.fileUrl} target="_blank" rel="noreferrer" className="text-[#ff2301] hover:underline text-sm whitespace-nowrap inline-flex items-center gap-1">
                               <Link className="w-4 h-4" /> ดูรูป
                             </a>
                           )}
                        </div>
                      </div>
                      <div className="w-full md:w-auto flex justify-end">
                        <button
                          onClick={() => {
                            const arr = [...formData.photos];
                            arr.splice(index, 1);
                            updateField('photos', arr);
                          }}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-800">7.3 เอกสารประกอบ (Documents)</h4>
                  <button
                    onClick={() => updateField('documents', [...(formData.documents || []), { documentType: '', customerProvided: false, fileUrl: '', note: '' }])}
                    className="flex items-center gap-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มเอกสาร
                  </button>
                </div>

                {(!formData.documents || formData.documents.length === 0) && <p className="text-gray-400 text-sm">ยังไม่มีเอกสาร</p>}

                <div className="space-y-4">
                  {formData.documents?.map((doc: any, index: number) => (
                    <div key={index} className="flex flex-col md:flex-row gap-4 items-start bg-white p-4 rounded-lg border border-gray-200">
                      <div className="w-full md:w-1/4 space-y-3">
                        <input
                          type="text"
                          value={doc.documentType}
                          onChange={(e) => {
                            const arr = [...formData.documents];
                            arr[index].documentType = e.target.value;
                            updateField('documents', arr);
                          }}
                          placeholder="ประเภทเอกสาร"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#ff2301] outline-none"
                        />
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pl-1">
                          <input
                            type="checkbox"
                            checked={doc.customerProvided}
                            onChange={(e) => {
                              const arr = [...formData.documents];
                              arr[index].customerProvided = e.target.checked;
                              updateField('documents', arr);
                            }}
                            className="text-[#ff2301] focus:ring-[#ff2301] border-gray-300 rounded w-4 h-4"
                          />
                          ลูกค้าเตรียมให้
                        </label>
                      </div>
                      <div className="w-full md:w-2/4">
                        <input
                          type="text"
                          value={doc.note || ''}
                          onChange={(e) => {
                            const arr = [...formData.documents];
                            arr[index].note = e.target.value;
                            updateField('documents', arr);
                          }}
                          placeholder="หมายเหตุเพิ่มเติม"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#ff2301] outline-none mb-3"
                        />
                        <div className="flex items-center gap-4">
                           <input
                             type="file"
                             accept="*/*"
                             onChange={(e) => handleFileUpload(e, 'documents', index, 'fileUrl')}
                             className="block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                           />
                           {doc.fileUrl && (
                             <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-[#ff2301] hover:underline text-sm whitespace-nowrap inline-flex items-center gap-1">
                               <Link className="w-4 h-4" /> ดูเอกสาร
                             </a>
                           )}
                        </div>
                      </div>
                      <div className="w-full md:w-auto flex justify-end">
                        <button
                          onClick={() => {
                            const arr = [...formData.documents];
                            arr.splice(index, 1);
                            updateField('documents', arr);
                          }}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
