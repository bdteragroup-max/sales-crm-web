export interface ProjectAmountSource {
  amountBeforeVat?: unknown;
  amountIncludingVat?: unknown;
  projectValue?: unknown;
  job?: {
    quotation?: {
      actualClosingAmount?: unknown;
      totalAmountBeforeVat?: unknown;
      salesBeforeVat?: unknown;
    } | null;
  } | null;
}

export interface ResolvedProjectAmounts {
  beforeVat: number;
  vatAmount: number;
  includingVat: number;
}

function roundMoney2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Resolves authoritative pre-VAT, VAT 7%, and VAT-inclusive contract values for a Project.
 * Prioritizes explicit `amountBeforeVat`, then linked Quotation pre-VAT amount (for exact
 * pre-VAT recovery on legacy projects), and finally derives `incVat * 100 / 107`.
 */
export function resolveProjectAmounts(
  project?: ProjectAmountSource | null
): ResolvedProjectAmounts {
  if (!project) {
    return { beforeVat: 0, vatAmount: 0, includingVat: 0 };
  }

  const explicitBefore = Number(project.amountBeforeVat || 0);
  const rawInc =
    Number(project.amountIncludingVat || 0) > 0
      ? Number(project.amountIncludingVat)
      : Number(project.projectValue || 0);

  const qt = project.job?.quotation;
  const qtActual = Number(qt?.actualClosingAmount || 0);
  const qtTotal = Number(qt?.totalAmountBeforeVat || 0);
  const qtSales = Number(qt?.salesBeforeVat || 0);
  const qtBefore =
    qtActual > 0 && qtTotal > 0 && Math.abs(qtActual - qtTotal * 1.07) <= 2
      ? qtTotal
      : qtActual > 0
      ? qtActual
      : qtTotal > 0
      ? qtTotal
      : qtSales > 0
      ? qtSales
      : 0;

  let beforeVat = 0;
  let includingVat = 0;

  if (Number.isFinite(explicitBefore) && explicitBefore > 0) {
    beforeVat = roundMoney2(explicitBefore);
    includingVat =
      Number.isFinite(rawInc) && rawInc > 0
        ? roundMoney2(rawInc)
        : roundMoney2(beforeVat * 1.07);
  } else if (
    qtBefore > 0 &&
    (rawInc <= 0 ||
      Math.abs(rawInc - qtBefore * 1.07) <= 5 ||
      Math.abs(rawInc - qtBefore) <= 5)
  ) {
    beforeVat = roundMoney2(qtBefore);
    includingVat =
      rawInc > 0 ? roundMoney2(rawInc) : roundMoney2(beforeVat * 1.07);
  } else if (Number.isFinite(rawInc) && rawInc > 0) {
    includingVat = roundMoney2(rawInc);
    beforeVat = roundMoney2((rawInc * 100) / 107);
  } else if (qtBefore > 0) {
    beforeVat = roundMoney2(qtBefore);
    includingVat = roundMoney2(beforeVat * 1.07);
  }

  const vatAmount = roundMoney2(Math.max(0, includingVat - beforeVat));
  return { beforeVat, vatAmount, includingVat };
}

type ProgressTaskLike = {
  weight?: number | null;
  actualPct?: number | null;
};

type ProjectProgressSource = {
  tasks?: ProgressTaskLike[] | null;
  projectCategory?: string | null;
  preChecklist?: unknown;
  photoChecklist?: unknown;
  hvChecklist?: unknown;
  checklistImages?: unknown;
  isHighVoltage?: boolean | null;
};

export function calculateProjectProgress(project?: ProjectProgressSource | null): number {
  if (!project) return 0;

  // 1. Calculate task progress
  let taskProgress = 0;
  let hasTasks = false;
  const tasks = project.tasks || [];
  if (tasks.length > 0) {
    hasTasks = true;
    const totalWeight = tasks.reduce((sum: number, t) => sum + (t.weight || 1), 0);
    const weightedProgress = tasks.reduce((sum: number, t) => sum + ((t.actualPct || 0) * (t.weight || 1)), 0);
    taskProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
  }

  // 2. Calculate checklist progress
  let checklistProgress = 0;
  let hasChecklist = false;
  
  const isSolar = project.projectCategory === 'Solar Roof' || project.projectCategory === 'Solar Pump' || project.projectCategory === 'Solar';
  
  // Define items to check based on SolarChecklist.tsx
  const preWorkItems = [
    'verify_site', 'photos_before', 'ppe_check', 'toolbox_talk', 'tools_crane'
  ];
  
  const postInstallItems = [
    'install_site', 'pv_panel', 'inverter', 'ac_cabinet', 
    'connection_points', 'zero_export', 'protection_devices', 'overall'
  ];
  
  const hvItems = [
    'main_bus_bar', 'zero_export_hv', 'transformer', 'relay_breaker'
  ];

  const safeParse = (val: unknown): Record<string, unknown> => {
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    }
    return val && typeof val === 'object' ? (val as Record<string, unknown>) : {};
  };

  const preChecklist = safeParse(project.preChecklist);
  const photoChecklist = safeParse(project.photoChecklist);
  const hvChecklist = safeParse(project.hvChecklist);
  const checklistImages = safeParse(project.checklistImages);

  // Check if any checklist data exists at all
  if (isSolar || Object.keys(preChecklist).length > 0 || Object.keys(photoChecklist).length > 0 || Object.keys(checklistImages).length > 0) {
    hasChecklist = true;
    
    let totalItems = preWorkItems.length + postInstallItems.length;
    if (project.isHighVoltage) totalItems += hvItems.length;
    
    let completedItems = 0;
    
    const isItemCompleted = (key: string, checkObj: Record<string, unknown>) => {
      if (checkObj[key] === true || checkObj[key] === 'true') return true;
      const imgs = checklistImages[key];
      if (Array.isArray(imgs) && imgs.filter(Boolean).length > 0) return true;
      if (typeof imgs === 'string' && imgs.trim() !== '') return true;
      return false;
    };

    // Check Pre-Work items
    preWorkItems.forEach(key => {
      if (isItemCompleted(key, preChecklist)) completedItems++;
    });

    // Check Post-Install items
    postInstallItems.forEach(key => {
      if (isItemCompleted(key, photoChecklist)) completedItems++;
    });

    // Check HV items
    if (project.isHighVoltage) {
      hvItems.forEach(key => {
        if (isItemCompleted(key, hvChecklist)) completedItems++;
      });
    }
    
    checklistProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }

  // 3. Combine progress
  if (hasTasks && hasChecklist) {
    return Math.round((taskProgress + checklistProgress) / 2);
  } else if (hasChecklist) {
    return checklistProgress;
  } else if (hasTasks) {
    return taskProgress;
  }
  
  return 0;
}
