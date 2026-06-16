"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";
import { startOfWeek, endOfWeek, subDays, startOfDay, endOfDay } from "date-fns";

export async function saveDailyLog(projectId: string, data: any) {
  try {
    const {
      date,
      reportedBy,
      weather,
      temperature,
      workerCount,
      workerNote,
      workSummary,
      issues,
      solutions,
      nextPlan,
      safetyNote,
      incidents,
      taskUpdates,
      imageUrls,
      reporterSigUrl,
      supervisorSigUrl,
      supervisorName,
      delayCause,
      delayResponsible,
      delayExpectedDate,
      delaySeverity,
      tasksPerformed,
      workers,
    } = data;

    // Save Daily Log
    const logDate = new Date(date);
    
    // Check if log already exists for this date and user
    let log = await prisma.projectDailyLog.findUnique({
      where: {
        projectId_date_reportedBy: {
          projectId,
          date: logDate,
          reportedBy,
        }
      }
    });

    if (log) {
      log = await prisma.projectDailyLog.update({
        where: { id: log.id },
        data: {
          weather,
          temperature,
          workerCount,
          workerNote,
          workSummary,
          issues,
          solutions,
          nextPlan,
          safetyNote,
          incidents,
          taskUpdates,
          imageUrls,
          reporterSigUrl,
          supervisorSigUrl,
          supervisorName,
          delayCause,
          delayResponsible,
          delayExpectedDate: delayExpectedDate ? new Date(delayExpectedDate) : null,
          delaySeverity,
          tasksPerformed,
          workers: workers && Array.isArray(workers) ? {
            deleteMany: {},
            create: workers.map((w: any) => ({
              name: w.name,
              position: w.position,
              hours: w.hours ? Number(w.hours) : null,
              status: w.status || 'มาทำงาน',
              notes: w.notes
            }))
          } : undefined,
        }
      });
    } else {
      log = await prisma.projectDailyLog.create({
        data: {
          projectId,
          reportedBy,
          date: logDate,
          weather,
          temperature,
          workerCount,
          workerNote,
          workSummary,
          issues,
          solutions,
          nextPlan,
          safetyNote,
          incidents,
          taskUpdates,
          imageUrls,
          reporterSigUrl,
          supervisorSigUrl,
          supervisorName,
          delayCause,
          delayResponsible,
          delayExpectedDate: delayExpectedDate ? new Date(delayExpectedDate) : null,
          delaySeverity,
          tasksPerformed,
          workers: workers && Array.isArray(workers) ? {
            create: workers.map((w: any) => ({
              name: w.name,
              position: w.position,
              hours: w.hours ? Number(w.hours) : null,
              status: w.status || 'มาทำงาน',
              notes: w.notes
            }))
          } : undefined,
        }
      });
    }

    // Process Task Updates
    if (taskUpdates && Array.isArray(taskUpdates)) {
      for (const update of taskUpdates) {
        if (update.taskId && typeof update.actualPct === 'number') {
          await prisma.projectTask.update({
            where: { id: update.taskId },
            data: { actualPct: update.actualPct }
          });
        }
      }
    }

    // Trigger revalidation for S-Curve chart
    revalidatePath(`/projects/${projectId}`);
    return { success: true, log };
  } catch (error: any) {
    console.error("saveDailyLog error:", error);
    return { success: false, error: error.message };
  }
}

export async function getDailyLog(projectId: string, date: Date, reportedBy?: string) {
  try {
    // If reportedBy is provided, we try to find that specific user's log.
    // If not, we just return the first log for that day (useful for pre-filling when only one person reports).
    const queryDate = startOfDay(date);
    
    let whereClause: any = {
      projectId,
      date: queryDate,
    };
    
    if (reportedBy) {
      whereClause.reportedBy = reportedBy;
    }

    const log = await prisma.projectDailyLog.findFirst({
      where: whereClause,
      include: {
        reporter: {
          select: { fullName: true }
        },
        workers: true,
      }
    });

    return log;
  } catch (error) {
    console.error("getDailyLog error:", error);
    return null;
  }
}

export async function getWeeklyReport(projectId: string, weekStart: Date) {
  try {
    const start = startOfWeek(new Date(weekStart), { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(new Date(weekStart), { weekStartsOn: 1 }); // Sunday

    const logs = await prisma.projectDailyLog.findMany({
      where: {
        projectId,
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        reporter: {
          select: { fullName: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    // We also need project and tasks info for the report
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: true,
        manager: {
          select: { fullName: true }
        }
      }
    });

    return {
      success: true,
      logs,
      project
    };
  } catch (error: any) {
    console.error("getWeeklyReport error:", error);
    return { success: false, error: error.message };
  }
}
