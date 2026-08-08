import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

import {
  generateSlideshowCreatorVisuals,
  parseSlideshowAestheticTemplate,
} from "@/lib/ai/slideshow-creator";
import { prisma } from "@/lib/db";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * POST /api/slideshows/[id]/generate-visuals
 *
 * Queue GPT Image 2 visuals for every slide in a project using a frozen
 * aesthetic JSON template. Per-slide scenes drive variation (location,
 * activity) while the core vibe stays fixed.
 *
 * The accepted template is persisted on the project's settings so the same
 * visual direction can be reused or tuned later. This is an explicit,
 * cost-bearing mutation — the caller must have already reviewed the copy.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const { id } = await params;
    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 }
      );
    }

    // Validate the template before touching the project.
    let template;
    try {
      template = parseSlideshowAestheticTemplate(body.template);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid template" },
        { status: 400 }
      );
    }

    const slidesRaw = body.slides;
    if (!Array.isArray(slidesRaw) || slidesRaw.length === 0) {
      return NextResponse.json(
        { error: "slides must be a non-empty array" },
        { status: 400 }
      );
    }

    const result = await generateSlideshowCreatorVisuals({
      projectId: id,
      template,
      slides: slidesRaw,
      aspectRatio:
        body.aspectRatio === "4:5" ||
        body.aspectRatio === "1:1" ||
        body.aspectRatio === "16:9"
          ? body.aspectRatio
          : "9:16",
      model: typeof body.model === "string" ? body.model : undefined,
    });

    // Persist the accepted template + slide scenes so a later regeneration can
    // reuse the same visual direction without the operator re-pasting it.
    try {
      const existing = await prisma.slideshowProject.findUnique({
        where: { id },
        select: { settings: true },
      });
      const currentSettings =
        existing?.settings && typeof existing.settings === "object"
          ? existing.settings
          : {};
      await prisma.slideshowProject.update({
        where: { id },
        data: {
          settings: {
            ...currentSettings,
            creator: { template, updatedAt: new Date().toISOString() },
          } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (persistError) {
      console.error(
        "[Slideshow Creator] Failed to persist template; generation already queued:",
        persistError
      );
    }

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate slideshow visuals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
