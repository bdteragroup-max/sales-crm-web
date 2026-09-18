"use client";

import React from "react";
import ServiceExecutiveCockpit from "./ServiceExecutiveCockpit";

interface Props {
  allServiceJobs?: any[];
  allInstallations?: any[];
  allOutsource?: any[];
  timeframe?: string;
  currentPeriodJobs?: any[];
  previousPeriodJobs?: any[];
  allPendingJobs?: any[];
  currentInstallations?: any[];
  previousInstallations?: any[];
  allPendingInstallations?: any[];
  currentOutsource?: any[];
  currentUser?: any;
}

export default function ExecutiveServiceClient({
  allServiceJobs = [],
  allInstallations = [],
  allOutsource = [],
  currentPeriodJobs = [],
  currentInstallations: legacyInstalls = [],
  currentOutsource: legacyOutsource = [],
  currentUser,
}: Props) {
  // Combine all jobs prioritizing `allServiceJobs`, or falling back to legacy jobs
  const jobs = allServiceJobs.length > 0 ? allServiceJobs : currentPeriodJobs;
  const installs = allInstallations.length > 0 ? allInstallations : legacyInstalls;
  const outsource = allOutsource.length > 0 ? allOutsource : legacyOutsource;

  return (
    <ServiceExecutiveCockpit
      allServiceJobs={jobs}
      allInstallations={installs}
      allOutsource={outsource}
      currentUser={currentUser}
    />
  );
}
