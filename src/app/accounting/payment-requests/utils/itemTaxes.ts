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
    vatAmount = Math.round(((amount * 7) / 107) * 100) / 100;
    preVatAmount = Math.max(0, Math.round((amount - vatAmount) * 100) / 100);
  } else if (isExcludeVat) {
    vatAmount = Math.round(amount * 0.07 * 100) / 100;
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

  const whtAmount = Math.round(((preVatAmount * whtPercent) / 100) * 100) / 100;
  const totalGross = isExcludeVat ? Math.round((amount + vatAmount) * 100) / 100 : amount;
  const netAmount = Math.max(0, Math.round((totalGross - whtAmount) * 100) / 100);

  return {
    preVatAmount,
    vatAmount,
    whtPercent,
    whtAmount,
    totalGross,
    netAmount,
  };
}
