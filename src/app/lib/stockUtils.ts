export type StockStatusKind = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK' | 'INACTIVE';

export interface SerializedStockCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  ownerDepartment: string;
  isActive: boolean;
  displayOrder: number;
}

export interface SerializedStockItem {
  id: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  sku: string | null;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number | null;
  unitPrice: number | null;
  prInfo: string | null;
  note: string | null;
  imageUrl: string | null;
  excelColName: string | null;
  displayOrder: number;
  isActive: boolean;
  updatedByName: string | null;
  updatedAt: string;
  withdrawn30d?: number;
  statusKind: StockStatusKind;
}

export interface SerializedStockTransaction {
  id: string;
  batchCode: string | null;
  itemId: string;
  itemName: string;
  itemSku: string | null;
  itemUnit: string;
  categoryId: string;
  categoryName: string;
  txType: string;
  qtyChange: number;
  stockBefore: number;
  stockAfter: number;
  txDate: string;
  requesterName: string | null;
  requesterUserId: string | null;
  branch: string | null;
  purpose: string | null;
  note: string | null;
  unitPrice: number | null;
  status: string;
  reversedTxId: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdByRole: string | null;
  cancelledByName: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export const STOCK_TX_TYPE_META: Record<
  string,
  { label: string; shortLabel: string; badgeClass: string; sign: 'plus' | 'minus' | 'neutral' }
> = {
  WITHDRAW: {
    label: 'เบิกสินค้า',
    shortLabel: 'เบิกออก',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    sign: 'minus',
  },
  RESTOCK: {
    label: 'เติมสต็อก / รับเข้า',
    shortLabel: 'เติมสต็อก',
    badgeClass: 'bg-slate-900 text-white border-slate-900',
    sign: 'plus',
  },
  RETURN: {
    label: 'รับคืนเข้าคลัง',
    shortLabel: 'รับคืน',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    sign: 'plus',
  },
  CANCEL_RETURN: {
    label: 'ยกเลิกการเบิก (คืนสต็อก)',
    shortLabel: 'ยกเลิกเบิก',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    sign: 'plus',
  },
  ADJUST: {
    label: 'ปรับยอดตรวจนับ',
    shortLabel: 'ปรับยอด',
    badgeClass: 'bg-white text-slate-700 border-slate-300',
    sign: 'neutral',
  },
  OPENING: {
    label: 'ยอดยกมาตั้งต้น',
    shortLabel: 'ยอดยกมา',
    badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    sign: 'plus',
  },
};

export const COMMON_STOCK_UNITS = ['ชิ้น', 'ใบ', 'ด้าม', 'เล่ม', 'ตัว', 'คัน', 'ชุด', 'กล่อง', 'แพ็ค'];

export const COMMON_BRANCH_OPTIONS = [
  'BKK-HQ (สำนักงานใหญ่)',
  'BKK-WH (คลังสินค้า 62)',
  'สาขาขอนแก่น',
  'สาขาเชียงใหม่',
  'สาขาพิษณุโลก',
  'สาขากาญจนบุรี',
  'สาขาอุบลราชธานี',
  'สาขาสุราษฎร์ธานี',
  'สาขาอุดรธานี',
  'สาขาสุรินทร์',
  'สาขาร้อยเอ็ด',
  'สาขาสกลนคร',
  'สาขาพังโคน',
  'สาขาสมุทรสาคร',
  'งานอบรม / อีเวนต์',
];

export const WITHDRAW_PURPOSE_PRESETS = [
  'แจกลูกค้า / ผู้ติดต่อ',
  'จัดส่งสาขา / ประจำสาขา',
  'งานอบรม / สัมมนา',
  'ออกบูธ / กิจกรรมการตลาด',
  'ใช้งานภายในทีม / พนักงาน',
];

export function computeStockStatusKind(
  currentStock: number,
  minStock: number | null | undefined,
  isActive = true
): StockStatusKind {
  if (!isActive) return 'INACTIVE';
  if (currentStock <= 0) return 'OUT_OF_STOCK';
  if (typeof minStock === 'number' && minStock > 0 && currentStock <= minStock) {
    return 'LOW_STOCK';
  }
  return 'IN_STOCK';
}

export function getStockStatusLabel(kind: StockStatusKind): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  switch (kind) {
    case 'OUT_OF_STOCK':
      return {
        label: 'หมดสต็อก',
        badgeClass: 'bg-red-600 text-white border-red-600',
        dotClass: 'bg-white',
      };
    case 'LOW_STOCK':
      return {
        label: 'ใกล้หมด (ถึงจุดสั่งซื้อ)',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        dotClass: 'bg-red-500',
      };
    case 'INACTIVE':
      return {
        label: 'ปิดใช้งาน / งดผลิต',
        badgeClass: 'bg-slate-100 text-slate-400 border-slate-200',
        dotClass: 'bg-slate-300',
      };
    case 'IN_STOCK':
    default:
      return {
        label: 'พร้อมเบิก',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        dotClass: 'bg-slate-700',
      };
  }
}

export function formatBkkDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Bangkok',
  });
}

export function formatBkkDateTimeFull(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('th-TH', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  });
}

