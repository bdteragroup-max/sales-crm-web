import { InverterQcData, InverterQcItemData } from "@/app/actions/repairOrders";

export interface NormalizedRepairItem {
  id: string;
  itemIndex: number;
  unitIndex: number;
  totalUnitsInRow: number;
  type: string;
  brand: string;
  model: string;
  serial: string;
  size: string;
  remark: string;
  displayTitle: string;
}

export interface CommonQcData {
  receiveDate: string;
  workType: string;
  customerName: string;
  inspectorName: string;
  inspectorSignatureUrl?: string;
  inspectorDate: string;
  reviewerName: string;
  reviewerSignatureUrl?: string;
  reviewerDate: string;
  formRev: string;
}

export function parseOrderItems(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function formatThaiDate(dateStr?: string | Date | null): string {
  if (!dateStr) return "....................";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateStr);
  }
}

export function extractQcItems(order: any): NormalizedRepairItem[] {
  const rawItems = parseOrderItems(order?.items);
  const fallbackBrand = order?.inverterQc?.inverterBrand || "";
  const fallbackModel = order?.inverterQc?.inverterModel || "";
  const fallbackSerial = order?.inverterQc?.serialNumber || "";

  if (!rawItems || rawItems.length === 0) {
    return [
      {
        id: "item-0-unit-0",
        itemIndex: 0,
        unitIndex: 0,
        totalUnitsInRow: 1,
        type: "INVERTER",
        brand: fallbackBrand,
        model: fallbackModel,
        serial: fallbackSerial,
        size: "",
        remark: "",
        displayTitle: fallbackBrand || fallbackModel
          ? `รายการที่ 1: ${fallbackBrand} ${fallbackModel}`.trim()
          : "รายการที่ 1: INVERTER",
      },
    ];
  }

  const result: NormalizedRepairItem[] = [];

  rawItems.forEach((item: any, itemIndex: number) => {
    const qty = Math.max(1, parseInt(String(item?.qty || 1), 10) || 1);
    const rawSerial = String(item?.serial || "").trim();
    // Split serial if comma, slash, semicolon, or newline separated
    const serialParts = rawSerial
      ? rawSerial.split(/[,/;\r\n]+/).map((s: string) => s.trim()).filter(Boolean)
      : [];

    if (qty > 1) {
      for (let u = 0; u < qty; u++) {
        let uSerial = "";
        if (serialParts.length > u) {
          uSerial = serialParts[u];
        } else if (rawSerial) {
          uSerial = `${rawSerial} (ตัวที่ ${u + 1}/${qty})`;
        }

        const brand = item?.brand || "";
        const model = item?.model || "";
        const title = `รายการที่ ${result.length + 1}: ${brand || "INVERTER"} ${model} (ตัวที่ ${u + 1}/${qty})`.trim();

        result.push({
          id: `item-${itemIndex}-unit-${u}`,
          itemIndex,
          unitIndex: u,
          totalUnitsInRow: qty,
          type: item?.type || "INVERTER",
          brand,
          model,
          serial: uSerial,
          size: item?.size || "",
          remark: item?.remark || "",
          displayTitle: title,
        });
      }
    } else {
      const brand = item?.brand || "";
      const model = item?.model || "";
      const title = `รายการที่ ${result.length + 1}: ${brand || "INVERTER"} ${model}`.trim();

      result.push({
        id: `item-${itemIndex}-unit-0`,
        itemIndex,
        unitIndex: 0,
        totalUnitsInRow: 1,
        type: item?.type || "INVERTER",
        brand,
        model,
        serial: rawSerial,
        size: item?.size || "",
        remark: item?.remark || "",
        displayTitle: title,
      });
    }
  });

  return result.length > 0
    ? result
    : [
        {
          id: "item-0-unit-0",
          itemIndex: 0,
          unitIndex: 0,
          totalUnitsInRow: 1,
          type: "INVERTER",
          brand: fallbackBrand,
          model: fallbackModel,
          serial: fallbackSerial,
          size: "",
          remark: "",
          displayTitle: "รายการที่ 1: INVERTER",
        },
      ];
}

