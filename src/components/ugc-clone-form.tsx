"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TikTokInput, type TikTokVideoInfo } from "@/components/tiktok-input";
import { VideoTrimmer } from "@/components/video-trimmer";
import { AvatarPicker } from "@/components/avatar-picker";
import { CollectionReferencePicker } from "@/components/collection-reference-picker";
import { MediaPreviewFrame } from "@/components/media-preview";
import { WorkspaceState } from "@/components/workspace-state";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { calculateEstimatedCost, BRIA_ERASER_COST_PER_SEC, getModelsByType } from "@/lib/ai/models";
import type { ModelDefinition } from "@/lib/ai/types";
import { apiGet, apiPost } from "@/lib/api/client";
import {
  consumeCloneHandoffQuery,
  isSupportedCloneReferenceFile,
  readCloneHandoffQuery,
  type CloneReferenceFileMetadata,
} from "@/lib/ugc-clone-handoff";
import {
  Loader2,
  Check,
  ArrowLeft,
  Sparkles,
  PenLine,
  Volume2,
  Video,
  Users,
  Layers,
  Zap,
  SlidersHorizontal,
  CheckCircle2,
  ChevronDown,
  Eye,
} from "lucide-react";

const IDENTITY_ROLE_LABELS: Record<string, string> = {
  front: "Front",
  threeQuarterLeft: "3/4 Left",
  threeQuarterRight: "3/4 Right",
  expressionNeutralOrSmile: "Expression",
  hairDown: "Hair down",
  halfUpHalfDown: "Half ponytail",
  ponytail: "Ponytail",
  bunUpdo: "Bun / updo",
};

const UGC_CLONE_TIPS = [
  {
    title: "Start with the cleanest hook",
    body: "Pick a source where the first 1-2 seconds clearly show the face, motion, and spoken setup you want to preserve.",
  },
  {
    title: "Trim before you generate",
    body: "Cut dead air, jump cuts, and outro moments so motion control focuses on the useful part of the clip.",
  },
  {
    title: "Use a front-facing identity",
    body: "Choose an avatar with a clear face, even lighting, and minimal accessories for stronger identity transfer.",
  },
  {
    title: "Anchor the visual style",
    body: "Add a 9:16 reference that matches the lighting and framing you want in the final clone.",
  },
  {
    title: "Keep audio only when it helps",
    body: "Preserve original sound for timing and delivery; turn it off when the source audio is noisy or off-brand.",
  },
  {
    title: "Remove overlays early",
    body: "Strip heavy captions or stickers before generation when they cover faces, hands, or product motion.",
  },
  {
    title: "Use Pro for hard motion",
    body: "Move up to the Pro video model when the source has fast gestures, dance movement, or frequent face turns.",
  },
  {
    title: "Review reference before video",
    body: "A strong reference still reduces wasted video runs because identity, lighting, and framing are checked first.",
  },
] as const;

const UGC_CLONE_TIP_INDEX_KEY = "postforge:ugc-clone:tip-index";
const REFERENCE_BATCH_OPTIONS = [1, 2, 3] as const;
const REFERENCE_LIBRARY_PAGE_SIZE = 24;
type ReferenceBatchSize = (typeof REFERENCE_BATCH_OPTIONS)[number];

function formatIdentityRole(role: string) {
  return IDENTITY_ROLE_LABELS[role] ?? role;
}

