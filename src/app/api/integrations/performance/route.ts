import { getIntegrationPerformanceResponse } from "@/lib/integrations/service";
import { integrationJsonError, noStoreJson } from "@/lib/http";

export async function GET() {
  try {
    return noStoreJson(await getIntegrationPerformanceResponse());
  } catch (error) {
    console.error(
      "Failed to read integration performance:",
      error instanceof Error ? error.name : "UnknownError"
    );
    return integrationJsonError(error);
  }
}
