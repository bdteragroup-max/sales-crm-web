import React from 'react';
import prisma from '@/app/lib/db';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';

export default async function PrintCustomerRequirementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requirement = await prisma.customerRequirement.findUnique({
    where: { id }
  });

  if (!requirement) {
    return notFound();
  }

  const fd = requirement.formData as any || {};

  return (
    <div className="bg-gray-100 h-full w-full overflow-y-auto py-8 print:bg-white print:py-0 print:overflow-visible text-[13px]">
      <div className="max-w-[210mm] mx-auto bg-white min-h-[297mm] p-10 print:p-0 shadow-lg print:shadow-none font-prompt text-gray-800">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="w-48">
            <img src="/17f3de5f-9a16-4fdd-8682-6157042b8cfd.png" alt="TERA Logo" className="w-full max-h-16 object-contain object-left" />
          </div>
          <div className="flex-1 text-center font-bold text-xl mt-3">
            ใบรับความต้องการลูกค้า
          </div>
          <div className="w-72 border border-gray-600 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center">
              <span className="w-16 font-semibold">เลขที่ :</span>
              <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{requirement.requirementNumber}</span>
            </div>
            <div className="flex items-center">
              <span className="w-16 font-semibold">วันที่ :</span>
              <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{new Date(requirement.date).toISOString().split('T')[0]}</span>
            </div>
          </div>
        </div>

        {/* Section 1: Customer Info */}
        <div className="border border-gray-600 rounded-lg p-5 mb-4 flex flex-col gap-4">
          <div className="flex items-center">
            <span className="font-semibold mr-2">ชื่อบริษัท :</span>
            <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{requirement.companyName}</span>
          </div>
          
          <div className="flex gap-4">
            <div className="flex flex-1 items-center">
              <span className="font-semibold mr-2 whitespace-nowrap">ชื่อผู้ติดต่อ :</span>
              <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{requirement.contactName}</span>
            </div>
            <div className="flex flex-1 items-center">
              <span className="font-semibold mr-2 whitespace-nowrap">เบอร์โทร :</span>
              <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["เบอร์โทร"] || ''}</span>
            </div>
          </div>

          <div className="flex items-center">
            <span className="font-semibold mr-2 whitespace-nowrap">ที่อยู่บริษัท :</span>
            <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["ที่อยู่บริษัท"] || ''}</span>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-1 items-center">
              <span className="font-semibold mr-2 whitespace-nowrap">อีเมล :</span>
              <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["อีเมล"] || ''}</span>
            </div>
            <div className="flex flex-1 items-center">
              <span className="font-semibold mr-2 whitespace-nowrap">พนักงานขายที่ดูแล :</span>
              <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{requirement.salesperson}</span>
            </div>
          </div>

          <div className="flex items-center">
            <span className="font-semibold mr-2 whitespace-nowrap">ประเภทลูกค้า :</span>
            <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">
              {[
                fd["ประเภทลูกค้า_USER"] && 'USER',
                fd["ประเภทลูกค้า_ผู้รับเหมา"] && 'ผู้รับเหมา/ผู้ประมูลงาน',
                fd["ประเภทลูกค้า_ร้านค้า"] && 'ร้านค้า/ตัวแทนจำหน่าย',
                fd["ประเภทลูกค้า_ช่างติดตั้ง/ช่างรับซ่อม"] && 'ช่างติดตั้ง/ช่างรับซ่อม',
                fd["ประเภทลูกค้า_Maker"] && 'Maker/ประกอบตู้',
                fd["ประเภทลูกค้า_OEM"] && 'OEM',
                fd["ประเภทลูกค้า_ผู้ออกแบบ"] && 'ผู้ออกแบบ/ที่ปรึกษา'
              ].filter(Boolean).join(', ')}
            </span>
          </div>

          <div className="flex items-center">
            <span className="font-semibold mr-2 whitespace-nowrap">ระยะเวลาต้องการใบเสนอราคา (ภายในวันที่) :</span>
            <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["ภายในวันที่_ใบเสนอราคา"] || ''}</span>
          </div>

          <div className="flex items-center">
            <span className="font-semibold mr-2 whitespace-nowrap">ระยะเวลาความต้องการใช้สินค้า :</span>
            <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">
              {fd["ภายในวันที่_ใช้สินค้า"] || fd["ความต้องการใช้สินค้า_อื่นๆ_ระบุ"] || [
                fd["ความต้องการใช้สินค้า_ด่วนมาก"] && 'ด่วนมาก',
                fd["ความต้องการใช้สินค้า_ตั้งงบประมาณ"] && 'ตั้งงบประมาณ'
              ].filter(Boolean).join(', ')}
            </span>
          </div>
        </div>

        {/* Section 2: Products */}
        <div className="border border-gray-600 rounded-lg p-5 mb-4 flex flex-col gap-4">
          
          {/* INVERTER Section */}
          {fd["สินค้า_INVERTER"] && (
            <div className="flex flex-col gap-4">
              <div className="text-[11px] font-bold text-gray-700 uppercase">INVERTER</div>
              <div className="flex gap-4">
                <div className="flex flex-1 items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">ยี่ห้อ :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["INVERTER_ยี่ห้อ"]}</span>
                </div>
                <div className="flex flex-1 items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">ขนาด :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 text-center">{fd["INVERTER_ขนาดเครื่อง_kW"]}</span>
                  <span className="ml-2 text-[10px] text-gray-500 mr-2 whitespace-nowrap">kW</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 text-center">{fd["INVERTER_ขนาดเครื่อง_HP"]}</span>
                  <span className="ml-2 text-[10px] text-gray-500 whitespace-nowrap">HP</span>
                </div>
              </div>
              <div className="flex items-center">
                <span className="font-semibold mr-2 whitespace-nowrap">ไฟจ่ายเข้า (Input) :</span>
                <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">
                  {[
                    fd["INVERTER_Input_220V_1P"] && '220V 1 Phase',
                    fd["INVERTER_Input_220V_3P"] && '220V 3 Phase',
                    fd["INVERTER_Input_380V_3P"] && '380V 3 Phase',
                    fd["INVERTER_Input_อื่นๆ"] && fd["INVERTER_Input_อื่นๆ_ระบุ"]
                  ].filter(Boolean).join(', ')}
                </span>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-1 items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">เครื่องเดิม :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["INVERTER_เครื่องเดิม"]}</span>
                </div>
                <div className="flex flex-1 items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">รุ่น :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["INVERTER_เครื่องเดิม_รุ่น"]}</span>
                </div>
                <div className="flex flex-1 items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">เนมเพลท :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["INVERTER_เนมเพลท"]}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold mr-2 whitespace-nowrap">ใช้งานกับมอเตอร์ :</span>
                <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 text-center">{fd["INVERTER_Motor_kW"]}</span>
                <span className="text-[10px] text-gray-500 whitespace-nowrap">kW</span>
                <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 text-center">{fd["INVERTER_Motor_HP"]}</span>
                <span className="text-[10px] text-gray-500 mr-4 whitespace-nowrap">HP</span>
                <span className="font-semibold mr-2 whitespace-nowrap">Phase:</span>
                <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">
                  {[
                    fd["INVERTER_Motor_220V_3P"] && '220V',
                    fd["INVERTER_Motor_380V_3P"] && '380V'
                  ].filter(Boolean).join(', ')}
                </span>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-[2] items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">มอเตอร์ขับงานประเภท :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["INVERTER_Motor_ขับงานประเภท"]}</span>
                </div>
                <div className="flex flex-1 items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">ยี่ห้อ :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["INVERTER_Motor_ยี่ห้อ"]}</span>
                </div>
                <div className="flex flex-1 items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">รุ่น :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["INVERTER_Motor_รุ่น"]}</span>
                </div>
              </div>
              <div className="flex items-center">
                <span className="font-semibold mr-2 whitespace-nowrap">จุดประสงค์ :</span>
                <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">
                  {[
                    fd["จุดประสงค์_ซื้อใหม่"] && 'ซื้อใหม่',
                    fd["จุดประสงค์_ทดแทน"] && 'ทดแทนของเดิม',
                    fd["จุดประสงค์_สำรอง"] && 'ซื้อสำรอง',
                    fd["จุดประสงค์_ซ่อม"] && 'งานซ่อม',
                    fd["จุดประสงค์_โปรเจค"] && 'งานโปรเจค',
                    fd["จุดประสงค์_อื่นๆ"] && fd["จุดประสงค์_อื่นๆ_ระบุ"]
                  ].filter(Boolean).join(', ')}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-semibold mr-2 whitespace-nowrap">อาการที่เสีย :</span>
                <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["INVERTER_อาการเสีย"] || ''}</span>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-1 items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">บริการเสริม :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">
                    {[
                      fd["บริการเสริม_ตู้คอนโทรล"] && 'ตู้คอนโทรล',
                      fd["บริการเสริม_ติดตั้ง"] && 'งานติดตั้ง'
                    ].filter(Boolean).join(', ')}
                  </span>
                </div>
                <div className="flex flex-1 items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">อื่นๆ :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["บริการเสริม_อื่นๆ_ระบุ"] || ''}</span>
                </div>
              </div>
            </div>
          )}

          {/* MOTOR Section */}
          {fd["สินค้า_MOTOR"] && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="text-[11px] font-bold text-gray-700 uppercase">MOTOR</div>
              <div className="flex gap-4">
                <div className="flex flex-1 items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">ยี่ห้อ :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["MOTOR_ยี่ห้อ"]}</span>
                </div>
                <div className="flex flex-1 items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">ขนาด :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 text-center">{fd["MOTOR_ขนาด_kW"]}</span>
                  <span className="ml-2 text-[10px] text-gray-500 mr-2 whitespace-nowrap">kW</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 text-center">{fd["MOTOR_ขนาด_HP"]}</span>
                  <span className="ml-2 text-[10px] text-gray-500 whitespace-nowrap">HP</span>
                </div>
              </div>
            </div>
          )}

          {/* PUMP Section */}
          {fd["สินค้า_PUMP"] && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="text-[11px] font-bold text-gray-700 uppercase">PUMP</div>
              <div className="flex gap-4">
                <div className="flex flex-1 items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">ยี่ห้อ :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["PUMP_ยี่ห้อ"]}</span>
                </div>
                <div className="flex flex-1 items-center">
                  <span className="font-semibold mr-2 whitespace-nowrap">ชนิด :</span>
                  <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["PUMP_ชนิด"]}</span>
                </div>
              </div>
            </div>
          )}

          {/* SOLAR Section */}
          {fd["สินค้า_SOLAR_ROOF"] && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="text-[11px] font-bold text-gray-700 uppercase">SOLAR ROOF</div>
            </div>
          )}
        </div>

        {/* Section 3: Stock / Remarks */}
        <div className="border border-gray-600 rounded-lg p-5 flex flex-col gap-6">
          <div className="font-semibold text-gray-800">สินค้าในสต๊อก / หมายเหตุ</div>
          <div className="flex gap-4">
            <div className="flex flex-1 items-center">
              <span className="font-semibold mr-2 whitespace-nowrap">สินค้าในสต๊อก :</span>
              <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">
                {fd["สต๊อก_มี"] ? 'มีสินค้า' : fd["สต๊อก_ไม่มี"] ? 'ไม่มีสินค้า' : ''}
              </span>
            </div>
            <div className="flex flex-1 items-center">
              <span className="font-semibold mr-2 whitespace-nowrap">สินค้านอกสต๊อก ผู้ขาย :</span>
              <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["สต๊อก_ผู้ขาย"] || ''}</span>
            </div>
          </div>
          <div className="flex items-center">
            <span className="font-semibold mr-2 whitespace-nowrap">หมายเหตุ / อื่นๆ :</span>
            <span className="flex-1 text-blue-600 border-b border-dotted border-gray-400 pl-2">{fd["หมายเหตุ"] || ''}</span>
          </div>
        </div>

        {/* Floating Print Button for screen only */}
        <PrintButton />
      </div>
    </div>
  );
}
