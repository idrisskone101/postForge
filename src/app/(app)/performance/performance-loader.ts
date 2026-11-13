import { getIntegrationPerformanceResponse } from "@/lib/integrations/service";
import type { PerformanceDataset } from "@/lib/performance/csv";
import { readWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";
import type { PerformanceInitial } from "./types";

/**
 * The two reads the page used to make after hydration, done on the server so the
 * first paint is the real page. Null hands loading and its error copy back to the client.
 */
export async function loadPerformanceInitial(): Promise<PerformanceInitial | null> {
  try {
    const [providerData, records] = await Promise.all([
      getIntegrationPerformanceResponse(),
      readWorkspaceFeatureRecords<PerformanceDataset>("connections"),
    ]);
    const csvDataset =
      records.find((record) => record.id === "performance-dataset" && record.source === "csv") ?? null;
    // The same JSON shape the client receives from the two API routes.
    return JSON.parse(
      JSON.stringify({ providerData, csvDataset, renderedAt: Date.now() }),
    ) as PerformanceInitial;
  } catch (error) {
    console.error(
      "Failed to load performance for first paint:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return null;
  }
}