function CloneModelSelect({
  label,
  description,
  accentClassName,
  className,
  models,
  selectedValue,
  onValueChange,
  getCost,
}: {
  label: string;
  description: string;
  accentClassName: string;
  className?: string;
  models: ModelDefinition[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  getCost: (modelId: string) => string;
}) {
  const selectedModel = models.find((model) => model.id === selectedValue) ?? models[0];
  const compactLabel = label === "Final video" ? "Video" : label === "Reference image" ? "Reference" : label;
  const selectedModelLabel = selectedModel?.name.replace(" Motion Control", "");

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="sr-only">
        {label}
      </legend>
      <Select
        value={selectedValue}
        onValueChange={(value) => {
          if (value) onValueChange(value);
        }}
      >
        <SelectTrigger
          aria-label={label}
          className="h-10! min-h-10 w-full min-w-0 border-border bg-white px-3 py-2 text-foreground hover:bg-muted dark:bg-muted/50 dark:text-white dark:hover:bg-muted [&>span]:min-w-0 [&>span]:flex-1"
        >
          <SelectValue>
            {() => (
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3 overflow-hidden">
                <span className="min-w-0 flex-1 overflow-hidden text-left">
                  <span className={cn("block text-[10px] font-bold uppercase tracking-wider", accentClassName)}>
                    {compactLabel}
                  </span>
                  <span className="block truncate text-[11px] font-semibold leading-4">
                    {selectedModelLabel ?? "Select model"}
                  </span>
                </span>
                {selectedModel ? (
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {getCost(selectedModel.id)}
                  </span>
                ) : null}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="min-w-[260px]">
          <SelectGroup>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3 overflow-hidden">
                  <span className="min-w-0 flex-1 overflow-hidden">
                    <span className="block truncate text-xs font-bold">
                      {model.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {getCost(model.id)}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </fieldset>
  );
}

function ReferencePortraitFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-reference-portrait-frame="true"
      className={cn(
        "mx-auto flex aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-lg bg-zinc-950",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CloneSourceEmptyState() {
  return (
    <WorkspaceState
      tone="empty"
      icon={Video}
      title="Add source"
      description="Your selected clip appears here."
      className="min-h-0 border-0 bg-transparent px-0 py-0"
    />
  );
}

type Phase = "input" | "reviewing" | "submitted";
type CloneSetupStep = "source" | "identity" | "reference";

const CLONE_SETUP_STEPS = [
  {
    id: "source",
    number: "01",
    label: "Source",
    shortLabel: "Source",
    description: "Choose and trim the clip",
  },
  {
    id: "identity",
    number: "02",
    label: "Identity",
    shortLabel: "Who",
    description: "Choose who appears",
  },
  {
    id: "reference",
    number: "03",
    label: "Reference",
    shortLabel: "Look",
    description: "Set the final look",
  },
] as const satisfies readonly {
  id: CloneSetupStep;
  number: string;
  label: string;
  shortLabel: string;
  description: string;
}[];

interface RefJobStatus {
  status: "queued" | "processing" | "completed" | "failed";
  error: string | null;
  estimatedCost: number;
  outputs: { id: string }[];
}

export interface RefImageEntry {
  jobId: string;
  fileId: string | null;
  prompt: string;
  cost: number;
  status: "generating" | "completed" | "failed";
  error?: string;
}

type ReferenceImagePost = <T>(path: string, body: unknown) => Promise<T>;

export async function createReferenceImageBatchEntries({
  batchSize,
  videoInfo,
  avatarId,
  prompt,
  imageModel,
  unitCost,
  hairstyleRole = null,
  post = apiPost,
}: {
  batchSize: ReferenceBatchSize;
  videoInfo: Pick<TikTokVideoInfo, "id" | "localPath">;
  avatarId: string;
  prompt: string;
  imageModel: string;
  unitCost: number;
  hairstyleRole?: string | null;
  post?: ReferenceImagePost;
}): Promise<RefImageEntry[]> {
  const batchResults = await Promise.all(
    Array.from({ length: batchSize }, () =>
      post<{ id: string; estimatedCost?: number }>("/api/ugc-clone/reference-image", {
        tiktokVideoPath: videoInfo.localPath,
        tiktokSourceId: videoInfo.id,
        avatarId,
        prompt: prompt || undefined,
        imageModel,
        ...(hairstyleRole ? { hairstyleRole } : {}),
      })
    )
  );

  return batchResults.map((result) => ({
    jobId: result.id,
    fileId: null,
    prompt,
    cost: result.estimatedCost ?? unitCost,
    status: "generating" as const,
  }));
}

interface SavedReference {
  id: string;
  avatarId: string;
  prompt: string;
  createdAt: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
  previewUrl: string;
  source: {
    id: string;
    label: string;
    originalUrl: string;
  } | null;
}

interface AvatarIdentityPack {
  id: string;
  avatarId: string;
  status: "queued" | "processing" | "completed" | "failed";
  imageModel: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  backfillingHairstyles?: boolean;
  missingHairstyleRoles?: string[];
  images: {
    id: string;
    role: string;
    kind?: "core" | "hairstyle";
    previewUrl: string;
  }[];
}

interface CloneIdentityStatusPanelProps {
  avatarReady: boolean;
  identityPack: AvatarIdentityPack | null;
  isStartingIdentityPack: boolean;
  isGeneratingHairstyles?: boolean;
  onGenerateHairstyles?: () => void;
  identityPackError: string | null;
  onRetry: () => void;
}

type CloneProductionStepStatus = "ready" | "required" | "working" | "optional";

interface ClonePrimaryActionState {
  sourceReady: boolean;
  identityReady: boolean;
  referenceReady: boolean;
  canGenerate: boolean;
  usesSavedReference: boolean;
}

export interface ClonePrimaryAction {
  label: string;
  detail: string;
}

interface CloneProductionStatePanelProps {
  sourceReady: boolean;
  trimReady: boolean;
  identityReady: boolean;
  referenceReady: boolean;
  canGenerate: boolean;
  nextAction: ClonePrimaryAction;
  sourceDetail?: string;
  trimDetail?: string;
  identityDetail?: string;
  referenceDetail?: string;
  readinessDetail?: string;
}

export function getClonePrimaryAction({
  sourceReady,
  identityReady,
  referenceReady,
  canGenerate,
  usesSavedReference,
}: ClonePrimaryActionState): ClonePrimaryAction {
  if (!sourceReady) {
    return {
      label: "Add source",
      detail: "Paste a TikTok URL or choose a saved source.",
    };
  }

  if (!identityReady) {
    return {
      label: "Choose identity",
      detail: "Select the avatar for this clone.",
    };
  }

  if (canGenerate || referenceReady) {
    return {
      label: "Generate clone",
      detail: usesSavedReference
        ? "Use the selected reference to start video generation."
        : "Use the generated reference to start video generation.",
    };
  }

  return {
    label: "Generate reference",
    detail: "Create or choose the reference image first.",
  };
}

function getStepStatus(isReady: boolean, readyStatus: CloneProductionStepStatus = "ready") {
  return isReady ? readyStatus : "required";
}

function ProductionStateRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: CloneProductionStepStatus;
  detail: string;
}) {
  const statusClassName = {
    ready: "border-accent-green/30 bg-accent-green/10 text-accent-green",
    required: "border-accent-coral/30 bg-accent-coral/10 text-accent-coral",
    working: "border-accent-blue/30 bg-accent-blue/10 text-accent-blue",
    optional: "border-border bg-muted/45 text-muted-foreground",
  }[status];

  const statusLabel = {
    ready: "Ready",
    required: "Required",
    working: "Working",
    optional: "Optional",
  }[status];

  return (
    <li className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            statusClassName
          )}
        >
          {statusLabel}
        </span>
      </div>
    </li>
  );
}

export function CloneProductionStatePanel({
  sourceReady,
  trimReady,
  identityReady,
  referenceReady,
  canGenerate,
  nextAction,
  sourceDetail = sourceReady ? "Source selected and available for preview." : "No TikTok source selected yet.",
  trimDetail = trimReady ? "Trim/preparation state is set." : "Choose a source before trimming.",
  identityDetail = identityReady ? "Identity selected for this clone." : "Select an avatar identity.",
  referenceDetail = referenceReady ? "Reference is ready for generation." : "Generate or choose a reference.",
  readinessDetail = canGenerate ? "All required production state is ready." : "Complete the required state to generate.",
}: CloneProductionStatePanelProps) {
  return (
    <aside
      data-clone-production-state="true"
      className="h-fit rounded-xl border border-border bg-card p-4 shadow-sm xl:sticky xl:top-24"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Production State
          </p>
          <h2 className="mt-1 text-lg font-semibold">Clone readiness</h2>
        </div>
        <Badge
          variant="outline"
          className={cn(
            canGenerate
              ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
              : "bg-muted/45 text-muted-foreground"
          )}
        >
          {canGenerate ? "Ready" : "In progress"}
        </Badge>
      </div>

      <ol className="mt-4 space-y-2">
        <ProductionStateRow
          label="Source"
          status={getStepStatus(sourceReady)}
          detail={sourceDetail}
        />
        <ProductionStateRow
          label="Trim"
          status={sourceReady ? (trimReady ? "ready" : "optional") : "required"}
          detail={trimDetail}
        />
        <ProductionStateRow
          label="Identity"
          status={getStepStatus(identityReady)}
          detail={identityDetail}
        />
        <ProductionStateRow
          label="Reference"
          status={getStepStatus(referenceReady)}
          detail={referenceDetail}
        />
        <ProductionStateRow
          label="Generate readiness"
          status={canGenerate ? "ready" : "working"}
          detail={readinessDetail}
        />
      </ol>

      {!sourceReady ? (
        <WorkspaceState
          tone="empty"
          icon={Video}
          title={nextAction.label}
          description={nextAction.detail}
          className="mt-4 min-h-40 border-0 bg-muted/25 px-3 py-5"
        />
      ) : (
        <div className="mt-4 rounded-lg border border-border bg-muted/25 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Next action
          </p>
          <p className="mt-1 text-sm font-semibold">{nextAction.label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {nextAction.detail}
          </p>
        </div>
      )}
    </aside>
  );
}

export function CloneIdentityStatusPanel({
  avatarReady,
  identityPack,
  isStartingIdentityPack,
  isGeneratingHairstyles = false,
  onGenerateHairstyles,
  identityPackError,
  onRetry,
}: CloneIdentityStatusPanelProps) {
  const isBackfillingHairstyles =
    isGeneratingHairstyles || identityPack?.backfillingHairstyles === true;
  const missingHairstyleCount = identityPack?.missingHairstyleRoles?.length ?? 0;
  const canGenerateHairstyles =
    identityPack?.status === "completed" &&
    missingHairstyleCount > 0 &&
    !isBackfillingHairstyles;

  const detail = avatarReady
    ? identityPack?.status === "completed"
      ? isBackfillingHairstyles
        ? "Generating extra hairstyle options; existing references stay usable."
        : `${identityPack.images.length} identity references ready.`
      : identityPack?.status === "failed"
        ? "Reference prep failed; the original avatar is still usable."
        : identityPack?.status === "queued" || identityPack?.status === "processing" || isStartingIdentityPack
          ? "Preparing identity references; original avatar remains usable."
          : "Original avatar is available."
    : "Choose a saved identity, upload one, or create a new one.";
  const error = identityPackError || identityPack?.error;

  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 max-w-xl flex-1">
        <p className="text-xs leading-5 text-muted-foreground">
          {detail}
        </p>
        {error && (
          <p className="mt-2 min-w-0 break-words text-xs text-destructive [overflow-wrap:anywhere]">
            {error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {(canGenerateHairstyles || isBackfillingHairstyles) && (
          <button
            type="button"
            onClick={onGenerateHairstyles}
            disabled={!canGenerateHairstyles}
            className="rounded-lg border border-accent-green/30 bg-accent-green/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-green transition-colors hover:bg-accent-green/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBackfillingHairstyles ? "Generating hairstyles..." : "Generate hairstyles"}
          </button>
        )}
        {identityPack?.status === "failed" && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isStartingIdentityPack}
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStartingIdentityPack ? "Retrying..." : "Retry identity prep"}
          </button>
        )}
        {avatarReady && (
          <Badge variant="outline" className="border-accent-green/30 bg-accent-green/10 text-accent-green">
            Active
          </Badge>
        )}
      </div>
    </div>
  );
}

function CloneLiveComposition({
  activeStep,
  videoInfo,
  sourcePreviewSrc,
  avatarId,
  selectedReference,
  selectedGeneratedReference,
  collectionReferenceUrl,
  sourceReady,
  identityReady,
  referenceReady,
  onJumpToStep,
}: {
  activeStep: CloneSetupStep;
  videoInfo: TikTokVideoInfo | null;
  sourcePreviewSrc: string | null;
  avatarId: string | null;
  selectedReference: SavedReference | null;
  selectedGeneratedReference: RefImageEntry | null;
  collectionReferenceUrl: string | null;
  sourceReady: boolean;
  identityReady: boolean;
  referenceReady: boolean;
  onJumpToStep: (step: CloneSetupStep) => void;
}) {
  const referencePreview = collectionReferenceUrl ?? selectedReference?.previewUrl ??
    (selectedGeneratedReference?.status === "completed" && selectedGeneratedReference.fileId
      ? `/api/files/${selectedGeneratedReference.fileId}`
      : null);
  const avatarPreview = avatarId
    ? `/api/avatars/${encodeURIComponent(avatarId)}`
    : null;
  const hasComposition = Boolean(referencePreview ?? avatarPreview ?? (sourcePreviewSrc && videoInfo));
  const stageLabel = referencePreview
    ? "Reference composition"
    : avatarPreview
      ? "Selected identity"
      : sourceReady
        ? "Source composition"
        : "Live composition";

  const slots: {
    id: CloneSetupStep;
    label: string;
    ready: boolean;
    thumb: ReactNode;
  }[] = [
    {
      id: "source",
      label: "Source",
      ready: sourceReady,
      thumb: (
        <span className="grid size-full place-items-center bg-accent-blue/10 text-accent-blue">
          <Video className="size-3.5" />
        </span>
      ),
    },
    {
      id: "identity",
      label: "Identity",
      ready: identityReady,
      thumb: avatarPreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarPreview} alt="" className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center bg-accent-green/10 text-accent-green">
          <Users className="size-3.5" />
        </span>
      ),
    },
    {
      id: "reference",
      label: "Reference",
      ready: referenceReady,
      thumb: referencePreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={referencePreview} alt="" className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center bg-accent-coral/10 text-accent-coral">
          <Layers className="size-3.5" />
        </span>
      ),
    },
  ];

  return (
    <aside
      data-clone-live-composition="true"
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-[#edeee8] shadow-[var(--pf-shadow-xs)] lg:sticky lg:top-4"
    >
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {hasComposition && <span className="size-1.5 rounded-full bg-accent-green" />}
          {stageLabel}
        </span>
        <span className="rounded-md border border-border bg-white px-2 py-1 text-[10px] font-semibold text-muted-foreground shadow-[var(--pf-shadow-2xs)]">
          9:16 · Fit
        </span>
      </div>

      <div className="bg-[radial-gradient(#d3d4cd_0.75px,transparent_0.75px)] bg-[length:16px_16px] p-5 dark:bg-[radial-gradient(rgba(255,255,255,0.09)_0.75px,transparent_0.75px)] sm:p-7">
        {hasComposition ? (
          <div className="mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-[20px] border-[6px] border-white bg-[#242522] shadow-[var(--pf-shadow-lg)]">
            {referencePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={referencePreview}
                alt="Selected clone reference"
                className="size-full object-contain"
              />
            ) : avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt="Selected clone identity"
                className="size-full object-cover"
              />
            ) : sourcePreviewSrc && videoInfo ? (
              <video
                src={sourcePreviewSrc}
                width={videoInfo.width}
                height={videoInfo.height}
                muted
                playsInline
                controls
                preload="metadata"
                className="size-full object-cover"
              />
            ) : null}
          </div>
        ) : (
          <div className="mx-auto flex aspect-[9/16] w-full max-w-[360px] flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-[#C7C8C0] bg-[#F7F7F3] px-8 text-center shadow-[inset_0_1px_2px_rgba(67,60,42,0.04)]">
            <span className="grid size-12 place-items-center rounded-2xl border border-border bg-white text-muted-foreground shadow-[var(--pf-shadow-xs)]">
              <Eye className="size-5" />
            </span>
            <p className="mt-4 text-sm font-semibold text-foreground">Your clone takes shape here</p>
            <p className="mt-1 max-w-[240px] text-xs leading-5 text-muted-foreground">
              Complete the three inputs and the composition builds live.
            </p>
            <div className="mt-5 grid w-full max-w-[240px] gap-1.5">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => onJumpToStep(slot.id)}
                  className="group flex items-center gap-2.5 rounded-lg border border-border bg-white px-2.5 py-2 text-left shadow-[var(--pf-shadow-2xs)] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:shadow-[var(--pf-shadow-sm)] active:scale-[0.98]"
                >
                  <span className="size-6 shrink-0 overflow-hidden rounded-md">{slot.thumb}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">
                    {slot.label}
                  </span>
                  <span className={cn(
                    "shrink-0 text-[10px] font-bold uppercase tracking-wider",
                    slot.ready ? "text-accent-green" : "text-accent-coral"
                  )}>
                    {slot.ready ? "Ready" : "Add"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-px border-t border-border bg-border">
        {slots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onJumpToStep(slot.id)}
            aria-label={`${slot.label}: ${slot.ready ? "ready" : "required"}. Edit ${slot.label}.`}
            className="group flex items-center gap-2 bg-white px-3 py-3 text-left transition-colors duration-[180ms] hover:bg-[#F8F9F5]"
          >
            <span className="size-7 shrink-0 overflow-hidden rounded-md border border-border shadow-[var(--pf-shadow-2xs)]">
              {slot.thumb}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {slot.label}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    slot.ready ? "bg-accent-green" : "bg-[#D9DAD3]"
                  )}
                />
                <span className={cn("truncate", !slot.ready && "text-muted-foreground")}>
                  {slot.ready ? "Ready" : "Required"}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border bg-white px-4 py-3 text-[10px] text-muted-foreground">
        <span className="capitalize">Editing {activeStep}</span>
        <span>{referenceReady && identityReady && sourceReady ? "All inputs ready" : "Setup in progress"}</span>
      </div>
    </aside>
  );
}

