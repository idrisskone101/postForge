"use client";

import type { TikTokCreatorPublishingInfo, TikTokPrivacyLevel } from "@/lib/integrations/publishing";
import type { PublishDialogState } from "./hub-types";
import { CheckControl, FieldLabel } from "./publish-dialog-controls";

export function PublishDialogTiktokFields({
  state,
  creator,
  onChange,
}: {
  state: PublishDialogState;
  creator: TikTokCreatorPublishingInfo;
  onChange: (next: PublishDialogState) => void;
}) {
  return (
              <>
                <div className="min-w-0 rounded-lg border border-border bg-card p-3 text-[11px] leading-4 text-muted-foreground">
                  <b className="block min-w-0 break-words text-[11px] text-foreground [overflow-wrap:anywhere]">
                    {creator.creatorNickname} · @{creator.creatorUsername}
                  </b>
                  Current TikTok controls were checked live. Maximum video length:{" "}
                  {creator.maximumVideoDurationSec}s. PostForge marks generated media as AI-generated.
                </div>
                <FieldLabel label="Caption" detail={`${state.caption.length}/2200`}>
                  <textarea
                    value={state.caption}
                    maxLength={2200}
                    onChange={(event) =>
                      onChange({ ...state, caption: event.target.value })
                    }
                    className="min-h-24 w-full min-w-0 resize-y rounded-lg border border-border bg-white px-3 py-2 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  />
                </FieldLabel>
                <FieldLabel label="Who can watch" detail="Choose one; no default is assumed">
                  <select
                    value={state.tiktokPrivacy}
                    onChange={(event) =>
                      onChange({
                        ...state,
                        tiktokPrivacy: event.target.value as
                          | ""
                          | TikTokPrivacyLevel,
                      })
                    }
                    className="h-10 w-full min-w-0 rounded-lg border border-border bg-white px-3 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  >
                    <option value="">Select TikTok privacy</option>
                    {creator.privacyLevelOptions.map((privacy) => (
                      <option
                        key={privacy}
                        value={privacy}
                        disabled={
                          (state.brandContent && privacy === "SELF_ONLY") ||
                          !state.preflight.tiktokDirectPostApprovalAcknowledged
                        }
                      >
                        {privacy.replaceAll("_", " ").toLowerCase()}
                      </option>
                    ))}
                  </select>
                  {state.brandContent && state.tiktokPrivacy === "SELF_ONLY" && (
                    <p role="alert" className="mt-1 text-[12px] text-[var(--pf-danger)]">
                      Paid partnership posts cannot use Only me. Choose another option.
                    </p>
                  )}
                </FieldLabel>
                <div className="grid min-w-0 gap-2 sm:grid-cols-3">
                  <CheckControl
                    label="Allow comments"
                    checked={state.allowComment}
                    disabled={creator.commentDisabled}
                    onChange={(checked) =>
                      onChange({ ...state, allowComment: checked })
                    }
                  />
                  <CheckControl
                    label="Allow Duet"
                    checked={state.allowDuet}
                    disabled={creator.duetDisabled}
                    onChange={(checked) =>
                      onChange({ ...state, allowDuet: checked })
                    }
                  />
                  <CheckControl
                    label="Allow Stitch"
                    checked={state.allowStitch}
                    disabled={creator.stitchDisabled}
                    onChange={(checked) =>
                      onChange({ ...state, allowStitch: checked })
                    }
                  />
                </div>
                <CheckControl
                  label="This post promotes a brand, product, or service"
                  checked={state.commercial}
                  onChange={(checked) =>
                    onChange({
                      ...state,
                      commercial: checked,
                      brandContent: checked ? state.brandContent : false,
                      brandOrganic: checked ? state.brandOrganic : false,
                      brandedPolicyConfirmed: checked
                        ? state.brandedPolicyConfirmed
                        : false,
                    })
                  }
                />
                {state.commercial && (
                  <div className="min-w-0 space-y-2 rounded-lg border border-[var(--pf-lamp-amber)]/40 bg-[var(--pf-lamp-amber)]/10 p-3">
                    <p className="min-w-0 break-words text-[11px] leading-4 text-[var(--pf-lamp-amber)] [overflow-wrap:anywhere]">
                      Select at least one commercial disclosure. Branded content cannot use Only me privacy.
                    </p>
                    <CheckControl
                      label="Your brand"
                      checked={state.brandOrganic}
                      onChange={(checked) =>
                        onChange({ ...state, brandOrganic: checked })
                      }
                    />
                    <CheckControl
                      label="Branded content / paid partnership"
                      checked={state.brandContent}
                      onChange={(checked) =>
                        onChange({ ...state, brandContent: checked })
                      }
                    />
                    <p className="min-w-0 break-words text-[12px] font-semibold text-[var(--pf-lamp-amber)] [overflow-wrap:anywhere]">
                      TikTok will label this {state.brandContent ? "Paid partnership" : "Promotional content"}.
                    </p>
                    {state.brandContent && (
                      <>
                        <a
                          href="https://www.tiktok.com/legal/page/global/bc-policy/en"
                          target="_blank"
                          rel="noreferrer"
                          className="block min-w-0 break-words text-[12px] font-semibold text-[var(--pf-orange)] underline [overflow-wrap:anywhere] dark:text-[var(--pf-orange)]"
                        >
                          Read TikTok&apos;s Branded Content Policy
                        </a>
                      </>
                    )}
                    {!state.preflight.tiktokDirectPostApprovalAcknowledged &&
                      state.brandContent && (
                        <p role="alert" className="min-w-0 break-words text-[12px] text-[var(--pf-danger)] [overflow-wrap:anywhere]">
                          Live Direct Post is unavailable until TikTok approves this app. Internal or team-only upload tools may not qualify for approval.
                        </p>
                      )}
                  </div>
                )}
                {state.brandContent ? (
                  <CheckControl
                    label="By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation"
                    checked={
                      state.musicUsageConfirmed && state.brandedPolicyConfirmed
                    }
                    onChange={(checked) =>
                      onChange({
                        ...state,
                        musicUsageConfirmed: checked,
                        brandedPolicyConfirmed: checked,
                      })
                    }
                  />
                ) : (
                  <CheckControl
                    label="By posting, you agree to TikTok's Music Usage Confirmation"
                    checked={state.musicUsageConfirmed}
                    onChange={(checked) =>
                      onChange({ ...state, musicUsageConfirmed: checked })
                    }
                  />
                )}
                <a
                  href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                  target="_blank"
                  rel="noreferrer"
                  className="block min-w-0 break-words text-[12px] font-semibold text-[var(--pf-orange)] underline [overflow-wrap:anywhere] dark:text-[var(--pf-orange)]"
                >
                  Read TikTok&apos;s Music Usage Confirmation
                </a>
                <p className="min-w-0 break-words text-[12px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">
                  {state.preflight.tiktokDirectPostApprovalAcknowledged
                    ? "An operator acknowledged external TikTok Direct Post approval. This setting does not obtain or prove approval; verify it remains current in TikTok's developer portal. TikTok's status API does not return privacy."
                    : "Live TikTok publishing is unavailable until an operator verifies external Direct Post approval in TikTok's developer portal. Internal or team-only upload tools may not qualify. A configuration flag cannot substitute for provider approval."}
                </p>
              </>

  );
}
