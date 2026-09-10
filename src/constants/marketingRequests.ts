export type RequestTypeCode =
  | 'FILES_MEDIA'
  | 'IN_STORE_MEDIA'
  | 'PR_MEDIA'
  | 'BUDGET'
  | 'EQUIPMENT'
  | 'ASSISTANCE'
  | 'OTHER';

export interface RequestTypeConfig {
  code: RequestTypeCode;
  title: string;
  shortTitle: string;
  subtitle: string;
  iconName: string;
  line1: string;
  line2?: string;
}

export const REQUEST_TYPES: Record<RequestTypeCode, RequestTypeConfig> = {
  FILES_MEDIA: {
    code: 'FILES_MEDIA',
    title: 'ขอไฟล์ / สื่อการตลาด',
    shortTitle: 'สื่อการตลาด',
    subtitle: 'ขอไฟล์ดิจิทัล แคตตาล็อก โลโก้ รูปภาพสินค้า',
    iconName: 'FileText',
    line1: 'ขอไฟล์ /',
    line2: 'สื่อการตลาด'
  },
  IN_STORE_MEDIA: {
    code: 'IN_STORE_MEDIA',
    title: 'ขอจัดทำ สื่อหน้าร้าน',
    shortTitle: 'สื่อหน้าร้าน',
    subtitle: 'โปสเตอร์ โรลอัพ แบนเนอร์ ป้ายราคา สแตนดี้',
    iconName: 'Store',
    line1: 'ขอจัดทำ',
    line2: 'สื่อหน้าร้าน'
  },
  PR_MEDIA: {
    code: 'PR_MEDIA',
    title: 'ขอจัดทำ สื่อประชาสัมพันธ์',
    shortTitle: 'สื่อประชาสัมพันธ์',
    subtitle: 'สื่อโปรโมชั่น แคมเปญโซเชียลมีเดีย เว็บไซต์',
    iconName: 'Megaphone',
    line1: 'ขอจัดทำ',
    line2: 'สื่อประชาสัมพันธ์'
  },
  BUDGET: {
    code: 'BUDGET',
    title: 'ของบประมาณ ออกบูธ / จัดกิจกรรม',
    shortTitle: 'งบประมาณออกบูธ',
    subtitle: 'ของบสนับสนุนจัดกิจกรรม อีเวนต์ หรือออกบูธ',
    iconName: 'Coins',
    line1: 'ของบประมาณ',
    line2: 'ออกบูธ / จัดกิจกรรม'
  },
  EQUIPMENT: {
    code: 'EQUIPMENT',
    title: 'ขอยืมอุปกรณ์ ออกบูธ',
    shortTitle: 'ยืมอุปกรณ์บูธ',
    subtitle: 'ขอยืมโต๊ะ แบคดรอป ทีวี ปลั๊กพ่วง อุปกรณ์ตกแต่ง',
    iconName: 'Package',
    line1: 'ขอยืมอุปกรณ์',
    line2: 'ออกบูธ'
  },
  ASSISTANCE: {
    code: 'ASSISTANCE',
    title: 'ขอความช่วยเหลือ จากฝ่ายการตลาด',
    shortTitle: 'ความช่วยเหลือ',
    subtitle: 'ขอทีมงานการตลาดร่วมสนับสนุนงานหรือกิจกรรม',
    iconName: 'Headphones',
    line1: 'ขอความช่วยเหลือ',
    line2: 'จากฝ่ายการตลาด'
  },
  OTHER: {
    code: 'OTHER',
    title: 'อื่น ๆ',
    shortTitle: 'อื่น ๆ',
    subtitle: 'งานคำขออื่น ๆ ที่ไม่อยู่ในหมวดข้างต้น',
    iconName: 'MoreHorizontal',
    line1: 'อื่น ๆ',
    line2: ''
  }
};

export type RequestStatusCode =
  | 'BACKLOG'
  | 'TO_DO'
  | 'IN_PROGRESS'
  | 'WAITING'
  | 'REVIEW'
  | 'DONE'
  | 'CANCELLED';

