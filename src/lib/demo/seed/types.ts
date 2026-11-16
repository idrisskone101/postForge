import type { Prisma } from "@/generated/prisma/client";
import type { WorkspaceFeature } from "@/lib/workspace-feature-store";

/** Everything the demo workspace holds, ready to insert into an empty database. */
export type DemoSeed = {
  jobs: Prisma.GenerationJobCreateManyInput[];
  files: Prisma.GeneratedFileCreateManyInput[];
  costLogs: Prisma.CostLogCreateManyInput[];
  avatars: Prisma.AvatarCreateManyInput[];
  identityPacks: Prisma.AvatarIdentityPackCreateManyInput[];
  identityImages: Prisma.AvatarIdentityImageCreateManyInput[];
  sources: Prisma.TikTokSourceCreateManyInput[];
  references: Prisma.UgcReferenceImageCreateManyInput[];
  projects: Prisma.SlideshowProjectCreateManyInput[];
  slides: Prisma.SlideshowSlideCreateManyInput[];
  slideshowAutomations: Prisma.SlideshowAutomationCreateManyInput[];
  features: Partial<Record<WorkspaceFeature, Array<{ id: string }>>>;
};

export type DemoSeedPart = Partial<Omit<DemoSeed, "features">> & {
  features?: DemoSeed["features"];
};
