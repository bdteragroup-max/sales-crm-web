/**
 * Helper utilities for Purchase Orders (PO)
 */

export function isRetroactivePO(note?: string | null): boolean {
  if (!note) return false;
  const n = note.toLowerCase();
  return (
    n.includes('ย้อนหลัง') ||
    n.includes('ซื้อเองหน้างาน') ||
    n.includes('เอาของมาแล้ว')
  );
}

export function getRetroactiveReceivedBy(reportedBy?: string | null): string {
  if (reportedBy && reportedBy.trim() && !reportedBy.includes('ไม่ทราบ')) {
    return `รับเข้าหน้างาน (${reportedBy.trim()} - เปิด PO ย้อนหลัง)`;
  }
  return 'รับเข้าหน้างานแล้ว (เปิด PO ย้อนหลัง)';
}
