import { NextRequest, NextResponse } from "next/server";

import { runSlideshowMaintenanceTick } from "@/lib/slideshow/maintenance";

function bearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
}

async function tick(request: NextRequest) {
  const secrets = [
    process.env.SLIDESHOW_AUTOMATION_CRON_SECRET,
    process.env.CRON_SECRET,
    process.env.POSTFORGE_API_KEY,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  if (!secrets.length) {
    return NextResponse.json(
      { error: "Slideshow cron secret is not configured" },
      { status: 503 },
    );
  }
  if (!secrets.includes(bearerToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSlideshowMaintenanceTick();
  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    queuedImageJobs: result.queuedImageJobs,
    imageJobs: result.imageJobs,
  });
}

export async function GET(request: NextRequest) {
  return tick(request);
}

export async function POST(request: NextRequest) {
  return tick(request);
}
