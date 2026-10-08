import React from "react";
import prisma from "@/app/lib/db";
import { notFound } from "next/navigation";
import InverterQcPrintClient from "./InverterQcPrintClient";

export const dynamic = "force-dynamic";

interface InverterQcPrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function InverterQcPrintPage({ params }: InverterQcPrintPageProps) {
  const { id } = await params;

  const repairOrder = await prisma.repairOrder.findFirst({
    where: {
      OR: [{ id }, { jobId: id }],
    },
    include: {
      job: true,
    },
  });

  if (!repairOrder) {
    notFound();
  }

  return <InverterQcPrintClient order={JSON.parse(JSON.stringify(repairOrder))} />;
}
