import { isIntegrationProvider } from "@/lib/integrations/config";
import {
  integrationJsonError,
  isSameOriginMutation,
  noStoreJson,
  rejectCrossOriginMutation,
} from "@/lib/integrations/routes";
import {
  disconnectIntegrationProvider,
  forceDeleteLocalIntegrationData,
} from "@/lib/integrations/service";

const LOCAL_DELETE_CONFIRMATION = "DELETE LOCAL DATA";

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
    const payload = (await request.json().catch(() => null)) as {
      forceLocalDelete?: unknown;
      confirmation?: unknown;
    } | null;
    const forceLocalDelete = payload?.forceLocalDelete === true;
    if (
      forceLocalDelete &&
      payload?.confirmation !== LOCAL_DELETE_CONFIRMATION
    ) {
      return noStoreJson(
        { error: `Type ${LOCAL_DELETE_CONFIRMATION} to delete local data` },
        { status: 400 }
      );
    }
    const status = forceLocalDelete
      ? await forceDeleteLocalIntegrationData(provider)
      : await disconnectIntegrationProvider(provider);
    return noStoreJson({
      provider: status,
      disconnected: true,
      localDataDeleted: forceLocalDelete,
      remoteRevocationConfirmed: !forceLocalDelete,
    });
  } catch (error) {
    console.error(
      `Failed to disconnect ${provider}:`,
      error instanceof Error ? error.name : "UnknownError"
    );
    return integrationJsonError(error);
  }
}
