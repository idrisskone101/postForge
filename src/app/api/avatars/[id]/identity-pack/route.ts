import { NextRequest, NextResponse } from "next/server";
import {
  ensureAvatarIdentityPack,
  ensureHairstyleVariantsForAvatar,
  getLatestAvatarIdentityPack,
  serializeAvatarIdentityPack,
} from "@/lib/ugc/avatar-identity-pack";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pack = await getLatestAvatarIdentityPack(id);

    return NextResponse.json(serializeAvatarIdentityPack(pack));
  } catch (error) {
    console.error("Failed to load avatar identity pack:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load identity pack" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const pack =
      body.hairstyles === true
        ? await ensureHairstyleVariantsForAvatar(id)
        : await ensureAvatarIdentityPack(id, { force: body.force === true });

    return NextResponse.json(serializeAvatarIdentityPack(pack), { status: 202 });
  } catch (error) {
    console.error("Failed to start avatar identity pack:", error);
    const message = error instanceof Error ? error.message : "Failed to start identity pack";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Avatar not found") ? 404 : 500 }
    );
  }
}
