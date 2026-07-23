'use server'

import prisma from "@/app/lib/db";
import { generateOrderNumber } from './orderHelper';
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

/**
 * Update order status and log the change
 */
export async function updateOrderStatus(
  id: string, 
  newStatus: string
) {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return { success: false, error: "ไม่พบข้อมูล Order (Order not found)" };
    }

    const roleStr = (user.role || '').toLowerCase();
    const isManager = ['ผู้จัดการ', 'manager', 'sales manager', 'marketing manager', 'ผู้จัดการฝ่ายการตลาด', 'ผู้จัดการการตลาด', 'ผู้การจัดการตลาด', 'ฝ่ายผลิต', 'production', 'คลังสินค้า', 'store', 'บัญชี', 'accounting'].some(r => roleStr.includes(r));

    // Only manager or the assigned salesperson can update
    if (!isManager && order.salespersonId !== user.id) {
      return { success: false, error: "ปฏิเสธการเข้าถึง: คุณสามารถแก้ไขเฉพาะออเดอร์ของคุณเองเท่านั้น" };
    }

    // Use transaction to ensure both update and log happen together
    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { 
          status: newStatus,
          updatedAt: new Date()
        },
        include: {
          company: true,
          quotation: {
            select: {
              quotationNumber: true,
              jobs: {
                select: {
                  id: true,
                  jobNumber: true,
                  jobType: true,
                  currentStep: true,
                  item: true
                }
              }
            }
          },
          salesperson: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          },
          purchaseRequests: {
            include: {
              purchaseOrders: true
            }
          }
        }
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: id,
          userId: user.id,
          fromStatus: order.status,
          toStatus: newStatus,
        }
      });

      return updatedOrder;
    }, { maxWait: 15000, timeout: 30000 });

    if (newStatus === 'เสร็จสิ้น' && updated.quotation?.jobs) {
      const { confirmJobStep } = await import('@/app/actions/jobs');
      for (const job of updated.quotation.jobs) {
        if (job.currentStep === 'production') {
          await confirmJobStep({
            jobId: job.id,
            stepKey: 'production',
            completedBy: user.fullName || "Production Dept",
            department: 'production',
            note: 'ดำเนินการอัตโนมัติเมื่อสถานะออเดอร์ผลิตเสร็จสิ้น'
          }).catch(err => console.error("Auto advance job step error:", err));
        }
      }
    }

    revalidatePath("/orders");
    revalidatePath("/dashboard");
    revalidatePath("/jobs");
    
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating order status:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตสถานะออเดอร์" };
  }
}

/**
 * Fetch orders with flexible filtering
 */
export async function fetchOrders(filters?: {
  status?: string;
  salespersonId?: string;
  companyId?: string;
}) {
  const user = await getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const where: any = {
      quotation: {
        jobs: {
          some: {
            jobType: {
              in: ['งานตู้', 'งานตู้ + ติดตั้ง']
            }
          }
        }
      }
    };
    if (filters?.status) where.status = filters.status;
    if (filters?.salespersonId) where.salespersonId = filters.salespersonId;
    if (filters?.companyId) where.companyId = filters.companyId;

    const roleStr = (user.role || '').toLowerCase();
    const isManager = ['ผู้จัดการ', 'manager', 'sales manager', 'marketing manager', 'ผู้จัดการฝ่ายการตลาด', 'ผู้จัดการการตลาด', 'ผู้การจัดการตลาด', 'ฝ่ายผลิต', 'production', 'คลังสินค้า', 'store', 'บัญชี', 'accounting'].some(r => roleStr.includes(r));

    // Reps only see their own orders unless they are a manager
    if (!isManager) {
      where.OR = [{ salespersonId: user.id }, { salespersonId: null }];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        company: true,
        salesperson: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        },
        statusLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            order: { select: { salesperson: { select: { fullName: true } } } } // getting updater info is tricky since userId is on log.
          }
        }
      }
    });

    return { success: true, data: orders };
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์" };
  }
}

/**
 * Create a new order (e.g. converted from a Quotation)
 */
export async function createOrder(data: {
  orderNumber?: string;
  companyId: string;
  quotationId?: string;
  value: number;
  priority?: string;
  targetDeliveryDate?: string;
}) {
  const user = await getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const finalOrderNumber = data.orderNumber || await generateOrderNumber();
    
    const newOrder = await prisma.order.create({
      data: {
        orderNumber: finalOrderNumber,
        companyId: data.companyId,
        quotationId: data.quotationId,
        salespersonId: user.id, // Assigned to the creator
        value: data.value,
        priority: data.priority || 'Normal',
        targetDeliveryDate: data.targetDeliveryDate ? new Date(data.targetDeliveryDate) : null,
      },
      include: {
        company: true
      }
    });

    await prisma.orderStatusLog.create({
      data: {
        orderId: newOrder.id,
        userId: user.id,
        fromStatus: 'System',
        toStatus: 'รอยืนยัน'
      }
    });

    revalidatePath("/orders");
    revalidatePath("/dashboard");
    
    return { success: true, data: newOrder };
  } catch (error: any) {
    console.error("Error creating order:", error);
    // Unique constraint on orderNumber
    if (error.code === 'P2002') {
      return { success: false, error: "เลขที่ออเดอร์นี้มีอยู่ในระบบแล้ว" };
    }
    return { success: false, error: "เกิดข้อผิดพลาดในการสร้างออเดอร์" };
  }
}

