import { teraDb } from '@/app/lib/teraDb';

/**
 * Returns all active subordinate emp_ids under `supervisorEmpId` across up to 3 hierarchy levels
 * (both direct `supervisor_id` chain and `secondary_supervisor_id` matching `supervisorEmpId`).
 */
export async function getRecursiveSubordinateEmpIds(supervisorEmpId?: string | null): Promise<string[]> {
  if (!supervisorEmpId) return [];
  const rootId = supervisorEmpId.trim();
  if (!rootId) return [];

  try {
    const tier1 = await teraDb.employees.findMany({
      where: {
        is_active: true,
        OR: [
          { supervisor_id: rootId },
          { secondary_supervisor_id: rootId },
        ],
      },
      select: { emp_id: true, supervisor_id: true },
    });

    const collected = new Set<string>();
    let frontier: string[] = [];

    for (const emp of tier1) {
      if (!emp.emp_id || emp.emp_id === rootId) continue;
      collected.add(emp.emp_id);
      if (emp.supervisor_id === rootId) {
        frontier.push(emp.emp_id);
      }
    }

    // Traverse up to 2 more levels (e.g., Head of Sales & Marketing -> Branch/Marketing Manager -> Staff)
    for (let depth = 0; depth < 2 && frontier.length > 0; depth++) {
      const nextTier = await teraDb.employees.findMany({
        where: {
          is_active: true,
          supervisor_id: { in: frontier },
        },
        select: { emp_id: true },
      });

      const nextFrontier: string[] = [];
      for (const emp of nextTier) {
        if (!emp.emp_id || emp.emp_id === rootId || collected.has(emp.emp_id)) continue;
        collected.add(emp.emp_id);
        nextFrontier.push(emp.emp_id);
      }
      frontier = nextFrontier;
    }

    return Array.from(collected);
  } catch (err) {
    console.warn('Failed to fetch recursive subordinate empIds from HR DB:', err);
    return [];
  }
}

/**
 * Returns full active employee records (with departments & job_positions) for all direct and indirect subordinates.
 */
export async function getRecursiveSubordinateEmployees(supervisorEmpId?: string | null) {
  const empIds = await getRecursiveSubordinateEmpIds(supervisorEmpId);
  if (empIds.length === 0) return [];

  try {
    return await teraDb.employees.findMany({
      where: {
        emp_id: { in: empIds },
        is_active: true,
      },
      include: {
        departments: true,
        job_positions: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  } catch (err) {
    console.warn('Failed to fetch recursive subordinate employees from HR DB:', err);
    return [];
  }
}

