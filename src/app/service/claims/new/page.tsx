import ClaimForm from "../components/ClaimForm";
import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";

export const metadata = {
  title: "แบบฟอร์มแจ้งเคลมสินค้า | Sales CRM",
  description: "แจ้งเคลมสินค้าจากคลังสินค้าและฝ่าย QC ส่งเรื่องให้ฝ่ายบริการ",
};

export default async function NewClaimPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  // ดึงเบอร์โทรศัพท์ของผู้ใช้งานจากฐานข้อมูล
  let userPhone = (session as any).phoneNumber || "";

  // ถ้าใน session ยังไม่มีเบอร์ ให้ค้นหาเพิ่มเติมจากตาราง employees ตาม employeeId
  if (!userPhone && session.employeeId) {
    try {
      const emp = await prisma.employees.findUnique({
        where: { emp_id: session.employeeId },
        select: { phone_number: true },
      });
      if (emp?.phone_number) {
        userPhone = emp.phone_number;
      }
    } catch (e) {
      console.error("Error fetching employee phone:", e);
    }
  }

  const currentUserWithPhone = {
    ...session,
    phoneNumber: userPhone,
  };

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/60 min-h-0 custom-scrollbar">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <ClaimForm currentUser={currentUserWithPhone} />
      </div>
    </main>
  );
}