export async function startProductionWorkflow(id: string, payload: {
  materialReady: boolean;
  estimatedDays?: number;
  prNote?: string;
}) {
  const user = await getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const order = await prisma.order.findUnique({ where: { id }, include: { quotation: true } });
    if (!order) return { success: false, error: "ไม่พบข้อมูล Order" };

    const { addWorkingDays } = await import('@/app/utils/date');
    let productionDeadline = null;
    
    if (payload.estimatedDays) {
      const today = new Date();
      const maxDate = new Date();
      maxDate.setMonth(today.getMonth() + 3);
      
      const holidays = await prisma.holidays.findMany({
        where: { date: { gte: today, lte: maxDate } }
      });
      
      const holidayDates = holidays.map(h => h.date);
      productionDeadline = addWorkingDays(new Date(), payload.estimatedDays, holidayDates);
    }

    const prRequired = !payload.materialReady;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: 'กำลังผลิต',
          materialReady: payload.materialReady,
          estimatedDays: payload.estimatedDays,
          productionDeadline,
          prRequired,
          prNote: payload.prNote,
          updatedAt: new Date()
        },
        include: {
          company: true
        }
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: id,
          userId: user.id,
          fromStatus: order.status,
          toStatus: 'กำลังผลิต'
        }
      });

      return updatedOrder;
    }, { maxWait: 15000, timeout: 30000 });

    if (prRequired) {
      const { sendPushToUser } = await import('@/app/lib/pushNotification');
      // Adding common procurement roles
      const procurementRoles = ['PROCUREMENT', 'ADMIN', 'จัดซื้อ', 'admin', 'ผู้จัดการจัดซื้อ', 'ผู้อำนวยการ', 'purchasing'];
      const procurementUsers = await prisma.user.findMany({
        where: { 
          isActive: true
        }
      });
      
      const targetUsers = procurementUsers.filter(u => 
        procurementRoles.some(r => (u.role || '').toLowerCase().includes(r.toLowerCase()))
      );
      
      for (const pUser of targetUsers) {
        await sendPushToUser(pUser.id, {
          title: "🛒 แจ้งเตือน: กรุณาเปิด PR สำหรับงานผลิต",
          body: `Order ${order.orderNumber} ต้องการจัดซื้อวัสดุ${payload.prNote ? ` — ${payload.prNote}` : ""}`,
          url: `/admin/procurement/pr`, 
          category: "PRODUCTION_PR"
        }).catch(console.error);
      }
    }

    revalidatePath("/orders");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error starting production workflow:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลการผลิต" };
  }
}

export async function submitQCReport(
  orderId: string, 
  payload: { status: 'PASS' | 'FAIL'; note?: string; qcImages?: string[] }
) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, error: "Order not found" };

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        qcStatus: payload.status,
        qcBy: user.fullName,
        qcAt: new Date(),
        qcNote: payload.note || null,
        qcImages: payload.qcImages || [],
        status: payload.status === 'PASS' ? 'เสร็จสิ้น' : 'กำลังผลิต',
        updatedAt: new Date()
      },
      include: {
        company: true,
        quotation: {
          select: {
            quotationNumber: true,
            jobs: {
              select: {
                id: true,
                jobNumber: true,
                jobType: true,
                currentStep: true,
                item: true
              }
            }
          }
        },
        salesperson: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        },
        purchaseRequests: {
          include: {
            purchaseOrders: true
          }
        }
      }
    });

    if (order.status !== updated.status) {
      await prisma.orderStatusLog.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: updated.status,
          userId: user.id
        }
      });
    }

    if (payload.status === 'PASS' && updated.quotation?.jobs) {
      const { confirmJobStep } = await import('@/app/actions/jobs');
      for (const job of updated.quotation.jobs) {
        if (job.currentStep === 'production') {
          await confirmJobStep({
            jobId: job.id,
            stepKey: 'production',
            completedBy: user.fullName || "Production Dept",
            department: 'production',
            note: 'ดำเนินการอัตโนมัติเมื่อ QC ผ่าน'
          }).catch(err => console.error("Auto advance job step error:", err));
        }
      }
    }

    revalidatePath("/orders");
    revalidatePath("/jobs");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error submitting QC:", error);
    return { success: false, error: error.message };
  }
}
