import React from "react";
import prisma from "@/app/lib/db";
import { notFound } from "next/navigation";
import GoodsReturnPrintClient from "./PrintClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "พิมพ์ใบส่งคืนสินค้า | Sales CRM",
};

export default async function GoodsReturnPrintPage({ params }: Props) {
  const { id } = await params;

  const doc = await prisma.goodsReturn.findUnique({
    where: { id },
    include: {
      company: true,
      job: true,
      quotation: true,
    },
  });

  if (!doc) {
    notFound();
  }

  // Serialize to plain object
  const plainData = JSON.parse(JSON.stringify(doc));

  return (
    <GoodsReturnPrintClient
      data={plainData}
      backHref="/store/returns"
      editHref={`/store/returns/${id}/edit`}
    />
  );
}

