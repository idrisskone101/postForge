import { noStoreJson } from "@/lib/http";
import { runYouTubeDataRetentionSweep } from "@/lib/integrations/retention";
import { isRetentionCronAuthorized } from "@/lib/integrations/retention-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isRetentionCronAuthorized(request)) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runYouTubeDataRetentionSweep();
    return noStoreJson({ ok: true, ...result });
  } catch (error) {
    console.error(
      "YouTube retention sweep failed:",
      error instanceof Error ? error.name : "UnknownError"
    );
    return noStoreJson(
      { error: "YouTube retention sweep failed" },
      { status: 500 }
    );
  }
}
