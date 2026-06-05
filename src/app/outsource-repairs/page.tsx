import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import OutsourceRepairsClientPage from "./ClientPage";
import { getOutsourceRepairs } from "@/app/actions/outsourceRepairs";

export const metadata = {
  title: "ซ่อมภายนอก | Sales CRM",
};

export default async function OutsourceRepairsPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const res = await getOutsourceRepairs();
  const repairs = res.success ? res.data : [];

  return <OutsourceRepairsClientPage initialData={repairs || []} currentUser={session} />;
}
