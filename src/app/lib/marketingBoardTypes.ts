export type ProductGroupType = 
  | 'Marketing Headquarters' 
  | 'Inverter' 
  | 'BLDC / Solar Pump' 
  | 'Solar Roof';

export type AnnouncementType = 
  | 'Promotion' 
  | 'Marketing Update' 
  | 'Product Update' 
  | 'Event' 
  | 'Urgent Notice';

export type PriorityType = 'Normal' | 'Important' | 'Urgent';

export type StatusType = 
  | 'Draft' 
  | 'Pending Approval' 
  | 'Scheduled' 
  | 'Active' 
  | 'Ending Soon' 
  | 'Expired' 
  | 'Cancelled';

export interface BoardFilters {
  search?: string;
  productGroup?: string;
  status?: string;
  branch?: string;
  dateMonth?: string;
  unreadOnly?: boolean;
}

export interface SalesMaterialsFilter {
  search?: string;
  productGroup?: string;
  documentType?: string;
  campaignId?: string;
  latestOnly?: boolean;
}

export function computeDynamicStatus(ann: {
  status: string;
  startAt: Date | string;
  endAt?: Date | string | null;
}): StatusType {
  if (['Draft', 'Pending Approval', 'Cancelled'].includes(ann.status)) {
    return ann.status as StatusType;
  }
  const now = new Date();
  if (ann.startAt && new Date(ann.startAt) > now) {
    return 'Scheduled';
  }
  if (ann.endAt && new Date(ann.endAt) < now) {
    return 'Expired';
  }
  if (ann.endAt) {
    const diffDays = (new Date(ann.endAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 3 && diffDays >= 0) {
      return 'Ending Soon';
    }
  }
  return 'Active';
}
