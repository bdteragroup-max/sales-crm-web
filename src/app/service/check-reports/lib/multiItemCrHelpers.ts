import {
  CheckReportPhotos,
  DiodeMeasurement,
  MotorMeasurement,
  PanelComponentItem,
  PowerVoltageCheck,
} from "@/app/actions/inverterCheckReports";
import { DEFAULT_PANEL_COMPONENTS, EquipmentType } from "./crConstants";
import { normalizeRepairChecklistData } from "@/app/repair-orders/lib/checklistHelpers";

export interface BatchCrItemDraft {
  uid: string;
  roItemKey: string; // e.g. "item-0-unit-0"
  sourceRowIndex: number;
  selectedForSave: boolean;
  existingCr?: {
    id: string;
    crNumber: string;
    status?: string;
  } | null;

  equipmentType: EquipmentType;
  hasInverterInCabinet: boolean;
  inverterBrand: string;
  inverterModel: string;
  serialNumber: string;
  motorKw: string;
  applicationLoad: string;
  purchaseDate: string;
  saleDate: string;
  faultDate: string;
  warrantyStatus: string;
  symptoms: string;
  causeOfFault: string;
  recommendations: string;
  requireParts: { partName: string; qty: number }[];
  diodeMeasurement: DiodeMeasurement;
  powerInputVoltage: Partial<PowerVoltageCheck>;
  powerOutputVoltage: Partial<PowerVoltageCheck>;
  panelComponentsCheck: PanelComponentItem[];
  motorMeasurement: MotorMeasurement;
  photos: CheckReportPhotos;
}

export type CheckReportPhotoKey =
  | "front"
  | "left"
  | "right"
  | "top"
  | "fan"
  | "inside"
  | "damage"
  | "terminal"
  | "nameplate"
  | "other";

export const CHECK_REPORT_PHOTO_KEYS: CheckReportPhotoKey[] = [
  "front",
  "left",
  "right",
  "top",
  "fan",
  "inside",
  "damage",
  "terminal",
  "nameplate",
  "other",
];

const RO_CHECKLIST_PHOTO_KEYS = [
  "Front",
  "SideLeft",
  "SideRight",
  "Top",
  "Inside",
  "Nameplate",
  "TerminalNut",
  "Bottom",
  "Cover",
  "TermCover",
] as const;

const RO_KEY_TO_CR_KEY: Record<string, CheckReportPhotoKey> = {
  Front: "front",
  SideLeft: "left",
  SideRight: "right",
  Top: "top",
  Inside: "inside",
  Nameplate: "nameplate",
  TerminalNut: "terminal",
  Bottom: "other",
  Cover: "other",
  TermCover: "other",
};

function cleanPhotoUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.filter((u): u is string => typeof u === "string" && u.trim() !== "");
}

export function createEmptyPhotos(): CheckReportPhotos {
  return {
    front: [],
    left: [],
    right: [],
    top: [],
    fan: [],
    inside: [],
    damage: [],
    terminal: [],
    nameplate: [],
    other: [],
  };
}

export function mapRoChecklistMapToCrPhotos(
  rowPhotosMap?: Record<string, string[]>
): CheckReportPhotos {
  const m = rowPhotosMap || {};
  return {
    ...createEmptyPhotos(),
    front: cleanPhotoUrls(m.Front),
    left: cleanPhotoUrls(m.SideLeft),
    right: cleanPhotoUrls(m.SideRight),
    top: cleanPhotoUrls(m.Top),
    inside: cleanPhotoUrls(m.Inside),
    nameplate: cleanPhotoUrls(m.Nameplate),
    terminal: cleanPhotoUrls(m.TerminalNut),
    other: [
      ...cleanPhotoUrls(m.Bottom),
      ...cleanPhotoUrls(m.Cover),
      ...cleanPhotoUrls(m.TermCover),
    ],
  };
}

