import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import prisma from '@/app/lib/db';

function generateSatisfactionPDFHTML(survey: any): string {
  const scores = [
    { label: 'Price (ราคา)', score: survey.scorePrice },
    { label: 'Quality (คุณภาพ)', score: survey.scoreQuality },
    { label: 'Delivery (การจัดส่ง)', score: survey.scoreDelivery },
    { label: 'Sales (พนักงานขาย)', score: survey.scoreSales },
    { label: 'Support (การแก้ปัญหา)', score: survey.scoreSupport },
    { label: 'After-Sales (บริการหลังการขาย)', score: survey.scoreAfterSales },
  ];

  const purchaseReasonsHtml = survey.purchaseReasons.length > 0 
    ? survey.purchaseReasons.map((r: string) => `<span style="display:inline-block; padding: 4px 10px; background: #e5f6fd; color: #0288d1; border-radius: 20px; font-size: 12px; margin-right: 5px; margin-bottom: 5px;">${r}</span>`).join('')
    : '-';

  return `
  <!DOCTYPE html>
  <html lang="th">
  <head> 
    <meta charset="UTF-8"/> 
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style> 
      body { font-family: 'Sarabun', sans-serif; font-size: 14px; color: #333; line-height: 1.5; padding: 20px; } 
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ff2301; padding-bottom: 20px; } 
      .header h1 { margin: 0; color: #ff2301; font-size: 24px; }
      .header p { margin: 5px 0 0 0; color: #666; }
      
      .section { margin-bottom: 30px; }
      .section-title { background: #fdf2f2; color: #ff2301; padding: 10px 15px; font-weight: bold; border-left: 4px solid #ff2301; margin: 0 0 15px 0; font-size: 16px; } 
      
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; } 
      td { border: 1px solid #eee; padding: 10px 15px; } 
      .td-label { width: 40%; font-weight: bold; background: #fafafa; color: #555; }
      
      .score-box { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 15px; text-align: center; }
      .score-number { font-size: 32px; font-weight: bold; color: #ff2301; margin-bottom: 5px; line-height: 1; }
      .score-label { font-size: 12px; color: #888; }
      
      .scores-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
      .score-item { border: 1px solid #eee; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
      .score-item .label { font-size: 13px; color: #666; }
      .score-item .value { font-weight: bold; color: #333; font-size: 16px; }
      
      .box-content { background: #fafafa; border: 1px solid #eee; padding: 15px; border-radius: 6px; min-height: 60px; }
      
      /* Better printing */
      @media print {
        .page-break { page-break-before: always; }
        .avoid-break { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>

  <div class="header">
    <h1>รายงานผลความพึงพอใจลูกค้า</h1>
    <p>(Customer Satisfaction Survey Report)</p>
  </div>

  <div class="section">
    <div class="section-title">1. ข้อมูลลูกค้าและการสำรวจ (Customer & Survey Info)</div>
    <table>
      <tr><td class="td-label">ชื่อบริษัทลูกค้า (Company Name)</td><td><strong>${survey.company.companyName}</strong></td></tr>
      <tr><td class="td-label">จังหวัด (Province)</td><td>${survey.province || '-'}</td></tr>
      <tr><td class="td-label">รอบประเมิน (Survey Round/Year)</td><td>รอบที่ ${survey.surveyRound} / ${survey.surveyYear}</td></tr>
      <tr><td class="td-label">วันที่ประเมิน (Survey Date)</td><td>${new Date(survey.surveyDate).toLocaleDateString('th-TH')}</td></tr>
      <tr><td class="td-label">วิธีการประเมิน (Method)</td><td>${survey.surveyMethod}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">2. ผลคะแนนความพึงพอใจ (Satisfaction Scores)</div>
    
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background: #fffaf9; border: 2px solid #ff2301; padding: 15px 40px; border-radius: 12px;">
        <div style="font-size: 14px; color: #ff2301; font-weight: bold; margin-bottom: 5px;">คะแนนเฉลี่ยรวม (Average Score)</div>
        <div style="font-size: 36px; font-weight: bold; color: #ff2301;">${survey.scoreAverage.toFixed(1)} <span style="font-size: 18px; color: #888;">/ 5</span></div>
      </div>
    </div>

    <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between;">
      ${scores.map(s => `
        <div style="width: 30%; border: 1px solid #eee; padding: 12px; border-radius: 6px; margin-bottom: 10px; background: #fff;">
          <div style="font-size: 13px; color: #666; margin-bottom: 8px;">${s.label}</div>
          <div style="font-weight: bold; font-size: 18px; color: #333;">${s.score} / 5</div>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="section avoid-break">
    <div class="section-title">3. ความคิดเห็นเพิ่มเติม (Feedback & Suggestions)</div>
    <div style="margin-bottom: 15px;">
      <strong style="display: block; margin-bottom: 8px; color: #555;">ปัจจัยหลักที่เลือกซื้อ (Purchase Reasons):</strong>
      <div>${purchaseReasonsHtml}</div>
    </div>
    <div>
      <strong style="display: block; margin-bottom: 8px; color: #555;">ข้อเสนอแนะ (Suggestions):</strong>
      <div class="box-content">${survey.suggestions || '-'}</div>
    </div>
  </div>

  <div class="section avoid-break">
    <div class="section-title">4. การวิเคราะห์และแผนดำเนินการ (Analysis & Action Plan)</div>
    <div style="margin-bottom: 15px;">
      <strong style="display: block; margin-bottom: 8px; color: #555;">บันทึกการวิเคราะห์ (Analysis Note):</strong>
      <div class="box-content">${survey.analysisNote || '-'}</div>
    </div>
    <div>
      <strong style="display: block; margin-bottom: 8px; color: #555;">แผนการดำเนินการ (Action Plan):</strong>
      <div class="box-content">${survey.actionPlan || '-'}</div>
    </div>
  </div>
  
  <div style="margin-top: 50px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
    สร้างรายงานอัตโนมัติจากระบบ TeraSales CRM
  </div>

  </body>
  </html>`;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const survey = await prisma.customerSatisfaction.findUnique({ 
      where: { id },
      include: {
        company: true,
      }
    }); 

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    const html = generateSatisfactionPDFHTML(survey);

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

    await page.evaluateHandle('document.fonts.ready');
    
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" }
    });

    await browser.close();

    return new NextResponse(pdf as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="satisfaction-report-${survey.id}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
