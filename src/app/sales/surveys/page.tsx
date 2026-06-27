import React from 'react';
import { getUser } from '@/app/lib/dal';
import prisma from '@/app/lib/db';
import { redirect } from 'next/navigation';
import SurveyManager from './components/SurveyManager';

export const metadata = {
  title: 'Site Surveys | Sales CRM',
};

export default async function SurveysPage() {
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

  // Fetch surveys summary for list
  const surveys = await prisma.siteSurvey.findMany({
    select: {
      id: true,
      surveyNumber: true,
      surveyDate: true,
      customerName: true,
      projectName: true,
      status: true,
      salesperson: { select: { fullName: true } },
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 pb-20 md:pb-10 relative custom-scrollbar h-full">
      <SurveyManager 
        initialSurveys={surveys}
        companies={companies}
        salesReps={salesReps}
        currentUser={user}
      />
    </main>
  );
}
