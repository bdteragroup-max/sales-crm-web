'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/app/lib/db';
import { getUser } from '@/app/lib/dal';
import {
  canManageMarketingStock,
  canManageStockCategory,
  isMarketingManager,
} from '@/app/lib/roleHelper';
import { sendPushToUser } from '@/app/lib/pushNotification';
import {
  computeStockStatusKind,
  type SerializedStockCategory,
  type SerializedStockItem,
  type SerializedStockTransaction,
} from '@/app/lib/stockUtils';

function buildBatchCode(prefix: 'WD' | 'IN' | 'ADJ' | 'REV'): string {
  const bkkNow = new Date(Date.now() + 7 * 3600 * 1000);
  const yy = String(bkkNow.getUTCFullYear() + 543).slice(-2);
  const mm = String(bkkNow.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(bkkNow.getUTCDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}

function parseTxDate(dateStr?: string | null): Date {
  if (!dateStr) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return new Date(`${dateStr.trim()}T${hh}:${mi}:${ss}+07:00`);
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg) return msg;
  }
  return fallback;
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

type StockTxFindManyArgs = NonNullable<Parameters<typeof prisma.stockTransaction.findMany>[0]>;
type StockTxWhereInput = NonNullable<StockTxFindManyArgs['where']>;

interface RawStockTransactionRow {
  id: string;
  batchCode: string | null;
  itemId: string;
  txType: string;
  qtyChange: number;
  stockBefore: number;
  stockAfter: number;
  txDate: Date | string;
  requesterName: string | null;
  requesterUserId: string | null;
  branch: string | null;
  purpose: string | null;
  note: string | null;
  unitPrice: unknown;
  status: string;
  reversedTxId: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdByRole: string | null;
  cancelledByName: string | null;
  cancelledAt: Date | string | null;
  cancelReason: string | null;
  createdAt: Date | string;
  item?: {
    name?: string | null;
    sku?: string | null;
    unit?: string | null;
    categoryId?: string | null;
    category?: { name?: string | null } | null;
  } | null;
}

function serializeTransactionRow(tx: RawStockTransactionRow): SerializedStockTransaction {
  return {
    id: tx.id,
    batchCode: tx.batchCode ?? null,
    itemId: tx.itemId,
    itemName: tx.item?.name ?? '-',
    itemSku: tx.item?.sku ?? null,
    itemUnit: tx.item?.unit ?? 'ชิ้น',
    categoryId: tx.item?.categoryId ?? '',
    categoryName: tx.item?.category?.name ?? '-',
    txType: tx.txType,
    qtyChange: tx.qtyChange,
    stockBefore: tx.stockBefore,
    stockAfter: tx.stockAfter,
    txDate: tx.txDate instanceof Date ? tx.txDate.toISOString() : new Date(tx.txDate).toISOString(),
    requesterName: tx.requesterName ?? null,
    requesterUserId: tx.requesterUserId ?? null,
    branch: tx.branch ?? null,
    purpose: tx.purpose ?? null,
    note: tx.note ?? null,
    unitPrice: tx.unitPrice !== null && tx.unitPrice !== undefined ? Number(tx.unitPrice) : null,
    status: tx.status,
    reversedTxId: tx.reversedTxId ?? null,
    createdById: tx.createdById ?? null,
    createdByName: tx.createdByName ?? null,
    createdByRole: tx.createdByRole ?? null,
    cancelledByName: tx.cancelledByName ?? null,
    cancelledAt: tx.cancelledAt
      ? tx.cancelledAt instanceof Date
        ? tx.cancelledAt.toISOString()
        : new Date(tx.cancelledAt).toISOString()
      : null,
    cancelReason: tx.cancelReason ?? null,
    createdAt:
      tx.createdAt instanceof Date ? tx.createdAt.toISOString() : new Date(tx.createdAt).toISOString(),
  };
}

async function notifyMarketingTeamOnWithdraw(params: {
  actorId: string;
  actorName: string;
  requesterName: string;
  batchCode: string;
  updatedItems: Array<{ name: string; unit: string; qty: number; currentStock: number; minStock: number | null }>;
}) {
  try {
    const marketingUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { contains: 'marketing', mode: 'insensitive' } },
          { role: { contains: 'การตลาด', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (marketingUsers.length === 0) return;

    const itemSummary = params.updatedItems
      .slice(0, 3)
      .map((i) => `${i.name} x${i.qty} ${i.unit} (เหลือ ${i.currentStock})`)
      .join(', ');
    const moreText = params.updatedItems.length > 3 ? ` และอีก ${params.updatedItems.length - 3} รายการ` : '';

    const lowOrEmptyItems = params.updatedItems.filter(
      (i) => i.currentStock <= 0 || (i.minStock !== null && i.minStock > 0 && i.currentStock <= i.minStock)
    );
    const lowStockNote =
      lowOrEmptyItems.length > 0
        ? ` | แจ้งเตือนสต็อกใกล้หมด/หมด: ${lowOrEmptyItems.map((i) => `${i.name} (เหลือ ${i.currentStock})`).join(', ')}`
        : '';

    const title =
      lowOrEmptyItems.length > 0
        ? 'มีการเบิกของพรีเมี่ยม + สต็อกถึงจุดสั่งซื้อ'
        : 'มีการเบิกสต็อกของพรีเมี่ยม';
    const body = `[${params.batchCode}] ${params.requesterName} เบิก ${itemSummary}${moreText}${lowStockNote}`;

    await Promise.allSettled(
      marketingUsers
        .filter((u) => u.id !== params.actorId)
        .map((u) =>
          sendPushToUser(u.id, {
            title,
            body,
            url: '/stock',
            category: 'STOCK_WITHDRAW',
          })
        )
    );
  } catch (err) {
    console.error('[stock] notifyMarketingTeamOnWithdraw error:', err);
  }
}

export async function getStockDashboardData(categoryCode?: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false as const, error: 'Unauthorized' };

    const categoriesRaw = await prisma.stockCategory.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    const categories: SerializedStockCategory[] = categoriesRaw.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      ownerDepartment: c.ownerDepartment,
      isActive: c.isActive,
      displayOrder: c.displayOrder,
    }));

    const activeCategory =
      (categoryCode ? categories.find((c) => c.code === categoryCode) : undefined) ||
      categories[0] ||
      null;

    const categoryIdsFilter = activeCategory ? { categoryId: activeCategory.id } : {};

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bkkNow = new Date(Date.now() + 7 * 3600 * 1000);
    const monthStartBkk = new Date(
      `${bkkNow.getUTCFullYear()}-${String(bkkNow.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00+07:00`
    );

    const [itemsRaw, withdrawn30dRaw, monthWithdrawnRaw, monthRestockedRaw, recentTxRaw, totalTxCount, usersRaw] =
      await Promise.all([
        prisma.stockItem.findMany({
          where: categoryIdsFilter,
          include: {
            category: {
              select: { id: true, code: true, name: true },
            },
          },
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        }),
        prisma.stockTransaction.groupBy({
          by: ['itemId'],
          where: {
            txType: 'WITHDRAW',
            status: 'COMPLETED',
            txDate: { gte: thirtyDaysAgo },
            ...(activeCategory ? { item: { categoryId: activeCategory.id } } : {}),
          },
          _sum: { qtyChange: true },
        }),
        prisma.stockTransaction.aggregate({
          where: {
            txType: 'WITHDRAW',
            status: 'COMPLETED',
            txDate: { gte: monthStartBkk },
            ...(activeCategory ? { item: { categoryId: activeCategory.id } } : {}),
          },
          _sum: { qtyChange: true },
        }),
        prisma.stockTransaction.aggregate({
          where: {
            txType: 'RESTOCK',
            status: 'COMPLETED',
            txDate: { gte: monthStartBkk },
            ...(activeCategory ? { item: { categoryId: activeCategory.id } } : {}),
          },
          _sum: { qtyChange: true },
        }),
        prisma.stockTransaction.findMany({
          where: activeCategory ? { item: { categoryId: activeCategory.id } } : {},
          include: {
            item: {
              select: {
                name: true,
                sku: true,
                unit: true,
                categoryId: true,
                category: { select: { name: true } },
              },
            },
          },
          orderBy: [{ txDate: 'desc' }, { createdAt: 'desc' }],
          take: 50,
        }),
        prisma.stockTransaction.count({
          where: activeCategory ? { item: { categoryId: activeCategory.id } } : {},
        }),
        prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, fullName: true, role: true },
          orderBy: { fullName: 'asc' },
        }),
      ]);

    const withdrawn30dMap = new Map<string, number>();
    for (const g of withdrawn30dRaw) {
      withdrawn30dMap.set(g.itemId, Math.abs(g._sum.qtyChange ?? 0));
    }

    const items: SerializedStockItem[] = itemsRaw.map((item) => {
      const statusKind = computeStockStatusKind(item.currentStock, item.minStock, item.isActive);
      return {
        id: item.id,
        categoryId: item.categoryId,
        categoryCode: item.category.code,
        categoryName: item.category.name,
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        currentStock: item.currentStock,
        minStock: item.minStock,
        unitPrice: item.unitPrice !== null && item.unitPrice !== undefined ? Number(item.unitPrice) : null,
        prInfo: item.prInfo,
        note: item.note,
        imageUrl: item.imageUrl,
        excelColName: item.excelColName,
        displayOrder: item.displayOrder,
        isActive: item.isActive,
        updatedByName: item.updatedByName,
        updatedAt: item.updatedAt.toISOString(),
        withdrawn30d: withdrawn30dMap.get(item.id) ?? 0,
        statusKind,
      };
    });

    const activeItems = items.filter((i) => i.isActive);
    const summary = {
      totalItems: activeItems.length,
      totalUnits: activeItems.reduce((acc, i) => acc + i.currentStock, 0),
      lowStockCount: activeItems.filter((i) => i.statusKind === 'LOW_STOCK').length,
      outOfStockCount: activeItems.filter((i) => i.statusKind === 'OUT_OF_STOCK').length,
      withdrawnThisMonth: Math.abs(monthWithdrawnRaw._sum.qtyChange ?? 0),
      restockedThisMonth: Math.abs(monthRestockedRaw._sum.qtyChange ?? 0),
    };

    const canManageStock = canManageStockCategory(
      user.role,
      activeCategory?.ownerDepartment || 'MARKETING'
    );
    const canManageCategories = canManageMarketingStock(user.role);

    return {
      success: true as const,
      categories,
      activeCategoryCode: activeCategory?.code ?? null,
      items,
      recentTransactions: recentTxRaw.map(serializeTransactionRow),
      totalTransactionsCount: totalTxCount,
      summary,
      users: usersRaw,
      permissions: {
        canWithdraw: true,
        canManageStock,
        canManageCategories,
        isMarketingManager: isMarketingManager(user.role),
      },
      currentUser: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        branch: user.employeeSale?.branch ?? null,
      },
    };
  } catch (error: unknown) {
    console.error('[stock] getStockDashboardData error:', error);
    return {
      success: false as const,
      error: getErrorMessage(error, 'ไม่สามารถโหลดข้อมูลสต็อกได้'),
    };
  }
}