export interface StatusConfig {
  code: RequestStatusCode;
  label: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export const REQUEST_STATUSES: Record<RequestStatusCode, StatusConfig> = {
  BACKLOG: {
    code: 'BACKLOG',
    label: 'รอดำเนินการ',
    description: 'รอดำเนินการ / ยังไม่มีผู้รับผิดชอบ',
    color: '#64748b',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-700',
    borderColor: 'border-gray-300'
  },
  TO_DO: {
    code: 'TO_DO',
    label: 'รับเรื่องแล้ว',
    description: 'รับเรื่องแล้ว / มอบหมายงานแล้ว',
    color: '#475569',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-800',
    borderColor: 'border-gray-300'
  },
  IN_PROGRESS: {
    code: 'IN_PROGRESS',
    label: 'กำลังดำเนินการ',
    description: 'กำลังดำเนินการ',
    color: '#dc2626',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700',
    borderColor: 'border-red-200'
  },
  WAITING: {
    code: 'WAITING',
    label: 'รอข้อมูลเพิ่มเติม',
    description: 'รอข้อมูล / เอกสารเพิ่มเติม',
    color: '#94a3b8',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-600',
    borderColor: 'border-gray-200'
  },
  REVIEW: {
    code: 'REVIEW',
    label: 'รอตรวจสอบ',
    description: 'ตรวจทานงาน / รอตรวจสอบ',
    color: '#b91c1c',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-800',
    borderColor: 'border-red-200'
  },
  DONE: {
    code: 'DONE',
    label: 'เสร็จสิ้น',
    description: 'เสร็จสมบูรณ์',
    color: '#1e293b',
    badgeBg: 'bg-gray-900',
    badgeText: 'text-white',
    borderColor: 'border-gray-900'
  },
  CANCELLED: {
    code: 'CANCELLED',
    label: 'ยกเลิก',
    description: 'ยกเลิกคำขอ',
    color: '#ef4444',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    borderColor: 'border-red-300'
  }
};

export type PriorityCode = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface PriorityConfig {
  code: PriorityCode;
  label: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export const REQUEST_PRIORITIES: Record<PriorityCode, PriorityConfig> = {
  LOW: {
    code: 'LOW',
    label: 'ต่ำ',
    color: '#64748b',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-600'
  },
  NORMAL: {
    code: 'NORMAL',
    label: 'ปกติ',
    color: '#475569',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-800'
  },
  HIGH: {
    code: 'HIGH',
    label: 'สูง',
    color: '#dc2626',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700'
  },
  URGENT: {
    code: 'URGENT',
    label: 'ด่วนมาก',
    color: '#b91c1c',
    badgeBg: 'bg-red-600',
    badgeText: 'text-white'
  }
};

export const FILE_TYPES_OPTIONS = [
  'Catalogue',
  'Brochure',
  'Product Image',
  'Logo',
  'Artwork',
  'Video',
  'Presentation',
  'Price List',
  'อื่น ๆ'
];

export const IN_STORE_MATERIAL_OPTIONS = [
  'Poster',
  'Roll Up',
  'Banner',
  'Standee',
  'Price Tag',
  'Sticker',
  'Brochure',
  'Shelf / Display Material',
  'อื่น ๆ'
];

export const PR_CHANNEL_OPTIONS = [
  'Facebook',
  'LINE OA',
  'Website',
  'Email',
  'Storefront',
  'Event',
  'Print',
  'อื่น ๆ'
];

export const EXPENSE_CATEGORY_OPTIONS = [
  'ค่าเช่าพื้นที่บูธ (Booth Fee)',
  'ค่าเดินทาง (Travel Expenses)',
  'ค่าที่พัก (Accommodation)',
  'ค่าขนส่ง (Transportation)',
  'ค่าอุปกรณ์ (Equipment)',
  'สื่อประชาสัมพันธ์ (Promotional Materials)',
  'ค่าจัดกิจกรรม (Event Organization)',
  'อื่น ๆ (Other)'
];

export const EQUIPMENT_ITEMS_OPTIONS = [
  'Roll-up Banner',
  'Backdrop',
  'โต๊ะออกบูธ (Booth Table)',
  'ผ้าปูโต๊ะ (Tablecloth)',
  'Standee',
  'โบรชัวร์ (Brochure)',
  'แคตตาล็อก (Catalogue)',
  'สินค้าตัวอย่าง (Demo Product)',
  'TV / Monitor',
  'ปลั๊กพ่วง (Power Strip)',
  'อุปกรณ์ตกแต่งบูธ (Booth Decoration Items)',
  'อื่น ๆ'
];

export const USAGE_LOCATIONS = [
  { id: 'REQUESTER_BRANCH', label: 'สาขาของผู้ขอ' },
  { id: 'HEAD_OFFICE', label: 'สำนักงานใหญ่' },
  { id: 'OTHER_BRANCH', label: 'สาขาอื่น' },
  { id: 'EXTERNAL', label: 'Event / สถานที่ภายนอก' }
];
