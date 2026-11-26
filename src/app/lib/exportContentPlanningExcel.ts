import ExcelJS from 'exceljs';
import {
  doesPlanBelongToMemberSheet,
  formatIsoDateToSlashThai,
  formatThaiMonthYear,
  formatTime24Dot,
  sortContentPlansChronologically,
  type ContentPlanItem,
  type MarketingPlanMember,
} from '@/app/lib/contentPlanningTypes';

/**
 * Normalizes a label into a valid, unique Excel worksheet tab name (<= 31 chars, no []:*?/\).
 */
export function sanitizeExcelSheetName(rawName: string, usedNames: Set<string>): string {
  const cleaned = (rawName || 'Sheet')
    .replace(/[\[\]:*?/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Sheet';

  let candidate = cleaned.slice(0, 31).trim() || 'Sheet';
  if (!usedNames.has(candidate.toLowerCase())) {
    usedNames.add(candidate.toLowerCase());
    return candidate;
  }

  let seq = 2;
  while (seq < 999) {
    const suffix = ` (${seq})`;
    const base = cleaned.slice(0, Math.max(1, 31 - suffix.length)).trim();
    candidate = `${base}${suffix}`;
    if (!usedNames.has(candidate.toLowerCase())) {
      usedNames.add(candidate.toLowerCase());
      return candidate;
    }
    seq++;
  }

  return `Sheet_${Date.now().toString().slice(-6)}`;
}

function getMemberSheetLabel(member: MarketingPlanMember): string {
  const stripped = member.fullName
    .replace(/^(นาย|นางสาว|นาง|คุณ|ดร\.)\s*/g, '')
    .trim();
  const firstName = stripped.split(/\s+/)[0] || stripped;
  return member.nickname ? `${firstName} (${member.nickname})` : stripped;
}

function populateContentPlanningWorksheet(
  sheet: ExcelJS.Worksheet,
  options: {
    heading: string;
    subHeading: string;
    rows: ContentPlanItem[];
    memberIdScope?: string | null;
    exportedAtLabel: string;
  }
) {
  const { heading, subHeading, rows, memberIdScope, exportedAtLabel } = options;
  const sorted = sortContentPlansChronologically(rows);

  const columns = memberIdScope
    ? [
        { header: 'ลำดับ', key: 'seq', width: 8 },
        { header: 'วันที่โพสต์', key: 'postDate', width: 15 },
        { header: 'เวลา', key: 'postTime', width: 10 },
        { header: 'บทบาทในงาน', key: 'memberRole', width: 16 },
        { header: 'หัวข้อคอนเทนต์', key: 'title', width: 30 },
        { header: 'รายละเอียดเนื้อหา', key: 'contentDetail', width: 42 },
        { header: 'แคปชั่น (Caption)', key: 'caption', width: 42 },
        { header: 'ช่องทางโพสต์', key: 'channels', width: 28 },
        { header: 'ผู้รับผิดชอบหลัก', key: 'primaryOwner', width: 22 },
        { header: 'ผู้รับผิดชอบร่วม', key: 'coOwners', width: 26 },
      ]
    : [
        { header: 'ลำดับ', key: 'seq', width: 8 },
        { header: 'วันที่โพสต์', key: 'postDate', width: 15 },
        { header: 'เวลา', key: 'postTime', width: 10 },
        { header: 'หัวข้อคอนเทนต์', key: 'title', width: 32 },
        { header: 'รายละเอียดเนื้อหา', key: 'contentDetail', width: 42 },
        { header: 'แคปชั่น (Caption)', key: 'caption', width: 42 },
        { header: 'ช่องทางโพสต์', key: 'channels', width: 28 },
        { header: 'ผู้รับผิดชอบหลัก', key: 'primaryOwner', width: 22 },
        { header: 'ผู้รับผิดชอบร่วม', key: 'coOwners', width: 26 },
      ];

  sheet.columns = columns.map(c => ({ key: c.key, width: c.width }));
  const totalCols = columns.length;

  // Row 1: Title Banner
  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = heading;
  titleCell.font = { name: 'Sarabun', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(1).height = 30;

  // Row 2: Subtitle & Export Info
  sheet.mergeCells(2, 1, 2, totalCols);
  const subCell = sheet.getCell(2, 1);
  subCell.value = `${subHeading}   |   จำนวนทั้งหมด: ${sorted.length} คอนเทนต์   |   ส่งออกเมื่อ: ${exportedAtLabel}`;
  subCell.font = { name: 'Sarabun', size: 10, italic: true, color: { argb: 'FF475569' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(2).height = 22;

  // Row 3: Table Header
  const headerRow = sheet.getRow(3);
  headerRow.height = 26;
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { vertical: 'middle', horizontal: idx <= 2 ? 'center' : 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  if (sorted.length === 0) {
    sheet.mergeCells(4, 1, 4, totalCols);
    const emptyCell = sheet.getCell(4, 1);
    emptyCell.value = 'ยังไม่มีรายการแพลนคอนเทนต์ในเดือนนี้';
    emptyCell.font = { name: 'Sarabun', size: 11, italic: true, color: { argb: 'FF94A3B8' } };
    emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(4).height = 28;
  } else {
    sorted.forEach((item, idx) => {
      const rowNum = 4 + idx;
      const row = sheet.getRow(rowNum);
      const coOwnerText =
        item.coOwners.length > 0 ? item.coOwners.map(co => co.userName).join(', ') : '-';
      const memberRoleText =
        memberIdScope && item.primaryOwnerId === memberIdScope
          ? 'ผู้รับผิดชอบหลัก'
          : 'ผู้รับผิดชอบร่วม';

      const formattedDate = formatIsoDateToSlashThai(item.postDate) || '-';
      const formattedTime = item.postTime ? formatTime24Dot(item.postTime) : '-';

      const values: (string | number)[] = memberIdScope
        ? [
            idx + 1,
            formattedDate,
            formattedTime,
            memberRoleText,
            item.title,
            item.contentDetail || '-',
            item.caption || '-',
            item.channels.join(', '),
            item.primaryOwnerName,
            coOwnerText,
          ]
        : [
            idx + 1,
            formattedDate,
            formattedTime,
            item.title,
            item.contentDetail || '-',
            item.caption || '-',
            item.channels.join(', '),
            item.primaryOwnerName,
            coOwnerText,
          ];

      const isZebra = idx % 2 === 1;
      values.forEach((val, cIdx) => {
        const cell = row.getCell(cIdx + 1);
        cell.value = val;
        cell.font = { name: 'Sarabun', size: 10, color: { argb: 'FF0F172A' } };
        if (isZebra) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
        cell.alignment = {
          vertical: 'top',
          horizontal: cIdx <= 2 ? 'center' : 'left',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    sheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3 + sorted.length, column: totalCols },
    };
  }

  sheet.views = [{ state: 'frozen', ySplit: 3 }];
}

export async function buildContentPlanningWorkbookBuffer(params: {
  year: number;
  month: number;
  plans: ContentPlanItem[];
  members: MarketingPlanMember[];
}): Promise<ArrayBuffer> {
  const { year, month, plans, members } = params;
  const monthLabel = formatThaiMonthYear(year, month);
  const exportedAtLabel = new Date().toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TERA Group CRM';
  workbook.created = new Date();

  const usedSheetNames = new Set<string>();

  // 1. Summary Overview Sheet ("รวมทั้งทีม")
  const teamSheetName = sanitizeExcelSheetName('รวมทั้งทีม', usedSheetNames);
  const teamSheet = workbook.addWorksheet(teamSheetName);
  populateContentPlanningWorksheet(teamSheet, {
    heading: `แผนคอนเทนต์ทีมการตลาด (รวมทั้งทีม) — ${monthLabel}`,
    subHeading: `ภาพรวมทุกช่องทาง (${members.length} สมาชิกทีม)`,
    rows: plans,
    memberIdScope: null,
    exportedAtLabel,
  });

  // 2. Individual Member Sheets (1 Tab = 1 Person Sheet)
  for (const member of members) {
    const memberPlans = plans.filter(p => doesPlanBelongToMemberSheet(p, member.userId));
    const sheetTabName = sanitizeExcelSheetName(getMemberSheetLabel(member), usedSheetNames);
    const memberSheet = workbook.addWorksheet(sheetTabName);
    populateContentPlanningWorksheet(memberSheet, {
      heading: `แผนคอนเทนต์: ${member.fullName}${member.nickname ? ` (${member.nickname})` : ''} — ${monthLabel}`,
      subHeading: member.position || member.role || 'ทีมการตลาด',
      rows: memberPlans,
      memberIdScope: member.userId,
      exportedAtLabel,
    });
  }

  return workbook.xlsx.writeBuffer();
}

export async function exportContentPlanningToExcel(params: {
  year: number;
  month: number;
  plans: ContentPlanItem[];
  members: MarketingPlanMember[];
}): Promise<void> {
  const buffer = await buildContentPlanningWorkbookBuffer(params);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  const thaiYear = params.year + 543;
  const monthPadded = String(params.month).padStart(2, '0');
  a.href = url;
  a.download = `Content_Plan_${thaiYear}-${monthPadded}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
