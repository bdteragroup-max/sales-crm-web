import { getUser } from "@/app/lib/dal"
import prisma from "@/app/lib/db"
import { notFound } from "next/navigation"
import Image from "next/image"
import PrintButton from "./PrintButton"

export const metadata = {
  title: "ใบเบิก/ใบยืมของ | Sales CRM",
}

export default async function RequisitionPDF({ params }: { params: Promise<{ id: string }> }) {
  const session = await getUser()
  if (!session) return notFound()

  const { id } = await params;

  const requisition = await prisma.materialRequisition.findUnique({
    where: { id: id },
    include: {
      requester: true,
      approver: true
    },
  })

  if (!requisition) return notFound()

  const items = requisition.items as any[];
  const tableRows = [...(items || [])];

  // Checkbox logic for company
  const isGroup = requisition.company === 'Group';
  const isElectric = requisition.company === 'Electric';
  const isPower = requisition.company === 'Power';

  const CheckboxIcon = ({ checked }: { checked: boolean }) => (
    <div style={{
      width: '16px',
      height: '16px',
      border: '1px solid black',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white'
    }}>
      {checked && <span style={{ fontSize: '14px', lineHeight: '14px', fontWeight: 'bold' }}>✓</span>}
    </div>
  );

  return (
    <div className="bg-gray-100 w-full h-full min-h-screen overflow-y-auto text-black pb-10 print:bg-white print:p-0" style={{ fontFamily: "'Sarabun', sans-serif" }}>
      <style type="text/css">
        {`
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
          
          @media print {
            @page {
              size: A4 landscape;
              margin: 0;
            }
            body {
              -webkit-print-color-adjust: exact;
              margin: 0;
            }
          }
          .pdf-table th, .pdf-table td {
            border: 1px solid black;
            padding: 4px 8px;
            text-align: center;
          }
          .pdf-table th {
            font-weight: bold;
          }
          .pdf-table td {
            height: 28px; /* Fixed height for empty rows */
          }
        `}
      </style>
      <div className="flex justify-end mb-4 print:hidden max-w-[297mm] mx-auto pt-4">
        <PrintButton />
      </div>

      <div
        className="bg-white shadow-lg print:shadow-none mx-auto relative overflow-hidden"
        style={{
          width: '297mm', // A4 Landscape
          minHeight: '210mm',
          padding: '10mm',
          fontSize: '16pt',
          color: '#000',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ border: '2px solid black', padding: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* Header Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>

            {/* Logos & Title */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '50%' }}>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', justifyContent: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/4.png" alt="Group" style={{ height: '70px', objectFit: 'contain' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/6.png" alt="Electric" style={{ height: '70px', objectFit: 'contain' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/7.png" alt="Power" style={{ height: '70px', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: '18pt', fontWeight: 'bold' }}>
                ใบเบิก/ใบยืมของและวัสดุ-อุปกรณ์ต่างๆ
              </div>
            </div>

            {/* Date & Company Selection */}
            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', marginBottom: '5px' }}>
                <span style={{ fontWeight: 'bold', marginRight: '10px' }}>วันที่</span>
                <span>{new Date(requisition.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }} className="pdf-table">
                <thead>
                  <tr>
                    <th style={{ width: '33.33%' }}>กรุ้ป</th>
                    <th style={{ width: '33.33%' }}>อิเล็กทริค</th>
                    <th style={{ width: '33.33%' }}>พาวเวอร์</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><CheckboxIcon checked={isGroup} /></td>
                    <td><CheckboxIcon checked={isElectric} /></td>
                    <td><CheckboxIcon checked={isPower} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Main Table */}
          <table className="pdf-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', flex: 1, fontSize: '12pt' }}>
            <thead>
              <tr>
                <th style={{ width: '8%' }}>ลำดับ</th>
                <th style={{ width: '40%' }}>รายการเบิก/รายละเอียด</th>
                <th style={{ width: '10%' }}>จำนวน</th>
                <th style={{ width: '12%' }}>หน่วย</th>
                <th style={{ width: '15%' }}>งานที่ใช้</th>
                <th style={{ width: '15%' }}>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((item, index) => (
                <tr key={index}>
                  <td>{item ? index + 1 : ''}</td>
                  <td style={{ textAlign: 'left' }}>{item ? item.detail : ''}</td>
                  <td>{item ? item.quantity : ''}</td>
                  <td>{item ? item.unit : ''}</td>
                  <td>{item ? item.job : ''}</td>
                  <td>{item ? item.remark : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px', paddingBottom: '20px' }}>
            <div style={{ textAlign: 'center', width: '40%' }}>
              <div style={{ height: '60px', display: 'flex', alignItems: 'end', justifyContent: 'center', marginBottom: '10px' }}>
                {requisition.requesterSignatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={requisition.requesterSignatureUrl} alt="Requester" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                ) : null}
              </div>
              <div style={{ borderBottom: '1px dotted black', width: '60%', margin: '0 auto 5px' }}></div>
              <div style={{ fontWeight: 'bold' }}>ผู้ขอเบิก</div>
              <div>({requisition.requester?.fullName || '......................................'})</div>
            </div>

            <div style={{ textAlign: 'center', width: '40%' }}>
              <div style={{ height: '60px', display: 'flex', alignItems: 'end', justifyContent: 'center', marginBottom: '10px' }}>
                {requisition.approverSignatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={requisition.approverSignatureUrl} alt="Approver" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                ) : null}
              </div>
              <div style={{ borderBottom: '1px dotted black', width: '60%', margin: '0 auto 5px' }}></div>
              <div style={{ fontWeight: 'bold' }}>ผู้อนุมัติ</div>
              <div>({requisition.approver?.fullName || '......................................'})</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
