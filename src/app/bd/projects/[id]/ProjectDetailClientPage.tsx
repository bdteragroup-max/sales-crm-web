"use client";

import React from 'react';
import BDProjectDetailView from './BDProjectDetailView';

export default function ProjectDetailClientPage({ id }: { id: string }) {
  return <BDProjectDetailView id={id} />;
}
