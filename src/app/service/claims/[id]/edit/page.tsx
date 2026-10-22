import { getServiceClaimById } from "@/app/actions/serviceClaims";
import ClaimForm from "../../components/ClaimForm";
import { getUser } from "@/app/lib/dal";
import { redirect, notFound } from "next/navigation";

export const metadata = {
  title: "แก้ไขข้อมูลแจ้งเคลม | Sales CRM",
};

export default async function EditClaimPage({
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
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/60 min-h-0 custom-scrollbar">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <ClaimForm initialData={res.data} isEdit={true} currentUser={session} />
      </div>
    </main>
  );
}
