import { getUser } from "@/app/lib/dal";
import { getDamageReportById } from "@/app/actions/damageReports";
import DamageReportDetailClient from "./DamageReportDetailClient";
import { notFound, redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await params;
  return {
    title: `เคสความเสียหาย ${resolvedParams.id} | Sales CRM`,
  };
}

export default async function DamageReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await getUser();
  if (!session) redirect("/login");

  const resolvedParams = await params;
  const id = resolvedParams.id;

  const res = await getDamageReportById(id);
  if (!res.success || !res.data) return notFound();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar
        activeRoute="/damage-reports"
        userFullName={session.fullName}
        userRole={session.role}
        userId={session.id}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <DamageReportDetailClient report={res.data} currentUser={session} />
        </main>
      </div>
    </div>
  );
}

