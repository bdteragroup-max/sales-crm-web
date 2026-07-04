import React from 'react';
import FuelReportClient from './FuelReportClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fuel & GPS Report',
};

export default function DepartmentFuelReportPage() {
  return <FuelReportClient />;
}
