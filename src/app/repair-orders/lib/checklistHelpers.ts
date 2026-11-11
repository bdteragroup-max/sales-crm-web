export interface ChecklistDefItem {
  key: string;
  legacyKey: string;
  label: string;
  shortLabel: string;
  isVideo?: boolean;
}

export const REPAIR_CHECKLIST_DEFS: ChecklistDefItem[] = [
  { key: "Front", legacyKey: "frontPanel", label: "ด้านหน้า / Front", shortLabel: "ด้านหน้า", isVideo: false },
  { key: "Top", legacyKey: "topPanel", label: "ด้านบน / Top", shortLabel: "ด้านบน", isVideo: false },
  { key: "SideLeft", legacyKey: "leftSide", label: "ด้านข้าง (ซ้าย) / Left", shortLabel: "ด้านข้าง (ซ้าย)", isVideo: false },
  { key: "SideRight", legacyKey: "rightSide", label: "ด้านข้าง (ขวา) / Right", shortLabel: "ด้านข้าง (ขวา)", isVideo: false },
  { key: "Inside", legacyKey: "inside", label: "ด้านใน / Inside", shortLabel: "ด้านใน", isVideo: false },
  { key: "Nameplate", legacyKey: "nameplate", label: "Nameplate", shortLabel: "Nameplate", isVideo: false },
  { key: "Bottom", legacyKey: "bottom", label: "ด้านล่าง / Bottom", shortLabel: "ด้านล่าง", isVideo: false },
  { key: "TerminalNut", legacyKey: "terminalNut", label: "Terminal / Nut", shortLabel: "Terminal / Nut", isVideo: false },
  { key: "TermCover", legacyKey: "termCover", label: "Term. Cover", shortLabel: "Term. Cover", isVideo: false },
  { key: "Cover", legacyKey: "cover", label: "ฝาครอบ / Cover", shortLabel: "ฝาครอบ", isVideo: false },
  { key: "Video", legacyKey: "video", label: "วิดีโอตรวจสอบ / Video", shortLabel: "Video", isVideo: true },
];

export type ChecklistMap = Record<string, boolean>;
export type ChecklistByItemMap = Record<number, ChecklistMap>;
export type ChecklistImagesByItemMap = Record<number, Record<string, string[]>>;

export function createEmptyChecklistMap(): ChecklistMap {
  const map: ChecklistMap = {};
  for (const def of REPAIR_CHECKLIST_DEFS) {
    map[def.key] = false;
  }
  return map;
}

function safeParseJsonObject(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }
  return {};
}

export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".m4v")
  );
}

/**
 * Normalize raw `checklist` + `checklistImages` from DB into per-item maps (0..itemsCount-1),
 * maintaining 100% compatibility with legacy flat records.
 */
