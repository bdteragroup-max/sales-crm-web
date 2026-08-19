import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';

function generateGoodsReturnHTML(doc: any, logoBase64: string = '') {
  const items = doc.items ? (typeof doc.items === 'string' ? JSON.parse(doc.items) : doc.items) : [];

  // Format Date safely
  const formattedDate = doc.date ? new Date(doc.date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : '';

  let itemsHtml = '';
  // Only display the items present
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    itemsHtml += `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>${item.itemCode ? `<b>${item.itemCode}</b><br/>` : ''}${item.description || ''}</td>
        <td class="text-center">${item.quantity || ''}</td>
        <td class="text-center">${item.unit || ''}</td>
        <td class="text-right">${item.totalAmount ? Number(item.totalAmount).toLocaleString() : ''}</td>
      </tr>
    `;
  }

  // Calculate total amount if there are items
  const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.totalAmount) || 0), 0);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Goods Return Note</title>
    <style>
      @font-face {
        font-family: 'TH Sarabun New';
        src: url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew.woff2') format('woff2');
        font-weight: normal;
        font-style: normal;
      }
      @font-face {
        font-family: 'TH Sarabun New';
        src: url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew-Bold.woff2') format('woff2');
        font-weight: bold;
        font-style: normal;
      }
      body {
        font-family: 'TH Sarabun New', sans-serif;
        font-size: 16px;
        margin: 0;
        padding: 0;
        color: #000;
        background: #fff;
      }
      .page-container {
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        box-sizing: border-box;
      }
      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
      }
      .logo-col {
        display: flex;
        gap: 15px;
        align-items: center;
      }
      .logo {
        width: 80px;
        height: 80px;
        background-color: #ff2301;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 40px;
        line-height: 1;
      }
      .company-info h1 {
        margin: 0 0 5px 0;
        font-size: 18px;
      }
      .company-info p {
        margin: 2px 0;
        font-size: 12px;
      }
      .doc-title {
        border: 2px solid #000;
        border-radius: 10px;
        padding: 10px 30px;
        font-size: 20px;
        font-weight: bold;
      }
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 15px;
      }
      .info-row {
        display: flex;
        margin-bottom: 8px;
      }
      .info-label {
        width: 120px;
        font-weight: 600;
      }
      .info-value {
        flex: 1;
        border-bottom: 1px dotted #ccc;
      }
      table.items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }
      table.items-table th, table.items-table td {
        border: 1px solid #000;
        padding: 8px;
        font-size: 13px;
      }
      table.items-table th {
        background-color: #f5f5f5;
        font-weight: bold;
        text-align: center;
      }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      
      .signature-section {
        display: flex;
        justify-content: space-between;
        margin-top: 50px;
        padding: 0 20px;
      }
      .signature-box {
        text-align: center;
        width: 40%;
      }
      .sig-line {
        border-bottom: 1px dotted #000;
        margin-bottom: 10px;
        min-height: 40px;
      }
      .sig-date {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 10px;
      }
      .sig-date span {
        border-bottom: 1px dotted #000;
        width: 30px;
        display: inline-block;
      }
      .sig-date span.year {
        width: 50px;
      }
    </style>
  </head>
  <body>
    <div class="page-container">
      <div class="header-section">
        <div class="logo-col">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo" style="background-color: transparent;" />` : `<div class="logo">T</div>`}
          <div class="company-info">
            <h1>บริษัท เทอรา กรุ้ป จำกัด</h1>
            <p>39 ซ.เฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250</p>
            <p>โทรศัพท์ 02-328-0801-3       โทรสาร 02-328-0804</p>
          </div>
        </div>
        <div class="doc-title">ใบส่งคืนสินค้า</div>
      </div>

      <div class="info-grid">
        <div>
          <div class="info-row">
            <div class="info-label">ลูกค้า :</div>
            <div class="info-value">${doc.customer || doc.company?.companyName || ''}</div>
          </div>
          <div class="info-row">
            <div class="info-label">สถานที่ส่งของ :</div>
            <div class="info-value">${doc.deliveryLocation || doc.company?.address || ''}</div>
          </div>
        </div>
        <div>
          <div class="info-row">
            <div class="info-label">เลขที่เอกสาร :</div>
            <div class="info-value">${doc.documentNo}</div>
          </div>
          <div class="info-row">
            <div class="info-label">วันที่ :</div>
            <div class="info-value">${formattedDate}</div>
          </div>
          <div class="info-row">
            <div class="info-label">อ้างถึง :</div>
            <div class="info-value">${doc.reference || doc.job?.jobNumber || doc.quotation?.quotationNumber || ''}</div>
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50px;">No.</th>
            <th>รหัสสินค้า/รายละเอียด</th>
            <th style="width: 80px;">จำนวน</th>
            <th style="width: 80px;">หน่วย</th>
            <th style="width: 100px;">รวม</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          <tr>
            <td colspan="4" class="text-right" style="font-weight: bold; border-right: none;">รวมทั้งสิ้น</td>
            <td class="text-right" style="font-weight: bold; border-left: 1px solid #000;">${totalAmount.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div class="signature-section">
        <div class="signature-box">
          <div class="sig-line">
            ${doc.receiverName ? `<b>${doc.receiverName}</b>` : ''}
          </div>
          <div>ผู้รับสินค้า</div>
          <div class="sig-date">วันที่ <span></span> / <span></span> / <span class="year"></span></div>
        </div>
        <div class="signature-box">
          <div class="sig-line">
            ${doc.senderName ? `<b>${doc.senderName}</b>` : ''}
          </div>
          <div>ผู้ส่งสินค้า</div>
          <div class="sig-date">วันที่ <span></span> / <span></span> / <span class="year"></span></div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await props.params;
    const doc = await prisma.goodsReturn.findUnique({
      where: { id: params.id },
      include: {
        job: true,
        quotation: true,
        company: true
      }
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const imagePath = path.join(process.cwd(), 'public', '4.png');
    let logoBase64 = '';
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      logoBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    }

    const html = generateGoodsReturnHTML(doc, logoBase64);
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
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" }
    });

    await browser.close();

    return new NextResponse(pdf as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${doc.documentNo}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF', details: error?.message || String(error) }, { status: 500 });
  }
}
