import { decrypt } from "@/app/lib/session";
import { cookies } from "next/headers";
import prisma from "@/app/lib/db";
import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import CreditSettingsClient from "./CreditSettingsClient";
import { getAccountingCreditSettings } from "@/app/actions/accountingCredit";

export const dynamic = "force-dynamic";

export default async function AccountingCreditSettingsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = (await cookies()).get("session")?.value;
  const payload = await decrypt(session);
  if (!payload?.userId) redirect("/");

  const user = await prisma.user.findUnique({ where: { id: payload.userId as string } });
  if (!user || !user.isActive) redirect("/");

  // Role check: Accounting, Finance, Manager, Executive, Super Admin
  const roleStr = (user.role || "").toLowerCase();
  const isAccounting = ["accounting", "บัญชี", "finance", "การเงิน", "ผู้จัดการ", "manager"].some((r) =>
    roleStr.includes(r)
  );
  const isExecutive = ["ผู้บริหาร", "executive", "super_admin"].some((r) => roleStr.includes(r));

  if (!isAccounting && !isExecutive) redirect("/dashboard");

  const sp = await props.searchParams;
  const searchParam = typeof sp?.q === "string" ? sp.q : "";
  const customerParam = typeof sp?.customer === "string" ? sp.customer : "";

  // Fetch initial credit settings
  const { items, summary } = await getAccountingCreditSettings(searchParam);

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar
        activeRoute="/accounting/credit-settings"
        userFullName={user.fullName}
        userId={user.id}
        userRole={user.role}
      />
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc] p-4 sm:p-5 lg:p-6">
        <CreditSettingsClient
          initialItems={JSON.parse(JSON.stringify(items))}
          initialSummary={JSON.parse(JSON.stringify(summary))}
          initialSearch={searchParam}
          initialCustomerParam={customerParam}
        />
      </main>
    </div>
  );
}
