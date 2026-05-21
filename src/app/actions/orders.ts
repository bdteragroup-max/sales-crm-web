'use server'

import prisma from "@/app/lib/db";
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

    // Only manager or the assigned salesperson can edit
    if (user.role !== "ผู้จัดการ" && order.salespersonId !== user.id) {
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
          company: true
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
    });

    revalidatePath("/orders");
    revalidatePath("/dashboard");
    
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
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.salespersonId) where.salespersonId = filters.salespersonId;
    if (filters?.companyId) where.companyId = filters.companyId;

    // Reps only see their own orders unless they are a manager
    if (user.role !== "ผู้จัดการ") {
      where.salespersonId = user.id;
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
  orderNumber: string;
  companyId: string;
  quotationId?: string;
  value: number;
  priority?: string;
  targetDeliveryDate?: string;
}) {
  const user = await getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const newOrder = await prisma.order.create({
      data: {
        orderNumber: data.orderNumber,
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
