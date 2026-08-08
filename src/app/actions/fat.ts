"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";

export async function submitFATReview(
  jobId: string,
  testerName: string,
  fatData: {
    panelFunctionalTest: boolean;
    acInputVoltage: number | null;
    dcInputVoltage: number | null;
    outputVoltage: number | null;
    protectionSystemTest: boolean;
    testDetails: string;
    displaySystemCheck: boolean;
    remarks: string;
    fatStatus: 'Passed' | 'Failed';
  }
) {
  try {
    const job = await prisma.cabinetAssemblyJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    await prisma.cabinetFATReport.upsert({
      where: { cabinetAssemblyJobId: jobId },
      create: {
        cabinetAssemblyJobId: jobId,
        testerName,
        panelFunctionalTest: fatData.panelFunctionalTest,
        acInputVoltage: fatData.acInputVoltage,
        dcInputVoltage: fatData.dcInputVoltage,
        outputVoltage: fatData.outputVoltage,
        protectionSystemTest: fatData.protectionSystemTest,
        testDetails: fatData.testDetails,
        displaySystemCheck: fatData.displaySystemCheck,
        remarks: fatData.remarks,
        fatStatus: fatData.fatStatus,
      },
      update: {
        testerName,
        panelFunctionalTest: fatData.panelFunctionalTest,
        acInputVoltage: fatData.acInputVoltage,
        dcInputVoltage: fatData.dcInputVoltage,
        outputVoltage: fatData.outputVoltage,
        protectionSystemTest: fatData.protectionSystemTest,
        testDetails: fatData.testDetails,
        displaySystemCheck: fatData.displaySystemCheck,
        remarks: fatData.remarks,
        fatStatus: fatData.fatStatus,
      }
    });

    revalidatePath('/production/fat');
    
    return { success: true };
  } catch (error) {
    console.error('Error submitting FAT:', error);
    return { success: false, error: 'Internal server error' };
  }
}
