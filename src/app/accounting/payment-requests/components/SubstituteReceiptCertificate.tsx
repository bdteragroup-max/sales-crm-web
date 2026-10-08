"use client";

import React from 'react';
import { thaiBahtText } from '@/app/lib/thaiBahtText';

export type SubstituteReceiptLineItem = {
  id?: string;
  billDate?: string;
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
};

export type SubstituteReceiptData = {
  groupKey?: string;
  itemIds?: string[];
  itemId?: string;
  billDate: string; // ISO date string e.g. '2026-09-22'
  supplierName: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  items?: SubstituteReceiptLineItem[];
  requesterName: string;
  requesterPosition?: string;
  requesterSignatureUrl?: string;
  approverName?: string;
  approverPosition?: string;
  approverSignatureUrl?: string;
  companyName: string;
  companyCode?: 'TG' | 'TE' | 'TP';
  logoUrl?: string;
  startDate?: string;
  endDate?: string;
  documentDate?: string;
};

/**
 * Map company code or company name to public logo image:
 * TG -> /4.png
 * TE -> /6.png
 * TP -> /7.png
 */
export function getCompanyLogoUrl(companyCode?: string, companyName?: string): string {
  if (companyCode === 'TG') return '/4.png';
  if (companyCode === 'TE') return '/6.png';
  if (companyCode === 'TP') return '/7.png';

  const n = (companyName || '').toLowerCase();
  if (n.includes('กรุ้ป') || n.includes('group') || n.includes('tg')) return '/4.png';
  if (n.includes('อิเล็กทริค') || n.includes('electric') || n.includes('te')) return '/6.png';
  if (n.includes('พาวเวอร์') || n.includes('เพาเวอร์') || n.includes('power') || n.includes('tp')) return '/7.png';

  return '/4.png';
}

/**
 * Format date to Thai Buddhist Era format (D/M/YYYY in BE e.g. 22/9/2569)
 */
export function formatThaiBuddhistDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '';
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) {
      // In case dateStr is like "2026-09-22"
      const parts = String(dateStr).split('T')[0].split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10) + 543;
        const m = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        return `${day}/${m}/${y}`;
      }
      return String(dateStr);
    }
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateStr);
  }
}

/**
 * Parse quantity and unit price from description if not explicitly provided
 */
export function parseDescriptionQtyAndPrice(
  description: string,
  totalAmount: number
): { quantity: number; unitPrice: number } {
  if (!description || !totalAmount || totalAmount <= 0) {
    return { quantity: 1, unitPrice: totalAmount || 0 };
  }
  const match = description.match(
    /(?:^|\s)(\d+)\s*(?:ห้อง|ชิ้น|อัน|ตัว|กล่อง|ชุด|แผ่น|ม้วน|เที่ยว|วัน|คน|รายการ|ใบ|ขวด|คัน|ถุง|ซอง|เล่ม|เครื่อง|หลอด|กิโลกรัม|กก\.|เมตร|ลัง|แพ็ค|แพค)/i
  );
  if (match && match[1]) {
    const qty = parseInt(match[1], 10);
    if (qty > 0 && qty < 10000) {
      const unitPrice = Math.round((totalAmount / qty) * 100) / 100;
      return { quantity: qty, unitPrice };
    }
  }
  return { quantity: 1, unitPrice: totalAmount };
}

/**
 * Generate sanitized file name for the certificate PDF
 */
