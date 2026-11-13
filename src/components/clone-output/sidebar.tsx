import { Play } from "lucide-react";
import { FileImage } from "@/components/file-image";
import { Icon, KeyValueList, buttonClass } from "@/components/workbench";
import { MODEL_REGISTRY } from "@/lib/ai/model-registry";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { formatDuration } from "@/components/clone-output/parse";
import { formatRunDuration } from "@/components/clone-output/run-state";
import type { CloneOutputReviewView } from "@/components/clone-output/types";

export function CloneOutputReviewSidebar({ review }: { review: CloneOutputReviewView }) {
  const { job, featured } = review;
  return (
    <>
      <section aria-label="Clone details" className="wb-panel gap-3">
        <KeyValueList
          className="[&_dd]:font-normal"
          rows={[
            { label: "Cost", value: formatCost(job.actualCost ?? job.estimatedCost), mono: true },
            { label: "Time", value: formatRunDuration(job.durationMs) },
            { label: "Model", value: MODEL_REGISTRY[job.model]?.name ?? job.model },
            {
              label: "Resolution",
              value:
                featured?.width && featured.height
                  ? `${featured.width} x ${featured.height}`
                  : "-",
            },
            { label: "Created", value: formatRelativeDate(job.createdAt), mono: true },
          ]}
        />
      </section>
      <CloneOutputInputs review={review} />
      <CloneOutputChecks review={review} />
    </>
  );
}

const ROW = "flex min-w-0 items-center gap-3 border-t border-hairline py-3 first:border-t-0";
const ROW_TITLE = "truncate text-[14px] font-semibold leading-[18px] text-fg";
const ROW_META = "truncate text-[13px] leading-4 text-fg-secondary";

function CloneOutputInputs({ review }: { review: CloneOutputReviewView }) {
  const {
    sourceVideo,
    sourceTitle,
    sourceUrl,
    sourcePreviewUrl,
    avatarPreviewUrl,
    identityName,
    reference,
  } = review;
  const sourceMeta = sourceVideo
    ? `${sourceVideo.width} x ${sourceVideo.height} - ${formatDuration(sourceVideo.durationSec)}`
    : "Original source context";

  return (
    <section aria-label="Clone inputs" className="wb-panel gap-0 py-2">
      <div className={ROW}>
        {sourcePreviewUrl && sourceVideo ? (
          <details className="group min-w-0 flex-1">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg focus-visible:shadow-[0_0_0_2px_var(--pf-ember)] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <span className="relative grid h-14 w-9 shrink-0 place-items-center overflow-hidden rounded-sm bg-media">
                <video
                  src={sourcePreviewUrl}
                  muted
                  preload="metadata"
                  aria-hidden="true"
                  className="absolute inset-0 size-full object-cover"
                />
                <Play className="relative size-3.5 fill-current text-[var(--pf-on-media)]" strokeWidth={1.5} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={ROW_TITLE}>{sourceTitle}</span>
                <span className={ROW_META}>
                  {sourceMeta}
                  <span className="sr-only"> View source video</span>
                </span>
              </span>
            </summary>
            <video
              src={sourcePreviewUrl}
              width={sourceVideo.width}
              height={sourceVideo.height}
              controls
              preload="metadata"
              className="mt-3 max-h-80 w-full rounded-lg bg-media object-contain"
            />
          </details>
        ) : (
          <>
            <span className="h-14 w-9 shrink-0 rounded-sm bg-media" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={ROW_TITLE}>{sourceTitle}</span>
              <span className={ROW_META}>{sourceMeta}</span>
            </span>
          </>
        )}
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonClass("quiet", 32)} mt-3 self-start`}
          >
            View original
          </a>
        )}
      </div>
      <div className={ROW}>
        <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-[var(--pf-radius-pill)] bg-media text-fg-muted">
          {avatarPreviewUrl ? (
            <FileImage src={avatarPreviewUrl} alt={`${identityName} avatar`} sizes="36px" />
          ) : (
            <Icon name="characters" size={16} />
          )}
        </span>
        <span className={ROW_TITLE}>{identityName}</span>
      </div>
      {reference && (
        <div className={ROW}>
          <span className="relative h-14 w-9 shrink-0 overflow-hidden rounded-sm bg-media">
            <FileImage
              src={reference.previewUrl}
              alt={`${reference.label} used for this clone`}
              sizes="36px"
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={ROW_TITLE}>{reference.label}</span>
            <span className="font-mono text-[12px] leading-4 text-fg-muted" title={reference.id}>
              {reference.id.slice(0, 8)}
            </span>
          </span>
          <a
            href={reference.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("quiet", 32)}
          >
            Open
          </a>
        </div>
      )}
    </section>
  );
}

function CloneOutputChecks({ review }: { review: CloneOutputReviewView }) {
  const { avatarId, sourceVideo, job, featured, reference } = review;
  const checks = [
    { label: "Identity", ready: Boolean(avatarId) },
    { label: "Source", ready: Boolean(sourceVideo || job.tikTokSource) },
    { label: "Output", ready: Boolean(featured) },
    { label: "Reference", ready: Boolean(reference) },
  ];
  const readyCount = checks.filter((check) => check.ready).length;

  return (
    <section aria-label="Input checks" className="wb-panel gap-1 pb-3.5">
      <div className="flex h-[26px] shrink-0 items-baseline justify-between">
        <h2 className="wb-panel-title">Input checks</h2>
        <span className="text-[13px] leading-4 text-fg-secondary">
          {readyCount} / {checks.length}
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-4">
        {checks.map((check) => (
          <li key={check.label} className="flex h-8 min-w-0 flex-[1_0_140px] items-center gap-2.5">
            <span
              className="wb-status-badge size-5 [&>svg]:size-[11px]"
              data-tone={check.ready ? "ok" : "neutral"}
            >
              <Icon name={check.ready ? "check" : "x"} size={11} strokeWidth={3} />
            </span>
            <span
              className={
                check.ready
                  ? "text-[14px] font-medium leading-[18px] text-fg"
                  : "text-[14px] font-medium leading-[18px] text-fg-muted"
              }
            >
              {check.label}
              {!check.ready && <span className="sr-only"> unavailable</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
