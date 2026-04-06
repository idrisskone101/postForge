import { prisma } from "@/lib/db";
import { getAllModels } from "@/lib/ai/models";
import { storage } from "@/lib/storage";
import { GalleryPageClient } from "./gallery-page-client";

export const metadata = { title: "Gallery - PostForge" };

export default async function GalleryPage() {
  const files = await prisma.generatedFile.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      job: { select: { model: true, prompt: true } },
    },
  });

  const validFiles = (
    await Promise.all(
      files.map(async (file) =>
        (await storage.exists(file.localPath)) ? file : null
      )
    )
  ).filter(Boolean) as typeof files;

  const items = validFiles.map((file: { id: string; jobId: string; type: string; filename: string; width: number | null; height: number | null; durationSec: number | null; job: { model: string; prompt: string }; createdAt: Date }) => ({
    id: file.id,
    jobId: file.jobId,
    type: file.type as "image" | "video",
    url: `/api/files/${file.id}`,
    filename: file.filename,
    width: file.width ?? undefined,
    height: file.height ?? undefined,
    durationSec: file.durationSec ?? undefined,
    model: file.job.model,
    prompt: file.job.prompt,
    createdAt: file.createdAt.toISOString(),
  }));

  const models = getAllModels().map((m) => ({ id: m.id, name: m.name }));

  return <GalleryPageClient items={items} models={models} />;
}
