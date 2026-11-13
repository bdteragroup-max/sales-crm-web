import { redirect } from 'next/navigation';
import { getUser } from '@/app/lib/dal';
import Sidebar from '@/app/components/Sidebar';

export const metadata = {
  title: 'สต็อกสินค้า & การเบิกจ่าย - TeraSales',
  description: 'ระบบติดตามสต็อก การเติมสต็อก และการเบิกจ่ายสินค้าพรีเมี่ยมทางการตลาดและวัสดุส่งเสริมการขาย',
};

export default async function StockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen print:h-auto bg-slate-50 text-gray-900 font-sans overflow-hidden print:overflow-visible print:block">
      <div className="print:hidden shrink-0">
        <Sidebar
          activeRoute="/stock"
          userFullName={user.fullName}
          userId={user.id}
          userRole={user.role}
        />
      </div>
      <main className="flex-1 flex flex-col overflow-y-auto print:overflow-visible print:h-auto print:block bg-[#fafbfc]">
        {children}
      </main>
    </div>
  );
}

