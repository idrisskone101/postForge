import * as fs from "fs/promises";
import * as path from "path";
import { DEMO_ASSETS_DIRECTORY } from "@/lib/storage/demo";

export type DemoAssetGroup =
  | "avatar"
  | "identity"
  | "gallery"
  | "slideshow"
  | "collection"
  | "clone-source"
  | "clone-source-thumbnail"
  | "clone-reference"
  | "clone-output"
  | "video";

/** One sample media file under demo/assets, as recorded when it was generated. */
export type DemoAsset = {
  key: string;
  /** Storage key and path relative to demo/assets. */
  path: string;
  group: DemoAssetGroup;
  kind: "image" | "video";
  mimeType: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  durationSec?: number;
  prompt: string;
  modelId: string;
  aspectRatio: string;
  referenceKeys?: string[];
  role?: string;
  avatar?: string;
};

export type DemoManifest = {
  /** Look up one asset by its path. Throws when the file is not in the manifest. */
  asset(assetPath: string): DemoAsset;
  /** Like `asset`, for media the sample set may legitimately lack. */
  find(assetPath: string): DemoAsset | undefined;
  group(group: DemoAssetGroup): DemoAsset[];
};

export function indexDemoAssets(assets: DemoAsset[]): DemoManifest {
  const byPath = new Map(assets.map((asset) => [asset.path, asset]));
  return {
    asset(assetPath) {
      const found = byPath.get(assetPath);
      if (!found) throw new Error(`Demo asset is missing from the manifest: ${assetPath}`);
      return found;
    },
    find(assetPath) {
      return byPath.get(assetPath);
    },
    group(group) {
      return assets.filter((asset) => asset.group === group);
    },
  };
}

export async function loadDemoManifest(
  baseDirectory = path.resolve(DEMO_ASSETS_DIRECTORY)
): Promise<DemoManifest> {
  const raw = await fs.readFile(path.join(baseDirectory, "manifest.json"), "utf8");
  const parsed = JSON.parse(raw) as { assets?: DemoAsset[] };
  if (!Array.isArray(parsed.assets) || parsed.assets.length === 0) {
    throw new Error("demo/assets/manifest.json lists no assets");
  }
  await Promise.all(
    parsed.assets.map(async (asset) => {
      const stat = await fs.stat(path.join(baseDirectory, asset.path));
      if (!stat.isFile() || stat.size === 0) {
        throw new Error(`Demo asset file is empty: ${asset.path}`);
      }
    })
  );
  return indexDemoAssets(parsed.assets);
}
