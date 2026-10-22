import { getServiceClaimById } from "@/app/actions/serviceClaims";
import ClaimDetailClientPage from "./ClaimDetailClientPage";
import { getUser } from "@/app/lib/dal";
import { redirect, notFound } from "next/navigation";

export const metadata = {
  title: "รายละเอียดการแจ้งเคลม | Sales CRM",
};

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const res = await getServiceClaimById(resolvedParams.id);

  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/60 min-h-0 custom-scrollbar print:bg-white print:overflow-visible print:p-0 print:m-0">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:p-0 print:m-0 print:max-w-none">
        <ClaimDetailClientPage claim={res.data} currentUser={session} />
      </div>
    </main>
  );
}
