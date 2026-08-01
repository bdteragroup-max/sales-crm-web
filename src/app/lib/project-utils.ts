export function calculateProjectProgress(project: any): number {
  if (!project) return 0;

  // 1. Calculate task progress
  let taskProgress = 0;
  let hasTasks = false;
  const tasks = project.tasks || [];
  if (tasks.length > 0) {
    hasTasks = true;
    const totalWeight = tasks.reduce((sum: number, t: any) => sum + (t.weight || 1), 0);
    const weightedProgress = tasks.reduce((sum: number, t: any) => sum + ((t.actualPct || 0) * (t.weight || 1)), 0);
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

  const safeParse = (val: any) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return {}; }
    }
    return val || {};
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
    
    const isItemCompleted = (key: string, checkObj: any) => {
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
