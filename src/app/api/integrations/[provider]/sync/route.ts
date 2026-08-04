import { isIntegrationProvider } from "@/lib/integrations/config";
import {
  integrationJsonError,
  isSameOriginMutation,
  noStoreJson,
  rejectCrossOriginMutation,
} from "@/lib/integrations/routes";
import { syncIntegrationProvider } from "@/lib/integrations/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();
  const { provider } = await params;
  if (!isIntegrationProvider(provider)) {
    return noStoreJson(
      { error: "Unknown integration provider" },
      { status: 404 }
    );
  }
  try {
    return noStoreJson(await syncIntegrationProvider(provider));
  } catch (error) {
    console.error(
      `Failed to sync ${provider}:`,
      error instanceof Error ? error.name : "UnknownError"
    );
    return integrationJsonError(error);
  }
}