export function normalizeRepairChecklistData(
  itemsCount: number,
  rawChecklistInput: any,
  rawChecklistImagesInput: any
): {
  checklistByItem: ChecklistByItemMap;
  imagesByItem: ChecklistImagesByItemMap;
} {
  const count = Math.max(1, itemsCount || 1);
  const rawChecklist = safeParseJsonObject(rawChecklistInput);
  const rawImages = safeParseJsonObject(rawChecklistImagesInput);

  const hasStructuredChecklist =
    rawChecklist.byItem && typeof rawChecklist.byItem === "object" && !Array.isArray(rawChecklist.byItem);
  const hasStructuredImages =
    rawImages.byItem && typeof rawImages.byItem === "object" && !Array.isArray(rawImages.byItem);

  const checklistByItem: ChecklistByItemMap = {};
  const imagesByItem: ChecklistImagesByItemMap = {};

  for (let idx = 0; idx < count; idx++) {
    checklistByItem[idx] = createEmptyChecklistMap();
    imagesByItem[idx] = {};
  }

  if (hasStructuredImages) {
    for (let idx = 0; idx < count; idx++) {
      const itemImgs = rawImages.byItem[String(idx)] || rawImages.byItem[idx] || {};
      if (itemImgs && typeof itemImgs === "object") {
        for (const def of REPAIR_CHECKLIST_DEFS) {
          const arr = itemImgs[def.key] || itemImgs[def.legacyKey];
          if (Array.isArray(arr)) {
            imagesByItem[idx][def.key] = arr.filter((u: any) => typeof u === "string" && u.trim() !== "");
          } else if (typeof arr === "string" && arr.trim() !== "") {
            imagesByItem[idx][def.key] = [arr];
          } else {
            imagesByItem[idx][def.key] = [];
          }
        }
      }
    }
  } else {
    // Legacy flat checklistImages:
    // Case A (EditRepairOrderForm): rawImages[key] has length matching itemsCount where rawImages[key][idx] belongs to item idx.
    // Case B (NewRepairOrderForm single-item or multi-photo): rawImages[key] has multiple URLs when count === 1.
    for (const def of REPAIR_CHECKLIST_DEFS) {
      const rawArr = rawImages[def.key] || rawImages[def.legacyKey];
      const urls = Array.isArray(rawArr) ? rawArr : [];
      if (count === 1) {
        imagesByItem[0][def.key] = urls.filter((u: any) => typeof u === "string" && u.trim() !== "");
      } else {
        for (let idx = 0; idx < count; idx++) {
          const u = urls[idx];
          imagesByItem[idx][def.key] = typeof u === "string" && u.trim() !== "" ? [u] : [];
        }
        // Any overflow images beyond `count` attach to item 0 so nothing is ever lost
        if (urls.length > count) {
          const extras = urls
            .slice(count)
            .filter((u: any) => typeof u === "string" && u.trim() !== "");
          if (extras.length > 0) {
            imagesByItem[0][def.key] = [...(imagesByItem[0][def.key] || []), ...extras];
          }
        }
      }
    }
  }

  if (hasStructuredChecklist) {
    for (let idx = 0; idx < count; idx++) {
      const itemChecks = rawChecklist.byItem[String(idx)] || rawChecklist.byItem[idx] || {};
      for (const def of REPAIR_CHECKLIST_DEFS) {
        const hasImgs = (imagesByItem[idx][def.key]?.length || 0) > 0;
        checklistByItem[idx][def.key] = Boolean(
          itemChecks[def.key] ?? itemChecks[def.legacyKey] ?? hasImgs
        );
      }
    }
  } else {
    // Legacy flat checklist booleans
    for (let idx = 0; idx < count; idx++) {
      for (const def of REPAIR_CHECKLIST_DEFS) {
        const legacyChecked = Boolean(rawChecklist[def.key] ?? rawChecklist[def.legacyKey]);
        const hasImgs = (imagesByItem[idx][def.key]?.length || 0) > 0;
        if (idx === 0) {
          checklistByItem[idx][def.key] = legacyChecked || hasImgs;
        } else {
          // In legacy records, item > 0 was considered checked if it had an uploaded image
          checklistByItem[idx][def.key] = hasImgs;
        }
      }
    }
  }

  return { checklistByItem, imagesByItem };
}

/**
 * Serialize per-item checklist & images into backward-compatible JSON payloads for Prisma `RepairOrder`.
 */
export function serializeRepairChecklistData(
  itemsCount: number,
  checklistByItem: ChecklistByItemMap,
  imagesByItem: ChecklistImagesByItemMap
): {
  checklist: Record<string, any>;
  checklistImages: Record<string, any>;
} {
  const count = Math.max(1, itemsCount || 1);
  const summaryChecklist: Record<string, any> = {};
  const byItemChecklist: Record<string, ChecklistMap> = {};
  const byItemImages: Record<string, Record<string, string[]>> = {};
  const legacyImages: Record<string, string[]> = {};

  for (const def of REPAIR_CHECKLIST_DEFS) {
    summaryChecklist[def.key] = false;
  }

  for (let idx = 0; idx < count; idx++) {
    const itemMap: ChecklistMap = {};
    const itemImgMap: Record<string, string[]> = {};

    for (const def of REPAIR_CHECKLIST_DEFS) {
      const urls = (imagesByItem[idx]?.[def.key] || []).filter(
        (u) => typeof u === "string" && u.trim() !== ""
      );
      const checked = Boolean(checklistByItem[idx]?.[def.key]) || urls.length > 0;
      itemMap[def.key] = checked;
      if (checked) {
        summaryChecklist[def.key] = true;
      }
      if (urls.length > 0) {
        itemImgMap[def.key] = urls;
      }
    }

    byItemChecklist[String(idx)] = itemMap;
    byItemImages[String(idx)] = itemImgMap;
  }

  // Build legacy top-level array per key (1st URL per item index, plus any extra URLs)
  for (const def of REPAIR_CHECKLIST_DEFS) {
    const flatForKey: string[] = [];
    let anyUrl = false;
    for (let idx = 0; idx < count; idx++) {
      const urls = byItemImages[String(idx)]?.[def.key] || [];
      if (urls.length > 0) {
        anyUrl = true;
        flatForKey.push(urls[0]);
      } else {
        flatForKey.push("");
      }
    }
    // Append additional photos (2nd, 3rd...) so legacy flat viewers still see all photos
    for (let idx = 0; idx < count; idx++) {
      const urls = byItemImages[String(idx)]?.[def.key] || [];
      if (urls.length > 1) {
        flatForKey.push(...urls.slice(1));
      }
    }
    if (anyUrl) {
      legacyImages[def.key] = flatForKey;
    }
  }

  return {
    checklist: {
      ...summaryChecklist,
      byItem: byItemChecklist,
    },
    checklistImages: {
      ...legacyImages,
      byItem: byItemImages,
    },
  };
}