export function getSubstituteCertificateFileName(data: SubstituteReceiptData): string {
  const shop = (data.supplierName || 'ร้านค้า').trim().replace(/[/\\?%*:|"<>]/g, '_');
  const countSuffix = data.items && data.items.length > 1 ? `_รวม_${data.items.length}_รายการ` : '';
  const desc = (data.description || data.items?.[0]?.description || 'รายการ').trim().slice(0, 18).replace(/[/\\?%*:|"<>]/g, '_');
  return `ใบรับรองแทนใบเสร็จ_${shop}${countSuffix}_${desc}.pdf`;
}

/**
 * Render raw HTML string for the Certificate of Payment (ใบรับรองแทนใบเสร็จรับเงิน)
 * Styled exactly according to the Thai Revenue Department template provided in the image.
 */
export function renderSubstituteReceiptHtml(data: SubstituteReceiptData): string {
  const formattedDate = formatThaiBuddhistDate(data.documentDate || data.billDate || new Date());
  const supplierName = (data.supplierName || '').trim();

  // Prepare line items (either from data.items array or single item fallback)
  const lineItems: SubstituteReceiptLineItem[] =
    data.items && data.items.length > 0
      ? data.items
      : [
          {
            id: data.itemId,
            billDate: data.billDate,
            description: data.description || '',
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            amount: data.amount,
          },
        ];

  // Calculate total amount across all items
  const totalAmount = lineItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const bahtTextFormatted = totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const thaiText = thaiBahtText(totalAmount);
  const requester = (data.requesterName || '').trim();
  const position = (data.requesterPosition || '').trim();
  const approver = (data.approverName || '').trim();
  const approverPos = (data.approverPosition || 'หัวหน้างาน').trim();
  const company = (data.companyName || 'บจก.เทอรา พาวเวอร์').trim();
  const startDate = formatThaiBuddhistDate(data.startDate || data.billDate || new Date());
  const endDate = formatThaiBuddhistDate(data.endDate || data.billDate || new Date());

  // Render rows for each line item (5 columns matching the clean header)
  const itemRowsHtml = lineItems
    .map((li) => {
      const rowDate = formatThaiBuddhistDate(li.billDate || data.billDate || new Date());
      const qtyPrice = parseDescriptionQtyAndPrice(li.description, li.amount);
      const rowQty = li.quantity !== undefined && li.quantity > 0 ? li.quantity : qtyPrice.quantity;
      const rowUnitPrice = li.unitPrice !== undefined && li.unitPrice > 0 ? li.unitPrice : qtyPrice.unitPrice;
      const rowTotal = Number(li.amount) || 0;
      const rowBahtFormatted = rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      return `
        <tr style="height: 34px; border-bottom: 1px solid #000000;">
          <td style="border-right: 1px solid #000000; padding: 6px 4px; font-size: 13px; font-family: monospace; vertical-align: middle; text-align: center;">
            ${rowDate}
          </td>
          <td style="border-right: 1px solid #000000; text-align: left; padding: 6px 10px; font-weight: 500; vertical-align: middle; font-size: 13px;">
            ${li.description || ''}
          </td>
          <td style="border-right: 1px solid #000000; padding: 6px 4px; font-weight: 500; vertical-align: middle; text-align: center; font-size: 13px;">
            ${rowQty}
          </td>
          <td style="border-right: 1px solid #000000; text-align: right; padding: 6px 10px; font-weight: 500; font-family: monospace; vertical-align: middle; font-size: 13px;">
            ${rowUnitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style="text-align: right; padding: 6px 10px; font-weight: 600; font-family: monospace; vertical-align: middle; font-size: 13px;">
            ${rowBahtFormatted}
          </td>
        </tr>
      `;
    })
    .join('');

  // Generate empty rows to mimic the official form height
  const emptyRowCount = Math.max(1, 6 - lineItems.length);
  const emptyRowsHtml = Array.from({ length: emptyRowCount })
    .map(
      () => `
      <tr style="height: 30px; border-bottom: 1px solid #000000;">
        <td style="border-right: 1px solid #000000;">&nbsp;</td>
        <td style="border-right: 1px solid #000000;">&nbsp;</td>
        <td style="border-right: 1px solid #000000;">&nbsp;</td>
        <td style="border-right: 1px solid #000000;">&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
    `
    )
    .join('');

  return `
    <div id="substitute-receipt-content" style="width: 794px; min-height: 1123px; padding: 48px 56px; box-sizing: border-box; background: #ffffff; color: #000000; font-family: 'Sarabun', 'TH Sarabun New', Leelawadee, sans-serif; -webkit-font-smoothing: antialiased; line-height: 1.4;">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');
        #substitute-receipt-content, #substitute-receipt-content * {
          font-family: 'Sarabun', 'TH Sarabun New', sans-serif !important;
          box-sizing: border-box;
        }
      </style>

      <!-- Centered Document Title (Official Form Style) -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 22px; font-weight: 700; line-height: 1.3; letter-spacing: 0.5px;">ใบรับรองแทนใบเสร็จรับเงิน</div>
        <div style="font-size: 15px; font-weight: 700; line-height: 1.4; letter-spacing: 0.8px; margin-top: 4px;">CERTIFICATION OF PAYMENT</div>
      </div>

      <!-- Date Row (Top Right) -->
      <div style="display: flex; justify-content: flex-end; align-items: flex-end; margin-bottom: 18px; font-size: 14.5px;">
        <span style="font-weight: 500; margin-right: 8px; padding-bottom: 4px;">วันที่</span>
        <span style="display: inline-block; min-width: 140px; text-align: center; border-bottom: 1px dotted #000000; padding: 0 12px 4px 12px; font-weight: 600; line-height: 1.3;">
          ${formattedDate || '&nbsp;'}
        </span>
      </div>

      <!-- Business Name Row -->
      <div style="display: flex; align-items: flex-end; margin-bottom: 16px; font-size: 14.5px;">
        <span style="font-weight: 600; margin-right: 8px; white-space: nowrap; padding-bottom: 4px;">ชื่อกิจการ</span>
        <span style="flex: 1; border-bottom: 1px dotted #000000; padding: 0 12px 4px 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;">
          ${supplierName || '&nbsp;'}
        </span>
      </div>

      <!-- Items Table (Single TR Header to prevent html2canvas line overlapping) -->
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; font-size: 13.5px; text-align: center; margin-bottom: 14px;">
        <thead>
          <tr style="height: 38px; border-bottom: 1.5px solid #000000; background-color: #ffffff;">
            <th style="border-right: 1px solid #000000; width: 14%; padding: 6px 4px; font-weight: 700; vertical-align: middle; text-align: center;">วันที่</th>
            <th style="border-right: 1px solid #000000; width: 44%; padding: 6px 8px; font-weight: 700; vertical-align: middle; text-align: center;">รายการ</th>
            <th style="border-right: 1px solid #000000; width: 12%; padding: 6px 4px; font-weight: 700; vertical-align: middle; text-align: center;">จำนวน</th>
            <th style="border-right: 1px solid #000000; width: 15%; padding: 6px 6px; font-weight: 700; vertical-align: middle; text-align: center;">ราคา/หน่วย</th>
            <th style="width: 15%; padding: 6px 6px; font-weight: 700; vertical-align: middle; text-align: center;">จำนวนเงิน (บาท)</th>
          </tr>
        </thead>
        <tbody>
          <!-- Item Data Rows -->
          ${itemRowsHtml}

          <!-- Empty spacing rows to mimic the official form proportions -->
          ${emptyRowsHtml}
        </tbody>
        <tfoot>
          <!-- Total Summary Row -->
          <tr style="border-top: 1.5px solid #000000; height: 38px; background-color: #fafafa;">
            <td colspan="3" style="border-right: 1px solid #000000; text-align: left; padding: 6px 12px; vertical-align: middle;">
              <span style="font-weight: 600;">จำนวนเงินเป็นตัวอักษร :</span>
              <span style="margin-left: 8px; font-weight: 600;">${thaiText}</span>
            </td>
            <td style="border-right: 1px solid #000000; font-weight: 700; text-align: center; padding: 6px 4px; vertical-align: middle;">
              รวม
            </td>
            <td style="text-align: right; padding: 6px 10px; font-weight: 700; font-family: monospace; vertical-align: middle; font-size: 14px;">
              ${bahtTextFormatted}
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- Bottom Certification Box -->
      <div style="border: 1.5px solid #000000; padding: 18px 20px; font-size: 13.5px; color: #000000; box-sizing: border-box; width: 100%;">
        <!-- Row 1: ข้าพเจ้า ... (ผู้เบิกจ่าย) ตำแหน่ง ... -->
        <div style="display: flex; align-items: flex-end; margin-bottom: 12px; min-height: 28px; width: 100%; box-sizing: border-box;">
          <span style="white-space: nowrap; margin-right: 6px; padding-bottom: 4px;">ข้าพเจ้า</span>
          <span style="flex: 1; text-align: center; border-bottom: 1px dotted #000000; font-weight: 600; padding: 0 8px 4px 8px; margin: 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;">
            ${requester || '&nbsp;'}
          </span>
          <span style="white-space: nowrap; margin: 0 6px; padding-bottom: 4px;">(ผู้เบิกจ่าย) ตำแหน่ง</span>
          <span style="min-width: 130px; max-width: 220px; text-align: center; border-bottom: 1px dotted #000000; font-weight: 600; padding: 0 8px 4px 8px; margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;">
            ${position || '&nbsp;'}
          </span>
        </div>

        <!-- Row 2: ข้อความรับรองตามแบบ บก.111 มาตรฐานกรมบัญชีกลาง/สรรพากร -->
        <div style="margin-bottom: 12px; line-height: 1.5; font-size: 13.5px; word-break: break-word;">
          ขอรับรองว่า รายจ่ายข้างต้นนี้ไม่อาจเรียกเก็บใบเสร็จรับเงินจากผู้รับได้ และข้าพเจ้าได้จ่ายไปในงานของทาง
        </div>

        <!-- Row 3: [ชื่อบริษัท] โดยแท้ ตั้งแต่วันที่ ... ถึงวันที่ ... -->
        <div style="display: flex; align-items: flex-end; margin-bottom: 22px; min-height: 28px; width: 100%; box-sizing: border-box;">
          <span style="flex: 1; min-width: 140px; text-align: center; border-bottom: 1px dotted #000000; font-weight: 600; padding: 0 8px 4px 8px; margin-right: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;">
            ${company || '&nbsp;'}
          </span>
          <span style="white-space: nowrap; margin-right: 6px; padding-bottom: 4px;">โดยแท้ ตั้งแต่วันที่</span>
          <span style="min-width: 90px; text-align: center; border-bottom: 1px dotted #000000; font-weight: 600; padding: 0 6px 4px 6px; margin: 0 4px; white-space: nowrap; line-height: 1.3;">
            ${startDate || '&nbsp;'}
          </span>
          <span style="white-space: nowrap; margin: 0 6px; padding-bottom: 4px;">ถึงวันที่</span>
          <span style="min-width: 90px; text-align: center; border-bottom: 1px dotted #000000; font-weight: 600; padding: 0 6px 4px 6px; margin: 0 4px; white-space: nowrap; line-height: 1.3;">
            ${endDate || '&nbsp;'}
          </span>
        </div>

        <!-- Signature Section -->
        <div style="display: flex; justify-content: space-between; margin-top: 32px; padding: 0 10px;">
          <!-- Approver (Supervisor / หัวหน้างาน) -->
          <div style="width: 48%; text-align: center;">
            <div style="display: flex; align-items: flex-end; justify-content: center; margin-bottom: 6px;">
              <span style="margin-right: 6px; padding-bottom: 4px; font-weight: 500;">ลงชื่อ</span>
              <div style="position: relative; display: inline-block; width: 160px; border-bottom: 1px dotted #000000; height: 28px;">
                ${
                  data.approverSignatureUrl
                    ? `<img src="${data.approverSignatureUrl}" alt="ลายเซ็นผู้อนุมัติ" style="position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); max-height: 48px; max-width: 140px; object-fit: contain;" />`
                    : ''
                }
              </div>
              <span style="margin-left: 6px; padding-bottom: 4px; font-weight: 500;">(ผู้อนุมัติ)</span>
            </div>
            <div style="font-size: 13.5px; font-weight: 600; margin-top: 6px; min-height: 20px;">
              (&nbsp;${approver || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;)
            </div>
            <div style="font-size: 12.5px; color: #374151; margin-top: 3px;">
              ตำแหน่ง &nbsp;${approverPos}
            </div>
          </div>

          <!-- Requester (ผู้เบิกจ่ายเงิน) -->
          <div style="width: 48%; text-align: center;">
            <div style="display: flex; align-items: flex-end; justify-content: center; margin-bottom: 6px;">
              <span style="margin-right: 6px; padding-bottom: 4px; font-weight: 500;">ลงชื่อ</span>
              <div style="position: relative; display: inline-block; width: 160px; border-bottom: 1px dotted #000000; height: 28px;">
                ${
                  data.requesterSignatureUrl
                    ? `<img src="${data.requesterSignatureUrl}" alt="ลายเซ็นผู้เบิกจ่าย" style="position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); max-height: 48px; max-width: 140px; object-fit: contain;" />`
                    : ''
                }
              </div>
              <span style="margin-left: 6px; padding-bottom: 4px; font-weight: 500;">(ผู้เบิกจ่ายเงิน)</span>
            </div>
            <div style="font-size: 13.5px; font-weight: 600; margin-top: 6px; min-height: 20px;">
              (&nbsp;${requester || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;)
            </div>
            <div style="font-size: 12.5px; color: #374151; margin-top: 3px;">
              ตำแหน่ง &nbsp;${position || 'พนักงาน'}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate a high-resolution A4 PDF Blob for the Certificate of Payment
 */
export async function generateSubstituteReceiptPdfBlob(data: SubstituteReceiptData): Promise<{
  blob: Blob;
  file: File;
  fileName: string;
  dataUrl: string;
}> {
  if (typeof window === 'undefined') {
    throw new Error('PDF generation must run in browser');
  }

  // Create temporary off-screen container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.maxWidth = '794px';
  container.style.overflow = 'hidden';
  container.style.boxSizing = 'border-box';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-9999';
  container.innerHTML = renderSubstituteReceiptHtml(data);
  document.body.appendChild(container);

  // Ensure fonts ready (especially web font Sarabun)
  if ((document as any).fonts) {
    try {
      await (document as any).fonts.load('16px Sarabun');
      await (document as any).fonts.ready;
    } catch {}
  }

  // Ensure all images (logo, signatures) are fully loaded before capturing canvas
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve(true);
      return new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });
    })
  );

  // Brief delay to ensure font metrics and layout are completely stable
  await new Promise((resolve) => setTimeout(resolve, 150));

  try {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    const targetEl = (container.firstElementChild as HTMLElement) || container;
    const canvas = await html2canvas(targetEl, {
      scale: 2.0,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Exact A4 dimensions in mm: 210 x 297 mm
    const a4Width = 210;
    const a4Height = 297;
    const imgHeight = (canvas.height * a4Width) / canvas.width;

    if (imgHeight <= a4Height) {
      pdf.addImage(imgData, 'JPEG', 0, 0, a4Width, imgHeight);
    } else {
      // Scale proportionally so the entire certificate fits within 1 page without clipping
      const fitScale = a4Height / imgHeight;
      const fitWidth = a4Width * fitScale;
      const fitX = (a4Width - fitWidth) / 2;
      pdf.addImage(imgData, 'JPEG', fitX, 0, fitWidth, a4Height);
    }

    const blob = pdf.output('blob');
    const dataUrl = pdf.output('datauristring');
    const fileName = getSubstituteCertificateFileName(data);
    const file = new File([blob], fileName, { type: 'application/pdf' });

    return { blob, file, fileName, dataUrl };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Upload generated PDF to Supabase Storage via /api/upload
 * Fallbacks cleanly to local blob URL if storage API is unavailable.
 */
export async function uploadSubstituteReceiptPdf(data: SubstituteReceiptData): Promise<{
  url: string;
  fileName: string;
  fileSize: number;
  dataUrl?: string;
}> {
  const { blob, file, fileName, dataUrl } = await generateSubstituteReceiptPdfBlob(data);

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'uploadsService');

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const result = await res.json();
      if (result.success && result.url) {
        return {
          url: result.url,
          fileName,
          fileSize: file.size,
          dataUrl,
        };
      }
    }
  } catch (err) {
    console.warn('Upload to /api/upload failed, using local blob fallback:', err);
  }

  // Fallback to local Object URL / Data URL if backend upload fails
  const localUrl = URL.createObjectURL(blob);
  return {
    url: localUrl,
    fileName,
    fileSize: file.size,
    dataUrl,
  };
}

/**
 * Visual Component to render the Certificate for on-screen preview & direct printing
 */
export default function SubstituteReceiptCertificateView({
  data,
  className = '',
}: {
  data: SubstituteReceiptData;
  className?: string;
}) {
  const htmlContent = React.useMemo(() => renderSubstituteReceiptHtml(data), [data]);

  return (
    <div
      className={`substitute-receipt-view bg-white shadow-xl mx-auto border border-gray-200 overflow-hidden text-black ${className}`}
      style={{ width: '100%', maxWidth: '794px' }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