/**
 * Distribute per-category RO checklist images across `unitCount` units.
 * Splits per RO category (before combining Bottom/Cover/TermCover into `other`)
 * whenever a category has >= `unitCount` images, keeping shorter slots on unit 0.
 */
export function splitRoChecklistImagesAcrossUnits(
  rowPhotosMap: Record<string, string[]> | undefined,
  unitCount: number
): CheckReportPhotos[] {
  const count = Math.max(1, unitCount);
  if (count === 1) {
    return [mapRoChecklistMapToCrPhotos(rowPhotosMap)];
  }

  const m = rowPhotosMap || {};
  const perUnitRaw: Record<string, string[]>[] = Array.from({ length: count }, () => ({}));

  for (const roKey of RO_CHECKLIST_PHOTO_KEYS) {
    const urls = cleanPhotoUrls(m[roKey]);
    if (urls.length === 0) continue;

    if (urls.length >= count) {
      for (let u = 0; u < count; u++) {
        const start = Math.floor((u * urls.length) / count);
        const end = Math.floor(((u + 1) * urls.length) / count);
        perUnitRaw[u][roKey] = urls.slice(start, end);
      }
    } else {
      perUnitRaw[0][roKey] = [...urls];
    }
  }

  return perUnitRaw.map(mapRoChecklistMapToCrPhotos);
}

/**
 * Evenly distribute multi-photo CR slots from a `CheckReportPhotos` object across `unitCount` drafts.
 */
export function splitCrPhotosAcrossUnits(
  sourcePhotos: CheckReportPhotos | undefined,
  unitCount: number
): CheckReportPhotos[] {
  const count = Math.max(1, unitCount);
  const src = sourcePhotos || createEmptyPhotos();
  if (count === 1) {
    return [{ ...createEmptyPhotos(), ...src }];
  }

  const perUnit: CheckReportPhotos[] = Array.from({ length: count }, () => createEmptyPhotos());
  for (const key of CHECK_REPORT_PHOTO_KEYS) {
    const urls = cleanPhotoUrls(src[key]);
    if (urls.length === 0) continue;

    if (urls.length >= count) {
      for (let u = 0; u < count; u++) {
        const start = Math.floor((u * urls.length) / count);
        const end = Math.floor(((u + 1) * urls.length) / count);
        perUnit[u][key] = urls.slice(start, end);
      }
    } else {
      perUnit[0][key] = [...urls];
    }
  }
  return perUnit;
}

function countNonVideoRoImages(rowPhotosMap?: Record<string, string[]>): number {
  if (!rowPhotosMap) return 0;
  return RO_CHECKLIST_PHOTO_KEYS.reduce(
    (sum, k) => sum + cleanPhotoUrls(rowPhotosMap[k]).length,
    0
  );
}

export interface RoPhotoPoolEntry {
  id: string;
  sourceIndex: number;
  sourceLabel: string;
  roKey: string;
  crKey: CheckReportPhotoKey;
  url: string;
}

interface RepairOrderPhotoSource {
  id?: string;
  items?: Array<{
    brand?: string;
    model?: string;
    serial?: string;
  }>;
  checklist?: unknown;
  checklistImages?: unknown;
  existingReports?: unknown[];
}

/**
 * Extract a flattened, deduplicated photo pool from a RepairOrder's `checklistImages`
 * preserving source item metadata for interactive picking in CheckReportForm.
 */
