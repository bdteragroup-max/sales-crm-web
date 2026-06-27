'use server';

import prisma from '@/app/lib/db';

export async function getSiteSurveyById(id: string) {
  try {
    const survey = await prisma.siteSurvey.findUnique({
      where: { id },
      include: {
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
    
    // We do not decrypt passwords here; the frontend never needs the plain text password.
    // If the user wants to update it, they just type a new one and the API encrypts it.
    
    return { success: true, data: survey };
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
