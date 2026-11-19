'use server';

import prisma from '@/app/lib/db';
import { Prisma } from '@/generated/client';
import { getUser } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import {
  DEFAULT_REPORT_TITLE,
  areManagerSignaturesComplete,
  canAccessSolarCleaningRole,
  canEditSolarCleaningRole,
  canManageSolarCleaningRecord,
  canSignSolarCleaningAsProjectMgr,
  canSignSolarCleaningAsServiceMgr,
  canViewAllSolarCleaningRole,
  deriveSolarCleaningStatus,
  findMissingReportPhotoNotes,
  getNeededManagerSigners,
  isOverallRemarkMissing,
  isSuperAdminRole,
  normalizeReportData,
  normalizeWorkItems,
  resolveManagerSignConfig,
  type CleaningWorkItem,
  type InspectionPassStatus,
  type SelectableCustomerOption,
  type SolarCleaningRecord,
  type SolarCleaningReportData,
} from '@/app/lib/solarCleaningConfig';
import {
  dbCountPendingManagerSignatures,
  dbCreateSolarCleaning,
  dbDeleteSolarCleaning,
  dbGetSolarCleaningById,
  dbListDocNumbersByPrefix,
  dbListSolarCleaningInspections,
  dbUpdateSolarCleaning,
  dbUpdateSolarCleaningManagerSign,
} from '@/app/lib/solarCleaningDb';

export interface SaveSolarCleaningInput {
  companyCode?: string;
  status?: string;
  projectId?: string | null;
  projectName: string;
  location?: string | null;
  customerName: string;
  customerPhone?: string | null;
  inspectorNames?: string | null;
  systemSizeKwp?: string | null;
  inspectionRound?: string | null;
  inspectionDate?: string | null;
  reportDate?: string | null;

  projectTypes?: string[];
  projectTypeOther?: string | null;
  jobTypes?: string[];
  jobTypeOther?: string | null;
  workItems?: CleaningWorkItem[];
  additionalDetail?: string | null;
  checkInCustomerSignUrl?: string | null;
  checkInCustomerName?: string | null;
  checkInAt?: string | null;
  checkOutCustomerSignUrl?: string | null;
  checkOutCustomerName?: string | null;
  checkOutAt?: string | null;
  inspectorSignUrl?: string | null;
  inspectorSignerName?: string | null;

  reportTitle?: string | null;
  reportData?: SolarCleaningReportData;
  overallResult?: InspectionPassStatus | string;
  projectMgrSignUrl?: string | null;
  serviceMgrSignUrl?: string | null;
}

function parseBkkDateOrTime(val?: string | null, fallbackNow = false): Date | null {
  const clean = (val || '').trim();
  if (!clean) return fallbackNow ? new Date() : null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const d = new Date(`${clean}T09:00:00+07:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clean)) {
    const d = new Date(`${clean}:00+07:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(clean);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function generateDocNumber(offset = 0): Promise<string> {
  const bkkParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const ceYear = Number(bkkParts.find((p) => p.type === 'year')?.value || '2026');
  const beYear = ceYear + 543;
  const month = bkkParts.find((p) => p.type === 'month')?.value || '01';
  const prefix = `SC-${beYear}${month}-`;

  const existing = await dbListDocNumbersByPrefix(prefix);

  let maxSeq = 0;
  for (const docNo of existing) {
    const tail = Number(docNo.slice(prefix.length));
    if (Number.isFinite(tail) && tail > maxSeq) maxSeq = tail;
  }

  return `${prefix}${String(maxSeq + 1 + offset).padStart(3, '0')}`;
}

async function notifyManagersForSignature(params: {
  inspectionId: string;
  docNumber: string;
  projectName: string;
  customerName: string;
  needsProjectMgr: boolean;
  needsServiceMgr: boolean;
  excludeUserId: string;
}) {
  if (!params.needsProjectMgr && !params.needsServiceMgr) return;
  try {
    const activeUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, role: true },
    });

    const recipientIds = activeUsers
      .filter((u) => {
        if (u.id === params.excludeUserId) return false;
        const isPm = canSignSolarCleaningAsProjectMgr(u.role) && !isSuperAdminRole(u.role);
        const isSm = canSignSolarCleaningAsServiceMgr(u.role) && !isSuperAdminRole(u.role);
        return (params.needsProjectMgr && isPm) || (params.needsServiceMgr && isSm);
      })
      .map((u) => u.id);

    if (recipientIds.length === 0) return;

    await prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        type: 'SOLAR_CLEANING_SIGN',
        title: `รออนุมัติลายเซ็น Inspection Report (${params.docNumber})`,
        message: `${params.projectName} (${params.customerName}) รอแมเนเจอร์โปรเจค/แมเนเจอร์เซอร์วิสเซ็นตรวจสอบรายงาน`,
        linkUrl: `/projects/solar-cleaning/${params.inspectionId}`,
      })),
    });
  } catch (err) {
    console.warn('Could not notify managers for SolarCleaning signature:', err);
  }
}

