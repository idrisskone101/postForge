import { buildCloneSeed } from "./clone";
import { buildGenerationSeed } from "./generation";
import { buildIdentitySeed } from "./identities";
import type { DemoManifest } from "./manifest";
import { buildSlideshowSeed } from "./slideshows";
import type { DemoSeed, DemoSeedPart } from "./types";
import { buildWorkspaceSeed } from "./workspace";

export { loadDemoManifest } from "./manifest";
export type { DemoSeed } from "./types";

/**
 * The complete sample workspace for the fictional Loamly brand. Pure: the same
 * manifest and clock always produce the same rows, so a restore is repeatable.
 */
export function buildDemoSeed(manifest: DemoManifest, now: Date): DemoSeed {
  const seed: DemoSeed = {
    jobs: [],
    files: [],
    costLogs: [],
    avatars: [],
    identityPacks: [],
    identityImages: [],
    sources: [],
    references: [],
    projects: [],
    slides: [],
    slideshowAutomations: [],
    features: {},
  };

  const parts: DemoSeedPart[] = [
    buildGenerationSeed(manifest, now),
    buildIdentitySeed(manifest, now),
    buildCloneSeed(manifest, now),
    buildSlideshowSeed(manifest, now),
    buildWorkspaceSeed(manifest, now),
  ];
  for (const { features, ...rows } of parts) {
    for (const [table, values] of Object.entries(rows) as Array<
      [keyof Omit<DemoSeed, "features">, unknown[]]
    >) {
      (seed[table] as unknown[]).push(...values);
    }
    Object.assign(seed.features, features);
  }
  return seed;
}
