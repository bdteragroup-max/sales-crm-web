import prisma from "@/app/lib/db";
import NewRepairOrderForm from "./NewRepairOrderForm";
import { Wrench, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { getUser } from "@/app/lib/dal";

export const dynamic = "force-dynamic";

export default async function NewRepairOrderPage() {
  const currentUser = await getUser();
  const [users, companies] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true }
    }),
    prisma.company.findMany({
      select: { 
        id: true, 
        companyName: true, 
        address: true,
        billingAddress: true,
        province: true, 
        district: true, 
        subDistrict: true,
        postalCode: true, 
        taxId: true
      }
    })
  ]);

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc] p-4 md:p-6">
      <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm md:overflow-hidden overflow-visible">
        {/* ── Top Header Bar ── */}
        <header className="shrink-0 md:h-20 py-4 md:py-0 border-b border-gray-100 px-6 md:px-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-white w-full">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#ff2301] flex items-center justify-center shadow-lg shadow-red-200">
              <Wrench size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">
                สร้างใบรับซ่อมใหม่
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                New Repair Order
              </p>
            </div>
          </div>
        </header>

        {/* ── Tab Navigation ── */}
        <div className="shrink-0 flex items-center justify-between px-8 pt-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-1">
            <Link
              href="/repair-orders"
              className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
            >
              <FileText size={14} /> รายการทั้งหมด
            </Link>
            <div className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 text-[#ff2301] border-[#ff2301] bg-red-50/50">
              <Plus size={14} /> บันทึกใหม่
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-7xl mx-auto pb-32">
            <NewRepairOrderForm users={users} companies={companies} currentUser={currentUser} />
          </div>
        </div>
      </div>
    </main>
  );
}