export async function listSolarCleaningInspections(): Promise<{
  success: boolean;
  data?: SolarCleaningRecord[];
  error?: string;
}> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    if (!canAccessSolarCleaningRole(user.role)) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงโมดูลนี้' };
    }

    const canViewAll = canViewAllSolarCleaningRole(user.role);
    const rows = await dbListSolarCleaningInspections(
      canViewAll ? undefined : { createdById: user.id }
    );
    return { success: true, data: rows };
  } catch (err: unknown) {
    console.error('listSolarCleaningInspections error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Database error' };
  }
}

export async function getSolarCleaningById(id: string): Promise<{
  success: boolean;
  data?: SolarCleaningRecord;
  error?: string;
}> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    if (!canAccessSolarCleaningRole(user.role)) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงโมดูลนี้' };
    }

    const row = await dbGetSolarCleaningById(id);
    if (!row) return { success: false, error: 'ไม่พบเอกสารที่ต้องการ' };
    if (
      !canManageSolarCleaningRecord({
        userId: user.id,
        userRole: user.role,
        createdById: row.createdById,
      })
    ) {
      return { success: false, error: 'คุณสามารถดูได้เฉพาะเอกสารที่สร้างเองเท่านั้น' };
    }
    return { success: true, data: row };
  } catch (err: unknown) {
    console.error('getSolarCleaningById error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Database error' };
  }
}

