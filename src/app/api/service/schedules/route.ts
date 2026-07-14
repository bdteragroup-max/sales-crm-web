import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

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

    // Fetch users with service-related roles
    // Fetch users with exactly the requested service roles
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

    return NextResponse.json({ users: serviceUsers, holidays, leaveRequests });
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
    const { userId, date, status, jobType, jobDescription, duration, province } = body;

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

    // Upsert the schedule
    const schedule = await prisma.serviceSchedule.upsert({
      where: {
        userId_date: {
          userId,
          date: scheduleDate
        }
      },
      update: {
        status,
        jobType: jobType || null,
        jobDescription: jobDescription || null,
        duration: duration || null,
        province: province || null,
      },
      create: {
        userId,
        date: scheduleDate,
        status,
        jobType: jobType || null,
        jobDescription: jobDescription || null,
        duration: duration || null,
        province: province || null,
      }
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Error saving service schedule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
