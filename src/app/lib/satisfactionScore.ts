export const SATISFACTION_SCORE_LEGEND = [
  { score: 5, label: 'ดีเยี่ยม / พึงพอใจมากที่สุด' },
  { score: 4, label: 'ดี / พึงพอใจมาก' },
  { score: 3, label: 'ปานกลาง / พึงพอใจ' },
  { score: 2, label: 'ต้องปรับปรุง / พึงพอใจน้อย' },
  { score: 1, label: 'ต้องปรับปรุงอย่างมาก / ไม่พึงพอใจ' },
] as const;

export function formatPhoneForTel(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
}
