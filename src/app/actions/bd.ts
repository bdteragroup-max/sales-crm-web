"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { sendPushToUser } from "@/app/lib/pushNotification";

export async function getAllUsersForBD() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: 'asc' }
    });
    return { success: true, data: users };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: 'Failed to fetch users' };
  }
}

export async function seedBDWorkTypes() {
  const defaultTypes = [
    { name: 'EV', description: 'EV Charging Station Project' },
    { name: 'New Branch', description: 'New Branch Expansion' },
    { name: 'Factory', description: 'Factory Construction/Renovation' },
    { name: 'Dev', description: 'Software Development / Tech' },
    { name: 'Database Management', description: 'Data & Database Tasks' },
    { name: 'RFID', description: 'RFID System Implementation' },
    { name: 'Outsource', description: 'Outsourcing Tasks' },
    { name: 'Kaizen', description: 'Process Improvement (Kaizen)' }
  ];

  let count = 0;
  for (const type of defaultTypes) {
    const existing = await prisma.bDWorkType.findUnique({
      where: { name: type.name }
    });

    if (!existing) {
      await prisma.bDWorkType.create({
        data: type
      });
      count++;
    }
  }

  return { success: true, seededCount: count };
}

export async function getBDWorkTypes() {
  try {
    const types = await prisma.bDWorkType.findMany({
      include: {
        defaultTemplate: {
          select: { id: true, name: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: types };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to fetch work types' };
  }
}

export async function seedBDWorkflowTemplates() {
  try {
    const templates = [
      {
        name: 'New Branch Template',
        description: 'Standard procedure for opening a new branch',
        workTypeName: 'New Branch',
        steps: [
          { name: 'Coordinate with Manager', orderIndex: 1, checklist: [{ id: '1', label: 'Discuss branch objectives', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Survey', orderIndex: 2, checklist: [{ id: '1', label: 'Site visit', checked: false, checkedBy: null, checkedAt: null }, { id: '2', label: 'Competitor analysis', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Negotiate Rent', orderIndex: 3, checklist: [{ id: '1', label: 'Propose initial rate', checked: false, checkedBy: null, checkedAt: null }, { id: '2', label: 'Finalize agreement', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Request Documents', orderIndex: 4, checklist: [{ id: '1', label: 'Collect ID/Registration', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Sign Contract', orderIndex: 5, checklist: [{ id: '1', label: 'Sign physical contract', checked: false, checkedBy: null, checkedAt: null }] }
        ]
      },
      {
        name: 'EV Station Template',
        description: 'Standard procedure for EV Charging Station',
        workTypeName: 'EV',
        steps: [
          { name: 'Site Evaluation', orderIndex: 1, checklist: [{ id: '1', label: 'Power capacity check', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Permit Application', orderIndex: 2, checklist: [{ id: '1', label: 'Submit to local authority', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Installation', orderIndex: 3, checklist: [{ id: '1', label: 'Install charger', checked: false, checkedBy: null, checkedAt: null }] },
          { name: 'Testing', orderIndex: 4, checklist: [{ id: '1', label: 'System test run', checked: false, checkedBy: null, checkedAt: null }] }
        ]
      }
    ];

    let count = 0;
    for (const t of templates) {
      const existing = await prisma.bDWorkflowTemplate.findFirst({
        where: { name: t.name }
      });
      if (!existing) {
        const template = await prisma.bDWorkflowTemplate.create({
          data: {
            name: t.name,
            description: t.description,
            steps: {
              create: t.steps.map(s => ({
                name: s.name,
                orderIndex: s.orderIndex,
                checklist: s.checklist
              }))
            }
          }
        });

        // Link to work type
        const workType = await prisma.bDWorkType.findUnique({
          where: { name: t.workTypeName }
        });

        if (workType) {
          await prisma.bDWorkType.update({
            where: { id: workType.id },
            data: { defaultTemplateId: template.id }
          });
        }
        count++;
      }
    }
    return { success: true, seededCount: count };
  } catch (error) {
    console.error('Error seeding BD workflow templates:', error);
    return { success: false, error: 'Failed to seed workflow templates' };
  }
}

export async function getBDWorkflowTemplates() {
  try {
    const templates = await prisma.bDWorkflowTemplate.findMany({
      include: {
        steps: { orderBy: { orderIndex: 'asc' } },
        workTypes: true
      },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: templates };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to fetch templates' };
  }
}

export async function createBDProject(data: {
  name: string;
  objective?: string;
  workTypeId: string;
  customWorkType?: string;
  urgency: string;
  deadline?: Date;
  parentId?: string;
  intakeDate?: Date;
  color?: string;
  memberIds?: string[];
}) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    let finalWorkTypeId = data.workTypeId;

    if (data.workTypeId === 'OTHER' && data.customWorkType) {
      const trimmedName = data.customWorkType.trim();
      let wt = await prisma.bDWorkType.findUnique({ where: { name: trimmedName } });
      if (!wt) {
        wt = await prisma.bDWorkType.create({ data: { name: trimmedName } });
      }
      finalWorkTypeId = wt.id;
    }

    const project = await prisma.bDProject.create({
      data: {
        name: data.name,
        objective: data.objective,
        workTypeId: finalWorkTypeId,
        urgency: data.urgency,
        deadline: data.deadline || null,
        requesterId: user.id,
        ownerId: user.id,
        status: 'PENDING_REVIEW',
        parentId: data.parentId || null,
        intakeDate: data.intakeDate || null,
        color: data.color || null,
        members: {
          connect: data.memberIds?.map(id => ({ id })) || []
        }
      },
    });

    // Create an initial activity log for creation
    await prisma.bDActivity.create({
      data: {
        projectId: project.id,
        userId: user.id,
        action: 'PROJECT_CREATED',
        details: 'Project brief submitted and is pending review.',
      },
    });

    return { success: true, data: project };
  } catch (error) {
    console.error('Error creating BD project:', error);
    return { success: false, error: 'Failed to create BD project' };
  }
}

export async function getBDProjects() {
  try {
    const projects = await prisma.bDProject.findMany({
      include: {
        workType: true,
        requester: { select: { id: true, fullName: true, employeeId: true } },
        owner: { select: { id: true, fullName: true, employeeId: true } },
        members: { select: { id: true, fullName: true } },
        tasks: {
          orderBy: { orderIndex: 'asc' },
          include: { assignee: { select: { id: true, fullName: true } } }
        },
      },
      orderBy: { updatedAt: 'desc' }
    });
    return { success: true, data: projects };
  } catch (error) {
    console.error('Error fetching BD projects:', error);
    return { success: false, error: 'Failed to fetch BD projects' };
  }
}

export async function getParentBDProjects() {
  try {
    const projects = await prisma.bDProject.findMany({
      where: {
        parentId: null, // Only fetch root projects
        status: { in: ['PENDING_REVIEW', 'IN_PROGRESS', 'ON_HOLD'] }
      },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: projects };
  } catch (error) {
    console.error('Error fetching parent BD projects:', error);
    return { success: false, error: 'Failed to fetch parent BD projects' };
  }
}

export async function getBDKanbanProjects() {
  try {
    const activeProjects = await prisma.bDProject.findMany({
      where: {
        status: { in: ['PENDING_REVIEW', 'IN_PROGRESS', 'ON_HOLD'] },
        parentId: null
      },
      include: {
        workType: true,
        requester: { select: { id: true, fullName: true, employeeId: true } },
        owner: { select: { id: true, fullName: true, employeeId: true } },
        members: { select: { id: true, fullName: true } },
        tasks: {
          orderBy: { orderIndex: 'asc' },
          include: { assignee: { select: { id: true, fullName: true } } }
        },
        subProjects: {
          select: { id: true, status: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const completedProjects = await prisma.bDProject.findMany({
      where: {
        status: 'COMPLETED',
        parentId: null
      },
      include: {
        workType: true,
        requester: { select: { id: true, fullName: true, employeeId: true } },
        owner: { select: { id: true, fullName: true, employeeId: true } },
        members: { select: { id: true, fullName: true } },
        tasks: {
          orderBy: { orderIndex: 'asc' },
          include: { assignee: { select: { id: true, fullName: true } } }
        },
        subProjects: {
          select: { id: true, status: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 20
    });

    return { success: true, data: [...activeProjects, ...completedProjects] };
  } catch (error) {
    console.error('Error fetching Kanban projects:', error);
    return { success: false, error: 'Failed to fetch Kanban projects' };
  }
}

export async function getBDProjectDetails(id: string) {
  try {
    const project = await prisma.bDProject.findUnique({
      where: { id },
      include: {
        workType: true,
        requester: { select: { id: true, fullName: true, employeeId: true } },
        owner: { select: { id: true, fullName: true, employeeId: true } },
        members: { select: { id: true, fullName: true } },
        tasks: {
          orderBy: { orderIndex: 'asc' },
          include: { assignee: { select: { id: true, fullName: true } } }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, fullName: true } } }
        },
        parent: { select: { id: true, name: true, status: true } },
        subProjects: {
          include: {
            owner: { select: { id: true, fullName: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project) return { success: false, error: 'Project not found' };

    return { success: true, data: project };
  } catch (error) {
    console.error('Error fetching project details:', error);
    return { success: false, error: 'Failed to fetch project details' };
  }
}

export async function updateBDProject(id: string, data: {
  name?: string;
  objective?: string;
  workTypeId?: string;
  urgency?: string;
  status?: string;
  deadline?: Date | null;
  intakeDate?: Date | null;
  color?: string | null;
  completedAt?: Date | null;
  memberIds?: string[];
  tags?: string[];
}) {
  try {
    const { memberIds, ...restData } = data;
    const project = await prisma.bDProject.update({
      where: { id },
      data: {
        ...restData,
        ...(memberIds ? { members: { set: memberIds.map(id => ({ id })) } } : {})
      }
    });

    // Sync completion date to tasks
    if (data.status === 'COMPLETED' && data.completedAt) {
      await prisma.bDTask.updateMany({
        where: { projectId: id },
        data: {
          status: 'COMPLETED',
          completedAt: data.completedAt
        }
      });
    } else if (data.status === 'COMPLETED') {
      await prisma.bDTask.updateMany({
        where: { projectId: id, status: { not: 'COMPLETED' } },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });
    }

    // Resolve associated support ticket if the project is completed
    if (data.status === 'COMPLETED' && project.supportTicketId) {
      const user = await getUser();

      const ticketToResolve = await prisma.supportTicket.findUnique({ where: { id: project.supportTicketId } });
      if (ticketToResolve && ticketToResolve.status !== 'RESOLVED') {
        await prisma.supportTicket.update({
          where: { id: project.supportTicketId },
          data: {
            status: 'RESOLVED',
            progressPercent: 100,
            resolutionPlan: 'งานโปรเจกต์นี้ได้รับการดำเนินการเสร็จสิ้นแล้ว (Completed via BD Kanban)',
            resolvedAt: new Date()
          }
        });

        await prisma.ticketLog.create({
          data: {
            ticketId: project.supportTicketId,
            userId: user ? user.id : 'SYSTEM',
            action: 'RESOLVED',
            details: 'ปิดงานอัตโนมัติจาก BD Kanban'
          }
        });

        if (ticketToResolve.reporterId) {
          await prisma.notification.create({
            data: {
              userId: ticketToResolve.reporterId,
              title: 'ปัญหาของคุณได้รับการแก้ไขแล้ว',
              message: `ทิกเก็ต ${ticketToResolve.ticketNumber} ถูกแก้ไขเรียบร้อยแล้ว (Auto-resolved)`,
              type: 'SUPPORT_TICKET',
              linkUrl: `/support/tickets/${ticketToResolve.id}`,
            }
          });
        }
      }

    }

    // Also resolve any tickets attached to the tasks within this project
    if (data.status === 'COMPLETED') {
      const tasksWithTickets = await prisma.bDTask.findMany({
        where: { projectId: id, supportTicketId: { not: null } },
        select: { supportTicketId: true }
      });
      const user = await getUser();
      for (const t of tasksWithTickets) {
        if (t.supportTicketId) {

          const ticketToResolve = await prisma.supportTicket.findUnique({ where: { id: t.supportTicketId } });
          if (ticketToResolve && ticketToResolve.status !== 'RESOLVED') {
            await prisma.supportTicket.update({
              where: { id: t.supportTicketId },
              data: {
                status: 'RESOLVED',
                progressPercent: 100,
                resolutionPlan: 'งานย่อยของโปรเจกต์นี้ได้รับการดำเนินการเสร็จสิ้นแล้ว (Completed via BD Kanban)',
                resolvedAt: new Date()
              }
            });

            await prisma.ticketLog.create({
              data: {
                ticketId: t.supportTicketId,
                userId: user ? user.id : 'SYSTEM',
                action: 'RESOLVED',
                details: 'ปิดงานอัตโนมัติจาก BD Kanban'
              }
            });

            if (ticketToResolve.reporterId) {
              await prisma.notification.create({
                data: {
                  userId: ticketToResolve.reporterId,
                  title: 'ปัญหาของคุณได้รับการแก้ไขแล้ว',
                  message: `ทิกเก็ต ${ticketToResolve.ticketNumber} ถูกแก้ไขเรียบร้อยแล้ว (Auto-resolved)`,
                  type: 'SUPPORT_TICKET',
                  linkUrl: `/support/tickets/${ticketToResolve.id}`,
                }
              });
            }
          }

        }
      }
    }

    return { success: true, data: project };
  } catch (error) {
    console.error('Error updating project:', error);
    return { success: false, error: 'Failed to update project' };
  }
}

export async function deleteBDProject(id: string) {
  try {
    // Delete related tasks and activities first (cascade might not be configured)
    await prisma.bDTask.deleteMany({ where: { projectId: id } });
    await prisma.bDActivity.deleteMany({ where: { projectId: id } });
    await prisma.bDProject.delete({ where: { id } });

    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: 'Failed to delete project' };
  }
}

export async function acceptBDProject(projectId: string, templateId?: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const project = await prisma.bDProject.findUnique({
      where: { id: projectId },
      include: { workType: true }
    });

    if (!project) return { success: false, error: 'Project not found' };

    const finalTemplateId = templateId || project.workType?.defaultTemplateId;

    // Create the tasks if we have a template
    if (finalTemplateId) {
      const template = await prisma.bDWorkflowTemplate.findUnique({
        where: { id: finalTemplateId },
        include: { steps: { orderBy: { orderIndex: 'asc' } } }
      });

      if (template) {
        for (const step of template.steps) {
          await prisma.bDTask.create({
            data: {
              projectId: project.id,
              name: step.name,
              orderIndex: step.orderIndex,
              checklistState: step.checklist ? (step.checklist as any) : undefined,
              status: 'PENDING'
            }
          });
        }
      }
    }

    // Update project status to IN_PROGRESS and assign owner
    await prisma.bDProject.update({
      where: { id: projectId },
      data: {
        status: 'IN_PROGRESS',
        ownerId: user.id
      }
    });

    // Log Activity
    await prisma.bDActivity.create({
      data: {
        projectId,
        userId: user.id,
        action: 'PROJECT_ACCEPTED',
        details: finalTemplateId ? 'Project accepted and tasks generated from template.' : 'Project accepted (no template).'
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error accepting BD project:', error);
    return { success: false, error: 'Failed to accept project' };
  }
}

export async function updateBDTaskStatus(taskId: string, status: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const task = await prisma.bDTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null
      }
    });

    await prisma.bDActivity.create({
      data: {
        projectId: task.projectId,
        userId: user.id,
        action: 'TASK_STATUS_CHANGED',
        details: `Task "${task.name}" status updated to ${status}`
      }
    });

    if (status === 'COMPLETED' && task.supportTicketId) {

      const ticketToResolve = await prisma.supportTicket.findUnique({ where: { id: task.supportTicketId } });
      if (ticketToResolve && ticketToResolve.status !== 'RESOLVED') {
        await prisma.supportTicket.update({
          where: { id: task.supportTicketId },
          data: {
            status: 'RESOLVED',
            progressPercent: 100,
            resolutionPlan: 'งานย่อยนี้ได้รับการดำเนินการเสร็จสิ้นแล้ว (Completed via BD Task)',
            resolvedAt: new Date()
          }
        });

        await prisma.ticketLog.create({
          data: {
            ticketId: task.supportTicketId,
            userId: user ? user.id : 'SYSTEM',
            action: 'RESOLVED',
            details: 'ปิดงานอัตโนมัติจาก BD Task'
          }
        });

        if (ticketToResolve.reporterId) {
          await prisma.notification.create({
            data: {
              userId: ticketToResolve.reporterId,
              title: 'ปัญหาของคุณได้รับการแก้ไขแล้ว',
              message: `ทิกเก็ต ${ticketToResolve.ticketNumber} ถูกแก้ไขเรียบร้อยแล้ว (Auto-resolved)`,
              type: 'SUPPORT_TICKET',
              linkUrl: `/support/tickets/${ticketToResolve.id}`,
            }
          });
        }
      }

    }

    if (status === 'COMPLETED' || status === 'SKIPPED') {
      const allTasks = await prisma.bDTask.findMany({
        where: { projectId: task.projectId }
      });
      const allFinished = allTasks.every(t => t.status === 'COMPLETED' || t.status === 'SKIPPED');

      if (allFinished) {
        const project = await prisma.bDProject.findUnique({
          where: { id: task.projectId },
          include: { subProjects: true }
        });

        if (project && project.status !== 'COMPLETED' && project.status !== 'ON_HOLD') {
          const hasIncompleteSubProjects = project.subProjects && project.subProjects.some(sp => sp.status !== 'COMPLETED');
          if (!hasIncompleteSubProjects) {
            await prisma.bDProject.update({
              where: { id: project.id },
              data: { status: 'COMPLETED', completedAt: new Date() }
            });

            if (project.supportTicketId) {

              const ticketToResolve = await prisma.supportTicket.findUnique({ where: { id: project.supportTicketId } });
              if (ticketToResolve && ticketToResolve.status !== 'RESOLVED') {
                await prisma.supportTicket.update({
                  where: { id: project.supportTicketId },
                  data: {
                    status: 'RESOLVED',
                    progressPercent: 100,
                    resolutionPlan: 'งานโปรเจกต์นี้ได้รับการดำเนินการเสร็จสิ้นแล้ว (Completed via BD Kanban)',
                    resolvedAt: new Date()
                  }
                });

                await prisma.ticketLog.create({
                  data: {
                    ticketId: project.supportTicketId,
                    userId: user ? user.id : 'SYSTEM',
                    action: 'RESOLVED',
                    details: 'ปิดงานอัตโนมัติจาก BD Kanban'
                  }
                });

                if (ticketToResolve.reporterId) {
                  await prisma.notification.create({
                    data: {
                      userId: ticketToResolve.reporterId,
                      title: 'ปัญหาของคุณได้รับการแก้ไขแล้ว',
                      message: `ทิกเก็ต ${ticketToResolve.ticketNumber} ถูกแก้ไขเรียบร้อยแล้ว (Auto-resolved)`,
                      type: 'SUPPORT_TICKET',
                      linkUrl: `/support/tickets/${ticketToResolve.id}`,
                    }
                  });
                }
              }

            }
          }
        }
      }
    }

    return { success: true, data: task };
  } catch (error) {
    console.error('Error updating task status:', error);
    return { success: false, error: 'Failed to update task status' };
  }
}

export async function updateBDTaskChecklist(taskId: string, checklistState: any) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const task = await prisma.bDTask.update({
      where: { id: taskId },
      data: { checklistState }
    });

    // Optionally log activity, but checklist changes might be too noisy if logged every time.
    // Let's not log every single check box click.

    return { success: true, data: task };
  } catch (error) {
    console.error('Error updating task checklist:', error);
    return { success: false, error: 'Failed to update task checklist' };
  }
}

export async function updateBDTaskDueDate(taskId: string, dueDate: Date | null) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const task = await prisma.bDTask.update({
      where: { id: taskId },
      data: { dueDate }
    });

    await prisma.bDActivity.create({
      data: {
        projectId: task.projectId,
        userId: user.id,
        action: 'TASK_DUEDATE_CHANGED',
        details: `Due date for task "${task.name}" set to ${dueDate ? dueDate.toLocaleDateString() : 'None'}`
      }
    });

    return { success: true, data: task };
  } catch (error) {
    console.error('Error updating task due date:', error);
    return { success: false, error: 'Failed to update task due date' };
  }
}

export async function blockBDTask(taskId: string, blockedReason: string, waitingOn: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const oldTask = await prisma.bDTask.findUnique({ where: { id: taskId } });

    const task = await prisma.bDTask.update({
      where: { id: taskId },
      data: { blockedReason, waitingOn, blockedAt: new Date() }
    });

    await prisma.bDActivity.create({
      data: {
        projectId: task.projectId,
        userId: user.id,
        action: 'TASK_BLOCKED',
        details: `Task "${task.name}" marked as blocked. Reason: ${blockedReason}. Waiting on: ${waitingOn}`
      }
    });

    // --- Real-time LINE Alert for Blocked Tasks ---
    if (!oldTask?.blockedReason && blockedReason) {
      try {
        const config = await prisma.departmentLineConfig.findUnique({
          where: { department: "BD" }
        });
        if (config && config.isActive && config.lineGroupId) {
          const { pushLineMessage, bdTaskBlockedMessage } = await import("@/app/lib/lineNotify");
          const msg = bdTaskBlockedMessage({
            title: task.name,
            blockedReason: blockedReason
          });
          await pushLineMessage(config.lineGroupId, [msg], 'crm');
        }
      } catch (err) {
        console.error("Failed to send real-time blocked task alert", err);
      }
    }

    return { success: true, data: task };
  } catch (error) {
    console.error('Error blocking task:', error);
    return { success: false, error: 'Failed to block task' };
  }
}

export async function unblockBDTask(taskId: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const task = await prisma.bDTask.update({
      where: { id: taskId },
      data: { blockedReason: null, waitingOn: null, blockedAt: null }
    });

    await prisma.bDActivity.create({
      data: {
        projectId: task.projectId,
        userId: user.id,
        action: 'TASK_UNBLOCKED',
        details: `Task "${task.name}" unblocked.`
      }
    });

    return { success: true, data: task };
  } catch (error) {
    console.error('Error unblocking task:', error);
    return { success: false, error: 'Failed to unblock task' };
  }
}

export async function addBDComment(projectId: string, comment: string, mentionedUserIds?: string[]) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const project = await prisma.bDProject.findUnique({
      where: { id: projectId },
      select: { name: true }
    });

    await prisma.bDActivity.create({
      data: {
        projectId,
        userId: user.id,
        action: 'COMMENTED',
        details: comment
      }
    });

    if (mentionedUserIds && mentionedUserIds.length > 0 && project) {
      // Snippet for push notification
      const snippet = comment.length > 50 ? comment.substring(0, 50) + '...' : comment;

      for (const targetUserId of mentionedUserIds) {
        if (targetUserId !== user.id) { // Don't notify self
          await sendPushToUser(targetUserId, {
            title: `Mentioned by ${user.fullName}`,
            body: `[${project.name}]: ${snippet}`,
            url: `/bd/projects/${projectId}`,
            category: 'BD_MENTION'
          });
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, error: 'Failed to add comment' };
  }
}

// ==========================================
// PULL MODEL (Take งาน)
// ==========================================

export async function claimBDBrief(projectId: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Atomic update
    const res = await prisma.bDProject.updateMany({
      where: { id: projectId, ownerId: null },
      data: { ownerId: user.id }
    });

    if (res.count === 0) {
      return { success: false, error: 'งานนี้ถูกรับไปแล้ว (Already claimed)' };
    }

    await prisma.bDActivity.create({
      data: {
        projectId,
        userId: user.id,
        action: 'PROJECT_CLAIMED',
        details: 'User claimed this brief from the pool.'
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error claiming brief:', error);
    return { success: false, error: 'Failed to claim brief' };
  }
}

export async function releaseBDBrief(projectId: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    await prisma.bDProject.update({
      where: { id: projectId },
      data: { ownerId: null }
    });

    await prisma.bDActivity.create({
      data: {
        projectId,
        userId: user.id,
        action: 'PROJECT_RELEASED',
        details: 'User released this brief back to the pool.'
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error releasing brief:', error);
    return { success: false, error: 'Failed to release brief' };
  }
}

export async function claimBDTask(taskId: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Atomic update
    const res = await prisma.bDTask.updateMany({
      where: { id: taskId, assigneeId: null },
      data: { assigneeId: user.id, status: 'IN_PROGRESS' }
    });

    if (res.count === 0) {
      return { success: false, error: 'งานนี้ถูกรับไปแล้ว (Already claimed)' };
    }

    const task = await prisma.bDTask.findUnique({ where: { id: taskId } });
    if (task) {
      await prisma.bDActivity.create({
        data: {
          projectId: task.projectId,
          userId: user.id,
          action: 'TASK_CLAIMED',
          details: `User claimed task "${task.name}" and started work.`
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error claiming task:', error);
    return { success: false, error: 'Failed to claim task' };
  }
}

export async function releaseBDTask(taskId: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const task = await prisma.bDTask.update({
      where: { id: taskId },
      data: { assigneeId: null, status: 'PENDING' }
    });

    await prisma.bDActivity.create({
      data: {
        projectId: task.projectId,
        userId: user.id,
        action: 'TASK_RELEASED',
        details: `User released task "${task.name}" back to the pool.`
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error releasing task:', error);
    return { success: false, error: 'Failed to release task' };
  }
}

export async function createBDTask(projectId: string, name: string, checklist?: { label: string; checked: boolean; id: string }[]) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const project = await prisma.bDProject.findUnique({
      where: { id: projectId },
      include: { tasks: { select: { orderIndex: true } } }
    });

    if (!project) return { success: false, error: 'Project not found' };

    const maxOrder = project.tasks.length > 0 ? Math.max(...project.tasks.map(t => t.orderIndex)) : 0;

    const task = await prisma.bDTask.create({
      data: {
        projectId,
        name,
        orderIndex: maxOrder + 1,
        status: 'PENDING',
        checklistState: checklist ? (checklist as any) : undefined
      }
    });

    await prisma.bDActivity.create({
      data: {
        projectId,
        userId: user.id,
        action: 'TASK_CREATED',
        details: `Task "${name}" was manually created.`
      }
    });

    return { success: true, data: task };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: 'Failed to create task' };
  }
}

export async function updateBDTaskName(taskId: string, name: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    await prisma.bDTask.update({
      where: { id: taskId },
      data: { name }
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating task name:', error);
    return { success: false, error: 'Failed to update task name' };
  }
}

export async function deleteBDTask(taskId: string) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    await prisma.bDTask.delete({
      where: { id: taskId }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: 'Failed to delete task' };
  }
}

export async function getAllBDProjects() {
  try {
    const projects = await prisma.bDProject.findMany({
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: projects };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { success: false, error: 'Failed to fetch projects' };
  }
}
