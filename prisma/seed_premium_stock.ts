import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client';
import * as XLSX from 'xlsx';

function loadDbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(process.cwd(), '.env');
  const envFile = fs.readFileSync(envPath, 'utf-8');
  const match = envFile.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (!match) throw new Error('DATABASE_URL not found in environment or .env');
  return match[1];
}

function parseExcelBkkDate(raw: unknown, rowNumber: number): Date {
  // Known malformed date typo in rows 321-322 ("+092026-04-29" between 2026-04-27 and 2026-05-03)
  if (rowNumber === 321 || rowNumber === 322) {
    return new Date('2026-04-30T12:00:00+07:00');
  }
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const year = raw.getUTCFullYear();
    if (year >= 2020 && year <= 2035) {
      // Excel stores Bangkok midnight as ~17:00 UTC of previous day; add 12h to land firmly inside the BKK calendar day
      const adjusted = new Date(raw.getTime() + 12 * 3600 * 1000);
      const y = adjusted.getUTCFullYear();
      const m = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
      const d = String(adjusted.getUTCDate()).padStart(2, '0');
      return new Date(`${y}-${m}-${d}T12:00:00+07:00`);
    }
  }
  // Opening balance / blank dates default to earliest sheet baseline
  return new Date('2024-02-01T09:00:00+07:00');
}

interface SummarySpec {
  sku: string;
  name: string;
  unit: string;
  excelColIdx: number | null; // 2..15 correspond to C..P
  summaryStock: number;
  unitPrice: number | null;
  minStock: number | null;
  prInfo: string | null;
  note: string | null;
  displayOrder: number;
}

