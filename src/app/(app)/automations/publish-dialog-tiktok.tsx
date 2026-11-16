"use client";

import type { TikTokCreatorPublishingInfo, TikTokPrivacyLevel } from "@/lib/integrations/publishing";
import type { PublishDialogState } from "./hub-types";
import { CheckControl, FieldLabel, publishLinkClass } from "./publish-dialog-controls";

export function PublishDialogTiktokFields({
  state,
  creator,
  onChange,
}: {
  state: PublishDialogState;
  creator: TikTokCreatorPublishingInfo;
  onChange: (next: PublishDialogState) => void;
}) {
  const privacyBlocked = state.brandContent && state.tiktokPrivacy === "SELF_ONLY";
  const approved = state.preflight.tiktokDirectPostApprovalAcknowledged;
  return (
    <>
      <div className="wb-notice flex-col items-start gap-0.5">
        <strong className="min-w-0 break-words [overflow-wrap:anywhere]">
          {creator.creatorNickname} (@{creator.creatorUsername})
        </strong>
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">
          Current TikTok controls were checked live. Maximum video length:{" "}
          {creator.maximumVideoDurationSec}s. PostForge marks generated media as AI-generated.
        </span>
      </div>
      <FieldLabel label="Caption" detail={`${state.caption.length}/2200`} mono>
        {(id) => (
          <textarea
            id={id}
            value={state.caption}
            maxLength={2200}
            onChange={(event) => onChange({ ...state, caption: event.target.value })}
            className="wb-input"
          />
        )}
      </FieldLabel>
      <FieldLabel label="Who can watch" detail="Choose one; no default is assumed">
        {(id) => (
          <>
            <select
              id={id}
              value={state.tiktokPrivacy}
              aria-invalid={privacyBlocked ? "true" : undefined}
              onChange={(event) =>
                onChange({
                  ...state,
                  tiktokPrivacy: event.target.value as "" | TikTokPrivacyLevel,
                })
              }
              className={state.tiktokPrivacy ? "wb-input" : "wb-input text-fg-muted"}
            >
              <option value="">Select TikTok privacy</option>
              {creator.privacyLevelOptions.map((privacy) => (
                <option
                  key={privacy}
                  value={privacy}
                  disabled={(state.brandContent && privacy === "SELF_ONLY") || !approved}
                >
                  {privacyLabel(privacy)}
                </option>
              ))}
            </select>
            {privacyBlocked && (
              <p role="alert" className="wb-field-error">
                Paid partnership posts cannot use Only me. Choose another option.
              </p>
            )}
          </>
        )}
      </FieldLabel>
      <div className="flex min-w-0 flex-col divide-y divide-hairline">
        <div className="flex min-w-0 flex-wrap gap-x-6 gap-y-2 py-2.5">
          <CheckControl
            label="Allow comments"
            checked={state.allowComment}
            disabled={creator.commentDisabled}
            onChange={(checked) => onChange({ ...state, allowComment: checked })}
          />
          <CheckControl
            label="Allow Duet"
            checked={state.allowDuet}
            disabled={creator.duetDisabled}
            onChange={(checked) => onChange({ ...state, allowDuet: checked })}
          />
          <CheckControl
            label="Allow Stitch"
            checked={state.allowStitch}
            disabled={creator.stitchDisabled}
            onChange={(checked) => onChange({ ...state, allowStitch: checked })}
          />
        </div>
        <CheckControl
          className="py-2.5"
          label="This post promotes a brand, product, or service"
          checked={state.commercial}
          onChange={(checked) =>
            onChange({
              ...state,
              commercial: checked,
              brandContent: checked ? state.brandContent : false,
              brandOrganic: checked ? state.brandOrganic : false,
              brandedPolicyConfirmed: checked ? state.brandedPolicyConfirmed : false,
            })
          }
        >
          {state.commercial && (
            <div className="flex min-w-0 flex-col gap-2.5 pt-2">
              <p className="wb-notice min-w-0 break-words [overflow-wrap:anywhere]" data-tone="warn">
                Select at least one commercial disclosure. Branded content cannot use Only me privacy.
              </p>
              <CheckControl
                label="Your brand"
                checked={state.brandOrganic}
                onChange={(checked) => onChange({ ...state, brandOrganic: checked })}
              />
              <CheckControl
                label="Branded content / paid partnership"
                checked={state.brandContent}
                onChange={(checked) => onChange({ ...state, brandContent: checked })}
              />
              <p className="min-w-0 break-words text-[13px] font-semibold leading-[18px] text-fg [overflow-wrap:anywhere]">
                TikTok will label this {state.brandContent ? "Paid partnership" : "Promotional content"}.
              </p>
              {state.brandContent && (
                <a
                  href="https://www.tiktok.com/legal/page/global/bc-policy/en"
                  target="_blank"
                  rel="noreferrer"
                  className={publishLinkClass}
                >
                  Read TikTok&apos;s Branded Content Policy
                </a>
              )}
              {!approved && state.brandContent && (
                <p role="alert" className="wb-notice min-w-0 break-words [overflow-wrap:anywhere]" data-tone="bad">
                  Live Direct Post is unavailable until TikTok approves this app. Internal or team-only upload tools may not qualify for approval.
                </p>
              )}
            </div>
          )}
        </CheckControl>
        <CheckControl
          className="py-2.5"
          label={
            state.brandContent
              ? "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation"
              : "By posting, you agree to TikTok's Music Usage Confirmation"
          }
          checked={
            state.brandContent
              ? state.musicUsageConfirmed && state.brandedPolicyConfirmed
              : state.musicUsageConfirmed
          }
          onChange={(checked) =>
            onChange(
              state.brandContent
                ? { ...state, musicUsageConfirmed: checked, brandedPolicyConfirmed: checked }
                : { ...state, musicUsageConfirmed: checked }
            )
          }
        >
          <a
            href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
            target="_blank"
            rel="noreferrer"
            className={publishLinkClass}
          >
            Read TikTok&apos;s Music Usage Confirmation
          </a>
        </CheckControl>
      </div>
      <p
        className={
          approved
            ? "min-w-0 break-words text-[13px] leading-[18px] text-fg-muted [overflow-wrap:anywhere]"
            : "wb-notice min-w-0 break-words [overflow-wrap:anywhere]"
        }
        data-tone={approved ? undefined : "warn"}
      >
        {approved
          ? "An operator acknowledged external TikTok Direct Post approval. This setting does not obtain or prove approval; verify it remains current in TikTok's developer portal. TikTok's status API does not return privacy."
          : "Live TikTok publishing is unavailable until an operator verifies external Direct Post approval in TikTok's developer portal. Internal or team-only upload tools may not qualify. A configuration flag cannot substitute for provider approval."}
      </p>
    </>
  );
}

function privacyLabel(privacy: TikTokPrivacyLevel) {
  const words = privacy.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
