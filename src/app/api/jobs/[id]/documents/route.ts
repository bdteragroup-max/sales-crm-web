import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/app/lib/dal";
import prisma from "@/app/lib/db";
import { createClient } from "@/utils/supabase/server";

import { cookies } from "next/headers";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const documents = await prisma.jobDocument.findMany({
      where: { jobId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("GET /api/jobs/[id]/documents Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const formData = await req.formData();
    const type = formData.get("type") as string;
    const file = formData.get("file") as File | null;

    if (!type || !file) {
      return NextResponse.json({ error: "Missing type or file" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 20MB" }, { status: 400 });
    }

    // Sanitize filename
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const path = `job-documents/${jobId}/${type}/${safeName}`;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error: uploadError } = await supabase.storage
      .from("uploadsService")
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("uploadsService")
      .getPublicUrl(path);

    const doc = await prisma.jobDocument.create({
      data: {
        jobId,
        type,
        fileUrl: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json(doc);
  } catch (error: any) {
    console.error("POST /api/jobs/[id]/documents Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