// Exact 17 rows from Summary Table (S2..S18) of TERA - สินค้าพรีเมี่ยม.xlsx without merging
const SUMMARY_ITEMS: SummarySpec[] = [
  {
    sku: 'MKT-PRM-001',
    name: 'กระเป๋าผ้าสปันบอนด์',
    unit: 'ใบ',
    excelColIdx: 7, // Col H
    summaryStock: 1133,
    unitPrice: 8.5,
    minStock: 100,
    prInfo: null,
    note: 'แพคละ200',
    displayOrder: 1,
  },
  {
    sku: 'MKT-PRM-002',
    name: 'เสื้อเทอราแขนสั้นสีม่วง ผ้ากีฬา',
    unit: 'ตัว',
    excelColIdx: 12, // Col M
    summaryStock: 40,
    unitPrice: 69,
    minStock: 50,
    prInfo: 'ไม่มีขั้นต่ำ',
    note: 'กระสอบ',
    displayOrder: 2,
  },
  {
    sku: 'MKT-PRM-003',
    name: 'เสื้อเทอราแขนสั้นสีแดง ผ้ากีฬา',
    unit: 'ตัว',
    excelColIdx: 13, // Col N
    summaryStock: 75,
    unitPrice: 69,
    minStock: 50,
    prInfo: 'ไม่มีขั้นต่ำ',
    note: null,
    displayOrder: 3,
  },
  {
    sku: 'MKT-PRM-004',
    name: 'แก้วน้ำเก็บความเย็น new',
    unit: 'ใบ',
    excelColIdx: 8, // Col I
    summaryStock: 59,
    unitPrice: null,
    minStock: 100,
    prInfo: null,
    note: 'รอจัดหาใหม่',
    displayOrder: 4,
  },
  {
    sku: 'MKT-PRM-005',
    name: 'ร่มกอล์ฟ',
    unit: 'คัน',
    excelColIdx: 3, // Col D ('ร่มกลอฟ')
    summaryStock: 228,
    unitPrice: 250,
    minStock: 50,
    prInfo: '100',
    note: 'แพคละ20',
    displayOrder: 5,
  },
  {
    sku: 'MKT-PRM-006',
    name: 'หมวก',
    unit: 'ใบ',
    excelColIdx: null, // Shares SUM(O:O) in Excel; Col O ledger is assigned to หมวกแก็ปสีแดง, so this gets opening summary balance
    summaryStock: 388,
    unitPrice: 169,
    minStock: 50,
    prInfo: 'ขั้นต่ำ 100 (ราคา 190) /300 (ราคา 169)',
    note: null,
    displayOrder: 6,
  },
  {
    sku: 'MKT-PRM-007',
    name: 'ร่ม',
    unit: 'คัน',
    excelColIdx: 2, // Col C (historical sum = 54, summary table explicitly sets 0)
    summaryStock: 0,
    unitPrice: 250,
    minStock: 100,
    prInfo: null,
    note: 'แพคละ20',
    displayOrder: 7,
  },
  {
    sku: 'MKT-PRM-008',
    name: 'สมุดโน้ต',
    unit: 'เล่ม',
    excelColIdx: 4, // Col E
    summaryStock: 49,
    unitPrice: 28,
    minStock: null,
    prInfo: null,
    note: 'งดผลิต 01/04/2569',
    displayOrder: 8,
  },
  {
    sku: 'MKT-PRM-009',
    name: 'ปากกา',
    unit: 'ด้าม',
    excelColIdx: 5, // Col F
    summaryStock: 1629,
    unitPrice: 9,
    minStock: 300,
    prInfo: '1000',
    note: null,
    displayOrder: 9,
  },
  {
    sku: 'MKT-PRM-010',
    name: 'ปากกาสเตนเลส',
    unit: 'ด้าม',
    excelColIdx: 6, // Col G
    summaryStock: 27,
    unitPrice: 33,
    minStock: null,
    prInfo: null,
    note: null,
    displayOrder: 10,
  },
  {
    sku: 'MKT-PRM-011',
    name: 'แก้วกระเบื้อง TERA',
    unit: 'ใบ',
    excelColIdx: 9, // Col J
    summaryStock: 0,
    unitPrice: null,
    minStock: null,
    prInfo: null,
    note: null,
    displayOrder: 11,
  },
  {
    sku: 'MKT-PRM-012',
    name: 'แก้วเก็บความเย็น',
    unit: 'ใบ',
    excelColIdx: 10, // Col K
    summaryStock: 0,
    unitPrice: null,
    minStock: null,
    prInfo: null,
    note: null,
    displayOrder: 12,
  },
  {
    sku: 'MKT-PRM-013',
    name: 'เสื้อช่าง',
    unit: 'ตัว',
    excelColIdx: 11, // Col L
    summaryStock: 41,
    unitPrice: null,
    minStock: null,
    prInfo: null,
    note: null,
    displayOrder: 13,
  },
  {
    sku: 'MKT-PRM-014',
    name: 'ปฏิทิน',
    unit: 'เล่ม',
    excelColIdx: 15, // Col P
    summaryStock: 0,
    unitPrice: 50,
    minStock: null,
    prInfo: null,
    note: null,
    displayOrder: 14,
  },
  {
    sku: 'MKT-PRM-015',
    name: 'Boxet',
    unit: 'ชุด',
    excelColIdx: null,
    summaryStock: 0,
    unitPrice: null,
    minStock: null,
    prInfo: '100',
    note: null,
    displayOrder: 15,
  },
  {
    sku: 'MKT-PRM-016',
    name: 'ที่เปิดขวด + ปั๊มกุญแจ',
    unit: 'ชิ้น',
    excelColIdx: null,
    summaryStock: 0,
    unitPrice: null,
    minStock: null,
    prInfo: null,
    note: null,
    displayOrder: 16,
  },
  {
    sku: 'MKT-PRM-017',
    name: 'หมวกแก็ปสีแดง',
    unit: 'ใบ',
    excelColIdx: 14, // Col O
    summaryStock: 388,
    unitPrice: 125,
    minStock: null,
    prInfo: null,
    note: 'แพคละ150//รอมาครั้งสุดท้ายอีก400ใบ//2พฤศจิกายน',
    displayOrder: 17,
  },
];

