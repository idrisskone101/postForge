import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { randomUUID } from "node:crypto";
import {
  normalizeAvatarOrigin,
  normalizeAvatarProvenance,
  serializeAvatarApiRecord,
} from "@/lib/avatar-provenance";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const avatar = await prisma.avatar.findUnique({ where: { id } });
    if (!avatar) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    const exists = await storage.exists(avatar.localPath);
    if (!exists) {
      return NextResponse.json({ error: "Avatar file not found on disk" }, { status: 404 });
    }

    const data = await storage.read(avatar.localPath);

    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": avatar.mimeType,
        "Content-Length": String(data.length),
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Failed to serve avatar:", error);
    return NextResponse.json({ error: "Failed to serve avatar" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const current = await prisma.avatar.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    const rawName = formData.get("name");
    const rawProvenance = formData.get("provenance");
    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "file must be an image" }, { status: 400 });
    }
    const name =
      typeof rawName === "string" && rawName.trim()
        ? rawName.trim().slice(0, 80)
        : current.name;
    let provenance: unknown = current.provenance;
    if (typeof rawProvenance === "string" && rawProvenance.trim()) {
      try {
        provenance = JSON.parse(rawProvenance);
      } catch {
        return NextResponse.json(
          { error: "provenance must be valid JSON" },
          { status: 400 }
        );
      }
    }
    const [references, identityImages] = await Promise.all([
      prisma.ugcReferenceImage.findMany({
        where: { avatarId: id },
        select: { localPath: true },
      }),
      prisma.avatarIdentityImage.findMany({
        where: { pack: { avatarId: id } },
        select: { localPath: true },
      }),
    ]);
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.type === "image/png" ? "png" : "jpg";
    const filename = `${randomUUID()}.${extension}`;
    const localPath = await storage.save("avatars", filename, buffer);
    const avatar = await prisma
      .$transaction(async (transaction) => {
        const updated = await transaction.avatar.update({
          where: { id },
          data: {
            name,
            localPath,
            filename,
            mimeType: file.type,
            fileSizeBytes: buffer.length,
            origin: normalizeAvatarOrigin(formData.get("origin") ?? current.origin),
            provenance: normalizeAvatarProvenance(provenance) ?? undefined,
          },
        });
        await transaction.ugcReferenceImage.deleteMany({ where: { avatarId: id } });
        await transaction.avatarIdentityPack.deleteMany({ where: { avatarId: id } });
        return updated;
      })
      .catch(async (error) => {
        await storage.delete(localPath).catch(() => undefined);
        throw error;
      });
    if (current.localPath !== localPath) {
      await storage.delete(current.localPath).catch(() => undefined);
    }
    await Promise.all(
      [...references, ...identityImages].map((record) =>
        storage.delete(record.localPath).catch(() => undefined)
      )
    );
    return NextResponse.json(serializeAvatarApiRecord(avatar));
  } catch (error) {
    console.error("Failed to update avatar:", error);
    return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [avatar, references, identityImages] = await Promise.all([
      prisma.avatar.findUnique({ where: { id } }),
      prisma.ugcReferenceImage.findMany({
        where: { avatarId: id },
        select: { localPath: true },
      }),
      prisma.avatarIdentityImage.findMany({
        where: { pack: { avatarId: id } },
        select: { localPath: true },
      }),
    ]);

    if (!avatar) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    await Promise.all([
      storage.delete(avatar.localPath),
      ...references.map((reference) => storage.delete(reference.localPath)),
      ...identityImages.map((image) => storage.delete(image.localPath)),
    ]);
    await prisma.avatar.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete avatar:", error);
    return NextResponse.json({ error: "Failed to delete avatar" }, { status: 500 });
  }
}
