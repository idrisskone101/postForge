import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

const DEFAULT_LIST_TAKE = 50;
const MAX_LIST_TAKE = 100;

function readListTake(searchParams: URLSearchParams) {
  const parsed = Number.parseInt(searchParams.get("limit") ?? String(DEFAULT_LIST_TAKE), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIST_TAKE;
  return Math.min(MAX_LIST_TAKE, Math.max(1, parsed));
}

function readListCursor(searchParams: URLSearchParams) {
  const cursor = searchParams.get("cursor");
  return cursor && cursor.length > 0 ? cursor : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const take = readListTake(searchParams);
    const cursor = readListCursor(searchParams);

    const sources = await prisma.tikTokSource.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        label: true,
        originalUrl: true,
        localPath: true,
        filename: true,
        durationSec: true,
        width: true,
        height: true,
        fileSizeBytes: true,
        thumbnailPath: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const nextCursor =
      sources.length === take ? sources[sources.length - 1]?.id ?? null : null;

    const items = (
      await Promise.all(
        sources.map(async (source) => {
          const exists = source.localPath
            ? await storage.exists(source.localPath)
            : false;
          return exists ? source : null;
        })
      )
    ).filter((source) => source !== null);

    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    console.error("Failed to list TikTok sources:", error);
    return NextResponse.json(
      { error: "Failed to list sources" },
      { status: 500 }
    );
  }
}
