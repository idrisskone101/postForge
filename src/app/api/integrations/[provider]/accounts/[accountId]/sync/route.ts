import { isIntegrationProvider } from "@/lib/integrations/config";
import {
  integrationJsonError,
  isSameOriginMutation,
  noStoreJson,
  rejectCrossOriginMutation,
} from "@/lib/integrations/routes";
import { syncIntegrationAccount } from "@/lib/integrations/service";

export async function POST(
  request: Request,
  {
    params,
  }: { params: Promise<{ provider: string; accountId: string }> }
) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();
  const { provider, accountId } = await params;
  if (!isIntegrationProvider(provider)) {
    return noStoreJson(
      { error: "Unknown integration provider" },
      { status: 404 }
    );
  }
  try {
    return noStoreJson(
      await syncIntegrationAccount(provider, decodeURIComponent(accountId))
    );
  } catch (error) {
    console.error(
      `Failed to sync ${provider}:`,
      error instanceof Error ? error.name : "UnknownError"
    );
    return integrationJsonError(error);
  }
}
