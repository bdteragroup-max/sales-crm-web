import ExcelJS from 'exceljs';
import { PaymentRequestRecord, RequisitionItem } from '@/app/actions/paymentRequests';
import { thaiBahtText } from '@/app/lib/thaiBahtText';

const companyInfoMap: Record<
  string,
  {
    th: string;
    en: string;
    taxId: string;
    address: string;
    telFax: string;
    branchTitle: string;
  }
> = {
  TG: {
    th: 'บริษัท เทอรา กรุ้ป จำกัด',
    en: 'Tera Group Co., Ltd.',
    taxId: '0105552112716',
    address: '39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กทม. 10250',
    telFax: 'โทร: +66(0) 2328-0801-3 แฟกซ์: +66(0) 2328-0804',
    branchTitle: 'สำนักงานใหญ่',
  },
  TE: {
    th: 'บริษัท เทอรา อิเล็กทริค จำกัด',
    en: 'Tera Electric Co., Ltd.',
    taxId: '0105557159958',
    address: '39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กทม. 10250',
    telFax: 'โทร: +66(0) 2328-0801-3 แฟกซ์: +66(0) 2328-0804',
    branchTitle: 'สำนักงานใหญ่',
  },
  TP: {
    th: 'บริษัท เทอรา เพาเวอร์ จำกัด',
    en: 'Tera Power Co., Ltd.',
    taxId: '0105564011223',
    address: '39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กทม. 10250',
    telFax: 'โทร: +66(0) 2328-0801-3 แฟกซ์: +66(0) 2328-0804',
    branchTitle: 'สำนักงานใหญ่',
  },
};

const classificationLabels: Record<string, string> = {
  VENDOR_BILL: 'ชำระเจ้าหนี้การค้า (Vendor Bill / AP)',
  REIMBURSEMENT: 'เบิกจ่ายพนักงาน / สำรองจ่าย (Reimbursement)',
  BRANCH_SITE: 'ขอเบิกจ่ายสาขา / ไซต์งาน (Site / Branch)',
  PETTY_CASH: 'เงินสดย่อย (Petty Cash)',
  CASH_ADVANCE: 'เงินทดรองจ่าย (Cash Advance)',
};

function formatThaiDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '.............................';
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

export type VoucherSignatures = {
  preparedBy?: string | null;
  supervisorApprovedBy?: string | null;
  verifiedBy?: string | null;
  approvedBy?: string | null;
};

// Helper function to apply styles to a 2D range in ExcelJS
function styleRange(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  style: {
    font?: Partial<ExcelJS.Font>;
    fill?: ExcelJS.Fill;
    border?: Partial<ExcelJS.Borders>;
    alignment?: Partial<ExcelJS.Alignment>;
    numFmt?: string;
  }
) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = sheet.getCell(r, c);
      if (style.font) cell.font = { ...cell.font, ...style.font };
      if (style.fill) cell.fill = style.fill;
      if (style.border) cell.border = { ...cell.border, ...style.border };
      if (style.alignment) cell.alignment = { ...cell.alignment, ...style.alignment };
      if (style.numFmt) cell.numFmt = style.numFmt;
    }
  }
}

