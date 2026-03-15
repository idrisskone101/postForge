import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const sources = await prisma.tikTokSource.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sources);
  } catch (error) {
    console.error("Failed to list TikTok sources:", error);
    return NextResponse.json(
      { error: "Failed to list sources" },
      { status: 500 }
    );
  }
}
