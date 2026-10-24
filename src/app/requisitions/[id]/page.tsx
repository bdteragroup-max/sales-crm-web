import React from 'react';
import { getUser } from '@/app/lib/dal';
import { getRequisitionById } from '@/app/actions/requisitions';
import { Package, Clock, Image as ImageIcon, Wrench, Building2, CheckCircle2, RotateCcw, Truck, XCircle } from 'lucide-react';
import Link from 'next/link';
import RequisitionDetailActions from './RequisitionDetailActions';

export const metadata = {
  title: 'รายละเอียดใบเบิก/ยืมของ - TeraSales',
};

export default async function RequisitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUser();
  if (!session) return <div>Unauthorized</div>;

  const res = await getRequisitionById(id);
  const requisition = res.success ? res.data : null;

  if (!requisition) {
    return <div className="p-8 text-center text-gray-500">ไม่พบคำขอใบเบิก/ยืมของ</div>;
  }

  // Authorization: Only Requester or Approver can view their own, or maybe we just allow it since it's a known URL.
  if (requisition.requesterId !== session.id && requisition.approverId !== session.id) {
    return <div className="p-8 text-center text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  const returnPhotos = Array.isArray(requisition.returnRequestPhotos) ? requisition.returnRequestPhotos : [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/requisitions"
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
          >
            &larr;
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Package className="text-red-600" />
              รายละเอียดใบเบิก/ยืมวัสดุอุปกรณ์
            </h1>
            <p className="text-gray-500 mt-1">ข้อมูลการขอเบิก/ยืมวัสดุอุปกรณ์ของคุณ</p>
          </div>
        </div>
        
        <RequisitionDetailActions requisition={requisition} currentUserId={session.id} />
      </div>

      {/* Return Request Notification Banner if pending */}
      {(requisition.status === 'RETURN_PENDING' || requisition.returnRequestedAt) && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
              <Clock size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-amber-900 text-sm flex items-center gap-2">
                <span>แจ้งขอส่งคืนอุปกรณ์เข้าสโตร์แล้ว</span>
                <span className="text-[11px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
                  รอเจ้าหน้าที่สโตร์ตรวจรับของ
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5">
                เวลาที่แจ้ง: {requisition.returnRequestedAt ? new Date(requisition.returnRequestedAt).toLocaleString('th-TH') : '-'}
                {requisition.returnRequestNote && (
                  <span className="block mt-1 font-medium text-amber-950">
                    หมายเหตุ: "{requisition.returnRequestNote}"
                  </span>
                )}
              </p>
            </div>
          </div>

          {returnPhotos.length > 0 && (
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              <span className="text-xs text-amber-700 font-medium flex items-center gap-1 mr-1">
                <ImageIcon size={14} /> รูปถ่ายแนบ ({returnPhotos.length}):
              </span>
              <div className="flex -space-x-2">
                {returnPhotos.map((img: any, idx: number) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={idx}
                    src={typeof img === 'string' ? img : String(img)}
                    alt="Return Tool"
                    className="w-8 h-8 rounded-lg object-cover border-2 border-white shadow-sm"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">รายละเอียดใบเบิก/ยืมของ</h2>
            {requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200 font-semibold flex items-center gap-1.5">
                <Wrench size={13} />
                <span>เบิกยืมสโตร์ (อุปกรณ์)</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-200 font-semibold flex items-center gap-1.5">
                <Building2 size={13} />
                <span>เบิกของงานโครงการ</span>
              </span>
            )}
          </div>
          <span className={`px-3 py-1 text-sm font-bold rounded-full inline-flex items-center gap-1.5 ${
            requisition.status === 'RETURNED' ? 'bg-teal-100 text-teal-800' :
            requisition.status === 'PARTIALLY_RETURNED' ? 'bg-amber-100 text-amber-800' :
            requisition.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 
            requisition.status === 'DISPATCHED' ? 'bg-purple-100 text-purple-800' :
            requisition.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
            requisition.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {requisition.status === 'RETURNED' ? (
              <>
                <CheckCircle2 size={14} />
                <span>คืนสโตร์ครบถ้วนแล้ว</span>
              </>
            ) : requisition.status === 'PARTIALLY_RETURNED' ? (
              <>
                <RotateCcw size={14} />
                <span>คืนของบางส่วน</span>
              </>
            ) : requisition.status === 'COMPLETED' ? (
              <>
                <CheckCircle2 size={14} />
                <span>รับของแล้ว</span>
              </>
            ) : requisition.status === 'DISPATCHED' ? (
              <>
                <Truck size={14} />
                <span>อยู่ระหว่างจัดส่ง</span>
              </>
            ) : requisition.status === 'APPROVED' ? (
              <>
                <Clock size={14} />
                <span>รอสโตร์จัดของ/ส่งมอบ</span>
              </>
            ) : requisition.status === 'REJECTED' ? (
              <>
                <XCircle size={14} />
                <span>ไม่อนุมัติ</span>
              </>
            ) : (
              <>
                <Clock size={14} />
                <span>รออนุมัติ</span>
              </>
            )}
          </span>
        </div>

        {/* Metadata Grid (Adapted for Type) */}
        {requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">เลขที่ใบเบิกยืม</p>
              <p className="font-bold text-slate-900 text-base">{requisition.requisitionNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">วันที่เริ่มยืม</p>
              <p className="font-bold text-slate-900">{new Date(requisition.date).toLocaleDateString('th-TH')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-900 mb-1">กำหนดส่งคืนสโตร์</p>
              <p className="font-black text-rose-600 text-sm">
                {requisition.deliveryDate ? new Date(requisition.deliveryDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">สาขา / คลังที่ยืม</p>
              <p className="font-semibold text-slate-800">{requisition.branch || 'BKK-HQ'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-slate-500 mb-1">วัตถุประสงค์ในการยืม</p>
              <p className="font-bold text-amber-950">{requisition.deliveryNote || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">สถานที่นำไปใช้งาน</p>
              <p className="font-semibold text-slate-800">{requisition.destinationSite || '-'}</p>
            </div>
            {requisition.projectName && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">โครงการที่เกี่ยวข้อง</p>
                <p className="font-semibold text-blue-700">{requisition.projectName}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">เลขที่ใบเบิกโครงการ</p>
              <p className="font-bold text-slate-900 text-base">{requisition.requisitionNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">วันที่ทำรายการ</p>
              <p className="font-bold text-slate-900">{new Date(requisition.date).toLocaleDateString('th-TH')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">วันส่งของถึงหน้างาน</p>
              <p className="font-bold text-blue-700">
                {requisition.deliveryDate ? new Date(requisition.deliveryDate).toLocaleDateString('th-TH') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">สาขาผู้จัดส่ง</p>
              <p className="font-semibold text-slate-800">{requisition.branch || 'BKK-HQ'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-slate-500 mb-1">โครงการ / ชื่องานติดตั้ง</p>
              <p className="font-bold text-blue-800 text-sm">{requisition.projectName || '-'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-slate-500 mb-1">ไซต์งานติดตั้ง (Site Address)</p>
              <p className="font-semibold text-slate-800">{requisition.destinationSite || '-'}</p>
            </div>
            {requisition.deliveryNote && (
              <div className="sm:col-span-4">
                <p className="text-xs font-semibold text-slate-500 mb-1">วิธีการจัดส่ง & ผู้รับหน้างาน</p>
                <p className="text-slate-700">{requisition.deliveryNote}</p>
              </div>
            )}
          </div>
        )}

        {/* Items Table (Adapted for Type) */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
            <span>
              {requisition.requisitionType === 'BORROW_EQUIPMENT'
                ? `รายการเครื่องมือ/อุปกรณ์ที่ยืม (${(requisition.items as any[])?.length || 0} รายการ)`
                : `รายการวัสดุ-อุปกรณ์เข้าโครงการ (${(requisition.items as any[])?.length || 0} รายการ)`}
            </span>
          </h3>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-700 font-bold uppercase">
                  <th className="px-3 py-3 w-12 text-center">ลำดับ</th>
                  <th className="px-4 py-3">
                    {requisition.requisitionType === 'BORROW_EQUIPMENT' ? 'ชื่อเครื่องมือ / อุปกรณ์' : 'รายการวัสดุ / อุปกรณ์'}
                  </th>
                  {requisition.requisitionType === 'BORROW_EQUIPMENT' && (
                    <th className="px-3 py-3 w-32">รหัส / Serial No.</th>
                  )}
                  <th className="px-3 py-3 text-center w-24">จำนวน</th>
                  <th className="px-3 py-3 text-center w-24">หน่วย</th>
                  {requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
                    <>
                      <th className="px-3 py-3 w-36">สภาพก่อนยืม</th>
                      <th className="px-4 py-3 text-center bg-teal-50 text-teal-800">สถานะการคืนสโตร์</th>
                      <th className="px-4 py-3">อุปกรณ์เสริม / หมายเหตุ</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 w-44">งานที่ใช้ / Sub-Job</th>
                      <th className="px-4 py-3">หมายเหตุ</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(requisition.items as any[] || []).map((item: any, index: number) => {
                  const isReturned = (Number(item.returnedQuantity) || 0) >= item.quantity;
                  const isPartiallyReturned = (Number(item.returnedQuantity) || 0) > 0 && !isReturned;

                  return (
                    <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-3 text-center text-slate-400 font-bold">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.detail}</td>
                      {requisition.requisitionType === 'BORROW_EQUIPMENT' && (
                        <td className="px-3 py-3 font-mono text-xs text-slate-600">{item.assetCode || '-'}</td>
                      )}
                      <td className="px-3 py-3 text-center font-bold text-slate-800">{item.quantity}</td>
                      <td className="px-3 py-3 text-center text-slate-600">{item.unit}</td>

                      {requisition.requisitionType === 'BORROW_EQUIPMENT' ? (
                        <>
                          <td className="px-3 py-3 text-xs text-slate-700">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                              {item.condition || 'ปกติ'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center bg-teal-50/30">
                            {isReturned ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                                คืนแล้ว ({item.returnedQuantity} {item.unit})
                              </span>
                            ) : isPartiallyReturned ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                คืนแล้ว {item.returnedQuantity}/{item.quantity} (ค้าง {item.quantity - item.returnedQuantity})
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">
                                ยังไม่ได้คืน
                              </span>
                            )}
                            {item.returnCondition && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                สภาพตอนคืน: {item.returnCondition === 'NORMAL' ? 'ปกติ' : item.returnCondition === 'DAMAGED' ? 'ชำรุด' : item.returnCondition === 'BROKEN' ? 'เสียหาย' : 'สูญหาย'}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">{item.remark || '-'}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-slate-700">{item.job || '-'}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{item.remark || '-'}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signatures & Tracking */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-100 text-center text-xs">
          <div className="flex flex-col items-center">
            <span className="font-semibold text-gray-700 mb-2">1. ผู้ขอเบิก/ผู้ยืม</span>
            <div className="w-full h-16 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200 p-1">
              {requisition.requesterSignatureUrl ? (
                <img src={requisition.requesterSignatureUrl} alt="Requester" className="max-h-full object-contain" />
              ) : (
                <span className="text-gray-400">ไม่มีลายเซ็น</span>
              )}
            </div>
            <p className="text-gray-800 font-medium mt-1">({requisition.requester?.fullName || 'ผู้ขอเบิก'})</p>
          </div>

          <div className="flex flex-col items-center">
            <span className="font-semibold text-gray-700 mb-2">2. ผู้อนุมัติ</span>
            <div className="w-full h-16 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200 p-1">
              {requisition.approverSignatureUrl ? (
                <img src={requisition.approverSignatureUrl} alt="Approver" className="max-h-full object-contain" />
              ) : (
                <span className="text-gray-400">รออนุมัติ</span>
              )}
            </div>
            <p className="text-gray-800 font-medium mt-1">({requisition.approver?.fullName || 'ผู้อนุมัติ'})</p>
          </div>

          <div className="flex flex-col items-center">
            <span className="font-semibold text-gray-700 mb-2">3. สโตร์ผู้จ่ายของ</span>
            <div className="w-full h-16 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200 p-1">
              {requisition.storeStaffSignatureUrl ? (
                <img src={requisition.storeStaffSignatureUrl} alt="Store Staff" className="max-h-full object-contain" />
              ) : (
                <span className="text-gray-400">รอสโตร์จ่ายของ</span>
              )}
            </div>
            <p className="text-gray-800 font-medium mt-1">({requisition.storeStaffName || 'เจ้าหน้าที่สโตร์'})</p>
          </div>

          <div className="flex flex-col items-center">
            <span className="font-semibold text-gray-700 mb-2">4. ผู้รับของ / ผู้ส่งคืน</span>
            <div className="w-full h-16 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200 p-1">
              {requisition.receiverSignatureUrl ? (
                <img src={requisition.receiverSignatureUrl} alt="Receiver" className="max-h-full object-contain" />
              ) : (
                <span className="text-gray-400">รอเซ็นรับของ</span>
              )}
            </div>
            <p className="text-gray-800 font-medium mt-1">({requisition.receiverName || 'ผู้รับของ'})</p>
          </div>
        </div>
      </div>
    </div>
  );
}
