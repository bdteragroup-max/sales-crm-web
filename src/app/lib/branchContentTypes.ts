export type BranchContentStatus =
  | 'BACKLOG'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'APPROVE_1'
  | 'REVISE'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'CANCELLED';

export type ReviewSubStatus =
  | 'WAITING_BRANCH_MANAGER'
  | 'WAITING_MARKETING_REVIEWER'
  | 'ENDORSED_FOR_MARKETING_MANAGER'
  | 'APPROVED'
  | null;

export interface BranchMasterItem {
  id: string;
  name: string;
  code: string;
}

export interface BranchContentMediaItem {
  id: string;
  contentId: string;
  version: number;
  fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  fileSize: number;
  mimeType?: string | null;
  uploadedById?: string | null;
  uploadedByName?: string | null;
  createdAt: string;
}

export interface BranchContentCommentItem {
  id: string;
  contentId: string;
  userId: string;
  userName: string;
  userRole?: string | null;
  version: number;
  commentType:
    | 'GENERAL'
    | 'FEEDBACK'
    | 'REVISION_REQUEST'
    | 'BRANCH_APPROVAL'
    | 'ENDORSEMENT'
    | 'APPROVAL_NOTE';
  message: string;
  createdAt: string;
}

export interface BranchContentLogItem {
  id: string;
  contentId: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  version: number;
  details?: string | null;
  createdAt: string;
}

export interface BranchContentItem {
  id: string;
  contentNo: string;
  title: string;
  branchId: string;
  branchName: string;
  createdById: string;
  createdByName: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  contentType: string;
  productGroup: string;
  objective?: string | null;
  targetChannels: string[];
  mediaFormat?: string | null;
  caption?: string | null;
  description?: string | null;
  callToAction?: string | null;
  referenceUrl?: string | null;
  submissionDueDate?: string | null;
  plannedPublishDate?: string | null;
  status: BranchContentStatus;
  reviewSubStatus?: ReviewSubStatus;
  currentVersion: number;
  revisionCount: number;
  submittedAt?: string | null;
  reviewerId?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
  reviewFeedback?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  approvalNote?: string | null;
  actualChannel?: string | null;
  actualPublishDate?: string | null;
  publishedUrl?: string | null;
  publishedByName?: string | null;
  cancelReason?: string | null;
  cancelledByName?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  media: BranchContentMediaItem[];
  comments: BranchContentCommentItem[];
  logs: BranchContentLogItem[];
}

export interface BranchContentPermissions {
  userId: string;
  userName: string;
  userRole: string;
  roleLabel: string;
  userBranchId: string | null;
  userBranchName: string | null;
  canViewAllBranches: boolean;
  canBranchApprove: boolean;
  canReview: boolean;
  canApprove: boolean;
  isSystemAdmin: boolean;
  isBranchManager: boolean;
}

export interface BranchStatRow {
  branchId: string;
  branchName: string;
  total: number;
  backlog: number;
  inProgress: number;
  pendingReview: number;
  approve1: number;
  endorsed: number;
  revise: number;
  approved: number;
  published: number;
  cancelled: number;
  overdue: number;
  totalRevisions: number;
  avgRevisionCount: number;
}

export interface BranchContentKPI {
  total: number;
  backlog: number;
  inProgress: number;
  pendingReview: number;
  approve1: number;
  endorsedForApproval: number;
  revise: number;
  approved: number;
  published: number;
  cancelled: number;
  overdue: number;
  avgRevisionRate: number;
  avgReviewHours: number;
  branchStats: BranchStatRow[];
  channelBreakdown: { channel: string; count: number; publishedCount: number }[];
  monthlyBreakdown: { monthKey: string; label: string; created: number; published: number }[];
}

export const CONTENT_TYPES = [
  { value: 'SHORT_VIDEO', label: 'วิดีโอสั้น (Reels / TikTok / Shorts)' },
  { value: 'SINGLE_IMAGE', label: 'ภาพเดี่ยว (Single Image Post)' },
  { value: 'PHOTO_ALBUM', label: 'อัลบั้มภาพ / ภาพชุด (Carousel / Album)' },
  { value: 'INFOGRAPHIC', label: 'อินโฟกราฟิก / ความรู้สินค้า (Infographic)' },
  { value: 'CASE_STUDY', label: 'รีวิวผลงานติดตั้ง / ส่งมอบงานลูกค้า (Case Study)' },
  { value: 'PROMOTION_SHARE', label: 'ประชาสัมพันธ์โปรโมชั่นสาขา (Local Promotion)' },
  { value: 'LIVE_STREAM', label: 'ไลฟ์สด (Live Stream)' },
];

