import prisma from './src/app/lib/db';

async function testSave() {
  const jobId = "cmq4lnmjq0008hgua91s1r5no";
  const formData = {
    company: "Test",
    jobName: "Test",
    customer: "Test",
    customerPosition: "",
    address: "",
    siteAddress: "",
    quotationNo: "",
    sender: "",
    senderPhone: "",
    technician: "",
    technicianPhone: "",
    workInspect: false,
    workInstall: true,
    workRepair: false,
    workTraining: false,
    workOther: "",
    note: "",
  };

  try {
    // Check if installation order exists
    const existing = await prisma.installationOrder.findFirst({ where: { jobId } });
    if (existing) {
      console.log("Updating existing:", existing.id);
      const { workInspect, workInstall, workRepair, workTraining, workOther, ...restData } = formData;
      await prisma.installationOrder.update({
        where: { id: existing.id },
        data: {
          ...restData,
          checklist: { workInspect, workInstall, workRepair, workTraining, workOther },
        },
      });
      console.log("Update success");
    } else {
      console.log("Creating new");
      const { workInspect, workInstall, workRepair, workTraining, workOther, ...restData } = formData;
      const count = await prisma.installationOrder.count();
      await prisma.installationOrder.create({
        data: {
          installationNo: `TEST-${count + 1}`,
          status: "Draft",
          checklist: { workInspect, workInstall, workRepair, workTraining, workOther },
          jobId,
          ...restData,
        } as any,
      });
      console.log("Create success");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testSave();
