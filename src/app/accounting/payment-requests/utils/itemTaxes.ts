/**
 * ตัดทศนิยม 2 ตำแหน่งโดยไม่ปัดขึ้น (Truncate / Floor to 2 decimal places without rounding up)
 * ตามหลักการคำนวณภาษีและบัญชี: ไม่ปัดเศษสตางค์ขึ้น แต่รักษาเศษคงที่
 * ป้องกันปัญหา floating-point accuracy ด้วย epsilon (1e-7)
 */
export function truncate2Decimals(val: number): number {
  if (!val || isNaN(val)) return 0;
  return Math.floor(Math.max(0, val) * 100 + 0.0000001) / 100;
}

/**
 * จัดรูปแบบตัวเลขแสดงทศนิยม 2 ตำแหน่งคงที่เสมอ ("ให้ค่าคงที่แสดงเศษ")
 */
export function formatFixed2Decimals(val: number | string | undefined | null): string {
  const num = typeof val === 'number' ? val : Number(val) || 0;
  return num.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function calculateItemTaxes(item: {
  amount: number;
  vatType?: string;
  whtType?: string;
  whtPercent?: number;
}) {
  const amount = Number(item.amount) || 0;
  const vatType = item.vatType || 'NO_VAT';
  const isIncludedVat = vatType === 'INCLUDED_7%' || vatType === 'INCLUDE';
  const isExcludeVat = vatType === '7%' || vatType === 'EXCLUDE';

  let vatAmount = 0;
  let preVatAmount = amount;

  if (isIncludedVat) {
    // คำนวณ VAT ในตัว โดยไม่ปัดขึ้น
    vatAmount = truncate2Decimals((amount * 7) / 107);
    preVatAmount = Math.max(0, truncate2Decimals(amount - vatAmount));
  } else if (isExcludeVat) {
    // บวก VAT 7% โดยไม่ปัดขึ้น
    vatAmount = truncate2Decimals(amount * 0.07);
    preVatAmount = amount;
  } else {
    vatAmount = 0;
    preVatAmount = amount;
  }

  let whtPercent = 0;
  if (item.whtType === '1%') whtPercent = 1;
  else if (item.whtType === '2%') whtPercent = 2;
  else if (item.whtType === '3%') whtPercent = 3;
  else if (item.whtType === '5%') whtPercent = 5;
  else if (typeof item.whtPercent === 'number') whtPercent = item.whtPercent;

  // หัก ณ ที่จ่าย โดยไม่ปัดขึ้น
  const whtAmount = truncate2Decimals((preVatAmount * whtPercent) / 100);
  const totalGross = isExcludeVat ? truncate2Decimals(amount + vatAmount) : amount;
  const netAmount = Math.max(0, truncate2Decimals(totalGross - whtAmount));

  return {
    preVatAmount,
    vatAmount,
    whtPercent,
    whtAmount,
    totalGross,
    netAmount,
  };
}
