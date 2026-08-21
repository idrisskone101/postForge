import type { AutomationRecord, AutomationSocialDestination } from "@/lib/automations";
import {
  getPublicIntegrationStatus,
  getTikTokPublishingPreflight,
  IntegrationPublishScopeError,
} from "@/lib/integrations/service";
import { noStoreJson } from "@/lib/http";
import { truncateUnicodeCodePoints, truncateUtf8Bytes } from "@/lib/unicode";
import type { ApprovedVideo } from "./publish-media";

export async function runAutomationPublishPreflight(input: {
  automation: AutomationRecord;
  destination: AutomationSocialDestination;
  accountId: string;
  file: ApprovedVideo;
  defaultCaption: string;
}) {
  const { automation, destination, accountId, file, defaultCaption } = input;
  const status = await getPublicIntegrationStatus(destination);
  const bound = status.accounts.find(
    (candidate) => candidate.account.id === accountId
  );
  if (
    status.configuration !== "ready" ||
    !status.connected ||
    !bound ||
    bound.authorization.status !== "healthy" ||
    !bound.capabilities.publish
  ) {
    throw new IntegrationPublishScopeError();
  }
  const tiktok =
    destination === "tiktok"
      ? await getTikTokPublishingPreflight(accountId)
      : null;
  return noStoreJson({
    provider: destination,
    account: tiktok?.account ?? bound.account,
    asset: {
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      width: file.width,
      height: file.height,
      durationSec: file.durationSec,
      fileSizeBytes: file.fileSizeBytes,
      previewUrl: `/api/files/${encodeURIComponent(file.id)}`,
    },
    caption: defaultCaption,
    youtube:
      destination === "youtube"
        ? {
            title: truncateUnicodeCodePoints(
              automation.hook.selected.trim(),
              100
            ),
            description: truncateUtf8Bytes(defaultCaption, 5000),
          }
        : null,
    visibility:
      destination === "instagram" ? "public" : "private",
    creator: tiktok?.creator ?? null,
    tiktokDirectPostApprovalAcknowledged:
      tiktok?.directPostApprovalAcknowledged ?? false,
  });
}