export function extractRoPhotoPool(order: RepairOrderPhotoSource | null | undefined): RoPhotoPoolEntry[] {
  const rawItems = Array.isArray(order?.items) ? order.items : [];
  const { imagesByItem } = normalizeRepairChecklistData(
    Math.max(1, rawItems.length),
    order?.checklist,
    order?.checklistImages
  );

  const pool: RoPhotoPoolEntry[] = [];
  const seenKeyUrl = new Set<string>();

  const itemCount = Math.max(1, rawItems.length, Object.keys(imagesByItem).length);
  for (let idx = 0; idx < itemCount; idx++) {
    const row = rawItems[idx] || {};
    const rowName = [row.brand, row.model].filter(Boolean).join(" ").trim();
    const rowSn = String(row.serial || "").trim();
    const sourceLabel = [
      `รายการ RO ที่ ${idx + 1}`,
      rowName || null,
      rowSn ? `S/N: ${rowSn}` : null,
    ]
      .filter(Boolean)
      .join(" • ");

    const rowMap = imagesByItem[idx] || {};
    for (const roKey of RO_CHECKLIST_PHOTO_KEYS) {
      const crKey = RO_KEY_TO_CR_KEY[roKey] || "other";
      const urls = cleanPhotoUrls(rowMap[roKey]);
      urls.forEach((url, urlIdx) => {
        const dedupeKey = `${crKey}::${url}`;
        if (seenKeyUrl.has(dedupeKey)) return;
        seenKeyUrl.add(dedupeKey);
        pool.push({
          id: `${idx}-${roKey}-${urlIdx}`,
          sourceIndex: idx,
          sourceLabel,
          roKey,
          crKey,
          url,
        });
      });
    }
  }

  return pool;
}

/**
 * Resolve auto-matched photos from a RepairOrder for a specific CR unit (works in both Create & Edit mode).
 */
export function resolveAutoPhotosForCheckReport(
  order: RepairOrderPhotoSource | null | undefined,
  criteria?: {
    roItemKey?: string;
    serialNumber?: string;
    fallbackIndex?: number;
  }
): {
  photos: CheckReportPhotos;
  matchedIndex: number;
  totalUnits: number;
} {
  const drafts = buildBatchItemsFromRepairOrder(order, order?.existingReports || []);
  if (drafts.length === 0) {
    return { photos: createEmptyPhotos(), matchedIndex: 0, totalUnits: 1 };
  }

  let matchedIndex = -1;
  const targetKey = String(criteria?.roItemKey || "").trim();
  const targetSn = String(criteria?.serialNumber || "").trim().toLowerCase();

  if (targetKey) {
    matchedIndex = drafts.findIndex((d) => d.roItemKey === targetKey);
  }
  if (matchedIndex === -1 && targetSn) {
    matchedIndex = drafts.findIndex(
      (d) => d.serialNumber.trim().toLowerCase() === targetSn
    );
  }
  if (matchedIndex === -1) {
    const fb = criteria?.fallbackIndex ?? 0;
    matchedIndex = fb >= 0 && fb < drafts.length ? fb : 0;
  }

  return {
    photos: drafts[matchedIndex]?.photos || createEmptyPhotos(),
    matchedIndex,
    totalUnits: drafts.length,
  };
}

export function detectEquipmentTypeFromRoItem(rawType?: string, rawBrand?: string, rawModel?: string): EquipmentType {
  const combined = `${rawType || ""} ${rawBrand || ""} ${rawModel || ""}`.toUpperCase();
  const itemType = (rawType || "").toUpperCase();

  if (
    itemType.includes("ตู้") ||
    itemType.includes("CABINET") ||
    itemType.includes("PANEL") ||
    itemType.includes("CONTROL")
  ) {
    return "CONTROL_CABINET";
  }
  if (itemType.includes("มอเตอร์") || itemType.includes("MOTOR")) {
    return "MOTOR";
  }
  if (itemType.includes("ปั๊ม") || itemType.includes("ปั้ม") || itemType.includes("PUMP")) {
    return "PUMP";
  }
  if (
    itemType.includes("INVERTER") ||
    itemType.includes("อินเวอร์เตอร์") ||
    itemType.includes("VFD") ||
    itemType.includes("DRIVE") ||
    itemType.includes("SOFT")
  ) {
    return "INVERTER";
  }

  // Fallback heuristics if type column was left blank
  if (combined.includes("CALPEDA") || combined.includes("EBARA") || combined.includes("GRUNDFOS")) {
    return "PUMP";
  }
  if (combined.includes("MOTOR") || combined.includes("มอเตอร์")) {
    return "MOTOR";
  }
  return "INVERTER";
}

