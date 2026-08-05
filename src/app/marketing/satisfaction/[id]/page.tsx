import React from 'react';
import SatisfactionDetailClient from './SatisfactionDetailClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Survey Detail | Marketing',
};

export default function SatisfactionDetailPage({ params }: { params: { id: string } }) {
  return <SatisfactionDetailClient id={params.id} />;
}
