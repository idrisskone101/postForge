import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    const avatarId = searchParams.get("avatarId");

    if (!avatarId) {
      return NextResponse.json(
        { error: "avatarId is required" },
        { status: 400 }
      );
    }

    const take = readListTake(searchParams);
    const cursor = readListCursor(searchParams);

    const references = await prisma.ugcReferenceImage.findMany({
      where: { avatarId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        avatarId: true,
        prompt: true,
        createdAt: true,
        filename: true,
        mimeType: true,
        width: true,
        height: true,
        fileSizeBytes: true,
        tikTokSource: {
          select: {
            id: true,
            label: true,
            originalUrl: true,
          },
        },
      },
    });

    const nextCursor =
      references.length === take
        ? references[references.length - 1]?.id ?? null
        : null;

    return NextResponse.json({
      items: references.map((reference) => ({
        id: reference.id,
        avatarId: reference.avatarId,
        prompt: reference.prompt,
        createdAt: reference.createdAt,
        filename: reference.filename,
        mimeType: reference.mimeType,
        width: reference.width,
        height: reference.height,
        fileSizeBytes: reference.fileSizeBytes,
        previewUrl: `/api/ugc-clone/references/${reference.id}`,
        source: reference.tikTokSource,
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("Failed to list UGC reference images:", error);
    return NextResponse.json(
      { error: "Failed to list saved references" },
      { status: 500 }
    );
  }
}
