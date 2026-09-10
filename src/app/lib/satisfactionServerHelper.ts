import prisma from '@/app/lib/db';
import {
  InstallationStatusInfo,
  evaluateInstallationStatusFromData
} from './satisfactionHelper';

export {
  getCycleDateRange,
  getCurrentCycle,
  isQuotationInCycle,
  evaluateInstallationStatusFromData,
  type InstallationStatusType,
  type InstallationStatusInfo
} from './satisfactionHelper';

export function getQuotationCycleWhere(startDate: Date, endDate: Date) {
  return {
    OR: [
      { billingDate: { gte: startDate, lte: endDate } },
      {
        AND: [
          { billingDate: null },
          { poDate: { gte: startDate, lte: endDate } }
        ]
      },
      {
        AND: [
          { billingDate: null },
          { poDate: null },
          { quotationDate: { gte: startDate, lte: endDate } }
        ]
      }
    ]
  };
}

/**
 * Batch resolve installation status for multiple companies or quotations
 */
export async function resolveInstallationStatusBatch(
  items: Array<{ companyId?: string; companyName?: string | null; quotationNumbers?: string[] }>
): Promise<Map<string, InstallationStatusInfo>> {
  const result = new Map<string, InstallationStatusInfo>();
  if (items.length === 0) return result;

  const quoteNumbers = Array.from(
    new Set(items.flatMap(it => it.quotationNumbers || []).filter(Boolean))
  );
  const companyNames = Array.from(
    new Set(items.map(it => it.companyName).filter(Boolean))
  ) as string[];

  // Fetch jobs
  const jobs = await prisma.job.findMany({
    where: {
      OR: [
        ...(quoteNumbers.length > 0 ? [{ quotationNumber: { in: quoteNumbers } }] : []),
        ...(companyNames.length > 0 ? [{ customerName: { in: companyNames } }] : [])
      ]
    },
    include: {
      installationOrders: true,
      project: true
    }
  });

  // Fetch direct installation orders
  const directOrders = await prisma.installationOrder.findMany({
    where: {
      OR: [
        ...(quoteNumbers.length > 0 ? [{ quotationNo: { in: quoteNumbers } }] : []),
        ...(companyNames.length > 0 ? [{ company: { in: companyNames } }] : [])
      ]
    }
  });

  for (const it of items) {
    const key = it.companyId || it.companyName || it.quotationNumbers?.[0] || '';
    if (!key) continue;

    const matchedJobs = jobs.filter(j =>
      (it.quotationNumbers && it.quotationNumbers.includes(j.quotationNumber || '')) ||
      (it.companyName && j.customerName === it.companyName)
    );

    const matchedDirectOrders = directOrders.filter(o =>
      (it.quotationNumbers && it.quotationNumbers.includes(o.quotationNo || '')) ||
      (it.companyName && o.company === it.companyName)
    );

    const allOrders = [...matchedDirectOrders];
    for (const j of matchedJobs) {
      if (j.installationOrders) {
        for (const io of j.installationOrders) {
          if (!allOrders.some(o => o.id === io.id)) {
            allOrders.push(io);
          }
        }
      }
    }

    const info = evaluateInstallationStatusFromData({
      installationOrders: allOrders,
      jobs: matchedJobs
    });

    result.set(key, info);
  }

  return result;
}
