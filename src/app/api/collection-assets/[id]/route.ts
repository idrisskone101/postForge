import { NextRequest, NextResponse } from "next/server";
import { isStoragePathUnder, storage } from "@/lib/storage";
import {
  isCollectionAssetRecord,
  removeCollectionAssetReferences,
  type CollectionAssetRecord,
  type CollectionFeatureRecord,
} from "@/lib/collections";
import {
  readWorkspaceFeatureRecords,
  updateWorkspaceFeatureRecords,
} from "@/lib/workspace-feature-store";

async function findAsset(id: string) {
  const records = await readWorkspaceFeatureRecords<CollectionFeatureRecord>("collections");
  const asset = records.find(
    (record): record is CollectionAssetRecord =>
      record.id === id && isCollectionAssetRecord(record)
  );
  return asset && isStoragePathUnder(asset.localPath, ["collection-assets"])
    ? asset
    : undefined;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await findAsset(id);
    if (!asset || !isCollectionAssetRecord(asset)) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    const data = await storage.read(asset.localPath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(data.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to serve collection asset:", error);
    return NextResponse.json({ error: "Failed to load asset" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const records = await readWorkspaceFeatureRecords<CollectionFeatureRecord>("collections");
    const asset = records.find(
      (record) =>
        record.id === id &&
        isCollectionAssetRecord(record) &&
        isStoragePathUnder(record.localPath, ["collection-assets"])
    );
    if (!asset || !isCollectionAssetRecord(asset)) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    const updatedAt = new Date().toISOString();
    await updateWorkspaceFeatureRecords<CollectionFeatureRecord>(
      "collections",
      (current) => removeCollectionAssetReferences(current, id, updatedAt)
    );
    // The database is the source of reachability. Delete the binary only
    // after every collection reference has been removed atomically so a
    // concurrent request can never restore a dangling asset id.
    await storage.delete(asset.localPath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete collection asset:", error);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
