'use server';

import prisma from '@/app/lib/db';
import { decryptString } from '@/utils/crypto';
import { revalidatePath } from 'next/cache';
import { hydrateSurveySignaturesFallback } from '@/app/lib/surveySignaturesDb';

export async function getSiteSurveyById(id: string) {
  try {
    const survey = await prisma.siteSurvey.findUnique({
      where: { id },
      include: {
        salesperson: { select: { id: true, fullName: true } },
        estimatedByUser: { select: { id: true, fullName: true } },
        company: {
          select: {
            id: true,
            companyName: true,
            address: true,
            subDistrict: true,
            district: true,
            province: true,
            postalCode: true,
          },
        },
        usageBehavior: true,
        electricalProfile: true,
        tariffSelection: {
          include: { tiers: true }
        },
        structure: {
          include: { roofAges: true }
        },
        qa: true,
        photos: true,
        documents: true,
        electricityBill: true
      }
    });
    
    // Decrypt passwords here for display in the edit form
    if (survey?.electricalProfile) {
      if (survey.electricalProfile.amrUsernameEncrypted) {
        (survey.electricalProfile as any).amrUsernamePlain = decryptString(survey.electricalProfile.amrUsernameEncrypted);
      }
      if (survey.electricalProfile.amrPasswordEncrypted) {
        (survey.electricalProfile as any).amrPasswordPlain = decryptString(survey.electricalProfile.amrPasswordEncrypted);
      }
    }
    
    const hydratedSurvey = await hydrateSurveySignaturesFallback(prisma, survey);
    return { success: true, data: hydratedSurvey };
  } catch (error: any) {
    console.error('Error fetching site survey:', error);
    return { success: false, error: error.message };
  }
}

export async function createCompanyForSurvey(companyName: string) {
  try {
    const existing = await prisma.company.findFirst({
      where: { companyName },
      select: { 
        id: true, 
        companyName: true,
        address: true,
        subDistrict: true,
        district: true,
        province: true,
        postalCode: true
      }
    });
    if (existing) return { success: true, data: existing };

    const newCompany = await prisma.company.create({
      data: { companyName }
    });
    return { success: true, data: newCompany };
  } catch (error: any) {
    console.error('Error creating company:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteSiteSurvey(id: string) {
  try {
    await prisma.siteSurvey.delete({ where: { id } });
    revalidatePath('/sales/surveys');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting site survey:', error);
    return { success: false, error: error.message };
  }
}
