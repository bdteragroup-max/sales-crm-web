export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import IntakeClientPage from './IntakeClientPage';

export const metadata = {
  title: 'BD Intake - Briefing System',
};

export default function IntakePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">กำลังโหลด...</div>}>
      <IntakeClientPage />
    </Suspense>
  );
}