export function createEmptyBatchCrItem(
  index: number,
  defaults?: Partial<BatchCrItemDraft>
): BatchCrItemDraft {
  const eqType: EquipmentType = defaults?.equipmentType || "INVERTER";
  const defaultBrand =
    defaults?.inverterBrand !== undefined
      ? defaults.inverterBrand
      : eqType === "CONTROL_CABINET"
      ? "TERA GROUP"
      : eqType === "MOTOR" || eqType === "PUMP"
      ? ""
      : "INVT";

  return {
    uid: `cr-item-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    roItemKey: defaults?.roItemKey || `manual-${index}`,
    sourceRowIndex: defaults?.sourceRowIndex ?? index,
    selectedForSave: defaults?.selectedForSave ?? true,
    existingCr: defaults?.existingCr || null,
    equipmentType: eqType,
    hasInverterInCabinet: defaults?.hasInverterInCabinet ?? true,
    inverterBrand: defaultBrand,
    inverterModel: defaults?.inverterModel || "",
    serialNumber: defaults?.serialNumber || "",
    motorKw: defaults?.motorKw || "",
    applicationLoad: defaults?.applicationLoad || "",
    purchaseDate: defaults?.purchaseDate || "",
    saleDate: defaults?.saleDate || "",
    faultDate: defaults?.faultDate || "",
    warrantyStatus: defaults?.warrantyStatus || "IN_WARRANTY",
    symptoms: defaults?.symptoms || "",
    causeOfFault: defaults?.causeOfFault || "",
    recommendations: defaults?.recommendations || "",
    requireParts: defaults?.requireParts?.length
      ? defaults.requireParts.map((p) => ({ ...p }))
      : [{ partName: "", qty: 1 }],
    diodeMeasurement: defaults?.diodeMeasurement ? { ...defaults.diodeMeasurement } : {},
    powerInputVoltage: defaults?.powerInputVoltage ? { ...defaults.powerInputVoltage } : {},
    powerOutputVoltage: defaults?.powerOutputVoltage ? { ...defaults.powerOutputVoltage } : {},
    panelComponentsCheck: defaults?.panelComponentsCheck?.length
      ? defaults.panelComponentsCheck.map((c) => ({ ...c }))
      : DEFAULT_PANEL_COMPONENTS.map((c) => ({ ...c })),
    motorMeasurement: defaults?.motorMeasurement ? { ...defaults.motorMeasurement } : {},
    photos: defaults?.photos || createEmptyPhotos(),
  };
}

function extractQcVoltagesForUnit(inverterQc: any, unitIdx: number): {
  powerInputVoltage: Partial<PowerVoltageCheck>;
  powerOutputVoltage: Partial<PowerVoltageCheck>;
} {
  if (!inverterQc) return { powerInputVoltage: {}, powerOutputVoltage: {} };
  const itemQc = Array.isArray(inverterQc.itemsQc)
    ? inverterQc.itemsQc[unitIdx] || (unitIdx === 0 ? inverterQc : null)
    : unitIdx === 0
    ? inverterQc
    : null;

  if (!itemQc) return { powerInputVoltage: {}, powerOutputVoltage: {} };

  const powerInputVoltage: Partial<PowerVoltageCheck> = {};
  const powerOutputVoltage: Partial<PowerVoltageCheck> = {};

  if (itemQc.inputVoltage) {
    powerInputVoltage.inputDc = itemQc.inputVoltage?.dcSinglePhase?.value || "";
    powerInputVoltage.input1PhaseAc = itemQc.inputVoltage?.acSinglePhase?.value || "";
    powerInputVoltage.input3PhaseRs = itemQc.inputVoltage?.acThreePhase?.rs || "";
    powerInputVoltage.input3PhaseRt = itemQc.inputVoltage?.acThreePhase?.rt || "";
    powerInputVoltage.input3PhaseSt = itemQc.inputVoltage?.acThreePhase?.st || "";
  }
  if (itemQc.outputVoltage) {
    powerOutputVoltage.output1PhaseLn =
      itemQc.outputVoltage?.singlePhaseLN?.value ||
      itemQc.outputVoltage?.singlePhase220?.ln ||
      "";
    powerOutputVoltage.output3Phase220Uv = itemQc.outputVoltage?.threePhase220?.uv || "";
    powerOutputVoltage.output3Phase220Uw = itemQc.outputVoltage?.threePhase220?.uw || "";
    powerOutputVoltage.output3Phase220Vw = itemQc.outputVoltage?.threePhase220?.vw || "";
    powerOutputVoltage.output3Phase380Uv = itemQc.outputVoltage?.threePhase380?.uv || "";
    powerOutputVoltage.output3Phase380Uw = itemQc.outputVoltage?.threePhase380?.uw || "";
    powerOutputVoltage.output3Phase380Vw = itemQc.outputVoltage?.threePhase380?.vw || "";
  }

  return { powerInputVoltage, powerOutputVoltage };
}

/**
 * Expand all items from a RepairOrder into per-machine `BatchCrItemDraft`s,
 * carrying over per-item type, brand, model, S/N, size, remark/symptoms, QC voltages,
 * checklist photos, and matching any already-created CRs!
 */
export function buildBatchItemsFromRepairOrder(
  order: any,
  existingReports: any[] = []
): BatchCrItemDraft[] {
  const rawItems = Array.isArray(order?.items) ? order.items : [];
  const orderSymptoms = String(order?.symptoms || "").trim();

  const { imagesByItem } = normalizeRepairChecklistData(
    Math.max(1, rawItems.length),
    order?.checklist,
    order?.checklistImages
  );

  if (rawItems.length === 0) {
    return [
      createEmptyBatchCrItem(0, {
        roItemKey: "item-0-unit-0",
        symptoms: orderSymptoms,
      }),
    ];
  }

  const usedExistingIds = new Set<string>();
  const drafts: BatchCrItemDraft[] = [];
  const nonEmptyRowIndices: number[] = [];
  let firstRowQty = 1;

  rawItems.forEach((row: any, rowIdx: number) => {
    const qty = Math.max(1, parseInt(String(row?.qty || 1), 10) || 1);
    if (rowIdx === 0) firstRowQty = qty;
    const rawSerial = String(row?.serial || "").trim();
    const serialParts = rawSerial
      ? rawSerial
          .split(/[,/;\r\n]+/)
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];

    const rowPhotosMap = imagesByItem[rowIdx] || {};
    if (countNonVideoRoImages(rowPhotosMap) > 0) {
      nonEmptyRowIndices.push(rowIdx);
    }
    const perUnitRowPhotos = splitRoChecklistImagesAcrossUnits(rowPhotosMap, qty);

    const rowRemark = String(row?.remark || "").trim();
    let mergedSymptoms = orderSymptoms;
    if (rowRemark) {
      if (!orderSymptoms || orderSymptoms === rowRemark) {
        mergedSymptoms = rowRemark;
      } else if (!orderSymptoms.includes(rowRemark)) {
        mergedSymptoms = `${orderSymptoms} (${rowRemark})`;
      }
    }

    const eqType = detectEquipmentTypeFromRoItem(row?.type, row?.brand, row?.model);

    for (let u = 0; u < qty; u++) {
      const globalIdx = drafts.length;
      const roItemKey = `item-${rowIdx}-unit-${u}`;
      let unitSerial = "";
      if (qty === 1) {
        unitSerial = rawSerial;
      } else if (serialParts.length > u) {
        unitSerial = serialParts[u];
      } else if (rawSerial) {
        unitSerial = `${rawSerial} (${u + 1}/${qty})`;
      }

      // Match existing CR if already created for this machine
      const matchedCr = existingReports.find((cr) => {
        if (!cr?.id || usedExistingIds.has(cr.id)) return false;
        const crRoKey = (cr.diodeMeasurement as any)?.roItemKey;
        if (crRoKey && crRoKey === roItemKey) return true;
        const crSerial = String(cr.serialNumber || "").trim().toLowerCase();
        const crModel = String(cr.inverterModel || "").trim().toLowerCase();
        if (unitSerial && crSerial && crSerial === unitSerial.toLowerCase()) {
          return true;
        }
        if (!unitSerial && !crSerial && row?.model && crModel === String(row.model).trim().toLowerCase()) {
          return true;
        }
        return false;
      });

      if (matchedCr?.id) {
        usedExistingIds.add(matchedCr.id);
      }

      const { powerInputVoltage, powerOutputVoltage } = extractQcVoltagesForUnit(
        order?.inverterQc,
        globalIdx
      );

      const unitPhotos: CheckReportPhotos = perUnitRowPhotos[u] || createEmptyPhotos();

      drafts.push(
        createEmptyBatchCrItem(globalIdx, {
          roItemKey,
          sourceRowIndex: rowIdx,
          selectedForSave: !matchedCr,
          existingCr: matchedCr
            ? {
                id: matchedCr.id,
                crNumber: matchedCr.crNumber,
                status: matchedCr.status,
              }
            : null,
          equipmentType: eqType,
          inverterBrand: String(row?.brand || "").trim(),
          inverterModel: String(row?.model || "").trim(),
          serialNumber: unitSerial,
          motorKw: String(row?.size || "").trim(),
          symptoms: mergedSymptoms,
          powerInputVoltage,
          powerOutputVoltage,
          photos: unitPhotos,
        })
      );
    }
  });

  // Fallback for multi-row Repair Orders where all units' photos were uploaded into row 0 only
  // (e.g. 2 rows in RO where byItem["0"] contains 2 photos per slot and byItem["1"] is empty).
  if (
    drafts.length > 1 &&
    nonEmptyRowIndices.length === 1 &&
    nonEmptyRowIndices[0] === 0 &&
    firstRowQty === 1
  ) {
    const firstRowPhotos = imagesByItem[0] || {};
    const hasPackedMultiUnitSlots = RO_CHECKLIST_PHOTO_KEYS.some(
      (k) => cleanPhotoUrls(firstRowPhotos[k]).length >= drafts.length
    );
    if (hasPackedMultiUnitSlots) {
      const redistributed = splitRoChecklistImagesAcrossUnits(firstRowPhotos, drafts.length);
      for (let i = 0; i < drafts.length; i++) {
        drafts[i].photos = redistributed[i] || createEmptyPhotos();
      }
    }
  }

  // If every single item already had an existing CR, still select the first one if user came to create a new report,
  // or leave them unselected with clear badges so user can explicitly tick whichever they want to re-issue.
  return drafts;
}

/**
 * Format preview CR numbers (e.g. base "CR69-1111" -> ["CR69-1111-01", "CR69-1111-02", ...])
 */
export function buildPreviewBatchCrNumbers(
  baseCrInput: string,
  selectedCount: number,
  forceSequenceSuffix: boolean = false
): string[] {
  if (selectedCount <= 0) return [];
  const trimmed = (baseCrInput || "").trim() || "CR";

  // Check if base already ends with -NN (e.g. CR69-1111-03)
  const suffixMatch = trimmed.match(/^(.*)-(\d{2,})$/);
  if (selectedCount === 1 && !suffixMatch && !forceSequenceSuffix) {
    return [trimmed];
  }

  let prefix = trimmed;
  let startSeq = 1;
  if (suffixMatch) {
    prefix = suffixMatch[1];
    startSeq = Math.max(1, parseInt(suffixMatch[2], 10) || 1);
  }

  const list: string[] = [];
  for (let i = 0; i < selectedCount; i++) {
    list.push(`${prefix}-${String(startSeq + i).padStart(2, "0")}`);
  }
  return list;
}
