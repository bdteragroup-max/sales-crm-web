import React, { forwardRef } from 'react';

type RepairOrderDocumentProps = {
  data: any;
  jobData: any;
};

const RepairOrderDocument = forwardRef<HTMLDivElement, RepairOrderDocumentProps>(
  ({ data, jobData }, ref) => {
    
    // Fallbacks
    const safeData = data || {};
    const safeJob = jobData || {};
    const items = Array.isArray(safeData.items) ? safeData.items : [];
    const checklist = safeData.checklist || {};

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return "___/___/___";
      const date = new Date(dateStr);
      return date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const Page = ({ type }: { type: 'สำหรับลูกค้า' | 'สำหรับบริษัท' }) => (
      <div className="w-[210mm] min-h-[297mm] bg-white text-black font-sarabun p-[10mm] relative box-border flex flex-col page-break-after-always print:page-break-after-always mx-auto border border-gray-100 shadow-sm print:border-none print:shadow-none mb-8">
        
        {/* Header - Logos and Badge */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-red-600 font-bold text-3xl italic tracking-tighter">TERA</h1>
            <div className="flex flex-col text-[10px] leading-tight text-red-600 font-bold">
              <span>TERA</span>
              <span>ELECTRIC</span>
            </div>
            <div className="flex flex-col text-[10px] leading-tight text-red-600 font-bold">
              <span>TERA</span>
              <span>POWER</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="border-2 border-red-200 bg-red-50 text-black px-6 py-1 font-bold text-sm">
              {type}
            </div>
            <div className="text-xs mt-2 text-right">
              <p>วันที่: {formatDate(safeData.createdAt)}</p>
              <p>บริษัท: TERA GROUP</p>
            </div>
          </div>
        </div>

        {/* Company Address */}
        <div className="text-[10px] mb-6">
          <p>39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250</p>
          <p>โทร: +66(0) 2328-0801-3 , +66(0)81-3152660 แฟกซ์: +66(0) 2328-0804</p>
        </div>

        {/* Title */}
        <h2 className="text-center text-xl font-bold mb-6">ใบรับซ่อม</h2>

        {/* Two Column Info */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-4">
          <div className="flex flex-col gap-2">
            <div className="flex"><span className="font-bold w-24">เลขที่เอกสาร:</span> <span>{safeJob.jobNumber}</span></div>
            <div className="flex"><span className="font-bold w-24">ชื่อลูกค้า:</span> <span>{safeJob.customerName}</span></div>
            <div className="flex"><span className="font-bold w-24">เลขที่ JOB:</span> <span>{safeJob.jobNumber}</span></div>
            <div className="flex"><span className="font-bold w-24">เลขที่ Invoice:</span> <span>{safeData.invoiceNo || "-"}</span></div>
            <div className="flex"><span className="font-bold w-24">ส่งซ่อมโดย:</span> <span>{safeData.deliveryMethod || "-"}</span></div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex"><span className="font-bold w-28">เบอร์โทร:</span> <span>{safeData.phoneNumber || "-"}</span></div>
            <div className="flex"><span className="font-bold w-28">รูปแบบงาน:</span> <span>{safeData.workType || "ซ่อม"}</span></div>
            <div className="flex"><span className="font-bold w-28">เลขที่ใบส่งสินค้า:</span> <span>{safeData.deliveryNoteNo || "-"}</span></div>
            <div className="flex"><span className="font-bold w-28">ผู้รับซ่อม:</span> <span>{safeData.receiverName || "-"}</span></div>
            <div className="flex"><span className="font-bold w-28">เซลล์ที่รับผิดชอบ:</span> <span>{safeData.handoverRef || safeJob.sellerName || "-"}</span></div>
          </div>
        </div>
        
        {/* Customer Address */}
        <div className="text-xs mb-6 flex">
          <span className="font-bold w-12 shrink-0">ที่อยู่:</span> 
          <span>-</span> {/* Assuming address is not fully available in Job schema right now, but keeping layout */}
        </div>

        {/* Items Table */}
        <table className="w-full text-[10px] border-collapse border border-gray-400 text-center mb-4">
          <thead>
            <tr className="bg-gray-100 font-bold">
              <th className="border border-gray-400 py-1.5 px-1">ลำดับ</th>
              <th className="border border-gray-400 py-1.5 px-1">ประเภทสินค้า</th>
              <th className="border border-gray-400 py-1.5 px-1">ยี่ห้อ</th>
              <th className="border border-gray-400 py-1.5 px-1">รุ่น/โมเดล</th>
              <th className="border border-gray-400 py-1.5 px-1">ขนาด</th>
              <th className="border border-gray-400 py-1.5 px-1">Serial No.</th>
              <th className="border border-gray-400 py-1.5 px-1">จำนวน</th>
              <th className="border border-gray-400 py-1.5 px-1">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, i: number) => (
              <tr key={i}>
                <td className="border border-gray-400 py-1.5 px-1">{i + 1}</td>
                <td className="border border-gray-400 py-1.5 px-1">{item.type}</td>
                <td className="border border-gray-400 py-1.5 px-1">{item.brand}</td>
                <td className="border border-gray-400 py-1.5 px-1">{item.model}</td>
                <td className="border border-gray-400 py-1.5 px-1">{item.size}</td>
                <td className="border border-gray-400 py-1.5 px-1">{item.serial}</td>
                <td className="border border-gray-400 py-1.5 px-1">{item.qty}</td>
                <td className="border border-gray-400 py-1.5 px-1">{item.remark}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={8} className="border border-gray-400 py-4">-</td></tr>
            )}
          </tbody>
        </table>

        {/* Symptoms and Settings */}
        <div className="flex flex-col gap-3 text-xs mb-6">
          <div className="flex"><span className="font-bold w-20">อาการเสีย:</span> <span>{safeData.symptoms || "-"}</span></div>
          <div className="flex"><span className="font-bold w-20">การตั้งค่า:</span> <span>{safeData.settings || "-"}</span></div>
        </div>

        {/* Checklist */}
        <div className="mb-8">
          <span className="font-bold text-xs mb-3 block">รายการตรวจสอบสภาพ</span>
          <div className="grid grid-cols-4 gap-y-3 text-[10px]">
            {[
              { key: 'frontPanel', label: 'ด้านหน้า' },
              { key: 'topPanel', label: 'ด้านบน' },
              { key: 'leftSide', label: 'ด้านข้าง (ซ้าย)' },
              { key: 'rightSide', label: 'ด้านข้าง (ขวา)' },
              { key: 'inside', label: 'ด้านใน' },
              { key: 'nameplate', label: 'Nameplate' },
              { key: 'bottom', label: 'ด้านล่าง' },
              { key: 'terminalNut', label: 'Terminal / Nut' },
              { key: 'termCover', label: 'Term. cover' },
              { key: 'cover', label: 'ฝาครอบ / Cover' },
              { key: 'video', label: 'Video' },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 border border-gray-500 flex items-center justify-center text-[10px]">
                  {checklist[item.key] ? '✓' : ''}
                </div>
                <span>{item.label}</span>
                <span className="text-gray-400 ml-auto mr-4">(1/1)</span>
              </div>
            ))}
          </div>
        </div>
        
        <hr className="border-gray-300 mb-6" />

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-8 text-center text-xs mt-auto">
          {/* Row 1 */}
          <div className="flex flex-col items-center">
            <span className="font-bold mb-1">ผู้รับซ่อม</span>
            <span className="text-gray-500 text-[10px] mb-8">(บริษัท)</span>
            <div className="flex items-end gap-2 w-full justify-center">
              <span>(</span>
              <div className="border-b border-dotted border-gray-500 w-48 text-center pb-1">{safeData.receiverName || " "}</div>
              <span>)</span>
            </div>
            <div className="mt-2 text-[10px]">
              วันที่: <span className="inline-block border-b border-dotted border-gray-500 w-8 text-center">{safeData.receivedDate ? new Date(safeData.receivedDate).getDate() : ""}</span> / 
              <span className="inline-block border-b border-dotted border-gray-500 w-8 text-center mx-1">{safeData.receivedDate ? new Date(safeData.receivedDate).getMonth() + 1 : ""}</span> / 
              <span className="inline-block border-b border-dotted border-gray-500 w-12 text-center">{safeData.receivedDate ? new Date(safeData.receivedDate).getFullYear() + 543 : ""}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="font-bold mb-1">ผู้ส่งคืน</span>
            <span className="text-gray-500 text-[10px] mb-8">(บริษัท)</span>
            <div className="flex items-end gap-2 w-full justify-center">
              <span>(</span>
              <div className="border-b border-dotted border-gray-500 w-48"></div>
              <span>)</span>
            </div>
            <div className="mt-2 text-[10px]">
              วันที่: <span className="inline-block border-b border-dotted border-gray-500 w-8 text-center"></span> / 
              <span className="inline-block border-b border-dotted border-gray-500 w-8 text-center mx-1"></span> / 
              <span className="inline-block border-b border-dotted border-gray-500 w-12 text-center"></span>
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex flex-col items-center">
            <span className="font-bold mb-1">ผู้ส่งซ่อม</span>
            <span className="text-gray-500 text-[10px] mb-8">(ลูกค้า)</span>
            <div className="flex items-end gap-2 w-full justify-center">
              <span>(</span>
              <div className="border-b border-dotted border-gray-500 w-48 text-center pb-1">{safeData.senderName || " "}</div>
              <span>)</span>
            </div>
            <div className="mt-2 text-[10px]">
              วันที่: <span className="inline-block border-b border-dotted border-gray-500 w-8 text-center">{safeData.sentDate ? new Date(safeData.sentDate).getDate() : ""}</span> / 
              <span className="inline-block border-b border-dotted border-gray-500 w-8 text-center mx-1">{safeData.sentDate ? new Date(safeData.sentDate).getMonth() + 1 : ""}</span> / 
              <span className="inline-block border-b border-dotted border-gray-500 w-12 text-center">{safeData.sentDate ? new Date(safeData.sentDate).getFullYear() + 543 : ""}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="font-bold mb-1">ผู้รับคืน</span>
            <span className="text-gray-500 text-[10px] mb-8">(ลูกค้า)</span>
            <div className="flex items-end gap-2 w-full justify-center">
              <span>(</span>
              <div className="border-b border-dotted border-gray-500 w-48"></div>
              <span>)</span>
            </div>
            <div className="mt-2 text-[10px]">
              วันที่: <span className="inline-block border-b border-dotted border-gray-500 w-8 text-center"></span> / 
              <span className="inline-block border-b border-dotted border-gray-500 w-8 text-center mx-1"></span> / 
              <span className="inline-block border-b border-dotted border-gray-500 w-12 text-center"></span>
            </div>
          </div>
        </div>

        {/* Footer Remarks */}
        <div className="mt-8 text-[9px] text-gray-700 space-y-1">
          <p className="font-bold">หมายเหตุ:</p>
          <p>1. โปรดตรวจสอบสินค้าก่อนรับคืน หากรับคืนแล้วบริษัทจะไม่รับผิดชอบความเสียหายหรือการสูญหายภายหลัง</p>
          <p>2. หากไม่มารับคืนภายใน 90 วัน บริษัทขอสงวนสิทธิ์ในการดำเนินการ</p>
          <p>3. กรุณาเก็บใบรับซ่อมไว้เพื่อเป็นหลักฐานในการรับสินค้า</p>
        </div>
        
        <div className="absolute bottom-4 right-8 text-[8px] text-gray-500">
          FO-EN-03/REV.08
        </div>
      </div>
    );

    return (
      <div ref={ref} className="print-container hidden print:block">
        <style type="text/css" media="print">
          {`
            @page { size: A4 portrait; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-container { display: block !important; }
            .page-break-after-always { page-break-after: always; break-after: page; }
          `}
        </style>
        <Page type="สำหรับลูกค้า" />
        <Page type="สำหรับบริษัท" />
      </div>
    );
  }
);

RepairOrderDocument.displayName = 'RepairOrderDocument';

export default RepairOrderDocument;
