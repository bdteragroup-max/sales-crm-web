import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import prisma from '@/app/lib/db';

const PRE_WORK_CHECKLIST = [
  { key: 'verify_site', label: '1. ตรวจสอบพื้นที่ทำงานตรงตามแบบติดตั้ง' },
  { key: 'photos_before', label: '2. ถ่ายรูปสถานที่ก่อนทำการติดตั้ง' },
  { key: 'ppe_check', label: '3. ตรวจสอบชุดทำงาน PPE ครบถ้วน' },
  { key: 'toolbox_talk', label: '4. ประชุม Toolbox Talk ก่อนเริ่มงาน' },
  { key: 'tools_crane', label: '5. ตรวจสอบเครื่องมือ / รถเครน / นั่งร้าน' },
];

const POST_INSTALL_PHOTOS = [
  { key: 'install_site', label: '1. รูปสถานที่ติดตั้ง' },
  { key: 'pv_panel', label: '2. แผง PV (Nameplate + มุมกว้าง)' },
  { key: 'inverter', label: '3. อินเวอร์เตอร์ (Nameplate + จุดติดตั้ง)' },
  { key: 'ac_cabinet', label: '4. ตู้ AC (เบรกเกอร์, SPD)' },
  { key: 'connection_points', label: '5. จุดเชื่อมต่อ (เบรกเกอร์, CT)' },
  { key: 'zero_export', label: '6. อุปกรณ์กันย้อน (Zero Export)' },
  { key: 'protection_devices', label: '7. อุปกรณ์กันไฟรั่ว (RCCB, RCBO, CB)' },
  { key: 'overall', label: '8. รูปภาพรวมจุดติดตั้ง (มุมกว้าง)' },
];

const HV_CHECKLIST = [
  { key: 'main_bus_bar', label: '1. จุดต่อเข้า Main Bus Bar / MDB' },
  { key: 'zero_export_hv', label: '2. กันย้อน High Voltage' },
  { key: 'transformer', label: '3. หม้อแปลง (Nameplate + kVA)' },
  { key: 'relay_breaker', label: '4. Relay + Circuit Breaker + CT/PT/UPS' },
];

function renderPhotoChecklist(photoChecklist: any, checklistImages: any, checklistDefinition: any[]) {
  if (!photoChecklist) return '';
  let html = '<table style="margin-top: 10px;">';
  checklistDefinition.forEach(item => {
    const isChecked = photoChecklist[item.key];
    const images = (checklistImages?.[item.key] || []).filter(Boolean);
    let imagesHtml = '';

    if (images.length > 0) {
      imagesHtml = `<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">`;
      images.forEach((img: string) => {
        imagesHtml += `<img src="${img}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;"/>`;
      });
      imagesHtml += `</div>`;
    }

    html += `
      <tr>
        <td style="border: none; border-bottom: 1px dashed #eee; padding: 12px 0;">
          <div style="font-weight: bold; margin-bottom: 8px;">
            <span class="checkbox ${isChecked ? 'checked' : ''}"></span> ${item.label}
          </div>
          ${imagesHtml}
        </td>
      </tr>
    `;
  });
  html += '</table>';
  return html;
}

function renderList(list: any) {
  if (!list || !Array.isArray(list) || list.length === 0) return '-';
  return '<ul style="margin:0; padding-left:20px;">' + list.map((item: string) => `<li>${item}</li>`).join('') + '</ul>';
}

