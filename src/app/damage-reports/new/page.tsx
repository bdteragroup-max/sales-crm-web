import { getUser } from "@/app/lib/dal";
import NewDamageReportClient from "./NewDamageReportClient";
import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";

export const metadata = {
  title: "แจ้งสินค้าและทรัพย์สินชำรุดเสียหาย | Sales CRM",
};

export default async function NewDamageReportPage() {
  const session = await getUser();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar
        activeRoute="/damage-reports"
        userFullName={session.fullName}
        userRole={session.role}
        userId={session.id}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          <NewDamageReportClient currentUser={session} />
        </main>
      </div>
    </div>
  );
}

