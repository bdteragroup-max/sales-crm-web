"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";
import { createClient } from '@supabase/supabase-js';

import { sendPushToUser } from "@/app/lib/pushNotification";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function createTask(data: {
  taskType: string;
  title: string;
  description?: string;
  scheduledDate: Date;
  startTime?: string;
  endTime?: string;
  assignedBy: string;
  assignedByRole: string;
  technicianIds: string[];
  jobId?: string;
  projectId?: string;
  panelCount?: number;
  location?: string;
  isWarranty?: boolean;
}) {
  // Validate technicians have correct roles
  const technicians = await prisma.user.findMany({
    where: {
      id: { in: data.technicianIds }
    }
  });

  const validRoles = ['technician', 'ช่าง', 'ช่างประกอบ', 'ช่างตู้', 'ซ่อม'];
  const allValid = technicians.every(u => validRoles.some(role => (u.role || '').toLowerCase().includes(role)));

  if (technicians.length !== data.technicianIds.length || !allValid) {
    throw new Error("บางรายชื่อที่เลือกไม่ใช่ช่างเทคนิค หรือไม่มีสิทธิ์รับงานนี้");
  }

  const task = await prisma.technicianTask.create({
    data: {
      taskType: data.taskType,
      title: data.title,
      description: data.description,
      scheduledDate: data.scheduledDate,
      startTime: data.startTime,
      endTime: data.endTime,
      assignedBy: data.assignedBy,
      assignedByRole: data.assignedByRole,
      technicianIds: data.technicianIds,
      jobId: data.jobId,
      projectId: data.projectId,
      panelCount: data.panelCount,
      location: data.location,
      isWarranty: data.isWarranty ?? false,
    }
  });

  // Push Notification to assigned technicians
  for (const techId of data.technicianIds) {
    try {
      await sendPushToUser(techId, {
        title: "📋 งานใหม่ถูกมอบหมาย",
        body: `${data.title} — ${new Date(data.scheduledDate).toLocaleDateString('th-TH')} ${data.startTime ?? ''}`,
        url: `/technician/schedule?task=${task.id}`,
        category: "TASK_ASSIGNED"
      });
    } catch (e) {
      console.error("Push failed for user", techId, e);
    }
  }

  revalidatePath('/technician/schedule');
  return task;
}

export async function updateTask(taskId: string, data: any) {
  const task = await prisma.technicianTask.update({
    where: { id: taskId },
    data
  });
  revalidatePath('/technician/schedule');
  return task;
}

export async function completeTask(taskId: string, data: {
  completedNote?: string;
  photosBefore?: string[];
  photosAfter?: string[];
}) {
  const task = await prisma.technicianTask.update({
    where: { id: taskId },
    data: {
      status: "DONE",
      completedAt: new Date(),
      completedNote: data.completedNote,
      photosBefore: data.photosBefore,
      photosAfter: data.photosAfter
    }
  });
  revalidatePath('/technician/schedule');
  return task;
}

export async function uploadPhotos(formData: FormData) {
  const taskId = formData.get("taskId") as string;
  const type = formData.get("type") as "before" | "after"; // "before" or "after"
  const files = formData.getAll("file") as File[];

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const path = `technician-tasks/${taskId}/${type}/${filename}`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('uploadsService')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supabase.storage.from('uploadsService').getPublicUrl(uploadData.path);
    uploadedUrls.push(publicUrl);
  }

  return uploadedUrls;
}
