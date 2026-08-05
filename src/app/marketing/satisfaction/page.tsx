import React from 'react';
import SatisfactionDashboardClient from '@/app/marketing/satisfaction/SatisfactionDashboardClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customer Satisfaction Survey | Marketing',
};

export default function SatisfactionPage() {
  return <SatisfactionDashboardClient />;
}