export function createDefaultItemQc(
  target: NormalizedRepairItem,
  fallback?: Partial<InverterQcItemData>
): InverterQcItemData {
  return {
    inverterBrand: fallback?.inverterBrand !== undefined ? fallback.inverterBrand : (target.brand || ""),
    inverterModel: fallback?.inverterModel !== undefined ? fallback.inverterModel : (target.model || ""),
    serialNumber: fallback?.serialNumber !== undefined ? fallback.serialNumber : (target.serial || ""),

    // 1. Input Voltage
    inputVoltage: {
      dcSinglePhase: {
        checked: fallback?.inputVoltage?.dcSinglePhase?.checked ?? false,
        value: fallback?.inputVoltage?.dcSinglePhase?.value || "",
      },
      acSinglePhase: {
        checked: fallback?.inputVoltage?.acSinglePhase?.checked ?? false,
        value: fallback?.inputVoltage?.acSinglePhase?.value || "",
      },
      acThreePhase: {
        checked: fallback?.inputVoltage?.acThreePhase?.checked ?? false,
        rs: fallback?.inputVoltage?.acThreePhase?.rs || "",
        rt: fallback?.inputVoltage?.acThreePhase?.rt || "",
        st: fallback?.inputVoltage?.acThreePhase?.st || "",
      },
    },

    // 2. Output Voltage
    outputVoltage: {
      singlePhaseLN: {
        checked: fallback?.outputVoltage?.singlePhaseLN?.checked ?? false,
        value: fallback?.outputVoltage?.singlePhaseLN?.value || "",
      },
      threePhase220: {
        checked: fallback?.outputVoltage?.threePhase220?.checked ?? false,
        uv: fallback?.outputVoltage?.threePhase220?.uv || "",
        uw: fallback?.outputVoltage?.threePhase220?.uw || "",
        vw: fallback?.outputVoltage?.threePhase220?.vw || "",
      },
      threePhase380: {
        checked: fallback?.outputVoltage?.threePhase380?.checked ?? false,
        uv: fallback?.outputVoltage?.threePhase380?.uv || "",
        uw: fallback?.outputVoltage?.threePhase380?.uw || "",
        vw: fallback?.outputVoltage?.threePhase380?.vw || "",
      },
    },

    // 3. Control Circuit
    controlCircuit: {
      control24Vdc: {
        checked: fallback?.controlCircuit?.control24Vdc?.checked ?? false,
        x1: fallback?.controlCircuit?.control24Vdc?.x1 || "",
        x2: fallback?.controlCircuit?.control24Vdc?.x2 || "",
        x3: fallback?.controlCircuit?.control24Vdc?.x3 || "",
        x4: fallback?.controlCircuit?.control24Vdc?.x4 || "",
        x5: fallback?.controlCircuit?.control24Vdc?.x5 || "",
      },
      testAcDuration: {
        checked: fallback?.controlCircuit?.testAcDuration?.checked ?? false,
        minutes: fallback?.controlCircuit?.testAcDuration?.minutes || "",
      },
      testDcDuration: {
        checked: fallback?.controlCircuit?.testDcDuration?.checked ?? false,
        minutes: fallback?.controlCircuit?.testDcDuration?.minutes || "",
      },
      testAcDcDuration: {
        checked: fallback?.controlCircuit?.testAcDcDuration?.checked ?? false,
        minutes: fallback?.controlCircuit?.testAcDcDuration?.minutes || "",
      },
    },

    // 4. Parameter Setting
    parameterSetting: {
      keepCustomerOriginal: fallback?.parameterSetting?.keepCustomerOriginal ?? false,
      setNewForCustomer: fallback?.parameterSetting?.setNewForCustomer ?? false,
    },

    // 5. Visual Checks
    visualChecks: {
      screwsAndPartsComplete: fallback?.visualChecks?.screwsAndPartsComplete ?? false,
      fanExhaustDirectionCorrect: fallback?.visualChecks?.fanExhaustDirectionCorrect ?? false,
      controlWiringNormal: fallback?.visualChecks?.controlWiringNormal ?? false,
      diodeConversionCorrect: fallback?.visualChecks?.diodeConversionCorrect ?? false,
    },

    // 6. Parameter Rows (6 rows minimum)
    parameterRows:
      fallback?.parameterRows && fallback.parameterRows.length >= 6
        ? [...fallback.parameterRows]
        : [
            fallback?.parameterRows?.[0] || "",
            fallback?.parameterRows?.[1] || "",
            fallback?.parameterRows?.[2] || "",
            fallback?.parameterRows?.[3] || "",
            fallback?.parameterRows?.[4] || "",
            fallback?.parameterRows?.[5] || "",
          ],

    // 7. Notes
    notes: fallback?.notes || "",
  };
}

export function buildMultiItemQcData(order: any, fallbackInspectorName?: string) {
  const targetItems = extractQcItems(order);
  const rootQc: any = order?.inverterQc || {};

  const common: CommonQcData = {
    receiveDate:
      rootQc.receiveDate ||
      (order?.receivedDate
        ? new Date(order.receivedDate).toISOString().split("T")[0]
        : order?.createdAt
        ? new Date(order.createdAt).toISOString().split("T")[0]
        : ""),
    workType: rootQc.workType || order?.workType || order?.job?.jobType || "งานซ่อม INVERTER",
    customerName: rootQc.customerName || order?.customerCompany || order?.job?.customerName || "",
    inspectorName:
      rootQc.inspectorName ||
      fallbackInspectorName ||
      order?.technicianName ||
      order?.job?.assignedToName ||
      "",
    inspectorSignatureUrl: rootQc.inspectorSignatureUrl || undefined,
    inspectorDate: rootQc.inspectorDate || new Date().toISOString().split("T")[0],
    reviewerName: rootQc.reviewerName || "",
    reviewerSignatureUrl: rootQc.reviewerSignatureUrl || undefined,
    reviewerDate: rootQc.reviewerDate || new Date().toISOString().split("T")[0],
    formRev: "QC-EN-01/Rev.00",
  };

  const savedItemsQc: any[] = Array.isArray(rootQc.itemsQc)
    ? rootQc.itemsQc
    : rootQc.itemsQc && typeof rootQc.itemsQc === "object"
    ? Object.values(rootQc.itemsQc)
    : [];

  const itemsQc: InverterQcItemData[] = targetItems.map((target, idx) => {
    // 1) Specific item in itemsQc array
    if (savedItemsQc[idx]) {
      return createDefaultItemQc(target, savedItemsQc[idx]);
    }
    // 2) Item 0 legacy root structure
    if (idx === 0 && (rootQc.inputVoltage || rootQc.outputVoltage)) {
      return createDefaultItemQc(target, rootQc);
    }
    // 3) Other items inherit test measurements & settings from rootQc if available
    if (rootQc.inputVoltage || rootQc.outputVoltage) {
      return createDefaultItemQc(target, {
        ...rootQc,
        inverterBrand: target.brand || rootQc.inverterBrand,
        inverterModel: target.model || rootQc.inverterModel,
        serialNumber: target.serial || "",
      });
    }
    // 4) Fresh item
    return createDefaultItemQc(target);
  });

  return {
    targetItems,
    common,
    itemsQc,
  };
}
