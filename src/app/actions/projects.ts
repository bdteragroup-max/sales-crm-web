"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";

export async function createProject(data: any) {
  try {
    // Generate a default project number if not provided
    const projectNumber = data.projectNumber || `PJ${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const project = await prisma.project.create({
      data: {
        ...data,
        projectNumber,
      },
    });
    
    // Automatically add the manager as a member if provided
    if (data.managerId) {
      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: data.managerId,
          role: "manager"
        }
      });
    }

    revalidatePath("/projects");
    return project;
  } catch (error) {
    console.error("Error creating project:", error);
    throw new Error("Failed to create project");
  }
}

export async function updateProject(id: string, data: any) {
  try {
    const project = await prisma.project.update({
      where: { id },
      data,
    });
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return project;
  } catch (error) {
    console.error("Error updating project:", error);
    throw new Error("Failed to update project");
  }
}

export async function deleteProject(id: string) {
  try {
    await prisma.project.delete({
      where: { id },
    });
    revalidatePath("/projects");
  } catch (error) {
    console.error("Error deleting project:", error);
    throw new Error("Failed to delete project");
  }
}

export async function addProjectMember(projectId: string, userId: string, role: string) {
  try {
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role,
      },
    });
    revalidatePath(`/projects/${projectId}`);
    return member;
  } catch (error) {
    console.error("Error adding project member:", error);
    throw new Error("Failed to add project member");
  }
}

export async function removeProjectMember(projectId: string, userId: string) {
  try {
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
    revalidatePath(`/projects/${projectId}`);
  } catch (error) {
    console.error("Error removing project member:", error);
    throw new Error("Failed to remove project member");
  }
}

export async function createTask(projectId: string, data: any) {
  try {
    const task = await prisma.projectTask.create({
      data: {
        ...data,
        projectId,
      },
    });
    revalidatePath(`/projects/${projectId}`);
    return task;
  } catch (error) {
    console.error("Error creating task:", error);
    throw new Error("Failed to create task");
  }
}

export async function updateTask(taskId: string, data: any) {
  try {
    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data,
    });
    revalidatePath(`/projects/${task.projectId}`);
    return task;
  } catch (error) {
    console.error("Error updating task:", error);
    throw new Error("Failed to update task");
  }
}

export async function deleteTask(taskId: string) {
  try {
    const task = await prisma.projectTask.delete({
      where: { id: taskId },
    });
    revalidatePath(`/projects/${task.projectId}`);
    return task;
  } catch (error) {
    console.error("Error deleting task:", error);
    throw new Error("Failed to delete task");
  }
}

export async function updateTaskStatus(taskId: string, status: string) {
  try {
    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data: { status },
    });
    revalidatePath(`/projects/${task.projectId}`);
    return task;
  } catch (error) {
    console.error("Error updating task status:", error);
    throw new Error("Failed to update task status");
  }
}

export async function updateTaskProgress(taskId: string, actualPct: number) {
  try {
    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data: { actualPct },
    });
    revalidatePath(`/projects/${task.projectId}`);
    return task;
  } catch (error) {
    console.error("Error updating task progress:", error);
    throw new Error("Failed to update task progress");
  }
}

export async function createProjectEquipment(projectId: string, data: any) {
  try {
    const equipment = await prisma.projectEquipment.create({
      data: {
        ...data,
        projectId,
      },
    });
    revalidatePath(`/projects/${projectId}`);
    return equipment;
  } catch (error) {
    console.error("Error creating equipment:", error);
    throw new Error("Failed to create equipment");
  }
}

export async function updateProjectEquipment(id: string, data: any) {
  try {
    const equipment = await prisma.projectEquipment.update({
      where: { id },
      data,
    });
    revalidatePath(`/projects/${equipment.projectId}`);
    return equipment;
  } catch (error) {
    console.error("Error updating equipment:", error);
    throw new Error("Failed to update equipment");
  }
}

export async function deleteProjectEquipment(id: string) {
  try {
    const equipment = await prisma.projectEquipment.delete({
      where: { id },
    });
    revalidatePath(`/projects/${equipment.projectId}`);
    return equipment;
  } catch (error) {
    console.error("Error deleting equipment:", error);
    throw new Error("Failed to delete equipment");
  }
}
