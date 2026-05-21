export const JOB_TYPES = [
  "งานขาย",
  "งานซ่อม",
  "งานติดตั้ง",
  "งานขาย + ติดตั้ง",
  "งานตู้",
  "งานโปรเจค",
  "สินค้าฝากขาย",
  "ค่าบริการ",
  "งานตรวจเช็ค",
  "งานเคลม",
] as const;

export type JobType = (typeof JOB_TYPES)[number];
