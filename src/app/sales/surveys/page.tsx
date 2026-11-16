export const dynamic = 'force-dynamic';
import React from 'react';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { hasSurveyExtendedFieldsInRuntime, hydrateSurveyListCompanyCodesFallback } from '@/app/lib/surveySignaturesDb';
import { redirect } from 'next/navigation';
import SurveyManager from './components/SurveyManager';

export const metadata = {
  title: 'Site Surveys | Sales CRM',
};

export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ surveyId?: string }>;
}) {
  const params = await searchParams;
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const rawCompanies = await prisma.company.findMany({
    select: { 
      id: true, 
      companyName: true,
      address: true,
      subDistrict: true,
      district: true,
      province: true,
      postalCode: true
    },
    orderBy: { companyName: 'asc' },
  });
  
  // Deduplicate by companyName to avoid messy dropdowns from bad CRM data
  const seenCompanies = new Set();
  const companies = rawCompanies.filter(c => {
    if (seenCompanies.has(c.companyName)) {
      return false;
    }
    seenCompanies.add(c.companyName);
    return true;
  });

  // Fetch sales reps for the dropdown
  const salesReps = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });

  const canSelectCompanyCode = hasSurveyExtendedFieldsInRuntime(prisma);

  // Fetch surveys summary for list
  const rawSurveys = await prisma.siteSurvey.findMany({
    select: {
      id: true,
      surveyNumber: true,
      surveyDate: true,
      ...(canSelectCompanyCode ? { companyCode: true } : {}),
      customerName: true,
      projectName: true,
      projectLocation: true,
      coordinatorName: true,
      coordinatorPhone: true,
      surveyorName: true,
      status: true,
      version: true,
      estimationStatus: true,
      estimatedPrice: true,
      estimatedAt: true,
      updatedAt: true,
      requiredInfoChecklist: true,
      salesperson: { select: { id: true, fullName: true } },
      estimatedByUser: { select: { id: true, fullName: true } },
      usageBehavior: {
        select: {
          avgBillThbPerMonth: true,
          workingHours: true,
          dayNightRatio: true,
        },
      },
      electricalProfile: {
        select: {
          gridProvider: true,
          voltageLevel: true,
          transformerKva: true,
        },
      },
      tariffSelection: {
        select: {
          tariffCategory: true,
        },
      },
      structure: {
        select: {
          roofType: true,
          roofDimWxlM: true,
        },
      },
      electricityBill: {
        select: {
          id: true,
          fileUrl: true,
        },
      },
      _count: {
        select: {
          photos: true,
          documents: true,
        },
      },
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const surveys = canSelectCompanyCode
    ? rawSurveys
    : await hydrateSurveyListCompanyCodesFallback(prisma, rawSurveys);

  const initialSurveyId = params?.surveyId || null;

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 pb-20 md:pb-10 relative custom-scrollbar h-full">
      <SurveyManager
        key={initialSurveyId || 'list'}
        initialSurveys={surveys}
        companies={companies}
        salesReps={salesReps}
        currentUser={user}
        initialSurveyId={initialSurveyId}
      />
    </main>
  );
}