function generateSolarChecklistHTML(project: any): string {
  return `
  <!DOCTYPE html>
  <html lang="th">
  <head> 
    <meta charset="UTF-8"/> 
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style> 
      body { font-family: 'Sarabun', sans-serif; font-size: 14px; color: #000; } 
      .header { text-align: center; margin-bottom: 20px; } 
      .section-title { background: #f5e6d3; padding: 8px 12px; font-weight: bold; border-left: 4px solid #e07b39; margin: 16px 0 8px; } 
      table { width: 100%; border-collapse: collapse; } 
      td { border: 1px solid #ccc; padding: 8px; } 
      .checkbox { display: inline-block; width: 14px; height: 14px; border: 1px solid #333; margin-right: 8px; text-align: center; line-height: 14px; }
      .checked::after { content: "✓"; font-size: 12px; }
      .signature-box { border: 1px solid #ccc; height: 80px; margin-top: 8px; }
      img.sig { width: 100%; height: 80px; object-fit: contain; }
      
      /* Better printing */
      @media print {
        .page-break { page-break-before: always; }
        .avoid-break { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>

  <!-- Header -->
  <div class="header">
    <strong>บริษัท เทอรา อิเล็กทริค จำกัด (TERA Electric Co., Ltd.)</strong><br/>
    39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250<br/>
    โทร: +66(0) 23280801-3 แฟกซ์: +66(2) 23280804<br/>
    เลขประจำตัวผู้เสียภาษี: 0105557159958
    <h3 style="margin-top: 15px;">เอกสารการเข้าหน้างานติดตั้งแผงโซลาร์เซลล์ (Site Entry & Photo Checklist)</h3>
  </div>

  <!-- Project Information -->
  <table>
    <tr><td width="250">ชื่อโครงการ/ลูกค้า (Project Name/Customer)</td><td>${project.clientName ?? ""}</td></tr>
    <tr><td>สถานที่ติดตั้ง (Installation Location)</td><td>${project.siteAddress ?? ""}</td></tr>
    <tr><td>เลขที่ใบเสนอราคา/JB (Quotation/JB No.)</td><td>${project.jbNumber ?? ""}</td></tr>
    <tr><td>วันที่เริ่มงาน (Work Start Date)</td><td>${project.siteCheckInTime ? new Date(project.siteCheckInTime).toLocaleDateString("th-TH") : ""}</td></tr>
  </table>

  <!-- Section 1 -->
  <div class="section-title">1. ข้อมูลการเข้างาน (Check-in)</div>
  <table>
    <tr><td width="250">เวลาเข้างาน (Time of arrival)</td><td>${project.siteCheckInTime ? new Date(project.siteCheckInTime).toLocaleTimeString("th-TH") : ""}</td></tr>
    <tr><td>รายชื่อทีมงาน (Staff/Team members)</td><td>${project.siteTeamMembers || ((project as any)._formattedTeamMembers ?? "")}</td></tr>
    <tr><td>หัวหน้าทีม (Supervisor/Team Leader)</td><td>${project.siteSupervisor || project.manager?.fullName || ""}</td></tr>
  </table>

  <!-- Section 2 -->
  <div class="avoid-break">
    <div class="section-title">2. รายการตรวจสอบก่อนเริ่มงาน (Pre-Work Checklist)</div>
    ${renderPhotoChecklist(project.preChecklist, project.checklistImages, PRE_WORK_CHECKLIST)}
  </div>

  <!-- Section 3 -->
  <div class="section-title page-break">3. รูปถ่ายหน้างานหลังติดตั้ง (Post-Installation Site Photos)</div>
  ${renderPhotoChecklist(project.photoChecklist, project.checklistImages, POST_INSTALL_PHOTOS)}

  <!-- Section 4 (conditional) -->
  ${project.isHighVoltage ? `
  <div class="section-title page-break">4. รูปถ่ายจุดเชื่อมต่อ High Voltage (22-33-115 kVA)</div>
  ${renderPhotoChecklist(project.hvChecklist, project.checklistImages, HV_CHECKLIST)}
  ` : ""}

  <!-- Section 5 -->
  <div class="avoid-break">
    <div class="section-title">5. การตรวจสอบหลังจบงาน (Site Checkout)</div>
    <table>
      <tr><td width="250">เวลาออกหน้างาน (Check-out Time)</td><td>${project.siteCheckOutTime ? new Date(project.siteCheckOutTime).toLocaleTimeString("th-TH") : ""}</td></tr>
      <tr><td>สรุปงานที่ทำเสร็จวันนี้ (Work completed today)</td><td>${renderList(project.workSummary)}</td></tr>
      <tr><td>ปัญหา/อุปสรรคหน้างาน (Problems/Obstacles)</td><td>${renderList(project.siteProblems)}</td></tr>
      <tr><td>งานที่เหลือ/นัดหมายครั้งถัดไป (Remaining work)</td><td>${project.remainingWork ?? ""}</td></tr>
    </table>
  </div>

  <!-- Signatures -->
  <div class="avoid-break" style="display:flex; justify-content:space-between; margin-top:40px;">
    <div style="width:45%; text-align:center;"> 
      ${project.supervisorSignUrl ? `<img class="sig" src="${project.supervisorSignUrl}"/>` : '<div class="signature-box"></div>'}
      <div style="margin-top:8px;">ลงชื่อ (Signature) ............................................</div>
      <div>ผู้ควบคุมงาน (Project Supervisor / Team Leader)<br/>${project.siteSupervisor || project.manager?.fullName || ""}</div>
    </div>
    <div style="width:45%; text-align:center;">
      ${project.customerSignUrl ? `<img class="sig" src="${project.customerSignUrl}"/>` : '<div class="signature-box"></div>'}
      <div style="margin-top:8px;">ลงชื่อ (Signature) ............................................</div>
      <div>ตัวแทนลูกค้า / ผู้รับมอบงาน (Customer Representative)</div>
    </div>
  </div>

  </body>
  </html>`;
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await props.params;
    const project = await prisma.project.findUnique({ 
      where: { id: params.id },
      include: {
        manager: true,
        members: {
          include: {
            user: true
          }
        }
      }
    }); 

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Format team members
    const teamMembersList = project.members
      .map((m: any) => `${m.user.fullName} (${m.role === 'admin' ? 'Project Admin' : 'Engineer'})`)
      .join(', ');
    const allMembers = [
      teamMembersList, 
      project.externalTechnicians ? `${project.externalTechnicians} (ช่างภายนอก)` : ''
    ].filter(Boolean).join(', ');
    (project as any)._formattedTeamMembers = allMembers;

    // render HTML template 
    const html = generateSolarChecklistHTML(project);

    const isLocal = process.env.NODE_ENV === 'development';
    
    const browser = await puppeteer.launch({ 
      args: isLocal ? [] : chromium.args, 
      executablePath: isLocal 
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
        : await chromium.executablePath(), 
      headless: true,
    });

    const page = await browser.newPage(); 
    await page.setContent(html, { waitUntil: "load" }); 

    // Explicitly wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');
    
    // Explicitly wait for all images (photos and signatures) to finish loading
    await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" }
    });

    await browser.close();

    return new NextResponse(pdf as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="solar-checklist-${project.id}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
