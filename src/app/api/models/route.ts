import { NextResponse } from "next/server";
import {
  getAvailableModels,
  getDefaultModel,
  readModelAvailability,
} from "@/lib/ai/model-availability";

export async function GET() {
  try {
    const [models, defaults] = await Promise.all([
      getAvailableModels(),
      (async () => ({
        image: await getDefaultModel("image"),
        video: await getDefaultModel("video"),
      }))(),
    ]);
    const availability = await readModelAvailability();
    return NextResponse.json({ models, defaults, availability });
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
