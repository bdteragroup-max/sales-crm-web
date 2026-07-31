"use client";

import React, { useState, useTransition, useEffect } from "react";
import { DollarSign, Search, CheckCircle, Clock, AlertCircle, Eye, X, Loader2, ClipboardList, ChevronUp, ChevronDown, Filter, Download, Award } from "lucide-react";
import * as XLSX from "xlsx";
import { updatePaymentTaskStatus, recordPaymentDeposit, updatePaymentTaskCreditType } from "@/app/actions/accounting";

function formatDate(d: string | Date) {
  const date = new Date(d);
  let year = date.getFullYear();
  if (year < 2500) year += 543;
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${year}`;
}

function CompanyBadge({ code }: { code: string }) {
  const styles: Record<string, string> = {
    TP: "bg-blue-50 text-blue-800 border-blue-200",
    TG: "bg-green-50 text-green-800 border-green-200",
    TE: "bg-amber-50 text-amber-800 border-amber-200",
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${styles[code] ?? "bg-gray-100 text-gray-700"}`}>
      {code}
    </span>
  );
}

function JobDetailModal({
  jobId,
  onClose,
  onConfirmPayment,
  onRecordDeposit,
  onUpdateCreditType,
  isPending
}: {
  jobId: string,
  onClose: () => void,
  onConfirmPayment: (id: string, status: string, note: string, invoiceNumber?: string, invoiceDate?: string) => void,
  onRecordDeposit: (id: string, amount: number, note: string) => void,
  onUpdateCreditType: (id: string, creditType: string) => void,
  isPending: boolean
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [confirmPaymentModal, setConfirmPaymentModal] = useState<{ id: string, status: string } | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');

  useEffect(() => {
    fetch(`/api/accounting/job/${jobId}`, { cache: 'no-store' })
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

  const { job, quotation, company, paymentTasks, stepLogs, project } = data;
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

          {/* Quotation / Project Info */}
          <section>
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">
              {project ? 'ข้อมูลโปรเจค (Project Info)' : 'ข้อมูลใบเสนอราคา'}
            </h3>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 grid grid-cols-2 gap-y-3 gap-x-6">
              <div>
                <p className="text-xs text-blue-500/70 mb-1">{project ? 'เลขที่โปรเจค' : 'เลขที่ใบเสนอราคา'}</p>
                <p className="text-sm font-bold text-blue-900">{project?.projectNumber || quotation?.quotationNumber || job.quotationNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500/70 mb-1">วันที่</p>
                <p className="text-sm font-medium text-blue-900">
                  {project?.contractSigningDate
                    ? formatDate(project.contractSigningDate)
                    : (quotation?.quotationDate ? formatDate(quotation.quotationDate) : '-')}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-500/70 mb-1">มูลค่ารวมก่อน VAT</p>
                <p className="text-sm font-black text-blue-700">
                  {project?.projectValue
                    ? `฿${Number(project.projectValue).toLocaleString()}`
                    : (quotation?.totalAmountBeforeVat ? `฿${quotation.totalAmountBeforeVat.toLocaleString()}` : '-')}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-500/70 mb-1">สินค้า/บริการ</p>
                <p className="text-sm font-medium text-blue-900">{project?.name || quotation?.subject || job.item || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500/70 mb-1">ผู้รับผิดชอบ (Sales)</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-blue-900">{project?.contractSignatory || quotation?.salesperson?.fullName || job.sellerName || '-'}</p>
                  {(data.awardedGold || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full shadow-sm border border-yellow-200">
                      <Award size={12} /> {data.awardedGold} เหรียญทอง
                    </span>
                  )}
                </div>
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

                    {((pt.job?.paymentMethod || pt.paymentMethod || job.paymentMethod) !== 'เงินสด' && (pt.job?.paymentMethod || pt.paymentMethod || job.paymentMethod) !== 'จ่ายแล้ว') && (
                      <div className="col-span-2">
                        <p className="text-xs text-emerald-600/70 mb-1">รูปแบบการให้เครดิต (ถ้ามี)</p>
                        {ptIsCompleted ? (
                          <p className="text-sm font-bold text-gray-800">{pt.creditType || '-'}</p>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="ระบุรูปแบบเครดิต (เช่น เช็ค, LC, ฯลฯ)"
                              defaultValue={pt.creditType || ''}
                              onBlur={(e) => {
                                if(e.target.value !== (pt.creditType || '')) {
                                  onUpdateCreditType(pt.id, e.target.value);
                                  setData((prev: any) => ({
                                    ...prev,
                                    paymentTasks: prev.paymentTasks.map((t: any) => t.id === pt.id ? { ...t, creditType: e.target.value } : t)
                                  }));
                                }
                              }}
                              className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                            />
                            <span className="text-[10px] text-gray-400 self-center whitespace-nowrap">บันทึกอัตโนมัติเมื่อคลิกออก</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="col-span-2 flex items-center justify-between mt-2">
                      <div>
                        <p className="text-xs text-emerald-600/70 mb-1">สถานะ</p>
                        <p className="text-sm font-bold flex items-center gap-1.5">
                          {ptIsCompleted ? (
                            <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={14} /> ตรวจสอบและบันทึกแล้ว</span>
                          ) : pt.status === 'ชำระมัดจำแล้ว' ? (
                            <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={14} /> ชำระมัดจำแล้ว</span>
                          ) : (
                            <span className="text-amber-600 flex items-center gap-1"><Clock size={14} /> {pt.status || 'รอดำเนินการ'}</span>
                          )}
                        </p>
                      </div>
                      {!ptIsCompleted && (
                        <div className="flex gap-2">
                          {(!pt.paidAmount || pt.paidAmount === 0) && (
                            <button
                              disabled={isPending}
                              onClick={() => setShowDepositModal(pt.id)}
                              className="flex items-center gap-2 px-3 py-2 bg-white border border-emerald-600 hover:bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            >
                              บันทึกเงินมัดจำ
                            </button>
                          )}
                          <button
                            disabled={isPending}
                            onClick={() => setConfirmPaymentModal({ id: pt.id, status: 'ตรวจสอบและบันทึกแล้ว' })}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                          >
                            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle size={14} />}
                            ยืนยันรับเงิน
                          </button>
                        </div>
                      )}
                    </div>
                    {ptIsCompleted && (pt.invoiceNumber || pt.invoiceDate) && (
                      <div className="col-span-2 bg-emerald-100/50 p-3 rounded-lg border border-emerald-200 mt-2 flex gap-8">
                        {pt.invoiceNumber && (
                          <div>
                            <p className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider mb-0.5">เลขที่ใบกำกับภาษี / ใบเสร็จ</p>
                            <p className="text-sm font-black text-emerald-900">{pt.invoiceNumber}</p>
                          </div>
                        )}
                        {pt.invoiceDate && (
                          <div>
                            <p className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider mb-0.5">วันที่ในเอกสาร</p>
                            <p className="text-sm font-black text-emerald-900">{formatDate(pt.invoiceDate)}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {pt.paidAmount !== null && pt.paidAmount !== undefined && pt.paidAmount > 0 && !ptIsCompleted && (
                      <div className="col-span-2 bg-white/50 p-3 rounded-lg border border-emerald-100/50 mt-1">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-bold text-emerald-700">มัดจำแล้ว: ฿{pt.paidAmount.toLocaleString()}</p>
                          <p className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                            {(((pt.paidAmount) / (project?.projectValue || quotation?.actualClosingAmount || quotation?.totalAmountBeforeVat || pt.installmentAmount || 1)) * 100).toFixed(2)}%
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          ยอดคงเหลือที่ต้องชำระ: ฿{((pt.installmentAmount || project?.projectValue || quotation?.actualClosingAmount || quotation?.totalAmountBeforeVat || 0) - pt.paidAmount).toLocaleString()}
                        </p>
                      </div>
                    )}
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

        {/* Deposit Modal */}
        {showDepositModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl relative">
              <button onClick={() => { setShowDepositModal(null); setDepositAmount(''); }} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
              <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-600" />
                บันทึกเงินมัดจำ
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">ยอดเงินมัดจำที่ได้รับ (บาท)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 mb-3"
                  placeholder="0.00"
                  autoFocus
                />

                <label className="block text-sm font-bold text-gray-700 mb-1">หมายเหตุสำหรับการมัดจำ (ถ้ามี)</label>
                <input
                  type="text"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="พิมพ์หมายเหตุ..."
                />
              </div>

              {depositAmount && !isNaN(Number(depositAmount)) && (
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-emerald-800">คิดเป็น:</span>
                    <span className="text-lg font-black text-emerald-700">
                      {((Number(depositAmount) / (project?.projectValue || quotation?.actualClosingAmount || quotation?.totalAmountBeforeVat || 1)) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">ของยอดรวมทั้งหมด ฿{(project?.projectValue || quotation?.actualClosingAmount || quotation?.totalAmountBeforeVat || 0).toLocaleString()}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDepositModal(null); setDepositAmount(''); setDepositNote(''); }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    const amt = Number(depositAmount);
                    if (amt > 0 && showDepositModal) {
                      onRecordDeposit(showDepositModal, amt, depositNote);
                      setData((prev: any) => ({
                        ...prev,
                        paymentTasks: prev.paymentTasks?.map((pt: any) => pt.id === showDepositModal ? {
                          ...pt,
                          status: 'ชำระมัดจำแล้ว',
                          paidAmount: amt,
                          note: depositNote || pt.note
                        } : pt)
                      }));
                      setShowDepositModal(null);
                      setDepositAmount('');
                      setDepositNote('');
                    }
                  }}
                  disabled={!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0 || isPending}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Payment Modal */}
        {confirmPaymentModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl relative">
              <button onClick={() => { setConfirmPaymentModal(null); setPaymentNote(''); setInvoiceNumber(''); setInvoiceDate(''); }} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
              <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle size={20} className="text-emerald-600" />
                ยืนยันการรับเงิน
              </h3>

              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">เลขที่ใบกำกับภาษี / ใบเสร็จ</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="เช่น INV-2023-001"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">วันที่ในใบกำกับภาษี / ใบเสร็จ</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">หมายเหตุ (ถ้ามี)</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="พิมพ์หมายเหตุ..."
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmPaymentModal(null); setPaymentNote(''); setInvoiceNumber(''); setInvoiceDate(''); }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    onConfirmPayment(confirmPaymentModal.id, confirmPaymentModal.status, paymentNote, invoiceNumber, invoiceDate);
                    setData((prev: any) => ({
                      ...prev,
                      paymentTasks: prev.paymentTasks?.map((pt: any) => pt.id === confirmPaymentModal.id ? {
                        ...pt,
                        status: confirmPaymentModal.status,
                        note: paymentNote || pt.note,
                        invoiceNumber: invoiceNumber || pt.invoiceNumber,
                        invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : pt.invoiceDate,
                        paidDate: confirmPaymentModal.status === 'ตรวจสอบและบันทึกแล้ว' ? new Date().toISOString() : pt.paidDate
                      } : pt)
                    }));
                    setConfirmPaymentModal(null);
                    setPaymentNote('');
                    setInvoiceNumber('');
                    setInvoiceDate('');
                  }}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        )}

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

  const [confirmPaymentModal, setConfirmPaymentModal] = useState<{ id: string, status: string } | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');

  // Filters
  const [filterJobNumber, setFilterJobNumber] = useState("");
  const [filterCustomerItem, setFilterCustomerItem] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSalesperson, setFilterSalesperson] = useState("");

  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const uniqueJobTypes = Array.from(new Set(tasks.map(t => t.job?.jobType).filter(Boolean)));
  const uniquePaymentMethods = Array.from(new Set(tasks.map(t => t.job?.paymentMethod).filter(Boolean)));
  const uniqueYears = Array.from(new Set(tasks.map(t => t.job?.yearBe).filter(Boolean))).sort((a, b) => Number(b) - Number(a));
  const uniqueSalespersons = Array.from(new Set(tasks.map(t => t.job?.project?.contractSignatory || t.job?.quotation?.salesperson?.fullName || t.job?.sellerName).filter(Boolean))).sort();

  const handleUpdate = (id: string, status: string, note: string = "", invoiceNumber?: string, invoiceDate?: string) => {
    startTransition(async () => {
      await updatePaymentTaskStatus(id, status, note, invoiceNumber, invoiceDate);
      setTasks(prev => prev.map(t => t.id === id ? {
        ...t,
        status,
        note: note || t.note,
        invoiceNumber: invoiceNumber || t.invoiceNumber,
        invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : t.invoiceDate,
        paidDate: status === 'ตรวจสอบและบันทึกแล้ว' ? new Date().toISOString() : t.paidDate
      } : t));
    });
  };

  const handleRecordDeposit = (id: string, amount: number, note: string = "") => {
    startTransition(async () => {
      await recordPaymentDeposit(id, amount, note);
      setTasks(prev => prev.map(t => t.id === id ? {
        ...t,
        status: 'ชำระมัดจำแล้ว',
        paidAmount: amount,
        note: note || t.note
      } : t));
    });
  };

  const handleUpdateCreditType = (id: string, creditType: string) => {
    startTransition(async () => {
      await updatePaymentTaskCreditType(id, creditType);
      setTasks(prev => prev.map(t => t.id === id ? {
        ...t,
        creditType
      } : t));
    });
  };

  const groupedJobs = React.useMemo(() => {
    const map = new Map<string, any>();
    tasks.forEach(t => {
      if (!t.job) return;
      if (!map.has(t.job.id)) {
        map.set(t.job.id, {
          id: t.job.id,
          job: t.job,
          tasks: []
        });
      }
      map.get(t.job.id).tasks.push(t);
    });

    const groups = Array.from(map.values());
    groups.forEach(g => {
      g.tasks.sort((a: any, b: any) => (a.installmentNo || 0) - (b.installmentNo || 0));
    });
    return groups;
  }, [tasks]);

  const filtered = groupedJobs.filter(g => {
    // text match
    const qJob = filterJobNumber.toLowerCase();
    const matchesJobNumber = !qJob || g.job?.jobNumber?.toLowerCase().includes(qJob);

    const qCust = filterCustomerItem.toLowerCase();
    const matchesCustomerItem = !qCust || (
      g.job?.customerName?.toLowerCase().includes(qCust) ||
      g.job?.item?.toLowerCase().includes(qCust)
    );

    const matchesPayment = !filterPaymentMethod ||
      g.job?.paymentMethod === filterPaymentMethod ||
      (filterPaymentMethod === 'ผ่อนชำระ' && g.tasks.some((t: any) => t.installmentNo));

    // company match
    let matchesCompany = true;
    if (filterCompany) {
      matchesCompany = g.job?.companyCode === filterCompany || false;
    }

    const allCompleted = g.tasks.every((t: any) => t.status === 'ตรวจสอบและบันทึกแล้ว');
    const groupedStatus = allCompleted ? 'ตรวจสอบและบันทึกแล้ว' : 'รอดำเนินการ';
    const matchesStatus = !filterStatus || groupedStatus === filterStatus;

    const matchesJobType = selectedJobTypes.length === 0 || selectedJobTypes.includes(g.job?.jobType);
    const matchesMonth = !filterMonth || g.job?.month === parseInt(filterMonth);
    const matchesYear = !filterYear || g.job?.yearBe === parseInt(filterYear);

    const qSales = filterSalesperson.toLowerCase();
    const matchesSalesperson = !qSales || (
      g.job?.sellerName?.toLowerCase().includes(qSales) ||
      g.job?.project?.contractSignatory?.toLowerCase().includes(qSales) ||
      g.job?.quotation?.salesperson?.fullName?.toLowerCase().includes(qSales)
    );

    return matchesJobNumber && matchesCustomerItem && matchesPayment && matchesCompany && matchesStatus && matchesJobType && matchesMonth && matchesYear && matchesSalesperson;
  });

  const sortedJobs = React.useMemo(() => {
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
        } else if (sortConfig.key === 'company') {
          aValue = a.job?.companyCode || '';
          bValue = b.job?.companyCode || '';
        } else if (sortConfig.key === 'status') {
          aValue = a.tasks.every((t: any) => t.status === 'ตรวจสอบและบันทึกแล้ว') ? 'ตรวจสอบและบันทึกแล้ว' : 'รอดำเนินการ';
          bValue = b.tasks.every((t: any) => t.status === 'ตรวจสอบและบันทึกแล้ว') ? 'ตรวจสอบและบันทึกแล้ว' : 'รอดำเนินการ';
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

  const exportToExcel = () => {
    const data = sortedJobs.flatMap((g: any) => {
      return g.tasks.map((t: any) => {
        const isPaid = t.status === 'ตรวจสอบและบันทึกแล้ว';
        let creditDaysLeft = '-';
        if (!isPaid && t.dueDate) {
          const diff = new Date(t.dueDate).getTime() - new Date().getTime();
          creditDaysLeft = Math.ceil(diff / (1000 * 3600 * 24)).toString();
        }

        const totalValue = g.job?.quotation?.actualClosingAmount || g.job?.quotation?.totalAmountBeforeVat || 0;
        const amountDue = t.installmentAmount || (t.installmentNo ? 0 : totalValue);

        return {
          'เลขที่งาน (Job No.)': g.job?.jobNumber || '-',
          'ชื่อลูกค้า (Customer)': g.job?.customerName || '-',
          'บริษัท (Company)': g.job?.companyCode || '-',
          'รูปแบบการชำระเงิน': g.job?.paymentMethod || '-',
          'ยอดรวมทั้งโครงการ': totalValue,
          'งวดที่': t.installmentNo ? `${t.installmentNo}/${t.installmentTotal}` : '-',
          'ยอดเงินงวดนี้': amountDue,
          'วันครบกำหนด': t.dueDate ? formatDate(t.dueDate) : '-',
          'วันเครดิตคงเหลือ (วัน)': creditDaysLeft,
          'สถานะการชำระเงิน': t.status || '-'
        };
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Tasks");
    XLSX.writeFile(workbook, `Accounting_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const pendingJobs = filtered.filter(g => g.tasks.some((t: any) => t.status !== 'ตรวจสอบและบันทึกแล้ว'));
  const completedJobs = filtered.filter(g => g.tasks.every((t: any) => t.status === 'ตรวจสอบและบันทึกแล้ว'));

  return (
    <div className="p-8">
      {selectedJobId && (
        <JobDetailModal
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onConfirmPayment={handleUpdate}
          onRecordDeposit={handleRecordDeposit}
          onUpdateCreditType={handleUpdateCreditType}
          isPending={isPending}
        />
      )}

      {/* Confirm Payment Modal for Main Page */}
      {confirmPaymentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl relative">
            <button onClick={() => { setConfirmPaymentModal(null); setPaymentNote(''); setInvoiceNumber(''); setInvoiceDate(''); }} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-emerald-600" />
              ยืนยันการรับเงิน
            </h3>

            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">เลขที่ใบกำกับภาษี / ใบเสร็จ</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="เช่น INV-2023-001"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">วันที่ในใบกำกับภาษี / ใบเสร็จ</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">หมายเหตุ (ถ้ามี)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="พิมพ์หมายเหตุ..."
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmPaymentModal(null); setPaymentNote(''); setInvoiceNumber(''); setInvoiceDate(''); }}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  handleUpdate(confirmPaymentModal.id, confirmPaymentModal.status, paymentNote, invoiceNumber, invoiceDate);
                  setConfirmPaymentModal(null);
                  setPaymentNote('');
                  setInvoiceNumber('');
                  setInvoiceDate('');
                }}
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
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
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            <Download size={18} />
            Export to Excel
          </button>

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
          <label className="block text-xs font-bold text-gray-500 mb-1">ผู้รับผิดชอบ (Sales)</label>
          <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white" value={filterSalesperson} onChange={e => setFilterSalesperson(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {uniqueSalespersons.map(s => <option key={s as string} value={s as string}>{s as React.ReactNode}</option>)}
          </select>
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
          <label className="block text-xs font-bold text-gray-500 mb-1">บริษัท</label>
          <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white" value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
            <option value="">ทั้งหมด</option>
            <option value="TP">TP</option>
            <option value="TG">TG</option>
            <option value="TE">TE</option>
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-500 mb-1">สถานะ</label>
          <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">ทั้งหมด</option>
            <option value="รอดำเนินการ">รอดำเนินการ</option>
            <option value="ชำระมัดจำแล้ว">ชำระมัดจำแล้ว</option>
            <option value="ตรวจสอบและบันทึกแล้ว">ตรวจสอบและบันทึกแล้ว</option>
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-500 mb-1">เดือน (ของงาน)</label>
          <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <option value="">ทุกเดือน</option>
            {[
              { v: 1, l: 'มกราคม' }, { v: 2, l: 'กุมภาพันธ์' }, { v: 3, l: 'มีนาคม' }, { v: 4, l: 'เมษายน' },
              { v: 5, l: 'พฤษภาคม' }, { v: 6, l: 'มิถุนายน' }, { v: 7, l: 'กรกฎาคม' }, { v: 8, l: 'สิงหาคม' },
              { v: 9, l: 'กันยายน' }, { v: 10, l: 'ตุลาคม' }, { v: 11, l: 'พฤศจิกายน' }, { v: 12, l: 'ธันวาคม' }
            ].map(m => (
              <option key={m.v} value={m.v}>{m.l}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[100px]">
          <label className="block text-xs font-bold text-gray-500 mb-1">ปี (ของงาน)</label>
          <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">ทุกปี</option>
            {uniqueYears.map(y => (
              <option key={y as number} value={y as number}>{y as React.ReactNode}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setFilterJobNumber(''); setFilterCustomerItem(''); setFilterPaymentMethod(''); setFilterCompany(''); setFilterStatus(''); setFilterMonth(''); setFilterYear(''); setFilterSalesperson(''); setSelectedJobTypes([]); }}
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
            <p className="text-3xl font-black text-amber-900">{pendingJobs.length} งาน</p>
          </div>
        </div>

        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-700">ตรวจสอบแล้ว</p>
            <p className="text-3xl font-black text-emerald-900">{completedJobs.length} งาน</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th onClick={() => requestSort('jobNumber')} className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px] cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">เลขที่งาน {sortConfig?.key === 'jobNumber' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
              </th>
              <th onClick={() => requestSort('customerName')} className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px] cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">ลูกค้า / รายการ {sortConfig?.key === 'customerName' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
              </th>
              <th onClick={() => requestSort('paymentMethod')} className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px] cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">รูปแบบการชำระเงิน {sortConfig?.key === 'paymentMethod' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
              </th>
              <th onClick={() => requestSort('company')} className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px] cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">บริษัท {sortConfig?.key === 'company' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
              </th>
              <th onClick={() => requestSort('status')} className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px] cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">สถานะ {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
              </th>
              <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px] text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedJobs.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
            {sortedJobs.map(group => {
              const allCompleted = group.tasks.every((t: any) => t.status === 'ตรวจสอบและบันทึกแล้ว');
              const completedCount = group.tasks.filter((t: any) => t.status === 'ตรวจสอบและบันทึกแล้ว').length;
              const hasInstallments = group.tasks.length > 1 || group.tasks.some((t: any) => t.installmentNo);
              const isOverdue = !allCompleted && group.tasks.some((t: any) => t.status !== 'ตรวจสอบและบันทึกแล้ว' && new Date(t.dueDate) < new Date());

              const singlePendingTask = group.tasks.find((t: any) => t.status !== 'ตรวจสอบและบันทึกแล้ว');

              return (
                <tr key={group.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <a
                      href={`/jobs?highlight=${group.job?.id}`}
                      className="font-mono font-black text-brand-red hover:underline"
                    >
                      {group.job?.jobNumber}
                    </a>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-gray-900">{group.job?.customerName}</p>
                    <p className="text-xs text-gray-500">{group.job?.item}</p>
                    {group.job?.jobType && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                        {group.job?.jobType}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {hasInstallments ? (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 mb-1">
                          ผ่อนชำระ ({group.tasks.length} งวด)
                        </span>
                        <p className="text-[10px] text-gray-500 font-bold">
                          รวม ฿{group.tasks.reduce((sum: number, t: any) => sum + (Number(t.installmentAmount) || 0), 0).toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {group.job?.paymentMethod || '-'}
                        </span>
                        {group.tasks[0]?.installmentAmount && (
                          <p className="text-[10px] text-gray-500 mt-1 font-bold">฿{group.tasks[0].installmentAmount.toLocaleString()}</p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <CompanyBadge code={group.job?.companyCode || '-'} />
                  </td>
                  <td className="py-4 px-6">
                    {allCompleted ? (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">
                          ตรวจสอบและบันทึกแล้ว
                        </span>
                        {group.tasks[group.tasks.length - 1]?.paidDate && (
                          <p className="text-[10px] text-gray-400 font-medium mt-1">
                            {formatDate(group.tasks[group.tasks.length - 1].paidDate)}
                          </p>
                        )}
                      </div>
                    ) : group.tasks.some((t: any) => t.status === 'ชำระมัดจำแล้ว') ? (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-700">
                          ชำระมัดจำแล้ว {hasInstallments ? `(${completedCount}/${group.tasks.length})` : ''}
                        </span>
                        {isOverdue && <p className="text-[10px] text-red-500 font-bold mt-1">เลยกำหนดชำระ!</p>}
                      </div>
                    ) : (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 animate-pulse">
                          รอดำเนินการ {hasInstallments ? `(${completedCount}/${group.tasks.length})` : ''}
                        </span>
                        {isOverdue && <p className="text-[10px] text-red-500 font-bold mt-1">เลยกำหนดชำระ!</p>}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedJobId(group.job?.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 shadow-sm"
                    >
                      <Eye size={12} />
                      ดูรายละเอียด
                    </button>
                    {!hasInstallments && !allCompleted && singlePendingTask && (
                      <button
                        disabled={isPending}
                        onClick={() => setConfirmPaymentModal({ id: singlePendingTask.id, status: 'ตรวจสอบและบันทึกแล้ว' })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                      >
                        <CheckCircle size={14} />
                        ยืนยันรับเงิน
                      </button>
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