export async function getSolarCleaningSelectableProjects() {
  try {
    const user = await getUser();
    if (!user || !canAccessSolarCleaningRole(user.role)) return [];

    const projects = await prisma.project.findMany({
      select: {
        id: true,
        projectNumber: true,
        name: true,
        clientName: true,
        siteAddress: true,
        projectCategory: true,
        siteTeamMembers: true,
        siteSupervisor: true,
        job: {
          select: {
            companyCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return projects;
  } catch (err) {
    console.error('getSolarCleaningSelectableProjects error:', err);
    return [];
  }
}

const CUSTOMER_COMPANY_SELECT = {
  id: true,
  companyName: true,
  customerType: true,
  taxId: true,
  address: true,
  subDistrict: true,
  district: true,
  province: true,
  postalCode: true,
  contacts: {
    select: {
      contactName: true,
      mobilePhone: true,
    },
    orderBy: { createdAt: 'asc' as const },
    take: 5,
  },
} satisfies Prisma.CompanySelect;

type CompanyWithContactsRow = Prisma.CompanyGetPayload<{
  select: typeof CUSTOMER_COMPANY_SELECT;
}>;

function formatCompanyFullAddress(c: {
  address?: string | null;
  subDistrict?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
}): string {
  const parts: string[] = [];
  if (c.address?.trim()) parts.push(c.address.trim());
  if (c.subDistrict?.trim()) {
    const s = c.subDistrict.trim();
    parts.push(/^(ต\.|แขวง)/.test(s) ? s : `ต.${s}`);
  }
  if (c.district?.trim()) {
    const d = c.district.trim();
    parts.push(/^(อ\.|เขต)/.test(d) ? d : `อ.${d}`);
  }
  if (c.province?.trim()) {
    const p = c.province.trim();
    parts.push(/^(จ\.|จังหวัด|กรุงเทพ)/.test(p) ? p : `จ.${p}`);
  }
  if (c.postalCode?.trim()) parts.push(c.postalCode.trim());
  return parts.join(' ').trim();
}

function mapCompanyToCustomerOption(c: CompanyWithContactsRow): SelectableCustomerOption {
  const firstWithPhone = c.contacts.find((ct) => ct.mobilePhone?.trim());
  const firstContact = firstWithPhone || c.contacts[0];
  return {
    id: c.id,
    companyName: c.companyName.trim(),
    customerType: c.customerType,
    taxId: c.taxId,
    fullAddress: formatCompanyFullAddress(c),
    phone: firstWithPhone?.mobilePhone?.trim() || '',
    contactName: firstContact?.contactName?.trim() || '',
  };
}

function dedupeCustomerOptions(items: SelectableCustomerOption[]): SelectableCustomerOption[] {
  const byName = new Map<string, SelectableCustomerOption>();
  for (const item of items) {
    const key = item.companyName.trim().toLowerCase();
    if (!key) continue;
    const prev = byName.get(key);
    if (!prev) {
      byName.set(key, item);
      continue;
    }
    const prevScore = (prev.phone ? 2 : 0) + (prev.fullAddress ? 1 : 0);
    const nextScore = (item.phone ? 2 : 0) + (item.fullAddress ? 1 : 0);
    if (nextScore > prevScore) {
      byName.set(key, item);
    }
  }
  return Array.from(byName.values());
}

export async function getSolarCleaningSelectableCustomers(): Promise<SelectableCustomerOption[]> {
  try {
    const user = await getUser();
    if (!user || !canAccessSolarCleaningRole(user.role)) return [];

    const companies = await prisma.company.findMany({
      select: CUSTOMER_COMPANY_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    return dedupeCustomerOptions(companies.map(mapCompanyToCustomerOption));
  } catch (err) {
    console.error('getSolarCleaningSelectableCustomers error:', err);
    return [];
  }
}

export async function searchSolarCleaningCustomers(
  query: string
): Promise<{ success: boolean; data: SelectableCustomerOption[]; error?: string }> {
  try {
    const user = await getUser();
    if (!user || !canAccessSolarCleaningRole(user.role)) {
      return { success: false, data: [], error: 'Unauthorized' };
    }

    const tokens = (query || '').trim().split(/\s+/).filter(Boolean);
    const where: Prisma.CompanyWhereInput =
      tokens.length === 0
        ? {}
        : {
            AND: tokens.map((tok) => ({
              OR: [
                { companyName: { contains: tok, mode: 'insensitive' } },
                { taxId: { contains: tok, mode: 'insensitive' } },
                { province: { contains: tok, mode: 'insensitive' } },
                { address: { contains: tok, mode: 'insensitive' } },
                {
                  contacts: {
                    some: {
                      OR: [
                        { contactName: { contains: tok, mode: 'insensitive' } },
                        { mobilePhone: { contains: tok, mode: 'insensitive' } },
                      ],
                    },
                  },
                },
              ],
            })),
          };

    const companies = await prisma.company.findMany({
      where,
      select: CUSTOMER_COMPANY_SELECT,
      orderBy: [{ companyName: 'asc' }, { updatedAt: 'desc' }],
      take: 60,
    });

    return {
      success: true,
      data: dedupeCustomerOptions(companies.map(mapCompanyToCustomerOption)),
    };
  } catch (err) {
    console.error('searchSolarCleaningCustomers error:', err);
    return {
      success: false,
      data: [],
      error: err instanceof Error ? err.message : 'ค้นหาลูกค้าไม่สำเร็จ',
    };
  }
}

export async function createSolarCleaningCustomer(input: {
  companyName: string;
  customerType?: string;
  taxId?: string;
  contactName?: string;
  phone?: string;
  address?: string;
  province?: string;
}): Promise<{
  success: boolean;
  data?: SelectableCustomerOption;
  alreadyExists?: boolean;
  error?: string;
}> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    if (!canEditSolarCleaningRole(user.role)) {
      return { success: false, error: 'บทบาทของคุณไม่มีสิทธิ์เพิ่มข้อมูลลูกค้า' };
    }

    const companyName = (input.companyName || '').trim();
    if (!companyName) {
      return { success: false, error: 'กรุณาระบุชื่อลูกค้าหรือชื่อบริษัท' };
    }

    const existingByName = await prisma.company.findFirst({
      where: { companyName: { equals: companyName, mode: 'insensitive' } },
      select: CUSTOMER_COMPANY_SELECT,
    });
    if (existingByName) {
      return {
        success: true,
        alreadyExists: true,
        data: mapCompanyToCustomerOption(existingByName),
      };
    }

    const taxId = (input.taxId || '').trim() || null;
    if (taxId) {
      const existingTax = await prisma.company.findFirst({
        where: { taxId },
        select: { id: true, companyName: true },
      });
      if (existingTax) {
        return {
          success: false,
          error: `เลขประจำตัวผู้เสียภาษีนี้ถูกใช้แล้วโดย "${existingTax.companyName}"`,
        };
      }
    }

    const customerType = input.customerType === 'บุคคลธรรมดา' ? 'บุคคลธรรมดา' : 'นิติบุคคล';
    const contactName = (input.contactName || '').trim();
    const phone = (input.phone || '').trim();
    const address = (input.address || '').trim() || null;
    const province = (input.province || '').trim() || null;

    const createdCompany = await prisma.$transaction(async (tx) => {
      const co = await tx.company.create({
        data: {
          companyName,
          taxId,
          customerStatus: 'ลูกค้าใหม่',
          customerType,
          branchOrHeadOffice: customerType === 'บุคคลธรรมดา' ? null : 'สำนักงานใหญ่',
          address,
          province,
          customerAccessChannel: 'Solar Cleaning Module',
        },
        select: { id: true },
      });

      if (phone || contactName) {
        await tx.contact.create({
          data: {
            companyId: co.id,
            contactName: contactName || companyName,
            mobilePhone: phone || null,
          },
        });
      }

      return await tx.company.findUniqueOrThrow({
        where: { id: co.id },
        select: CUSTOMER_COMPANY_SELECT,
      });
    });

    revalidatePath('/clients');
    return {
      success: true,
      alreadyExists: false,
      data: mapCompanyToCustomerOption(createdCompany),
    };
  } catch (err) {
    console.error('createSolarCleaningCustomer error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลลูกค้าใหม่ได้',
    };
  }
}

export async function getPendingSolarCleaningSignCount(): Promise<number> {
  try {
    const user = await getUser();
    if (!user) return 0;

    const isPm = canSignSolarCleaningAsProjectMgr(user.role);
    const isSm = canSignSolarCleaningAsServiceMgr(user.role);
    if (!isPm && !isSm) return 0;

    return await dbCountPendingManagerSignatures({ needPm: isPm, needSm: isSm });
  } catch {
    return 0;
  }
}

function validateRemarksForSubmittedReport(
  computedStatus: string,
  requestedStatus: string | undefined,
  reportData: SolarCleaningReportData
): string | null {
  if (
    computedStatus === 'Pending Manager Sign' ||
    computedStatus === 'Completed' ||
    requestedStatus === 'Pending Manager Sign' ||
    requestedStatus === 'Completed'
  ) {
    const missingPhotoNotes = findMissingReportPhotoNotes(reportData);
    if (missingPhotoNotes.length > 0) {
      return `กรุณาพิมพ์คำอธิบายใต้รูปถ่ายให้ครบทุกรูปก่อนส่งรายงาน (ยังขาดคำอธิบาย ${missingPhotoNotes.length} รูป)`;
    }
    if (isOverallRemarkMissing(reportData)) {
      return 'กรุณากรอกข้อมูล "ข้อเสนอแนะ / สรุปผลการตรวจสอบระบบโดยรวม" ก่อนส่งรายงาน';
    }
  }
  return null;
}

export async function createSolarCleaningInspection(
  input: SaveSolarCleaningInput
): Promise<{ success: boolean; id?: string; docNumber?: string; error?: string }> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    if (!canEditSolarCleaningRole(user.role)) {
      return { success: false, error: 'บทบาทของคุณไม่มีสิทธิ์สร้างเอกสารล้างแผงและตรวจเช็คระบบ' };
    }

    const projectName = (input.projectName || '').trim();
    const customerName = (input.customerName || '').trim();
    if (!projectName || !customerName) {
      return { success: false, error: 'กรุณาระบุชื่อโครงการและชื่อลูกค้า' };
    }

    const workItems = normalizeWorkItems(input.workItems);
    const reportData = normalizeReportData(input.reportData);

    const canSignPm = canSignSolarCleaningAsProjectMgr(user.role);
    const canSignSm = canSignSolarCleaningAsServiceMgr(user.role);
    const nextPmSign = canSignPm && input.projectMgrSignUrl ? input.projectMgrSignUrl : null;
    const nextSmSign = canSignSm && input.serviceMgrSignUrl ? input.serviceMgrSignUrl : null;

    const computedStatus = deriveSolarCleaningStatus({
      requestedStatus: input.status,
      checkInCustomerSignUrl: input.checkInCustomerSignUrl,
      checkOutCustomerSignUrl: input.checkOutCustomerSignUrl,
      projectMgrSignUrl: nextPmSign,
      serviceMgrSignUrl: nextSmSign,
      reportData,
    });

    const remarkErr = validateRemarksForSubmittedReport(computedStatus, input.status, reportData);
    if (remarkErr) {
      return { success: false, error: remarkErr };
    }

    let created: { id: string; docNumber: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const docNumber = await generateDocNumber(attempt);
      try {
        created = await dbCreateSolarCleaning(docNumber, {
          companyCode: input.companyCode || 'TE',
          status: computedStatus,
          projectId: input.projectId || null,
          projectName,
          location: input.location || null,
          customerName,
          customerPhone: input.customerPhone || null,
          inspectorNames: input.inspectorNames || null,
          systemSizeKwp: input.systemSizeKwp || null,
          inspectionRound: input.inspectionRound || null,
          inspectionDate: parseBkkDateOrTime(input.inspectionDate, true) || new Date(),
          reportDate: parseBkkDateOrTime(input.reportDate, false),

          projectTypes: Array.isArray(input.projectTypes) ? input.projectTypes : [],
          projectTypeOther: input.projectTypeOther || null,
          jobTypes: Array.isArray(input.jobTypes) ? input.jobTypes : [],
          jobTypeOther: input.jobTypeOther || null,
          workItems,
          additionalDetail: input.additionalDetail || null,
          checkInCustomerSignUrl: input.checkInCustomerSignUrl || null,
          checkInCustomerName: input.checkInCustomerName || null,
          checkInAt: input.checkInAt
            ? parseBkkDateOrTime(input.checkInAt)
            : input.checkInCustomerSignUrl
            ? new Date()
            : null,
          checkOutCustomerSignUrl: input.checkOutCustomerSignUrl || null,
          checkOutCustomerName: input.checkOutCustomerName || null,
          checkOutAt: input.checkOutAt
            ? parseBkkDateOrTime(input.checkOutAt)
            : input.checkOutCustomerSignUrl
            ? new Date()
            : null,
          inspectorSignUrl: input.inspectorSignUrl || null,
          inspectorSignerName: input.inspectorSignerName || null,

          reportTitle: (input.reportTitle || '').trim() || DEFAULT_REPORT_TITLE,
          reportData,
          overallResult: input.overallResult === 'NOT_PASS' ? 'NOT_PASS' : 'PASS',
          projectMgrSignUrl: nextPmSign,
          projectMgrId: nextPmSign ? user.id : null,
          projectMgrName: nextPmSign ? user.fullName : null,
          projectMgrSignedAt: nextPmSign ? new Date() : null,
          serviceMgrSignUrl: nextSmSign,
          serviceMgrId: nextSmSign ? user.id : null,
          serviceMgrName: nextSmSign ? user.fullName : null,
          serviceMgrSignedAt: nextSmSign ? new Date() : null,
          createdById: user.id,
          updatedById: user.id,
        });
        break;
      } catch (err) {
        const isUniqueConflict =
          (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') ||
          (err instanceof Error && (err.message.includes('23505') || err.message.includes('duplicate key')));
        if (!isUniqueConflict || attempt === 2) throw err;
      }
    }

    if (!created) {
      return { success: false, error: 'ไม่สามารถสร้างเลขที่เอกสารได้' };
    }

    if (computedStatus === 'Pending Manager Sign') {
      const needed = getNeededManagerSigners({
        mode: reportData.managerSignMode,
        projectMgrSignUrl: nextPmSign,
        serviceMgrSignUrl: nextSmSign,
      });
      await notifyManagersForSignature({
        inspectionId: created.id,
        docNumber: created.docNumber,
        projectName,
        customerName,
        needsProjectMgr: needed.needProjectMgr,
        needsServiceMgr: needed.needServiceMgr,
        excludeUserId: user.id,
      });
    }

    revalidatePath('/projects/solar-cleaning');
    return { success: true, id: created.id, docNumber: created.docNumber };
  } catch (err: unknown) {
    console.error('createSolarCleaningInspection error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างเอกสาร',
    };
  }
}

export async function updateSolarCleaningInspection(
  id: string,
  input: SaveSolarCleaningInput
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    if (!canEditSolarCleaningRole(user.role)) {
      return { success: false, error: 'บทบาทของคุณไม่มีสิทธิ์แก้ไขเอกสารนี้' };
    }

    const existing = await dbGetSolarCleaningById(id);
    if (!existing) return { success: false, error: 'ไม่พบเอกสารในระบบ' };
    if (
      !canManageSolarCleaningRecord({
        userId: user.id,
        userRole: user.role,
        createdById: existing.createdById,
      })
    ) {
      return { success: false, error: 'คุณสามารถแก้ไขได้เฉพาะเอกสารที่สร้างเองเท่านั้น' };
    }

    const projectName = (input.projectName || '').trim();
    const customerName = (input.customerName || '').trim();
    if (!projectName || !customerName) {
      return { success: false, error: 'กรุณาระบุชื่อโครงการและชื่อลูกค้า' };
    }

    const workItems = normalizeWorkItems(input.workItems);
    const reportData = normalizeReportData(input.reportData);

    const canSignPm = canSignSolarCleaningAsProjectMgr(user.role);
    const canSignSm = canSignSolarCleaningAsServiceMgr(user.role);

    const nextPmSign = canSignPm
      ? input.projectMgrSignUrl !== undefined
        ? input.projectMgrSignUrl
        : existing.projectMgrSignUrl || null
      : existing.projectMgrSignUrl || null;
    const pmChanged = nextPmSign !== (existing.projectMgrSignUrl || null);

    const nextSmSign = canSignSm
      ? input.serviceMgrSignUrl !== undefined
        ? input.serviceMgrSignUrl
        : existing.serviceMgrSignUrl || null
      : existing.serviceMgrSignUrl || null;
    const smChanged = nextSmSign !== (existing.serviceMgrSignUrl || null);

    const computedStatus = deriveSolarCleaningStatus({
      requestedStatus: input.status,
      checkInCustomerSignUrl: input.checkInCustomerSignUrl,
      checkOutCustomerSignUrl: input.checkOutCustomerSignUrl,
      projectMgrSignUrl: nextPmSign,
      serviceMgrSignUrl: nextSmSign,
      reportData,
    });

    const remarkErr = validateRemarksForSubmittedReport(computedStatus, input.status, reportData);
    if (remarkErr) {
      return { success: false, error: remarkErr };
    }

    const existingInspectionDate =
      existing.inspectionDate instanceof Date
        ? existing.inspectionDate
        : new Date(existing.inspectionDate);
    const existingReportDate = existing.reportDate
      ? existing.reportDate instanceof Date
        ? existing.reportDate
        : new Date(existing.reportDate)
      : null;
    const existingCheckInAt = existing.checkInAt
      ? existing.checkInAt instanceof Date
        ? existing.checkInAt
        : new Date(existing.checkInAt)
      : null;
    const existingCheckOutAt = existing.checkOutAt
      ? existing.checkOutAt instanceof Date
        ? existing.checkOutAt
        : new Date(existing.checkOutAt)
      : null;
    const existingPmSignedAt = existing.projectMgrSignedAt
      ? existing.projectMgrSignedAt instanceof Date
        ? existing.projectMgrSignedAt
        : new Date(existing.projectMgrSignedAt)
      : null;
    const existingSmSignedAt = existing.serviceMgrSignedAt
      ? existing.serviceMgrSignedAt instanceof Date
        ? existing.serviceMgrSignedAt
        : new Date(existing.serviceMgrSignedAt)
      : null;

    await dbUpdateSolarCleaning(id, {
      companyCode: input.companyCode || existing.companyCode,
      status: computedStatus,
      projectId: input.projectId !== undefined ? input.projectId || null : existing.projectId || null,
      projectName,
      location: input.location ?? null,
      customerName,
      customerPhone: input.customerPhone ?? null,
      inspectorNames: input.inspectorNames ?? null,
      systemSizeKwp: input.systemSizeKwp ?? null,
      inspectionRound: input.inspectionRound ?? null,
      inspectionDate: parseBkkDateOrTime(input.inspectionDate) || existingInspectionDate,
      reportDate:
        input.reportDate !== undefined ? parseBkkDateOrTime(input.reportDate) : existingReportDate,

      projectTypes: Array.isArray(input.projectTypes) ? input.projectTypes : [],
      projectTypeOther: input.projectTypeOther ?? null,
      jobTypes: Array.isArray(input.jobTypes) ? input.jobTypes : [],
      jobTypeOther: input.jobTypeOther ?? null,
      workItems,
      additionalDetail: input.additionalDetail ?? null,

      checkInCustomerSignUrl: input.checkInCustomerSignUrl ?? null,
      checkInCustomerName: input.checkInCustomerName ?? null,
      checkInAt: input.checkInAt
        ? parseBkkDateOrTime(input.checkInAt)
        : input.checkInCustomerSignUrl && !existingCheckInAt
        ? new Date()
        : input.checkInCustomerSignUrl
        ? existingCheckInAt
        : null,

      checkOutCustomerSignUrl: input.checkOutCustomerSignUrl ?? null,
      checkOutCustomerName: input.checkOutCustomerName ?? null,
      checkOutAt: input.checkOutAt
        ? parseBkkDateOrTime(input.checkOutAt)
        : input.checkOutCustomerSignUrl && !existingCheckOutAt
        ? new Date()
        : input.checkOutCustomerSignUrl
        ? existingCheckOutAt
        : null,

      inspectorSignUrl: input.inspectorSignUrl ?? null,
      inspectorSignerName: input.inspectorSignerName ?? null,

      reportTitle: (input.reportTitle || '').trim() || DEFAULT_REPORT_TITLE,
      reportData,
      overallResult: input.overallResult === 'NOT_PASS' ? 'NOT_PASS' : 'PASS',

      projectMgrSignUrl: nextPmSign,
      projectMgrId: pmChanged ? (nextPmSign ? user.id : null) : existing.projectMgrId || null,
      projectMgrName: pmChanged ? (nextPmSign ? user.fullName : null) : existing.projectMgrName || null,
      projectMgrSignedAt: pmChanged ? (nextPmSign ? new Date() : null) : existingPmSignedAt,

      serviceMgrSignUrl: nextSmSign,
      serviceMgrId: smChanged ? (nextSmSign ? user.id : null) : existing.serviceMgrId || null,
      serviceMgrName: smChanged ? (nextSmSign ? user.fullName : null) : existing.serviceMgrName || null,
      serviceMgrSignedAt: smChanged ? (nextSmSign ? new Date() : null) : existingSmSignedAt,

      updatedById: user.id,
    });

    if (
      computedStatus === 'Pending Manager Sign' &&
      (existing.status !== 'Pending Manager Sign' ||
        normalizeReportData(existing.reportData).managerSignMode !== reportData.managerSignMode)
    ) {
      const needed = getNeededManagerSigners({
        mode: reportData.managerSignMode,
        projectMgrSignUrl: nextPmSign,
        serviceMgrSignUrl: nextSmSign,
      });
      await notifyManagersForSignature({
        inspectionId: id,
        docNumber: existing.docNumber,
        projectName,
        customerName,
        needsProjectMgr: needed.needProjectMgr,
        needsServiceMgr: needed.needServiceMgr,
        excludeUserId: user.id,
      });
    }

    revalidatePath('/projects/solar-cleaning');
    revalidatePath(`/projects/solar-cleaning/${id}`);
    return { success: true, status: computedStatus };
  } catch (err: unknown) {
    console.error('updateSolarCleaningInspection error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลได้',
    };
  }
}

export async function signSolarCleaningByManager(
  id: string,
  params: {
    roleType: 'project_manager' | 'service_manager';
    signatureUrl: string | null;
  }
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (params.roleType === 'project_manager' && !canSignSolarCleaningAsProjectMgr(user.role)) {
      return {
        success: false,
        error: 'เฉพาะผู้จัดการโปรเจค (Project Manager / Engineering Mgr.) จึงสามารถลงนามส่วนนี้ได้',
      };
    }
    if (params.roleType === 'service_manager' && !canSignSolarCleaningAsServiceMgr(user.role)) {
      return {
        success: false,
        error: 'เฉพาะผู้จัดการเซอร์วิส (Service Engineer Mgr. / Manager Technician) จึงสามารถลงนามส่วนนี้ได้',
      };
    }

    const existing = await dbGetSolarCleaningById(id);
    if (!existing) return { success: false, error: 'ไม่พบเอกสารในระบบ' };

    const existingReportData = normalizeReportData(existing.reportData);
    const signCfg = resolveManagerSignConfig(existingReportData.managerSignMode);
    if (params.signatureUrl) {
      if (params.roleType === 'project_manager' && !signCfg.showProjectMgr) {
        return {
          success: false,
          error: 'เอกสารนี้ถูกเลือกให้เฉพาะ Service Manager เป็นผู้ลงนามรับรองเท่านั้น',
        };
      }
      if (params.roleType === 'service_manager' && !signCfg.showServiceMgr) {
        return {
          success: false,
          error: 'เอกสารนี้ถูกเลือกให้เฉพาะ Project Manager เป็นผู้ลงนามรับรองเท่านั้น',
        };
      }
    }

    const nextPmSign =
      params.roleType === 'project_manager' ? params.signatureUrl : existing.projectMgrSignUrl;
    const nextSmSign =
      params.roleType === 'service_manager' ? params.signatureUrl : existing.serviceMgrSignUrl;

    const nextComplete = areManagerSignaturesComplete({
      mode: existingReportData.managerSignMode,
      projectMgrSignUrl: nextPmSign,
      serviceMgrSignUrl: nextSmSign,
    });

    const nextStatus = deriveSolarCleaningStatus({
      requestedStatus:
        existing.status === 'Completed' && !nextComplete
          ? 'Pending Manager Sign'
          : existing.status,
      checkInCustomerSignUrl: existing.checkInCustomerSignUrl,
      checkOutCustomerSignUrl: existing.checkOutCustomerSignUrl,
      projectMgrSignUrl: nextPmSign,
      serviceMgrSignUrl: nextSmSign,
      reportData: existingReportData,
    });

    await dbUpdateSolarCleaningManagerSign(id, {
      status: nextStatus,
      roleType: params.roleType,
      signatureUrl: params.signatureUrl,
      signerId: params.signatureUrl ? user.id : null,
      signerName: params.signatureUrl ? user.fullName : null,
      signedAt: params.signatureUrl ? new Date() : null,
      updatedById: user.id,
    });

    revalidatePath('/projects/solar-cleaning');
    revalidatePath(`/projects/solar-cleaning/${id}`);
    return { success: true, status: nextStatus };
  } catch (err: unknown) {
    console.error('signSolarCleaningByManager error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'ไม่สามารถบันทึกลายเซ็นได้',
    };
  }
}

export async function deleteSolarCleaningInspection(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    if (!canEditSolarCleaningRole(user.role)) {
      return { success: false, error: 'ไม่มีสิทธิ์ลบเอกสาร' };
    }

    const existing = await dbGetSolarCleaningById(id);
    if (!existing) return { success: false, error: 'ไม่พบเอกสาร' };

    if (
      !canManageSolarCleaningRecord({
        userId: user.id,
        userRole: user.role,
        createdById: existing.createdById,
      })
    ) {
      return { success: false, error: 'คุณสามารถลบได้เฉพาะเอกสารที่สร้างเองเท่านั้น' };
    }

    await dbDeleteSolarCleaning(id);
    revalidatePath('/projects/solar-cleaning');
    return { success: true };
  } catch (err: unknown) {
    console.error('deleteSolarCleaningInspection error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'ลบเอกสารไม่สำเร็จ' };
  }
}
