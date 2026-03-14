import { NextResponse } from "next/server";
import { getAllModels } from "@/lib/ai/models";

export async function GET() {
  try {
    const models = getAllModels();
    return NextResponse.json({ models });
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
