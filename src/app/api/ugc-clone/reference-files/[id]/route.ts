import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = await prisma.generatedFile.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      mimeType: true,
      width: true,
      height: true,
      filename: true,
    },
  });

  if (!file) {
    return NextResponse.json({ error: "Reference file not found" }, { status: 404 });
  }

  return NextResponse.json(file);
}

