"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Calendar, FileText, DollarSign, FolderOpen, MapPin, Search, Check } from 'lucide-react';
import Link from 'next/link';
import { updateProject, addProjectMember, createTask } from '@/app/actions/projects';
import SolarChecklist from '../../components/SolarChecklist';

export default function EditProjectClient({ users, jobs, currentUserId, project, currentUserRole }: { users: any[], jobs: any[], currentUserId: string, project: any, currentUserRole?: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    // Basic Info
    name: project.name || '',
    description: project.description || '',
    clientName: project.clientName || '',
    projectCategory: project.projectCategory || '',
    department: project.department || '',
    province: project.province || '',
    district: project.district || '',
    siteAddress: project.siteAddress || '',
    managerId: project.managerId || currentUserId,
    jobId: project.jobId || '',

    // Timeline
    startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
    endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
    projectDuration: project.projectDuration?.toString() || '',
    projectDurationUnit: project.projectDurationUnit || 'วัน',
    deliveryDate: project.deliveryDate ? new Date(project.deliveryDate).toISOString().split('T')[0] : '',

    // Contract & Financial
    contractNumber: project.contractNumber || '',
    contractSignatory: project.contractSignatory || '',
    contractSigningDate: project.contractSigningDate ? new Date(project.contractSigningDate).toISOString().split('T')[0] : '',
    contractReturnStatus: project.contractReturnStatus || '',
    projectValue: project.projectValue?.toString() || '',
    securityDeposit: project.securityDeposit?.toString() || '',
    depositCollectionSchedule: project.depositCollectionSchedule ? new Date(project.depositCollectionSchedule).toISOString().split('T')[0] : '',
    depositRefundRequestNo: project.depositRefundRequestNo || '',
    penaltyPerDay: project.penaltyPerDay?.toString() || '',
    amountIncludingVat: project.amountIncludingVat?.toString() || '',
    budget: project.budget?.toString() || '',

    // Installments & Payments
    installment1: project.installment1?.toString() || '',
    installment2: project.installment2?.toString() || '',
    installment3: project.installment3?.toString() || '',
    installment4: project.installment4?.toString() || '',
    firstPayment: project.firstPayment?.toString() || '',
    secondPayment: project.secondPayment?.toString() || '',
    paymentDate: project.paymentDate ? new Date(project.paymentDate).toISOString().split('T')[0] : '',

    // Documents
    documentNumber: project.documentNumber || '',
    deliveryDocNumber: project.deliveryDocNumber || '',
    jbNumber: project.jbNumber || '',
    certCompletionRequestNo: project.certCompletionRequestNo || '',
    certRequestStatus: project.certRequestStatus || '',
    pathFolder: project.pathFolder || '',
    statusPictureUrl: project.statusPictureUrl || '',
    updateCompanyProfile: project.updateCompanyProfile || false,

    externalTechnicians: project.externalTechnicians || '',

    // Solar Checklist
    siteCheckInTime: project.siteCheckInTime ? new Date(project.siteCheckInTime).toISOString().split('T')[0] + 'T' + new Date(project.siteCheckInTime).toISOString().split('T')[1].slice(0, 5) : '',
    siteTeamMembers: project.siteTeamMembers || '',
    siteSupervisor: project.siteSupervisor || '',
    preChecklist: project.preChecklist || {},
    photoChecklist: project.photoChecklist || {},
    checklistImages: project.checklistImages || {},
    isHighVoltage: project.isHighVoltage || false,
    hvChecklist: project.hvChecklist || {},
    siteCheckOutTime: project.siteCheckOutTime ? new Date(project.siteCheckOutTime).toISOString().split('T')[0] + 'T' + new Date(project.siteCheckOutTime).toISOString().split('T')[1].slice(0, 5) : '',
    workSummary: project.workSummary || [],
    siteProblems: project.siteProblems || [],
    remainingWork: project.remainingWork || '',
    supervisorSignUrl: project.supervisorSignUrl || null,
    customerSignUrl: project.customerSignUrl || null,
  });

  // Section 2: Team
  const [engineers, setEngineers] = useState<string[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [engineerSearch, setEngineerSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');

  // Section 3: Tasks
  const [tasks, setTasks] = useState<any[]>([]);

  // Auto-calculate project duration in days if both dates are set
  useEffect(() => {
    if (formData.startDate && formData.endDate && formData.projectDurationUnit === 'วัน') {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = end.getTime() - start.getTime();
      if (diffTime >= 0) {
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // Only set if not already matched to avoid loop or overriding manual input entirely if user edits duration AFTER date
        // A better UX: we update if it's currently empty, or if we recalculate it directly.
        setFormData(prev => ({ ...prev, projectDuration: diffDays.toString() }));
      }
    }
  }, [formData.startDate, formData.endDate]);

  const handleAddTask = () => {
    setTasks([...tasks, { title: '', category: '', assigneeId: '', planStart: '', planEnd: '', weight: 1 }]);
  };

  const handleTaskChange = (index: number, field: string, value: any) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const handleRemoveTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("กรุณากรอกชื่อโครงการ (Project Name is required)");
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        return alert("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม (End Date cannot be before Start Date)");
      }
    }
    
    setIsSubmitting(true);
    try {
      const projectData = {
        name: formData.name,
        description: formData.description,
        clientName: formData.clientName,
        projectCategory: formData.projectCategory || undefined,
        department: formData.department || undefined,
        province: formData.province || undefined,
        district: formData.district || undefined,
        siteAddress: formData.siteAddress,
        managerId: formData.managerId,
        jobId: formData.jobId || undefined,

        // Timeline
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        projectDuration: formData.projectDuration ? parseInt(formData.projectDuration) : undefined,
        projectDurationUnit: formData.projectDurationUnit,
        deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : undefined,

        // Contract
        contractNumber: formData.contractNumber || undefined,
        contractSignatory: formData.contractSignatory || undefined,
        contractSigningDate: formData.contractSigningDate ? new Date(formData.contractSigningDate) : undefined,
        contractReturnStatus: formData.contractReturnStatus || undefined,

        // Financials
        projectValue: formData.projectValue ? parseFloat(formData.projectValue) : undefined,
        securityDeposit: formData.securityDeposit ? parseFloat(formData.securityDeposit) : undefined,
        depositCollectionSchedule: formData.depositCollectionSchedule ? new Date(formData.depositCollectionSchedule) : undefined,
        depositRefundRequestNo: formData.depositRefundRequestNo || undefined,
        penaltyPerDay: formData.penaltyPerDay ? parseFloat(formData.penaltyPerDay) : undefined,
        amountIncludingVat: formData.amountIncludingVat ? parseFloat(formData.amountIncludingVat) : undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,

        installment1: formData.installment1 ? parseFloat(formData.installment1) : undefined,
        installment2: formData.installment2 ? parseFloat(formData.installment2) : undefined,
        installment3: formData.installment3 ? parseFloat(formData.installment3) : undefined,
        installment4: formData.installment4 ? parseFloat(formData.installment4) : undefined,
        firstPayment: formData.firstPayment ? parseFloat(formData.firstPayment) : undefined,
        secondPayment: formData.secondPayment ? parseFloat(formData.secondPayment) : undefined,
        paymentDate: formData.paymentDate ? new Date(formData.paymentDate) : undefined,

        // Docs
        documentNumber: formData.documentNumber || undefined,
        deliveryDocNumber: formData.deliveryDocNumber || undefined,
        jbNumber: formData.jbNumber || undefined,
        certCompletionRequestNo: formData.certCompletionRequestNo || undefined,
        certRequestStatus: formData.certRequestStatus || undefined,
        pathFolder: formData.pathFolder || undefined,
        statusPictureUrl: formData.statusPictureUrl || undefined,
        updateCompanyProfile: formData.updateCompanyProfile,
        externalTechnicians: formData.externalTechnicians || undefined,

        // Solar Checklist
        siteCheckInTime: formData.siteCheckInTime ? new Date(formData.siteCheckInTime) : undefined,
        siteTeamMembers: formData.siteTeamMembers || undefined,
        siteSupervisor: formData.siteSupervisor || undefined,
        preChecklist: formData.preChecklist || undefined,
        photoChecklist: formData.photoChecklist || undefined,
        checklistImages: formData.checklistImages || undefined,
        isHighVoltage: formData.isHighVoltage || false,
        hvChecklist: formData.hvChecklist || undefined,
        siteCheckOutTime: formData.siteCheckOutTime ? new Date(formData.siteCheckOutTime) : undefined,
        workSummary: formData.workSummary || undefined,
        siteProblems: formData.siteProblems || undefined,
        remainingWork: formData.remainingWork || undefined,
        supervisorSignUrl: formData.supervisorSignUrl || undefined,
        customerSignUrl: formData.customerSignUrl || undefined,
      };

      await updateProject(project.id, projectData);

      // We skip team and task updates in Edit Project. They should be managed in Project Details directly.
      
      router.push(`/projects/${project.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects" className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">แก้ไขโครงการ (Edit Project)</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">แก้ไขข้อมูลโครงการให้เป็นปัจจุบัน</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section 1: General Info */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <FolderOpen className="text-brand-red" size={20} />
            <h2 className="text-lg font-bold text-gray-900">1. ข้อมูลทั่วไป (General Info)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-sm font-bold text-gray-700">ชื่อโครงการ (Project Name) *</label>
              <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">ลูกค้า (Client)</label>
              <input type="text" name="clientName" value={formData.clientName} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">หมวดหมู่โครงการ (Category)</label>
              <select name="projectCategory" value={formData.projectCategory} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none">
                <option value="">เลือกหมวดหมู่</option>
                <option value="Solar Roof">Solar Roof</option>
                <option value="Solar Pump">Solar Pump</option>
                <option value="Inverter">Inverter</option>
                <option value="Other">อื่นๆ (Other)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">แผนก (Department)</label>
              <input type="text" name="department" value={formData.department} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">เชื่อมโยงกับ Job (Link to Job)</label>
              <select 
                name="jobId"
                value={formData.jobId} 
                onChange={e => {
                  const newJobId = e.target.value;
                  const selectedJob = jobs.find(j => j.id === newJobId);
                  setFormData(prev => ({
                    ...prev, 
                    jobId: newJobId,
                    budget: selectedJob?.quotation 
                      ? (selectedJob.quotation.actualClosingAmount || selectedJob.quotation.totalAmountBeforeVat || '').toString() || prev.budget
                      : prev.budget,
                    name: selectedJob?.item || prev.name,
                    clientName: selectedJob?.customerName || prev.clientName
                  }));
                }} 
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none"
              >
                <option value="">ไม่เชื่อมโยง (None)</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.jobNumber} - {j.customerName}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">จังหวัด (Province)</label>
              <input type="text" name="province" value={formData.province} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">อำเภอ (District)</label>
              <input type="text" name="district" value={formData.district} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">ผู้จัดการโครงการ (Project Manager)</label>
              <select name="managerId" value={formData.managerId} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none">
                <option value="">เลือกผู้จัดการ</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>

            <div className="space-y-1.5 lg:col-span-3">
              <label className="text-sm font-bold text-gray-700">สถานที่ปฏิบัติงาน / รายละเอียด (Site Location / Description)</label>
              <textarea rows={2} name="siteAddress" value={formData.siteAddress} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>
          </div>
        </div>

        {/* Section 2: Timeline */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Calendar className="text-brand-red" size={20} />
            <h2 className="text-lg font-bold text-gray-900">2. ระยะเวลาโครงการ (Timeline)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">วันที่เริ่ม (Start Date)</label>
              <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">วันที่สิ้นสุด (End Date)</label>
              <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">ระยะเวลา (Duration)</label>
              <div className="flex gap-2">
                <input type="number" name="projectDuration" placeholder="ตัวเลข" value={formData.projectDuration} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
                <select name="projectDurationUnit" value={formData.projectDurationUnit} onChange={handleInputChange} className="w-24 px-2 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none">
                  <option value="วัน">วัน</option>
                  <option value="เดือน">เดือน</option>
                  <option value="ปี">ปี</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">วันที่ส่งมอบ (Delivery Date)</label>
              <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>
          </div>
        </div>

        {/* Section 3: Contract & Financials */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <DollarSign className="text-brand-red" size={20} />
            <h2 className="text-lg font-bold text-gray-900">3. สัญญาและการเงิน (Contract & Financials)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">เลขที่สัญญา (Contract No.)</label>
              <input type="text" name="contractNumber" value={formData.contractNumber} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">ผู้เซ็นสัญญา (Signatory)</label>
              <input type="text" name="contractSignatory" value={formData.contractSignatory} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">วันที่เซ็นสัญญา (Sign Date)</label>
              <input type="date" name="contractSigningDate" value={formData.contractSigningDate} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">มูลค่าโครงการ รวม VAT (Project Value)</label>
              <input type="number" step="0.01" name="projectValue" value={formData.projectValue} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            {(currentUserRole?.toLowerCase().includes('account') || currentUserRole?.includes('บัญชี') || currentUserRole?.toLowerCase().includes('admin') || currentUserRole?.includes('แอดมิน') || currentUserRole?.toLowerCase().includes('manage') || currentUserRole?.includes('ผู้จัดการ')) && (
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">มูลค่าโครงการ ไม่รวม VAT (Excl. VAT)</label>
                <input type="text" readOnly value={formData.projectValue ? (Number(formData.projectValue) * 100 / 107).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-medium outline-none" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">งบประมาณภายใน (Internal Budget)</label>
              <input type="number" step="0.01" name="budget" value={formData.budget} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">ค่าปรับ/วัน (Penalty/Day)</label>
              <input type="number" step="0.01" name="penaltyPerDay" value={formData.penaltyPerDay} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">เงินค้ำประกัน 5% (Security Deposit)</label>
              <input type="number" step="0.01" name="securityDeposit" value={formData.securityDeposit} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">กำหนดเก็บเงินค้ำประกัน (Deposit Collection)</label>
              <input type="date" name="depositCollectionSchedule" value={formData.depositCollectionSchedule} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">เลขขอคืนเงินค้ำประกัน (Refund Req No.)</label>
              <input type="text" name="depositRefundRequestNo" value={formData.depositRefundRequestNo} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4">การแบ่งชำระ (Installments)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">งวดที่ 1</label>
                <input type="number" step="0.01" name="installment1" value={formData.installment1} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">งวดที่ 2</label>
                <input type="number" step="0.01" name="installment2" value={formData.installment2} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">งวดที่ 3</label>
                <input type="number" step="0.01" name="installment3" value={formData.installment3} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">งวดที่ 4</label>
                <input type="number" step="0.01" name="installment4" value={formData.installment4} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Documents */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <FileText className="text-brand-red" size={20} />
            <h2 className="text-lg font-bold text-gray-900">4. เอกสาร (Documents)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">เลขที่เอกสาร (Doc No.)</label>
              <input type="text" name="documentNumber" value={formData.documentNumber} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">เลขที่ใบส่งมอบ (Delivery Doc No.)</label>
              <input type="text" name="deliveryDocNumber" value={formData.deliveryDocNumber} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">JB Number</label>
              <input type="text" name="jbNumber" value={formData.jbNumber} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">เลขที่ขอใบรับรองงานเสร็จ</label>
              <input type="text" name="certCompletionRequestNo" value={formData.certCompletionRequestNo} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">สถานะการขอใบรับรอง</label>
              <input type="text" name="certRequestStatus" value={formData.certRequestStatus} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">การคืนสัญญา (Contract Return)</label>
              <input type="text" name="contractReturnStatus" value={formData.contractReturnStatus} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <label className="text-sm font-bold text-gray-700">Path Folder (ลิงก์จัดเก็บเอกสาร)</label>
              <input type="text" name="pathFolder" value={formData.pathFolder} onChange={handleInputChange} placeholder="https://drive.google.com/..." className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
            </div>
          </div>
        </div>

        {/* Section 5: Team */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">5. ทีมงานเพิ่มเติม (Additional Team)</h2>
          
          <div className="space-y-6">
            <div className="space-y-2 border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-bold text-gray-900">วิศวกร (Engineers)</label>
                  <span className="text-[10px] font-bold text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-full">
                    {engineers.length} Selected
                  </span>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="ค้นหาวิศวกร (Search...)" 
                    value={engineerSearch}
                    onChange={e => setEngineerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:ring-1 focus:ring-brand-red focus:border-brand-red outline-none bg-gray-50/50"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                {users.filter(u => u.fullName.toLowerCase().includes(engineerSearch.toLowerCase())).map(u => {
                  const isSelected = engineers.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) setEngineers(engineers.filter(id => id !== u.id));
                        else setEngineers([...engineers, u.id]);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        isSelected 
                          ? 'bg-brand-red text-white border-brand-red shadow-sm' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {u.fullName}
                      {isSelected && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-bold text-gray-900">แอดมิน (Admins)</label>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    {admins.length} Selected
                  </span>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="ค้นหาแอดมิน (Search...)" 
                    value={adminSearch}
                    onChange={e => setAdminSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-full focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none bg-gray-50/50"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                {users.filter(u => u.fullName.toLowerCase().includes(adminSearch.toLowerCase())).map(u => {
                  const isSelected = admins.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) setAdmins(admins.filter(id => id !== u.id));
                        else setAdmins([...admins, u.id]);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        isSelected 
                          ? 'bg-purple-500 text-white border-purple-500 shadow-sm' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {u.fullName}
                      {isSelected && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 border-t border-gray-100 pt-4">
              <label className="text-sm font-bold text-gray-700">ช่างภายนอก (External Technicians)</label>
              <textarea 
                rows={2} 
                name="externalTechnicians"
                value={formData.externalTechnicians} 
                onChange={handleInputChange} 
                placeholder="ระบุชื่อช่างภายนอก (Enter names of external technicians, separated by commas)"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" 
              />
            </div>
          </div>
        </div>

        {/* Section 6: Initial Tasks */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <h2 className="text-lg font-bold text-gray-900">6. งานเริ่มต้น (Initial Tasks)</h2>
            <button type="button" onClick={handleAddTask} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors">
              <Plus size={14} /> เพิ่มงาน (Add Task)
            </button>
          </div>
          
          {tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task, index) => (
                <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="w-full md:w-1/4 lg:flex-1 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">ชื่องาน (Title) *</label>
                    <input type="text" required value={task.title} onChange={e => handleTaskChange(index, 'title', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none" />
                  </div>
                  <div className="w-1/2 md:w-32 lg:w-40 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">หมวดหมู่ (Category)</label>
                    <input type="text" value={task.category} onChange={e => handleTaskChange(index, 'category', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none" />
                  </div>
                  <div className="w-1/2 md:w-40 lg:w-48 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">ผู้รับผิดชอบ</label>
                    <select value={task.assigneeId} onChange={e => handleTaskChange(index, 'assigneeId', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none">
                      <option value="">ไม่มี (None)</option>
                      {users.filter(u => [formData.managerId, ...engineers, ...admins].includes(u.id)).map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                  </div>
                  <div className="w-1/2 md:w-32 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">เริ่ม (Start)</label>
                    <input type="date" value={task.planStart} onChange={e => handleTaskChange(index, 'planStart', e.target.value)} className="w-full px-3 py-1.5 text-[10px] sm:text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none" />
                  </div>
                  <div className="w-1/2 md:w-32 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">จบ (End)</label>
                    <input type="date" value={task.planEnd} onChange={e => handleTaskChange(index, 'planEnd', e.target.value)} className="w-full px-3 py-1.5 text-[10px] sm:text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none" />
                  </div>
                  <div className="w-full md:w-auto space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Weight</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min="0.1" step="0.1" value={task.weight} onChange={e => handleTaskChange(index, 'weight', e.target.value)} className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 outline-none" />
                      <button type="button" onClick={() => handleRemoveTask(index)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              ยังไม่มีการเพิ่มงาน (No tasks added yet)
            </div>
          )}
        </div>

        {/* Solar Checklist (Conditional) */}
        {(formData.projectCategory === 'Solar Roof' || formData.projectCategory === 'Solar Pump') && (
          <SolarChecklist formData={formData} setFormData={setFormData} />
        )}

        <div className="flex justify-end gap-4 pb-8">
          <Link href="/projects" className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">
            ยกเลิก (Cancel)
          </Link>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-brand-red text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-200 disabled:opacity-50">
            <Save size={18} />
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกโครงการ (Save Project)'}
          </button>
        </div>
      </form>
    </div>
  );
}
