'use client';

import React, { useState } from 'react';
import { getLogisticsTripById } from '@/app/actions/logistics';
import type { LogisticsPermissions, LogisticsTripRecord } from '@/app/lib/logisticsTypes';
import TripExecutionView from '../../components/TripExecutionView';

export default function TripDetailClientPage({
  initialTrip,
  permissions,
}: {
  initialTrip: LogisticsTripRecord;
  permissions: LogisticsPermissions;
}) {
  const [trip, setTrip] = useState<LogisticsTripRecord>(initialTrip);

  const handleRefresh = async () => {
    const res = await getLogisticsTripById(trip.id);
    if (res.trip) {
      setTrip(res.trip);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 max-w-5xl mx-auto">
      <TripExecutionView
        key={`${trip.id}-${trip.updatedAt}`}
        trip={trip}
        permissions={permissions}
        onRefresh={handleRefresh}
        showBackLink={true}
      />
    </div>
  );
}