async function main() {
  const pool = new Pool({ connectionString: loadDbUrl() });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const excelPath = path.join(process.cwd(), 'TERA - สินค้าพรีเมี่ยม.xlsx');
    if (!fs.existsSync(excelPath)) {
      throw new Error(`Excel file not found: ${excelPath}`);
    }

    const wb = XLSX.readFile(excelPath, { cellDates: true });
    const ws = wb.Sheets['รายการสินค้า'];
    const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(ws, {
      header: 1,
      defval: null,
      raw: true,
    });
    const headers = rows[0] || [];

    // 1. Upsert Marketing Premium Category
    const category = await prisma.stockCategory.upsert({
      where: { code: 'MARKETING_PREMIUM' },
      update: {
        name: 'ของพรีเมี่ยมทางการตลาด',
        ownerDepartment: 'MARKETING',
        isActive: true,
        displayOrder: 1,
      },
      create: {
        code: 'MARKETING_PREMIUM',
        name: 'ของพรีเมี่ยมทางการตลาด',
        description:
          'สต็อกของพรีเมี่ยม ของแจกลูกค้า สื่อออกบูธ และอุปกรณ์ส่งเสริมการขายของฝ่ายการตลาด',
        ownerDepartment: 'MARKETING',
        isActive: true,
        displayOrder: 1,
      },
    });

    // 2. Upsert all 17 summary items cleanly (without touching currentStock if already manually adjusted after initial seed, OR set if fresh)
    const skuToItem = new Map<string, { id: string; spec: SummarySpec }>();
    for (const spec of SUMMARY_ITEMS) {
      const existing = await prisma.stockItem.findUnique({ where: { sku: spec.sku } });
      const excelColName =
        spec.excelColIdx !== null
          ? String(headers[spec.excelColIdx] || '').replace(/\s+/g, ' ').trim()
          : null;

      if (existing) {
        await prisma.stockItem.update({
          where: { id: existing.id },
          data: {
            categoryId: category.id,
            name: spec.name,
            unit: spec.unit,
            minStock: spec.minStock,
            unitPrice: spec.unitPrice,
            prInfo: spec.prInfo,
            note: spec.note,
            excelColName,
            displayOrder: spec.displayOrder,
          },
        });
        skuToItem.set(spec.sku, { id: existing.id, spec });
      } else {
        const created = await prisma.stockItem.create({
          data: {
            categoryId: category.id,
            sku: spec.sku,
            name: spec.name,
            unit: spec.unit,
            currentStock: spec.summaryStock,
            minStock: spec.minStock,
            unitPrice: spec.unitPrice,
            prInfo: spec.prInfo,
            note: spec.note,
            excelColName,
            displayOrder: spec.displayOrder,
            isActive: true,
            createdByName: 'นำเข้าจาก Excel ตั้งต้น',
          },
        });
        skuToItem.set(spec.sku, { id: created.id, spec });
      }
    }

    // 3. Parse Excel ledger rows sequentially per mapped column
    const colToEntry = new Map<number, { id: string; spec: SummarySpec }>();
    for (const entry of skuToItem.values()) {
      if (entry.spec.excelColIdx !== null) {
        colToEntry.set(entry.spec.excelColIdx, entry);
      }
    }

    const runningBalance = new Map<string, number>();
    const txPayload: Array<{
      batchCode: string;
      itemId: string;
      txType: string;
      qtyChange: number;
      stockBefore: number;
      stockAfter: number;
      txDate: Date;
      requesterName: string | null;
      note: string | null;
      status: string;
      createdByName: string;
      sourceRef: string;
    }> = [];

    for (let rIdx = 1; rIdx < rows.length; rIdx++) {
      const r = rows[rIdx];
      if (!r || !r.slice(0, 17).some((v) => v !== null && v !== '')) continue;

      const excelRowNum = rIdx + 1;
      const detail = String(r[1] || '').trim();
      const requester = r[16] ? String(r[16]).replace(/\s+/g, ' ').trim() : null;
      const txDate = parseExcelBkkDate(r[0], excelRowNum);
      const batchCode = `XLS-R${String(excelRowNum).padStart(4, '0')}`;

      for (const [colIdx, entry] of colToEntry.entries()) {
        const rawVal = r[colIdx];
        if (typeof rawVal !== 'number' || isNaN(rawVal) || rawVal === 0) continue;

        const qtyChange = Math.round(rawVal);
        const prev = runningBalance.get(entry.id) ?? 0;
        const next = prev + qtyChange;
        runningBalance.set(entry.id, next);

        let txType = 'ADJUST';
        let note: string | null = `นำเข้าจาก Excel (แถว ${excelRowNum})`;

        if (detail === 'ยอดยกมา') {
          txType = 'OPENING';
          note = 'ยอดยกมาจากไฟล์ TERA - สินค้าพรีเมี่ยม.xlsx';
        } else if (detail === 'สั่งซื้อ') {
          txType = qtyChange >= 0 ? 'RESTOCK' : 'ADJUST';
        } else if (detail === 'คืนของ') {
          txType = 'RETURN';
        } else if (detail === 'เบิก') {
          if (qtyChange < 0) {
            txType = 'WITHDRAW';
            note = `นำเข้าจาก Excel (แถว ${excelRowNum})`;
          } else {
            txType = 'ADJUST';
            note = `นำเข้าจาก Excel (แถว ${excelRowNum} - ระบุ 'เบิก' ค่าบวก)`;
          }
        }

        txPayload.push({
          batchCode,
          itemId: entry.id,
          txType,
          qtyChange,
          stockBefore: prev,
          stockAfter: next,
          txDate,
          requesterName: requester || (txType === 'RESTOCK' ? 'ฝ่ายการตลาด' : null),
          note,
          status: 'COMPLETED',
          createdByName: 'Excel Import',
          sourceRef: `EXCEL_R${excelRowNum}_C${colIdx}`,
        });
      }
    }

    // Special summary alignments requested explicitly by user (keep all 17 rows exact to summary table):
    // a) 'หมวก' (Row 7, MKT-PRM-006): Summary=388 from duplicate =SUM(O:O) formula
    const hatEntry = skuToItem.get('MKT-PRM-006');
    if (hatEntry) {
      txPayload.push({
        batchCode: 'XLS-SUMMARY',
        itemId: hatEntry.id,
        txType: 'OPENING',
        qtyChange: 388,
        stockBefore: 0,
        stockAfter: 388,
        txDate: new Date('2024-02-01T09:00:00+07:00'),
        requesterName: 'ยอดตั้งต้นตามตารางสรุป Excel',
        note: 'นำเข้าจากตารางสรุป Excel แถวที่ 7 (หมวก = 388)',
        status: 'COMPLETED',
        createdByName: 'Excel Import',
        sourceRef: 'EXCEL_SUMMARY_ROW_7_OPENING',
      });
    }

    // b) 'ร่ม' (Row 8, MKT-PRM-007): Historical Col C sums to 54, Summary Table explicitly shows 0
    const umbrellaEntry = skuToItem.get('MKT-PRM-007');
    if (umbrellaEntry) {
      const histUmbrella = runningBalance.get(umbrellaEntry.id) ?? 0;
      if (histUmbrella !== 0) {
        txPayload.push({
          batchCode: 'XLS-SUMMARY',
          itemId: umbrellaEntry.id,
          txType: 'ADJUST',
          qtyChange: -histUmbrella,
          stockBefore: histUmbrella,
          stockAfter: 0,
          txDate: new Date('2026-11-10T12:00:00+07:00'),
          requesterName: 'ปรับยอดตามตารางสรุป Excel',
          note: `ปรับยอดให้ตรงกับตารางสรุปด้านขวาใน Excel (คงเหลือ = 0)`,
          status: 'COMPLETED',
          createdByName: 'Excel Import',
          sourceRef: 'EXCEL_SUMMARY_ROW_8_RECONCILE',
        });
      }
    }

    const result = await prisma.stockTransaction.createMany({
      data: txPayload,
      skipDuplicates: true,
    });

    console.log(
      `Seeded category "${category.name}", ${skuToItem.size} stock items, and inserted ${result.count} historical transactions (total prepared: ${txPayload.length}).`
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

