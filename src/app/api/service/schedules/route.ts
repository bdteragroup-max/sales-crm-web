import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";

function normalizeTechName(name: string): string {
  return name
    .replace(/^(นาย|นางสาว|นาง|น\.ส\.)\s*/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function toBkkDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toBkkTime(date: Date): string {
  const formatted = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return formatted === "24:00" ? "00:00" : formatted;
}

function expandDateKeysWithinRange(
  startKey: string,
  endKey: string,
  minKey: string,
  maxKey: string
): string[] {
  const clampedStart = startKey < minKey ? minKey : startKey;
  const clampedEnd = endKey > maxKey ? maxKey : endKey;
  if (clampedStart > clampedEnd) return [];

  const keys: string[] = [];
  const cur = new Date(`${clampedStart}T00:00:00Z`);
  const end = new Date(`${clampedEnd}T00:00:00Z`);
  let guard = 0;

  while (cur <= end && guard < 62) {
    keys.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard += 1;
  }
  return keys;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: "Missing startDate or endDate" }, { status: 400 });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const bkkRangeStart = new Date(`${startDateStr}T00:00:00+07:00`);
    const bkkRangeEnd = new Date(`${endDateStr}T23:59:59.999+07:00`);

    // Fetch users with service-related roles
    const serviceUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: [
            'Service Engineer', 
            'Service Engineer MGR.', 
            'Service Engineer Manager',
            'Service', 
            'Service staff',
            'Service Staff'
          ]
        }
      },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        role: true,
        serviceSchedules: {
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    // Fetch nicknames from employees table
    const employeeIds = serviceUsers.map(u => u.employeeId).filter(Boolean) as string[];
    const employeesData = await prisma.employees.findMany({
      where: {
        emp_id: {
          in: employeeIds
        }
      },
      select: {
        emp_id: true,
        nickname: true
      }
    });

    const nicknameMap = new Map(employeesData.map(e => [e.emp_id, e.nickname]));
    
    const usersWithNicknames = serviceUsers.map(u => ({
      ...u,
      nickname: u.employeeId ? nicknameMap.get(u.employeeId) || null : null
    }));

    const holidays = await prisma.holidays.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const leaveRequests = await prisma.leave_requests.findMany({
      where: {
        start_date: { lte: endDate },
        end_date: { gte: startDate },
        status: { in: ['approved', 'pending'] }
      }
    });

    // Fetch installation orders overlapping the BKK date range
    const rawInstallations = await prisma.installationOrder.findMany({
      where: {
        status: { not: 'ยกเลิก - PO' },
        OR: [
          {
            plannedStartDate: { not: null, lte: bkkRangeEnd },
            OR: [
              { plannedEndDate: { gte: bkkRangeStart } },
              { plannedEndDate: null, plannedStartDate: { gte: bkkRangeStart } },
            ],
          },
          {
            plannedStartDate: null,
            installationDate: { gte: bkkRangeStart, lte: bkkRangeEnd },
          },
        ],
      },
      select: {
        id: true,
        installationNo: true,
        jobId: true,
        company: true,
        customer: true,
        jobName: true,
        technician: true,
        technicianUserId: true,
        technicianPhone: true,
        installationDate: true,
        plannedStartDate: true,
        plannedEndDate: true,
        workLocation: true,
        siteAddress: true,
        workPlan: true,
        technicianNote: true,
        status: true,
        job: {
          select: {
            jobNumber: true,
            sellerName: true,
          },
        },
      },
      orderBy: [{ plannedStartDate: 'asc' }, { installationDate: 'asc' }],
    });

    const userIdsSet = new Set(usersWithNicknames.map(u => u.id));
    const userByNormalizedName = new Map<string, string>();
    for (const u of usersWithNicknames) {
      const norm = normalizeTechName(u.fullName);
      if (norm) userByNormalizedName.set(norm, u.id);
    }

    const installationOrders = rawInstallations
      .map(order => {
        const isPlanned = Boolean(order.plannedStartDate);
        const effectiveStart = order.plannedStartDate || order.installationDate;
        if (!effectiveStart) return null;

        const effectiveEnd = isPlanned ? (order.plannedEndDate || order.plannedStartDate) : order.installationDate;
        const startDateKey = toBkkDateKey(effectiveStart);
        const endDateKey = effectiveEnd ? toBkkDateKey(effectiveEnd) : startDateKey;
        const dateKeys = expandDateKeysWithinRange(startDateKey, endDateKey, startDateStr, endDateStr);
        if (dateKeys.length === 0) return null;

        const matchedSet = new Set<string>();
        if (order.technicianUserId && userIdsSet.has(order.technicianUserId)) {
          matchedSet.add(order.technicianUserId);
        }
        if (order.technician) {
          const parts = order.technician.split(/[,/]/).map(s => s.trim()).filter(Boolean);
          for (const part of parts) {
            const matchedId = userByNormalizedName.get(normalizeTechName(part));
            if (matchedId) matchedSet.add(matchedId);
          }
        }

        return {
          id: order.id,
          installationNo: order.installationNo,
          jobId: order.jobId,
          jobNumber: order.job?.jobNumber || null,
          sellerName: order.job?.sellerName || null,
          company: order.company || order.customer || '-',
          jobName: order.jobName || '-',
          technician: order.technician || null,
          technicianPhone: order.technicianPhone || null,
          status: order.status,
          isPlanned,
          plannedStartDate: order.plannedStartDate ? order.plannedStartDate.toISOString() : null,
          plannedEndDate: order.plannedEndDate ? order.plannedEndDate.toISOString() : null,
          installationDate: order.installationDate ? order.installationDate.toISOString() : null,
          startDateKey,
          endDateKey,
          dateKeys,
          startTimeBkk: toBkkTime(effectiveStart),
          endTimeBkk: effectiveEnd && isPlanned ? toBkkTime(effectiveEnd) : null,
          workLocation: order.workLocation || order.siteAddress || null,
          workPlan: order.workPlan || null,
          technicianNote: order.technicianNote || null,
          matchedUserIds: Array.from(matchedSet),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({
      users: usersWithNicknames,
      holidays,
      leaveRequests,
      installationOrders,
    });
  } catch (error) {
    console.error("Error fetching service schedules:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, userId, date, status, jobType, jobDescription, duration, province } = body;

    if (!userId || !date || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (status === 'ออกต่างจังหวัด' && !province) {
      return NextResponse.json({ error: "Province is required when status is 'ออกต่างจังหวัด'" }, { status: 400 });
    }

    const roleStr = (user.role || '').toLowerCase();
    const isManager = roleStr.includes('manager') || roleStr.includes('ผู้จัดการ') || roleStr === 'แอดมิน' || roleStr === 'หัวหน้า';
    const isWatthika = user.employeeId === 'TP65004';
    
    // Check permissions
    if (user.id !== userId && !isManager && !isWatthika) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own schedule" }, { status: 403 });
    }

    const scheduleDate = new Date(date);

    let schedule;
    if (id) {
      schedule = await prisma.serviceSchedule.update({
        where: { id },
        data: {
          status,
          jobType: jobType || null,
          jobDescription: jobDescription || null,
          duration: duration || null,
          province: province || null,
        }
      });
    } else {
      schedule = await prisma.serviceSchedule.create({
        data: {
          userId,
          date: scheduleDate,
          status,
          jobType: jobType || null,
          jobDescription: jobDescription || null,
          duration: duration || null,
          province: province || null,
        }
      });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Error saving service schedule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing schedule id" }, { status: 400 });
    }

    const schedule = await prisma.serviceSchedule.findUnique({
      where: { id }
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const roleStr = (user.role || '').toLowerCase();
    const isManager = roleStr.includes('manager') || roleStr.includes('ผู้จัดการ') || roleStr === 'แอดมิน' || roleStr === 'หัวหน้า';
    const isWatthika = user.employeeId === 'TP65004';
    
    // Check permissions
    if (user.id !== schedule.userId && !isManager && !isWatthika) {
      return NextResponse.json({ error: "Forbidden: You can only delete your own schedule" }, { status: 403 });
    }

    await prisma.serviceSchedule.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service schedule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
