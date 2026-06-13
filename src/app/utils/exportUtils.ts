import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToExcel = (data: {
  productPerformance: any[],
  branchPerformance: any[],
  employeePerformance: any[]
}, filename: string) => {
  const wb = XLSX.utils.book_new();

  // 1. Product Performance
  const productData = data.productPerformance.map(p => ({
    'กลุ่มสินค้า (Category)': p.category,
    'ยอดขาย (Sales)': p.closedAmount,
    'เป้าหมาย (Target)': p.targetAmount,
    '% บรรลุเป้า (Achievement %)': p.targetComparisonPct,
    'PO ค้าง (Pending PO)': p.pendingPoAmount
  }));
  const wsProduct = XLSX.utils.json_to_sheet(productData);
  XLSX.utils.book_append_sheet(wb, wsProduct, "Product Performance");

  // 2. Branch Performance
  const branchData = data.branchPerformance.map(b => ({
    'สาขา (Branch)': b.branch,
    'ยอดขายปิดได้ (Closed Sales)': b.closedAmount,
    'ค่าใช้จ่าย (Expenses)': b.expenses,
    'กำไร (Profit)': b.profit,
    'จำนวนดีล (Deals Count)': b.dealsCount
  }));
  const wsBranch = XLSX.utils.json_to_sheet(branchData);
  XLSX.utils.book_append_sheet(wb, wsBranch, "Branch Performance");

  // 3. Employee Performance
  const employeeData = data.employeePerformance.map(e => ({
    'ชื่อพนักงาน (Employee Name)': e.fullName,
    'แผนก (Department)': e.department,
    'ยอดขายที่ปิดได้ (Won Sales)': e.won || 0,
    'ท่อดีล (Pipeline)': e.pipeline || 0,
    'ค่าใช้จ่าย (Expenses)': e.expenses || 0,
    'กำไรสุทธิ (Profit)': e.profit || 0
  }));
  const wsEmployee = XLSX.utils.json_to_sheet(employeeData);
  XLSX.utils.book_append_sheet(wb, wsEmployee, "Employee Performance");

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true, // Handle cross-origin images if any
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    
    // Create PDF in landscape A4
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 10; // 10mm margin
    const maxPdfWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const maxPdfHeight = pdf.internal.pageSize.getHeight() - margin * 2;
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    const ratio = canvasWidth / canvasHeight;
    
    let imgWidth = maxPdfWidth;
    let imgHeight = maxPdfWidth / ratio;
    
    // If the image is taller than the available height, scale it down to fit on one page
    if (imgHeight > maxPdfHeight) {
      imgHeight = maxPdfHeight;
      imgWidth = maxPdfHeight * ratio;
    }
    
    // Center the image on the page
    const xPos = margin + (maxPdfWidth - imgWidth) / 2;
    const yPos = margin + (maxPdfHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'JPEG', xPos, yPos, imgWidth, imgHeight);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};
