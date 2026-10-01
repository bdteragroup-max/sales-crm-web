/**
 * Convert numeric amount into Thai Baht Text (e.g., 1,500.25 -> หนึ่งพันห้าร้อยบาทยี่สิบห้าสตางค์)
 */
export function thaiBahtText(num: number | string | null | undefined): string {
  if (num === null || num === undefined || num === '') return 'ศูนย์บาทถ้วน';

  const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  if (isNaN(n) || n === 0) return 'ศูนย์บาทถ้วน';

  const isNegative = n < 0;
  const absNum = Math.abs(n);

  const [bahtStr, satangStr = ''] = absNum.toFixed(2).split('.');

  const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  function readGroup(str: string): string {
    let result = '';
    const len = str.length;

    for (let i = 0; i < len; i++) {
      const digit = parseInt(str[i], 10);
      const pos = len - i - 1;

      if (digit === 0) continue;

      if (pos === 0) {
        if (digit === 1 && len > 1 && str[len - 2] !== '0') {
          result += 'เอ็ด';
        } else {
          result += digits[digit];
        }
      } else if (pos === 1) {
        if (digit === 1) {
          result += 'สิบ';
        } else if (digit === 2) {
          result += 'ยี่สิบ';
        } else {
          result += digits[digit] + 'สิบ';
        }
      } else {
        result += digits[digit] + positions[pos % 6];
      }
    }
    return result;
  }

  function readNumber(intStr: string): string {
    if (intStr === '0') return 'ศูนย์';
    let result = '';
    const groups: string[] = [];
    let s = intStr;

    while (s.length > 6) {
      groups.unshift(s.slice(-6));
      s = s.slice(0, -6);
    }
    if (s.length > 0) groups.unshift(s);

    for (let g = 0; g < groups.length; g++) {
      const groupText = readGroup(groups[g]);
      result += groupText;
      if (g < groups.length - 1 && groupText !== '') {
        result += 'ล้าน';
      }
    }
    return result;
  }

  let finalBaht = readNumber(bahtStr);
  let finalSatang = '';

  const satangVal = parseInt(satangStr, 10);
  if (satangVal > 0) {
    finalSatang = readGroup(satangStr) + 'สตางค์';
  } else {
    finalSatang = 'ถ้วน';
  }

  const output = (isNegative ? 'ลบ' : '') + finalBaht + 'บาท' + finalSatang;
  return output;
}