/**
 * Remove an item index from per-item maps and shift higher indices down cleanly.
 */
export function removeChecklistItemAtIndex<T>(
  map: Record<number, T>,
  removeIdx: number,
  totalBeforeRemove: number,
  createFallback: () => T
): Record<number, T> {
  const next: Record<number, T> = {};
  let writeIdx = 0;
  for (let i = 0; i < totalBeforeRemove; i++) {
    if (i === removeIdx) continue;
    next[writeIdx] = map[i] ?? createFallback();
    writeIdx++;
  }
  if (writeIdx === 0) {
    next[0] = createFallback();
  }
  return next;
}

export function formatRepairItemShortTitle(item: any, idx: number): string {
  const parts = [item?.type, item?.brand, item?.model].filter((s) => typeof s === "string" && s.trim() !== "");
  const base = parts.length > 0 ? parts.join(" ") : `รายการที่ ${idx + 1}`;
  const sn = typeof item?.serial === "string" && item.serial.trim() !== "" ? ` (${item.serial.trim()})` : "";
  return `${base}${sn}`;
}

/**
 * Extract summary & attached images for Print A4 & Quick View.
 */
export function computeRepairChecklistSummary(
  itemsInput: any,
  rawChecklist: any,
  rawChecklistImages: any
) {
  const items = Array.isArray(itemsInput) ? itemsInput : [];
  const productCount = items.length;
  const effectiveCount = Math.max(1, productCount);
  const { checklistByItem, imagesByItem } = normalizeRepairChecklistData(
    effectiveCount,
    rawChecklist,
    rawChecklistImages
  );

  const checkedItems = REPAIR_CHECKLIST_DEFS.map((def) => {
    let filled = 0;
    if (productCount > 0) {
      for (let pi = 0; pi < productCount; pi++) {
        const hasCheck = Boolean(checklistByItem[pi]?.[def.key]);
        const hasImg = (imagesByItem[pi]?.[def.key]?.length || 0) > 0;
        if (hasCheck || hasImg) filled++;
      }
    }
    return {
      key: def.key,
      label: def.shortLabel,
      fullLabel: def.label,
      filled,
      total: productCount,
    };
  });

  const perItemSummary = items.map((item: any, idx: number) => {
    const checkedLabels: string[] = [];
    for (const def of REPAIR_CHECKLIST_DEFS) {
      const hasCheck = Boolean(checklistByItem[idx]?.[def.key]);
      const hasImg = (imagesByItem[idx]?.[def.key]?.length || 0) > 0;
      if (hasCheck || hasImg) {
        checkedLabels.push(def.shortLabel);
      }
    }
    return {
      itemIndex: idx,
      title: formatRepairItemShortTitle(item, idx),
      serial: item?.serial || "",
      checkedLabels,
    };
  });

  const attachedImages: {
    url: string;
    label: string;
    itemIndex: number;
    isVideo: boolean;
  }[] = [];
  const seenUrls = new Set<string>();

  for (let idx = 0; idx < effectiveCount; idx++) {
    const item = items[idx];
    const itemTag =
      productCount > 1
        ? `#${idx + 1}${item?.serial ? ` (${item.serial})` : item?.model ? ` (${item.model})` : ""} • `
        : "";
    for (const def of REPAIR_CHECKLIST_DEFS) {
      const urls = imagesByItem[idx]?.[def.key] || [];
      for (const url of urls) {
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);
        attachedImages.push({
          url,
          label: `${itemTag}${def.shortLabel}`,
          itemIndex: idx,
          isVideo: Boolean(def.isVideo) || isVideoUrl(url),
        });
      }
    }
  }

  return {
    checkedItems,
    perItemSummary,
    attachedImages,
    checklistByItem,
    imagesByItem,
  };
}

