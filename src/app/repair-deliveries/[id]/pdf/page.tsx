import { getUser } from "@/app/lib/dal"
import prisma from "@/app/lib/db"
import { notFound } from "next/navigation"
import { Sarabun } from "next/font/google"
import PrintButton from "./PrintButton"

const sarabun = Sarabun({
  weight: ['400', '600', '700'],
  subsets: ['latin', 'thai'],
  display: 'swap',
})

export const metadata = {
  title: "ใบส่งมอบงาน | Sales CRM",
}

export default async function DeliveryNotePDF({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getUser()
  if (!session) return notFound()

  // Next.js 15 support: await params
  const resolvedParams = await params;
  const id = resolvedParams.id;

  let delivery: any = null;

  if (id === 'blank') {
    delivery = {
      deliveryNumber: '________________',
      deliveryDate: null,
      createdAt: null,
      job: null,
      internalCompany: 'TG',
      company: '',
      customer: '',
      customerPosition: '',
      address: '',
      jobName: '',
      quotationNo: '',
      siteAddress: '',
      workInspect: false,
      workInstall: false,
      workRepair: false,
      workTraining: false,
      workOther: '',
      note: '',
      photosBefore: [],
      photosAfter: [],
      comments: '',
      sigSenderUrl: null,
      nameSender: '',
      senderPhone: '',
      sigReceiverUrl: null,
      nameReceiver: '',
      technicianPhone: '',
    }
  } else {
    delivery = await prisma.repairDelivery.findUnique({
      where: { id: id },
      include: { job: true },
    })
  }

  if (!delivery) return notFound()

  const companyInfoMap: Record<string, { thName: string, name: string, address: string, phone: string, logo: string, fallbackLogo: string }> = {
    TG: {
      thName: "บริษัท เทอรา กรุ๊ป จำกัด",
      name: "TERA GROUP CO., LTD.",
      address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250",
      phone: "+66(0) 2328-0801-3",
      logo: "/logos/tg.png",
      fallbackLogo: "/4.png",
    },
    TP: {
      thName: "บริษัท เทอรา พาวเวอร์ จำกัด",
      name: "TERA POWER CO., LTD.",
      address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250",
      phone: "+66(0) 2328-0801-3",
      logo: "/logos/tp.png",
      fallbackLogo: "/7.png",
    },
    TE: {
      thName: "บริษัท เทอรา อิเล็คทริค จำกัด",
      name: "TERA ELECTRIC CO., LTD.",
      address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250",
      phone: "+66(0) 2328-0801-3",
      logo: "/logos/te.png",
      fallbackLogo: "/6.png",
    }
  };

  let compCode = 'TG';
  if (delivery.internalCompany) {
    compCode = delivery.internalCompany;
  } else if (delivery.company === 'TG' || delivery.company === 'TE' || delivery.company === 'TP') {
    compCode = delivery.company;
  }
  const currentCompany = companyInfoMap[compCode] || companyInfoMap['TG'];

  // Normalize photos array (2 Before + 2 After = 4 Photos)
  const normalizePhotos = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((v: any) => typeof v === 'string' ? v : v?.url || '').filter(Boolean);
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.map((v: any) => typeof v === 'string' ? v : v?.url || '').filter(Boolean);
      } catch {
        return [val];
      }
    }
    return [];
  };

  const beforePhotos = normalizePhotos(delivery.photosBefore).slice(0, 2);
  const afterPhotos = normalizePhotos(delivery.photosAfter).slice(0, 2);

  const deliveryDateFormatted = delivery.deliveryDate 
    ? new Date(delivery.deliveryDate).toLocaleDateString('th-TH') 
    : delivery.createdAt 
      ? new Date(delivery.createdAt).toLocaleDateString('th-TH') 
      : '';

  return (
    <div className={`${sarabun.className} bg-gray-100 w-full h-full min-h-screen overflow-y-auto text-black pb-10 print:bg-white print:p-0 print:m-0`}>
      <style type="text/css">
        {`
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap');

          @font-face {
            font-family: 'TH Sarabun New';
            font-style: normal;
            font-weight: 400;
            src: local('TH Sarabun New'), local('THSarabunNew'), url('/fonts/THSarabunNew.ttf') format('truetype');
          }
          @font-face {
            font-family: 'TH Sarabun New';
            font-style: normal;
            font-weight: 700;
            src: local('TH Sarabun New Bold'), local('THSarabunNew-Bold'), url('/fonts/THSarabunNew-Bold.ttf') format('truetype');
          }
          @font-face {
            font-family: 'TH SarabunPSK';
            font-style: normal;
            font-weight: 400;
            src: local('TH SarabunPSK'), local('THSarabunPSK'), url('/fonts/THSarabun.ttf') format('truetype');
          }
          @font-face {
            font-family: 'TH SarabunPSK';
            font-style: normal;
            font-weight: 700;
            src: local('TH SarabunPSK Bold'), local('THSarabunPSK-Bold'), url('/fonts/THSarabun-Bold.ttf') format('truetype');
          }

          .delivery-pdf-container,
          .delivery-pdf-container * {
            font-family: 'TH Sarabun New', 'TH SarabunPSK', ${sarabun.style.fontFamily}, 'Sarabun', sans-serif !important;
          }
          
          @media print {
            @page {
              size: A4 portrait;
              margin: 6mm 10mm 6mm 10mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
              background: #fff !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .delivery-pdf-container {
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}
      </style>
      
      <div className="flex justify-end mb-3 print:hidden max-w-[210mm] mx-auto pt-3 px-2">
        <PrintButton />
      </div>

      <div 
        className="delivery-pdf-container bg-white shadow-lg print:shadow-none mx-auto relative overflow-hidden" 
        style={{ 
          width: '210mm', 
          minHeight: '297mm', 
          maxHeight: '297mm',
          padding: '8mm 13mm 6mm 13mm',
          fontSize: '11pt',
          lineHeight: 1.2,
          color: '#000',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <div>
          {/* 1. Header: Logo (current) + Thai & English Name + Address + Document No */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #000', paddingBottom: '2mm', marginBottom: '2mm' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3.5mm' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={currentCompany.logo} 
                alt={currentCompany.name} 
                style={{ height: '14mm', width: 'auto', objectFit: 'contain' }} 
              />
              <div>
                <div style={{ fontSize: '13pt', fontWeight: 'bold', lineHeight: 1.15, color: '#000' }}>
                  {currentCompany.thName}
                </div>
                <div style={{ fontSize: '10.5pt', fontWeight: 'bold', lineHeight: 1.15, color: '#333' }}>
                  {currentCompany.name}
                </div>
                <div style={{ fontSize: '9pt', color: '#555', lineHeight: 1.15 }}>
                  {currentCompany.address} | โทร: {currentCompany.phone}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ border: '1.5px solid #000', padding: '1mm 3mm', background: '#f8fafc', borderRadius: '3px' }}>
                <span style={{ fontSize: '9.5pt', fontWeight: 'bold' }}>เลขที่ : </span>
                <span style={{ fontFamily: 'monospace', fontSize: '11pt', fontWeight: 'bold', color: '#b91c1c' }}>
                  {delivery.deliveryNumber || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Document Title & Delivery Date */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2mm' }}>
            <div style={{ width: '30%' }}></div>
            <div style={{ textAlign: 'center', fontSize: '17pt', fontWeight: 'bold', color: '#000', flex: 1, letterSpacing: '0.5px' }}>
              ใบส่งมอบงาน
            </div>
            <div style={{ width: '30%', textAlign: 'right', fontSize: '11pt' }}>
              <span style={{ fontWeight: 'bold' }}>วันที่ส่งมอบงาน : </span>
              <span>{deliveryDateFormatted || '______/______/______'}</span>
            </div>
          </div>

          {/* 3. Customer & Project Details */}
          <div style={{ border: '1px solid #000', borderRadius: '2px', padding: '2mm 3mm', marginBottom: '2mm', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '10.5pt', marginBottom: '0.8mm' }}>
              <span style={{ fontWeight: 'bold', minWidth: '18mm', flexShrink: 0 }}>ชื่องาน :</span>
              <span style={{ flex: 1, fontWeight: 'bold', color: '#111' }}>{delivery.jobName || '-'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '10.5pt', marginBottom: '0.8mm' }}>
              <span style={{ fontWeight: 'bold', minWidth: '18mm', flexShrink: 0 }}>ลูกค้า :</span>
              <span style={{ flex: 1 }}>
                {delivery.company && !['TG', 'TE', 'TP'].includes(delivery.company) 
                  ? `${delivery.company} ${delivery.customer ? `(${delivery.customer})` : ''}` 
                  : (delivery.customer || '-')}
              </span>
              <span style={{ fontWeight: 'bold', marginLeft: '4mm', marginRight: '2mm', flexShrink: 0 }}>เลขที่ใบเสนอราคา / PO :</span>
              <span style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{delivery.quotationNo || '-'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '10.5pt', marginBottom: '0.8mm' }}>
              <span style={{ fontWeight: 'bold', minWidth: '18mm', flexShrink: 0 }}>ที่อยู่ :</span>
              <span style={{ flex: 1 }}>{delivery.address || '-'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '10.5pt', marginBottom: '0.8mm' }}>
              <span style={{ fontWeight: 'bold', minWidth: '18mm', flexShrink: 0 }}>สถานที่หน้างาน :</span>
              <span style={{ flex: 1 }}>{delivery.siteAddress || '-'}</span>
            </div>

            <div style={{ display: 'flex', gap: '8mm', fontSize: '10.5pt' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 'bold', minWidth: '18mm', flexShrink: 0 }}>เซลล์ :</span>
                <span style={{ flex: 1 }}>{delivery.sender || '-'}</span>
                <span style={{ fontWeight: 'bold', marginLeft: '2mm', marginRight: '1.5mm', flexShrink: 0 }}>เบอร์โทร :</span>
                <span>{delivery.senderPhone || '-'}</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 'bold', flexShrink: 0, marginRight: '2mm' }}>ช่าง/วิศวกร :</span>
                <span style={{ flex: 1 }}>{delivery.technician || '-'}</span>
                <span style={{ fontWeight: 'bold', marginLeft: '2mm', marginRight: '1.5mm', flexShrink: 0 }}>เบอร์โทร :</span>
                <span>{delivery.technicianPhone || '-'}</span>
              </div>
            </div>
          </div>

          {/* 4. Work Scope Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2mm', fontSize: '10.5pt' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ border: '1px solid #000', padding: '1mm 2.5mm', textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', width: '32%', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  รายการ
                </th>
                <th style={{ border: '1px solid #000', padding: '1mm 2.5mm', textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', width: '68%', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  รายละเอียด
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '1mm 2.5mm', textAlign: 'center', fontWeight: 'bold' }}>
                  งานตรวจเช็ค
                </td>
                <td style={{ border: '1px solid #000', padding: '1mm 2.5mm' }}>
                  {delivery.workInspectDetails || (delivery.workInspect ? 'ตรวจเช็คตามมาตรฐาน' : '')}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '1mm 2.5mm', textAlign: 'center', fontWeight: 'bold' }}>
                  งานติดตั้ง
                </td>
                <td style={{ border: '1px solid #000', padding: '1mm 2.5mm' }}>
                  {delivery.workInstallDetails || (delivery.workInstall ? 'ติดตั้งตามมาตรฐาน' : '')}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '1mm 2.5mm', textAlign: 'center', fontWeight: 'bold' }}>
                  งานซ่อม
                </td>
                <td style={{ border: '1px solid #000', padding: '1mm 2.5mm' }}>
                  {delivery.workRepairDetails || (delivery.workRepair ? 'ดำเนินการซ่อมแล้วเสร็จ' : '')}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '1mm 2.5mm', textAlign: 'center', fontWeight: 'bold' }}>
                  งานอบรม Training
                </td>
                <td style={{ border: '1px solid #000', padding: '1mm 2.5mm' }}>
                  {delivery.workTrainingDetails || (delivery.workTraining ? 'อบรมการใช้งานเรียบร้อย' : '')}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '1mm 2.5mm', textAlign: 'center', fontWeight: 'bold' }}>
                  งานอื่นๆ
                </td>
                <td style={{ border: '1px solid #000', padding: '1mm 2.5mm' }}>
                  {delivery.workOther || ''}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 5. Photos Section: Before - After (4 Photos - Large & Clear) */}
          <div style={{ marginBottom: '2.5mm' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3.5mm' }}>
              {/* Before Photos (Up to 2 Photos) */}
              <div style={{ border: '1px solid #000', padding: '2mm', background: '#fafafa', borderRadius: '2px' }}>
                <div style={{ fontSize: '10pt', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5mm', color: '#b91c1c' }}>
                  [1] ภาพก่อนติดตั้ง / ก่อนดำเนินงาน (Before)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: beforePhotos.length === 1 ? '1fr' : '1fr 1fr', gap: '2mm' }}>
                  {(beforePhotos.length > 0 ? beforePhotos : ['', '']).slice(0, 2).map((url, idx) => (
                    <div
                      key={`before-${idx}`}
                      style={{
                        height: '52mm',
                        border: '1px dashed #94a3b8',
                        background: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderRadius: '3px',
                        position: 'relative'
                      }}
                    >
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={`ก่อนติดตั้ง #${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <div style={{ fontSize: '9pt', color: '#94a3b8', textAlign: 'center', padding: '4px' }}>
                          (ก่อนติดตั้ง #{idx + 1})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* After Photos (Up to 2 Photos) */}
              <div style={{ border: '1px solid #000', padding: '2mm', background: '#fafafa', borderRadius: '2px' }}>
                <div style={{ fontSize: '10pt', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5mm', color: '#15803d' }}>
                  [2] ภาพหลังติดตั้ง / ผลงานแล้วเสร็จ (After)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: afterPhotos.length === 1 ? '1fr' : '1fr 1fr', gap: '2mm' }}>
                  {(afterPhotos.length > 0 ? afterPhotos : ['', '']).slice(0, 2).map((url, idx) => (
                    <div
                      key={`after-${idx}`}
                      style={{
                        height: '52mm',
                        border: '1px dashed #94a3b8',
                        background: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderRadius: '3px',
                        position: 'relative'
                      }}
                    >
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={`หลังติดตั้ง #${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <div style={{ fontSize: '9pt', color: '#94a3b8', textAlign: 'center', padding: '4px' }}>
                          (หลังติดตั้ง #{idx + 1})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 6. Comments & Suggestions Box */}
          <div style={{ border: '1px solid #000', padding: '2mm 3.5mm', marginBottom: '2.5mm', background: '#fff', borderRadius: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '10.5pt', color: '#000', whiteSpace: 'nowrap' }}>
                ความคิดเห็น / ข้อเสนอแนะ (Comments) :
              </span>
              <span style={{ fontSize: '10pt', color: '#111', flex: 1, minHeight: '6mm', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.3 }}>
                {delivery.comments || (delivery.note ? `หมายเหตุ: ${delivery.note}` : '') || '- เรียบร้อยตามมาตรฐาน -'}
              </span>
            </div>
          </div>

          {/* 7. Legal Handover Declaration */}
          <div style={{ margin: '1.5mm 0 2.5mm', fontSize: '10pt', lineHeight: 1.3, textAlign: 'center', color: '#111' }}>
            บัดนี้ทางบริษัทฯ ได้ดำเนินงานตามรายการข้างต้นเสร็จสิ้นครบถ้วนแล้ว
            และผู้รับมอบงานได้ทำการตรวจรับมอบงานอย่างละเอียดเป็นที่เรียบร้อยแล้ว
          </div>
        </div>

        {/* 8. Symmetrical Signatures Block (Bottom) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10mm', paddingTop: '1mm' }}>
          {/* Sender */}
          <div style={{ flex: 1, textAlign: 'center', border: '1px solid #999', borderRadius: '3px', padding: '2.5mm 3mm', background: '#fdfdfd' }}>
            <div style={{ height: '13mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {delivery.sigSenderUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={delivery.sigSenderUrl} alt="Sender Sig" style={{ maxHeight: '12mm', maxWidth: '80%', objectFit: 'contain' }} />
              ) : (
                <span style={{ color: '#aaa', fontSize: '9pt' }}>....................................................................</span>
              )}
            </div>
            <div style={{ fontSize: '10.5pt', marginTop: '1mm', lineHeight: 1.3 }}>
              ลงชื่อผู้บรรจง ( {delivery.nameSender ? delivery.nameSender : '................................................'} )
            </div>
            <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#000', marginTop: '0.5mm' }}>
              ผู้ส่งมอบงาน
            </div>
            <div style={{ fontSize: '9.5pt', color: '#555', marginTop: '0.5mm' }}>
              วันที่ ............ / ............ / ............
            </div>
          </div>

          {/* Receiver */}
          <div style={{ flex: 1, textAlign: 'center', border: '1px solid #999', borderRadius: '3px', padding: '2.5mm 3mm', background: '#fdfdfd' }}>
            <div style={{ height: '13mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {delivery.sigReceiverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={delivery.sigReceiverUrl} alt="Receiver Sig" style={{ maxHeight: '12mm', maxWidth: '80%', objectFit: 'contain' }} />
              ) : (
                <span style={{ color: '#aaa', fontSize: '9pt' }}>....................................................................</span>
              )}
            </div>
            <div style={{ fontSize: '10.5pt', marginTop: '1mm', lineHeight: 1.3 }}>
              ลงชื่อผู้บรรจง ( {delivery.nameReceiver ? delivery.nameReceiver : '................................................'} )
            </div>
            <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#000', marginTop: '0.5mm' }}>
              ผู้รับมอบงาน
            </div>
            <div style={{ fontSize: '9.5pt', color: '#555', marginTop: '0.5mm' }}>
              วันที่ ............ / ............ / ............
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
