import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import { isSuperUser } from "@/app/lib/roleHelper";
import { getSignedDeliveriesForSales } from "@/app/actions/repairDeliveries";
import DeliveryAcknowledgementsClient from "./DeliveryAcknowledgementsClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    deliveryId?: string;
    tab?: string;
  }>;
}

export default async function SalesDeliveryAcknowledgementsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login");

  const roleStr = (user.role || "").toLowerCase();
  const isSuperAdmin = isSuperUser(user.role);
  const isManager =
    user.role === "ผู้จัดการ" ||
    roleStr.includes("manager") ||
    roleStr.includes("ผู้จัดการ") ||
    roleStr.includes("mgr");

  const deliveries = await getSignedDeliveriesForSales(
    user.id,
    user.fullName,
    isSuperAdmin || isManager
  );

  return (
    <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:p-6 bg-slate-50/70 pb-24 md:pb-6">
      <DeliveryAcknowledgementsClient
        initialDeliveries={JSON.parse(JSON.stringify(deliveries || []))}
        currentUser={user}
        initialDeliveryId={params.deliveryId || null}
        initialTab={
          params.tab === "acknowledged" ||
            params.tab === "billed" ||
            params.tab === "all"
            ? params.tab
            : "pending"
        }
      />
    </main>
  );
}

