import { getUser } from "@/app/lib/dal"
import { redirect } from "next/navigation"
import prisma from "@/app/lib/db"
import ManageInstallationForm from "./ManageInstallationForm";
import Sidebar from "@/app/components/Sidebar"

export default async function ManageInstallationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getUser()
  if (!session) {
    redirect("/login")
  }

  const { id: jobId } = await params

  const userRecord = await prisma.user.findUnique({
    where: { id: session.id },
    select: { phoneNumber: true }
  })

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { quotation: { include: { salesperson: true } } }
  })

  if (!job) {
    redirect("/jobs")
  }

  const installationOrder = await prisma.installationOrder.findFirst({
    where: { jobId }
  })

  let initialData = null
  if (installationOrder) {
    initialData = JSON.parse(JSON.stringify(installationOrder))
  } else {
    const company = job.quotation?.companyId ? await prisma.company.findUnique({
      where: { id: job.quotation.companyId },
      include: { contacts: true }
    }) : null;
    
    // Try to find the specific contact if customerName matches, or get the first contact
    const contact = company?.contacts?.find(c => c.contactName === job.customerName) 
      || (job.quotation?.contactId ? company?.contacts?.find(c => c.id === job.quotation?.contactId) : null)
      || company?.contacts?.[0];

    initialData = {
      jobId: job.id,
      jobName: job.item || job.jobNumber,
      company: company?.companyName || "",
      customer: job.customerName || contact?.contactName || "",
      customerPosition: contact?.position || "",
      address: company?.address || "",
      siteAddress: company?.shippingAddress || company?.address || "",
      quotationNo: job.quotationNumber || job.quotation?.quotationNumber || "",
      sender: job.sellerName || session.fullName || "",
      senderPhone: (job.quotation as any)?.salesperson?.phoneNumber || userRecord?.phoneNumber || "",
      technician: "",
      technicianPhone: "",
      workInspect: false,
      workInstall: true,
      workRepair: false,
      workTraining: false,
      workOther: "",
      note: ""
    }
  }

  const techniciansList = await prisma.user.findMany({
    where: { isActive: true },
    select: { fullName: true, phoneNumber: true }
  })

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        activeRoute="/jobs" 
        userFullName={session.fullName || ""} 
        userId={session.id} 
        userRole={session.role} 
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-4 md:px-8">
          <ManageInstallationForm 
            initialData={initialData} 
            isEdit={!!installationOrder} 
            currentUser={session} 
            technicians={techniciansList}
          />
        </div>
      </main>
    </div>
  )
}
