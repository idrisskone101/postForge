import { NextRequest, NextResponse } from "next/server";
import { foldPromptIntoVibeTemplate } from "@/lib/ai/collection-vibe";
import { parseSlideshowAestheticTemplate } from "@/lib/ai/slideshow-creator";
import {
  isSameOriginMutation,
  rejectCrossOriginMutation,
} from "@/lib/integrations/routes";

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const input = body as Record<string, unknown>;
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json(
      { error: "Write a prompt before folding it into the vibe JSON." },
      { status: 400 }
    );
  }
  if (prompt.length > 1_500) {
    return NextResponse.json(
      { error: "The prompt must be 1,500 characters or fewer." },
      { status: 400 }
    );
  }

  try {
    const template = parseSlideshowAestheticTemplate(input.template);
    const result = await foldPromptIntoVibeTemplate(template, prompt);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Folding failed.";
    const status = /Connect Ollama/i.test(message)
      ? 503
      : /template|prompt/i.test(message)
        ? 400
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
