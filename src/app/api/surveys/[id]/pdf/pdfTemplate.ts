export function generateSurveyPdfHtml(survey: any): string {
  // Extract data with safe fallbacks
  const {
    surveyNumber = '-',
    surveyDate,
    customerName = '-',
    projectName = '-',
    contactPerson = '-',
    contactPhone = '-',
    salesperson = {},
    electricalProfile = {},
    usageBehavior = {},
    tariffSelection = {},
    structure = {},
    qa = {},
    photos = [],
    documents = [],
    electricityBill
  } = survey || {};

  const dateFormatted = surveyDate ? new Date(surveyDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';

  const PAGE1 = `
    <div class="sec">
      <div class="sec-title">1. ข้อมูลโครงการและลูกค้า (Project & Customer Info)</div>
      <table class="kv">
        <tr><td class="k">เลขที่สำรวจ</td><td class="sep">:</td><td class="v">${surveyNumber}</td></tr>
        <tr><td class="k">วันที่สำรวจ</td><td class="sep">:</td><td class="v">${dateFormatted}</td></tr>
        <tr><td class="k">ชื่อลูกค้า (นามหน่วยงาน)</td><td class="sep">:</td><td class="v">${customerName}</td></tr>
        <tr><td class="k">ชื่อโปรเจกต์ (ถ้ามี)</td><td class="sep">:</td><td class="v">${projectName}</td></tr>
        <tr><td class="k">ผู้ประสานงาน</td><td class="sep">:</td><td class="v">${contactPerson}</td></tr>
        <tr><td class="k">เบอร์โทรศัพท์</td><td class="sep">:</td><td class="v">${contactPhone}</td></tr>
        <tr><td class="k">พนักงานขาย (Sales)</td><td class="sep">:</td><td class="v">${salesperson?.fullName || '-'}</td></tr>
        <tr><td class="k">พิกัด GPS</td><td class="sep">:</td><td class="v">${survey.gpsCoordinates || '-'}</td></tr>
      </table>
    </div>

    <div class="sec mt-4">
      <div class="sec-title">2. พฤติกรรมการใช้พลังงาน (Usage Behavior)</div>
      <table class="kv">
        <tr><td class="k">วันทำงานต่อสัปดาห์</td><td class="sep">:</td><td class="v">${usageBehavior.operatingDaysPerWeek || '-'} วัน</td></tr>
        <tr><td class="k">เวลาทำงาน (เริ่ม - เลิก)</td><td class="sep">:</td><td class="v">${usageBehavior.operatingHoursStart || '-'} - ${usageBehavior.operatingHoursEnd || '-'}</td></tr>
        <tr><td class="k">เครื่องจักร/อุปกรณ์หลัก</td><td class="sep">:</td><td class="v">${usageBehavior.heavyMachineryDetails || '-'}</td></tr>
      </table>
    </div>
  `;

  const PAGE2 = `
    <div class="sec">
      <div class="sec-title">3. ข้อมูลระบบไฟฟ้า (Electrical Profile)</div>
      <table class="kv">
        <tr><td class="k">ประเภท MDB</td><td class="sep">:</td><td class="v">${electricalProfile.mdbType || '-'}</td></tr>
        <tr><td class="k">แรงดันไฟฟ้า (Voltage)</td><td class="sep">:</td><td class="v">${(electricalProfile.voltageLevel || []).join(', ') || '-'}</td></tr>
        <tr><td class="k">ขนาดหม้อแปลง (Transformer)</td><td class="sep">:</td><td class="v">${electricalProfile.transformerSize || '-'} kVA</td></tr>
        <tr><td class="k">ขนาดมิเตอร์ (Meter Size)</td><td class="sep">:</td><td class="v">${(electricalProfile.meterSize || []).join(', ') || '-'}</td></tr>
      </table>
    </div>

    <div class="sec mt-4">
      <div class="sec-title">4. อัตราค่าไฟที่เลือก (Tariff Selection)</div>
      <table class="kv">
        <tr><td class="k">หมวดหมู่ค่าไฟฟ้า</td><td class="sep">:</td><td class="v">${tariffSelection.tariffCategory || '-'}</td></tr>
      </table>
      ${tariffSelection.tiers && tariffSelection.tiers.length > 0 ? `
        <div style="margin-top: 10px; padding-left: 20px;">
          <strong>รายละเอียดอัตรา:</strong>
          <ul>
            ${tariffSelection.tiers.map((t: any) => `<li>${t.tierName}: ${t.ratePerKwh} บาท/หน่วย</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;

  const PAGE3 = `
    <div class="sec">
      <div class="sec-title">5. โครงสร้างหลังคา (Roof Structure)</div>
      <table class="kv">
        <tr><td class="k">ชนิดหลังคา</td><td class="sep">:</td><td class="v">${(structure.roofType || []).join(', ') || '-'}</td></tr>
        <tr><td class="k">วัสดุหลังคา</td><td class="sep">:</td><td class="v">${structure.roofMaterial || '-'}</td></tr>
        <tr><td class="k">ความสูงหลังคา (โดยประมาณ)</td><td class="sep">:</td><td class="v">${structure.roofHeight || '-'} เมตร</td></tr>
        <tr><td class="k">ความลาดชัน (Slope)</td><td class="sep">:</td><td class="v">${structure.roofSlant || '-'} องศา</td></tr>
        <tr><td class="k">สามารถขึ้นสำรวจได้หรือไม่</td><td class="sep">:</td><td class="v">${structure.isAccessible ? 'ได้' : 'ไม่ได้'}</td></tr>
      </table>
      
      ${structure.roofAges && structure.roofAges.length > 0 ? `
        <div style="margin-top: 15px;">
          <strong>อายุหลังคาแต่ละประเภท:</strong>
          <table class="kv" style="margin-top:5px; padding-left: 10px;">
            ${structure.roofAges.map((r: any) => `<tr><td class="k" style="width: 30%;">${r.roofType}</td><td class="sep">:</td><td class="v">${r.ageYears} ปี</td></tr>`).join('')}
          </table>
        </div>
      ` : ''}
    </div>
  `;

  const photosHtml = photos.map((p: any) => `
    <div class="img-box">
      <img src="${p.fileUrl}" class="att-img" alt="${p.photoType}" />
      <div style="padding: 5px; text-align: center; font-size: 14px; font-weight: bold;">${p.photoType}</div>
      ${p.photoDesc ? `<div style="text-align: center; font-size: 12px; color: #555;">${p.photoDesc}</div>` : ''}
    </div>
  `).join('');

  const PAGE4 = `
    <div class="sec">
      <div class="sec-title">6. เอกสารประกอบ & บิลค่าไฟ (Documents & Bill)</div>
      
      ${electricityBill ? `
        <div class="att-block">
          <div class="att-title">บิลค่าไฟฟ้า (Electricity Bill)</div>
          <div class="att-link"><a href="${electricityBill.fileUrl}" target="_blank">ดูบิลค่าไฟที่อัปโหลด</a></div>
        </div>
      ` : '<p class="muted">ไม่มีบิลค่าไฟฟ้า</p>'}

      ${documents && documents.length > 0 ? `
        <div class="att-block mt-4">
          <div class="att-title">เอกสารอื่นๆ</div>
          <table class="kv">
            ${documents.map((d: any) => `
              <tr>
                <td class="k" style="width: 30%;">${d.documentType}</td>
                <td class="sep">:</td>
                <td class="v">
                  ${d.customerProvided ? '<span style="color: green;">(ลูกค้าเตรียมให้)</span> ' : ''}
                  ${d.note ? d.note : ''}
                  <br/>
                  <a href="${d.fileUrl}" style="color: blue; text-decoration: underline; font-size: 12px;" target="_blank">ดูเอกสาร</a>
                </td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : ''}
    </div>

    <div class="sec mt-4">
      <div class="sec-title">7. รูปถ่ายหน้างาน (Site Photos)</div>
      ${photos && photos.length > 0 ? `
        <div class="att-grid">
          ${photosHtml}
        </div>
      ` : '<p class="muted">ไม่มีรูปถ่ายหน้างาน</p>'}
    </div>
  `;

  const PAGE5 = `
    <div class="sec">
      <div class="sec-title">8. คำถามเพิ่มเติม (QA)</div>
      <table class="kv">
        <tr><td class="k">ประเมินโหลดไฟฟ้า (Load)</td><td class="sep">:</td><td class="v">${qa.loadEstimate || '-'}</td></tr>
        <tr><td class="k">ความต้องการแบตเตอรี่</td><td class="sep">:</td><td class="v">${qa.batteryRequirement || '-'}</td></tr>
        <tr><td class="k">พื้นที่ติดตั้ง Inverter</td><td class="sep">:</td><td class="v">${qa.inverterLocation || '-'}</td></tr>
        <tr><td class="k">จุดเชื่อมต่อ EV Charger</td><td class="sep">:</td><td class="v">${qa.evChargerInfo || '-'}</td></tr>
        <tr><td class="k">จุดประสงค์หลักในการติดตั้ง</td><td class="sep">:</td><td class="v">${(qa.solarReasons || []).join(', ') || '-'}</td></tr>
        <tr><td class="k">รายละเอียดเพิ่มเติม</td><td class="sep">:</td><td class="v">${qa.solarReasonsDetail || '-'}</td></tr>
      </table>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Survey PDF - \${surveyNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        html, body {
          margin: 0; padding: 0; color: #111; font-size: 16px; line-height: 1.55;
          font-family: 'Sarabun', Tahoma, Arial, sans-serif !important;
        }
        body { background: #fff; }
        .page { padding: 10mm 14mm 14mm; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .letterhead { display: flex; gap: 14px; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #111; }
        .logo { width: 110px; height: auto; display: block; }
        .corp { flex: 1; }
        .corp-name { font-size: 18px; font-weight: 800; margin: 0 0 2px; }
        .corp-line { margin: 0; font-size: 14px; color: #222; font-weight: 400; }
        .sec { margin-top: 12px; }
        .sec-title { font-size: 16px; font-weight: 800; padding: 6px 0; border-bottom: 1px solid #e5e5e5; margin: 0 0 8px; }
        .sec-body { margin: 0; }
        table.kv { width: 100%; border-collapse: collapse; }
        table.kv td { padding: 3px 0; vertical-align: top; }
        table.kv td.k { width: 44%; font-weight: 700; padding-right: 8px; white-space: nowrap; }
        table.kv td.sep { width: 10px; text-align: center; color: #444; font-weight: 400; }
        table.kv td.v { width: auto; word-break: break-word; font-weight: 400 !important; }
        .att-block { border: 1px solid #eee; border-radius: 12px; padding: 10px 10px 10px; margin: 10px 0; page-break-inside: avoid; }
        .att-title { font-weight: 800; font-size: 15.5px; margin-bottom: 4px; }
        .att-grid { margin-top: 8px; font-size: 0; display: flex; flex-wrap: wrap; }
        .img-box { display: inline-block; vertical-align: top; width: calc(50% - 4px); margin: 0 8px 8px 0; border: 1px solid #eee; border-radius: 10px; padding: 6px; background: #fff; break-inside: avoid; page-break-inside: avoid; }
        .att-img { width: 100%; max-height: 200px; object-fit: contain; display: block; }
        .att-link { margin: 4px 0; font-size: 12px; }
        .att-link a { color: #1d4ed8; text-decoration: underline; word-break: break-all; }
        .mt-4 { margin-top: 1rem; }
        .muted { color: #666; }
      </style>
    </head>
    <body class="mode-pdf">
      <!-- PAGE 1 -->
      <div class="page">
        <div class="letterhead">
          <div class="corp">
            <p class="corp-name">บริษัท เทอรา อิเล็กทริค จำกัด (TERA Electric Co., Ltd.)</p>
            <p class="corp-line">39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250</p>
            <p class="corp-line">โทร: +66(0) 23280801-3 แฟกซ์: +66(2) 23280804 เลขประจำตัวผู้เสียภาษี 0105557159958</p>
          </div>
        </div>
        <div class="page-content">\${PAGE1}</div>
      </div>

      <!-- PAGE 2 -->
      <div class="page">
        <div class="letterhead">
          <div class="corp">
            <p class="corp-name">บริษัท เทอรา อิเล็กทริค จำกัด (TERA Electric Co., Ltd.)</p>
            <p class="corp-line">39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250</p>
            <p class="corp-line">โทร: +66(0) 23280801-3 แฟกซ์: +66(2) 23280804 เลขประจำตัวผู้เสียภาษี 0105557159958</p>
          </div>
        </div>
        <div class="page-content">\${PAGE2}</div>
      </div>

      <!-- PAGE 3 -->
      <div class="page">
        <div class="letterhead">
          <div class="corp">
            <p class="corp-name">บริษัท เทอรา อิเล็กทริค จำกัด (TERA Electric Co., Ltd.)</p>
            <p class="corp-line">39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250</p>
            <p class="corp-line">โทร: +66(0) 23280801-3 แฟกซ์: +66(2) 23280804 เลขประจำตัวผู้เสียภาษี 0105557159958</p>
          </div>
        </div>
        <div class="page-content">\${PAGE3}</div>
      </div>

      <!-- PAGE 4 -->
      <div class="page">
        <div class="letterhead">
          <div class="corp">
            <p class="corp-name">บริษัท เทอรา อิเล็กทริค จำกัด (TERA Electric Co., Ltd.)</p>
            <p class="corp-line">39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250</p>
            <p class="corp-line">โทร: +66(0) 23280801-3 แฟกซ์: +66(2) 23280804 เลขประจำตัวผู้เสียภาษี 0105557159958</p>
          </div>
        </div>
        <div class="page-content">\${PAGE4}</div>
      </div>

      <!-- PAGE 5 -->
      <div class="page">
        <div class="letterhead">
          <div class="corp">
            <p class="corp-name">บริษัท เทอรา อิเล็กทริค จำกัด (TERA Electric Co., Ltd.)</p>
            <p class="corp-line">39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250</p>
            <p class="corp-line">โทร: +66(0) 23280801-3 แฟกซ์: +66(2) 23280804 เลขประจำตัวผู้เสียภาษี 0105557159958</p>
          </div>
        </div>
        <div class="page-content">\${PAGE5}</div>
      </div>
    </body>
    </html>
  `;
}
