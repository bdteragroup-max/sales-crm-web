import { Prisma } from '@/generated/client';

export type UserContext = {
  id: string;
  role: string;
  departmentId?: string;
  employeeId?: string;
  employeeSale?: {
    department?: string | null;
  } | null;
};

/**
 * Returns the Prisma `where` clause for the Company model based on the user's role.
 * 
 * Rules:
 * - Admin / MD: See all companies
 * - Manager / Team Leader: See companies assigned to anyone in their department
 * - Salesperson (or others): See only companies assigned to themselves or unassigned
 */
export function getCompanyWhereClause(user: UserContext): Prisma.CompanyWhereInput {
  if (!user || !user.role) {
    // Fallback for unauthenticated or malformed users
    return { assignedUserId: 'none' };
  }

  const roleStr = user.role.toLowerCase();

  // 1. Admins and MDs see everything
  const isAdminOrMD = roleStr.includes('admin') || roleStr.includes('md') || roleStr.includes('managing director');
  if (isAdminOrMD) {
    return {};
  }

  // 2. Managers see everything in their department
  const isManager = roleStr.includes('manager') || roleStr.includes('ผู้จัดการ') || roleStr === 'md' || roleStr.includes('หัวหน้า');
  if (isManager) {
    const userDept = user.employeeSale?.department || '';
    if (userDept) {
      return {
        OR: [
          { assignedUserId: user.id }, // Directly assigned to them
          {
            assignedUser: {
              employeeSale: {
                department: userDept
              }
            }
          },
          { assignedUserId: null } // Unassigned companies are visible to everyone
        ]
      };
    } else {
       // If a manager has no department set, fallback to just seeing their own
       return {
        OR: [
          { assignedUserId: user.id },
          { assignedUserId: null }
        ]
      };
    }
  }

  // 3. Everyone else sees only what is assigned to them (or unassigned)
  return {
    OR: [
      { assignedUserId: user.id },
      { assignedUserId: null }
    ]
  };
}
