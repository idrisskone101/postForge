import { getIntegrationsResponse } from "@/lib/integrations/service";
import { integrationJsonError, noStoreJson } from "@/lib/integrations/routes";

export async function GET() {
  try {
    return noStoreJson(await getIntegrationsResponse());
  } catch (error) {
    console.error(
      "Failed to read integration statuses:",
      error instanceof Error ? error.name : "UnknownError"
    );
    return integrationJsonError(error);
  }
}
