import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import Sidebar from "@/app/components/Sidebar";
import { getAccountingDeliveryHandovers } from "@/app/actions/repairDeliveries";
import AccountingDeliveryHandoversClient from "./AccountingDeliveryHandoversClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    deliveryId?: string;
    tab?: string;
  }>;
}

export default async function AccountingDeliveryHandoversPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login");

  const handovers = await getAccountingDeliveryHandovers();

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar
        activeRoute="/accounting/delivery-handovers"
        userFullName={user.fullName}
        userId={user.id}
        userRole={user.role}
      />
      <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:p-6 bg-slate-50/70 pb-24 md:pb-6">
        <AccountingDeliveryHandoversClient
          initialHandovers={JSON.parse(JSON.stringify(handovers || []))}
          currentUser={user}
          initialDeliveryId={params.deliveryId || null}
          initialTab={
            params.tab === "billed" || params.tab === "all"
              ? params.tab
              : "pending"
          }
        />
      </main>
    </div>
  );
}

