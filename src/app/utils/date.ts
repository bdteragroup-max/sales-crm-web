export function addWorkingDays(startDate: Date, days: number, holidayDates: Date[] = []): Date {
  let result = new Date(startDate);
  let daysAdded = 0;
  
  // Normalize holidays to timestamp for easy comparison (strip time)
  const holidayTimestamps = holidayDates.map(d => {
    const norm = new Date(d);
    norm.setHours(0, 0, 0, 0);
    return norm.getTime();
  });

  // Start calculation from midnight to avoid timezone shift issues
  result.setHours(0, 0, 0, 0);

  while (daysAdded < days) {
    result.setDate(result.getDate() + 1);
    
    const dayOfWeek = result.getDay();
    const resultTime = result.getTime();
    
    // Skip Sundays (0) and holidays
    if (dayOfWeek !== 0 && !holidayTimestamps.includes(resultTime)) {
      daysAdded++;
    }
  }
  
  return result;
}
