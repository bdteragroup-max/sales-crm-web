import { getServiceClaimById } from "@/app/actions/serviceClaims";
import ClaimPrintClientPage from "./ClaimPrintClientPage";
import { getUser } from "@/app/lib/dal";
import { redirect, notFound } from "next/navigation";

export const metadata = {
  title: "พิมพ์ใบแจ้งเคลมสินค้า | Sales CRM",
  description: "พิมพ์เอกสารใบแจ้งเคลมสินค้าและขอรับบริการตรวจซ่อมแบบทางการ",
};

export default async function ClaimPrintPage({
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

  return <ClaimPrintClientPage claim={res.data} />;
}
