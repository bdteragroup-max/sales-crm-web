import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import Sidebar from "@/app/components/Sidebar";
import { getTelesaleLogContext } from "@/app/actions/telesalesLog";
import TelesaleLogClient from "./TelesaleLogClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    contactId?: string;
    companyId?: string;
    returnTo?: string;
  }>;
}

export default async function TelesaleLogPage({ searchParams }: PageProps) {
  const currentUser = await getUser();
  if (!currentUser) redirect("/");

  const params = await searchParams;
  const contactId = params.contactId;
  const companyId = params.companyId;
  const returnTo = params.returnTo || "/clients";

  // Graceful direct-access fallback: redirect to /clients if parameters are missing
  if (!contactId || !companyId) {
    redirect("/clients");
  }

  try {
    // Server-side fetching of caller's organizational context & history
    const context = await getTelesaleLogContext(contactId, companyId);

    return (
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc] p-4 md:p-8 pb-24 md:pb-8">
        <TelesaleLogClient
          contactId={contactId}
          companyId={companyId}
          returnTo={returnTo}
          initialContext={context}
        />
      </main>
    );
  } catch (error) {
    console.error("Failed to load telesale log page context:", error);
    redirect("/clients");
  }
}
