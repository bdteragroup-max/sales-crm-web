import { getServiceClaims } from "@/app/actions/serviceClaims";
import ClaimsClientPage from "./ClaimsClientPage";
import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";

export const metadata = {
  title: "ระบบแจ้งเคลมสินค้า (Service Claims) | Sales CRM",
  description: "ระบบแจ้งเคลมสินค้าจากคลังสินค้าและ QC ส่งเรื่องให้ฝ่ายบริการ",
};

export default async function ClaimsPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const res = await getServiceClaims();
  const claims = res.success ? res.data : [];

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/60 min-h-0 custom-scrollbar">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <ClaimsClientPage initialClaims={claims as any} currentUser={session} />
      </div>
    </main>
  );
}
