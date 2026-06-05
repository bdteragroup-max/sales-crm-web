import { getUser } from "@/app/lib/dal"
import prisma from "@/app/lib/db"
import { notFound } from "next/navigation"
import Image from "next/image"
import { Sarabun } from "next/font/google"

import PrintButton from "./PrintButton"

const sarabun = Sarabun({
  weight: ["400", "700"],
  subsets: ["thai"],
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

  return (
    <div className={`bg-gray-100 w-full h-full min-h-screen overflow-y-auto text-black pb-10 print:bg-white print:p-0 ${sarabun.className}`}>
      <div className="flex justify-end mb-4 print:hidden max-w-[210mm] mx-auto pt-4">
        <PrintButton />
      </div>

      <div 
        className="bg-white shadow-lg print:shadow-none mx-auto relative overflow-hidden" 
        style={{ 
          width: '210mm', 
          minHeight: '297mm', 
          padding: '14mm 18mm',
          fontSize: '14pt',
          color: '#000',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5mm', marginBottom: '3mm' }}>
          {/* Logo 1 */}
          <div style={{ width: '14mm', height: '17mm', backgroundColor: '#e62415', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <div style={{ border: '1px solid white', borderRadius: '50%', width: '10mm', height: '10mm', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1mm' }}>
              <span style={{ fontSize: '14pt', fontWeight: 'bold', fontFamily: 'Arial' }}>R</span>
            </div>
            <span style={{ fontSize: '6pt', fontWeight: 'bold', letterSpacing: '1px', marginTop: '1mm', fontFamily: 'Arial' }}>TERA</span>
          </div>
          {/* Logo 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ color: '#e62415', fontSize: '18pt', fontWeight: '900', letterSpacing: '1px', lineHeight: 1, fontFamily: 'Arial' }}>TERA</div>
            <div style={{ color: '#e62415', fontSize: '7pt', fontWeight: 'bold', letterSpacing: '0.5px', fontFamily: 'Arial' }}>ELECTRIC</div>
          </div>
          {/* Logo 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ color: '#e62415', fontSize: '18pt', fontWeight: '900', letterSpacing: '1px', lineHeight: 1, fontFamily: 'Arial' }}>TERA</div>
            <div style={{ color: '#e62415', fontSize: '7pt', fontWeight: 'bold', letterSpacing: '0.5px', fontFamily: 'Arial' }}>POWER</div>
          </div>
        </div>

        <div style={{ fontSize: '10.5pt', color: '#333', marginBottom: '2mm' }}>
          39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250
        </div>

        <div style={{ textAlign: 'center', fontSize: '21pt', fontWeight: 'bold', margin: '2mm 0 3mm' }}>
          ใบส่งมอบงาน
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3mm', fontSize: '13pt' }}>
          <div style={{ minWidth: '55mm' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '1mm' }}>
              <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '6px' }}>วันที่ส่งมอบงาน :</span>
              <span style={{ fontWeight: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString('th-TH') : delivery.createdAt ? new Date(delivery.createdAt).toLocaleDateString('th-TH') : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '1mm' }}>
              <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '6px' }}>บริษัท :</span>
              <span style={{ fontWeight: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {delivery.company || ''}
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '3mm' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '13pt', lineHeight: 1.25, marginBottom: '0.8mm' }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '6px' }}>ชื่องาน :</span>
            <span style={{ flex: 1, minHeight: '4.8mm', fontWeight: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{delivery.jobName || ''}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '13pt', lineHeight: 1.25, marginBottom: '0.8mm' }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '6px' }}>ลูกค้า :</span>
            <span style={{ flex: 1, minHeight: '4.8mm', fontWeight: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{delivery.customer || ''}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '13pt', lineHeight: 1.25, marginBottom: '0.8mm' }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '6px' }}>ที่อยู่ :</span>
            <span style={{ flex: 1, minHeight: '4.8mm', fontWeight: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{delivery.address || ''}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '13pt', lineHeight: 1.25, marginBottom: '0.8mm' }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '6px' }}>สถานที่หน้างาน :</span>
            <span style={{ flex: 1, minHeight: '4.8mm', fontWeight: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{delivery.siteAddress || ''}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '13pt', lineHeight: 1.25, marginBottom: '0.8mm' }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '6px' }}>เลขที่ใบเสนอราคา / ใบสั่งซื้อ :</span>
            <span style={{ flex: 1, minHeight: '4.8mm', fontWeight: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{delivery.quotationNo || ''}</span>
          </div>

          <div style={{ display: 'flex', gap: '14px', fontSize: '13pt', lineHeight: 1.25, marginBottom: '0.8mm' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '6px' }}>เซลล์ :</span>
              <span style={{ flex: 1, minHeight: '4.8mm', fontWeight: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{delivery.sender || ''}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '6px' }}>เบอร์โทร :</span>
              <span style={{ flex: 1, minHeight: '4.8mm', fontWeight: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{delivery.senderPhone || ''}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', fontSize: '13pt', lineHeight: 1.25, marginBottom: '0.8mm' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '6px' }}>ช่าง/วิศวกร :</span>
              <span style={{ flex: 1, minHeight: '4.8mm', fontWeight: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{delivery.technician || ''}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '6px' }}>เบอร์โทร :</span>
              <span style={{ flex: 1, minHeight: '4.8mm', fontWeight: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{delivery.technicianPhone || ''}</span>
            </div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '3mm 0 2mm', fontSize: '13pt' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '1.5mm 3mm', textAlign: 'center', fontWeight: 'bold', background: '#f5f5f5', width: '40%' }}>รายการ</th>
              <th style={{ border: '1px solid #000', padding: '1.5mm 3mm', textAlign: 'center', fontWeight: 'bold', background: '#f5f5f5', width: '60%' }}>รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '1.5mm 3mm', verticalAlign: 'top', minHeight: '8mm', height: '8mm', width: '40%', textAlign: 'center', fontWeight: 'bold' }}>งานตรวจเช็ค</td>
              <td style={{ border: '1px solid #000', padding: '1.5mm 3mm', verticalAlign: 'top', minHeight: '8mm', height: '8mm', width: '60%' }}>
                {delivery.workInspect ? '✓' : ''}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '1.5mm 3mm', verticalAlign: 'top', minHeight: '8mm', height: '8mm', width: '40%', textAlign: 'center', fontWeight: 'bold' }}>งานติดตั้ง</td>
              <td style={{ border: '1px solid #000', padding: '1.5mm 3mm', verticalAlign: 'top', minHeight: '8mm', height: '8mm', width: '60%' }}>
                {delivery.workInstall ? '✓' : ''}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '1.5mm 3mm', verticalAlign: 'top', minHeight: '8mm', height: '8mm', width: '40%', textAlign: 'center', fontWeight: 'bold' }}>งานซ่อม</td>
              <td style={{ border: '1px solid #000', padding: '1.5mm 3mm', verticalAlign: 'top', minHeight: '8mm', height: '8mm', width: '60%' }}>
                {delivery.workRepair ? '✓' : ''}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '1.5mm 3mm', verticalAlign: 'top', minHeight: '8mm', height: '8mm', width: '40%', textAlign: 'center', fontWeight: 'bold' }}>งานอบรม Training</td>
              <td style={{ border: '1px solid #000', padding: '1.5mm 3mm', verticalAlign: 'top', minHeight: '8mm', height: '8mm', width: '60%' }}>
                {delivery.workTraining ? '✓' : ''}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '1.5mm 3mm', verticalAlign: 'top', minHeight: '8mm', height: '8mm', width: '40%', textAlign: 'center', fontWeight: 'bold' }}>งานอื่นๆ</td>
              <td style={{ border: '1px solid #000', padding: '1.5mm 3mm', verticalAlign: 'top', minHeight: '8mm', height: '8mm', width: '60%' }}>
                {delivery.workOther || ''}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ margin: '2mm 0 2mm', fontSize: '13pt', lineHeight: 1.3, minHeight: '8mm' }}>
          <span style={{ fontWeight: 'bold', display: 'inline' }}>หมายเหตุ : </span>
          <span style={{ display: 'inline', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{delivery.note || ''}</span>
        </div>

        <div style={{ margin: '3mm 0 5mm', fontSize: '12.5pt', lineHeight: 1.45, textAlign: 'justify' }}>
          บัดนี้ทางบริษัทฯ ได้ดำเนินงานตามรายการข้างต้นเสร็จสิ้นครบถ้วนแล้ว
          และผู้รับมอบงานได้ทำการตรวจรับมอบงานอย่างละเอียดเป็นที่เรียบร้อยแล้ว
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10mm', marginTop: '40mm' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <table style={{ width: '100%', height: '15mm', marginBottom: '-8mm' }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'center', verticalAlign: 'bottom', display: 'flex', justifyContent: 'center' }}>
                    {delivery.sigSenderUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={delivery.sigSenderUrl} alt="Sender Sig" style={{ height: '12mm', display: 'block', margin: '0 auto' }} />
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: '12pt', textAlign: 'center', marginTop: '1mm', lineHeight: 2 }}>
              ลงชื่อผู้บรรจง ( {delivery.nameSender ? delivery.nameSender.padEnd(30, '.').padStart(38, '.') : '......................................'} )
            </div>
            <div style={{ fontSize: '12.5pt', fontWeight: 'bold', textAlign: 'center', marginTop: '1mm' }}>ผู้ส่งมอบงาน</div>
          </div>

          <div style={{ flex: 1, textAlign: 'center' }}>
            <table style={{ width: '100%', height: '15mm', marginBottom: '-8mm' }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'center', verticalAlign: 'bottom', display: 'flex', justifyContent: 'center' }}>
                    {delivery.sigReceiverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={delivery.sigReceiverUrl} alt="Receiver Sig" style={{ height: '12mm', display: 'block', margin: '0 auto' }} />
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: '12pt', textAlign: 'center', marginTop: '1mm', lineHeight: 2 }}>
              ลงชื่อผู้บรรจง ( {delivery.nameReceiver ? delivery.nameReceiver.padEnd(30, '.').padStart(38, '.') : '......................................'} )
            </div>
            <div style={{ fontSize: '12.5pt', fontWeight: 'bold', textAlign: 'center', marginTop: '1mm' }}>ผู้รับมอบงาน</div>
          </div>
        </div>

      </div>
    </div>
  )
}