export function UGCCloneForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sourceId: sourceIdParam, referenceFileId: referenceFileIdParam } =
    readCloneHandoffQuery(searchParams);

  // Phase
  const [phase, setPhase] = useState<Phase>("input");
  const [activeSetupStep, setActiveSetupStep] = useState<CloneSetupStep>("source");
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [referenceLibraryOpen, setReferenceLibraryOpen] = useState(false);
  const [visibleSavedReferenceCount, setVisibleSavedReferenceCount] = useState(
    REFERENCE_LIBRARY_PAGE_SIZE
  );

  // Reference image iterations
  const [refImages, setRefImages] = useState<RefImageEntry[]>([]);
  const [selectedRefIndex, setSelectedRefIndex] = useState<number>(0);
  const [refPrompt, setRefPrompt] = useState("");

  // Step 1: TikTok
  const [videoInfo, setVideoInfo] = useState<TikTokVideoInfo | null>(null);
  const [originalVideoInfo, setOriginalVideoInfo] = useState<TikTokVideoInfo | null>(null);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [sourceToolsOpen, setSourceToolsOpen] = useState(false);
  const [sourcesRefreshKey, setSourcesRefreshKey] = useState(0);

  // Step 2: Avatar
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [identityPack, setIdentityPack] = useState<AvatarIdentityPack | null>(null);
  const [isStartingIdentityPack, setIsStartingIdentityPack] = useState(false);
  const [isGeneratingHairstyles, setIsGeneratingHairstyles] = useState(false);
  const [selectedHairstyleRole, setSelectedHairstyleRole] = useState<string | null>(null);
  const [identityPackError, setIdentityPackError] = useState<string | null>(null);
  const [savedReferences, setSavedReferences] = useState<SavedReference[]>([]);
  const [isLoadingSavedReferences, setIsLoadingSavedReferences] = useState(false);
  const [savedReferencesError, setSavedReferencesError] = useState<string | null>(null);
  const [selectedSavedReferenceId, setSelectedSavedReferenceId] = useState<string | null>(null);
  const [selectedCollectionAssetId, setSelectedCollectionAssetId] = useState<
    string | null
  >(null);
  const [showAvatarReferences, setShowAvatarReferences] = useState(false);

  // Step 3: Settings
  const [keepOriginalSound, setKeepOriginalSound] = useState(true);
  const [removeTextOverlays, setRemoveTextOverlays] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"kling-3.0-motion" | "kling-3.0-pro-motion" | "kling-2.6-motion">("kling-3.0-motion");
  const [selectedReferenceImageModel, setSelectedReferenceImageModel] = useState("nano-banana-2");
  const [referenceBatchSize, setReferenceBatchSize] = useState<(typeof REFERENCE_BATCH_OPTIONS)[number]>(1);
  const [cloneTip, setCloneTip] = useState<(typeof UGC_CLONE_TIPS)[number]>(UGC_CLONE_TIPS[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(sourceIdParam);

  const durationSec = videoInfo?.durationSec ?? 5;
  const videoCost = calculateEstimatedCost(selectedModel, { durationSec });
  const referenceImageUnitCost = calculateEstimatedCost(selectedReferenceImageModel, { numImages: 1 });
  const referenceBatchCost = calculateEstimatedCost(selectedReferenceImageModel, { numImages: referenceBatchSize });
  const textErasureCost = removeTextOverlays ? BRIA_ERASER_COST_PER_SEC * durationSec : 0;
  const cloneVideoModels = getModelsByType("video").filter((model) => model.capabilities.motionControl);
  const referenceImageModels = getModelsByType("image");

  const canSubmit = !!videoInfo?.id && !!avatarId && !isSubmitting;

  // Poll for any "generating" ref images
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refImagesRef = useRef(refImages);
  useEffect(() => { refImagesRef.current = refImages; });

  useEffect(() => {
    try {
      const storedIndex = window.localStorage.getItem(UGC_CLONE_TIP_INDEX_KEY);
      const parsedIndex = storedIndex ? Number.parseInt(storedIndex, 10) : 0;
      const safeIndex = Number.isFinite(parsedIndex)
        ? Math.abs(parsedIndex) % UGC_CLONE_TIPS.length
        : 0;

      setCloneTip(UGC_CLONE_TIPS[safeIndex]);
      window.localStorage.setItem(
        UGC_CLONE_TIP_INDEX_KEY,
        String((safeIndex + 1) % UGC_CLONE_TIPS.length)
      );
    } catch {
      setCloneTip(UGC_CLONE_TIPS[Math.floor(Math.random() * UGC_CLONE_TIPS.length)]);
    }
  }, []);

  const fetchSavedReferences = useCallback(async (nextAvatarId: string) => {
    setIsLoadingSavedReferences(true);
    setSavedReferencesError(null);

    try {
      const references = await apiGet<SavedReference[]>(
        `/api/ugc-clone/references?avatarId=${encodeURIComponent(nextAvatarId)}`
      );
      setSavedReferences(references);
      setSelectedSavedReferenceId((current) =>
        current && references.some((reference) => reference.id === current)
          ? current
          : null
      );
    } catch (err) {
      console.error("Failed to load saved references:", err);
      setSavedReferences([]);
      setSelectedSavedReferenceId(null);
      setSavedReferencesError(
        err instanceof Error ? err.message : "Failed to load saved references"
      );
    } finally {
      setIsLoadingSavedReferences(false);
    }
  }, []);

  const fetchIdentityPack = useCallback(async (nextAvatarId: string) => {
    try {
      const pack = await apiGet<AvatarIdentityPack | null>(
        `/api/avatars/${encodeURIComponent(nextAvatarId)}/identity-pack`
      );
      setIdentityPack(pack);
      setIdentityPackError(null);
      return pack;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load identity pack";
      setIdentityPack(null);
      setIdentityPackError(message);
      return null;
    }
  }, []);

  const startIdentityPack = useCallback(async (nextAvatarId: string, force = false) => {
    setIsStartingIdentityPack(true);
    setIdentityPackError(null);

    try {
      const pack = await apiPost<AvatarIdentityPack>(
        `/api/avatars/${encodeURIComponent(nextAvatarId)}/identity-pack`,
        { force }
      );
      setIdentityPack(pack);
      return pack;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start identity pack";
      setIdentityPackError(message);
      return null;
    } finally {
      setIsStartingIdentityPack(false);
    }
  }, []);

  const generateHairstyleVariants = useCallback(async (nextAvatarId: string) => {
    setIsGeneratingHairstyles(true);
    setIdentityPackError(null);

    try {
      const pack = await apiPost<AvatarIdentityPack>(
        `/api/avatars/${encodeURIComponent(nextAvatarId)}/identity-pack`,
        { hairstyles: true }
      );
      setIdentityPack(pack);
      return pack;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate hairstyles";
      setIdentityPackError(message);
      return null;
    } finally {
      setIsGeneratingHairstyles(false);
    }
  }, []);

  useEffect(() => {
    if (sourceIdParam) {
      setPendingSourceId(sourceIdParam);
    }
  }, [sourceIdParam]);

  useEffect(() => {
    if (!referenceFileIdParam) return;
    let cancelled = false;
    let shouldConsumeQuery = false;
    setActiveSetupStep("reference");

    void (async () => {
      try {
        const response = await fetch(
          `/api/ugc-clone/reference-files/${encodeURIComponent(referenceFileIdParam)}`,
          { headers: { "Content-Type": "application/json" } }
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string; message?: string }
            | null;
          const message =
            body?.error ?? body?.message ?? "The handed-off reference could not be loaded.";
          if ([400, 404, 410, 415, 422].includes(response.status)) {
            shouldConsumeQuery = true;
            if (!cancelled) setSubmitError(message);
            return;
          }
          throw new Error(message);
        }
        const metadata = (await response.json()) as CloneReferenceFileMetadata;
        if (cancelled) return;

        if (!isSupportedCloneReferenceFile(metadata)) {
          shouldConsumeQuery = true;
          setSubmitError(
            "Only generated image outputs can be used as Clone references. Choose an image or generate a reference here."
          );
          return;
        }

        const currentEntries = refImagesRef.current;
        const existingIndex = currentEntries.findIndex(
          (entry) => entry.fileId === referenceFileIdParam
        );

        if (existingIndex >= 0) {
          setSelectedRefIndex(existingIndex);
        } else {
          setSelectedRefIndex(currentEntries.length);
          setRefImages((current) => [
            ...current,
            {
              jobId: `handoff-${referenceFileIdParam}`,
              fileId: referenceFileIdParam,
              prompt: "Imported from a PostForge generation",
              cost: 0,
              status: "completed",
            },
          ]);
        }

        setSelectedSavedReferenceId(null);
        setSelectedCollectionAssetId(null);
        setSubmitError(null);
        shouldConsumeQuery = true;
      } catch (error) {
        if (!cancelled) {
          setSubmitError(
            error instanceof Error
              ? error.message
              : "The handed-off reference could not be loaded."
          );
        }
      } finally {
        if (!cancelled && shouldConsumeQuery) {
          const nextQuery = consumeCloneHandoffQuery(
            searchParams.toString(),
            "referenceFileId"
          );
          router.replace(nextQuery ? `/ugc-clone?${nextQuery}` : "/ugc-clone");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [referenceFileIdParam, router, searchParams]);

  const pollGeneratingJobs = useCallback(async () => {
    const generating = refImagesRef.current.filter((r) => r.status === "generating");
    if (generating.length === 0) return;

    const updates = await Promise.allSettled(
      generating.map(async (entry) => {
        const job = await apiGet<RefJobStatus>(`/api/jobs/${entry.jobId}`);
        return { jobId: entry.jobId, job };
      })
    );

    setRefImages((prev) => {
      let changed = false;
      const next = prev.map((entry) => {
        if (entry.status !== "generating") return entry;
        const result = updates.find(
          (u) => u.status === "fulfilled" && u.value.jobId === entry.jobId
        );
        if (!result || result.status !== "fulfilled") return entry;
        const { job } = result.value;

        if (job.status === "completed" && job.outputs[0]) {
          changed = true;
          return { ...entry, status: "completed" as const, fileId: job.outputs[0].id, cost: job.estimatedCost };
        }
        if (job.status === "failed") {
          changed = true;
          return { ...entry, status: "failed" as const, error: job.error ?? "Unknown error" };
        }
        return entry;
      });
      return changed ? next : prev;
    });

    if (avatarId) {
      void fetchSavedReferences(avatarId);
    }
  }, [avatarId, fetchSavedReferences]);

  useEffect(() => {
    setShowAvatarReferences(false);
    setSelectedHairstyleRole(null);

    if (!avatarId) {
      setIdentityPack(null);
      setIdentityPackError(null);
      setIsStartingIdentityPack(false);
      setSavedReferences([]);
      setSavedReferencesError(null);
      setSelectedSavedReferenceId(null);
      return;
    }

    void fetchSavedReferences(avatarId);
    void (async () => {
      const pack = await fetchIdentityPack(avatarId);
      if (!pack) {
        await startIdentityPack(avatarId);
      }
    })();
  }, [avatarId, fetchIdentityPack, fetchSavedReferences, startIdentityPack]);

  useEffect(() => {
    const isPreparing =
      !!identityPack && ["queued", "processing"].includes(identityPack.status);
    const isBackfillingHairstyles = identityPack?.backfillingHairstyles === true;
    if (!avatarId || (!isPreparing && !isBackfillingHairstyles)) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void fetchIdentityPack(avatarId);
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [avatarId, fetchIdentityPack, identityPack]);

  useEffect(() => {
    const hasGenerating = refImages.some((r) => r.status === "generating");
    if (!hasGenerating) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    if (!pollingRef.current) {
      pollingRef.current = setInterval(pollGeneratingJobs, 3000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [refImages, pollGeneratingJobs]);

  // Derived state
  const hairstyleOptions = (identityPack?.images ?? []).filter(
    (image) => image.kind === "hairstyle"
  );
  const selectedRef = refImages[selectedRefIndex] ?? null;
  const selectedRefFileId = selectedRef?.status === "completed" ? selectedRef.fileId : null;
  const totalRefCost = refImages
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + r.cost, 0);
  const hasAnyCompleted = refImages.some((r) => r.status === "completed");
  const latestEntry = refImages[refImages.length - 1] ?? null;
  const isGenerating = latestEntry?.status === "generating";
  const selectedSavedReference = savedReferences.find(
    (reference) => reference.id === selectedSavedReferenceId
  ) ?? null;
  const avatarReferencePreviews = avatarId
    ? [
      {
        id: `avatar-${avatarId}`,
        label: "Original avatar",
        detail: "Saved avatar",
        previewUrl: `/api/avatars/${encodeURIComponent(avatarId)}`,
      },
      ...(identityPack?.images ?? []).map((image) => ({
        id: image.id,
        label: formatIdentityRole(image.role),
        detail: "Identity reference",
        previewUrl: image.previewUrl,
      })),
    ]
    : [];
  const primaryAvatarReference = avatarReferencePreviews[0] ?? null;

  const handleVideoDownloaded = (info: TikTokVideoInfo | null) => {
    setVideoInfo(info);
    setOriginalVideoInfo(info);
    setShowTrimmer(false);
    setSourceToolsOpen(!info);
    if (info) {
      setActiveSetupStep("identity");
    }
  };

  const handlePreselectedSourceResolved = (result: {
    status: "selected" | "missing";
    sourceId: string;
  }) => {
    if (!pendingSourceId || pendingSourceId !== result.sourceId) return;

    setPendingSourceId(null);
    if (result.status === "missing") {
      setSubmitError(
        "The handed-off saved source is no longer available. Choose or import another source."
      );
    } else {
      setSubmitError(null);
    }
    const nextQuery = consumeCloneHandoffQuery(
      searchParams.toString(),
      "sourceId"
    );

    router.replace(nextQuery ? `/ugc-clone?${nextQuery}` : "/ugc-clone");
  };

  const handleTrimmed = (info: { localPath: string; filename: string; durationSec: number; width: number; height: number }) => {
    if (!videoInfo) return;

    // Update both videoInfo and originalVideoInfo so the trimmed version
    // becomes the canonical source (the DB record was already updated by the API)
    const updated: TikTokVideoInfo = { ...videoInfo, ...info };
    setVideoInfo(updated);
    setOriginalVideoInfo(updated);
    setShowTrimmer(false);
    // Refresh saved sources list to reflect the updated duration/thumbnail
    setSourcesRefreshKey((k) => k + 1);
  };

  const handleCancelTrim = () => {
    if (originalVideoInfo) {
      setVideoInfo(originalVideoInfo);
    }
    setShowTrimmer(false);
  };

  const submitRefImageGeneration = async (promptToUse: string) => {
    if (!videoInfo || !avatarId) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const startIndex = refImagesRef.current.length;
      const newEntries = await createReferenceImageBatchEntries({
        batchSize: referenceBatchSize,
        videoInfo,
        avatarId,
        prompt: promptToUse,
        imageModel: selectedReferenceImageModel,
        unitCost: referenceImageUnitCost,
        hairstyleRole: selectedHairstyleRole,
      });

      setRefImages((prev) => [...prev, ...newEntries]);
      setSelectedRefIndex(startIndex);
      setSelectedSavedReferenceId(null);
      setSelectedCollectionAssetId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate reference images.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateRefImage = () => {
    submitRefImageGeneration("");
  };

  const handleRegenerateRefImage = () => {
    submitRefImageGeneration(refPrompt);
  };

  const handleApproveAndGenerate = async () => {
    if (!videoInfo?.id || !avatarId || !selectedRefFileId) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await apiPost<{ id: string }>("/api/ugc-clone/generate", {
        tiktokSourceId: videoInfo.id,
        tiktokVideoPath: videoInfo.localPath,
        avatarId,
        keepOriginalSound,
        removeTextOverlays,
        model: selectedModel,
        referenceImageFileId: selectedRefFileId,
        durationSec,
      });
      setPhase("submitted");
      router.push(`/ugc-clone/${result.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate clone.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  const handleGenerateWithSavedReference = async () => {
    if (!videoInfo || !avatarId || !selectedSavedReferenceId) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await apiPost<{ id: string }>("/api/ugc-clone/generate", {
        tiktokVideoPath: videoInfo.localPath,
        tiktokSourceId: videoInfo.id,
        avatarId,
        keepOriginalSound,
        removeTextOverlays,
        model: selectedModel,
        savedReferenceId: selectedSavedReferenceId,
        durationSec,
      });
      setPhase("submitted");
      router.push(`/ugc-clone/${result.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate clone.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  const handleGenerateWithCollectionReference = async () => {
    if (!videoInfo || !avatarId || !selectedCollectionAssetId) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await apiPost<{ id: string }>("/api/ugc-clone/generate", {
        tiktokVideoPath: videoInfo.localPath,
        tiktokSourceId: videoInfo.id,
        avatarId,
        keepOriginalSound,
        removeTextOverlays,
        model: selectedModel,
        collectionAssetId: selectedCollectionAssetId,
        durationSec,
      });
      setPhase("submitted");
      router.push(`/ugc-clone/${result.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate clone.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  const handleBackToInput = () => {
    setPhase("input");
    setRefImages([]);
    setSelectedRefIndex(0);
    setSubmitError(null);
    if (avatarId) {
      void fetchSavedReferences(avatarId);
    }
  };

  const handleSelectSavedReference = (referenceId: string) => {
    setSelectedCollectionAssetId(null);
    setSelectedSavedReferenceId((current) =>
      current === referenceId ? null : referenceId
    );
  };

  const modelName = selectedModel === "kling-3.0-motion"
    ? "Kling 3.0"
    : selectedModel === "kling-3.0-pro-motion"
      ? "Kling 3.0 Pro"
      : "Kling 2.6";
  const sourceReady = !!videoInfo?.id;
  const shouldShowSourceTools = !sourceReady || sourceToolsOpen;
  const avatarReady = !!avatarId;
  const trimReady = !!videoInfo;
  const referenceReady =
    !!selectedCollectionAssetId || !!selectedSavedReference || !!selectedRefFileId;
  const canGenerateClone = !!videoInfo?.id && !!avatarId && referenceReady && !isSubmitting;
  const nextAction = getClonePrimaryAction({
    sourceReady,
    identityReady: avatarReady,
    referenceReady,
    canGenerate: canGenerateClone,
    usesSavedReference: !!selectedCollectionAssetId || !!selectedSavedReference,
  });
  const sourcePreviewSrc = videoInfo
    ? `/api/ugc-clone/preview?path=${encodeURIComponent(videoInfo.localPath)}`
    : null;
  const sourceDetail = videoInfo
    ? videoInfo.label || "Selected TikTok source"
    : "Paste a TikTok URL or choose a saved source.";
  const trimDetail = videoInfo
    ? originalVideoInfo && videoInfo.localPath !== originalVideoInfo.localPath
      ? `${Math.round(durationSec)}s source clip selected.`
      : "Full source selected; trim can still be edited."
    : "Choose a source before trimming.";
  const identityDetail = avatarReady
    ? identityPack?.status === "completed"
      ? `${identityPack.images.length} identity references ready.`
      : "Identity selected; extra references are still preparing."
    : "Choose the identity for this clone.";
  const referenceDetail = selectedCollectionAssetId
    ? "Collection reference selected."
    : selectedSavedReference
      ? "Saved reference selected."
    : selectedRefFileId
      ? "Generated reference approved."
      : "Generate or choose a reference image.";
  const readinessDetail = canGenerateClone
    ? "Source, identity, and reference are ready."
    : "Add the missing source, identity, or reference.";
  const compactActionLabel = nextAction.label;
  const primaryActionDisabled =
    selectedCollectionAssetId || selectedSavedReference || selectedRefFileId
    ? !canGenerateClone
    : !canSubmit || isSubmitting || isGenerating;
  const handlePrimaryAction = selectedCollectionAssetId
    ? handleGenerateWithCollectionReference
    : selectedSavedReference
      ? handleGenerateWithSavedReference
    : selectedRefFileId
      ? handleApproveAndGenerate
      : handleGenerateRefImage;
  const completedSetupSteps = new Set<CloneSetupStep>([
    ...(sourceReady ? (["source"] as const) : []),
    ...(avatarReady ? (["identity"] as const) : []),
    ...(referenceReady ? (["reference"] as const) : []),
  ]);
  const productionStatePanel = (
    <CloneProductionStatePanel
      sourceReady={sourceReady}
      trimReady={trimReady}
      identityReady={avatarReady}
      referenceReady={referenceReady}
      canGenerate={canGenerateClone}
      nextAction={nextAction}
      sourceDetail={sourceDetail}
      trimDetail={trimDetail}
      identityDetail={identityDetail}
      referenceDetail={referenceDetail}
      readinessDetail={readinessDetail}
    />
  );

  // ─── Review Phase ───────────────────────────────────────────────────
  if (phase === "reviewing") {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-border bg-card py-0 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleBackToInput}
                className="size-8"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight">Review reference</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Check the source and generated still before creating the clone.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit bg-muted/40">
              {modelName}
            </Badge>
          </div>

          <CardContent className="space-y-5 p-5">
            <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
            {videoInfo && sourcePreviewSrc && (
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Source
                </p>
                <MediaPreviewFrame
                  type="video"
                  src={sourcePreviewSrc}
                  width={videoInfo.width}
                  height={videoInfo.height}
                  alt={videoInfo.label || "Selected source preview"}
                  variant="work"
                  showMetadata
                />
                <div className="mt-3 min-w-0 text-xs text-muted-foreground">
                  <p className="truncate font-medium text-foreground">
                    {videoInfo.label || "Selected TikTok source"}
                  </p>
                  <p className="mt-1 font-mono text-[10px]">
                    {durationSec}s · {videoInfo.width}x{videoInfo.height}
                  </p>
                </div>
              </div>
            )}

              <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold">Generated reference</p>
                  <span className="text-xs text-muted-foreground">
                    {refImages.filter((r) => r.status === "completed").length} variant
                    {refImages.filter((r) => r.status === "completed").length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="relative flex min-h-[420px] items-center justify-center">
                {selectedRef?.status === "generating" && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="size-12 animate-spin rounded-full border-4 border-muted border-t-accent-coral" />
                    </div>
                    <p className="text-sm font-medium">Generating reference image...</p>
                    <p className="text-xs text-muted-foreground">
                      Compositing your avatar into the video&apos;s environment
                    </p>
                  </div>
                )}

                {selectedRef?.status === "failed" && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="min-w-0 max-w-full rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-4 text-center">
                      <p className="text-sm font-medium text-destructive">Generation failed</p>
                      {selectedRef.error && (
                        <p className="mt-1 min-w-0 break-words text-xs text-destructive/80 [overflow-wrap:anywhere]">{selectedRef.error}</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedRef?.status === "completed" && selectedRef.fileId && (
                  <div className="w-full p-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/files/${selectedRef.fileId}`}
                      alt="Reference image - avatar in video environment"
                      className="max-w-full max-h-[600px] mx-auto rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
              </div>
            </div>

            {refImages.length > 1 && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Variants
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {refImages.map((entry, i) => (
                    <button
                      key={entry.jobId}
                      type="button"
                      onClick={() => setSelectedRefIndex(i)}
                      className={cn(
                        "relative shrink-0 size-16 rounded-lg border-2 overflow-hidden transition-all duration-150",
                        selectedRefIndex === i
                          ? "border-accent-coral"
                          : "border-border hover:border-foreground/20 opacity-70 hover:opacity-100"
                      )}
                    >
                      {entry.status === "completed" && entry.fileId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/files/${entry.fileId}`}
                          alt={`Variant ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : entry.status === "generating" ? (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Loader2 className="size-4 animate-spin text-accent-coral" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-destructive/10">
                          <span className="text-[10px] text-destructive">Failed</span>
                        </div>
                      )}
                      <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-white drop-shadow-md">
                        #{i + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PenLine className="size-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Reference Image Prompt
                  </p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {refPrompt.length}/500
                </span>
              </div>
              <Textarea
                placeholder="e.g. The person is wearing a casual blue hoodie, sitting at a coffee shop table, warm afternoon light..."
                value={refPrompt}
                onChange={(e) => setRefPrompt(e.target.value.slice(0, 500))}
                maxLength={500}
                className="min-h-[120px] resize-none bg-muted/50 border border-border focus:border-accent-coral/20 focus:bg-card rounded-lg p-4 text-sm transition-all duration-150"
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Total estimate:{" "}
                  <span className="font-mono text-foreground">
                    {formatCost((totalRefCost || referenceBatchCost) + videoCost + textErasureCost)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRegenerateRefImage}
                  disabled={isSubmitting || isGenerating}
                  className="gap-2"
                >
                  {isSubmitting || isGenerating ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
            </div>

            {selectedRef && selectedRef.prompt && (
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Prompt used for #{selectedRefIndex + 1}
                </p>
                <p className="min-w-0 break-words text-xs italic leading-relaxed text-foreground/80 [overflow-wrap:anywhere] line-clamp-3">
                  {selectedRef.prompt || "(no additional prompt)"}
                </p>
              </div>
            )}

            {submitError && (
              <div className="min-w-0 break-words rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive [overflow-wrap:anywhere]">
                {submitError}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={handleBackToInput} className="gap-2">
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                onClick={handleApproveAndGenerate}
                disabled={!hasAnyCompleted || !selectedRefFileId || isSubmitting}
                className="gap-2 bg-accent-coral font-semibold text-white hover:bg-[#ff6540]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Approve & Generate
                    <Check className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {productionStatePanel}
      </div>
    );
  }

  // ─── Input Phase ────────────────────────────────────────────────────
  return (
    <>
      <div
        data-clone-production-state="true"
        data-active-clone-step={activeSetupStep}
        className="space-y-4 pb-28"
      >
        <nav
          aria-label="Clone setup progress"
          className="grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-[var(--pf-shadow-xs)]"
        >
          {CLONE_SETUP_STEPS.map((step) => {
            const isActive = activeSetupStep === step.id;
            const isComplete = completedSetupSteps.has(step.id);

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveSetupStep(step.id)}
                aria-label={`${step.number}. ${step.label}`}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "group flex min-w-0 items-center gap-1.5 rounded-[10px] px-2 py-2.5 text-left transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:gap-3 sm:px-4",
                  isActive
                    ? "bg-muted/70 text-foreground shadow-[var(--pf-shadow-xs)] ring-1 ring-border"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground/80 active:scale-[0.98]"
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg border font-mono text-[10px] font-bold transition-colors duration-[180ms] sm:size-8",
                    isComplete
                      ? "border-accent-green/30 bg-accent-green/12 text-accent-green"
                      : isActive
                        ? "border-transparent bg-accent-coral text-white shadow-[var(--pf-shadow-2xs)]"
                        : "border-border bg-muted/50"
                  )}
                >
                  {isComplete ? <CheckCircle2 className="size-3.5" /> : step.number}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-semibold sm:text-sm">
                    {step.shortLabel}
                  </span>
                  <span className="mt-0.5 hidden truncate text-[10px] text-muted-foreground sm:block">
                    {step.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(420px,45fr)_minmax(0,55fr)]">
          <section
            data-clone-source-section="true"
            className={cn(
              "rounded-xl border border-border bg-card p-4 shadow-[var(--pf-shadow-xs)] sm:p-5",
              activeSetupStep !== "source" && "hidden"
            )}
          >
            <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent-blue/10 text-accent-blue">
                  <Video className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/70">
                    01. Source &amp; Trim
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Choose the clip and trim the part to clone.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {sourceReady && (
                  <button
                    type="button"
                    onClick={() => {
                      if (showTrimmer) {
                        handleCancelTrim();
                        return;
                      }

                      setSourceToolsOpen(false);
                      setShowTrimmer(true);
                    }}
                    className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showTrimmer ? "Close trim" : "Trim source"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (sourceReady) {
                      setShowTrimmer(false);
                      setSourceToolsOpen((value) => !value);
                      return;
                    }

                    setSourceToolsOpen(true);
                  }}
                  className="text-xs font-semibold text-accent-blue transition-colors hover:text-accent-blue/80"
                >
                  {sourceReady
                    ? sourceToolsOpen
                      ? "Close picker"
                      : "Replace source"
                    : "Choose source"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {sourceReady && videoInfo && sourcePreviewSrc && (
                showTrimmer && originalVideoInfo ? (
                  <VideoTrimmer
                    key={originalVideoInfo.localPath}
                    videoPath={originalVideoInfo.localPath}
                    durationSec={originalVideoInfo.durationSec}
                    width={originalVideoInfo.width}
                    height={originalVideoInfo.height}
                    sourceId={videoInfo.id}
                    onTrimmed={handleTrimmed}
                    onCancel={handleCancelTrim}
                  />
                ) : (
                  <div
                    data-clone-source-selected-preview="true"
                    className="mx-auto w-full max-w-[320px]"
                  >
                    <MediaPreviewFrame
                      type="video"
                      src={sourcePreviewSrc}
                      width={videoInfo.width}
                      height={videoInfo.height}
                      alt={videoInfo.label || "Selected source preview"}
                      variant="card"
                      frameAspectRatio="9/16"
                      className="w-full border border-border"
                      mediaClassName="rounded-none"
                    />
                  </div>
                )
              )}

              {shouldShowSourceTools && (
                <div className="rounded-xl border border-dashed border-border bg-muted/25 p-4">
                  <TikTokInput
                    onDownloaded={handleVideoDownloaded}
                    videoInfo={videoInfo}
                    refreshKey={sourcesRefreshKey}
                    preselectedSourceId={sourceReady ? null : pendingSourceId}
                    onPreselectedSourceResolved={handlePreselectedSourceResolved}
                  />
                </div>
              )}
            </div>
          </section>

          <section
            data-clone-identity-section="true"
            className={cn(
              "rounded-xl border border-border bg-card p-4 shadow-[var(--pf-shadow-xs)] sm:p-5",
              activeSetupStep !== "identity" && "hidden"
            )}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent-green/10 text-accent-green">
                <Users className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/70">
                  02. Identity
                </h2>
                <p className="text-xs text-muted-foreground">Choose who appears in the clone.</p>
              </div>
            </div>

            <div className="space-y-4">
              <CloneIdentityStatusPanel
                avatarReady={avatarReady}
                identityPack={identityPack}
                isStartingIdentityPack={isStartingIdentityPack}
                isGeneratingHairstyles={isGeneratingHairstyles}
                onGenerateHairstyles={() => {
                  if (avatarId) {
                    void generateHairstyleVariants(avatarId);
                  }
                }}
                identityPackError={identityPackError}
                onRetry={() => {
                  if (avatarId) {
                    void startIdentityPack(avatarId, true);
                  }
                }}
              />
              <AvatarPicker
                selectedId={avatarId}
                onSelect={(nextAvatarId) => {
                  setAvatarId(nextAvatarId);
                  setActiveSetupStep(sourceReady ? "reference" : "source");
                }}
              />
            </div>
          </section>

          <section
            data-clone-reference-section="true"
            className={cn(
              "rounded-xl border border-border bg-card p-4 shadow-[var(--pf-shadow-xs)] sm:p-5",
              activeSetupStep !== "reference" && "hidden"
            )}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent-coral/10 text-accent-coral">
                <Layers className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/70">
                  03. Reference
                </h2>
                <p className="text-xs text-muted-foreground">Set the look before generating video.</p>
              </div>
            </div>

            <div className="grid items-start gap-4">
              <div
                data-reference-comparison-stage="true"
                className="rounded-xl border border-border bg-muted/40 p-3 sm:p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Inputs</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Source motion and selected identity
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Side by side
                  </span>
                </div>

                <div className="grid grid-cols-2 items-start gap-3 sm:gap-4">
              <div
                data-reference-source-preview="true"
                className="h-full min-w-0 rounded-xl border border-border bg-[#edeee8] p-2.5 sm:p-3"
              >
                {sourceReady && videoInfo && sourcePreviewSrc ? (
                  <>
                    <ReferencePortraitFrame>
                      <MediaPreviewFrame
                        type="video"
                        src={sourcePreviewSrc}
                        width={videoInfo.width}
                        height={videoInfo.height}
                        alt={videoInfo.label || "Selected source preview"}
                        variant="card"
                        frameAspectRatio="9/16"
                        className="size-full"
                        mediaClassName="rounded-none"
                      />
                    </ReferencePortraitFrame>
                    <div className="mt-3 min-w-0">
                      <span className="block text-[11px] font-medium">Selected source</span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                        {durationSec.toFixed(1)}s • {videoInfo.width}x{videoInfo.height}
                      </span>
                    </div>
                  </>
                ) : (
                  <ReferencePortraitFrame className="flex-col items-center justify-center border border-dashed border-[#C7C8C0] bg-[#F7F7F3] p-4 text-center">
                    <CloneSourceEmptyState />
                  </ReferencePortraitFrame>
                )}
              </div>

              <div className="h-full min-w-0 rounded-xl border border-border bg-[#edeee8] p-2.5 sm:p-3">
                {selectedCollectionAssetId ? (
                  <>
                    <ReferencePortraitFrame>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/files/${encodeURIComponent(selectedCollectionAssetId)}`}
                        alt="Selected collection reference"
                        className="size-full object-contain"
                      />
                    </ReferencePortraitFrame>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] font-medium">Collection reference</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCollectionAssetId(null)}
                        className="text-[10px] font-bold text-accent-coral"
                      >
                        Change
                      </button>
                    </div>
                  </>
                ) : selectedSavedReference ? (
                  <>
                    <ReferencePortraitFrame>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedSavedReference.previewUrl}
                        alt="Selected reference"
                        className="size-full object-contain"
                      />
                    </ReferencePortraitFrame>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] font-medium">Saved reference</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSavedReferenceId(null)}
                        className="text-[10px] font-bold text-accent-coral"
                      >
                        Change
                      </button>
                    </div>
                  </>
                ) : selectedRef?.status === "generating" ? (
                  <ReferencePortraitFrame className="flex-col items-center justify-center bg-[#F7F7F3] p-4 text-center">
                    <Loader2 className="size-7 animate-spin text-accent-coral" />
                    <span className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Generating reference
                    </span>
                    <span className="mt-1 max-w-[180px] text-[10px] leading-4 text-muted-foreground/70">
                      Creating a still from the selected source and identity.
                    </span>
                  </ReferencePortraitFrame>
                ) : selectedRef?.status === "failed" ? (
                  <ReferencePortraitFrame className="flex-col items-center justify-center bg-destructive/10 p-4 text-center">
                    <span className="text-xs font-semibold uppercase tracking-widest text-destructive">
                      Reference failed
                    </span>
                    {selectedRef.error && (
                      <span className="mt-2 min-w-0 max-w-[220px] break-words text-[10px] leading-4 text-destructive/80 [overflow-wrap:anywhere]">
                        {selectedRef.error}
                      </span>
                    )}
                  </ReferencePortraitFrame>
                ) : selectedRef?.status === "completed" && selectedRef.fileId ? (
                  <>
                    <ReferencePortraitFrame>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/files/${selectedRef.fileId}`}
                        alt="Generated reference"
                        className="size-full object-contain"
                      />
                    </ReferencePortraitFrame>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block text-[11px] font-medium">Generated reference</span>
                        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                          Variant #{selectedRefIndex + 1}
                        </span>
                      </div>
                      <Badge variant="outline" className="border-accent-coral/30 bg-accent-coral/10 text-accent-coral">
                        Ready
                      </Badge>
                    </div>
                  </>
                ) : primaryAvatarReference ? (
                  <>
                    <ReferencePortraitFrame>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={primaryAvatarReference.previewUrl}
                        alt={primaryAvatarReference.label}
                        className="size-full object-contain"
                      />
                    </ReferencePortraitFrame>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block text-[11px] font-medium">Identity preview</span>
                        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                          {primaryAvatarReference.label} • {primaryAvatarReference.detail}
                        </span>
                      </div>
                      {identityPack?.status === "queued" || identityPack?.status === "processing" || isStartingIdentityPack ? (
                        <Badge variant="outline" className="border-accent-green/30 bg-accent-green/10 text-accent-green">
                          Preparing
                        </Badge>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <ReferencePortraitFrame className="flex-col items-center justify-center border border-dashed border-[#C7C8C0] bg-[#F7F7F3] p-4 text-center">
                    <Users className="size-6 text-muted-foreground/60" />
                    <span className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Choose identity
                    </span>
                    <span className="mt-1 max-w-[180px] text-[10px] leading-4 text-muted-foreground/60">
                      Identity preview appears here.
                    </span>
                  </ReferencePortraitFrame>
                )}
              </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-3 self-start rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
                <div className="mb-1">
                  <p className="text-xs font-semibold text-foreground">Reference options</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                    Choose the look for your next reference.
                  </p>
                </div>
                {hairstyleOptions.length > 0 && (
                  <div className="w-full rounded-xl border border-border bg-muted/30 p-2.5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Hairstyle
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedHairstyleRole(null)}
                        disabled={isSubmitting || isGenerating}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                          selectedHairstyleRole === null
                            ? "border-accent-green bg-accent-green/20 text-accent-green"
                            : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground/80"
                        )}
                        aria-pressed={selectedHairstyleRole === null}
                      >
                        Original
                      </button>
                      {hairstyleOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedHairstyleRole(option.role)}
                          disabled={isSubmitting || isGenerating}
                          className={cn(
                            "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                            selectedHairstyleRole === option.role
                              ? "border-accent-green bg-accent-green/20 text-accent-green"
                              : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground/80"
                          )}
                          aria-pressed={selectedHairstyleRole === option.role}
                        >
                          {formatIdentityRole(option.role)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div
                  data-reference-batch-size={referenceBatchSize}
                  className="w-full rounded-xl border border-border bg-muted/30 p-2.5"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      References
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/80">
                      {formatCost(referenceBatchCost)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {REFERENCE_BATCH_OPTIONS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        data-reference-count-option={count}
                        onClick={() => setReferenceBatchSize(count)}
                        disabled={isSubmitting || isGenerating}
                        className={cn(
                          "h-8 rounded-lg border text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                          referenceBatchSize === count
                            ? "border-accent-green bg-accent-green/20 text-accent-green"
                            : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground/80"
                        )}
                        aria-pressed={referenceBatchSize === count}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  data-reference-generation-summary="true"
                  className={cn(
                    "rounded-xl border p-3",
                    isGenerating
                      ? "border-accent-blue/25 bg-accent-blue/[0.06]"
                      : referenceReady
                        ? "border-accent-green/25 bg-accent-green/[0.06]"
                        : "border-border bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                      isGenerating
                        ? "bg-accent-blue/10 text-accent-blue"
                        : referenceReady
                          ? "bg-accent-green/10 text-accent-green"
                          : "bg-muted/50 text-muted-foreground"
                    )}>
                      {isGenerating ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : referenceReady ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold text-foreground/90">
                          {isGenerating
                            ? "Generating references"
                            : referenceReady
                              ? "Reference ready"
                              : `Ready for ${referenceBatchSize} ${referenceBatchSize === 1 ? "reference" : "references"}`}
                        </p>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground/80">
                          {formatCost(referenceBatchCost)}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] leading-4 text-muted-foreground/80">
                        {isGenerating
                          ? "You can keep reviewing the inputs while this finishes."
                          : referenceReady
                            ? "The selected still is ready for clone generation."
                            : "Use the action bar below when the options look right."}
                      </p>
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div className="min-w-0 break-words rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive [overflow-wrap:anywhere]">
                    {submitError}
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">Visual collections</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                    Use one owned collection image directly, or keep generating a new reference below.
                  </p>
                </div>
                <CollectionReferencePicker
                  selectedAssetIds={
                    selectedCollectionAssetId ? [selectedCollectionAssetId] : []
                  }
                  onChange={(assetIds) => {
                    const nextId = assetIds[0] ?? null;
                    setSelectedCollectionAssetId(nextId);
                    if (nextId) {
                      setSelectedSavedReferenceId(null);
                      if (!selectedModel.startsWith("kling-3.0")) {
                        setSelectedModel("kling-3.0-motion");
                      }
                    }
                    setSubmitError(null);
                  }}
                  maxSelection={1}
                />
              </div>

                {refImages.length > 0 && (
                  <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-foreground">This run</p>
                      <span className="font-mono text-[10px] text-muted-foreground/80">
                        {refImages.length} generated
                      </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {refImages.map((entry, index) => (
                        <button
                          key={entry.jobId}
                          type="button"
                          onClick={() => {
                            setSelectedSavedReferenceId(null);
                            setSelectedCollectionAssetId(null);
                            setSelectedRefIndex(index);
                          }}
                          className={cn(
                            "relative aspect-[9/16] w-24 shrink-0 overflow-hidden rounded-lg border bg-black transition-colors hover:border-accent-coral sm:w-28",
                            !selectedCollectionAssetId &&
                            !selectedSavedReference &&
                            selectedRefIndex === index
                              ? "border-accent-coral"
                              : "border-border"
                          )}
                        >
                          {entry.status === "completed" && entry.fileId ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/files/${entry.fileId}`}
                              alt={`Generated reference variant ${index + 1}`}
                              className="size-full object-cover"
                            />
                          ) : entry.status === "generating" ? (
                            <span className="grid size-full place-items-center bg-muted/50 text-accent-coral">
                              <Loader2 className="size-4 animate-spin" />
                            </span>
                          ) : (
                            <span className="grid size-full place-items-center bg-destructive/10 text-[10px] font-semibold uppercase text-destructive">
                              Failed
                            </span>
                          )}
                          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            #{index + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isLoadingSavedReferences && (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Loading saved references...
                  </div>
                )}

                {savedReferencesError && (
                  <div className="min-w-0 break-words rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive [overflow-wrap:anywhere]">
                    {savedReferencesError}
                  </div>
                )}

                {savedReferences.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/40">
                    <button
                      type="button"
                      onClick={() => {
                        if (referenceLibraryOpen) {
                          setVisibleSavedReferenceCount(REFERENCE_LIBRARY_PAGE_SIZE);
                        }
                        setReferenceLibraryOpen((open) => !open);
                      }}
                      aria-expanded={referenceLibraryOpen}
                      aria-controls="reference-library-grid"
                      className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-muted/40 sm:p-4"
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">Reference library</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Browse a saved look only when you need one.
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground/80">
                          {savedReferences.length} saved
                        </span>
                        <span className="rounded-lg border border-border bg-muted/50 p-1.5 text-muted-foreground">
                          <ChevronDown className={cn(
                            "size-3.5 transition-transform",
                            referenceLibraryOpen && "rotate-180"
                          )} />
                        </span>
                      </span>
                    </button>
                    {referenceLibraryOpen && (
                      <div
                        id="reference-library-grid"
                        data-reference-thumbnail-grid="true"
                        className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2 border-t border-border p-3 sm:grid-cols-[repeat(auto-fill,minmax(96px,1fr))] sm:p-4"
                      >
                      {savedReferences.slice(0, visibleSavedReferenceCount).map((reference) => (
                      <button
                        key={reference.id}
                        type="button"
                        onClick={() => handleSelectSavedReference(reference.id)}
                        className={cn(
                          "relative aspect-[9/16] overflow-hidden rounded-lg border bg-black transition-colors hover:border-accent-coral",
                          reference.id === selectedSavedReferenceId
                            ? "border-accent-coral"
                            : "border-border"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={reference.previewUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                        {reference.id === selectedSavedReferenceId && (
                          <span className="absolute inset-0 grid place-items-center bg-accent-coral/15 text-accent-coral">
                            <Check className="size-4" />
                          </span>
                        )}
                      </button>
                      ))}
                      </div>
                    )}
                    {referenceLibraryOpen && savedReferences.length > visibleSavedReferenceCount && (
                      <div className="flex flex-col gap-2 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                        <p className="text-[10px] text-muted-foreground">
                          Showing {visibleSavedReferenceCount} of {savedReferences.length} saved references
                        </p>
                        <button
                          type="button"
                          onClick={() => setVisibleSavedReferenceCount((count) =>
                            Math.min(count + REFERENCE_LIBRARY_PAGE_SIZE, savedReferences.length)
                          )}
                          className="h-8 rounded-lg border border-border bg-muted/50 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          Show {Math.min(
                            REFERENCE_LIBRARY_PAGE_SIZE,
                            savedReferences.length - visibleSavedReferenceCount
                          )} more
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowAvatarReferences((current) => !current)}
                    disabled={avatarReferencePreviews.length === 0}
                    aria-expanded={showAvatarReferences}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Identity references
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground/70">
                        {avatarReferencePreviews.length > 0
                          ? `${avatarReferencePreviews.length} available to inspect`
                          : "Choose an identity to view references"}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {showAvatarReferences ? "Hide" : "Show"}
                    </span>
                  </button>

                  {showAvatarReferences && avatarReferencePreviews.length > 0 && (
                    <div
                      data-avatar-reference-inspector="true"
                      className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto pr-1"
                    >
                      {avatarReferencePreviews.map((reference) => (
                        <div
                          key={reference.id}
                          className="relative aspect-[9/16] overflow-hidden rounded-lg border border-border bg-black"
                          title={`${reference.label} • ${reference.detail}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={reference.previewUrl}
                            alt={reference.label}
                            className="size-full object-cover"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[10px] font-medium text-white">
                            <span className="block truncate">{reference.label}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {identityPack?.status === "queued" || identityPack?.status === "processing" || isStartingIdentityPack ? (
                    <div className="flex items-center gap-2 rounded-lg border border-accent-green/20 bg-accent-green/5 px-3 py-2 text-xs text-accent-green">
                      <Loader2 className="size-3.5 animate-spin" />
                      Preparing identity references...
                    </div>
                  ) : null}
                </div>
            </div>
          </section>

          <CloneLiveComposition
            activeStep={activeSetupStep}
            videoInfo={videoInfo}
            sourcePreviewSrc={sourcePreviewSrc}
            avatarId={avatarId}
            selectedReference={selectedSavedReference}
            selectedGeneratedReference={selectedRef}
            collectionReferenceUrl={
              selectedCollectionAssetId
                ? `/api/files/${encodeURIComponent(selectedCollectionAssetId)}`
                : null
            }
            sourceReady={sourceReady}
            identityReady={avatarReady}
            referenceReady={referenceReady}
            onJumpToStep={setActiveSetupStep}
          />
        </div>

      </div>

      <section
        data-clone-primary-action-bar="true"
        data-clone-generation-settings-bar="true"
        className="workspace-sidebar-offset-left pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 md:left-[72px] lg:px-8 xl:left-64"
      >
        <div
          className="pointer-events-auto relative mx-auto max-w-[1120px] rounded-2xl border border-border bg-card/96 p-2.5 shadow-[var(--pf-shadow-lg)] backdrop-blur-2xl sm:p-3"
          title={`${cloneTip.title}: ${cloneTip.body}`}
        >
          {mobileSettingsOpen && (
            <div className="absolute inset-x-0 bottom-[calc(100%+0.5rem)] max-h-[min(70dvh,480px)] space-y-2 overflow-y-auto rounded-2xl border border-border bg-card/98 p-3 shadow-[var(--pf-shadow-lg)] backdrop-blur-2xl lg:hidden">
              <div className="mb-1 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-xs font-semibold text-foreground">Generation settings</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Models, sound, and cleanup</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSettingsOpen(false)}
                  className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 hover:text-foreground/80"
                >
                  Done
                </button>
              </div>

              <CloneModelSelect
                label="Final video"
                description="Video model"
                accentClassName="text-accent-blue"
                models={cloneVideoModels}
                selectedValue={selectedModel}
                onValueChange={(value) => setSelectedModel(value as typeof selectedModel)}
                getCost={(modelId) =>
                  formatCost(calculateEstimatedCost(modelId, { durationSec }))
                }
              />
              <CloneModelSelect
                label="Reference image"
                description="Image model"
                accentClassName="text-accent-green"
                models={referenceImageModels}
                selectedValue={selectedReferenceImageModel}
                onValueChange={setSelectedReferenceImageModel}
                getCost={(modelId) =>
                  formatCost(calculateEstimatedCost(modelId, { numImages: referenceBatchSize }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3">
                  <span className="truncate text-[11px] font-semibold text-foreground">Sound</span>
                  <Switch checked={keepOriginalSound} onCheckedChange={setKeepOriginalSound} />
                </div>
                <div className="flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3">
                  <span className="truncate text-[11px] font-semibold text-foreground">Remove text</span>
                  <Switch checked={removeTextOverlays} onCheckedChange={setRemoveTextOverlays} />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-2 lg:hidden">
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={primaryActionDisabled}
              className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-accent-coral px-4 text-[11px] font-bold uppercase tracking-widest text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),var(--pf-shadow-orange)] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-[#e9421c] active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            >
              <Zap className="size-3.5 shrink-0" />
              <span className="truncate">
                {isSubmitting
                  ? "Starting..."
                  : isGenerating
                    ? "Generating reference..."
                    : compactActionLabel}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileSettingsOpen((open) => !open)}
              aria-label="Generation settings"
              aria-expanded={mobileSettingsOpen}
              className={cn(
                "flex size-11 items-center justify-center rounded-xl border transition-colors",
                mobileSettingsOpen
                  ? "border-accent-blue/40 bg-accent-blue/12 text-accent-blue"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <SlidersHorizontal className="size-4" />
            </button>
          </div>

          <div className="hidden gap-2 lg:grid lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(116px,140px)_minmax(108px,132px)_minmax(170px,220px)] lg:items-center">
              <CloneModelSelect
                label="Final video"
                description="Video model"
                accentClassName="text-accent-blue"
                className="min-w-0"
                models={cloneVideoModels}
                selectedValue={selectedModel}
                onValueChange={(value) => setSelectedModel(value as typeof selectedModel)}
                getCost={(modelId) =>
                  formatCost(calculateEstimatedCost(modelId, { durationSec }))
                }
              />

              <CloneModelSelect
                label="Reference image"
                description="Image model"
                accentClassName="text-accent-green"
                className="min-w-0"
                models={referenceImageModels}
                selectedValue={selectedReferenceImageModel}
                onValueChange={setSelectedReferenceImageModel}
                getCost={(modelId) =>
                  formatCost(calculateEstimatedCost(modelId, { numImages: referenceBatchSize }))
                }
              />

              <div className="flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Volume2 className="size-4 shrink-0 text-muted-foreground" />
                  <p className="truncate text-[11px] font-semibold text-foreground">
                    Sound
                  </p>
                </div>
                <Switch checked={keepOriginalSound} onCheckedChange={setKeepOriginalSound} />
              </div>

              <div className="flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3">
                <p className="truncate text-[11px] font-semibold text-foreground">
                  Text
                  {removeTextOverlays && (
                    <span className="ml-1 font-mono text-[10px] text-accent-green">+{formatCost(textErasureCost)}</span>
                  )}
                </p>
                <Switch checked={removeTextOverlays} onCheckedChange={setRemoveTextOverlays} />
              </div>

              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={primaryActionDisabled}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent-coral px-4 text-[11px] font-bold uppercase tracking-widest text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),var(--pf-shadow-orange)] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-[#e9421c] active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
              >
                <Zap className="size-3.5 shrink-0" />
                <span className="truncate">
                  {isSubmitting
                    ? "Starting..."
                    : isGenerating
                      ? "Generating reference..."
                      : compactActionLabel}
                </span>
                {!isSubmitting && !isGenerating && (
                  <span className="shrink-0 rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-[10px] font-bold normal-case tracking-normal">
                    {formatCost((totalRefCost || referenceBatchCost) + videoCost + textErasureCost)}
                  </span>
                )}
              </button>
          </div>
        </div>
      </section>
    </>
  );

}