export async function exportPaymentVoucherToExcel(
  request: PaymentRequestRecord,
  signatures?: VoucherSignatures
): Promise<void> {
  const companyInfo = companyInfoMap[request.company] || companyInfoMap['TG'];
  const netAmount = Number(request.net_amount) || 0;
  const subtotal = Number(request.subtotal_amount) || 0;
  const vat = Number(request.vat_amount) || 0;
  const wht = Number(request.wht_amount) || 0;
  const creditCardDeduction = Number(request.credit_card_deduction) || 0;
  const bahtText = thaiBahtText(netAmount);

  const now = new Date();
  const printTimestamp = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543} ${now
    .getHours()
    .toString()
    .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now
    .getSeconds()
    .toString()
    .padStart(2, '0')}`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TERA CRM / ERP';
  workbook.lastModifiedBy = request.requester_name || 'TERA Staff';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('ใบขออนุมัติจ่ายเงิน', {
    views: [{ showGridLines: true }],
  });

  // Page Setup for standard A4 printing
  sheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.45,
      bottom: 0.45,
      header: 0.2,
      footer: 0.2,
    },
  };

  // Define column dimensions (Columns A to F)
  sheet.columns = [
    { key: 'A', width: 9 },  // No. / ลำดับ
    { key: 'B', width: 16 }, // วันที่บิล / Date
    { key: 'C', width: 24 }, // ผู้จำหน่าย / ร้านค้า / Supplier
    { key: 'D', width: 32 }, // รายการ / วัตถุประสงค์ / Description
    { key: 'E', width: 20 }, // จำนวนเงิน (บาท) / Amount THB
    { key: 'F', width: 20 }, // หมายเหตุ / Remarks
  ];

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  const doubleBottomBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'double', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  const grayHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };

  const lightGrayFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' },
  };

  // 1. Company Header (Logo on Left: A1:A4, Info in Center: B1:D4, Title on Right: E1:F4)
  sheet.mergeCells('A1:A4');
  const cellA1 = sheet.getCell('A1');
  cellA1.value = 'TERA';
  cellA1.font = { name: 'TH Sarabun New', size: 16, bold: true, color: { argb: 'FFDC2626' } };
  cellA1.alignment = { horizontal: 'center', vertical: 'middle' };

  // Attempt to load and embed company logo (TG: /4.png, TE: /6.png, TP: /7.png) over A1:A4
  if (typeof window !== 'undefined') {
    try {
      const companyLogoMap: Record<string, string> = {
        TG: '/4.png',
        TE: '/6.png',
        TP: '/7.png',
      };
      const logoUrl = companyLogoMap[request.company] || '/4.png';
      const logoRes = await fetch(logoUrl);
      if (logoRes.ok) {
        const blob = await logoRes.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const logoImgId = workbook.addImage({
          buffer: arrayBuffer,
          extension: 'png',
        });
        sheet.addImage(logoImgId, {
          tl: { col: 0.1, row: 0.15 },
          ext: { width: 62, height: 60 },
          editAs: 'oneCell',
        });
        // Clear placeholder text once logo image is embedded
        cellA1.value = '';
      }
    } catch {
      // Keep fallback text
    }
  }

  // Center: Company Information
  sheet.mergeCells('B1:D1');
  const cellB1 = sheet.getCell('B1');
  cellB1.value = `${companyInfo.th} (${companyInfo.en})`;
  cellB1.font = { name: 'TH Sarabun New', size: 13, bold: true, color: { argb: 'FF111827' } };
  cellB1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  sheet.mergeCells('B2:D2');
  const cellB2 = sheet.getCell('B2');
  cellB2.value = companyInfo.address;
  cellB2.font = { name: 'TH Sarabun New', size: 10, color: { argb: 'FF374151' } };
  cellB2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  sheet.mergeCells('B3:D3');
  const cellB3 = sheet.getCell('B3');
  cellB3.value = companyInfo.telFax;
  cellB3.font = { name: 'TH Sarabun New', size: 10, color: { argb: 'FF374151' } };
  cellB3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  sheet.mergeCells('B4:D4');
  const cellB4 = sheet.getCell('B4');
  cellB4.value = `เลขประจำตัวผู้เสียภาษี ${companyInfo.taxId} ${companyInfo.branchTitle}`;
  cellB4.font = { name: 'TH Sarabun New', size: 10, color: { argb: 'FF374151' } };
  cellB4.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  // Right: Document Title & PAY NO.
  sheet.mergeCells('E1:F1');
  const cellE1 = sheet.getCell('E1');
  cellE1.value = 'ใบขออนุมัติจ่ายเงิน';
  cellE1.font = { name: 'TH Sarabun New', size: 15, bold: true, color: { argb: 'FF000000' } };
  cellE1.alignment = { horizontal: 'right', vertical: 'middle' };

  sheet.mergeCells('E2:F2');
  const cellE2 = sheet.getCell('E2');
  cellE2.value = '(PAYMENT REQUEST VOUCHER)';
  cellE2.font = { name: 'TH Sarabun New', size: 11, bold: true, color: { argb: 'FF4B5563' } };
  cellE2.alignment = { horizontal: 'right', vertical: 'middle' };

  sheet.mergeCells('E3:F3');
  const cellE3 = sheet.getCell('E3');
  cellE3.value = `เลขที่เอกสาร / PAY NO.: ${request.pay_number || '-'}`;
  cellE3.font = { name: 'TH Sarabun New', size: 12, bold: true, color: { argb: 'FFB91C1C' } };
  cellE3.alignment = { horizontal: 'right', vertical: 'middle' };

  sheet.mergeCells('E4:F4');
  const cellE4 = sheet.getCell('E4');
  cellE4.value = request.urgency === 'EMERGENCY' ? '[ด่วนที่สุด] EMERGENCY' : '';
  cellE4.font = { name: 'TH Sarabun New', size: 11, bold: true, color: { argb: 'FFDC2626' } };
  cellE4.alignment = { horizontal: 'right', vertical: 'middle' };

  // Row Heights for Header
  sheet.getRow(1).height = 22;
  sheet.getRow(2).height = 18;
  sheet.getRow(3).height = 20;
  sheet.getRow(4).height = 18;
  sheet.getRow(5).height = 8; // Spacer

  // 2. Subheader Bar (Row 6)
  sheet.mergeCells('A6:D6');
  const cellA6 = sheet.getCell('A6');
  cellA6.value = `แบบฟอร์มขออนุมัติเบิกจ่ายและตั้งหนี้ ประจำ${companyInfo.th}`;
  cellA6.font = { name: 'TH Sarabun New', size: 11, bold: true, color: { argb: 'FF1F2937' } };
  cellA6.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  sheet.mergeCells('E6:F6');
  const cellE6 = sheet.getCell('E6');
  cellE6.value = `พิมพ์เมื่อ: ${printTimestamp}`;
  cellE6.font = { name: 'TH Sarabun New', size: 10, color: { argb: 'FF4B5563' } };
  cellE6.alignment = { horizontal: 'right', vertical: 'middle' };

  styleRange(sheet, 6, 1, 6, 6, {
    fill: lightGrayFill,
    border: thinBorder,
  });
  sheet.getRow(6).height = 20;
  sheet.getRow(7).height = 8; // Spacer

  // 3. Metadata Section (Rows 8 to 13)
  const metaRowsData = [
    {
      label1: 'วันที่คำขอ (Request Date):',
      val1: formatThaiDate(request.created_at || request.document_date),
      label2: 'วันที่ที่ทำเบิก (Requisition Date):',
      val2: formatThaiDate(request.document_date),
    },
    {
      label1: 'วันที่ต้องการให้จ่าย (Due Date):',
      val1: formatThaiDate(request.requested_payment_date),
      label2: '',
      val2: '',
      fullWidth: true,
    },
    {
      label1: 'ผู้ขอเบิก (Requester):',
      val1: `${request.requester_name || '-'}${request.requester_department ? ` (${request.requester_department})` : ''}${request.requester_phone ? ` โทร ${request.requester_phone}` : ''}`,
      label2: '',
      val2: '',
      fullWidth: true,
    },
    {
      label1: 'ผู้รับเงิน / เจ้าหนี้ (Payee / Supplier):',
      val1: request.supplier_name || '-',
      label2: 'เลขประจำตัวผู้เสียภาษี:',
      val2: request.supplier_tax_id || '-',
    },
    {
      label1: 'ประเภทรายการ (Classification):',
      val1: classificationLabels[request.classification] || request.classification || '-',
      label2: 'โครงการ / ศูนย์ต้นทุน:',
      val2: request.cost_center || `${request.company} FORM`,
    },
    {
      label1: 'สาขาที่เกิดค่าใช้จ่าย (Branch):',
      val1: request.branch || '-',
      label2: 'เลขที่ใบกำกับ/ใบเสร็จ:',
      val2: request.has_no_doc_number ? '(ไม่มีเลขที่เอกสาร - บิลเงินสด/ใบรับรอง)' : request.invoice_number || '-',
    },
    {
      label1: 'ข้อมูลการชำระเงิน (Bank Details):',
      val1: `${request.bank_name || 'พร้อมเพย์ / ไม่ระบุ'}${request.bank_account_no ? ` เลขที่ ${request.bank_account_no}` : ''}${request.bank_account_name ? ` (${request.bank_account_name})` : ''}`,
      label2: 'เลขที่ PO/PR อ้างอิง:',
      val2: request.po_pr_number || '-',
    },
  ];

  let metaStartRow = 8;
  metaRowsData.forEach((item, index) => {
    const r = metaStartRow + index;
    sheet.getRow(r).height = 19;

    if (item.fullWidth) {
      sheet.mergeCells(`A${r}:B${r}`);
      const cA = sheet.getCell(`A${r}`);
      cA.value = item.label1;
      cA.font = { name: 'TH Sarabun New', size: 10.5, bold: true, color: { argb: 'FF111827' } };
      cA.alignment = { horizontal: 'left', vertical: 'middle' };

      sheet.mergeCells(`C${r}:F${r}`);
      const cC = sheet.getCell(`C${r}`);
      cC.value = item.val1;
      cC.font = { name: 'TH Sarabun New', size: 10.5, color: { argb: 'FF111827' } };
      cC.alignment = { horizontal: 'left', vertical: 'middle' };
    } else {
      sheet.mergeCells(`A${r}:B${r}`);
      const cA = sheet.getCell(`A${r}`);
      cA.value = item.label1;
      cA.font = { name: 'TH Sarabun New', size: 10.5, bold: true, color: { argb: 'FF111827' } };
      cA.alignment = { horizontal: 'left', vertical: 'middle' };

      sheet.mergeCells(`C${r}:D${r}`);
      const cC = sheet.getCell(`C${r}`);
      cC.value = item.val1;
      cC.font = { name: 'TH Sarabun New', size: 10.5, color: { argb: 'FF111827' } };
      cC.alignment = { horizontal: 'left', vertical: 'middle' };

      const cE = sheet.getCell(`E${r}`);
      cE.value = item.label2;
      cE.font = { name: 'TH Sarabun New', size: 10.5, bold: true, color: { argb: 'FF111827' } };
      cE.alignment = { horizontal: 'right', vertical: 'middle' };

      const cF = sheet.getCell(`F${r}`);
      cF.value = item.val2;
      cF.font = { name: 'TH Sarabun New', size: 10.5, color: { argb: 'FF111827' } };
      cF.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  });

  const afterMetaRow = metaStartRow + metaRowsData.length;
  sheet.getRow(afterMetaRow).height = 10; // Spacer

  // 4. Financial Details Table
  let currentRow = afterMetaRow + 1;
  const hasMultipleItems = Array.isArray(request.items) && request.items.length > 0;

  if (hasMultipleItems) {
    // Mode A: Multi-items Table
    sheet.getRow(currentRow).height = 24;
    const headerCols = [
      { col: 'A', text: 'ลำดับ' },
      { col: 'B', text: 'วันที่บิล' },
      { col: 'C', text: 'ผู้จำหน่าย / ร้านค้า' },
      { col: 'D', text: 'รายการสินค้า / บริการ' },
      { col: 'E', text: 'จำนวนเงิน (บาท)' },
      { col: 'F', text: 'หมายเหตุ' },
    ];

    headerCols.forEach((h) => {
      const cell = sheet.getCell(`${h.col}${currentRow}`);
      cell.value = h.text;
      cell.font = { name: 'TH Sarabun New', size: 11, bold: true, color: { argb: 'FF000000' } };
      cell.fill = grayHeaderFill;
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Line item rows
    (request.items as RequisitionItem[]).forEach((it, idx) => {
      currentRow++;
      sheet.getRow(currentRow).height = 26;

      const cellA = sheet.getCell(`A${currentRow}`);
      cellA.value = idx + 1;
      cellA.alignment = { horizontal: 'center', vertical: 'middle' };
      cellA.font = { name: 'TH Sarabun New', size: 11 };
      cellA.border = thinBorder;

      const cellB = sheet.getCell(`B${currentRow}`);
      cellB.value = it.billDate || '-';
      cellB.alignment = { horizontal: 'center', vertical: 'middle' };
      cellB.font = { name: 'TH Sarabun New', size: 10.5 };
      cellB.border = thinBorder;

      const cellC = sheet.getCell(`C${currentRow}`);
      cellC.value = it.invoiceNumber
        ? `${it.supplierName || '-'}\n(บิล: ${it.invoiceNumber})`
        : it.supplierName || '-';
      cellC.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      cellC.font = { name: 'TH Sarabun New', size: 10.5 };
      cellC.border = thinBorder;

      const cellD = sheet.getCell(`D${currentRow}`);
      cellD.value = it.description || '-';
      cellD.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      cellD.font = { name: 'TH Sarabun New', size: 10.5 };
      cellD.border = thinBorder;

      const cellE = sheet.getCell(`E${currentRow}`);
      cellE.value = Number(it.amount || 0);
      cellE.numFmt = '#,##0.00';
      cellE.alignment = { horizontal: 'right', vertical: 'middle' };
      cellE.font = { name: 'TH Sarabun New', size: 11, bold: true };
      cellE.border = thinBorder;

      const cellF = sheet.getCell(`F${currentRow}`);
      cellF.value = it.remarks || '-';
      cellF.alignment = { horizontal: 'center', vertical: 'middle' };
      cellF.font = { name: 'TH Sarabun New', size: 10 };
      cellF.border = thinBorder;
    });

    // Credit Card Deduction Row (if any)
    if (creditCardDeduction > 0) {
      currentRow++;
      sheet.getRow(currentRow).height = 22;

      sheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const cLabel = sheet.getCell(`A${currentRow}`);
      cLabel.value = 'หักยอดที่จ่ายด้วยบัตรเครดิต:';
      cLabel.font = { name: 'TH Sarabun New', size: 11, bold: true, color: { argb: 'FFDC2626' } };
      cLabel.alignment = { horizontal: 'right', vertical: 'middle' };

      const cAmt = sheet.getCell(`E${currentRow}`);
      cAmt.value = -creditCardDeduction;
      cAmt.numFmt = '#,##0.00';
      cAmt.font = { name: 'TH Sarabun New', size: 11, bold: true, color: { argb: 'FFDC2626' } };
      cAmt.alignment = { horizontal: 'right', vertical: 'middle' };

      const cRem = sheet.getCell(`F${currentRow}`);
      cRem.value = 'จ่ายผ่านบัตร';
      cRem.font = { name: 'TH Sarabun New', size: 10, color: { argb: 'FF6B7280' } };
      cRem.alignment = { horizontal: 'center', vertical: 'middle' };

      styleRange(sheet, currentRow, 1, currentRow, 6, {
        border: thinBorder,
        fill: lightGrayFill,
      });
    }

    // Subtotal Row
    currentRow++;
    sheet.getRow(currentRow).height = 22;

    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const cSubLabel = sheet.getCell(`A${currentRow}`);
    cSubLabel.value = 'จำนวนเงินรวม (Total Amount):';
    cSubLabel.font = { name: 'TH Sarabun New', size: 11, bold: true };
    cSubLabel.alignment = { horizontal: 'right', vertical: 'middle' };

    const cSubAmt = sheet.getCell(`E${currentRow}`);
    cSubAmt.value = subtotal;
    cSubAmt.numFmt = '#,##0.00';
    cSubAmt.font = { name: 'TH Sarabun New', size: 11, bold: true };
    cSubAmt.alignment = { horizontal: 'right', vertical: 'middle' };

    styleRange(sheet, currentRow, 1, currentRow, 6, { border: thinBorder });

    // VAT Row (if applicable in Mode A)
    if (vat > 0) {
      currentRow++;
      sheet.getRow(currentRow).height = 22;
      sheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const cVatLabelA = sheet.getCell(`A${currentRow}`);
      const vatLabelModeA = request.vat_type === 'INCLUDED_7%' || request.vat_type === 'INCLUDE' ? '7% รวมในยอด' : (request.vat_type === '7%' || !request.vat_type ? '7%' : request.vat_type);
      cVatLabelA.value = `ภาษีมูลค่าเพิ่ม (VAT ${vatLabelModeA}):`;
      cVatLabelA.font = { name: 'TH Sarabun New', size: 11, bold: true };
      cVatLabelA.alignment = { horizontal: 'right', vertical: 'middle' };

      const cVatAmtA = sheet.getCell(`E${currentRow}`);
      cVatAmtA.value = vat;
      cVatAmtA.numFmt = '#,##0.00';
      cVatAmtA.font = { name: 'TH Sarabun New', size: 11, bold: true };
      cVatAmtA.alignment = { horizontal: 'right', vertical: 'middle' };
      styleRange(sheet, currentRow, 1, currentRow, 6, { border: thinBorder });
    }

    // WHT Row (if applicable in Mode A)
    if (wht > 0) {
      currentRow++;
      sheet.getRow(currentRow).height = 22;
      sheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const cWhtLabelA = sheet.getCell(`A${currentRow}`);
      cWhtLabelA.value = `หัก ภาษี ณ ที่จ่าย (Withholding Tax ${Number(request.wht_percent || 0).toFixed(2)}%):`;
      cWhtLabelA.font = { name: 'TH Sarabun New', size: 11, bold: true };
      cWhtLabelA.alignment = { horizontal: 'right', vertical: 'middle' };

      const cWhtAmtA = sheet.getCell(`E${currentRow}`);
      cWhtAmtA.value = -wht;
      cWhtAmtA.numFmt = '#,##0.00';
      cWhtAmtA.font = { name: 'TH Sarabun New', size: 11, bold: true, color: { argb: 'FFDC2626' } };
      cWhtAmtA.alignment = { horizontal: 'right', vertical: 'middle' };
      styleRange(sheet, currentRow, 1, currentRow, 6, { border: thinBorder });
    }

    // Net Payable Row
    currentRow++;
    sheet.getRow(currentRow).height = 25;

    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const cNetLabel = sheet.getCell(`A${currentRow}`);
    cNetLabel.value = 'ยอดสุทธิที่เบิกจ่าย (Net Payable):';
    cNetLabel.font = { name: 'TH Sarabun New', size: 12, bold: true, color: { argb: 'FF111827' } };
    cNetLabel.alignment = { horizontal: 'right', vertical: 'middle' };

    const cNetAmt = sheet.getCell(`E${currentRow}`);
    cNetAmt.value = netAmount;
    cNetAmt.numFmt = '#,##0.00';
    cNetAmt.font = { name: 'TH Sarabun New', size: 13, bold: true, color: { argb: 'FF111827' } };
    cNetAmt.alignment = { horizontal: 'right', vertical: 'middle' };

    styleRange(sheet, currentRow, 1, currentRow, 6, {
      border: doubleBottomBorder,
      fill: lightGrayFill,
    });
  } else {
    // Mode B: Single Purpose with Pre-VAT, VAT, WHT Breakdown
    sheet.getRow(currentRow).height = 24;

    const cellA = sheet.getCell(`A${currentRow}`);
    cellA.value = 'ลำดับ\n(No.)';
    cellA.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cellA.font = { name: 'TH Sarabun New', size: 11, bold: true };
    cellA.fill = grayHeaderFill;
    cellA.border = thinBorder;

    sheet.mergeCells(`B${currentRow}:D${currentRow}`);
    const cellB = sheet.getCell(`B${currentRow}`);
    cellB.value = 'รายละเอียดค่าใช้จ่ายและวัตถุประสงค์ (Purpose)';
    cellB.alignment = { horizontal: 'center', vertical: 'middle' };
    cellB.font = { name: 'TH Sarabun New', size: 11, bold: true };
    styleRange(sheet, currentRow, 2, currentRow, 4, { fill: grayHeaderFill, border: thinBorder });

    sheet.mergeCells(`E${currentRow}:F${currentRow}`);
    const cellE = sheet.getCell(`E${currentRow}`);
    cellE.value = 'จำนวนเงิน (บาท)\n(Amount THB)';
    cellE.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cellE.font = { name: 'TH Sarabun New', size: 11, bold: true };
    styleRange(sheet, currentRow, 5, currentRow, 6, { fill: grayHeaderFill, border: thinBorder });

    // Row 1: Purpose Content
    currentRow++;
    sheet.getRow(currentRow).height = 36;

    const cNo = sheet.getCell(`A${currentRow}`);
    cNo.value = 1;
    cNo.alignment = { horizontal: 'center', vertical: 'middle' };
    cNo.font = { name: 'TH Sarabun New', size: 11 };
    cNo.border = thinBorder;

    sheet.mergeCells(`B${currentRow}:D${currentRow}`);
    const cPurpose = sheet.getCell(`B${currentRow}`);
    cPurpose.value = request.purpose || '-';
    cPurpose.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cPurpose.font = { name: 'TH Sarabun New', size: 11 };
    styleRange(sheet, currentRow, 2, currentRow, 4, { border: thinBorder });

    sheet.mergeCells(`E${currentRow}:F${currentRow}`);
    const cAmt = sheet.getCell(`E${currentRow}`);
    cAmt.value = subtotal;
    cAmt.numFmt = '#,##0.00';
    cAmt.alignment = { horizontal: 'right', vertical: 'middle' };
    cAmt.font = { name: 'TH Sarabun New', size: 11, bold: true };
    styleRange(sheet, currentRow, 5, currentRow, 6, { border: thinBorder });

    // Pre-VAT Row
    currentRow++;
    sheet.getRow(currentRow).height = 22;
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const cPreVatLabel = sheet.getCell(`A${currentRow}`);
    cPreVatLabel.value = 'ยอดเงินก่อนภาษีมูลค่าเพิ่ม (Pre-VAT Subtotal):';
    cPreVatLabel.font = { name: 'TH Sarabun New', size: 11, bold: true };
    cPreVatLabel.alignment = { horizontal: 'right', vertical: 'middle' };

    sheet.mergeCells(`E${currentRow}:F${currentRow}`);
    const cPreVatAmt = sheet.getCell(`E${currentRow}`);
    cPreVatAmt.value = subtotal;
    cPreVatAmt.numFmt = '#,##0.00';
    cPreVatAmt.font = { name: 'TH Sarabun New', size: 11, bold: true };
    cPreVatAmt.alignment = { horizontal: 'right', vertical: 'middle' };
    styleRange(sheet, currentRow, 1, currentRow, 6, { border: thinBorder });

    // VAT Row
    currentRow++;
    sheet.getRow(currentRow).height = 22;
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const cVatLabel = sheet.getCell(`A${currentRow}`);
    const vatLabelStr = request.vat_type === 'INCLUDED_7%' || request.vat_type === 'INCLUDE' ? '7% รวมในยอด' : (request.vat_type === '7%' || !request.vat_type ? '7%' : request.vat_type);
    cVatLabel.value = `ภาษีมูลค่าเพิ่ม (VAT ${vatLabelStr}):`;
    cVatLabel.font = { name: 'TH Sarabun New', size: 11, bold: true };
    cVatLabel.alignment = { horizontal: 'right', vertical: 'middle' };

    sheet.mergeCells(`E${currentRow}:F${currentRow}`);
    const cVatAmt = sheet.getCell(`E${currentRow}`);
    cVatAmt.value = vat;
    cVatAmt.numFmt = '#,##0.00';
    cVatAmt.font = { name: 'TH Sarabun New', size: 11, bold: true };
    cVatAmt.alignment = { horizontal: 'right', vertical: 'middle' };
    styleRange(sheet, currentRow, 1, currentRow, 6, { border: thinBorder });

    // WHT Row
    currentRow++;
    sheet.getRow(currentRow).height = 22;
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const cWhtLabel = sheet.getCell(`A${currentRow}`);
    cWhtLabel.value = `หัก ภาษี ณ ที่จ่าย (Withholding Tax ${Number(request.wht_percent || 0).toFixed(2)}%):`;
    cWhtLabel.font = { name: 'TH Sarabun New', size: 11, bold: true };
    cWhtLabel.alignment = { horizontal: 'right', vertical: 'middle' };

    sheet.mergeCells(`E${currentRow}:F${currentRow}`);
    const cWhtAmt = sheet.getCell(`E${currentRow}`);
    cWhtAmt.value = wht > 0 ? -wht : 0;
    cWhtAmt.numFmt = '#,##0.00';
    cWhtAmt.font = { name: 'TH Sarabun New', size: 11, bold: true, color: wht > 0 ? { argb: 'FFDC2626' } : undefined };
    cWhtAmt.alignment = { horizontal: 'right', vertical: 'middle' };
    styleRange(sheet, currentRow, 1, currentRow, 6, { border: thinBorder });

    // Net Amount Row
    currentRow++;
    sheet.getRow(currentRow).height = 25;
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const cNetLabel = sheet.getCell(`A${currentRow}`);
    cNetLabel.value = 'ยอดชำระสุทธิ (Net Payment Amount):';
    cNetLabel.font = { name: 'TH Sarabun New', size: 12, bold: true, color: { argb: 'FF111827' } };
    cNetLabel.alignment = { horizontal: 'right', vertical: 'middle' };

    sheet.mergeCells(`E${currentRow}:F${currentRow}`);
    const cNetAmt = sheet.getCell(`E${currentRow}`);
    cNetAmt.value = netAmount;
    cNetAmt.numFmt = '#,##0.00';
    cNetAmt.font = { name: 'TH Sarabun New', size: 13, bold: true, color: { argb: 'FF111827' } };
    cNetAmt.alignment = { horizontal: 'right', vertical: 'middle' };
    styleRange(sheet, currentRow, 1, currentRow, 6, {
      border: doubleBottomBorder,
      fill: lightGrayFill,
    });
  }

  // 5. Thai Baht Text Row
  currentRow++;
  sheet.getRow(currentRow).height = 24;
  sheet.mergeCells(`A${currentRow}:F${currentRow}`);
  const cBaht = sheet.getCell(`A${currentRow}`);
  cBaht.value = `จำนวนเงินตัวอักษร: (${bahtText})`;
  cBaht.font = { name: 'TH Sarabun New', size: 11, bold: true, color: { argb: 'FF111827' } };
  cBaht.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  styleRange(sheet, currentRow, 1, currentRow, 6, {
    border: thinBorder,
    fill: lightGrayFill,
  });

  // Spacer
  currentRow++;
  sheet.getRow(currentRow).height = 10;

  // 6. Approval Signatures Block (4 Columns: A-B, C, D, E-F)
  // Header row
  currentRow++;
  sheet.getRow(currentRow).height = 22;

  sheet.mergeCells(`A${currentRow}:B${currentRow}`);
  const cSignH1 = sheet.getCell(`A${currentRow}`);
  cSignH1.value = 'จัดทำโดย (Prepared by)';
  cSignH1.font = { name: 'TH Sarabun New', size: 10.5, bold: true };
  cSignH1.alignment = { horizontal: 'center', vertical: 'middle' };

  const cSignH2 = sheet.getCell(`C${currentRow}`);
  cSignH2.value = 'หัวหน้าอนุมัติ (Supervisor)';
  cSignH2.font = { name: 'TH Sarabun New', size: 10.5, bold: true };
  cSignH2.alignment = { horizontal: 'center', vertical: 'middle' };

  const cSignH3 = sheet.getCell(`D${currentRow}`);
  cSignH3.value = 'ตรวจสอบโดย (Verified by)';
  cSignH3.font = { name: 'TH Sarabun New', size: 10.5, bold: true };
  cSignH3.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`E${currentRow}:F${currentRow}`);
  const cSignH4 = sheet.getCell(`E${currentRow}`);
  cSignH4.value = 'อนุมัติโดย (Approved by)';
  cSignH4.font = { name: 'TH Sarabun New', size: 10.5, bold: true };
  cSignH4.alignment = { horizontal: 'center', vertical: 'middle' };

  styleRange(sheet, currentRow, 1, currentRow, 6, {
    fill: grayHeaderFill,
    border: thinBorder,
  });

  // Name row
  currentRow++;
  sheet.getRow(currentRow).height = 20;

  sheet.mergeCells(`A${currentRow}:B${currentRow}`);
  const cSignN1 = sheet.getCell(`A${currentRow}`);
  cSignN1.value = request.requester_name || '-';
  cSignN1.font = { name: 'TH Sarabun New', size: 10, bold: true };
  cSignN1.alignment = { horizontal: 'center', vertical: 'middle' };

  const cSignN2 = sheet.getCell(`C${currentRow}`);
  const supervisorVal = request.supervisor_checked_by || request.assigned_supervisor_name;
  cSignN2.value = supervisorVal || '................................';
  cSignN2.font = { name: 'TH Sarabun New', size: 10, bold: !!supervisorVal };
  cSignN2.alignment = { horizontal: 'center', vertical: 'middle' };

  const cSignN3 = sheet.getCell(`D${currentRow}`);
  const verifierVal = request.accounting_manager_checked_by || request.ap_checked_by;
  cSignN3.value = verifierVal || '................................';
  cSignN3.font = { name: 'TH Sarabun New', size: 10, bold: !!verifierVal };
  cSignN3.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`E${currentRow}:F${currentRow}`);
  const cSignN4 = sheet.getCell(`E${currentRow}`);
  const approverVal = request.approved_by;
  cSignN4.value = approverVal || '................................';
  cSignN4.font = { name: 'TH Sarabun New', size: 10, bold: !!approverVal };
  cSignN4.alignment = { horizontal: 'center', vertical: 'middle' };

  styleRange(sheet, currentRow, 1, currentRow, 6, { border: thinBorder });

  // Signature Area row (Height 36)
  currentRow++;
  const sigRowIndex = currentRow;
  sheet.getRow(currentRow).height = 36;

  sheet.mergeCells(`A${currentRow}:B${currentRow}`);
  const cSignA1 = sheet.getCell(`A${currentRow}`);
  cSignA1.value = '(ลงลายมือชื่อ)';
  cSignA1.font = { name: 'TH Sarabun New', size: 9.5, italic: true, color: { argb: 'FF9CA3AF' } };
  cSignA1.alignment = { horizontal: 'center', vertical: 'middle' };

  const cSignA2 = sheet.getCell(`C${currentRow}`);
  cSignA2.value = '(ลงลายมือชื่อ)';
  cSignA2.font = { name: 'TH Sarabun New', size: 9.5, italic: true, color: { argb: 'FF9CA3AF' } };
  cSignA2.alignment = { horizontal: 'center', vertical: 'middle' };

  const cSignA3 = sheet.getCell(`D${currentRow}`);
  cSignA3.value = '(ลงลายมือชื่อ)';
  cSignA3.font = { name: 'TH Sarabun New', size: 9.5, italic: true, color: { argb: 'FF9CA3AF' } };
  cSignA3.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`E${currentRow}:F${currentRow}`);
  const cSignA4 = sheet.getCell(`E${currentRow}`);
  cSignA4.value = '(ลงลายมือชื่อ)';
  cSignA4.font = { name: 'TH Sarabun New', size: 9.5, italic: true, color: { argb: 'FF9CA3AF' } };
  cSignA4.alignment = { horizontal: 'center', vertical: 'middle' };

  styleRange(sheet, currentRow, 1, currentRow, 6, { border: thinBorder });

  // Date row
  currentRow++;
  sheet.getRow(currentRow).height = 20;

  sheet.mergeCells(`A${currentRow}:B${currentRow}`);
  const cSignD1 = sheet.getCell(`A${currentRow}`);
  cSignD1.value = `วันที่ ${formatThaiDate(request.document_date)}`;
  cSignD1.font = { name: 'TH Sarabun New', size: 9 };
  cSignD1.alignment = { horizontal: 'center', vertical: 'middle' };

  const cSignD2 = sheet.getCell(`C${currentRow}`);
  const supervisorDate = request.supervisor_checked_at;
  cSignD2.value = `วันที่ ${supervisorDate ? formatThaiDate(supervisorDate) : (supervisorVal ? formatThaiDate(request.document_date) : '................................')}`;
  cSignD2.font = { name: 'TH Sarabun New', size: 9 };
  cSignD2.alignment = { horizontal: 'center', vertical: 'middle' };

  const cSignD3 = sheet.getCell(`D${currentRow}`);
  const verifiedDate = request.accounting_manager_checked_at || request.ap_checked_at;
  cSignD3.value = `วันที่ ${verifiedDate ? formatThaiDate(verifiedDate) : (verifierVal ? formatThaiDate(request.document_date) : '................................')}`;
  cSignD3.font = { name: 'TH Sarabun New', size: 9 };
  cSignD3.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`E${currentRow}:F${currentRow}`);
  const cSignD4 = sheet.getCell(`E${currentRow}`);
  cSignD4.value = `วันที่ ${request.approved_at ? formatThaiDate(request.approved_at) : (approverVal ? formatThaiDate(request.document_date) : '................................')}`;
  cSignD4.font = { name: 'TH Sarabun New', size: 9 };
  cSignD4.alignment = { horizontal: 'center', vertical: 'middle' };

  styleRange(sheet, currentRow, 1, currentRow, 6, { border: thinBorder });

  // 7. Footer Notes
  currentRow++;
  sheet.getRow(currentRow).height = 6; // Spacer

  currentRow++;
  sheet.getRow(currentRow).height = 18;
  sheet.mergeCells(`A${currentRow}:F${currentRow}`);
  const cFoot1 = sheet.getCell(`A${currentRow}`);
  cFoot1.value = '* ใบขออนุมัตินี้สร้างขึ้นจากระบบกลาง TERA ERP/CRM ทะเบียนคุมค่าใช้จ่าย';
  cFoot1.font = { name: 'TH Sarabun New', size: 9, italic: true, color: { argb: 'FF6B7280' } };
  cFoot1.alignment = { horizontal: 'left', vertical: 'middle' };

  currentRow++;
  sheet.getRow(currentRow).height = 18;
  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const cFoot2 = sheet.getCell(`A${currentRow}`);
  cFoot2.value = `ส่วนสำหรับฝ่ายบัญชีเจ้าหนี้ (AP VERIFICATION): ${request.ap_notes || '-'}`;
  cFoot2.font = { name: 'TH Sarabun New', size: 9.5, color: { argb: 'FF374151' } };
  cFoot2.alignment = { horizontal: 'left', vertical: 'middle' };

  sheet.mergeCells(`E${currentRow}:F${currentRow}`);
  const cFoot3 = sheet.getCell(`E${currentRow}`);
  cFoot3.value = 'แผ่นที่ 1/1';
  cFoot3.font = { name: 'TH Sarabun New', size: 9.5, color: { argb: 'FF6B7280' } };
  cFoot3.alignment = { horizontal: 'right', vertical: 'middle' };

  // Attempt to embed digital signatures if available
  const sigList = [
    { url: signatures?.preparedBy || request.requester_signature_url, colStart: 0.1 },
    { url: signatures?.supervisorApprovedBy || request.supervisor_signature_url, colStart: 2.05 },
    { url: signatures?.verifiedBy || request.ap_signature_url, colStart: 3.1 },
    { url: signatures?.approvedBy || request.approver_signature_url, colStart: 4.2 },
  ];

  for (const s of sigList) {
    if (!s.url) continue;
    try {
      if (s.url.startsWith('data:image/')) {
        const match = s.url.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
        if (match) {
          const ext = match[1] === 'jpg' ? 'jpeg' : match[1];
          const imageId = workbook.addImage({
            base64: match[2],
            extension: ext as 'jpeg' | 'png',
          });
          sheet.addImage(imageId, {
            tl: { col: s.colStart + 0.3, row: sigRowIndex - 1 + 0.1 },
            ext: { width: 100, height: 32 },
            editAs: 'oneCell',
          });
        }
      } else if (typeof window !== 'undefined' && s.url.startsWith('http')) {
        const res = await fetch(s.url);
        if (res.ok) {
          const blob = await res.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const ext = s.url.toLowerCase().includes('.jpg') || s.url.toLowerCase().includes('.jpeg') ? 'jpeg' : 'png';
          const imageId = workbook.addImage({
            buffer: arrayBuffer,
            extension: ext,
          });
          sheet.addImage(imageId, {
            tl: { col: s.colStart + 0.3, row: sigRowIndex - 1 + 0.1 },
            ext: { width: 100, height: 32 },
            editAs: 'oneCell',
          });
        }
      }
    } catch (err) {
      console.warn('Could not embed signature in Excel:', err);
    }
  }

  // Trigger Client-side Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ใบขออนุมัติจ่ายเงิน_${request.pay_number || 'voucher'}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
