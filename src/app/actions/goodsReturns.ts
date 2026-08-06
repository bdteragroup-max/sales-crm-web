"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

function getBkkBeYear() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return (now.getFullYear() + 543).toString(); // e.g. "2569"
}

export async function createGoodsReturn(data: any) {
  try {
    const session = await getUser();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const beYear = getBkkBeYear();
    
    // Find highest running number for RT-2569
    const allRecords = await prisma.goodsReturn.findMany({
      where: { documentNo: { startsWith: `RT-${beYear}-` } },
      select: { documentNo: true },
    });
    
    let maxNumber = 0;
    for (const record of allRecords) {
      if (record.documentNo) {
        const parts = record.documentNo.split('-');
        if (parts.length >= 3) {
          const numStr = parts[parts.length - 1];
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }
    
    let nextNumber = maxNumber + 1;
    let newDoc = null;
    let attempts = 0;
    let documentNo = "";

    while (!newDoc && attempts < 10) {
      documentNo = `RT-${beYear}-${String(nextNumber).padStart(3, "0")}`;
      try {
        newDoc = await prisma.goodsReturn.create({
          data: {
            ...data,
            companyId: data.companyId || undefined,
            jobId: data.jobId || undefined,
            quotationId: data.quotationId || undefined,
            receiverDate: data.receiverDate ? new Date(data.receiverDate) : undefined,
            senderDate: data.senderDate ? new Date(data.senderDate) : undefined,
            documentNo,
            date: data.date ? new Date(data.date) : new Date(),
            status: data.status || "Draft",
          },
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Unique constraint failed, try the next number
          nextNumber++;
          attempts++;
        } else {
          throw error;
        }
      }
    }

    if (!newDoc) {
      throw new Error("Failed to generate a unique document number.");
    }

    revalidatePath("/service/goods-returns");
    return { success: true, goodsReturnId: newDoc.id };
  } catch (error: any) {
    console.error("Failed to create Goods Return:", error);
    return { success: false, error: error.message };
  }
}

export async function updateGoodsReturn(id: string, data: any) {
  try {
    await prisma.goodsReturn.update({
      where: { id },
      data: {
        ...data,
        companyId: data.companyId || undefined,
        jobId: data.jobId || undefined,
        quotationId: data.quotationId || undefined,
        date: data.date ? new Date(data.date) : undefined,
        receiverDate: data.receiverDate ? new Date(data.receiverDate) : undefined,
        senderDate: data.senderDate ? new Date(data.senderDate) : undefined,
      },
    });
    revalidatePath("/service/goods-returns");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update Goods Return:", error);
    return { success: false, error: error.message };
  }
}

export async function getGoodsReturns(filters?: any) {
  try {
    const data = await prisma.goodsReturn.findMany({
      where: filters,
      include: {
        job: true,
        quotation: true,
        company: true
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to get Goods Returns:", error);
    return { success: false, error: error.message };
  }
}

export async function getGoodsReturnById(id: string) {
  try {
    const data = await prisma.goodsReturn.findUnique({
      where: { id },
      include: {
        job: true,
        quotation: true,
        company: true
      }
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to get Goods Return:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteGoodsReturn(id: string) {
  try {
    await prisma.goodsReturn.delete({
      where: { id },
    });
    revalidatePath("/service/goods-returns");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete Goods Return:", error);
    return { success: false, error: error.message };
  }
}
