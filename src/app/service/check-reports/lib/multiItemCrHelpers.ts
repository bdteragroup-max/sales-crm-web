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

  rawItems.forEach((row: any, rowIdx: number) => {
    const qty = Math.max(1, parseInt(String(row?.qty || 1), 10) || 1);
    const rawSerial = String(row?.serial || "").trim();
    const serialParts = rawSerial
      ? rawSerial
          .split(/[,/;\r\n]+/)
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];

    const rowPhotosMap = imagesByItem[rowIdx] || {};
    const mappedPhotos: CheckReportPhotos = {
      ...createEmptyPhotos(),
      front: [...(rowPhotosMap.Front || [])],
      left: [...(rowPhotosMap.SideLeft || [])],
      right: [...(rowPhotosMap.SideRight || [])],
      top: [...(rowPhotosMap.Top || [])],
      inside: [...(rowPhotosMap.Inside || [])],
      nameplate: [...(rowPhotosMap.Nameplate || [])],
      terminal: [...(rowPhotosMap.TerminalNut || [])],
      other: [...(rowPhotosMap.Bottom || []), ...(rowPhotosMap.Cover || []), ...(rowPhotosMap.TermCover || [])],
    };

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

      // Copy row photos to unit 0 (or all units if single serial/photo)
      const unitPhotos: CheckReportPhotos =
        u === 0
          ? {
              front: [...(mappedPhotos.front || [])],
              left: [...(mappedPhotos.left || [])],
              right: [...(mappedPhotos.right || [])],
              top: [...(mappedPhotos.top || [])],
              fan: [],
              inside: [...(mappedPhotos.inside || [])],
              damage: [],
              terminal: [...(mappedPhotos.terminal || [])],
              nameplate: [...(mappedPhotos.nameplate || [])],
              other: [...(mappedPhotos.other || [])],
            }
          : createEmptyPhotos();

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
