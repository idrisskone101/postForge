import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import type { CollectionAssetRecord } from "@/lib/collections";
import { upsertWorkspaceFeatureRecord } from "@/lib/workspace-feature-store";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are supported" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Images must be 25 MB or smaller" }, { status: 400 });
    }

    const id = randomUUID();
    const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
    const filename = `${id}.${extension}`;
    const localPath = await storage.save(
      "collection-assets",
      filename,
      Buffer.from(await file.arrayBuffer())
    );
    const record: CollectionAssetRecord = {
      id,
      kind: "asset",
      name: file.name,
      filename,
      mimeType: file.type,
      fileSizeBytes: file.size,
      localPath,
      createdAt: new Date().toISOString(),
    };
    const records = await upsertWorkspaceFeatureRecord("collections", record);
    return NextResponse.json({ record, records }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload collection asset:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
