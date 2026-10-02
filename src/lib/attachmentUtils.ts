export interface AttachmentCheckItem {
  fileName?: string;
  fileHash?: string;
  visualHash?: string;
  fileSize?: number;
}

export function normalizeAttachmentName(name?: string | null): string {
  if (!name) return '';
  let base = name.replace(/\.[a-zA-Z0-9]+$/, '').trim();
  base = base.replace(/(_\d{1,2}|\s*\(\d+\)|\s*-\s*copy(\s*\d+)?|\s*copy(\s*\d+)?)$/i, '').trim();
  return base.toLowerCase();
}

export const GENERIC_ATTACHMENT_STEMS = new Set([
  'image', 'img', 'photo', 'scan', 'doc', 'document', 'file', 'screenshot',
  'receipt', 'download', 'untitled', 'camscanner', 'invoice'
]);

export function isDistinctiveAttachmentName(normName: string): boolean {
  if (!normName || normName.length < 4) return false;
  if (GENERIC_ATTACHMENT_STEMS.has(normName)) return false;
  return /\d/.test(normName) || normName.length >= 6;
}

export function visualHammingDistance(h1?: string | null, h2?: string | null): number {
  if (!h1 || !h2 || h1.length !== 16 || h2.length !== 16) return 999;
  let dist = 0;
  for (let i = 0; i < 16; i++) {
    let xor = parseInt(h1[i], 16) ^ parseInt(h2[i], 16);
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}