export async function getStockTransactions(filters: {
  categoryId?: string;
  itemId?: string;
  txType?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const user = await getUser();
    if (!user) return { success: false as const, error: 'Unauthorized', rows: [], totalCount: 0 };

    const page = Math.max(1, Number(filters.page || 1));
    const pageSize = Math.min(200, Math.max(10, Number(filters.pageSize || 50)));
    const skip = (page - 1) * pageSize;

    const where: StockTxWhereInput = {};

    if (filters.itemId && filters.itemId !== 'ALL') {
      where.itemId = filters.itemId;
    } else if (filters.categoryId && filters.categoryId !== 'ALL') {
      where.item = { categoryId: filters.categoryId };
    }

    if (filters.txType && filters.txType !== 'ALL') {
      where.txType = filters.txType;
    }

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (filters.dateFrom) {
        dateFilter.gte = new Date(`${filters.dateFrom}T00:00:00+07:00`);
      }
      if (filters.dateTo) {
        dateFilter.lte = new Date(`${filters.dateTo}T23:59:59.999+07:00`);
      }
      where.txDate = dateFilter;
    }

    const q = (filters.search || '').trim();
    if (q) {
      where.OR = [
        { requesterName: { contains: q, mode: 'insensitive' } },
        { purpose: { contains: q, mode: 'insensitive' } },
        { note: { contains: q, mode: 'insensitive' } },
        { batchCode: { contains: q, mode: 'insensitive' } },
        { branch: { contains: q, mode: 'insensitive' } },
        { createdByName: { contains: q, mode: 'insensitive' } },
        { item: { name: { contains: q, mode: 'insensitive' } } },
        { item: { sku: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [rows, totalCount] = await Promise.all([
      prisma.stockTransaction.findMany({
        where,
        include: {
          item: {
            select: {
              name: true,
              sku: true,
              unit: true,
              categoryId: true,
              category: { select: { name: true } },
            },
          },
        },
        orderBy: [{ txDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.stockTransaction.count({ where }),
    ]);

    return {
      success: true as const,
      rows: rows.map(serializeTransactionRow),
      totalCount,
      page,
      pageSize,
    };
  } catch (error: unknown) {
    console.error('[stock] getStockTransactions error:', error);
    return {
      success: false as const,
      error: getErrorMessage(error, 'ไม่สามารถโหลดประวัติความเคลื่อนไหวสต็อกได้'),
      rows: [],
      totalCount: 0,
    };
  }
}

export async function withdrawStockItems(input: {
  requesterName?: string;
  requesterUserId?: string;
  branch?: string;
  purpose?: string;
  note?: string;
  txDate?: string;
  items: Array<{ itemId: string; quantity: number }>;
}) {
  try {
    const user = await getUser();
    if (!user) return { success: false as const, error: 'Unauthorized' };

    if (!Array.isArray(input.items) || input.items.length === 0) {
      return { success: false as const, error: 'กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ' };
    }

    // Aggregate duplicate item rows into single atomic deductions per itemId
    const mergedMap = new Map<string, number>();
    for (const line of input.items) {
      const qty = Math.floor(Number(line.quantity));
      if (!line.itemId || !Number.isFinite(qty) || qty <= 0) {
        return { success: false as const, error: 'จำนวนที่เบิกต้องเป็นจำนวนเต็มมากกว่า 0' };
      }
      mergedMap.set(line.itemId, (mergedMap.get(line.itemId) || 0) + qty);
    }

    const requesterName = (input.requesterName || '').trim() || user.fullName;
    const txDate = parseTxDate(input.txDate);
    const batchCode = buildBatchCode('WD');
    const purpose = (input.purpose || '').trim() || null;
    const branch = (input.branch || '').trim() || user.employeeSale?.branch || null;
    const note = (input.note || '').trim() || null;

    const updatedSummary: Array<{
      id: string;
      name: string;
      unit: string;
      qty: number;
      currentStock: number;
      minStock: number | null;
    }> = [];

    await prisma.$transaction(async (tx) => {
      // Stable lock ordering by itemId prevents deadlocks when withdrawing multiple items concurrently
      const entries = Array.from(mergedMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

      for (const [itemId, qty] of entries) {
        const updatedRows = await tx.$queryRaw<
          Array<{
            id: string;
            name: string;
            unit: string;
            current_stock: number;
            min_stock: number | null;
          }>
        >`
          UPDATE "stock_items"
          SET "current_stock" = "current_stock" - ${qty},
              "updated_by_id" = ${user.id},
              "updated_by_name" = ${user.fullName},
              "updated_at" = NOW()
          WHERE "id" = ${itemId}
            AND "is_active" = true
            AND "current_stock" >= ${qty}
          RETURNING "id", "name", "unit", "current_stock", "min_stock"
        `;

        if (updatedRows.length === 0) {
          const itemCheck = await tx.stockItem.findUnique({
            where: { id: itemId },
            select: { name: true, unit: true, currentStock: true, isActive: true },
          });
          if (!itemCheck) {
            throw new Error('ไม่พบข้อมูลสินค้าในระบบ');
          }
          if (!itemCheck.isActive) {
            throw new Error(`สินค้า "${itemCheck.name}" ถูกปิดใช้งานหรือยกเลิกชั่วคราว ไม่สามารถเบิกได้`);
          }
          throw new Error(
            `สต็อก "${itemCheck.name}" ไม่เพียงพอ (คงเหลือ ${itemCheck.currentStock} ${itemCheck.unit} แต่ต้องการเบิก ${qty} ${itemCheck.unit})`
          );
        }

        const updated = updatedRows[0];
        const stockAfter = Number(updated.current_stock);
        const stockBefore = stockAfter + qty;

        await tx.stockTransaction.create({
          data: {
            batchCode,
            itemId,
            txType: 'WITHDRAW',
            qtyChange: -qty,
            stockBefore,
            stockAfter,
            txDate,
            requesterName,
            requesterUserId: input.requesterUserId || user.id,
            branch,
            purpose,
            note,
            status: 'COMPLETED',
            createdById: user.id,
            createdByName: user.fullName,
            createdByRole: user.role,
          },
        });

        updatedSummary.push({
          id: updated.id,
          name: updated.name,
          unit: updated.unit,
          qty,
          currentStock: stockAfter,
          minStock: updated.min_stock,
        });
      }
    });

    // Notify Marketing outside DB transaction
    await notifyMarketingTeamOnWithdraw({
      actorId: user.id,
      actorName: user.fullName,
      requesterName,
      batchCode,
      updatedItems: updatedSummary,
    });

    revalidatePath('/stock');
    return {
      success: true as const,
      batchCode,
      updatedItems: updatedSummary,
    };
  } catch (error: unknown) {
    console.error('[stock] withdrawStockItems error:', error);
    return {
      success: false as const,
      error: getErrorMessage(error, 'ไม่สามารถบันทึกรายการเบิกสต็อกได้'),
    };
  }
}

export async function restockStockItems(input: {
  txType?: 'RESTOCK' | 'RETURN';
  supplierOrSource?: string;
  note?: string;
  txDate?: string;
  items: Array<{ itemId: string; quantity: number; unitPrice?: number | null }>;
}) {
  try {
    const user = await getUser();
    if (!user) return { success: false as const, error: 'Unauthorized' };

    if (!canManageMarketingStock(user.role)) {
      return {
        success: false as const,
        error: 'เฉพาะฝ่ายการตลาดและผู้จัดการฝ่ายการตลาดเท่านั้นที่สามารถเติมสต็อกสินค้าได้',
      };
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      return { success: false as const, error: 'กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ' };
    }

    const mergedMap = new Map<string, { quantity: number; unitPrice?: number | null }>();
    for (const line of input.items) {
      const qty = Math.floor(Number(line.quantity));
      if (!line.itemId || !Number.isFinite(qty) || qty <= 0) {
        return { success: false as const, error: 'จำนวนที่เติมเข้าต้องเป็นจำนวนเต็มมากกว่า 0' };
      }
      const prev = mergedMap.get(line.itemId);
      mergedMap.set(line.itemId, {
        quantity: (prev?.quantity || 0) + qty,
        unitPrice: line.unitPrice !== undefined ? line.unitPrice : prev?.unitPrice,
      });
    }

    const txType = input.txType === 'RETURN' ? 'RETURN' : 'RESTOCK';
    const txDate = parseTxDate(input.txDate);
    const batchCode = buildBatchCode('IN');
    const sourceLabel = (input.supplierOrSource || '').trim() || 'ฝ่ายการตลาด';
    const note = (input.note || '').trim() || null;

    await prisma.$transaction(async (tx) => {
      const entries = Array.from(mergedMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

      for (const [itemId, line] of entries) {
        const existingItem = await tx.stockItem.findUnique({
          where: { id: itemId },
          include: { category: { select: { ownerDepartment: true } } },
        });
        if (!existingItem) {
          throw new Error('ไม่พบข้อมูลสินค้าในระบบ');
        }
        if (!canManageStockCategory(user.role, existingItem.category.ownerDepartment)) {
          throw new Error(`คุณไม่มีสิทธิ์เติมสต็อกในหมวดหมู่ของ "${existingItem.name}"`);
        }

        const parsedPrice =
          line.unitPrice !== null && line.unitPrice !== undefined && !isNaN(Number(line.unitPrice))
            ? Number(line.unitPrice)
            : null;

        const updatedRows = await tx.$queryRaw<
          Array<{ id: string; current_stock: number }>
        >`
          UPDATE "stock_items"
          SET "current_stock" = "current_stock" + ${line.quantity},
              "unit_price" = COALESCE(${parsedPrice}::decimal, "unit_price"),
              "updated_by_id" = ${user.id},
              "updated_by_name" = ${user.fullName},
              "updated_at" = NOW()
          WHERE "id" = ${itemId}
          RETURNING "id", "current_stock"
        `;

        const stockAfter = Number(updatedRows[0].current_stock);
        const stockBefore = stockAfter - line.quantity;

        await tx.stockTransaction.create({
          data: {
            batchCode,
            itemId,
            txType,
            qtyChange: line.quantity,
            stockBefore,
            stockAfter,
            txDate,
            requesterName: sourceLabel,
            purpose: txType === 'RETURN' ? 'รับคืนสินค้าเข้าคลัง' : 'สั่งซื้อ / เติมสต็อกสินค้า',
            note,
            unitPrice: parsedPrice,
            status: 'COMPLETED',
            createdById: user.id,
            createdByName: user.fullName,
            createdByRole: user.role,
          },
        });
      }
    });

    revalidatePath('/stock');
    return { success: true as const, batchCode };
  } catch (error: unknown) {
    console.error('[stock] restockStockItems error:', error);
    return {
      success: false as const,
      error: getErrorMessage(error, 'ไม่สามารถบันทึกการเติมสต็อกได้'),
    };
  }
}

export async function adjustStockItem(input: {
  itemId: string;
  newStockQty: number;
  reason: string;
}) {
  try {
    const user = await getUser();
    if (!user) return { success: false as const, error: 'Unauthorized' };

    if (!canManageMarketingStock(user.role)) {
      return { success: false as const, error: 'เฉพาะฝ่ายการตลาดและผู้จัดการฝ่ายการตลาดเท่านั้นที่สามารถปรับยอดสต็อกได้' };
    }

    const targetQty = Math.floor(Number(input.newStockQty));
    if (!Number.isFinite(targetQty) || targetQty < 0) {
      return { success: false as const, error: 'จำนวนสต็อกที่ปรับปรุงต้องไม่ติดลบ' };
    }
    const reason = (input.reason || '').trim();
    if (!reason) {
      return { success: false as const, error: 'กรุณาระบุเหตุผลในการปรับยอดสต็อก' };
    }

    const batchCode = buildBatchCode('ADJ');

    await prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<
        Array<{ id: string; current_stock: number; owner_department: string }>
      >`
        SELECT si."id", si."current_stock", sc."owner_department"
        FROM "stock_items" si
        JOIN "stock_categories" sc ON sc."id" = si."category_id"
        WHERE si."id" = ${input.itemId}
        FOR UPDATE OF si
      `;

      if (lockedRows.length === 0) throw new Error('ไม่พบสินค้าในระบบ');
      const row = lockedRows[0];
      if (!canManageStockCategory(user.role, row.owner_department)) {
        throw new Error('ไม่มีสิทธิ์ปรับยอดสต็อกในหมวดหมู่นี้');
      }

      const stockBefore = Number(row.current_stock);
      const qtyChange = targetQty - stockBefore;
      if (qtyChange === 0) {
        throw new Error('ยอดสต็อกใหม่เท่ากับยอดปัจจุบันอยู่แล้ว');
      }

      await tx.stockItem.update({
        where: { id: input.itemId },
        data: {
          currentStock: targetQty,
          updatedById: user.id,
          updatedByName: user.fullName,
        },
      });

      await tx.stockTransaction.create({
        data: {
          batchCode,
          itemId: input.itemId,
          txType: 'ADJUST',
          qtyChange,
          stockBefore,
          stockAfter: targetQty,
          txDate: new Date(),
          requesterName: user.fullName,
          purpose: 'ตรวจนับ / ปรับปรุงยอดสต็อก',
          note: reason,
          status: 'COMPLETED',
          createdById: user.id,
          createdByName: user.fullName,
          createdByRole: user.role,
        },
      });
    });

    revalidatePath('/stock');
    return { success: true as const, batchCode };
  } catch (error: unknown) {
    console.error('[stock] adjustStockItem error:', error);
    return {
      success: false as const,
      error: getErrorMessage(error, 'ไม่สามารถปรับยอดสต็อกได้'),
    };
  }
}

export async function cancelWithdrawTransaction(input: {
  transactionId: string;
  reason: string;
}) {
  try {
    const user = await getUser();
    if (!user) return { success: false as const, error: 'Unauthorized' };

    if (!canManageMarketingStock(user.role)) {
      return {
        success: false as const,
        error: 'เฉพาะฝ่ายการตลาดและผู้จัดการฝ่ายการตลาดเท่านั้นที่สามารถยกเลิกและคืนยอดสต็อกได้',
      };
    }

    const reason = (input.reason || '').trim();
    if (!reason) {
      return { success: false as const, error: 'กรุณาระบุเหตุผลการยกเลิก / คืนยอด' };
    }

    const batchCode = buildBatchCode('REV');

    await prisma.$transaction(async (tx) => {
      const targetTx = await tx.stockTransaction.findUnique({
        where: { id: input.transactionId },
        include: {
          item: {
            include: { category: { select: { ownerDepartment: true } } },
          },
        },
      });

      if (!targetTx) throw new Error('ไม่พบรายการเคลื่อนไหวนี้');
      if (!canManageStockCategory(user.role, targetTx.item.category.ownerDepartment)) {
        throw new Error('ไม่มีสิทธิ์จัดการรายการในหมวดหมู่นี้');
      }
      if (targetTx.txType !== 'WITHDRAW') {
        throw new Error('สามารถยกเลิกคืนยอดได้เฉพาะรายการเบิกสินค้าเท่านั้น');
      }

      // Atomic conditional update prevents concurrent double-refund
      const marked = await tx.stockTransaction.updateMany({
        where: {
          id: input.transactionId,
          txType: 'WITHDRAW',
          status: 'COMPLETED',
        },
        data: {
          status: 'CANCELLED',
          cancelledById: user.id,
          cancelledByName: user.fullName,
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });

      if (marked.count === 0) {
        throw new Error('รายการนี้ถูกยกเลิกไปแล้ว');
      }

      const refundQty = Math.abs(targetTx.qtyChange);
      const updatedItems = await tx.$queryRaw<Array<{ current_stock: number }>>`
        UPDATE "stock_items"
        SET "current_stock" = "current_stock" + ${refundQty},
            "updated_by_id" = ${user.id},
            "updated_by_name" = ${user.fullName},
            "updated_at" = NOW()
        WHERE "id" = ${targetTx.itemId}
        RETURNING "current_stock"
      `;

      const stockAfter = Number(updatedItems[0].current_stock);
      const stockBefore = stockAfter - refundQty;

      await tx.stockTransaction.create({
        data: {
          batchCode,
          itemId: targetTx.itemId,
          txType: 'CANCEL_RETURN',
          qtyChange: refundQty,
          stockBefore,
          stockAfter,
          txDate: new Date(),
          requesterName: targetTx.requesterName || user.fullName,
          branch: targetTx.branch,
          purpose: `ยกเลิกใบเบิก (${targetTx.batchCode || targetTx.id.slice(-6)})`,
          note: reason,
          status: 'COMPLETED',
          reversedTxId: targetTx.id,
          createdById: user.id,
          createdByName: user.fullName,
          createdByRole: user.role,
        },
      });
    });

    revalidatePath('/stock');
    return { success: true as const, batchCode };
  } catch (error: unknown) {
    console.error('[stock] cancelWithdrawTransaction error:', error);
    return {
      success: false as const,
      error: getErrorMessage(error, 'ไม่สามารถยกเลิกรายการเบิกได้'),
    };
  }
}

export async function createStockItem(input: {
  categoryId: string;
  sku?: string | null;
  name: string;
  unit?: string;
  initialStock?: number;
  minStock?: number | null;
  unitPrice?: number | null;
  prInfo?: string | null;
  note?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
}) {
  try {
    const user = await getUser();
    if (!user) return { success: false as const, error: 'Unauthorized' };

    const category = await prisma.stockCategory.findUnique({ where: { id: input.categoryId } });
    if (!category) return { success: false as const, error: 'ไม่พบหมวดหมู่สินค้า' };

    if (!canManageStockCategory(user.role, category.ownerDepartment)) {
      return {
        success: false as const,
        error: 'เฉพาะฝ่ายการตลาดและผู้จัดการฝ่ายการตลาดเท่านั้นที่สามารถเพิ่มสินค้าได้',
      };
    }

    const name = (input.name || '').trim();
    if (!name) return { success: false as const, error: 'กรุณาระบุชื่อสินค้า' };

    const initialStock = Math.max(0, Math.floor(Number(input.initialStock || 0)));
    const sku = input.sku?.trim() || null;

    const item = await prisma.$transaction(async (tx) => {
      const maxOrder = await tx.stockItem.aggregate({
        where: { categoryId: input.categoryId },
        _max: { displayOrder: true },
      });

      const created = await tx.stockItem.create({
        data: {
          categoryId: input.categoryId,
          sku,
          name,
          unit: (input.unit || 'ชิ้น').trim() || 'ชิ้น',
          currentStock: initialStock,
          minStock:
            input.minStock !== null && input.minStock !== undefined && !isNaN(Number(input.minStock))
              ? Math.max(0, Math.floor(Number(input.minStock)))
              : null,
          unitPrice:
            input.unitPrice !== null && input.unitPrice !== undefined && !isNaN(Number(input.unitPrice))
              ? Number(input.unitPrice)
              : null,
          prInfo: input.prInfo?.trim() || null,
          note: input.note?.trim() || null,
          imageUrl: input.imageUrl?.trim() || null,
          displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
          isActive: input.isActive !== undefined ? input.isActive : true,
          createdById: user.id,
          createdByName: user.fullName,
          updatedById: user.id,
          updatedByName: user.fullName,
        },
      });

      if (initialStock > 0) {
        await tx.stockTransaction.create({
          data: {
            batchCode: buildBatchCode('IN'),
            itemId: created.id,
            txType: 'OPENING',
            qtyChange: initialStock,
            stockBefore: 0,
            stockAfter: initialStock,
            txDate: new Date(),
            requesterName: user.fullName,
            purpose: 'เพิ่มรายการสินค้าใหม่พร้อมยอดยกมาตั้งต้น',
            note: input.note?.trim() || null,
            unitPrice: created.unitPrice,
            status: 'COMPLETED',
            createdById: user.id,
            createdByName: user.fullName,
            createdByRole: user.role,
          },
        });
      }

      return created;
    });

    revalidatePath('/stock');
    return { success: true as const, itemId: item.id };
  } catch (error: unknown) {
    console.error('[stock] createStockItem error:', error);
    if (getErrorCode(error) === 'P2002') {
      return { success: false as const, error: 'รหัส SKU นี้มีอยู่แล้วในระบบ กรุณาใช้รหัสอื่น' };
    }
    return {
      success: false as const,
      error: getErrorMessage(error, 'ไม่สามารถเพิ่มรายการสินค้าได้'),
    };
  }
}

export async function updateStockItem(
  itemId: string,
  input: {
    sku?: string | null;
    name: string;
    unit?: string;
    minStock?: number | null;
    unitPrice?: number | null;
    prInfo?: string | null;
    note?: string | null;
    imageUrl?: string | null;
    isActive?: boolean;
  }
) {
  try {
    const user = await getUser();
    if (!user) return { success: false as const, error: 'Unauthorized' };

    const existing = await prisma.stockItem.findUnique({
      where: { id: itemId },
      include: { category: { select: { ownerDepartment: true } } },
    });
    if (!existing) return { success: false as const, error: 'ไม่พบสินค้าในระบบ' };

    if (!canManageStockCategory(user.role, existing.category.ownerDepartment)) {
      return {
        success: false as const,
        error: 'เฉพาะฝ่ายการตลาดและผู้จัดการฝ่ายการตลาดเท่านั้นที่สามารถแก้ไขข้อมูลสินค้าได้',
      };
    }

    const name = (input.name || '').trim();
    if (!name) return { success: false as const, error: 'กรุณาระบุชื่อสินค้า' };

    await prisma.stockItem.update({
      where: { id: itemId },
      data: {
        sku: input.sku?.trim() || null,
        name,
        unit: (input.unit || existing.unit || 'ชิ้น').trim(),
        minStock:
          input.minStock !== null && input.minStock !== undefined && !isNaN(Number(input.minStock))
            ? Math.max(0, Math.floor(Number(input.minStock)))
            : null,
        unitPrice:
          input.unitPrice !== null && input.unitPrice !== undefined && !isNaN(Number(input.unitPrice))
            ? Number(input.unitPrice)
            : null,
        prInfo: input.prInfo?.trim() || null,
        note: input.note?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
        updatedById: user.id,
        updatedByName: user.fullName,
      },
    });

    revalidatePath('/stock');
    return { success: true as const };
  } catch (error: unknown) {
    console.error('[stock] updateStockItem error:', error);
    if (getErrorCode(error) === 'P2002') {
      return { success: false as const, error: 'รหัส SKU นี้ซ้ำกับสินค้าอื่นในระบบ' };
    }
    return {
      success: false as const,
      error: getErrorMessage(error, 'ไม่สามารถแก้ไขข้อมูลสินค้าได้'),
    };
  }
}

export async function createStockCategory(input: {
  code: string;
  name: string;
  description?: string;
  ownerDepartment?: 'MARKETING' | 'STORE' | 'ALL';
}) {
  try {
    const user = await getUser();
    if (!user) return { success: false as const, error: 'Unauthorized' };

    if (!canManageMarketingStock(user.role)) {
      return { success: false as const, error: 'คุณไม่มีสิทธิ์สร้างหมวดหมู่สต็อกใหม่' };
    }

    const name = (input.name || '').trim();
    const code = (input.code || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]+/g, '_');

    if (!name || !code) {
      return { success: false as const, error: 'กรุณาระบุชื่อหมวดหมู่และรหัสหมวดหมู่ (ภาษาอังกฤษ)' };
    }

    const maxOrder = await prisma.stockCategory.aggregate({ _max: { displayOrder: true } });

    const created = await prisma.stockCategory.create({
      data: {
        code,
        name,
        description: input.description?.trim() || null,
        ownerDepartment: input.ownerDepartment || 'MARKETING',
        displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
        isActive: true,
      },
    });

    revalidatePath('/stock');
    return { success: true as const, category: created };
  } catch (error: unknown) {
    console.error('[stock] createStockCategory error:', error);
    if (getErrorCode(error) === 'P2002') {
      return { success: false as const, error: 'รหัสหมวดหมู่นี้มีอยู่แล้ว' };
    }
    return {
      success: false as const,
      error: getErrorMessage(error, 'ไม่สามารถสร้างหมวดหมู่ได้'),
    };
  }
}