export const PRODUCT_GROUPS = [
  'Solar Cell / โซลาร์เซลล์',
  'Inverter / อินเวอร์เตอร์',
  'Motor / มอเตอร์อุตสาหกรรม',
  'Control Panel / ตู้คอนโทรล',
  'Water Pump / ปั๊มน้ำโซลาร์',
  'Service & Maintenance / งานซ่อมและบริการ',
  'Promotion / โปรโมชั่นประจำเดือน',
  'Branch Activity / กิจกรรมหน้าร้านสาขา',
  'General / ความรู้ทั่วไป',
];

export const CONTENT_OBJECTIVES = [
  'สร้างการรับรู้แบรนด์สาขา (Brand Awareness)',
  'หาลูกค้าทักแชท / ปิดการขาย (Lead Generation)',
  'ให้ความรู้สินค้า / เทคนิคช่าง (Product Education)',
  'สร้างความน่าเชื่อถือ / รีวิวหน้างาน (Trust & Portfolio)',
  'กระตุ้นลูกค้าเข้าหน้าร้าน (Store Traffic)',
  'ประชาสัมพันธ์โปรโมชั่น (Promotion Push)',
];

export const TARGET_CHANNELS = [
  'Facebook Page สาขา',
  'TikTok สาขา',
  'LINE Official Account (LINE OA)',
  'YouTube / Shorts',
  'Instagram',
  'Lemon8',
];

export const MEDIA_FORMATS = [
  { value: '9:16', label: '9:16 (แนวตั้ง Reels / TikTok 1080x1920)' },
  { value: '1:1', label: '1:1 (จัตุรัส Facebook / IG 1080x1080)' },
  { value: '4:5', label: '4:5 (แนวตั้งโพสต์ภาพ 1080x1350)' },
  { value: '16:9', label: '16:9 (แนวนอน YouTube / Landscape 1920x1080)' },
  { value: 'MULTI', label: 'คละสัดส่วน (อัลบั้มภาพหลายขนาด)' },
];

export const KANBAN_COLUMNS: {
  id: BranchContentStatus;
  title: string;
  subtitle: string;
  badgeColor: string;
  headerBg: string;
  borderColor: string;
}[] = [
  {
    id: 'BACKLOG',
    title: '1. แผนงานใหม่',
    subtitle: 'จดหัวข้อ / ไอเดียคอนเทนต์ที่จะทำ',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    headerBg: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
  {
    id: 'IN_PROGRESS',
    title: '2. กำลังทำคอนเทนต์',
    subtitle: 'กำลังถ่ายทำ ตัดต่อ หรือเขียนแคปชั่น',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    headerBg: 'bg-blue-50/50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'PENDING_REVIEW',
    title: '3. รอ ผจก.สาขาตรวจ',
    subtitle: 'สาขาส่งงานให้ผู้จัดการสาขาตรวจ',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    headerBg: 'bg-amber-50/60',
    borderColor: 'border-amber-200',
  },
  {
    id: 'APPROVE_1',
    title: '4. รอการตลาดตรวจ',
    subtitle: 'ผจก.สาขาอนุมัติแล้ว • ส่งต่อการตลาด',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
    headerBg: 'bg-purple-50/60',
    borderColor: 'border-purple-200',
  },
  {
    id: 'REVISE',
    title: 'ส่งกลับแก้ไข',
    subtitle: 'มีจุดต้องแก้ไข • ปรับแล้วส่งตรวจใหม่',
    badgeColor: 'bg-orange-50 text-orange-800 border-orange-200',
    headerBg: 'bg-orange-50/60',
    borderColor: 'border-orange-200',
  },
  {
    id: 'APPROVED',
    title: '5. อนุมัติแล้ว (พร้อมโพสต์)',
    subtitle: 'การตลาดอนุมัติผ่านแล้ว • นำไปโพสต์ได้',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    headerBg: 'bg-emerald-50/60',
    borderColor: 'border-emerald-200',
  },
  {
    id: 'PUBLISHED',
    title: '6. โพสต์สำเร็จแล้ว',
    subtitle: 'โพสต์ลงโซเชียลและแนบลิงก์เรียบร้อย',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    headerBg: 'bg-indigo-50/60',
    borderColor: 'border-indigo-200',
  },
];
