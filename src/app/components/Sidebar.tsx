import { Suspense } from 'react';
import SidebarClient from './SidebarClient';

type SidebarProps = {
  activeRoute?: string;
  userFullName?: string;
  userId?: string;
  userRole?: string;
};

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={<div className="w-[76px] h-screen bg-white border-r border-gray-100 hidden md:block shrink-0" />}>
      <SidebarClient {...props} />
    </Suspense>
  );
}
