"use client";

import React, { useState, useTransition, useEffect } from "react";
import { DollarSign, Search, CheckCircle, Clock, AlertCircle, Eye, X, Loader2, ClipboardList, ChevronUp, ChevronDown, Filter } from "lucide-react";
import { updatePaymentTaskStatus } from "@/app/actions/accounting";

function formatDate(d: string | Date) {
  const date = new Date(d);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear() + 543}`;
}

function JobDetailModal({ 
  jobId, 
  onClose,
  onConfirmPayment,
  isPending
}: { 
  jobId: string, 
  onClose: () => void,
  onConfirmPayment: (id: string, status: string) => void,
  isPending: boolean
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/accounting/job/${jobId}`)
      .then(res => res.json())
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [jobId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl flex flex-col items-center gap-3 shadow-xl">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.job) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl w-80 text-center relative shadow-xl">
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
          <p className="text-red-500 font-bold mb-4 mt-2">ไม่พบข้อมูล</p>
        </div>
      </div>
    );
  }

  const { job, quotation, company, paymentTasks, stepLogs } = data;
  const isCompleted = paymentTasks?.every((pt: any) => pt.status === 'ตรวจสอบและบันทึกแล้ว') || false;

  // Format steps timeline
  const renderSteps = () => {
    if (!stepLogs || stepLogs.length === 0) return <p className="text-sm text-gray-500">ไม่มีข้อมูลขั้นตอน</p>;
    
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {stepLogs.map((log: any, index: number) => (
          <React.Fragment key={log.id}>
            <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 flex items-center gap-1">
              <CheckCircle size={14} /> {log.step}
            </span>
            {index < stepLogs.length - 1 && <span className="text-gray-300">→</span>}
          </React.Fragment>
        ))}
        {job.currentStep !== 'complete' && job.currentStep !== stepLogs[stepLogs.length - 1]?.step && (
          <>
            {stepLogs.length > 0 && <span className="text-gray-300">→</span>}
            <span className="font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 flex items-center gap-1">
              <Clock size={14} /> {job.currentStep}
            </span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-100 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <ClipboardList className="text-gray-900" size={24} /> งาน {job.jobNumber}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{company?.companyName || job.customerName}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Info */}
          <section>
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">ข้อมูลลูกค้า</h3>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-y-3 gap-x-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">ชื่อบริษัท</p>
                <p className="text-sm font-semibold">{company?.companyName || job.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">เลขประจำตัวผู้เสียภาษี</p>
                <p className="text-sm font-medium">{company?.taxId || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">ที่อยู่</p>
                <p className="text-sm text-gray-700">{company?.address || '-'}</p>
              </div>
              {company?.phone && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">เบอร์โทรศัพท์</p>
                  <p className="text-sm text-gray-700">{company.phone}</p>
                </div>
              )}
            </div>
          </section>

          {/* Quotation Info */}
          <section>
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">ข้อมูลใบเสนอราคา</h3>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 grid grid-cols-2 gap-y-3 gap-x-6">
              <div>
                <p className="text-xs text-blue-500/70 mb-1">เลขที่ใบเสนอราคา</p>
                <p className="text-sm font-bold text-blue-900">{quotation?.quotationNumber || job.quotationNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500/70 mb-1">วันที่</p>
                <p className="text-sm font-medium text-blue-900">{quotation?.quotationDate ? formatDate(quotation.quotationDate) : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500/70 mb-1">มูลค่ารวมก่อน VAT</p>
                <p className="text-sm font-black text-blue-700">{quotation?.totalAmountBeforeVat ? `฿${quotation.totalAmountBeforeVat.toLocaleString()}` : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500/70 mb-1">สินค้า/บริการ</p>
                <p className="text-sm font-medium text-blue-900">{quotation?.subject || job.item || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500/70 mb-1">ผู้รับผิดชอบ (Sales)</p>
                <p className="text-sm font-medium text-blue-900">{quotation?.salesperson?.fullName || job.sellerName || '-'}</p>
              </div>
            </div>
          </section>

          {/* Sales Confirmation Info */}
          {(job.salesOrderDate || job.deliveryDate || job.paymentDate || job.creditTerms || job.billingRegulations || job.percentageTerms) && (
            <section>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">ข้อมูลยืนยันการขาย (Sales Confirmation)</h3>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">วันที่สั่งซื้อ (Order Date)</p>
                  <p className="text-sm font-semibold">{job.salesOrderDate ? formatDate(job.salesOrderDate) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">วันที่ส่งมอบ (Delivery Date)</p>
                  <p className="text-sm font-semibold">{job.deliveryDate ? formatDate(job.deliveryDate) : '-'}</p>
                </div>
                {job.paymentMethod === 'เงินสด' && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">วันที่ชำระเงิน (Payment Date)</p>
                    <p className="text-sm font-semibold">{job.paymentDate ? formatDate(job.paymentDate) : '-'}</p>
                  </div>
                )}
                
                {job.paymentMethod !== 'เงินสด' && (
                  <>
                    <div className="col-span-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">เงื่อนไขเครดิต</p>
                        <p className="text-sm font-medium">{job.creditTerms || '-'}</p>
                      </div>
                      {job.creditDocsUrl && (
                        <a href={job.creditDocsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors">
                          ดูเอกสารอนุมัติเครดิต
                        </a>
                      )}
                    </div>
                    {job.billingRegulations && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 mb-1">ระเบียบการวางบิล และเงื่อนไขการจ่ายเงิน</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 whitespace-pre-wrap">{job.billingRegulations}</p>
                      </div>
                    )}
                  </>
                )}
                {job.percentageTerms && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">เงื่อนไข % กรณีขอเบิกเงิน</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 whitespace-pre-wrap">{job.percentageTerms}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Payment Info */}
          <section>
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <DollarSign size={16} /> การชำระเงิน
            </h3>
            <div className="space-y-3">
              {(paymentTasks || []).map((pt: any) => {
                const ptIsCompleted = pt.status === 'ตรวจสอบและบันทึกแล้ว';
                const isOverdue = !ptIsCompleted && new Date(pt.dueDate) < new Date();
                return (
                  <div key={pt.id} className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 grid grid-cols-2 gap-y-3 gap-x-6">
                    <div>
                      <p className="text-xs text-emerald-600/70 mb-1">รูปแบบ</p>
                      <p className="text-sm font-bold text-emerald-900">
                        {pt.installmentNo 
                          ? `ผ่อนชำระ (งวดที่ ${pt.installmentNo}/${pt.installmentTotal}) - ฿${pt.installmentAmount?.toLocaleString() || '0'}` 
                          : (pt.job?.paymentMethod || pt.paymentMethod || job.paymentMethod || '-')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600/70 mb-1">วันครบกำหนด</p>
                      <p className={`text-sm font-black ${isOverdue ? 'text-red-600' : 'text-emerald-900'}`}>
                        {pt.dueDate ? formatDate(pt.dueDate) : '-'}
                      </p>
                    </div>
                    <div className="col-span-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-emerald-600/70 mb-1">สถานะ</p>
                        <p className="text-sm font-bold flex items-center gap-1.5">
                          {ptIsCompleted ? (
                            <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={14} /> ตรวจสอบและบันทึกแล้ว</span>
                          ) : (
                            <span className="text-amber-600 flex items-center gap-1"><Clock size={14} /> {pt.status || 'รอดำเนินการ'}</span>
                          )}
                        </p>
                      </div>
                      {!ptIsCompleted && (
                        <button
                          disabled={isPending}
                          onClick={() => onConfirmPayment(pt.id, 'ตรวจสอบและบันทึกแล้ว')}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                        >
                          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle size={14} />}
                          ยืนยันรับเงินก้อนนี้
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Job Status */}
          <section>
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">สถานะงาน (Job Steps)</h3>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              {renderSteps()}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex justify-end gap-3 z-10 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountingClientPage({ tasks: initialTasks }: { tasks: any[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isPending, startTransition] = useTransition();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  
  // Filters
  const [filterJobNumber, setFilterJobNumber] = useState("");
  const [filterCustomerItem, setFilterCustomerItem] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
  const [filterDueDate, setFilterDueDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const uniqueJobTypes = Array.from(new Set(tasks.map(t => t.job?.jobType).filter(Boolean)));
  const uniquePaymentMethods = Array.from(new Set(tasks.map(t => t.job?.paymentMethod).filter(Boolean)));

  const handleUpdate = (id: string, status: string) => {
    const note = window.prompt("หมายเหตุ (ถ้ามี):");
    if (note === null) return; // cancelled

    startTransition(async () => {
      await updatePaymentTaskStatus(id, status, note);
      setTasks(prev => prev.map(t => t.id === id ? { 
        ...t, 
        status, 
        note: note || t.note,
        paidDate: status === 'ตรวจสอบและบันทึกแล้ว' ? new Date().toISOString() : t.paidDate
      } : t));
    });
  };

  const filtered = tasks.filter(t => {
    // text match
    const qJob = filterJobNumber.toLowerCase();
    const matchesJobNumber = !qJob || t.job?.jobNumber?.toLowerCase().includes(qJob);

    const qCust = filterCustomerItem.toLowerCase();
    const matchesCustomerItem = !qCust || (
      t.job?.customerName?.toLowerCase().includes(qCust) ||
      t.job?.item?.toLowerCase().includes(qCust)
    );

    const matchesPayment = !filterPaymentMethod || t.job?.paymentMethod === filterPaymentMethod || (filterPaymentMethod === 'ผ่อนชำระ' && t.installmentNo);
    
    // date match
    let matchesDate = true;
    if (filterDueDate) {
      const taskDate = new Date(t.dueDate).toISOString().split('T')[0];
      matchesDate = taskDate === filterDueDate;
    }

    const matchesStatus = !filterStatus || t.status === filterStatus;
    const matchesJobType = selectedJobTypes.length === 0 || selectedJobTypes.includes(t.job?.jobType);

    return matchesJobNumber && matchesCustomerItem && matchesPayment && matchesDate && matchesStatus && matchesJobType;
  });

  const sortedTasks = React.useMemo(() => {
    let sortableItems = [...filtered];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'jobNumber') {
          aValue = a.job?.jobNumber || '';
          bValue = b.job?.jobNumber || '';
        } else if (sortConfig.key === 'customerName') {
          aValue = a.job?.customerName || '';
          bValue = b.job?.customerName || '';
        } else if (sortConfig.key === 'paymentMethod') {
          aValue = a.job?.paymentMethod || '';
          bValue = b.job?.paymentMethod || '';
        } else if (sortConfig.key === 'dueDate') {
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
        } else if (sortConfig.key === 'status') {
          aValue = a.status || '';
          bValue = b.status || '';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filtered, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const pendingTasks = filtered.filter(t => t.status !== 'ตรวจสอบและบันทึกแล้ว');
  const completedTasks = filtered.filter(t => t.status === 'ตรวจสอบและบันทึกแล้ว');

  return (
    <div className="p-8">
      {selectedJobId && (
        <JobDetailModal 
          jobId={selectedJobId} 
          onClose={() => setSelectedJobId(null)}
          onConfirmPayment={handleUpdate}
          isPending={isPending}
        />
      )}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={28} />
            รายการตรวจสอบการชำระเงิน
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            ตรวจสอบและอัปเดตสถานะการชำระเงินของงานต่างๆ
          </p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white min-w-[180px]"
            >
              <span className="flex items-center gap-2 text-gray-700">
                <Filter size={16} className="text-gray-400" />
                {selectedJobTypes.length === 0 ? "ทุกประเภทงาน" : `เลือกแล้ว ${selectedJobTypes.length} ประเภท`}
              </span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full right-0 md:left-0 mt-2 w-full min-w-[200px] bg-white border border-gray-100 shadow-xl rounded-xl p-2 z-50 max-h-64 overflow-y-auto">
                <div className="flex flex-col gap-1">
                  {uniqueJobTypes.map(type => (
                    <label key={type as string} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedJobTypes.includes(type as string)}
                        onChange={(e) => {
                          const val = type as string;
                          setSelectedJobTypes(prev => 
                            prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]
                          );
                        }}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">{type as React.ReactNode}</span>
                    </label>
                  ))}
                  {selectedJobTypes.length > 0 && (
                    <button
                      onClick={() => setSelectedJobTypes([])}
                      className="mt-2 text-xs text-center text-emerald-600 font-bold hover:underline py-1 w-full"
                    >
                      ล้างตัวกรองทั้งหมด
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-8 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-500 mb-1">เลขที่งาน</label>
          <input type="text" placeholder="ค้นหาเลขที่งาน..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" value={filterJobNumber} onChange={e => setFilterJobNumber(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-500 mb-1">ลูกค้า / รายการ</label>
          <input type="text" placeholder="ค้นหาลูกค้าหรือรายการ..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" value={filterCustomerItem} onChange={e => setFilterCustomerItem(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-500 mb-1">รูปแบบการชำระเงิน</label>
          <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white" value={filterPaymentMethod} onChange={e => setFilterPaymentMethod(e.target.value)}>
            <option value="">ทั้งหมด</option>
            <option value="ผ่อนชำระ">ผ่อนชำระ</option>
            {uniquePaymentMethods.map(p => p !== 'ผ่อนชำระ' && p ? <option key={p as string} value={p as string}>{p as React.ReactNode}</option> : null)}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-500 mb-1">วันครบกำหนด</label>
          <input type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" value={filterDueDate} onChange={e => setFilterDueDate(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-500 mb-1">สถานะ</label>
          <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">ทั้งหมด</option>
            <option value="รอดำเนินการ">รอดำเนินการ</option>
            <option value="ตรวจสอบและบันทึกแล้ว">ตรวจสอบและบันทึกแล้ว</option>
          </select>
        </div>
        <button 
          onClick={() => { setFilterJobNumber(''); setFilterCustomerItem(''); setFilterPaymentMethod(''); setFilterDueDate(''); setFilterStatus(''); setSelectedJobTypes([]); }} 
          className="px-4 py-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap h-[38px]"
        >
          ล้างตัวกรองทั้งหมด
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-700">รอดำเนินการ</p>
            <p className="text-3xl font-black text-amber-900">{pendingTasks.length}</p>
          </div>
        </div>
        
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-700">ตรวจสอบแล้ว</p>
            <p className="text-3xl font-black text-emerald-900">{completedTasks.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th onClick={() => requestSort('jobNumber')} className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px] cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">เลขที่งาน {sortConfig?.key === 'jobNumber' && (sortConfig.direction === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}</div>
              </th>
              <th onClick={() => requestSort('customerName')} className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px] cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">ลูกค้า / รายการ {sortConfig?.key === 'customerName' && (sortConfig.direction === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}</div>
              </th>
              <th onClick={() => requestSort('paymentMethod')} className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px] cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">รูปแบบการชำระเงิน {sortConfig?.key === 'paymentMethod' && (sortConfig.direction === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}</div>
              </th>
              <th onClick={() => requestSort('dueDate')} className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px] cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">วันครบกำหนด {sortConfig?.key === 'dueDate' && (sortConfig.direction === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}</div>
              </th>
              <th onClick={() => requestSort('status')} className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px] cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">สถานะ {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}</div>
              </th>
              <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px] text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedTasks.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
            {sortedTasks.map(task => {
              const isCompleted = task.status === 'ตรวจสอบและบันทึกแล้ว';
              const isOverdue = !isCompleted && new Date(task.dueDate) < new Date();

              return (
                <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <a
                      href={`/jobs?highlight=${task.job?.id}`}
                      className="font-mono font-black text-brand-red hover:underline"
                    >
                      {task.job?.jobNumber}
                    </a>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-gray-900">{task.job?.customerName}</p>
                    <p className="text-xs text-gray-500">{task.job?.item}</p>
                    {task.job?.jobType && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                        {task.job?.jobType}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                      {task.installmentNo 
                        ? `ผ่อนชำระ (งวดที่ ${task.installmentNo}/${task.installmentTotal})` 
                        : (task.job?.paymentMethod || '-')}
                    </span>
                    {task.installmentAmount && (
                       <p className="text-[10px] text-gray-500 mt-1 font-bold">฿{task.installmentAmount.toLocaleString()}</p>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                      {isOverdue && <AlertCircle size={14} />}
                      {formatDate(task.dueDate)}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      isCompleted 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700 animate-pulse'
                    }`}>
                      {task.status}
                    </span>
                    {task.note && (
                      <p className="text-[10px] text-gray-500 mt-1 italic max-w-[150px] truncate">
                        หมายเหตุ: {task.note}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedJobId(task.job?.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 shadow-sm"
                    >
                      <Eye size={12} />
                      ดูรายละเอียด
                    </button>
                    {!isCompleted && (
                      <button
                        disabled={isPending}
                        onClick={() => handleUpdate(task.id, 'ตรวจสอบและบันทึกแล้ว')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                      >
                        <CheckCircle size={14} />
                        ยืนยันการรับเงิน
                      </button>
                    )}
                    {isCompleted && task.paidDate && (
                      <span className="inline-block text-xs text-gray-400 font-medium ml-2">
                        อัปเดตเมื่อ: {formatDate(task.paidDate)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
