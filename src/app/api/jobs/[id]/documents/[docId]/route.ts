import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/app/lib/dal";
import prisma from "@/app/lib/db";
import { createClient } from "@/utils/supabase/server";

import { cookies } from "next/headers";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { docId } = await context.params;

    const document = await prisma.jobDocument.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Attempt to extract path from publicUrl to delete from storage
    // publicUrl looks like: https://[project].supabase.co/storage/v1/object/public/uploadsService/job-documents/...
    const bucketAndPath = document.fileUrl.split("/object/public/uploadsService/")[1];
    
    if (bucketAndPath) {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      const { error: removeError } = await supabase.storage
        .from("uploadsService")
        .remove([bucketAndPath]);

      if (removeError) {
        console.error("Storage delete error:", removeError);
        // Continue to delete from DB even if storage delete fails
      }
    }

    await prisma.jobDocument.delete({
      where: { id: docId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/jobs/[id]/documents/[docId] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
